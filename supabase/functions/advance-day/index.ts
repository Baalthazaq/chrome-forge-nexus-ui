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
    const salarySummary: string[] = [];

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

      // --- DOWNTIME GRANT ---
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

      // --- SALARY PROCESSING FOR FULL-TIME JOBS ---
      const triggers = getBillingTriggers(currentDay, currentMonth);

      // Get all active full-time job acceptances
      const { data: ftAcceptances } = await supabase
        .from("quest_acceptances")
        .select(`id, user_id, quest_id, hours_logged, admin_notes, quests (id, title, reward, job_type, pay_interval, downtime_cost, posted_by_user_id)`)
        .eq("status", "accepted");

      const fullTimeAcceptances = ftAcceptances?.filter(
        (a: any) => a.quests?.job_type === "full_time"
      ) || [];

      for (const fta of fullTimeAcceptances) {
        const quest = fta.quests as any;
        const payInterval = quest.pay_interval || "daily";

        // Check if today is payday for this job's pay_interval
        const isPayday = triggers[payInterval as keyof typeof triggers] || false;
        if (!isPayday) continue;

        const requiredHours = quest.downtime_cost || 0;
        const hoursLogged = fta.hours_logged || 0;

        if (hoursLogged >= requiredHours && requiredHours > 0) {
          // --- PAYDAY: Pay the employee ---
          const reward = quest.reward || 0;

          // Credit employee
          const { data: empProfile } = await supabase
            .from("profiles").select("credits, character_name").eq("user_id", fta.user_id).single();
          if (empProfile) {
            await supabase.from("profiles")
              .update({ credits: (empProfile.credits || 0) + reward })
              .eq("user_id", fta.user_id);

            // Log transaction
            await supabase.from("transactions").insert({
              user_id: fta.user_id,
              transaction_type: "quest_salary",
              amount: reward,
              description: `Salary: ${quest.title}`,
              reference_id: quest.id,
              status: "completed",
              metadata: {
                quest_id: quest.id,
                acceptance_id: fta.id,
                pay_interval: payInterval,
                hours_worked: hoursLogged,
                hours_required: requiredHours,
              },
            });

            // If player-posted job, deduct from poster
            if (quest.posted_by_user_id) {
              const { data: posterProfile } = await supabase
                .from("profiles").select("credits").eq("user_id", quest.posted_by_user_id).single();
              if (posterProfile) {
                await supabase.from("profiles")
                  .update({ credits: (posterProfile.credits || 0) - reward })
                  .eq("user_id", quest.posted_by_user_id);

                await supabase.from("transactions").insert({
                  user_id: quest.posted_by_user_id,
                  transaction_type: "quest_payment",
                  amount: -reward,
                  description: `Salary paid: ${quest.title}`,
                  reference_id: quest.id,
                  status: "completed",
                });
              }
            }

            // Deduct required hours, leaving surplus banked
            const surplus = hoursLogged - requiredHours;
            await supabase.from("quest_acceptances")
              .update({ hours_logged: surplus })
              .eq("id", fta.id);

            salarySummary.push(`Paid ${reward}⏣ to ${empProfile.character_name || "unknown"} for ${quest.title} (${hoursLogged}h worked, ${surplus}h banked)`);
          }
        } else if (requiredHours > 0) {
          // --- MISSED PAYMENT: Not enough hours ---
          const existingNotes = fta.admin_notes || "";
          const missedNote = `[MISSED PAY ${currentDay}/${currentMonth}/${currentYear}] ${hoursLogged}/${requiredHours}h worked`;
          const newNotes = existingNotes ? `${existingNotes}\n${missedNote}` : missedNote;

          await supabase.from("quest_acceptances")
            .update({ admin_notes: newNotes })
            .eq("id", fta.id);

          salarySummary.push(`MISSED: ${quest.title} — ${hoursLogged}/${requiredHours}h (notified admin)`);
        }
      }

      // --- BILLING PROCESSING (non-salary recurring payments, bills, etc.) ---
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
        salary: salarySummary,
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
