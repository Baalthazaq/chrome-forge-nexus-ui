import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useAppNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;

    const check = async () => {
      const results: Record<string, boolean> = {};

      // Sending: unread casts
      const { count: unreadCasts } = await supabase
        .from("casts")
        .select("id", { count: "exact", head: true })
        .eq("read_at", null as any)
        .neq("sender_id", user.id)
        .in("stone_id", 
          (await supabase
            .from("stones")
            .select("id")
            .or(`participant_one_id.eq.${user.id},participant_two_id.eq.${user.id}`)
          ).data?.map(s => s.id) ?? []
        );
      results["sending"] = (unreadCasts ?? 0) > 0;

      // App of Holding: pending bills
      const { count: pendingBills } = await supabase
        .from("bills")
        .select("id", { count: "exact", head: true })
        .eq("to_user_id", user.id)
        .eq("status", "pending");
      results["vault"] = (pendingBills ?? 0) > 0;

      // @tunes: overdue recurring payments
      const { count: overduePayments } = await supabase
        .from("recurring_payments")
        .select("id", { count: "exact", head: true })
        .eq("to_user_id", user.id)
        .eq("is_active", true)
        .lt("next_send_at", new Date().toISOString());
      results["atunes"] = (overduePayments ?? 0) > 0;

      // CVNews: breaking news currently active
      const { count: breakingNews } = await supabase
        .from("news_articles")
        .select("id", { count: "exact", head: true })
        .eq("is_breaking", true)
        .eq("is_published", true)
        .lte("publish_date", new Date().toISOString());
      results["nexuswire"] = (breakingNews ?? 0) > 0;

      setNotifications(results);
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return notifications;
};
