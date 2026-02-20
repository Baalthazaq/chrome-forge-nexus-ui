import { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Users, Download, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface Profile {
  id: string;
  user_id: string;
  character_name: string;
  character_class: string;
  avatar_url: string;
  job: string;
  company: string;
}

interface Contact {
  id: string;
  user_id: string;
  contact_user_id: string;
  relationship: string;
  personal_rating: number;
  notes: string;
  contact_tags: { tag: string }[];
}

const RoldexAdmin = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [detailView, setDetailView] = useState(false);
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();

  const STORAGE_KEY = 'roldex-admin-node-positions';

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (isAdmin) {
      loadNetworkData();
    }
  }, [isAdmin]);

  const loadNetworkData = async () => {
    try {
      setLoading(true);
      
      // Load all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Load all contacts with tags
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select(`
          *,
          contact_tags (tag)
        `)
        .eq('is_active', true);

      if (contactsError) throw contactsError;

      setProfiles(profilesData || []);
      setContacts(contactsData || []);
    } catch (error) {
      console.error('Error loading network data:', error);
      toast({
        title: "Error",
        description: "Failed to load network data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate network nodes and edges
  const { networkNodes, networkEdges } = useMemo(() => {
    if (!profiles.length || !contacts.length) return { networkNodes: [], networkEdges: [] };

    // Create nodes for each profile that has contacts
    const connectedUserIds = new Set();
    contacts.forEach(contact => {
      connectedUserIds.add(contact.user_id);
      connectedUserIds.add(contact.contact_user_id);
    });

    // Filter for search if provided
    const filteredProfiles = profiles.filter(profile => {
      if (!connectedUserIds.has(profile.user_id)) return false;
      if (!searchTerm) return true;
      return profile.character_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             profile.character_class?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // If a specific node is selected, show only its connections
    let relevantUserIds = new Set(filteredProfiles.map(p => p.user_id));
    if (selectedNode && !detailView) {
      const connectedToSelected = new Set([selectedNode]);
      contacts.forEach(contact => {
        if (contact.user_id === selectedNode) {
          connectedToSelected.add(contact.contact_user_id);
        }
        if (contact.contact_user_id === selectedNode) {
          connectedToSelected.add(contact.user_id);
        }
      });
      relevantUserIds = connectedToSelected;
    }

    const finalProfiles = filteredProfiles.filter(p => relevantUserIds.has(p.user_id));

    // Load saved positions from localStorage
    let savedPositions: Record<string, { x: number; y: number }> = {};
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) savedPositions = JSON.parse(stored);
    } catch {}

    // Grid layout: arrange nodes in a grid with generous spacing
    const COLS = Math.ceil(Math.sqrt(finalProfiles.length));
    const NODE_W = 180;
    const NODE_H = 160;

    // Create nodes
    const nodes: Node[] = finalProfiles.map((profile, index) => {
      // Use saved position if available, otherwise grid layout
      const saved = savedPositions[profile.user_id];
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      const x = saved ? saved.x : col * NODE_W;
      const y = saved ? saved.y : row * NODE_H;

      return {
        id: profile.user_id,
        type: 'default',
        position: { x, y },
        data: {
          label: (
            <div className="text-center p-2">
              <img
                src={profile.avatar_url || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face`}
                alt={profile.character_name}
                className="w-12 h-12 rounded-full mx-auto mb-1 border-2 border-gray-300"
              />
              <div className="text-xs font-semibold">{profile.character_name}</div>
              <div className="text-xs text-gray-500">{profile.character_class}</div>
            </div>
          )
        },
        style: {
          background: profile.user_id === selectedNode ? '#3B82F6' : '#1F2937',
          border: profile.user_id === selectedNode ? '3px solid #60A5FA' : '2px solid #4B5563',
          borderRadius: '12px',
          color: 'white',
          fontSize: '12px',
          width: 120,
          height: 100,
        },
      };
    });

    // Create edges for relationships
    const edges: Edge[] = [];
    const edgeMap = new Map();

    contacts.forEach(contact => {
      if (!relevantUserIds.has(contact.user_id) || !relevantUserIds.has(contact.contact_user_id)) return;

      const sourceId = contact.user_id;
      const targetId = contact.contact_user_id;
      const edgeKey = [sourceId, targetId].sort().join('-');

      if (!edgeMap.has(edgeKey)) {
        // Find the reverse relationship
        const reverseContact = contacts.find(c => 
          c.user_id === targetId && c.contact_user_id === sourceId
        );

        // Create bidirectional label
        const sourceRelationship = contact.relationship || '';
        const targetRelationship = reverseContact?.relationship || '';
        
        let label = '';
        if (sourceRelationship && targetRelationship) {
          label = `${sourceRelationship} - ${targetRelationship}`;
        } else if (sourceRelationship) {
          label = `${sourceRelationship} - `;
        } else if (targetRelationship) {
          label = ` - ${targetRelationship}`;
        }

        edges.push({
          id: edgeKey,
          source: sourceId,
          target: targetId,
          label,
          type: 'smoothstep',
          animated: sourceId === selectedNode || targetId === selectedNode,
          style: {
            stroke: sourceId === selectedNode || targetId === selectedNode ? '#60A5FA' : '#6B7280',
            strokeWidth: sourceId === selectedNode || targetId === selectedNode ? 3 : 2,
          },
        });

        edgeMap.set(edgeKey, true);
      }
    });

    return { networkNodes: nodes, networkEdges: edges };
  }, [profiles, contacts, searchTerm, selectedNode, detailView]);

  useEffect(() => {
    setNodes(networkNodes);
    setEdges(networkEdges);
  }, [networkNodes, networkEdges, setNodes, setEdges]);

  const handleNodeDragStop = useCallback((event: any, node: Node) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const positions = stored ? JSON.parse(stored) : {};
      positions[node.id] = { x: node.position.x, y: node.position.y };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
    } catch {}
  }, []);

  const handleNodeClick = useCallback((event: any, node: Node) => {
    setSelectedNode(selectedNode === node.id ? null : node.id);
    setDetailView(false);
  }, [selectedNode]);

  const getNodeDetails = (userId: string) => {
    const profile = profiles.find(p => p.user_id === userId);
    const userContacts = contacts.filter(c => c.user_id === userId);
    const incomingContacts = contacts.filter(c => c.contact_user_id === userId);
    
    return {
      profile,
      connections: userContacts.length,
      incomingConnections: incomingContacts.length,
      relationships: userContacts.map(contact => {
        const contactProfile = profiles.find(p => p.user_id === contact.contact_user_id);
        return {
          name: contactProfile?.character_name || 'Unknown',
          relationship: contact.relationship || 'No relationship specified',
          rating: contact.personal_rating,
          notes: contact.notes,
          tags: contact.contact_tags?.map(tag => tag.tag) || []
        };
      }),
      mentions: incomingContacts.map(contact => {
        const mentioner = profiles.find(p => p.user_id === contact.user_id);
        return {
          mentionerName: mentioner?.character_name || 'Unknown',
          relationship: contact.relationship || 'No relationship specified',
          rating: contact.personal_rating,
          notes: contact.notes,
          tags: contact.contact_tags?.map(tag => tag.tag) || []
        };
      })
    };
  };

  const exportToCSV = () => {
    const csvData = contacts.map(contact => {
      const user = profiles.find(p => p.user_id === contact.user_id);
      const contactProfile = profiles.find(p => p.user_id === contact.contact_user_id);
      return {
        'User Name': user?.character_name || 'Unknown',
        'User Class': user?.character_class || 'Unknown',
        'Contact Name': contactProfile?.character_name || 'Unknown',
        'Contact Class': contactProfile?.character_class || 'Unknown',
        'Relationship': contact.relationship || '',
        'Rating': contact.personal_rating,
        'Notes': contact.notes || '',
        'Tags': contact.contact_tags?.map(tag => tag.tag).join(', ') || ''
      };
    });

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roldex-network.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-400">Access denied. Admin privileges required.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading network data...</div>
      </div>
    );
  }

  const selectedNodeDetails = selectedNode ? getNodeDetails(selectedNode) : null;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-indigo-900/20"></div>
      
      <div className="relative z-10 h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-900/50 border-b border-gray-700">
          <div className="flex items-center space-x-4">
            <Link to="/admin">
              <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Rol'dex Network Admin
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users..."
                className="w-64 bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <Button onClick={exportToCSV} variant="outline" className="border-green-500 text-green-400">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Network Graph */}
          <div className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              onNodeDragStop={handleNodeDragStop}
              fitView
              attributionPosition="bottom-left"
              style={{ background: '#000000' }}
            >
              <Background color="#1F2937" />
              <Controls className="bg-gray-800 border-gray-600" />
              <MiniMap 
                nodeColor="#374151"
                nodeStrokeColor="#6B7280"
                nodeBorderRadius={8}
                className="bg-gray-800 border-gray-600"
              />
            </ReactFlow>
            
            {/* Instructions overlay */}
            {!selectedNode && (
              <div className="absolute top-4 left-4 bg-gray-900/90 p-4 rounded-lg border border-gray-700 max-w-sm">
                <h3 className="text-white font-semibold mb-2">Network View</h3>
                <p className="text-gray-300 text-sm">
                  Click on any node to highlight their connections and view details. 
                  Search to filter users. Lines show relationships between contacts.
                </p>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedNode && selectedNodeDetails && (
            <div className="w-96 bg-gray-900/50 border-l border-gray-700 overflow-y-auto">
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Node Details</h2>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetailView(!detailView)}
                      className="border-blue-500 text-blue-400"
                    >
                      {detailView ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedNode(null)}
                      className="border-gray-500 text-gray-400"
                    >
                      Close
                    </Button>
                  </div>
                </div>
                
                {selectedNodeDetails.profile && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <img
                        src={selectedNodeDetails.profile.avatar_url || `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face`}
                        alt={selectedNodeDetails.profile.character_name}
                        className="w-16 h-16 rounded-full border-2 border-gray-600"
                      />
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {selectedNodeDetails.profile.character_name}
                        </h3>
                        <p className="text-gray-400">
                          {selectedNodeDetails.profile.character_class}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {selectedNodeDetails.profile.job} at {selectedNodeDetails.profile.company}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-gray-800/50 p-3 rounded">
                        <div className="text-lg font-bold text-blue-400">{selectedNodeDetails.connections}</div>
                        <div className="text-xs text-gray-400">Connections</div>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded">
                        <div className="text-lg font-bold text-green-400">{selectedNodeDetails.incomingConnections}</div>
                        <div className="text-xs text-gray-400">Mentioned By</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Relationships */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Their Connections</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedNodeDetails.relationships.map((rel, idx) => (
                    <div key={idx} className="bg-gray-800/30 p-3 rounded border border-gray-700">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-white">{rel.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {rel.rating}/5
                        </Badge>
                      </div>
                      {rel.relationship && (
                        <p className="text-cyan-300 text-sm italic mb-1">{rel.relationship}</p>
                      )}
                      {rel.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {rel.tags.map((tag, tagIdx) => (
                            <Badge key={tagIdx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {rel.notes && (
                        <p className="text-gray-400 text-xs">{rel.notes}</p>
                      )}
                    </div>
                  ))}
                </div>

                <h3 className="text-lg font-semibold text-white mb-3 mt-6">Mentioned By</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedNodeDetails.mentions.map((mention, idx) => (
                    <div key={idx} className="bg-gray-800/30 p-3 rounded border border-gray-700">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-white">{mention.mentionerName}</span>
                        <Badge variant="outline" className="text-xs">
                          {mention.rating}/5
                        </Badge>
                      </div>
                      {mention.relationship && (
                        <p className="text-yellow-300 text-sm italic mb-1">
                          Sees them as: {mention.relationship}
                        </p>
                      )}
                      {mention.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {mention.tags.map((tag, tagIdx) => (
                            <Badge key={tagIdx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {mention.notes && (
                        <p className="text-gray-400 text-xs">{mention.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Bar */}
        <div className="bg-gray-900/50 border-t border-gray-700 p-4">
          <div className="flex justify-center space-x-8">
            <div className="text-center">
              <div className="text-lg font-bold text-white">{profiles.length}</div>
              <div className="text-xs text-gray-400">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">{contacts.length}</div>
              <div className="text-xs text-gray-400">Total Connections</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">
                {new Set(contacts.map(c => c.user_id)).size}
              </div>
              <div className="text-xs text-gray-400">Connected Users</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-400">
                {contacts.length > 0 ? 
                  (contacts.reduce((sum, c) => sum + c.personal_rating, 0) / contacts.length).toFixed(1) 
                  : '0.0'
                }
              </div>
              <div className="text-xs text-gray-400">Avg Rating</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoldexAdmin;