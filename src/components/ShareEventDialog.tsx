
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Loader2, X } from "lucide-react";

interface ShareEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

const ShareEventDialog = ({ open, onOpenChange, eventId, eventTitle }: ShareEventDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, character_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: existingShares = [] } = useQuery({
    queryKey: ["event-shares", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_event_shares")
        .select("shared_with")
        .eq("event_id", eventId);
      if (error) throw error;
      return data.map((s) => s.shared_with);
    },
    enabled: open,
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const newShares = selectedUsers.filter((uid) => !existingShares.includes(uid));
      if (newShares.length === 0) return;
      const rows = newShares.map((uid) => ({
        event_id: eventId,
        shared_by: user.id,
        shared_with: uid,
      }));
      const { error } = await supabase.from("calendar_event_shares").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-shares", eventId] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setSelectedUsers([]);
      onOpenChange(false);
      toast({ title: "Event shared!" });
    },
    onError: (err: any) => {
      toast({ title: "Error sharing", description: err.message, variant: "destructive" });
    },
  });

  const unshareMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("calendar_event_shares")
        .delete()
        .eq("event_id", eventId)
        .eq("shared_with", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-shares", eventId] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast({ title: "Share removed" });
    },
  });

  const otherProfiles = profiles.filter((p) => p.user_id !== user?.id);

  const toggleUser = (uid: string) => {
    setSelectedUsers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-cyan-300">Share: {eventTitle}</DialogTitle>
        </DialogHeader>

        {/* Already shared with */}
        {existingShares.length > 0 && (
          <div className="space-y-1">
            <p className="text-gray-400 text-xs font-mono">Already shared with:</p>
            {existingShares.map((uid) => {
              const name = profiles.find((p) => p.user_id === uid)?.character_name || "Unknown";
              return (
                <div key={uid} className="flex items-center justify-between p-2 rounded bg-cyan-500/10 border border-cyan-500/20">
                  <span className="text-cyan-300 text-xs">{name}</span>
                  <Button size="sm" variant="ghost" onClick={() => unshareMutation.mutate(uid)} className="text-red-400 hover:text-red-300 h-5 w-5 p-0">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Select users to share with */}
        <div className="space-y-1">
          <p className="text-gray-400 text-xs font-mono">Share with:</p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {otherProfiles
              .filter((p) => !existingShares.includes(p.user_id))
              .map((p) => (
                <div
                  key={p.user_id}
                  onClick={() => toggleUser(p.user_id)}
                  className={`p-2 rounded cursor-pointer text-xs transition-all ${
                    selectedUsers.includes(p.user_id)
                      ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300"
                      : "bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:bg-gray-700/50"
                  }`}
                >
                  {p.character_name || "Unknown"}
                </div>
              ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={() => shareMutation.mutate()}
            disabled={selectedUsers.length === 0 || shareMutation.isPending}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {shareMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Share with {selectedUsers.length} user{selectedUsers.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareEventDialog;
