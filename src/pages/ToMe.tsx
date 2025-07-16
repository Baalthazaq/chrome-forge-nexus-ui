import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Search, BookOpen, StickyNote, Star, Clock, Edit3, Trash2, Pin } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const ToMe = () => {
  const [activeTab, setActiveTab] = useState("tome");

  const tomeNotes = [
    {
      id: 1,
      title: "Neural Interface Protocols",
      content: "Deep dive into the latest neural interface standards. Key findings: bandwidth increased by 300% with new quantum entanglement protocols...",
      timestamp: "2087.03.15 14:23",
      tags: ["research", "neural", "protocols"],
      isPinned: true,
      pages: 23
    },
    {
      id: 2,
      title: "Corporate Espionage Tactics",
      content: "Comprehensive analysis of modern corporate surveillance methods. Chapter 1: Data Mining Techniques...",
      timestamp: "2087.03.14 09:15",
      tags: ["security", "corporate", "intel"],
      isPinned: false,
      pages: 156
    },
    {
      id: 3,
      title: "Cybernetics Market Analysis",
      content: "Q1 2087 market trends show significant growth in bio-enhancement sectors. Key players include...",
      timestamp: "2087.03.13 16:45",
      tags: ["market", "cybernetics", "analysis"],
      isPinned: true,
      pages: 89
    }
  ];

  const quickNotes = [
    {
      id: 1,
      content: "Remember to upgrade firewall before next data run",
      timestamp: "Today 15:30",
      color: "from-red-500 to-pink-500",
      isPinned: true
    },
    {
      id: 2,
      content: "Meeting with NeonCorp contact tomorrow - Sector 7",
      timestamp: "Today 12:15",
      color: "from-blue-500 to-cyan-500",
      isPinned: false
    },
    {
      id: 3,
      content: "New encryption keys arrived - install immediately",
      timestamp: "Yesterday",
      color: "from-purple-500 to-violet-500",
      isPinned: true
    },
    {
      id: 4,
      content: "Check vault balance before weekend",
      timestamp: "Yesterday",
      color: "from-green-500 to-emerald-500",
      isPinned: false
    },
    {
      id: 5,
      content: "Research new neural implant compatibility",
      timestamp: "2 days ago",
      color: "from-yellow-500 to-orange-500",
      isPinned: false
    }
  ];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-black to-purple-900/20"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_80%,rgba(120,119,198,0.1)_0%,transparent_50%)]"></div>
      
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
            ToMe
          </h1>
          <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
            <Plus className="w-4 h-4 mr-2" />
            New Entry
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-gray-900/50 p-1 rounded-lg border border-gray-700/50">
          <button
            onClick={() => setActiveTab("tome")}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-md transition-all ${
              activeTab === "tome"
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800/50"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Tome Archives</span>
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-md transition-all ${
              activeTab === "notes"
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800/50"
            }`}
          >
            <StickyNote className="w-4 h-4" />
            <span>Quick Notes</span>
          </button>
        </div>

        {/* Search Bar */}
        <Card className="p-4 bg-gray-900/50 border-purple-500/30 mb-8">
          <div className="flex items-center space-x-4">
            <Search className="w-5 h-5 text-purple-400" />
            <input 
              placeholder={`Search ${activeTab === "tome" ? "tome entries" : "quick notes"}...`}
              className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none"
            />
          </div>
        </Card>

        {/* Content */}
        {activeTab === "tome" ? (
          <div className="space-y-6">
            {tomeNotes.map((note) => (
              <Card key={note.id} className="p-6 bg-gray-900/30 border-gray-700/50 hover:border-purple-500/30 transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">{note.title}</h3>
                      {note.isPinned && <Pin className="w-4 h-4 text-yellow-400" />}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{note.timestamp}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{note.pages} pages</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-gray-300 mb-4 line-clamp-2">{note.content}</p>

                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    {note.tags.map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="outline" className="border-purple-600 text-purple-400">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white">
                    Open Tome
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickNotes.map((note) => (
              <Card key={note.id} className="relative overflow-hidden group">
                <div className={`absolute inset-0 bg-gradient-to-br ${note.color} opacity-20`}></div>
                <div className="relative p-4 bg-gray-900/80 border border-gray-700/50 hover:border-gray-600 transition-all duration-300">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      {note.isPinned && <Pin className="w-4 h-4 text-yellow-400" />}
                      <span className="text-xs text-gray-400">{note.timestamp}</span>
                    </div>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-white">
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-red-400">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-white text-sm leading-relaxed">{note.content}</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Stats Footer */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-white">87</div>
            <div className="text-gray-400 text-sm">Tome Entries</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-purple-400">342</div>
            <div className="text-gray-400 text-sm">Quick Notes</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-indigo-400">1.2TB</div>
            <div className="text-gray-400 text-sm">Data Stored</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-blue-400">24/7</div>
            <div className="text-gray-400 text-sm">Sync Active</div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ToMe;