
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Trash2, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MONTHS, DAY_NAMES, formatGameDate, isFrippery, getMonth, type GameDate } from "@/lib/gameCalendar";
import { toast } from "@/hooks/use-toast";

interface CalendarEvent {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  event_day: number;
  event_month: number;
  event_year: number | null;
  is_holiday: boolean;
  is_recurring: boolean;
}

const Timestop = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewMonth, setViewMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Fetch current game date
  const { data: gameDate } = useQuery({
    queryKey: ["game-calendar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_calendar")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as { current_day: number; current_month: number; current_year: number };
    },
  });

  // Set initial view to current month
  useEffect(() => {
    if (gameDate) setViewMonth(gameDate.current_month);
  }, [gameDate]);

  const currentDate: GameDate = gameDate
    ? { day: gameDate.current_day, month: gameDate.current_month, year: gameDate.current_year }
    : { day: 1, month: 1, year: 1 };

  // Fetch events for current view month
  const { data: events = [] } = useQuery({
    queryKey: ["calendar-events", viewMonth, currentDate.year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("event_month", viewMonth);
      if (error) throw error;
      // Filter by year: show recurring (null year) + events for current year
      return (data as CalendarEvent[]).filter(
        (e) => e.event_year === null || e.event_year === currentDate.year
      );
    },
  });

  const addEvent = useMutation({
    mutationFn: async () => {
      if (!user || !selectedDay) return;
      const { error } = await supabase.from("calendar_events").insert({
        user_id: user.id,
        title: newEventTitle,
        description: newEventDesc || null,
        event_day: selectedDay,
        event_month: viewMonth,
        event_year: currentDate.year,
        is_holiday: false,
        is_recurring: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setNewEventTitle("");
      setNewEventDesc("");
      setAddDialogOpen(false);
      toast({ title: "Event added" });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast({ title: "Event removed" });
    },
  });

  const monthInfo = getMonth(viewMonth);
  const frippery = isFrippery(viewMonth);

  const eventsForDay = (day: number) =>
    events.filter((e) => e.event_day === day || e.event_day === 0);

  const prevMonth = () => setViewMonth((m) => (m <= 1 ? 14 : m - 1));
  const nextMonth = () => setViewMonth((m) => (m >= 14 ? 1 : m + 1));

  const isCurrentDay = (day: number) =>
    viewMonth === currentDate.month && day === currentDate.day;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_30%,rgba(234,179,8,0.06)_0%,transparent_50%)]" />

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-gray-400 hover:text-white hover:bg-gray-800/50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent mb-1">
            TIMESTOP
          </h1>
          <p className="text-gray-500 text-xs font-mono tracking-widest mb-3">
            by Chronomancy Co.
          </p>
          <p className="text-amber-300/80 font-mono text-sm">
            {formatGameDate(currentDate)}
          </p>
        </div>

        {/* Month navigation */}
        <Card className="bg-gray-900/40 border-gray-700/50 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="text-gray-400 hover:text-amber-300 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <span className="text-amber-300/80 font-mono text-sm">
                {monthInfo?.name || "Unknown"}
              </span>
              {monthInfo && monthInfo.season !== "-" && (
                <span className="text-gray-500 font-mono text-xs ml-2">
                  ({monthInfo.season})
                </span>
              )}
            </div>
            <button onClick={nextMonth} className="text-gray-400 hover:text-amber-300 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {frippery ? (
            /* Day of Frippery - special display */
            <div className="text-center py-8">
              <div
                onClick={() => setSelectedDay(1)}
                className={`inline-block px-8 py-4 rounded-lg cursor-pointer transition-all ${
                  isCurrentDay(1)
                    ? "bg-amber-500/20 border-2 border-amber-500/60 text-amber-300"
                    : "bg-gray-800/50 border border-gray-700/50 text-gray-300 hover:border-amber-500/30"
                }`}
              >
                <Star className="w-6 h-6 mx-auto mb-2 text-amber-400" />
                <p className="font-mono text-sm">Day of Frippery</p>
                <p className="text-xs text-gray-500 mt-1">Lie Day</p>
                {eventsForDay(1).length > 0 && (
                  <div className="flex justify-center gap-1 mt-2">
                    {eventsForDay(1).map((e) => (
                      <div
                        key={e.id}
                        className={`w-2 h-2 rounded-full ${
                          e.is_holiday ? "bg-amber-400" : "bg-cyan-400"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Normal 28-day grid */
            <div className="grid grid-cols-7 gap-1 text-center">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-gray-500 text-xs font-mono py-1">
                  {d}
                </div>
              ))}
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                const dayEvents = eventsForDay(day);
                const current = isCurrentDay(day);
                const selected = selectedDay === day;
                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`py-2 text-xs font-mono rounded cursor-pointer transition-all relative ${
                      current
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : selected
                        ? "bg-gray-700/50 text-white border border-gray-500/50"
                        : "text-gray-500 hover:bg-gray-800/50 hover:text-gray-300"
                    }`}
                  >
                    {day}
                    {dayEvents.length > 0 && (
                      <div className="flex justify-center gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map((e) => (
                          <div
                            key={e.id}
                            className={`w-1.5 h-1.5 rounded-full ${
                              e.is_holiday ? "bg-amber-400" : e.user_id ? "bg-cyan-400" : "bg-emerald-400"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Selected day panel */}
        {selectedDay !== null && (
          <Card className="bg-gray-900/40 border-gray-700/50 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-amber-300/80 font-mono text-sm">
                {frippery
                  ? "Day of Frippery"
                  : `${selectedDay}${selectedDay === 1 ? "st" : selectedDay === 2 ? "nd" : selectedDay === 3 ? "rd" : "th"} of ${monthInfo?.name}`}
              </h3>
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-cyan-400 hover:text-cyan-300">
                    <Plus className="w-4 h-4 mr-1" /> Add Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="text-amber-300">Add Personal Event</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input
                      placeholder="Event title"
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                    <Textarea
                      placeholder="Description (optional)"
                      value={newEventDesc}
                      onChange={(e) => setNewEventDesc(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => addEvent.mutate()}
                      disabled={!newEventTitle.trim() || addEvent.isPending}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      Add
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {eventsForDay(selectedDay).length === 0 ? (
              <p className="text-gray-600 text-xs font-mono">No events this day.</p>
            ) : (
              <div className="space-y-2">
                {eventsForDay(selectedDay).map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 rounded border ${
                      event.is_holiday
                        ? "border-amber-500/30 bg-amber-500/5"
                        : event.user_id
                        ? "border-cyan-500/30 bg-cyan-500/5"
                        : "border-emerald-500/30 bg-emerald-500/5"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`text-sm font-medium ${
                          event.is_holiday ? "text-amber-300" : event.user_id ? "text-cyan-300" : "text-emerald-300"
                        }`}>
                          {event.title}
                          {event.is_holiday && (
                            <span className="ml-2 text-xs text-amber-500/60">Holiday</span>
                          )}
                        </p>
                        {event.description && (
                          <p className="text-gray-500 text-xs mt-1">{event.description}</p>
                        )}
                      </div>
                      {event.user_id === user?.id && !event.is_holiday && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteEvent.mutate(event.id)}
                          className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Legend */}
        <div className="flex justify-center gap-6 text-xs font-mono text-gray-600">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            Holiday
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            Personal
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            Universal
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600 text-xs font-mono">
          <p>Timestop™ • Chronomancy Co. • "Every second counts"</p>
        </div>
      </div>
    </div>
  );
};

export default Timestop;
