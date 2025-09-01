import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-FINANCIAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Check if user is admin
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!userRole || userRole.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    logStep("Admin authenticated", { userId: user.id });

    const { operation, ...params } = await req.json();
    logStep("Operation requested", { operation, params });

    switch (operation) {
      case "send_bill": {
        const { to_user_id, amount, description, due_date, is_recurring, recurring_interval, from_user_id } = params;
        
        const billData: any = {
          from_user_id: from_user_id || user.id,
          to_user_id,
          amount,
          description,
          due_date,
          is_recurring: is_recurring || false,
          recurring_interval: recurring_interval || null
        };

        if (is_recurring && recurring_interval) {
          const nextDueDate = new Date();
          switch (recurring_interval) {
            case 'daily':
              nextDueDate.setDate(nextDueDate.getDate() + 1);
              break;
            case 'weekly':
              nextDueDate.setDate(nextDueDate.getDate() + 7);
              break;
            case 'monthly':
              nextDueDate.setMonth(nextDueDate.getMonth() + 1);
              break;
            case 'yearly':
              nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
              break;
          }
          billData.next_due_date = nextDueDate.toISOString();
        }

        const { error: billError } = await supabase
          .from("bills")
          .insert(billData);

        if (billError) throw billError;

        logStep("Bill sent successfully", { to_user_id, amount });
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "set_user_credits": {
        const { user_id, amount } = params;
        
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ credits: amount })
          .eq("user_id", user_id);

        if (updateError) throw updateError;

        // Create transaction record
        const { error: transactionError } = await supabase
          .from("transactions")
          .insert({
            user_id: user_id,
            transaction_type: "credit",
            amount: amount,
            description: "Admin credit adjustment",
            status: "completed"
          });

        if (transactionError) throw transactionError;

        logStep("User credits set", { user_id, amount });
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "send_payment": {
        const { to_user_id, amount, description, from_user_id } = params;
        
        // Get recipient's profile and update credits
        const { data: recipientProfile, error: recipientError } = await supabase
          .from("profiles")
          .select("credits")
          .eq("user_id", to_user_id)
          .single();

        if (recipientError || !recipientProfile) {
          throw new Error("Recipient profile not found");
        }

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ credits: recipientProfile.credits + amount })
          .eq("user_id", to_user_id);

        if (updateError) throw updateError;

        // Create transaction record
        const { error: transactionError } = await supabase
          .from("transactions")
          .insert({
            user_id: to_user_id,
            transaction_type: "credit",
            amount: amount,
            from_user_id: from_user_id || user.id,
            description: description || "Admin payment",
            status: "completed"
          });

        if (transactionError) throw transactionError;

        logStep("Payment sent successfully", { to_user_id, amount, from_user_id: from_user_id || user.id });
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "create_recurring_payment": {
        const { to_user_id, amount, description, interval_type } = params;
        
        const nextSendDate = new Date();
        switch (interval_type) {
          case 'daily':
            nextSendDate.setDate(nextSendDate.getDate() + 1);
            break;
          case 'weekly':
            nextSendDate.setDate(nextSendDate.getDate() + 7);
            break;
          case 'monthly':
            nextSendDate.setMonth(nextSendDate.getMonth() + 1);
            break;
          case 'yearly':
            nextSendDate.setFullYear(nextSendDate.getFullYear() + 1);
            break;
        }

        const { error: recurringError } = await supabase
          .from("recurring_payments")
          .insert({
            from_user_id: params.from_user_id || user.id,
            to_user_id,
            amount,
            description,
            interval_type,
            next_send_at: nextSendDate.toISOString()
          });

        if (recurringError) throw recurringError;

        logStep("Recurring payment created", { to_user_id, amount, interval_type });
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "process_recurring_payment": {
        const { recurring_payment_id } = params;
        
        // Get recurring payment details
        const { data: recurringPayment, error: rpError } = await supabase
          .from("recurring_payments")
          .select("*")
          .eq("id", recurring_payment_id)
          .eq("is_active", true)
          .single();

        if (rpError || !recurringPayment) {
          throw new Error("Recurring payment not found or inactive");
        }

        // Get recipient's profile and update credits
        const { data: recipientProfile, error: recipientError } = await supabase
          .from("profiles")
          .select("credits")
          .eq("user_id", recurringPayment.to_user_id)
          .single();

        if (recipientError || !recipientProfile) {
          throw new Error("Recipient profile not found");
        }

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ credits: recipientProfile.credits + recurringPayment.amount })
          .eq("user_id", recurringPayment.to_user_id);

        if (updateError) throw updateError;

        // Update recurring payment
        const nextSendDate = new Date();
        switch (recurringPayment.interval_type) {
          case 'daily':
            nextSendDate.setDate(nextSendDate.getDate() + 1);
            break;
          case 'weekly':
            nextSendDate.setDate(nextSendDate.getDate() + 7);
            break;
          case 'monthly':
            nextSendDate.setMonth(nextSendDate.getMonth() + 1);
            break;
          case 'yearly':
            nextSendDate.setFullYear(nextSendDate.getFullYear() + 1);
            break;
        }

        const { error: updateRpError } = await supabase
          .from("recurring_payments")
          .update({
            last_sent_at: new Date().toISOString(),
            next_send_at: nextSendDate.toISOString(),
            total_times_sent: recurringPayment.total_times_sent + 1
          })
          .eq("id", recurring_payment_id);

        if (updateRpError) throw updateRpError;

        // Create transaction record
        const { error: transactionError } = await supabase
          .from("transactions")
          .insert({
            user_id: recurringPayment.to_user_id,
            transaction_type: "credit",
            amount: recurringPayment.amount,
            from_user_id: recurringPayment.from_user_id,
            reference_id: recurring_payment_id,
            description: `Recurring: ${recurringPayment.description}`,
            status: "completed"
          });

        if (transactionError) throw transactionError;

        logStep("Recurring payment processed", { recurring_payment_id, amount: recurringPayment.amount });
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "process_all_recurring": {
        // Get all active recurring payments ready to be sent
        const { data: recurringPayments, error: rpError } = await supabase
          .from("recurring_payments")
          .select("*")
          .eq("is_active", true);

        if (rpError) throw rpError;

        let processed = 0;
        for (const payment of recurringPayments || []) {
          try {
            // Process each payment (same logic as single recurring payment)
            const { data: recipientProfile, error: recipientError } = await supabase
              .from("profiles")
              .select("credits")
              .eq("user_id", payment.to_user_id)
              .single();

            if (recipientError || !recipientProfile) continue;

            await supabase
              .from("profiles")
              .update({ credits: recipientProfile.credits + payment.amount })
              .eq("user_id", payment.to_user_id);

            const nextSendDate = new Date();
            switch (payment.interval_type) {
              case 'daily':
                nextSendDate.setDate(nextSendDate.getDate() + 1);
                break;
              case 'weekly':
                nextSendDate.setDate(nextSendDate.getDate() + 7);
                break;
              case 'monthly':
                nextSendDate.setMonth(nextSendDate.getMonth() + 1);
                break;
              case 'yearly':
                nextSendDate.setFullYear(nextSendDate.getFullYear() + 1);
                break;
            }

            await supabase
              .from("recurring_payments")
              .update({
                last_sent_at: new Date().toISOString(),
                next_send_at: nextSendDate.toISOString(),
                total_times_sent: payment.total_times_sent + 1
              })
              .eq("id", payment.id);

            await supabase
              .from("transactions")
              .insert({
                user_id: payment.to_user_id,
                transaction_type: "credit",
                amount: payment.amount,
                from_user_id: payment.from_user_id,
                reference_id: payment.id,
                description: `Recurring: ${payment.description}`,
                status: "completed"
              });

            processed++;
          } catch (error) {
            logStep("Error processing recurring payment", { paymentId: payment.id, error });
          }
        }

        logStep("All recurring payments processed", { processed });
        return new Response(JSON.stringify({ success: true, processed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "toggle_recurring_status": {
        const { recurring_payment_id, is_active } = params;
        
        const { error: updateError } = await supabase
          .from("recurring_payments")
          .update({ is_active })
          .eq("id", recurring_payment_id);

        if (updateError) throw updateError;

        logStep("Recurring payment status toggled", { recurring_payment_id, is_active });
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "trigger_daily":
      case "trigger_weekly": 
      case "trigger_monthly":
      case "trigger_yearly": {
        const interval = operation.replace("trigger_", "");
        
        const { data: payments, error: fetchError } = await supabase
          .from("recurring_payments")
          .select("*")
          .eq("is_active", true)
          .eq("interval_type", interval);

        if (fetchError) throw fetchError;

        let processed = 0;
        for (const payment of payments) {
          try {
            // Get user's current credits
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("credits")
              .eq("user_id", payment.to_user_id)
              .single();

            if (profileError || !profile) {
              logStep("Profile not found", { userId: payment.to_user_id });
              continue;
            }

            // Check if user can afford the payment (enforce -6000 limit)
            const newBalance = profile.credits - payment.amount;
            if (newBalance < -6000) {
              logStep("User would exceed credit limit", { 
                userId: payment.to_user_id, 
                currentBalance: profile.credits,
                paymentAmount: payment.amount,
                wouldBe: newBalance
              });
              continue;
            }

            // Update user's credits
            const { error: updateError } = await supabase
              .from("profiles")
              .update({ credits: newBalance })
              .eq("user_id", payment.to_user_id);

            if (updateError) throw updateError;

            // Update recurring payment
            const updates: any = {
              last_sent_at: new Date().toISOString(),
              total_times_sent: payment.total_times_sent + 1
            };

            // Handle finite cycles
            if (payment.max_cycles && payment.remaining_cycles) {
              updates.remaining_cycles = payment.remaining_cycles - 1;
              if (updates.remaining_cycles <= 0) {
                updates.is_active = false;
              }
            }

            const { error: paymentUpdateError } = await supabase
              .from("recurring_payments")
              .update(updates)
              .eq("id", payment.id);

            if (paymentUpdateError) throw paymentUpdateError;

            // Create transaction record
            await supabase
              .from("transactions")
              .insert({
                user_id: payment.to_user_id,
                transaction_type: "recurring_payment",
                amount: -payment.amount,
                description: payment.description,
                reference_id: payment.id,
                status: "completed",
                metadata: {
                  recurring_payment_id: payment.id,
                  interval_type: payment.interval_type,
                  triggered_manually: true
                }
              });

            processed++;
          } catch (error) {
            logStep("Error processing payment", { paymentId: payment.id, error });
          }
        }

        logStep(`${interval} payments processed`, { processed });
        return new Response(JSON.stringify({ success: true, processed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      default:
        throw new Error("Invalid operation");
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});