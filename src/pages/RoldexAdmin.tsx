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
import { Switch } from "@/components/ui/switch";
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

interface Stone {
  id: string;
  name: string | null;
  is_group: boolean;
}

interface StoneParticipant {
  id: string;
  stone_id: string;
  user_id: string;
  left_at: string | null;
}

const GROUP_COLORS = [
  { border: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.08)', badge: 'bg-purple-600' },
  { border: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)', badge: 'bg-amber-600' },
  { border: '#10B981', bg: 'rgba(16, 185, 129, 0.08)', badge: 'bg-emerald-600' },
  { border: '#EC4899', bg: 'rgba(236, 72, 153, 0.08)', badge: 'bg-pink-600' },
  { border: '#06B6D4', bg: 'rgba(6, 182, 212, 0.08)', badge: 'bg-cyan-600' },
  { border: '#EF4444', bg: 'rgba(239, 68, 68, 0.08)', badge: 'bg-red-600' },
  { border: '#84CC16', bg: 'rgba(132, 204, 22, 0.08)', badge: 'bg-lime-600' },
  { border: '#F97316', bg: 'rgba(249, 115, 22, 0.08)', badge: 'bg-orange-600' },
];

const RoldexAdmin = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stones, setStones] = useState<Stone[]>([]);
  const [stoneParticipants, setStoneParticipants] = useState<StoneParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [detailView, setDetailView] = useState(false);
  const [groupByStones, setGroupByStones] = useState(false);
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
      
      const [profilesRes, contactsRes, stonesRes, participantsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('contacts').select(`*, contact_tags (tag)`).eq('is_active', true),
        supabase.from('stones').select('*').eq('is_group', true),
        supabase.from('stone_participants').select('*').is('left_at', null),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (contactsRes.error) throw contactsRes.error;

      setProfiles(profilesRes.data || []);
      setContacts(contactsRes.data || []);
      setStones(stonesRes.data || []);
      setStoneParticipants(participantsRes.data || []);
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

  // Build group maps
  const { groupMap, userGroupMap } = useMemo(() => {
    const gMap = new Map<string, { name: string; memberUserIds: string[]; colorIdx: number }>();
    const uMap = new Map<string, string[]>();

    stones.forEach((stone, idx) => {
      const members = stoneParticipants
        .filter(p => p.stone_id === stone.id)
        .map(p => p.user_id);
      gMap.set(stone.id, { name: stone.name || 'Unnamed Group', memberUserIds: members, colorIdx: idx % GROUP_COLORS.length });
      members.forEach(uid => {
        const existing = uMap.get(uid) || [];
        existing.push(stone.id);
        uMap.set(uid, existing);
      });
    });

    return { groupMap: gMap, userGroupMap: uMap };
  }, [stones, stoneParticipants]);

  // Generate network nodes and edges
  const { networkNodes, networkEdges } = useMemo(() => {
    if (!profiles.length) return { networkNodes: [], networkEdges: [] };

    if (groupByStones) {
      return buildGroupedLayout();
    }
    return buildDefaultLayout();
  }, [profiles, contacts, searchTerm, selectedNode, detailView, groupByStones, groupMap, userGroupMap]);

  function buildDefaultLayout() {
    if (!contacts.length) return { networkNodes: [], networkEdges: [] };

    const connectedUserIds = new Set<string>();
    contacts.forEach(contact => {
      connectedUserIds.add(contact.user_id);
      connectedUserIds.add(contact.contact_user_id);
    });

    const filteredProfiles = profiles.filter(profile => {
      if (!connectedUserIds.has(profile.user_id)) return false;
      if (!searchTerm) return true;
      return profile.character_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             profile.character_class?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    let relevantUserIds = new Set(filteredProfiles.map(p => p.user_id));
    if (selectedNode && !detailView) {
      const connectedToSelected = new Set([selectedNode]);
      contacts.forEach(contact => {
        if (contact.user_id === selectedNode) connectedToSelected.add(contact.contact_user_id);
        if (contact.contact_user_id === selectedNode) connectedToSelected.add(contact.user_id);
      });
      relevantUserIds = connectedToSelected;
    }

    const finalProfiles = filteredProfiles.filter(p => relevantUserIds.has(p.user_id));

    let savedPositions: Record<string, { x: number; y: number }> = {};
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) savedPositions = JSON.parse(stored);
    } catch {}

    const COLS = Math.ceil(Math.sqrt(finalProfiles.length));
    const NODE_W = 180;
    const NODE_H = 160;

    const resultNodes: Node[] = finalProfiles.map((profile, index) => {
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
                src={profile.avatar_url || "https://csyajgxbptbtluxdiepi.supabase.co/storage/v1/object/public/icons/Doppleganger.gif"}
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

    const resultEdges: Edge[] = [];
    const edgeMap = new Map();

    contacts.forEach(contact => {
      if (!relevantUserIds.has(contact.user_id) || !relevantUserIds.has(contact.contact_user_id)) return;

      const sourceId = contact.user_id;
      const targetId = contact.contact_user_id;
      const edgeKey = [sourceId, targetId].sort().join('-');

      if (!edgeMap.has(edgeKey)) {
        const reverseContact = contacts.find(c =>
          c.user_id === targetId && c.contact_user_id === sourceId
        );

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

        resultEdges.push({
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

    return { networkNodes: resultNodes, networkEdges: resultEdges };
  }

  function buildGroupedLayout() {
    const resultNodes: Node[] = [];
    const resultEdges: Edge[] = [];

    // Filter profiles by search
    const filteredProfiles = profiles.filter(profile => {
      if (!searchTerm) return true;
      return profile.character_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             profile.character_class?.toLowerCase().includes(searchTerm.toLowerCase());
    });
    const filteredUserIds = new Set(filteredProfiles.map(p => p.user_id));

    // Determine primary group for each user (the group with fewer members for better distribution)
    const userPrimaryGroup = new Map<string, string>();
    filteredProfiles.forEach(profile => {
      const groups = userGroupMap.get(profile.user_id);
      if (!groups || groups.length === 0) return;
      // Pick group with fewest members as primary
      let primaryGroup = groups[0];
      let minSize = groupMap.get(groups[0])?.memberUserIds.length ?? Infinity;
      for (const gid of groups) {
        const size = groupMap.get(gid)?.memberUserIds.length ?? Infinity;
        if (size < minSize) {
          minSize = size;
          primaryGroup = gid;
        }
      }
      userPrimaryGroup.set(profile.user_id, primaryGroup);
    });

    // Collect ungrouped users
    const ungroupedProfiles = filteredProfiles.filter(p => !userPrimaryGroup.has(p.user_id));

    // Layout constants
    const GROUP_PAD = 60;
    const NODE_W = 130;
    const NODE_H = 120;
    const GROUP_GAP = 80;
    const MEMBERS_PER_ROW = 4;

    let currentX = 0;
    let currentY = 0;
    let maxRowHeight = 0;
    const groupsPerRow = 3;
    let groupIdx = 0;

    // Create group nodes and member nodes
    const sortedGroups = Array.from(groupMap.entries()).filter(([gid, g]) => {
      // Only show groups that have at least 1 filtered member assigned primarily here
      return g.memberUserIds.some(uid => filteredUserIds.has(uid) && userPrimaryGroup.get(uid) === gid);
    });

    sortedGroups.forEach(([groupId, group]) => {
      const color = GROUP_COLORS[group.colorIdx];
      const membersInGroup = group.memberUserIds.filter(uid =>
        filteredUserIds.has(uid) && userPrimaryGroup.get(uid) === groupId
      );

      const cols = Math.min(membersInGroup.length, MEMBERS_PER_ROW);
      const rows = Math.ceil(membersInGroup.length / MEMBERS_PER_ROW);
      const groupW = Math.max(cols * NODE_W + GROUP_PAD * 2, 200);
      const groupH = rows * NODE_H + GROUP_PAD * 2 + 30; // 30 for label

      // Position this group in grid
      if (groupIdx > 0 && groupIdx % groupsPerRow === 0) {
        currentX = 0;
        currentY += maxRowHeight + GROUP_GAP;
        maxRowHeight = 0;
      }

      // Group parent node
      resultNodes.push({
        id: `group-${groupId}`,
        type: 'group',
        position: { x: currentX, y: currentY },
        data: {
          label: group.name,
        },
        style: {
          background: color.bg,
          border: `2px dashed ${color.border}`,
          borderRadius: '16px',
          width: groupW,
          height: groupH,
          fontSize: '14px',
          fontWeight: 'bold',
          color: color.border,
          padding: '8px 12px',
        },
      });

      // Place members inside
      membersInGroup.forEach((userId, memberIdx) => {
        const profile = profiles.find(p => p.user_id === userId);
        if (!profile) return;

        const col = memberIdx % MEMBERS_PER_ROW;
        const row = Math.floor(memberIdx / MEMBERS_PER_ROW);
        const x = GROUP_PAD + col * NODE_W;
        const y = GROUP_PAD + 24 + row * NODE_H; // 24 for label space

        const userGroups = userGroupMap.get(userId) || [];
        const isMultiGroup = userGroups.length > 1;

        resultNodes.push({
          id: userId,
          type: 'default',
          position: { x, y },
          parentId: `group-${groupId}`,
          extent: 'parent' as const,
          data: {
            label: (
              <div className="text-center p-1">
                <img
                  src={profile.avatar_url || "https://csyajgxbptbtluxdiepi.supabase.co/storage/v1/object/public/icons/Doppleganger.gif"}
                  alt={profile.character_name}
                  className="w-10 h-10 rounded-full mx-auto mb-1 border-2 border-gray-300"
                />
                <div className="text-xs font-semibold truncate">{profile.character_name}</div>
                {isMultiGroup && (
                  <div className="flex gap-0.5 justify-center mt-0.5 flex-wrap">
                    {userGroups.filter(gid => gid !== groupId).map(gid => {
                      const g = groupMap.get(gid);
                      if (!g) return null;
                      const c = GROUP_COLORS[g.colorIdx];
                      return (
                        <span
                          key={gid}
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: c.border }}
                          title={g.name}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )
          },
          style: {
            background: userId === selectedNode ? '#3B82F6' : '#1F2937',
            border: userId === selectedNode ? '3px solid #60A5FA' : `2px solid ${color.border}`,
            borderRadius: '10px',
            color: 'white',
            fontSize: '11px',
            width: 110,
            height: isMultiGroup ? 95 : 85,
          },
        });

        // Draw dashed edges to secondary groups
        if (isMultiGroup) {
          userGroups.filter(gid => gid !== groupId).forEach(secGroupId => {
            resultEdges.push({
              id: `cross-${userId}-${secGroupId}`,
              source: userId,
              target: `group-${secGroupId}`,
              type: 'smoothstep',
              animated: false,
              style: {
                stroke: GROUP_COLORS[groupMap.get(secGroupId)?.colorIdx ?? 0].border,
                strokeWidth: 1.5,
                strokeDasharray: '6 3',
              },
            });
          });
        }
      });

      currentX += groupW + GROUP_GAP;
      maxRowHeight = Math.max(maxRowHeight, groupH);
      groupIdx++;
    });

    // Ungrouped users
    if (ungroupedProfiles.length > 0) {
      const ungroupedY = currentY + maxRowHeight + GROUP_GAP;
      const cols = Math.min(ungroupedProfiles.length, 6);
      const rows = Math.ceil(ungroupedProfiles.length / 6);
      const ungroupedW = cols * NODE_W + GROUP_PAD * 2;
      const ungroupedH = rows * NODE_H + GROUP_PAD * 2 + 30;

      resultNodes.push({
        id: 'group-ungrouped',
        type: 'group',
        position: { x: 0, y: ungroupedY },
        data: { label: 'Ungrouped' },
        style: {
          background: 'rgba(107, 114, 128, 0.08)',
          border: '2px dashed #6B7280',
          borderRadius: '16px',
          width: ungroupedW,
          height: ungroupedH,
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#9CA3AF',
          padding: '8px 12px',
        },
      });

      ungroupedProfiles.forEach((profile, idx) => {
        const col = idx % 6;
        const row = Math.floor(idx / 6);
        resultNodes.push({
          id: profile.user_id,
          type: 'default',
          position: { x: GROUP_PAD + col * NODE_W, y: GROUP_PAD + 24 + row * NODE_H },
          parentId: 'group-ungrouped',
          extent: 'parent' as const,
          data: {
            label: (
              <div className="text-center p-1">
                <img
                  src={profile.avatar_url || "https://csyajgxbptbtluxdiepi.supabase.co/storage/v1/object/public/icons/Doppleganger.gif"}
                  alt={profile.character_name}
                  className="w-10 h-10 rounded-full mx-auto mb-1 border-2 border-gray-300"
                />
                <div className="text-xs font-semibold truncate">{profile.character_name}</div>
              </div>
            )
          },
          style: {
            background: profile.user_id === selectedNode ? '#3B82F6' : '#1F2937',
            border: profile.user_id === selectedNode ? '3px solid #60A5FA' : '2px solid #4B5563',
            borderRadius: '10px',
            color: 'white',
            fontSize: '11px',
            width: 110,
            height: 85,
          },
        });
      });
    }

    return { networkNodes: resultNodes, networkEdges: resultEdges };
  }

  useEffect(() => {
    setNodes(networkNodes);
    setEdges(networkEdges);
  }, [networkNodes, networkEdges, setNodes, setEdges]);

  const handleNodeDragStop = useCallback((event: any, node: Node) => {
    if (groupByStones) return; // Don't save positions in grouped mode
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const positions = stored ? JSON.parse(stored) : {};
      positions[node.id] = { x: node.position.x, y: node.position.y };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
    } catch {}
  }, [groupByStones]);

  const handleNodeClick = useCallback((event: any, node: Node) => {
    // Don't select group nodes
    if (node.id.startsWith('group-')) return;
    setSelectedNode(selectedNode === node.id ? null : node.id);
    setDetailView(false);
  }, [selectedNode]);

  const getNodeDetails = (userId: string) => {
    const profile = profiles.find(p => p.user_id === userId);
    const userContacts = contacts.filter(c => c.user_id === userId);
    const incomingContacts = contacts.filter(c => c.contact_user_id === userId);
    const userGroups = userGroupMap.get(userId) || [];
    const stoneGroups = userGroups.map(gid => groupMap.get(gid)).filter(Boolean);
    
    return {
      profile,
      connections: userContacts.length,
      incomingConnections: incomingContacts.length,
      stoneGroups,
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
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-300">Group by Stones</span>
              <Switch
                checked={groupByStones}
                onCheckedChange={(checked) => {
                  setGroupByStones(checked);
                  setSelectedNode(null);
                }}
              />
            </div>
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
                <h3 className="text-white font-semibold mb-2">
                  {groupByStones ? 'Sending Groups View' : 'Network View'}
                </h3>
                <p className="text-gray-300 text-sm">
                  {groupByStones
                    ? 'Characters clustered by Sending Stone groups. Colored dots indicate membership in additional groups. Dashed lines show cross-group memberships.'
                    : 'Click on any node to highlight their connections and view details. Search to filter users. Lines show relationships between contacts.'}
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
                    {!groupByStones && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDetailView(!detailView)}
                        className="border-blue-500 text-blue-400"
                      >
                        {detailView ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                      </Button>
                    )}
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
                        src={selectedNodeDetails.profile.avatar_url || "https://csyajgxbptbtluxdiepi.supabase.co/storage/v1/object/public/icons/Doppleganger.gif"}
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

                    {/* Stone Groups */}
                    {selectedNodeDetails.stoneGroups.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-300 mb-1">Sending Groups</h4>
                        <div className="flex flex-wrap gap-1">
                          {selectedNodeDetails.stoneGroups.map((g: any) => (
                            <Badge
                              key={g.name}
                              className={`${GROUP_COLORS[g.colorIdx].badge} text-white text-xs`}
                            >
                              {g.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
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
            {groupByStones && (
              <div className="text-center">
                <div className="text-lg font-bold text-purple-400">{stones.length}</div>
                <div className="text-xs text-gray-400">Sending Groups</div>
              </div>
            )}
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
