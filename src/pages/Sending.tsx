
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Clock, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const Sending = () => {
  const [message, setMessage] = useState("");
  const wordCount = message.trim().split(/\s+/).filter(word => word.length > 0).length;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-black to-blue-900/20"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Sending
          </h1>
          <div className="w-20"></div>
        </div>

        {/* Compose Stone */}
        <Card className="p-6 bg-gray-900/50 border-cyan-500/30 mb-8">
          <h2 className="text-cyan-400 text-lg mb-4">Cast a Stone</h2>
          <div className="space-y-4">
            <div className="relative">
              <Input
                placeholder="Enter your 25-word message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
              />
              <div className={`absolute right-3 top-3 text-sm font-mono ${
                wordCount > 25 ? 'text-red-400' : wordCount > 20 ? 'text-yellow-400' : 'text-gray-400'
              }`}>
                {wordCount}/25
              </div>
            </div>
            <Button 
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              disabled={wordCount === 0 || wordCount > 25}
            >
              <Send className="w-4 h-4 mr-2" />
              Send Stone
            </Button>
          </div>
        </Card>

        {/* Recent Stones */}
        <Card className="p-6 bg-gray-900/30 border-gray-700/50">
          <h3 className="text-xl font-semibold text-white mb-4">Recent Stones</h3>
          <div className="space-y-4">
            {[
              {
                sender: "@NeonRunner",
                message: "Job complete. Payment transferred. Package secure. No complications. Clean extraction from sector seven. Client satisfied with results. Next assignment available tomorrow.",
                time: "5 min ago",
                status: "delivered"
              },
              {
                sender: "@CyberWitch",
                message: "Market data corrupted. Backup systems offline. Emergency protocols activated. Estimated recovery time six hours. All transactions suspended until further notice.",
                time: "1 hour ago",
                status: "delivered"
              },
              {
                sender: "@GhostInShell",
                message: "Security breach detected. Initiating lockdown procedures. All personnel evacuate immediately. This is not a drill. Repeat evacuation order in effect.",
                time: "3 hours ago",
                status: "read"
              },
              {
                sender: "@TechSamurai",
                message: "Augmentation successful. Recovery proceeding normally. New capabilities integrating smoothly. Training sessions begin next week. Thanks for the referral and support.",
                time: "1 day ago",
                status: "read"
              }
            ].map((stone, index) => (
              <div key={index} className="p-4 bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-cyan-400" />
                    <span className="text-cyan-400 font-semibold">{stone.sender}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-400 text-sm">
                    <Clock className="w-3 h-3" />
                    <span>{stone.time}</span>
                    <div className={`w-2 h-2 rounded-full ${
                      stone.status === 'delivered' ? 'bg-green-400' : 'bg-gray-500'
                    }`}></div>
                  </div>
                </div>
                <p className="text-gray-300 text-sm font-mono leading-relaxed">
                  {stone.message}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Sending;
