import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SHORT_REST_ACTIVITIES = [
  "Tend to Wounds",
  "Clear Stress",
  "Repair Armor",
  "Prepare",
];

const LONG_REST_ACTIVITIES = [
  "Tend to All Wounds",
  "Clear All Stress",
  "Repair All Armor",
  "Prepare",
  "Work on a Project",
];

interface RestDialogProps {
  type: "short" | "long";
  open: boolean;
  onClose: () => void;
  userId: string | undefined;
  impersonatedUserId?: string;
  currentBalance: number;
  gameDate?: { day: number; month: number; year: number };
  onComplete?: () => void;
}

const RestDialog = ({
  type,
  open,
  onClose,
  userId,
  impersonatedUserId,
  currentBalance,
  gameDate,
  onComplete,
}: RestDialogProps) => {
  const { toast } = useToast();
  const [hours, setHours] = useState(type === "short" ? 1 : 8);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [gameDay, setGameDay] = useState(gameDate?.day || 1);
  const [gameMonth, setGameMonth] = useState(gameDate?.month || 1);
  const [gameYear, setGameYear] = useState(gameDate?.year || 2626);
  const [submitting, setSubmitting] = useState(false);

  const activities = type === "short" ? SHORT_REST_ACTIVITIES : LONG_REST_ACTIVITIES;
  const label = type === "short" ? "Short Rest" : "Long Rest";

  useEffect(() => {
    if (open) {
      setHours(type === "short" ? 1 : 8);
      setSelectedActivities([]);
      setNotes("");
      if (gameDate) {
        setGameDay(gameDate.day);
        setGameMonth(gameDate.month);
        setGameYear(gameDate.year);
      }
    }
  }, [open, type, gameDate]);

  const toggleActivity = (activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]
    );
  };

  const handleSubmit = async () => {
    if (!userId) return;
    if (hours <= 0) {
      toast({ title: "Error", description: "Hours must be greater than 0", variant: "destructive" });
      return;
    }
    if (hours > currentBalance) {
      toast({ title: "Error", description: `Not enough downtime. Have ${currentBalance}h, need ${hours}h.`, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("quest-operations", {
        body: {
          operation: "log_rest",
          targetUserId: impersonatedUserId,
          activity_type: type === "short" ? "short_rest" : "long_rest",
          hours_spent: hours,
          activities_chosen: selectedActivities,
          notes: notes || undefined,
          game_day: gameDay,
          game_month: gameMonth,
          game_year: gameYear,
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Failed to log rest");
      }

      toast({ title: `${label} logged`, description: `${hours}h of downtime used` });
      onClose();
      onComplete?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-300">{label}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Log a {type} rest and choose your activities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hours */}
          <div>
            <Label className="text-gray-300">Hours</Label>
            <Input
              type="number"
              min={1}
              value={hours}
              onChange={(e) => setHours(Math.max(1, parseInt(e.target.value) || 1))}
              className="bg-gray-800 border-gray-600 text-white w-24"
            />
            <p className="text-xs text-gray-500 mt-1">
              Available: <span className={currentBalance >= hours ? "text-cyan-400" : "text-red-400"}>{currentBalance}h</span>
            </p>
          </div>

          {/* Game Date */}
          <div>
            <Label className="text-gray-300">In-Game Date</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <Input type="number" min={1} max={28} value={gameDay} onChange={(e) => setGameDay(parseInt(e.target.value) || 1)} className="bg-gray-800 border-gray-600 text-white" placeholder="Day" />
              <Input type="number" min={1} max={14} value={gameMonth} onChange={(e) => setGameMonth(parseInt(e.target.value) || 1)} className="bg-gray-800 border-gray-600 text-white" placeholder="Month" />
              <Input type="number" min={1} value={gameYear} onChange={(e) => setGameYear(parseInt(e.target.value) || 1)} className="bg-gray-800 border-gray-600 text-white" placeholder="Year" />
            </div>
          </div>

          {/* Activities */}
          <div>
            <Label className="text-gray-300">Activities (pick up to 2)</Label>
            {selectedActivities.length > 2 && (
              <div className="flex items-center gap-1 mt-1 text-yellow-400 text-xs">
                <AlertTriangle className="w-3 h-3" />
                More than 2 activities selected — this exceeds the standard allowance.
              </div>
            )}
            <div className="space-y-2 mt-2">
              {activities.map((activity) => (
                <label key={activity} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedActivities.includes(activity)}
                    onCheckedChange={() => toggleActivity(activity)}
                    className="border-gray-400 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                  />
                  <span className="text-sm text-gray-300">{activity}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-gray-300">Notes</Label>
            <Textarea
              placeholder="Describe what you're doing..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-gray-400">Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || hours > currentBalance}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {submitting ? "Logging..." : `Log ${label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RestDialog;
