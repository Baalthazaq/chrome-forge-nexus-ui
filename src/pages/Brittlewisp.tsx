
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Brittlewisp = () => {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-black to-purple-900/20"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            Brittlewisp.inc
          </h1>
          <div className="w-20"></div>
        </div>

        <Card className="p-8 bg-gray-900/30 border-violet-500/30 text-center">
          <div className="text-violet-400 text-6xl mb-4">🛡️</div>
          <h2 className="text-2xl font-bold text-white mb-4">Premium Security Services</h2>
          <p className="text-gray-400 mb-6">
            Corporate-grade illusion and protection systems.<br/>
            Contact authorized dealers for consultation.
          </p>
          <Button className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600">
            Schedule Consultation
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Brittlewisp;
