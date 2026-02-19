
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, ThumbsUp, ThumbsDown, Share2, MessageSquare, Plus, Edit2, Trash2, Tv, User, X, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { extractYouTubeId, getYouTubeThumbnail, getYouTubeEmbedUrl } from "@/lib/youtube";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Channel {
  id: string;
  user_id: string;
  channel_name: string;
}

interface Video {
  id: string;
  channel_id: string;
  user_id: string;
  title: string;
  youtube_url: string;
  description: string | null;
  tags: string[];
  created_at: string;
  channel?: Channel;
  character_name?: string;
  likes: number;
  dislikes: number;
  user_rating: number | null;
  comment_count: number;
}

const BeholdR = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [myChannel, setMyChannel] = useState<Channel | null>(null);
  const [myVideos, setMyVideos] = useState<Video[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [view, setView] = useState<"feed" | "video" | "channel">("feed");
  const [channelName, setChannelName] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [videoForm, setVideoForm] = useState({ title: "", youtube_url: "", description: "", tags: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFeed();
      loadMyChannel();
    }
  }, [user]);

  const loadFeed = async () => {
    setLoading(true);
    const { data: vids } = await supabase
      .from("beholdr_videos")
      .select("*, beholdr_channels(id, user_id, channel_name)")
      .order("created_at", { ascending: false });

    if (!vids) { setLoading(false); return; }

    const { data: ratings } = await supabase.from("beholdr_ratings").select("*");
    const { data: commentCounts } = await supabase.from("beholdr_comments").select("video_id");
    const { data: profiles } = await supabase.from("profiles").select("user_id, character_name");

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p.character_name]));

    const enriched: Video[] = vids.map((v: any) => {
      const vRatings = (ratings || []).filter(r => r.video_id === v.id);
      const userRating = vRatings.find(r => r.user_id === user?.id);
      return {
        ...v,
        tags: v.tags || [],
        channel: v.beholdr_channels,
        character_name: profileMap.get(v.user_id) || "Unknown",
        likes: vRatings.filter(r => r.rating === 1).length,
        dislikes: vRatings.filter(r => r.rating === -1).length,
        user_rating: userRating?.rating ?? null,
        comment_count: (commentCounts || []).filter(c => c.video_id === v.id).length,
      };
    });

    setVideos(enriched);
    setLoading(false);
  };

  const loadMyChannel = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("beholdr_channels")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setMyChannel(data);
      setChannelName(data.channel_name);
      loadMyVideos(data.id);
    }
  };

  const loadMyVideos = async (channelId: string) => {
    const { data } = await supabase
      .from("beholdr_videos")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false });
    setMyVideos((data || []).map(v => ({ ...v, tags: v.tags || [], likes: 0, dislikes: 0, user_rating: null, comment_count: 0 })));
  };

  const saveChannel = async () => {
    if (!user || !channelName.trim()) return;
    if (myChannel) {
      await supabase.from("beholdr_channels").update({ channel_name: channelName.trim() }).eq("id", myChannel.id);
      setMyChannel({ ...myChannel, channel_name: channelName.trim() });
    } else {
      const { data } = await supabase.from("beholdr_channels").insert({ user_id: user.id, channel_name: channelName.trim() }).select().single();
      if (data) setMyChannel(data);
    }
    toast.success("Channel saved!");
  };

  const saveVideo = async () => {
    if (!user || !myChannel) return;
    const videoId = extractYouTubeId(videoForm.youtube_url);
    if (!videoId) { toast.error("Invalid YouTube URL"); return; }
    const tags = videoForm.tags.split(",").map(t => t.trim()).filter(Boolean);

    if (editingVideo) {
      await supabase.from("beholdr_videos").update({
        title: videoForm.title, youtube_url: videoForm.youtube_url,
        description: videoForm.description || null, tags
      }).eq("id", editingVideo.id);
      toast.success("Video updated!");
    } else {
      await supabase.from("beholdr_videos").insert({
        channel_id: myChannel.id, user_id: user.id,
        title: videoForm.title, youtube_url: videoForm.youtube_url,
        description: videoForm.description || null, tags
      });
      toast.success("Video uploaded!");
    }
    setVideoForm({ title: "", youtube_url: "", description: "", tags: "" });
    setShowUpload(false);
    setEditingVideo(null);
    loadMyVideos(myChannel.id);
    loadFeed();
  };

  const deleteVideo = async (id: string) => {
    await supabase.from("beholdr_videos").delete().eq("id", id);
    toast.success("Video deleted");
    if (myChannel) loadMyVideos(myChannel.id);
    loadFeed();
  };

  const openVideo = async (video: Video) => {
    setSelectedVideo(video);
    setView("video");
    const { data } = await supabase
      .from("beholdr_comments")
      .select("*")
      .eq("video_id", video.id)
      .order("created_at", { ascending: true });
    
    const { data: profiles } = await supabase.from("profiles").select("user_id, character_name");
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p.character_name]));
    
    setComments((data || []).map(c => ({ ...c, character_name: profileMap.get(c.user_id) || "Unknown" })));
  };

  const rateVideo = async (videoId: string, rating: number) => {
    if (!user) return;
    const video = videos.find(v => v.id === videoId) || selectedVideo;
    if (!video) return;

    if (video.user_rating === rating) {
      await supabase.from("beholdr_ratings").delete().eq("video_id", videoId).eq("user_id", user.id);
    } else {
      await supabase.from("beholdr_ratings").upsert(
        { video_id: videoId, user_id: user.id, rating },
        { onConflict: "video_id,user_id" }
      );
    }
    await loadFeed();
    if (selectedVideo?.id === videoId) {
      const updated = videos.find(v => v.id === videoId);
      if (updated) setSelectedVideo(updated);
    }
  };

  const postComment = async () => {
    if (!user || !selectedVideo || !newComment.trim()) return;
    await supabase.from("beholdr_comments").insert({
      video_id: selectedVideo.id, user_id: user.id, content: newComment.trim()
    });
    setNewComment("");
    openVideo(selectedVideo);
  };

  const deleteComment = async (commentId: string) => {
    await supabase.from("beholdr_comments").delete().eq("id", commentId);
    if (selectedVideo) openVideo(selectedVideo);
  };

  const shareToSending = (video: Video) => {
    const videoId = extractYouTubeId(video.youtube_url);
    const shareText = `Check out "${video.title}" on BeholdR! 🎬\n/beholdr?v=${video.id}`;
    // Navigate to Sending with a pre-filled message
    window.open(`/sending?share=${encodeURIComponent(shareText)}`, "_blank");
  };

  // Update selectedVideo when feed refreshes
  useEffect(() => {
    if (selectedVideo) {
      const updated = videos.find(v => v.id === selectedVideo.id);
      if (updated) setSelectedVideo(updated);
    }
  }, [videos]);

  // Handle deep link to a specific video
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const videoId = params.get("v");
    if (videoId && videos.length > 0) {
      const video = videos.find(v => v.id === videoId);
      if (video) openVideo(video);
    }
  }, [videos]);

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="p-8 bg-gray-900/50 border-purple-500/30 text-center">
          <h2 className="text-xl text-purple-400 mb-4">Sign in to access BeholdR</h2>
          <Link to="/auth"><Button className="bg-purple-600 hover:bg-purple-700">Sign In</Button></Link>
        </Card>
      </div>
    );
  }

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
          <div className="flex gap-2">
            <Button
              variant={view === "feed" ? "default" : "ghost"}
              size="sm"
              onClick={() => { setView("feed"); setSelectedVideo(null); }}
              className={view === "feed" ? "bg-purple-600" : "text-gray-400"}
            >
              <Tv className="w-4 h-4 mr-1" /> Feed
            </Button>
            <Button
              variant={view === "channel" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("channel")}
              className={view === "channel" ? "bg-purple-600" : "text-gray-400"}
            >
              <User className="w-4 h-4 mr-1" /> My Channel
            </Button>
          </div>
        </div>

        {/* FEED VIEW */}
        {view === "feed" && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center text-gray-400 py-12">Loading feed...</div>
            ) : videos.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <Tv className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No videos yet. Be the first to upload!</p>
              </div>
            ) : (
              videos.map(video => {
                const ytId = extractYouTubeId(video.youtube_url);
                return (
                  <Card
                    key={video.id}
                    className="p-4 bg-gray-900/30 border-gray-700/50 hover:border-purple-500/30 transition-all cursor-pointer"
                    onClick={() => openVideo(video)}
                  >
                    <div className="flex gap-4">
                      <div className="w-40 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
                        {ytId ? (
                          <img src={getYouTubeThumbnail(ytId)} alt={video.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">No preview</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white truncate">{video.title}</h3>
                        <div className="text-sm text-gray-400 mb-1">
                          <span className="text-purple-400">{video.channel?.channel_name || video.character_name}</span>
                          {" • "}{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
                        </div>
                        {video.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {video.tags.map((tag, i) => (
                              <Badge key={i} variant="outline" className="border-purple-600/50 text-purple-400 text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {video.likes}</span>
                          <span className="flex items-center gap-1"><ThumbsDown className="w-3 h-3" /> {video.dislikes}</span>
                          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {video.comment_count}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* VIDEO DETAIL VIEW */}
        {view === "video" && selectedVideo && (
          <div className="space-y-6">
            <Button variant="ghost" size="sm" onClick={() => { setView("feed"); setSelectedVideo(null); }} className="text-gray-400">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Feed
            </Button>

            {/* Embedded Player */}
            {(() => {
              const ytId = extractYouTubeId(selectedVideo.youtube_url);
              return ytId ? (
                <div className="aspect-video w-full max-w-4xl mx-auto rounded-lg overflow-hidden">
                  <iframe
                    src={getYouTubeEmbedUrl(ytId)}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              ) : null;
            })()}

            {/* Video Info */}
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-2">{selectedVideo.title}</h2>
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-400">
                  <span className="text-purple-400 font-medium">{selectedVideo.channel?.channel_name || selectedVideo.character_name}</span>
                  {" • "}{formatDistanceToNow(new Date(selectedVideo.created_at), { addSuffix: true })}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); rateVideo(selectedVideo.id, 1); }}
                    className={selectedVideo.user_rating === 1 ? "text-green-400" : "text-gray-400"}
                  >
                    <ThumbsUp className="w-4 h-4 mr-1" /> {selectedVideo.likes}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); rateVideo(selectedVideo.id, -1); }}
                    className={selectedVideo.user_rating === -1 ? "text-red-400" : "text-gray-400"}
                  >
                    <ThumbsDown className="w-4 h-4 mr-1" /> {selectedVideo.dislikes}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-gray-400" onClick={() => shareToSending(selectedVideo)}>
                    <Share2 className="w-4 h-4 mr-1" /> Share
                  </Button>
                </div>
              </div>

              {selectedVideo.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {selectedVideo.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="border-purple-600/50 text-purple-400">{tag}</Badge>
                  ))}
                </div>
              )}

              {selectedVideo.description && (
                <Card className="p-4 bg-gray-900/50 border-gray-700/50 mb-6">
                  <p className="text-gray-300 whitespace-pre-wrap">{selectedVideo.description}</p>
                </Card>
              )}

              {/* Comments */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" /> Comments ({comments.length})
                </h3>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && postComment()}
                    className="bg-gray-800/50 border-gray-700 text-white"
                  />
                  <Button onClick={postComment} size="sm" className="bg-purple-600 hover:bg-purple-700">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>

                {comments.map(comment => (
                  <Card key={comment.id} className="p-3 bg-gray-900/30 border-gray-700/30">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-purple-400 font-medium text-sm">{comment.character_name}</span>
                        <span className="text-gray-500 text-xs ml-2">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {comment.user_id === user?.id && (
                        <Button size="sm" variant="ghost" className="text-gray-500 h-6 w-6 p-0" onClick={() => deleteComment(comment.id)}>
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-gray-300 text-sm mt-1">{comment.content}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MY CHANNEL VIEW */}
        {view === "channel" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <Card className="p-6 bg-gray-900/50 border-purple-500/30">
              <h2 className="text-lg font-semibold text-purple-400 mb-4">My Channel</h2>
              <div className="flex gap-2">
                <Input
                  placeholder="Channel name..."
                  value={channelName}
                  onChange={e => setChannelName(e.target.value)}
                  className="bg-gray-800/50 border-gray-700 text-white"
                />
                <Button onClick={saveChannel} className="bg-purple-600 hover:bg-purple-700">
                  {myChannel ? "Update" : "Create"}
                </Button>
              </div>
            </Card>

            {myChannel && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">My Videos</h3>
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => {
                    setVideoForm({ title: "", youtube_url: "", description: "", tags: "" });
                    setEditingVideo(null);
                    setShowUpload(true);
                  }}>
                    <Plus className="w-4 h-4 mr-1" /> Upload
                  </Button>
                </div>

                {/* Upload / Edit Dialog */}
                <Dialog open={showUpload} onOpenChange={setShowUpload}>
                  <DialogContent className="bg-gray-900 border-gray-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">{editingVideo ? "Edit Video" : "Upload Video"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-300">Title</Label>
                        <Input value={videoForm.title} onChange={e => setVideoForm({ ...videoForm, title: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
                      </div>
                      <div>
                        <Label className="text-gray-300">YouTube URL</Label>
                        <Input value={videoForm.youtube_url} onChange={e => setVideoForm({ ...videoForm, youtube_url: e.target.value })} className="bg-gray-800 border-gray-700 text-white" placeholder="https://youtube.com/watch?v=..." />
                      </div>
                      <div>
                        <Label className="text-gray-300">Description</Label>
                        <Textarea value={videoForm.description} onChange={e => setVideoForm({ ...videoForm, description: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
                      </div>
                      <div>
                        <Label className="text-gray-300">Tags (comma-separated)</Label>
                        <Input value={videoForm.tags} onChange={e => setVideoForm({ ...videoForm, tags: e.target.value })} className="bg-gray-800 border-gray-700 text-white" placeholder="gaming, tutorial, funny" />
                      </div>
                      <Button onClick={saveVideo} className="w-full bg-purple-600 hover:bg-purple-700">
                        {editingVideo ? "Save Changes" : "Upload"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {myVideos.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">No videos yet. Upload your first one!</div>
                ) : (
                  <div className="space-y-3">
                    {myVideos.map(video => {
                      const ytId = extractYouTubeId(video.youtube_url);
                      return (
                        <Card key={video.id} className="p-3 bg-gray-900/30 border-gray-700/50">
                          <div className="flex gap-3 items-center">
                            <div className="w-24 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-800">
                              {ytId && <img src={getYouTubeThumbnail(ytId)} alt="" className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium truncate">{video.title}</p>
                              <p className="text-gray-500 text-sm">{formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="text-gray-400" onClick={() => {
                                setEditingVideo(video);
                                setVideoForm({
                                  title: video.title,
                                  youtube_url: video.youtube_url,
                                  description: video.description || "",
                                  tags: (video.tags || []).join(", ")
                                });
                                setShowUpload(true);
                              }}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteVideo(video.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BeholdR;
