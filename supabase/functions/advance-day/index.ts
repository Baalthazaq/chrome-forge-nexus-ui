import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONTHS = [
  { number: 1, days: 28 }, { number: 2, days: 28 }, { number: 3, days: 28 },
  { number: 4, days: 28 }, { number: 5, days: 28 }, { number: 6, days: 28 },
  { number: 7, days: 28 }, { number: 8, days: 1 }, { number: 9, days: 28 },
  { number: 10, days: 28 }, { number: 11, days: 28 }, { number: 12, days: 28 },
  { number: 13, days: 28 }, { number: 14, days: 28 },
];

const DOWNTIME_CAP = 100;
const DOWNTIME_FLOOR = -48;

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

function intervalToDays(interval: string | null): number {
  switch (interval) {
    case "daily": return 1;
    case "weekly": return 7;
    case "monthly": return 28;
    case "yearly": return 365;
    default: return 1;
  }
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    const { data: userRole } = await supabase
      .from("user_roles").select("role").eq("user_id", userData.user.id).single();
    if (!userRole || userRole.role !== "admin") throw new Error("Admin only");

    const body = await req.json().catch(() => ({}));
    const { operation } = body;

    const { data: cal, error: calError } = await supabase
      .from("game_calendar").select("*").limit(1).single();
    if (calError || !cal) throw new Error("Could not read game calendar");

    // SET DATE operation
    if (operation === "set_date") {
      const { day, month, year } = body;
      if (!day || !month || !year) throw new Error("day, month, year required");
      const clampedDay = Math.min(Math.max(1, day), getMonthDays(month));
      const clampedMonth = Math.min(Math.max(1, month), 14);

      const { error: updateError } = await supabase
        .from("game_calendar")
        .update({ current_day: clampedDay, current_month: clampedMonth, current_year: year, updated_at: new Date().toISOString() })
        .eq("id", cal.id);
      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, newDate: { day: clampedDay, month: clampedMonth, year }, operation: "set_date" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ADVANCE operation
    const { days = 1 } = body;
    const advanceCount = Math.min(Math.max(1, days), 365);

    let currentDay = cal.current_day;
    let currentMonth = cal.current_month;
    let currentYear = cal.current_year;
    const billingSummary: string[] = [];
    const downtimeSummary: string[] = [];

    const { data: dtConfig } = await supabase
      .from("downtime_config").select("*").limit(1).single();
    const hoursPerDay = dtConfig?.hours_per_day || 10;

    for (let i = 0; i < advanceCount; i++) {
      currentDay++;
      if (currentDay > getMonthDays(currentMonth)) {
        currentDay = 1;
        currentMonth++;
        if (currentMonth > 14) { currentMonth = 1; currentYear++; }
      }

      // --- DOWNTIME PROCESSING ---
      // 1. Grant downtime hours FIRST (capped at 100)
      const { data: allBalances } = await supabase
        .from("downtime_balances").select("*");

      if (allBalances && allBalances.length > 0) {
        for (const bal of allBalances) {
          const newBalance = Math.min(bal.balance + hoursPerDay, DOWNTIME_CAP);
          await supabase
            .from("downtime_balances")
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq("id", bal.id);
        }
        downtimeSummary.push(`Granted ${hoursPerDay}h to ${allBalances.length} players (cap ${DOWNTIME_CAP})`);
      }

      // 2. Process full-time job downtime costs (re-fetch balances after grant)
      const { data: ftAcceptances } = await supabase
        .from("quest_acceptances")
        .select(`id, user_id, quest_id, quests (id, downtime_cost, job_type, title, pay_interval)`)
        .eq("status", "accepted");

      const fullTimeAcceptances = ftAcceptances?.filter(
        (a: any) => a.quests?.job_type === "full_time"
      ) || [];

      for (const fta of fullTimeAcceptances) {
        const quest = fta.quests as any;
        const totalCostPerInterval = quest.downtime_cost || 0;
        if (totalCostPerInterval <= 0) continue;

        // Calculate daily cost from the per-interval total
        const days = intervalToDays(quest.pay_interval);
        const dailyCost = Math.ceil(totalCostPerInterval / days);

        // Re-fetch current balance (after grant)
        const { data: bal } = await supabase
          .from("downtime_balances").select("*").eq("user_id", fta.user_id).single();
        if (!bal) continue;

        // Allow going negative down to DOWNTIME_FLOOR
        if (bal.balance - dailyCost >= DOWNTIME_FLOOR) {
          await supabase
            .from("downtime_balances")
            .update({ balance: bal.balance - dailyCost, updated_at: new Date().toISOString() })
            .eq("id", bal.id);

          // Log the deduction as an activity
          await supabase.from("downtime_activities").insert({
            user_id: fta.user_id,
            activity_type: "full_time_deduction",
            hours_spent: dailyCost,
            activities_chosen: [],
            notes: `Auto-deduction for ${quest.title} (${dailyCost}h/day from ${totalCostPerInterval}h/${quest.pay_interval || 'daily'})`,
            game_day: currentDay,
            game_month: currentMonth,
            game_year: currentYear,
          });
        } else {
          // Would go below floor - pause the recurring payment
          await supabase
            .from("recurring_payments")
            .update({ status: "paused", is_active: false })
            .filter("metadata->>quest_id", "eq", fta.quest_id)
            .eq("to_user_id", fta.user_id);

          downtimeSummary.push(`Paused ${quest.title} for user (balance would go below ${DOWNTIME_FLOOR})`);
        }
      }

      // 3. Unpause full-time jobs where balance recovered
      for (const fta of fullTimeAcceptances) {
        const quest = fta.quests as any;
        const totalCostPerInterval = quest.downtime_cost || 0;
        const days = intervalToDays(quest.pay_interval);
        const dailyCost = Math.ceil(totalCostPerInterval / days);

        const { data: bal } = await supabase
          .from("downtime_balances").select("*").eq("user_id", fta.user_id).single();

        if (bal && bal.balance - dailyCost >= DOWNTIME_FLOOR) {
          const { data: rp } = await supabase
            .from("recurring_payments").select("*")
            .filter("metadata->>quest_id", "eq", fta.quest_id)
            .eq("to_user_id", fta.user_id)
            .eq("status", "paused")
            .single();

          if (rp) {
            await supabase
              .from("recurring_payments")
              .update({ status: "active", is_active: true })
              .eq("id", rp.id);
            downtimeSummary.push(`Resumed ${quest.title} for user (downtime recovered)`);
          }
        }
      }

      // --- BILLING PROCESSING ---
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
          billingSummary.push(`${interval}: ${result.processed || 0} processed`);
        } catch (e) {
          billingSummary.push(`${interval}: error - ${e.message}`);
        }
      }
    }

    const { error: updateError } = await supabase
      .from("game_calendar")
      .update({ current_day: currentDay, current_month: currentMonth, current_year: currentYear, updated_at: new Date().toISOString() })
      .eq("id", cal.id);
    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        newDate: { day: currentDay, month: currentMonth, year: currentYear },
        daysAdvanced: advanceCount,
        billing: billingSummary,
        downtime: downtimeSummary,
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
