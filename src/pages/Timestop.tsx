
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Trash2, Star, Search, ChevronDown, ChevronUp, Calendar, List, Home, Share2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MONTHS, DAY_NAMES, formatGameDate, isFrippery, getMonth, type GameDate } from "@/lib/gameCalendar";
import { toast } from "@/hooks/use-toast";
import ShareEventDialog from "@/components/ShareEventDialog";

interface CalendarEvent {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  event_day: number;
  event_day_end: number | null;
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
  const [viewYear, setViewYear] = useState(2626);
  const [viewMode, setViewMode] = useState<"monthly" | "annual">("monthly");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [newEventDuration, setNewEventDuration] = useState<string>("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [expandedHolidays, setExpandedHolidays] = useState<Set<string>>(new Set());
  const [shareEventId, setShareEventId] = useState<string | null>(null);
  const [shareEventTitle, setShareEventTitle] = useState("");

  const { data: gameDate } = useQuery({
    queryKey: ["game-calendar"],
    queryFn: async () => {
      const { data, error } = await supabase.from("game_calendar").select("*").limit(1).single();
      if (error) throw error;
      return data as { current_day: number; current_month: number; current_year: number };
    },
  });

  useEffect(() => {
    if (gameDate) {
      setViewMonth(gameDate.current_month);
      setViewYear(gameDate.current_year);
    }
  }, [gameDate]);

  const currentDate: GameDate = gameDate
    ? { day: gameDate.current_day, month: gameDate.current_month, year: gameDate.current_year }
    : { day: 1, month: 1, year: 1 };

  const prevMonthNum = viewMonth <= 1 ? 14 : viewMonth - 1;
  const prevMonthYear = viewMonth <= 1 ? viewYear - 1 : viewYear;

  const { data: events = [] } = useQuery({
    queryKey: ["calendar-events", viewMonth, currentDate.year],
    queryFn: async () => {
      const { data, error } = await supabase.from("calendar_events").select("*").eq("event_month", viewMonth);
      if (error) throw error;
      return (data as CalendarEvent[]).filter(
        (e) => e.event_year === null || e.event_year === currentDate.year
      );
    },
  });

  // Fetch previous month's events to check for spillover
  const { data: prevMonthEvents = [] } = useQuery({
    queryKey: ["calendar-events-prev", prevMonthNum, prevMonthYear],
    queryFn: async () => {
      const { data, error } = await supabase.from("calendar_events").select("*").eq("event_month", prevMonthNum);
      if (error) throw error;
      return (data as CalendarEvent[]).filter(
        (e) => (e.event_year === null || e.event_year === prevMonthYear) && e.event_day_end && e.event_day_end > 28
      );
    },
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ["calendar-events-all", viewYear],
    queryFn: async () => {
      const { data, error } = await supabase.from("calendar_events").select("*");
      if (error) throw error;
      return (data as CalendarEvent[]).filter(
        (e) => e.event_year === null || e.event_year === viewYear
      );
    },
    enabled: viewMode === "annual",
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["calendar-search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .ilike("title", `%${searchQuery}%`);
      if (error) throw error;
      return (data as CalendarEvent[]).filter(
        (e) => e.event_year === null || e.event_year === currentDate.year
      );
    },
    enabled: searchQuery.trim().length > 0,
  });


  const addEvent = useMutation({
    mutationFn: async () => {
      if (!user || !selectedDay) return;
      const duration = parseInt(newEventDuration) || 1;
      const endDay = duration > 1 ? selectedDay + duration - 1 : null;
      const { error } = await supabase.from("calendar_events").insert({
        user_id: user.id,
        title: newEventTitle,
        description: newEventDesc || null,
        event_day: selectedDay,
        event_day_end: endDay,
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
      setNewEventDuration("");
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

  // Remove a shared event from your view (unshare yourself)
  const unshareFromMe = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("calendar_event_shares")
        .delete()
        .eq("event_id", eventId)
        .eq("shared_with", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast({ title: "Event removed from your calendar" });
    },
  });

  const monthInfo = getMonth(viewMonth);
  const frippery = isFrippery(viewMonth);

  const specificDayEvents = events.filter((e) => e.event_day > 0);
  const allMonthEvents = events.filter((e) => e.event_day === 0);

  // Check if a day falls within an event's range (including spillover from previous month)
  const eventsForDay = (day: number) => {
    // Events from this month
    const thisMonthMatches = specificDayEvents.filter((e) => {
      if (e.event_day_end && e.event_day_end > e.event_day) {
        return day >= e.event_day && day <= Math.min(e.event_day_end, 28);
      }
      return e.event_day === day;
    });
    // Events from previous month that spill into this month
    const spilloverMatches = prevMonthEvents.filter((e) => {
      if (e.event_day_end && e.event_day_end > 28) {
        const spillDay = day + 28; // day 1 of this month = day 29 relative to prev month
        return spillDay >= e.event_day && spillDay <= e.event_day_end;
      }
      return false;
    });
    return [...thisMonthMatches, ...spilloverMatches];
  };

  const dayHasHoliday = (day: number) => eventsForDay(day).some((e) => e.is_holiday);

  const prevMonth = () => setViewMonth((m) => {
    if (m <= 1) { setViewYear((y) => y - 1); return 14; }
    return m - 1;
  });
  const nextMonth = () => setViewMonth((m) => {
    if (m >= 14) { setViewYear((y) => y + 1); return 1; }
    return m + 1;
  });
  const isCurrentDay = (day: number) => viewMonth === currentDate.month && viewYear === currentDate.year && day === currentDate.day;

  const goToToday = () => {
    setViewMonth(currentDate.month);
    setViewYear(currentDate.year);
    setSelectedDay(currentDate.day);
  };

  const toggleHolidayExpand = (id: string) => {
    setExpandedHolidays((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDayRange = (event: CalendarEvent) => {
    if (event.event_day_end && event.event_day_end > event.event_day) {
      const evtMonth = getMonth(event.event_month);
      if (event.event_day_end > 28) {
        const nextMNum = event.event_month >= 14 ? 1 : event.event_month + 1;
        const nextM = getMonth(nextMNum);
        return `${event.event_day} of ${evtMonth?.name} → ${event.event_day_end - 28} of ${nextM?.name}`;
      }
      return `${event.event_day}–${event.event_day_end} of ${evtMonth?.name}`;
    }
    return event.event_day > 0 ? `Day ${event.event_day}` : "All month";
  };

  const renderEvent = (event: CalendarEvent) => (
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
        <div className="flex-1">
          <div
            className={`flex items-center gap-2 ${event.is_holiday ? "cursor-pointer" : ""}`}
            onClick={() => event.is_holiday && toggleHolidayExpand(event.id)}
          >
            <p className={`text-sm font-medium ${
              event.is_holiday ? "text-amber-300" : event.user_id ? "text-cyan-300" : "text-emerald-300"
            }`}>
              {event.title}
              {event.is_holiday && (
                <span className="ml-2 text-xs text-amber-500/60">Holiday</span>
              )}
              {event.event_day_end && event.event_day_end > event.event_day && (() => {
                const evtMonth = getMonth(event.event_month);
                if (event.event_day_end > 28) {
                  const nextMNum = event.event_month >= 14 ? 1 : event.event_month + 1;
                  const nextM = getMonth(nextMNum);
                  return <span className="ml-2 text-xs text-gray-500">{event.event_day} of {evtMonth?.name} → {event.event_day_end - 28} of {nextM?.name}</span>;
                }
                return <span className="ml-2 text-xs text-gray-500">Days {event.event_day}–{event.event_day_end}</span>;
              })()}
            </p>
            {event.is_holiday && event.description && (
              expandedHolidays.has(event.id) 
                ? <ChevronUp className="w-3 h-3 text-amber-500/60" />
                : <ChevronDown className="w-3 h-3 text-amber-500/60" />
            )}
          </div>
          {event.is_holiday && expandedHolidays.has(event.id) && event.description && (
            <p className="text-gray-500 text-xs mt-1">{event.description}</p>
          )}
          {!event.is_holiday && event.description && (
            <p className="text-gray-500 text-xs mt-1">{event.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {event.user_id === user?.id && !event.is_holiday && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShareEventId(event.id);
                  setShareEventTitle(event.title);
                }}
                className="text-cyan-400 hover:text-cyan-300 h-6 w-6 p-0"
              >
                <Share2 className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteEvent.mutate(event.id)}
                className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
          {event.user_id !== user?.id && event.user_id !== null && !event.is_holiday && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => unshareFromMe.mutate(event.id)}
              className="text-gray-400 hover:text-red-300 h-6 w-6 p-0"
              title="Remove from my calendar"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_30%,rgba(234,179,8,0.06)_0%,transparent_50%)]" />

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-gray-400 hover:text-white hover:bg-gray-800/50">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={goToToday} className="text-amber-400 hover:text-amber-300 hover:bg-gray-800/50">
              <Home className="w-4 h-4 mr-1" /> Today
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSearchOpen(!searchOpen)} className="text-gray-400 hover:text-white hover:bg-gray-800/50">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        {searchOpen && (
          <Card className="bg-gray-900/40 border-gray-700/50 p-3 mb-4">
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white text-sm"
              autoFocus
            />
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((event) => {
                  const m = getMonth(event.event_month);
                  return (
                    <div
                      key={event.id}
                      className="p-2 rounded bg-gray-800/50 cursor-pointer hover:bg-gray-700/50"
                      onClick={() => {
                        setViewMonth(event.event_month);
                        if (event.event_day > 0) setSelectedDay(event.event_day);
                        setSearchOpen(false);
                        setSearchQuery("");
                      }}
                    >
                      <p className={`text-xs font-medium ${event.is_holiday ? "text-amber-300" : "text-cyan-300"}`}>
                        {event.title}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {event.event_day > 0 ? `${event.event_day} of ` : ""}{m?.name || "Unknown"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent mb-1">
            TIMESTOP
          </h1>
          <p className="text-gray-500 text-xs font-mono tracking-widest mb-3">by Chronomancy Co.</p>
          <p className="text-amber-300/80 font-mono text-sm">{formatGameDate(currentDate)}</p>
          <div className="flex justify-center gap-2 mt-3">
            <Button size="sm" variant={viewMode === "monthly" ? "default" : "ghost"} onClick={() => setViewMode("monthly")} className={viewMode === "monthly" ? "bg-amber-600 hover:bg-amber-700 text-white" : "text-gray-400 hover:text-white"}>
              <Calendar className="w-3 h-3 mr-1" /> Monthly
            </Button>
            <Button size="sm" variant={viewMode === "annual" ? "default" : "ghost"} onClick={() => setViewMode("annual")} className={viewMode === "annual" ? "bg-amber-600 hover:bg-amber-700 text-white" : "text-gray-400 hover:text-white"}>
              <List className="w-3 h-3 mr-1" /> Annual
            </Button>
          </div>
        </div>

        {viewMode === "monthly" ? (
          <>
            <Card className="bg-gray-900/40 border-gray-700/50 p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="text-gray-400 hover:text-amber-300 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <span className="text-amber-300/80 font-mono text-sm">{monthInfo?.name || "Unknown"}</span>
                  {monthInfo && monthInfo.season !== "-" && (
                    <span className="text-gray-500 font-mono text-xs ml-2">({monthInfo.season})</span>
                  )}
                  <p className="text-gray-500 font-mono text-xs mt-0.5">Year {viewYear}</p>
                </div>
                <button onClick={nextMonth} className="text-gray-400 hover:text-amber-300 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {frippery ? (
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
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1 text-center">
                  {DAY_NAMES.map((d) => (
                    <div key={d} className="text-gray-500 text-xs font-mono py-1">{d}</div>
                  ))}
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                    const dayEvents = eventsForDay(day);
                    const current = isCurrentDay(day);
                    const selected = selectedDay === day;
                    const holiday = dayHasHoliday(day);
                    return (
                      <div
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`py-2 text-xs font-mono rounded cursor-pointer transition-all relative ${
                          current
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : holiday
                            ? "bg-amber-500/10 text-amber-400/80 border border-amber-500/20"
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

              {allMonthEvents.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-700/30 space-y-1.5">
                  {allMonthEvents.map((event) => (
                    <div key={event.id} className="p-2 rounded bg-amber-500/5 border border-amber-500/20">
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => toggleHolidayExpand(event.id)}
                      >
                        <Star className="w-3 h-3 text-amber-400" />
                        <p className="text-xs font-medium text-amber-300 flex-1">{event.title}</p>
                        <span className="text-xs text-amber-500/50">All month</span>
                        {event.description && (
                          expandedHolidays.has(event.id)
                            ? <ChevronUp className="w-3 h-3 text-amber-500/60" />
                            : <ChevronDown className="w-3 h-3 text-amber-500/60" />
                        )}
                      </div>
                      {expandedHolidays.has(event.id) && event.description && (
                        <p className="text-gray-500 text-xs mt-1 ml-5">{event.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {selectedDay !== null && (
              <Card className="bg-gray-900/40 border-gray-700/50 p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-amber-300/80 font-mono text-sm">
                    {frippery ? "Day of Frippery" : `${selectedDay} of ${monthInfo?.name}`}
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
                        <Input placeholder="Event title" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} className="bg-gray-800 border-gray-700 text-white" />
                        <Textarea placeholder="Description (optional)" value={newEventDesc} onChange={(e) => setNewEventDesc(e.target.value)} className="bg-gray-800 border-gray-700 text-white" />
                        <div>
                          <label className="text-gray-400 text-xs mb-1 block">
                            Duration (days)
                          </label>
                          <Input
                            type="number"
                            min={1}
                            placeholder="1"
                            value={newEventDuration}
                            onChange={(e) => setNewEventDuration(e.target.value)}
                            className="bg-gray-800 border-gray-700 text-white"
                          />
                          {(parseInt(newEventDuration) || 1) > 1 && selectedDay && (() => {
                            const dur = parseInt(newEventDuration) || 1;
                            const endRaw = selectedDay + dur - 1;
                            const spills = endRaw > 28;
                            const nextMonthInfo = getMonth(viewMonth >= 14 ? 1 : viewMonth + 1);
                            const endFormatted = spills
                              ? `${endRaw - 28} of ${nextMonthInfo?.name || 'next month'}`
                              : `${endRaw} of ${monthInfo?.name}`;
                            return (
                              <p className="text-amber-400/60 text-xs mt-1">
                                {selectedDay} of {monthInfo?.name} → {endFormatted}
                                {spills && <span className="text-gray-500"> (spans into next month)</span>}
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => addEvent.mutate()} disabled={!newEventTitle.trim() || addEvent.isPending} className="bg-amber-600 hover:bg-amber-700">Add</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {eventsForDay(selectedDay).length === 0 ? (
                  <p className="text-gray-600 text-xs font-mono">No events this day.</p>
                ) : (
                  <div className="space-y-2">
                    {eventsForDay(selectedDay).map(renderEvent)}
                  </div>
                )}
              </Card>
            )}
          </>
        ) : (
          /* Annual View */
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4 mb-4">
              <button onClick={() => setViewYear((y) => y - 1)} className="text-gray-400 hover:text-amber-300 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <p className="text-gray-500 font-mono text-xs">Year {viewYear} — All Holidays & Events</p>
              <button onClick={() => setViewYear((y) => y + 1)} className="text-gray-400 hover:text-amber-300 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            {MONTHS.map((month) => {
              const monthEvents = allEvents.filter((e) => e.event_month === month.number);
              if (monthEvents.length === 0) return null;
              const isCurrent = month.number === currentDate.month && viewYear === currentDate.year;
              return (
                <Card key={month.number} className={`bg-gray-900/40 border-gray-700/50 p-4 ${isCurrent ? "border-amber-500/30" : ""}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`font-mono text-sm font-medium ${isCurrent ? "text-amber-300" : "text-gray-300"}`}>{month.name}</h3>
                    {month.season !== "-" && <span className="text-gray-600 font-mono text-xs">({month.season})</span>}
                    {isCurrent && <span className="text-amber-500/60 text-xs font-mono">← current</span>}
                  </div>
                  <div className="space-y-1.5">
                    {monthEvents.map((event) => (
                      <div key={event.id} className={`p-2 rounded ${event.is_holiday ? "bg-amber-500/5 border border-amber-500/20" : event.user_id ? "bg-cyan-500/5 border border-cyan-500/20" : "bg-emerald-500/5 border border-emerald-500/20"}`}>
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleHolidayExpand(event.id)}>
                          {event.is_holiday && <Star className="w-3 h-3 text-amber-400" />}
                          <p className={`text-xs font-medium flex-1 ${event.is_holiday ? "text-amber-300" : event.user_id ? "text-cyan-300" : "text-emerald-300"}`}>
                            {event.title}
                          </p>
                          <span className="text-gray-600 text-xs font-mono">
                            {formatDayRange(event)}
                          </span>
                          {event.description && (
                            expandedHolidays.has(event.id)
                              ? <ChevronUp className="w-3 h-3 text-gray-500" />
                              : <ChevronDown className="w-3 h-3 text-gray-500" />
                          )}
                        </div>
                        {expandedHolidays.has(event.id) && event.description && (
                          <p className="text-gray-500 text-xs mt-1 ml-5">{event.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex justify-center gap-6 text-xs font-mono text-gray-600 mt-6">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400" /> Holiday</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-cyan-400" /> Personal</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Universal</div>
        </div>

        <div className="text-center mt-8 text-gray-600 text-xs font-mono">
          <p>Timestop™ • Chronomancy Co. • "Every second counts"</p>
        </div>
      </div>

      {/* Share Event Dialog */}
      {shareEventId && (
        <ShareEventDialog
          open={!!shareEventId}
          onOpenChange={(open) => { if (!open) setShareEventId(null); }}
          eventId={shareEventId}
          eventTitle={shareEventTitle}
        />
      )}
    </div>
  );
};

export default Timestop;
