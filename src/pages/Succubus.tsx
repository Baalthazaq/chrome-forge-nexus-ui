
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, MessageCircle, Star, MapPin, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Succubus = () => {
  const matches = [
    {
      id: 1,
      name: "Kira",
      age: 28,
      distance: "2.3 km",
      bio: "Street samurai with a love for neon nights and plasma cocktails. Looking for someone who can keep up.",
      tags: ["Combat Ready", "Night Owl", "Tech Savvy"],
      rating: 4.9,
      image: "🔥",
      compatibility: 94
    },
    {
      id: 2,
      name: "Zex",
      age: 31,
      distance: "1.8 km", 
      bio: "Corporate hacker by day, underground racer by night. Let's break some protocols together.",
      tags: ["Hacker", "Adrenaline", "Anti-Corp"],
      rating: 4.7,
      image: "⚡",
      compatibility: 89
    },
    {
      id: 3,
      name: "Nova",
      age: 25,
      distance: "4.1 km",
      bio: "Psychic operative with trust issues. If you can handle my mind tricks, swipe right.",
      tags: ["Psychic", "Mysterious", "Dangerous"],
      rating: 4.8,
      image: "🔮",
      compatibility: 76
    }
  ];

  const messages = [
    { name: "Raven", preview: "That job at the port was intense...", time: "12m", unread: true },
    { name: "Jax", preview: "Meet me at the usual spot tonight", time: "2h", unread: false },
    { name: "Echo", preview: "I have information you need", time: "1d", unread: true }
  ];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-black to-pink-900/20"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
            Succubus
          </h1>
          <Button variant="ghost" className="text-pink-400">
            <MessageCircle className="w-5 h-5" />
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="p-4 bg-gray-900/30 border-red-500/30 text-center">
            <div className="text-2xl font-bold text-red-400">47</div>
            <div className="text-gray-400 text-sm">Matches</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-pink-500/30 text-center">
            <div className="text-2xl font-bold text-pink-400">12</div>
            <div className="text-gray-400 text-sm">Active Chats</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-purple-500/30 text-center">
            <div className="text-2xl font-bold text-purple-400">4.8</div>
            <div className="text-gray-400 text-sm">Trust Rating</div>
          </Card>
        </div>

        {/* New Matches */}
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
          <Heart className="w-5 h-5 mr-2 text-red-400" />
          New Connections
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {matches.map((match) => (
            <Card key={match.id} className="p-6 bg-gray-900/30 border-gray-700/50 hover:border-red-500/50 transition-all duration-300">
              <div className="text-center mb-4">
                <div className="text-6xl mb-2">{match.image}</div>
                <h3 className="text-xl font-semibold text-white">{match.name}, {match.age}</h3>
                <div className="flex items-center justify-center text-gray-400 text-sm mt-1">
                  <MapPin className="w-3 h-3 mr-1" />
                  {match.distance}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Compatibility</span>
                  <span className="text-sm font-semibold text-green-400">{match.compatibility}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-red-500 to-pink-500 h-2 rounded-full"
                    style={{ width: `${match.compatibility}%` }}
                  ></div>
                </div>
              </div>

              <p className="text-gray-300 text-sm mb-4">{match.bio}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {match.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="border-red-600 text-red-400 text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1 text-yellow-400">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm">{match.rating}</span>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="border-red-500 text-red-400">
                    Pass
                  </Button>
                  <Button size="sm" className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600">
                    Connect
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Active Messages */}
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
          <MessageCircle className="w-5 h-5 mr-2 text-pink-400" />
          Encrypted Messages
        </h2>

        <div className="space-y-4">
          {messages.map((message, index) => (
            <Card key={index} className="p-4 bg-gray-900/30 border-gray-700/50 hover:border-pink-500/30 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {message.name[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{message.name}</h3>
                    <p className="text-gray-400 text-sm">{message.preview}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-gray-400 text-xs mb-1">{message.time}</div>
                  {message.unread && (
                    <div className="w-3 h-3 bg-red-500 rounded-full ml-auto"></div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Succubus;
