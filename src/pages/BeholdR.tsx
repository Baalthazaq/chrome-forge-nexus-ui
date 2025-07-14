import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, Play, ThumbsUp, ThumbsDown, Share2, Bookmark } from "lucide-react";
import { Link } from "react-router-dom";

const BeholdR = () => {
  const videos = [
    {
      title: "LEAKED: NeoCorp Board Meeting Goes Wrong",
      channel: "CyberLeaks",
      views: "2.4M views",
      time: "3 hours ago",
      duration: "12:34",
      thumbnail: "🏢",
      tags: ["Corporate", "Leaked", "Drama"]
    },
    {
      title: "Street Chrome: Latest Cybernetic Mods Review",
      channel: "AugmentedReality",
      views: "847K views", 
      time: "1 day ago",
      duration: "18:22",
      thumbnail: "🤖",
      tags: ["Tech", "Review", "Cybernetics"]
    },
    {
      title: "Lower City Underground Racing Championship",
      channel: "NeonRider",
      views: "1.8M views",
      time: "2 days ago", 
      duration: "25:15",
      thumbnail: "🏎️",
      tags: ["Racing", "Underground", "Sports"]
    }
  ];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            BeholdR
          </h1>
          <div className="w-20"></div>
        </div>

        {/* Trending Section */}
        <Card className="p-6 bg-gray-900/50 border-purple-500/30 mb-8">
          <h2 className="text-purple-400 text-lg mb-4 flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            Trending Now
          </h2>
          <div className="text-center">
            <div className="text-4xl mb-2">👁️</div>
            <div className="text-2xl font-bold text-white mb-2">Real-Time Neural Feed</div>
            <div className="text-gray-400">Experience the city through augmented eyes</div>
          </div>
        </Card>

        {/* Video Feed */}
        <div className="space-y-6">
          {videos.map((video, index) => (
            <Card key={index} className="p-6 bg-gray-900/30 border-gray-700/50 hover:border-purple-500/30 transition-all duration-300">
              <div className="flex space-x-4">
                {/* Thumbnail */}
                <div className="w-32 h-20 bg-gray-800 rounded-lg flex items-center justify-center text-2xl relative">
                  {video.thumbnail}
                  <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                    {video.duration}
                  </div>
                </div>

                {/* Video Info */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">{video.title}</h3>
                  <div className="text-gray-400 text-sm mb-2">
                    <span className="text-purple-400">{video.channel}</span> • {video.views} • {video.time}
                  </div>
                  <div className="flex space-x-2 mb-3">
                    {video.tags.map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="outline" className="border-purple-600 text-purple-400">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex space-x-4">
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                      <Play className="w-4 h-4 mr-1" />
                      Watch
                    </Button>
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                      <ThumbsUp className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                      <ThumbsDown className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                      <Bookmark className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-white">156</div>
            <div className="text-gray-400 text-sm">Videos Watched</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-purple-400">24.7K</div>
            <div className="text-gray-400 text-sm">Watch Time (hrs)</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-blue-400">47</div>
            <div className="text-gray-400 text-sm">Subscriptions</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-green-400">89%</div>
            <div className="text-gray-400 text-sm">Ad Block Rate</div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BeholdR;