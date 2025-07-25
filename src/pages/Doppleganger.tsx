
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Shield, Zap, Eye, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const Doppleganger = () => {
  const { user } = useAuth();
  const { impersonatedUser } = useAdmin();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Use impersonated user if available, otherwise use authenticated user
  const displayUser = impersonatedUser || user;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!displayUser) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', displayUser.user_id || displayUser.id)
        .single();

      if (!error && data) {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [displayUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Please log in to access your profile.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-black to-purple-900/20"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Doppleganger
          </h1>
          <div className="w-20"></div>
        </div>

        {/* Profile Header */}
        <Card className="p-6 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border-indigo-500/30 mb-8">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-2">{profile.character_name || 'Unnamed Character'}</h2>
              <div className="text-indigo-400 text-lg mb-2">{profile.character_class || 'Netrunner'} • Level {profile.level || 1}</div>
              <div className="flex space-x-2">
                <Badge className="bg-green-600">Verified</Badge>
                <Badge className="bg-blue-600">Premium</Badge>
                <Badge className="bg-purple-600">Elite Status</Badge>
              </div>
            </div>
            <Button variant="outline" className="border-indigo-500 text-indigo-400">
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-4 bg-gray-900/30 border-gray-700/50">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-blue-400" />
              <div>
                <div className="text-gray-400 text-sm">Security Level</div>
                <div className="text-2xl font-bold text-white">AAA</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gray-900/30 border-gray-700/50">
            <div className="flex items-center space-x-3">
              <Zap className="w-8 h-8 text-yellow-400" />
              <div>
                <div className="text-gray-400 text-sm">Neural Rating</div>
                <div className="text-2xl font-bold text-white">9.2</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gray-900/30 border-gray-700/50">
            <div className="flex items-center space-x-3">
              <Eye className="w-8 h-8 text-green-400" />
              <div>
                <div className="text-gray-400 text-sm">Stealth Index</div>
                <div className="text-2xl font-bold text-white">87%</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gray-900/30 border-gray-700/50">
            <div className="flex items-center space-x-3">
              <User className="w-8 h-8 text-purple-400" />
              <div>
                <div className="text-gray-400 text-sm">Rep Score</div>
                <div className="text-2xl font-bold text-white">1,247</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Augmentations */}
        <Card className="p-6 bg-gray-900/30 border-gray-700/50 mb-8">
          <h3 className="text-xl font-semibold text-white mb-4">Active Augmentations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "Neural Interface MK-VII", type: "Neural", status: "Online", efficiency: "98%" },
              { name: "Retinal Display System", type: "Ocular", status: "Online", efficiency: "95%" },
              { name: "Subdermal Armor Plating", type: "Defensive", status: "Online", efficiency: "100%" },
              { name: "Enhanced Reflexes", type: "Motor", status: "Online", efficiency: "92%" },
              { name: "Encrypted Memory Bank", type: "Storage", status: "Online", efficiency: "100%" },
              { name: "Bio-Monitor Suite", type: "Medical", status: "Online", efficiency: "89%" }
            ].map((aug, index) => (
              <div key={index} className="p-4 bg-gray-800/50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-white font-semibold">{aug.name}</div>
                    <div className="text-gray-400 text-sm">{aug.type}</div>
                  </div>
                  <Badge className={aug.status === "Online" ? "bg-green-600" : "bg-red-600"}>
                    {aug.status}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Efficiency</span>
                  <span className="text-green-400 font-mono">{aug.efficiency}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Tags & Reputation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-gray-900/30 border-gray-700/50">
            <h3 className="text-xl font-semibold text-white mb-4">Reputation Tags</h3>
            <div className="flex flex-wrap gap-2">
              {[
                "Reliable", "Tech Specialist", "Discrete", "Fast Learner", 
                "Problem Solver", "Team Player", "Night Owl", "Risk Taker"
              ].map((tag, index) => (
                <Badge key={index} variant="outline" className="border-indigo-500 text-indigo-400">
                  {tag}
                </Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-gray-900/30 border-gray-700/50">
            <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {[
                "Completed neural interface calibration",
                "Updated security protocols",
                "Earned 'Elite Netrunner' certification",
                "Profile verification renewed"
              ].map((activity, index) => (
                <div key={index} className="text-gray-300 text-sm p-2 bg-gray-800/50 rounded">
                  {activity}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Doppleganger;
