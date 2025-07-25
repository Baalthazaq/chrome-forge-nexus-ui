
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { 
  User, 
  Send, 
  Search, 
  Star, 
  Vault, 
  Settings, 
  Monitor, 
  ShoppingCart,
  Shield,
  Calendar,
  Heart,
  Eye,
  Sparkles,
  BookOpen,
  Users,
  LogOut
} from "lucide-react";

const apps = [
  {
    id: "charisma",
    name: "Cha",
    icon: Star,
    description: "Social Credit Network",
    route: "/charisma",
    color: "from-pink-500 to-purple-600"
  },
  {
    id: "sending",
    name: "Sending",
    icon: Send,
    description: "25-Word Messages",
    route: "/sending",
    color: "from-cyan-400 to-blue-500"
  },
  {
    id: "questseek",
    name: "Questseek",
    icon: Search,
    description: "Job Board",
    route: "/questseek",
    color: "from-emerald-400 to-teal-500"
  },
  {
    id: "succubus",
    name: "Succubus",
    icon: Heart,
    description: "Social Connections",
    route: "/succubus",
    color: "from-red-500 to-pink-500"
  },
  {
    id: "vault",
    name: "Vault",
    icon: Vault,
    description: "Inventory & Funds",
    route: "/vault",
    color: "from-yellow-400 to-orange-500"
  },
  {
    id: "doppleganger",
    name: "Doppleganger",
    icon: User,
    description: "ID Profile",
    route: "/doppleganger",
    color: "from-indigo-500 to-purple-500"
  },
  {
    id: "crucible",
    name: "Crucible",
    icon: Settings,
    description: "Cybernetics Interface",
    route: "/crucible",
    color: "from-gray-500 to-slate-600"
  },
  {
    id: "nexuswire",
    name: "NexusWire",
    icon: Sparkles,
    description: "News Network",
    route: "/nexuswire",
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: "brittlewisp",
    name: "Brittlewisp.inc",
    icon: Shield,
    description: "Security Services",
    route: "/brittlewisp",
    color: "from-violet-500 to-purple-600"
  },
  {
    id: "wyrmcart",
    name: "Wyrmcart",
    icon: ShoppingCart,
    description: "Shopping Network",
    route: "/wyrmcart",
    color: "from-green-500 to-emerald-500"
  },
  {
    id: "beholdr",
    name: "BeholdR",
    icon: Eye,
    description: "Neural Video Feed",
    route: "/beholdr",
    color: "from-purple-500 to-blue-500"
  },
  {
    id: "tome",
    name: "ToMe",
    icon: BookOpen,
    description: "Digital Notes",
    route: "/tome",
    color: "from-indigo-500 to-purple-500"
  },
  {
    id: "roldex",
    name: "Rol'dex",
    icon: Users,
    description: "Contact Network",
    route: "/roldex",
    color: "from-blue-500 to-indigo-500"
  }
];

const Index = () => {
  const { user, isLoading, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 text-xl font-mono">Loading Nexus...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1)_0%,transparent_50%)]"></div>
      
      {/* Scanline Effect */}
      <div className="absolute inset-0 opacity-20">
        <div className="h-full w-full bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent bg-[length:100%_4px] animate-pulse"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block relative">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
              NEXUS OS
            </h1>
            <div className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
          </div>
          <p className="text-gray-400 text-sm mt-4 font-mono">
            Neural Interface v2.7.4 • Authenticated
          </p>
          <div className="mt-4 flex gap-2">
            {isAdmin && (
              <Button 
                onClick={() => navigate('/admin')}
                variant="outline" 
                size="sm"
                className="bg-purple-900/50 border-purple-700 hover:bg-purple-800/50 text-purple-400 hover:text-purple-300"
              >
                <Shield className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
            <Button 
              onClick={signOut} 
              variant="outline" 
              size="sm"
              className="bg-gray-900/50 border-gray-700 hover:bg-gray-800/50 text-gray-400 hover:text-gray-300"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex justify-between items-center mb-8 px-4 py-2 bg-gray-900/50 rounded-lg border border-gray-800">
          <div className="flex items-center space-x-4 text-sm text-gray-400 font-mono">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>ONLINE</span>
            </div>
            <div>SIGNAL: 98%</div>
          </div>
          <div className="text-sm text-gray-400 font-mono">
            {new Date().toLocaleString('en-US', { 
              month: '2-digit', 
              day: '2-digit', 
              year: '2-digit',
              hour: '2-digit', 
              minute: '2-digit'
            })}
          </div>
        </div>

        {/* App Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 max-w-6xl mx-auto">
          {apps.map((app) => {
            const IconComponent = app.icon;
            return (
              <Link key={app.id} to={app.route} className="group">
                <Card className="relative p-6 bg-gray-900/30 border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/40 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-cyan-500/20">
                  {/* Glow Effect */}
                  <div className={`absolute inset-0 rounded-lg bg-gradient-to-br ${app.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300`}></div>
                  
                  {/* Icon */}
                  <div className="relative z-10 flex flex-col items-center space-y-3">
                    <div className={`p-4 rounded-xl bg-gradient-to-br ${app.color} group-hover:shadow-lg transition-all duration-300`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    
                    {/* App Info */}
                    <div className="text-center">
                      <h3 className="text-white font-semibold text-sm group-hover:text-cyan-300 transition-colors">
                        {app.name}
                      </h3>
                      <p className="text-gray-400 text-xs mt-1 font-mono">
                        {app.description}
                      </p>
                    </div>
                  </div>

                  {/* Border Glow */}
                  <div className="absolute inset-0 rounded-lg border border-transparent group-hover:border-cyan-500/50 transition-all duration-300"></div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Bottom Status */}
        <div className="text-center mt-12 text-gray-500 text-xs font-mono">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse"></div>
            <span>SYSTEM NOMINAL</span>
            <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse"></div>
          </div>
          <p>Brittlewisp Industries © 2087 • All rights reserved</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
