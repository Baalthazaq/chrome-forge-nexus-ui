
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, TrendingUp, Users, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const Charisma = () => {
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
        <div className="text-white">Please log in to access Charisma.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-pink-900/20 via-black to-purple-900/20"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Charisma
          </h1>
          <div className="w-20"></div>
        </div>

        {/* Social Credit Score */}
        <Card className="p-6 bg-gray-900/50 border-pink-500/30 mb-8">
          <div className="text-center">
            <h2 className="text-pink-400 text-lg mb-2">Social Credit Score for {profile.character_name}</h2>
            <div className="text-6xl font-bold text-white mb-2">{profile.credits || 0}</div>
            <div className="flex items-center justify-center space-x-2 text-green-400">
              <TrendingUp className="w-4 h-4" />
              <span>Level {profile.level || 1}</span>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-4 bg-gray-900/30 border-gray-700/50">
            <div className="flex items-center space-x-3">
              <Star className="w-8 h-8 text-yellow-400" />
              <div>
                <div className="text-2xl font-bold text-white">4.7</div>
                <div className="text-gray-400 text-sm">Avg Rating</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gray-900/30 border-gray-700/50">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-blue-400" />
              <div>
                <div className="text-2xl font-bold text-white">1,247</div>
                <div className="text-gray-400 text-sm">Connections</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gray-900/30 border-gray-700/50">
            <div className="flex items-center space-x-3">
              <Heart className="w-8 h-8 text-red-400" />
              <div>
                <div className="text-2xl font-bold text-white">89%</div>
                <div className="text-gray-400 text-sm">Trust Score</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="p-6 bg-gray-900/30 border-gray-700/50">
          <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { action: "Rated 5★ by @CyberSamurai", time: "2 hours ago", points: "+15" },
              { action: "Completed job for NeoCorp", time: "1 day ago", points: "+25" },
              { action: "Endorsed by @TechWitch", time: "2 days ago", points: "+10" },
              { action: "Trust verification updated", time: "3 days ago", points: "+5" },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div>
                  <div className="text-white">{activity.action}</div>
                  <div className="text-gray-400 text-sm">{activity.time}</div>
                </div>
                <div className="text-green-400 font-mono">{activity.points}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Charisma;
