
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Star, Clock, User, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

const Questseek = () => {
  const quests = [
    {
      title: "Data Recovery - Corporate Sector",
      client: "NeonCorp Industries",
      reward: "₢ 25,000",
      difficulty: "High Risk",
      timeLimit: "48 hours",
      description: "Retrieve encrypted financial records from abandoned server farm. Heavy security presence expected.",
      tags: ["Stealth", "Hacking", "Combat"],
      rating: 4.8
    },
    {
      title: "Package Delivery - Underground",
      client: "Anonymous",
      reward: "₢ 8,500",
      difficulty: "Medium Risk",
      timeLimit: "12 hours",
      description: "Deliver sealed package to contact in Lower City. No questions asked. Discrete handling required.",
      tags: ["Courier", "Stealth"],
      rating: 4.2
    },
    {
      title: "Bodyguard Detail",
      client: "Dr. Sarah Chen",
      reward: "₢ 15,000",
      difficulty: "Low Risk",
      timeLimit: "3 days",
      description: "Provide security for corporate scientist during research conference. Professional appearance required.",
      tags: ["Security", "Social"],
      rating: 4.9
    }
  ];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-black to-teal-900/20"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Questseek
          </h1>
          <div className="w-20"></div>
        </div>

        {/* Search and Filters */}
        <Card className="p-4 bg-gray-900/50 border-emerald-500/30 mb-8">
          <div className="flex items-center space-x-4">
            <Search className="w-5 h-5 text-emerald-400" />
            <input 
              placeholder="Search available quests..."
              className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none"
            />
            <div className="flex space-x-2">
              <Badge variant="outline" className="border-emerald-500 text-emerald-400">All Risks</Badge>
              <Badge variant="outline" className="border-gray-500 text-gray-400">Remote</Badge>
            </div>
          </div>
        </Card>

        {/* Active Quests */}
        <div className="space-y-6">
          {quests.map((quest, index) => (
            <Card key={index} className="p-6 bg-gray-900/30 border-gray-700/50 hover:border-emerald-500/30 transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">{quest.title}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>{quest.client}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{quest.timeLimit}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span>{quest.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-400 mb-1">{quest.reward}</div>
                  <Badge variant={
                    quest.difficulty === "High Risk" ? "destructive" : 
                    quest.difficulty === "Medium Risk" ? "secondary" : "default"
                  }>
                    {quest.difficulty}
                  </Badge>
                </div>
              </div>

              <p className="text-gray-300 mb-4">{quest.description}</p>

              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  {quest.tags.map((tag, tagIndex) => (
                    <Badge key={tagIndex} variant="outline" className="border-emerald-600 text-emerald-400">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
                  Accept Quest
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-white">247</div>
            <div className="text-gray-400 text-sm">Completed</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-emerald-400">4.9</div>
            <div className="text-gray-400 text-sm">Rating</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-yellow-400">12</div>
            <div className="text-gray-400 text-sm">Active</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-blue-400">98%</div>
            <div className="text-gray-400 text-sm">Success Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Questseek;
