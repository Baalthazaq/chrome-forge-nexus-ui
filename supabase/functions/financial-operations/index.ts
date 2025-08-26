import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FINANCIAL-OPS] ${step}${detailsStr}`);
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
    logStep("User authenticated", { userId: user.id });

    const { operation, ...params } = await req.json();
    logStep("Operation requested", { operation, params });

    switch (operation) {
      case "send_money": {
        const { to_user_id, amount, description } = params;
        
        // Get sender's profile
        const { data: senderProfile, error: senderError } = await supabase
          .from("profiles")
          .select("credits")
          .eq("user_id", user.id)
          .single();

        if (senderError || !senderProfile) {
          throw new Error("Sender profile not found");
        }

        // Check if sender has enough credits (including negative limit of -6000)
        const newSenderBalance = senderProfile.credits - amount;
        if (newSenderBalance < -6000) {
          throw new Error("Insufficient funds. Would exceed credit limit.");
        }

        // Update sender's credits
        const { error: updateSenderError } = await supabase
          .from("profiles")
          .update({ credits: newSenderBalance })
          .eq("user_id", user.id);

        if (updateSenderError) throw updateSenderError;

        // Get recipient's profile and update credits
        const { data: recipientProfile, error: recipientError } = await supabase
          .from("profiles")
          .select("credits")
          .eq("user_id", to_user_id)
          .single();

        if (recipientError || !recipientProfile) {
          throw new Error("Recipient profile not found");
        }

        const { error: updateRecipientError } = await supabase
          .from("profiles")
          .update({ credits: recipientProfile.credits + amount })
          .eq("user_id", to_user_id);

        if (updateRecipientError) throw updateRecipientError;

        // Create transaction records
        const transactions = [
          {
            user_id: user.id,
            transaction_type: "debit",
            amount: -amount,
            to_user_id,
            description,
            status: "completed"
          },
          {
            user_id: to_user_id,
            transaction_type: "credit",
            amount: amount,
            from_user_id: user.id,
            description,
            status: "completed"
          }
        ];

        const { error: transactionError } = await supabase
          .from("transactions")
          .insert(transactions);

        if (transactionError) throw transactionError;

        logStep("Money sent successfully", { amount, to_user_id });
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "pay_bill": {
        const { bill_id } = params;
        
        // Get bill details
        const { data: bill, error: billError } = await supabase
          .from("bills")
          .select("*")
          .eq("id", bill_id)
          .eq("to_user_id", user.id)
          .eq("status", "unpaid")
          .single();

        if (billError || !bill) {
          throw new Error("Bill not found or already paid");
        }

        // Get user's profile
        const { data: userProfile, error: profileError } = await supabase
          .from("profiles")
          .select("credits")
          .eq("user_id", user.id)
          .single();

        if (profileError || !userProfile) {
          throw new Error("User profile not found");
        }

        // Check if user has enough credits (including negative limit of -6000)
        const newUserBalance = userProfile.credits - bill.amount;
        if (newUserBalance < -6000) {
          throw new Error("Insufficient funds. Would exceed credit limit.");
        }

        // Update user's credits
        const { error: updateUserError } = await supabase
          .from("profiles")
          .update({ credits: newUserBalance })
          .eq("user_id", user.id);

        if (updateUserError) throw updateUserError;

        // Mark bill as paid
        const { error: updateBillError } = await supabase
          .from("bills")
          .update({ status: "paid" })
          .eq("id", bill_id);

        if (updateBillError) throw updateBillError;

        // Create transaction record
        const { error: transactionError } = await supabase
          .from("transactions")
          .insert({
            user_id: user.id,
            transaction_type: "bill_payment",
            amount: -bill.amount,
            reference_id: bill_id,
            description: `Bill payment: ${bill.description}`,
            status: "completed"
          });

        if (transactionError) throw transactionError;

        logStep("Bill paid successfully", { bill_id, amount: bill.amount });
        return new Response(JSON.stringify({ success: true }), {
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