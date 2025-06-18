
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

const NexusWire = () => {
  const news = [
    {
      headline: "Corporate Security Breach Exposes Millions of Neural Scan Records",
      category: "Security",
      time: "12 min ago",
      priority: "high",
      summary: "Hackers infiltrated NeuroCorp's primary data centers, accessing over 3.2 million citizen neural scan profiles..."
    },
    {
      headline: "New Augmentation Laws Pass City Council",
      category: "Politics",
      time: "2 hours ago",
      priority: "medium",
      summary: "Controversial legislation requires registration of all Class-V and above cybernetic enhancements..."
    },
    {
      headline: "Underground Market Prices Surge Amid Supply Shortage",
      category: "Economics",
      time: "4 hours ago",
      priority: "low",
      summary: "Black market dealers report 300% price increases for medical stimulants following recent raids..."
    },
    {
      headline: "Corporate War Escalates in Southern Districts",
      category: "Conflict",
      time: "6 hours ago",
      priority: "high",
      summary: "Armed clashes between rival corporations leave 12 dead, dozens injured in industrial sector..."
    }
  ];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-cyan-900/20"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            NexusWire
          </h1>
          <div className="w-20"></div>
        </div>

        {/* Breaking News Banner */}
        <Card className="p-4 bg-red-900/30 border-red-500/50 mb-8">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
            <div>
              <div className="text-red-400 font-bold">BREAKING</div>
              <div className="text-white">Major data breach affects millions - Security protocols compromised</div>
            </div>
          </div>
        </Card>

        {/* News Feed */}
        <div className="space-y-6">
          {news.map((article, index) => (
            <Card key={index} className="p-6 bg-gray-900/30 border-gray-700/50 hover:border-blue-500/30 transition-all duration-300">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                  <Badge 
                    variant={article.priority === "high" ? "destructive" : article.priority === "medium" ? "secondary" : "outline"}
                  >
                    {article.category}
                  </Badge>
                  <div className="flex items-center text-gray-400 text-sm">
                    <Clock className="w-4 h-4 mr-1" />
                    {article.time}
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  article.priority === "high" ? "bg-red-400" : 
                  article.priority === "medium" ? "bg-yellow-400" : "bg-green-400"
                } animate-pulse`}></div>
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-3 hover:text-blue-400 cursor-pointer transition-colors">
                {article.headline}
              </h3>
              
              <p className="text-gray-300 leading-relaxed">
                {article.summary}
              </p>
              
              <div className="flex justify-between items-center mt-4">
                <Button variant="ghost" className="text-blue-400 hover:text-blue-300 p-0">
                  Read Full Article →
                </Button>
                <div className="flex items-center text-gray-400 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Trending
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Market Data Ticker */}
        <Card className="p-4 bg-gray-900/30 border-gray-700/50 mt-8">
          <div className="text-center">
            <div className="text-gray-400 text-sm mb-2">MARKET DATA</div>
            <div className="flex justify-center space-x-6 text-sm font-mono">
              <span className="text-green-400">NCORP +2.4%</span>
              <span className="text-red-400">CYBERTECH -1.8%</span>
              <span className="text-green-400">DATAVAULT +5.2%</span>
              <span className="text-red-400">NETRUNNERS -0.9%</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default NexusWire;
