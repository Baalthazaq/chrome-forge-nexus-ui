import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONTHS = [
  { number: 1, days: 28 },
  { number: 2, days: 28 },
  { number: 3, days: 28 },
  { number: 4, days: 28 },
  { number: 5, days: 28 },
  { number: 6, days: 28 },
  { number: 7, days: 28 },
  { number: 8, days: 1 }, // Frippery
  { number: 9, days: 28 },
  { number: 10, days: 28 },
  { number: 11, days: 28 },
  { number: 12, days: 28 },
  { number: 13, days: 28 },
  { number: 14, days: 28 },
];

function getMonthDays(monthNum: number): number {
  return MONTHS.find(m => m.number === monthNum)?.days || 28;
}

function isFrippery(month: number): boolean {
  return month === 8;
}

function getBillingTriggers(day: number, month: number) {
  const frippery = isFrippery(month);
  return {
    daily: true,
    weekly: !frippery && [2, 9, 16, 24].includes(day),
    monthly: !frippery && day === 14,
    yearly: month === 1 && day === 1,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .single();
    if (!userRole || userRole.role !== "admin") throw new Error("Admin only");

    const { days = 1 } = await req.json().catch(() => ({ days: 1 }));
    const advanceCount = Math.min(Math.max(1, days), 365);

    // Get current date
    const { data: cal, error: calError } = await supabase
      .from("game_calendar")
      .select("*")
      .limit(1)
      .single();
    if (calError || !cal) throw new Error("Could not read game calendar");

    let currentDay = cal.current_day;
    let currentMonth = cal.current_month;
    let currentYear = cal.current_year;
    const billingSummary: string[] = [];

    for (let i = 0; i < advanceCount; i++) {
      // Advance
      currentDay++;
      if (currentDay > getMonthDays(currentMonth)) {
        currentDay = 1;
        currentMonth++;
        if (currentMonth > 14) {
          currentMonth = 1;
          currentYear++;
        }
      }

      // Check billing triggers
      const triggers = getBillingTriggers(currentDay, currentMonth);

      for (const [interval, shouldTrigger] of Object.entries(triggers)) {
        if (!shouldTrigger) continue;

        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/admin-financial`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              apikey: Deno.env.get("SUPABASE_ANON_KEY") || "",
            },
            body: JSON.stringify({ operation: `trigger_${interval}` }),
          });

          const result = await response.json();
          billingSummary.push(
            `${interval}: ${result.processed || 0} processed`
          );
        } catch (e) {
          billingSummary.push(`${interval}: error - ${e.message}`);
        }
      }
    }

    // Update calendar
    const { error: updateError } = await supabase
      .from("game_calendar")
      .update({
        current_day: currentDay,
        current_month: currentMonth,
        current_year: currentYear,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cal.id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        newDate: { day: currentDay, month: currentMonth, year: currentYear },
        daysAdvanced: advanceCount,
        billing: billingSummary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
