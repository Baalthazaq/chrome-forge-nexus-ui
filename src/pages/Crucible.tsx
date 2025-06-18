
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Crucible = () => {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/20 via-black to-slate-900/20"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-400 to-slate-400 bg-clip-text text-transparent">
            Crucible
          </h1>
          <div className="w-20"></div>
        </div>

        <Card className="p-8 bg-gray-900/30 border-gray-500/30 text-center">
          <div className="text-gray-400 text-6xl mb-4">🔧</div>
          <h2 className="text-2xl font-bold text-white mb-4">Maintenance Mode</h2>
          <p className="text-gray-400 mb-6">
            Cybernetics interface is currently undergoing scheduled maintenance.<br/>
            Please check back in 2-4 hours.
          </p>
          <div className="text-yellow-400 font-mono text-sm">
            Estimated completion: 23:47:12
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Crucible;
