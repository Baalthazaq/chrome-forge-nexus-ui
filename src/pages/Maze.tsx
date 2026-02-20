
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MapPin, Navigation, Compass, Route, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Maze = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(20,184,166,0.08)_0%,transparent_50%)]" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(rgba(20,184,166,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-green-400 bg-clip-text text-transparent mb-1">
            MAZE
          </h1>
          <p className="text-gray-500 text-xs font-mono tracking-widest">by Ariadne Technologies</p>
          <p className="text-gray-400 text-sm mt-3 font-mono">
            Find your way.
          </p>
        </div>

        {/* Mock search bar */}
        <div className="mb-8">
          <div className="flex items-center bg-gray-900/60 border border-gray-700/50 rounded-lg px-4 py-3">
            <Search className="w-5 h-5 text-teal-500/50 mr-3" />
            <span className="text-gray-500 font-mono text-sm">Search locations, districts, points of interest...</span>
          </div>
        </div>

        {/* Mock map area */}
        <Card className="bg-gray-900/40 border-gray-700/50 p-1 mb-6 overflow-hidden">
          <div className="relative h-64 md:h-80 bg-gray-900/80 rounded-md flex items-center justify-center overflow-hidden">
            {/* Fake map grid */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'linear-gradient(rgba(20,184,166,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.5) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }} />
            {/* Fake roads */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-teal-500/20" />
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-teal-500/20" />
            <div className="absolute top-1/4 left-0 right-0 h-px bg-teal-500/10" />
            <div className="absolute top-0 bottom-0 left-1/4 w-px bg-teal-500/10" />
            <div className="absolute top-0 bottom-0 left-3/4 w-px bg-teal-500/10" />
            <div className="absolute top-3/4 left-0 right-0 h-px bg-teal-500/10" />

            {/* Center pin */}
            <div className="relative z-10 flex flex-col items-center">
              <MapPin className="w-10 h-10 text-teal-400 drop-shadow-lg animate-bounce" />
              <div className="mt-2 px-3 py-1 bg-black/70 border border-teal-500/30 rounded text-teal-300 text-xs font-mono">
                You are here
              </div>
            </div>

            {/* Scattered fake pins */}
            <MapPin className="absolute top-8 left-16 w-4 h-4 text-gray-600" />
            <MapPin className="absolute top-20 right-24 w-4 h-4 text-gray-600" />
            <MapPin className="absolute bottom-16 left-1/3 w-4 h-4 text-gray-600" />
            <MapPin className="absolute bottom-24 right-12 w-4 h-4 text-gray-600" />
          </div>
        </Card>

        {/* Quick action buttons */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Navigation, label: "Directions" },
            { icon: Compass, label: "Explore" },
            { icon: Route, label: "Routes" },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex flex-col items-center gap-2 py-4 bg-gray-900/50 border border-gray-700/50 rounded-lg text-gray-500 cursor-not-allowed"
            >
              <Icon className="w-5 h-5 text-teal-500/40" />
              <span className="text-xs font-mono">{label}</span>
            </button>
          ))}
        </div>

        {/* Coming soon notice */}
        <div className="text-center py-8 border border-dashed border-teal-500/20 rounded-lg bg-teal-500/5">
          <Compass className="w-8 h-8 text-teal-500/30 mx-auto mb-3" />
          <p className="text-teal-400/70 font-mono text-sm mb-1">Mapping in Progress</p>
          <p className="text-gray-500 text-xs font-mono">Ariadne is still charting the sprawl. Check back soon.</p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600 text-xs font-mono">
          <p>Maze™ • Ariadne Technologies • "Every path leads somewhere"</p>
        </div>
      </div>
    </div>
  );
};

export default Maze;
