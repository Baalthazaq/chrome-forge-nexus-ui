
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Cpu, Zap, Heart, Eye, Shield, Activity, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

const Crucible = () => {
  const augmentations = [
    {
      name: "Neural Interface",
      type: "Cognitive",
      status: "Active",
      integrity: 95,
      icon: Cpu,
      description: "Direct brain-computer interface for enhanced processing",
      lastMaintenance: "12 days ago"
    },
    {
      name: "Adrenal Boosters",
      type: "Physical", 
      status: "Active",
      integrity: 88,
      icon: Zap,
      description: "Enhanced adrenaline production for combat situations",
      lastMaintenance: "6 days ago"
    },
    {
      name: "Cardiac Regulator",
      type: "Medical",
      status: "Warning",
      integrity: 74,
      icon: Heart,
      description: "Artificial heart valve with trauma resistance",
      lastMaintenance: "18 days ago"
    },
    {
      name: "Optical Enhancement", 
      type: "Sensory",
      status: "Active",
      integrity: 92,
      icon: Eye,
      description: "Enhanced vision with thermal and night vision modes",
      lastMaintenance: "8 days ago"
    }
  ];

  const availableUpgrades = [
    {
      name: "Subdermal Armor Mk-III",
      type: "Defensive",
      price: "₢ 45,000",
      compatibility: 98,
      icon: Shield,
      description: "Military-grade subdermal plating with kinetic dispersion"
    },
    {
      name: "Reflexive Response System",
      type: "Combat",
      price: "₢ 67,000", 
      compatibility: 85,
      icon: Activity,
      description: "Automated defensive responses for incoming threats"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "text-green-400";
      case "Warning": return "text-yellow-400";
      case "Critical": return "text-red-400";
      default: return "text-gray-400";
    }
  };

  const getIntegrityColor = (integrity: number) => {
    if (integrity >= 90) return "from-green-500 to-emerald-500";
    if (integrity >= 75) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-red-600";
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/20 via-black to-slate-900/20"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
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
          <Button variant="ghost" className="text-gray-400">
            <Activity className="w-5 h-5" />
          </Button>
        </div>

        {/* System Status */}
        <Card className="p-6 bg-gray-900/30 border-gray-500/30 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">System Overview</h2>
            <Badge variant="outline" className="border-green-500 text-green-400">
              All Systems Operational
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">4</div>
              <div className="text-gray-400 text-sm">Active Augments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">89%</div>
              <div className="text-gray-400 text-sm">Avg Integrity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">2.4kW</div>
              <div className="text-gray-400 text-sm">Power Draw</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">1</div>
              <div className="text-gray-400 text-sm">Warnings</div>
            </div>
          </div>
        </Card>

        {/* Current Augmentations */}
        <h2 className="text-xl font-semibold text-white mb-6">Installed Augmentations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {augmentations.map((aug, index) => (
            <Card key={index} className="p-6 bg-gray-900/30 border-gray-700/50 hover:border-gray-500/50 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <aug.icon className="w-8 h-8 text-blue-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">{aug.name}</h3>
                    <Badge variant="outline" className="border-blue-600 text-blue-400 text-xs">
                      {aug.type}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {aug.status === "Warning" && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                  <span className={`text-sm font-semibold ${getStatusColor(aug.status)}`}>
                    {aug.status}
                  </span>
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-4">{aug.description}</p>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Integrity</span>
                  <span className="text-sm font-semibold text-white">{aug.integrity}%</span>
                </div>
                <Progress value={aug.integrity} className="h-2" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Last maintenance: {aug.lastMaintenance}</span>
                <Button size="sm" variant="outline" className="border-gray-600 text-gray-400">
                  Diagnose
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Available Upgrades */}
        <h2 className="text-xl font-semibold text-white mb-6">Available Upgrades</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {availableUpgrades.map((upgrade, index) => (
            <Card key={index} className="p-6 bg-gray-900/30 border-gray-700/50 hover:border-blue-500/30 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <upgrade.icon className="w-8 h-8 text-cyan-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">{upgrade.name}</h3>
                    <Badge variant="outline" className="border-cyan-600 text-cyan-400 text-xs">
                      {upgrade.type}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-cyan-400">{upgrade.price}</div>
                  <div className="text-xs text-gray-400">{upgrade.compatibility}% compatible</div>
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-4">{upgrade.description}</p>

              <div className="flex items-center justify-between">
                <div className="w-full bg-gray-700 rounded-full h-2 mr-4">
                  <div 
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                    style={{ width: `${upgrade.compatibility}%` }}
                  ></div>
                </div>
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
                  Install
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Crucible;
