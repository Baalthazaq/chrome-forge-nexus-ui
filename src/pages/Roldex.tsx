import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Search, Star, Filter, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ContactNotesDialog } from "@/components/ContactNotesDialog";

const Roldex = () => {
  const [activeFilter, setActiveFilter] = useState("all");

  const contacts = [
    {
      id: 1,
      name: "Marcus Kane",
      alias: "ShadowRunner",
      role: "Data Broker",
      company: "Independent",
      phone: "+1-555-CYBER-01",
      email: "marcus.encrypted@darknet.neural",
      lastContact: "2 hours ago",
      trustLevel: "Verified",
      tags: ["Intel", "Hacking", "Reliable"],
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      status: "online",
      rating: 4.9
    },
    {
      id: 2,
      name: "Dr. Elena Vasquez",
      alias: "BioHack",
      role: "Cybernetics Specialist",
      company: "Nexus Medical",
      phone: "+1-555-NEURAL-02",
      email: "e.vasquez@nexusmed.corp",
      lastContact: "1 day ago",
      trustLevel: "Corporate",
      tags: ["Medical", "Augmentation", "Expensive"],
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b820?w=150&h=150&fit=crop&crop=face",
      status: "busy",
      rating: 4.7
    },
    {
      id: 3,
      name: "Jin Watanabe",
      alias: "CodeGhost",
      role: "Security Consultant",
      company: "Phantom Securities",
      phone: "+1-555-GHOST-03",
      email: "jin@phantom.secure",
      lastContact: "3 days ago",
      trustLevel: "Trusted",
      tags: ["Security", "Encryption", "Discrete"],
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      status: "away",
      rating: 4.8
    },
    {
      id: 4,
      name: "Zara Chen",
      alias: "NeonWire",
      role: "Info Trader",
      company: "Street Network",
      phone: "+1-555-NEON-04",
      email: "zara.neon@streetnet.mesh",
      lastContact: "1 week ago",
      trustLevel: "Unverified",
      tags: ["Intel", "Rumors", "Cheap"],
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      status: "offline",
      rating: 3.2
    },
    {
      id: 5,
      name: "Viktor Kozlov",
      alias: "IronWall",
      role: "Combat Specialist",
      company: "Mercenary Guild",
      phone: "+1-555-IRON-05",
      email: "viktor@mercguild.combat",
      lastContact: "2 weeks ago",
      trustLevel: "Combat Tested",
      tags: ["Security", "Combat", "Expensive"],
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      status: "online",
      rating: 4.5
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-400";
      case "busy": return "bg-red-400";
      case "away": return "bg-yellow-400";
      case "offline": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  };

  const getTrustColor = (trust: string) => {
    switch (trust) {
      case "Verified": return "text-green-400 border-green-400";
      case "Trusted": return "text-blue-400 border-blue-400";
      case "Corporate": return "text-purple-400 border-purple-400";
      case "Combat Tested": return "text-orange-400 border-orange-400";
      case "Unverified": return "text-gray-400 border-gray-400";
      default: return "text-gray-400 border-gray-400";
    }
  };

  const filteredContacts = activeFilter === "all" 
    ? contacts 
    : contacts.filter(contact => contact.trustLevel.toLowerCase().includes(activeFilter));

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-indigo-900/20"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(59,130,246,0.1)_0%,transparent_50%)]"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Rol'dex
          </h1>
          <Button className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="p-4 bg-gray-900/50 border-blue-500/30 mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Search className="w-5 h-5 text-blue-400" />
            <input 
              placeholder="Search contacts by name, alias, or company..."
              className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="flex space-x-2 flex-wrap">
              {["all", "verified", "trusted", "corporate", "unverified"].map((filter) => (
                <Button
                  key={filter}
                  variant={activeFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(filter)}
                  className={activeFilter === filter 
                    ? "bg-blue-500 text-white" 
                    : "border-gray-600 text-gray-400 hover:text-white hover:border-blue-400"
                  }
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Contacts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredContacts.map((contact) => (
            <Card key={contact.id} className="p-6 bg-gray-900/30 border-gray-700/50 hover:border-blue-500/30 transition-all duration-300">
              <div className="flex items-start space-x-4">
                {/* Avatar */}
                <div className="relative">
                  <img 
                    src={contact.avatar} 
                    alt={contact.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-600"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${getStatusColor(contact.status)} rounded-full border-2 border-gray-900`}></div>
                </div>

                {/* Contact Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-lg font-semibold text-white truncate">{contact.name}</h3>
                    <Badge variant="outline" className={getTrustColor(contact.trustLevel)}>
                      {contact.trustLevel}
                    </Badge>
                  </div>
                  
                  <p className="text-blue-400 text-sm mb-1">@{contact.alias}</p>
                  <p className="text-gray-300 text-sm mb-2">{contact.role} • {contact.company}</p>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-400 mb-3">
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3 text-yellow-400" />
                      <span>{contact.rating}</span>
                    </div>
                    <span>Last: {contact.lastContact}</span>
                  </div>

                  {/* Tags */}
                  <div className="flex space-x-1 mb-4">
                    {contact.tags.map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="outline" className="text-xs border-blue-600 text-blue-400">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Contact Actions */}
                  <div className="flex space-x-2">
                    <Link to="/sending" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white">
                        <Zap className="w-3 h-3 mr-1" />
                        Stonecall
                      </Button>
                    </Link>
                    <ContactNotesDialog 
                      contact={contact}
                      contactId={undefined} // Will be populated when we integrate with real data
                      onUpdate={() => {}}
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-white">{contacts.length}</div>
            <div className="text-gray-400 text-sm">Total Contacts</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-green-400">{contacts.filter(c => c.status === "online").length}</div>
            <div className="text-gray-400 text-sm">Online Now</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-blue-400">{contacts.filter(c => c.trustLevel === "Verified" || c.trustLevel === "Trusted").length}</div>
            <div className="text-gray-400 text-sm">Trusted</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-purple-400">4.6</div>
            <div className="text-gray-400 text-sm">Avg Rating</div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Roldex;