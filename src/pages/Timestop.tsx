
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Clock, CalendarDays, Bell, Timer, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Timestop = () => {
  const navigate = useNavigate();

  const today = new Date();
  const monthName = today.toLocaleString('default', { month: 'long' });
  const year = today.getFullYear();
  const daysInMonth = new Date(year, today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(year, today.getMonth(), 1).getDay();

  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

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

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent mb-1">
            TIMESTOP
          </h1>
          <p className="text-gray-500 text-xs font-mono tracking-widest">by Chronomancy Co.</p>
        </div>

        {/* Mock calendar */}
        <Card className="bg-gray-900/40 border-gray-700/50 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button className="text-gray-600 cursor-not-allowed"><ChevronLeft className="w-5 h-5" /></button>
            <span className="text-amber-300/80 font-mono text-sm">{monthName} {year}</span>
            <button className="text-gray-600 cursor-not-allowed"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {dayNames.map(d => (
              <div key={d} className="text-gray-500 text-xs font-mono py-1">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
              <div
                key={day}
                className={`py-2 text-xs font-mono rounded ${
                  day === today.getDate()
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-gray-500'
                }`}
              >
                {day}
              </div>
            ))}
          </div>
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Bell, label: "Reminders" },
            { icon: Timer, label: "Countdown" },
            { icon: CalendarDays, label: "Events" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex flex-col items-center gap-2 py-4 bg-gray-900/50 border border-gray-700/50 rounded-lg text-gray-500 cursor-not-allowed"
            >
              <Icon className="w-5 h-5 text-amber-500/40" />
              <span className="text-xs font-mono">{label}</span>
            </button>
          ))}
        </div>

        {/* Coming soon */}
        <div className="text-center py-8 border border-dashed border-amber-500/20 rounded-lg bg-amber-500/5">
          <Clock className="w-8 h-8 text-amber-500/30 mx-auto mb-3" />
          <p className="text-amber-400/70 font-mono text-sm mb-1">Time Suspended</p>
          <p className="text-gray-500 text-xs font-mono">Chronomancy Co. is still calibrating. Check back soon.</p>
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
