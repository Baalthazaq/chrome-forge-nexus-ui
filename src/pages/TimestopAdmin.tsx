
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Trash2, Star, FastForward, Loader2, Calendar, ChevronDown, ChevronUp, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MONTHS, DAY_NAMES, formatGameDate, isFrippery, getMonth, getBillingTriggers, getBillingDescription, advanceDay, type GameDate } from "@/lib/gameCalendar";
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

const TimestopAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewMonth, setViewMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [advanceDays, setAdvanceDays] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIsRecurring, setNewIsRecurring] = useState(false);
  const [newEventType, setNewEventType] = useState<"universal" | "holiday">("universal");
  const [expandedHolidays, setExpandedHolidays] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // Set date state
  const [setDateOpen, setSetDateOpen] = useState(false);
  const [setDay, setSetDay] = useState(1);
  const [setMonth, setSetMonth] = useState(1);
  const [setYear, setSetYear] = useState(2626);

  const { data: gameDate } = useQuery({
    queryKey: ["game-calendar"],
    queryFn: async () => {
      const { data, error } = await supabase.from("game_calendar").select("*").limit(1).single();
      if (error) throw error;
      return data as { id: string; current_day: number; current_month: number; current_year: number };
    },
  });

  const currentDate: GameDate = gameDate
    ? { day: gameDate.current_day, month: gameDate.current_month, year: gameDate.current_year }
    : { day: 1, month: 1, year: 1 };

  const { data: events = [] } = useQuery({
    queryKey: ["calendar-events-admin", viewMonth],
    queryFn: async () => {
      const { data, error } = await supabase.from("calendar_events").select("*").eq("event_month", viewMonth);
      if (error) throw error;
      return data as CalendarEvent[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, character_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["calendar-search-admin", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const { data, error } = await supabase.from("calendar_events").select("*").ilike("title", `%${searchQuery}%`);
      if (error) throw error;
      return data as CalendarEvent[];
    },
    enabled: searchQuery.trim().length > 0,
  });

  const getCharName = (userId: string | null) => {
    if (!userId) return "Universal";
    return profiles.find((p) => p.user_id === userId)?.character_name || "Unknown";
  };

  const advanceMutation = useMutation({
    mutationFn: async (days: number) => {
      const { data, error } = await supabase.functions.invoke("advance-day", { body: { days } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["game-calendar"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setConfirmOpen(false);
      toast({
        title: `Advanced ${data.daysAdvanced} day(s)`,
        description: data.billing?.length ? `Billing: ${data.billing.join(", ")}` : "No billing triggered",
      });
    },
    onError: (err: any) => {
      toast({ title: "Error advancing day", description: err.message, variant: "destructive" });
    },
  });

  const setDateMutation = useMutation({
    mutationFn: async ({ day, month, year }: { day: number; month: number; year: number }) => {
      const { data, error } = await supabase.functions.invoke("advance-day", {
        body: { operation: "set_date", day, month, year },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["game-calendar"] });
      setSetDateOpen(false);
      toast({ title: "Date set", description: `Now: ${formatGameDate(data.newDate)}` });
    },
    onError: (err: any) => {
      toast({ title: "Error setting date", description: err.message, variant: "destructive" });
    },
  });

  const addUniversalEvent = useMutation({
    mutationFn: async () => {
      if (!selectedDay) return;
      const { error } = await supabase.from("calendar_events").insert({
        user_id: null,
        title: newTitle,
        description: newDesc || null,
        event_day: selectedDay,
        event_month: viewMonth,
        event_year: newIsRecurring ? null : currentDate.year,
        is_holiday: newEventType === "holiday",
        is_recurring: newIsRecurring || newEventType === "holiday",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      setNewTitle("");
      setNewDesc("");
      setNewIsRecurring(false);
      setNewEventType("universal");
      setAddEventOpen(false);
      toast({ title: newEventType === "holiday" ? "Holiday added" : "Universal event added" });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast({ title: "Event deleted" });
    },
  });

  const toggleHolidayExpand = (id: string) => {
    setExpandedHolidays((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const previewDate = (() => {
    let d = { ...currentDate };
    for (let i = 0; i < advanceDays; i++) d = advanceDay(d);
    return d;
  })();
  const previewTriggers = getBillingTriggers(previewDate);
  const previewBilling = getBillingDescription(previewTriggers);

  const monthInfo = getMonth(viewMonth);
  const frippery = isFrippery(viewMonth);
  const specificDayEvents = events.filter((e) => e.event_day > 0);
  const allMonthEvents = events.filter((e) => e.event_day === 0);
  const eventsForDay = (day: number) => specificDayEvents.filter((e) => e.event_day === day);
  const dayHasHoliday = (day: number) => specificDayEvents.some((e) => e.event_day === day && e.is_holiday);

  const prevMonth = () => setViewMonth((m) => (m <= 1 ? 14 : m - 1));
  const nextMonth = () => setViewMonth((m) => (m >= 14 ? 1 : m + 1));
  const isCurrentDay = (day: number) => viewMonth === currentDate.month && day === currentDate.day;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="text-gray-400 hover:text-white hover:bg-gray-800/50">
            <ArrowLeft className="w-4 h-4 mr-2" /> Admin
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSearchOpen(!searchOpen)} className="text-gray-400 hover:text-white hover:bg-gray-800/50">
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        {searchOpen && (
          <Card className="bg-gray-900/40 border-gray-700/50 p-3 mb-4">
            <Input placeholder="Search events..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-gray-800 border-gray-700 text-white text-sm" autoFocus />
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((event) => {
                  const m = getMonth(event.event_month);
                  return (
                    <div key={event.id} className="p-2 rounded bg-gray-800/50 cursor-pointer hover:bg-gray-700/50" onClick={() => { setViewMonth(event.event_month); if (event.event_day > 0) setSelectedDay(event.event_day); setSearchOpen(false); setSearchQuery(""); }}>
                      <p className={`text-xs font-medium ${event.is_holiday ? "text-amber-300" : "text-cyan-300"}`}>{event.title}</p>
                      <p className="text-gray-500 text-xs">{event.event_day > 0 ? `${event.event_day} of ` : ""}{m?.name || "Unknown"} — {getCharName(event.user_id)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent mb-1">TIMESTOP ADMIN</h1>
          <p className="text-amber-300/80 font-mono text-sm">{formatGameDate(currentDate)}</p>
        </div>

        {/* Advance Day & Set Date Controls */}
        <Card className="bg-gray-900/40 border-gray-700/50 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-gray-400 text-xs font-mono">Advance:</label>
              <Input type="number" min={1} max={365} value={advanceDays} onChange={(e) => setAdvanceDays(Math.max(1, parseInt(e.target.value) || 1))} className="w-20 bg-gray-800 border-gray-700 text-white text-sm" />
              <span className="text-gray-500 text-xs font-mono">day(s)</span>
            </div>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogTrigger asChild>
                <Button className="bg-amber-600 hover:bg-amber-700">
                  <FastForward className="w-4 h-4 mr-2" /> Advance Day
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700">
                <DialogHeader><DialogTitle className="text-amber-300">Confirm Advance</DialogTitle></DialogHeader>
                <div className="space-y-3 text-sm">
                  <p className="text-gray-300">
                    Advance <span className="text-amber-300 font-bold">{advanceDays}</span> day(s) to{" "}
                    <span className="text-amber-300 font-bold">{formatGameDate(previewDate)}</span>?
                  </p>
                  {advanceDays === 1 && previewBilling.length > 0 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded">
                      <p className="text-amber-400 text-xs font-mono mb-1">Billing will trigger:</p>
                      {previewBilling.map((b) => <p key={b} className="text-amber-300/70 text-xs">• {b}</p>)}
                    </div>
                  )}
                  {advanceDays > 1 && <p className="text-gray-500 text-xs">Billing will be processed for each day individually.</p>}
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setConfirmOpen(false)} className="text-gray-400">Cancel</Button>
                  <Button onClick={() => advanceMutation.mutate(advanceDays)} disabled={advanceMutation.isPending} className="bg-amber-600 hover:bg-amber-700">
                    {advanceMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Confirm
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Set Date */}
            <Dialog open={setDateOpen} onOpenChange={setSetDateOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-gray-700 text-gray-300 hover:text-white">
                  <Calendar className="w-4 h-4 mr-2" /> Set Date
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700">
                <DialogHeader><DialogTitle className="text-amber-300">Set Date (No Billing)</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <p className="text-gray-500 text-xs">Jump directly to a date without triggering any billing or advances.</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-gray-400 text-xs">Day</label>
                      <Input type="number" min={1} max={28} value={setDay} onChange={(e) => setSetDay(parseInt(e.target.value) || 1)} className="bg-gray-800 border-gray-700 text-white" />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs">Month</label>
                      <Select value={String(setMonth)} onValueChange={(v) => setSetMonth(parseInt(v))}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 z-50">
                          {MONTHS.map((m) => (
                            <SelectItem key={m.number} value={String(m.number)} className="text-white hover:bg-gray-700">
                              {m.number}. {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs">Year</label>
                      <Input type="number" min={1} value={setYear} onChange={(e) => setSetYear(parseInt(e.target.value) || 1)} className="bg-gray-800 border-gray-700 text-white" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setSetDateOpen(false)} className="text-gray-400">Cancel</Button>
                  <Button onClick={() => setDateMutation.mutate({ day: setDay, month: setMonth, year: setYear })} disabled={setDateMutation.isPending} className="bg-amber-600 hover:bg-amber-700">
                    {setDateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Set Date
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        {/* Calendar Grid */}
        <Card className="bg-gray-900/40 border-gray-700/50 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="text-gray-400 hover:text-amber-300 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <div className="text-center">
              <span className="text-amber-300/80 font-mono text-sm">{monthInfo?.name}</span>
              {monthInfo && monthInfo.season !== "-" && <span className="text-gray-500 font-mono text-xs ml-2">({monthInfo.season})</span>}
            </div>
            <button onClick={nextMonth} className="text-gray-400 hover:text-amber-300 transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>

          {frippery ? (
            <div className="text-center py-8">
              <div onClick={() => setSelectedDay(1)} className={`inline-block px-8 py-4 rounded-lg cursor-pointer transition-all ${isCurrentDay(1) ? "bg-amber-500/20 border-2 border-amber-500/60 text-amber-300" : "bg-gray-800/50 border border-gray-700/50 text-gray-300 hover:border-amber-500/30"}`}>
                <Star className="w-6 h-6 mx-auto mb-2 text-amber-400" />
                <p className="font-mono text-sm">Day of Frippery</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 text-center">
              {DAY_NAMES.map((d) => <div key={d} className="text-gray-500 text-xs font-mono py-1">{d}</div>)}
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                const dayEvents = eventsForDay(day);
                const current = isCurrentDay(day);
                const selected = selectedDay === day;
                const holiday = dayHasHoliday(day);
                return (
                  <div key={day} onClick={() => setSelectedDay(day)} className={`py-2 text-xs font-mono rounded cursor-pointer transition-all ${
                    current ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : holiday ? "bg-amber-500/10 text-amber-400/80 border border-amber-500/20"
                    : selected ? "bg-gray-700/50 text-white border border-gray-500/50"
                    : "text-gray-500 hover:bg-gray-800/50"
                  }`}>
                    {day}
                    {dayEvents.length > 0 && (
                      <div className="flex justify-center gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map((e) => (
                          <div key={e.id} className={`w-1.5 h-1.5 rounded-full ${e.is_holiday ? "bg-amber-400" : e.user_id ? "bg-cyan-400" : "bg-emerald-400"}`} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* All/Any month holidays at bottom */}
          {allMonthEvents.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-700/30 space-y-1.5">
              {allMonthEvents.map((event) => (
                <div key={event.id} className="p-2 rounded bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleHolidayExpand(event.id)}>
                    <Star className="w-3 h-3 text-amber-400" />
                    <p className="text-xs font-medium text-amber-300 flex-1">{event.title}</p>
                    <span className="text-xs text-amber-500/50">All month</span>
                    {event.description && (expandedHolidays.has(event.id) ? <ChevronUp className="w-3 h-3 text-amber-500/60" /> : <ChevronDown className="w-3 h-3 text-amber-500/60" />)}
                  </div>
                  {expandedHolidays.has(event.id) && event.description && <p className="text-gray-500 text-xs mt-1 ml-5">{event.description}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Selected day events */}
        {selectedDay !== null && (
          <Card className="bg-gray-900/40 border-gray-700/50 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-amber-300/80 font-mono text-sm">
                {frippery ? "Day of Frippery" : `${selectedDay} of ${monthInfo?.name}`} — All Events
              </h3>
              <Dialog open={addEventOpen} onOpenChange={setAddEventOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-emerald-400 hover:text-emerald-300">
                    <Plus className="w-4 h-4 mr-1" /> Add Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-700">
                  <DialogHeader><DialogTitle className="text-emerald-300">Add Event</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Type</label>
                      <Select value={newEventType} onValueChange={(v) => setNewEventType(v as "universal" | "holiday")}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 z-50">
                          <SelectItem value="universal" className="text-white hover:bg-gray-700">Universal Note</SelectItem>
                          <SelectItem value="holiday" className="text-white hover:bg-gray-700">Holiday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Input placeholder="Event title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="bg-gray-800 border-gray-700 text-white" />
                    <Textarea placeholder="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="bg-gray-800 border-gray-700 text-white" />
                    {newEventType === "universal" && (
                      <label className="flex items-center gap-2 text-gray-400 text-sm">
                        <input type="checkbox" checked={newIsRecurring} onChange={(e) => setNewIsRecurring(e.target.checked)} className="rounded" />
                        Recurring yearly
                      </label>
                    )}
                  </div>
                  <DialogFooter>
                    <Button onClick={() => addUniversalEvent.mutate()} disabled={!newTitle.trim() || addUniversalEvent.isPending} className={newEventType === "holiday" ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}>Add</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {eventsForDay(selectedDay).length === 0 ? (
              <p className="text-gray-600 text-xs font-mono">No events.</p>
            ) : (
              <div className="space-y-2">
                {eventsForDay(selectedDay).map((event) => (
                  <div key={event.id} className={`p-3 rounded border ${event.is_holiday ? "border-amber-500/30 bg-amber-500/5" : event.user_id ? "border-cyan-500/30 bg-cyan-500/5" : "border-emerald-500/30 bg-emerald-500/5"}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className={`flex items-center gap-2 ${event.is_holiday ? "cursor-pointer" : ""}`} onClick={() => event.is_holiday && toggleHolidayExpand(event.id)}>
                          <p className={`text-sm font-medium ${event.is_holiday ? "text-amber-300" : event.user_id ? "text-cyan-300" : "text-emerald-300"}`}>
                            {event.title}
                            <span className="ml-2 text-xs text-gray-500">{event.is_holiday ? "Holiday" : getCharName(event.user_id)}</span>
                          </p>
                          {event.is_holiday && event.description && (expandedHolidays.has(event.id) ? <ChevronUp className="w-3 h-3 text-amber-500/60" /> : <ChevronDown className="w-3 h-3 text-amber-500/60" />)}
                        </div>
                        {event.is_holiday && expandedHolidays.has(event.id) && event.description && <p className="text-gray-500 text-xs mt-1">{event.description}</p>}
                        {!event.is_holiday && event.description && <p className="text-gray-500 text-xs mt-1">{event.description}</p>}
                      </div>
                      {!event.is_holiday && (
                        <Button size="sm" variant="ghost" onClick={() => deleteEvent.mutate(event.id)} className="text-red-400 hover:text-red-300 h-6 w-6 p-0">
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
      </div>
    </div>
  );
};

export default TimestopAdmin;
