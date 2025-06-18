
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Wyrmcart = () => {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-black to-emerald-900/20"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            Wyrmcart
          </h1>
          <div className="w-20"></div>
        </div>

        <Card className="p-8 bg-gray-900/30 border-green-500/30 text-center">
          <div className="text-green-400 text-6xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold text-white mb-4">Marketplace Offline</h2>
          <p className="text-gray-400 mb-6">
            Shopping network is temporarily unavailable for system updates.<br/>
            Emergency supplies available through secure channels.
          </p>
          <Button variant="outline" className="border-green-500 text-green-400">
            Emergency Supplies
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Wyrmcart;
