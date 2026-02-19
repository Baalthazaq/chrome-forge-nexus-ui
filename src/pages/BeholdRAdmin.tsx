
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Edit2, Trash2, Tv, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { extractYouTubeId, getYouTubeThumbnail } from "@/lib/youtube";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const BeholdRAdmin = () => {
  const { isAdmin, getAllUsers } = useAdmin();
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [channel, setChannel] = useState<any>(null);
  const [channelName, setChannelName] = useState("");
  const [videos, setVideos] = useState<any[]>([]);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [allComments, setAllComments] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [videoForm, setVideoForm] = useState({ title: "", youtube_url: "", description: "", tags: "" });
  const [tab, setTab] = useState<"by-user" | "all-videos" | "comments">("by-user");

  useEffect(() => {
    if (isAdmin) {
      getAllUsers().then(setUsers);
      loadAllVideos();
      loadAllComments();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedUserId) loadChannel();
  }, [selectedUserId]);

  const loadChannel = async () => {
    const { data } = await supabase.from("beholdr_channels").select("*").eq("user_id", selectedUserId).maybeSingle();
    setChannel(data);
    setChannelName(data?.channel_name || "");
    if (data) {
      const { data: vids } = await supabase.from("beholdr_videos").select("*").eq("channel_id", data.id).order("created_at", { ascending: false });
      setVideos(vids || []);
    } else {
      setVideos([]);
    }
  };

  const loadAllVideos = async () => {
    const { data: vids } = await supabase.from("beholdr_videos").select("*, beholdr_channels(channel_name)").order("created_at", { ascending: false });
    const { data: profiles } = await supabase.from("profiles").select("user_id, character_name");
    const pMap = new Map((profiles || []).map(p => [p.user_id, p.character_name]));
    setAllVideos((vids || []).map(v => ({ ...v, character_name: pMap.get(v.user_id) || "Unknown" })));
  };

  const loadAllComments = async () => {
    const { data: comments } = await supabase.from("beholdr_comments").select("*, beholdr_videos(title)").order("created_at", { ascending: false });
    const { data: profiles } = await supabase.from("profiles").select("user_id, character_name");
    const pMap = new Map((profiles || []).map(p => [p.user_id, p.character_name]));
    setAllComments((comments || []).map(c => ({ ...c, character_name: pMap.get(c.user_id) || "Unknown" })));
  };

  const saveChannel = async () => {
    if (!selectedUserId || !channelName.trim()) return;
    if (channel) {
      await supabase.from("beholdr_channels").update({ channel_name: channelName.trim() }).eq("id", channel.id);
    } else {
      const { data } = await supabase.from("beholdr_channels").insert({ user_id: selectedUserId, channel_name: channelName.trim() }).select().single();
      setChannel(data);
    }
    toast.success("Channel saved!");
    loadChannel();
  };

  const saveVideo = async () => {
    if (!channel) return;
    const ytId = extractYouTubeId(videoForm.youtube_url);
    if (!ytId) { toast.error("Invalid YouTube URL"); return; }
    const tags = videoForm.tags.split(",").map(t => t.trim()).filter(Boolean);

    if (editingVideo) {
      await supabase.from("beholdr_videos").update({
        title: videoForm.title, youtube_url: videoForm.youtube_url,
        description: videoForm.description || null, tags
      }).eq("id", editingVideo.id);
    } else {
      await supabase.from("beholdr_videos").insert({
        channel_id: channel.id, user_id: selectedUserId,
        title: videoForm.title, youtube_url: videoForm.youtube_url,
        description: videoForm.description || null, tags
      });
    }
    toast.success(editingVideo ? "Video updated!" : "Video added!");
    setVideoForm({ title: "", youtube_url: "", description: "", tags: "" });
    setShowUpload(false);
    setEditingVideo(null);
    loadChannel();
    loadAllVideos();
  };

  const deleteVideo = async (id: string) => {
    await supabase.from("beholdr_videos").delete().eq("id", id);
    toast.success("Video deleted");
    loadChannel();
    loadAllVideos();
  };

  const deleteComment = async (id: string) => {
    await supabase.from("beholdr_comments").delete().eq("id", id);
    toast.success("Comment deleted");
    loadAllComments();
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="p-8 bg-gray-900/50 border-red-500/30 text-center">
          <h2 className="text-xl text-red-400">Admin access required</h2>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20"></div>
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link to="/admin">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Admin
            </Button>
          </Link>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            BeholdR Admin
          </h1>
          <div className="w-20" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["by-user", "all-videos", "comments"] as const).map(t => (
            <Button key={t} size="sm" variant={tab === t ? "default" : "ghost"}
              className={tab === t ? "bg-purple-600" : "text-gray-400"}
              onClick={() => setTab(t)}>
              {t === "by-user" ? "By Character" : t === "all-videos" ? "All Videos" : "Comments"}
            </Button>
          ))}
        </div>

        {/* BY USER TAB */}
        {tab === "by-user" && (
          <div className="space-y-6">
            <Card className="p-4 bg-gray-900/50 border-gray-700/50">
              <Label className="text-gray-300 mb-2 block">Select Character</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Choose a character..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {users.map(u => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.character_name || "Unnamed"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>

            {selectedUserId && (
              <>
                <Card className="p-4 bg-gray-900/50 border-purple-500/30">
                  <h3 className="text-purple-400 font-semibold mb-3">Channel</h3>
                  <div className="flex gap-2">
                    <Input value={channelName} onChange={e => setChannelName(e.target.value)}
                      placeholder="Channel name..." className="bg-gray-800 border-gray-700 text-white" />
                    <Button onClick={saveChannel} className="bg-purple-600 hover:bg-purple-700">
                      {channel ? "Update" : "Create"}
                    </Button>
                  </div>
                </Card>

                {channel && (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold">Videos</h3>
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => {
                        setEditingVideo(null);
                        setVideoForm({ title: "", youtube_url: "", description: "", tags: "" });
                        setShowUpload(true);
                      }}>
                        <Plus className="w-4 h-4 mr-1" /> Add Video
                      </Button>
                    </div>

                    {videos.map(v => {
                      const ytId = extractYouTubeId(v.youtube_url);
                      return (
                        <Card key={v.id} className="p-3 bg-gray-900/30 border-gray-700/50">
                          <div className="flex gap-3 items-center">
                            <div className="w-24 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-800">
                              {ytId && <img src={getYouTubeThumbnail(ytId)} alt="" className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium truncate">{v.title}</p>
                              <p className="text-gray-500 text-xs">{(v.tags || []).join(", ")}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="text-gray-400" onClick={() => {
                                setEditingVideo(v);
                                setVideoForm({ title: v.title, youtube_url: v.youtube_url, description: v.description || "", tags: (v.tags || []).join(", ") });
                                setShowUpload(true);
                              }}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteVideo(v.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ALL VIDEOS TAB */}
        {tab === "all-videos" && (
          <div className="space-y-3">
            {allVideos.map(v => {
              const ytId = extractYouTubeId(v.youtube_url);
              return (
                <Card key={v.id} className="p-3 bg-gray-900/30 border-gray-700/50">
                  <div className="flex gap-3 items-center">
                    <div className="w-24 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-800">
                      {ytId && <img src={getYouTubeThumbnail(ytId)} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{v.title}</p>
                      <p className="text-gray-500 text-sm">
                        {v.character_name} • {v.beholdr_channels?.channel_name || ""} • {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="text-gray-400" onClick={() => {
                        setSelectedUserId(v.user_id);
                        setEditingVideo(v);
                        setVideoForm({ title: v.title, youtube_url: v.youtube_url, description: v.description || "", tags: (v.tags || []).join(", ") });
                        setShowUpload(true);
                      }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteVideo(v.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* COMMENTS TAB */}
        {tab === "comments" && (
          <div className="space-y-3">
            {allComments.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No comments yet</div>
            ) : allComments.map(c => (
              <Card key={c.id} className="p-3 bg-gray-900/30 border-gray-700/50">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="text-purple-400 font-medium">{c.character_name}</span>
                      <span className="text-gray-500"> on </span>
                      <span className="text-white">{c.beholdr_videos?.title || "Unknown video"}</span>
                    </div>
                    <p className="text-gray-300 text-sm mt-1">{c.content}</p>
                    <p className="text-gray-600 text-xs mt-1">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteComment(c.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Upload/Edit Dialog */}
        <Dialog open={showUpload} onOpenChange={setShowUpload}>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">{editingVideo ? "Edit Video" : "Add Video"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label className="text-gray-300">Title</Label>
                <Input value={videoForm.title} onChange={e => setVideoForm({ ...videoForm, title: e.target.value })} className="bg-gray-800 border-gray-700 text-white" /></div>
              <div><Label className="text-gray-300">YouTube URL</Label>
                <Input value={videoForm.youtube_url} onChange={e => setVideoForm({ ...videoForm, youtube_url: e.target.value })} className="bg-gray-800 border-gray-700 text-white" /></div>
              <div><Label className="text-gray-300">Description</Label>
                <Textarea value={videoForm.description} onChange={e => setVideoForm({ ...videoForm, description: e.target.value })} className="bg-gray-800 border-gray-700 text-white" /></div>
              <div><Label className="text-gray-300">Tags (comma-separated)</Label>
                <Input value={videoForm.tags} onChange={e => setVideoForm({ ...videoForm, tags: e.target.value })} className="bg-gray-800 border-gray-700 text-white" /></div>
              <Button onClick={saveVideo} className="w-full bg-purple-600 hover:bg-purple-700">
                {editingVideo ? "Save Changes" : "Add Video"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default BeholdRAdmin;
