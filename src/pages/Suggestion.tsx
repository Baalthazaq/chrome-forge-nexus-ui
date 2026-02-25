
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, ImagePlus, X, Bug, Lightbulb, Phone, PhoneOff } from "lucide-react";

const ICON_URL = "https://csyajgxbptbtluxdiepi.supabase.co/storage/v1/object/public/icons/Suggestion.gif";

const APP_OPTIONS = [
  "Doppleganger", "Sending Stone", "App of Holding", "@tunes", "CVNews",
  "Wyrmcart", "ToMe", "Rol'dex", "Timestop", "BHoldR", "Maze",
  "Succubus", "Cha", "Questseek", "Suggestion", "General / Site-wide"
];

const statusColors: Record<string, string> = {
  open: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  reviewed: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  planned: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  done: "bg-green-500/20 text-green-300 border-green-500/30",
  dismissed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const Suggestion = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [type, setType] = useState<"suggestion" | "issue">("suggestion");
  const [relatedApp, setRelatedApp] = useState<string>("");
  const [description, setDescription] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: mySuggestions, isLoading } = useQuery({
    queryKey: ["my-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suggestions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast({ title: "File too large", description: "Screenshot must be under 1 MB.", variant: "destructive" });
      return;
    }
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const clearScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
  };

  const handleSubmit = async () => {
    if (!user || !description.trim()) return;
    setIsSubmitting(true);

    try {
      let screenshot_url: string | null = null;

      if (screenshotFile) {
        const ext = screenshotFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("suggestion-screenshots")
          .upload(path, screenshotFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("suggestion-screenshots")
          .getPublicUrl(path);
        screenshot_url = urlData.publicUrl;
      }

      const { error } = await supabase.from("suggestions").insert({
        user_id: user.id,
        type,
        related_app: relatedApp || null,
        description: description.trim(),
        screenshot_url,
      });
      if (error) throw error;

      toast({ title: "Submitted!", description: "Your suggestion has been sent." });
      setDescription("");
      setType("suggestion");
      setRelatedApp("");
      clearScreenshot();
      queryClient.invalidateQueries({ queryKey: ["my-suggestions"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(34,197,94,0.08)_0%,transparent_50%)]" />

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-green-400">Suggestion</h1>
          </div>

          {/* Icon as "video call" portrait */}
          <div className="relative">
            <div className="w-16 h-16 rounded-xl border-2 border-green-500/50 overflow-hidden bg-gray-900/80 shadow-lg shadow-green-500/10">
              <img src={ICON_URL} alt="Suggestion service" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-black">
              <Phone className="w-3 h-3 text-black" />
            </div>
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          </div>
        </div>

        {/* "Call" banner */}
        <div className="mb-6 px-4 py-2 bg-green-900/20 border border-green-500/20 rounded-lg flex items-center gap-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-300 text-sm font-mono">LIVE — Service Desk Connected</span>
        </div>

        {/* Form */}
        <Card className="p-6 bg-gray-900/60 border-gray-700/50 backdrop-blur-sm mb-8">
          <div className="space-y-5">
            {/* Type */}
            <div className="space-y-2">
              <Label className="text-gray-300">Type</Label>
              <div className="flex gap-3">
                <Button
                  variant={type === "suggestion" ? "default" : "outline"}
                  className={type === "suggestion" ? "bg-green-600 hover:bg-green-700 text-white" : "border-gray-600 text-gray-300 hover:bg-gray-800"}
                  onClick={() => setType("suggestion")}
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Suggestion
                </Button>
                <Button
                  variant={type === "issue" ? "default" : "outline"}
                  className={type === "issue" ? "bg-red-600 hover:bg-red-700 text-white" : "border-gray-600 text-gray-300 hover:bg-gray-800"}
                  onClick={() => setType("issue")}
                >
                  <Bug className="w-4 h-4 mr-2" />
                  Issue
                </Button>
              </div>
            </div>

            {/* Related app */}
            <div className="space-y-2">
              <Label className="text-gray-300">Related App (optional)</Label>
              <Select value={relatedApp} onValueChange={setRelatedApp}>
                <SelectTrigger className="bg-gray-800/80 border-gray-600 text-gray-200">
                  <SelectValue placeholder="Select an app..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {APP_OPTIONS.map(app => (
                    <SelectItem key={app} value={app} className="text-gray-200 focus:bg-gray-700">{app}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-gray-300">Description *</Label>
              <Textarea
                placeholder={type === "issue" ? "Describe the issue you encountered..." : "Describe your suggestion or idea..."}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-gray-800/80 border-gray-600 text-gray-200 placeholder:text-gray-500 min-h-[120px]"
                maxLength={2000}
              />
              <p className="text-xs text-gray-500 text-right">{description.length}/2000</p>
            </div>

            {/* Screenshot */}
            <div className="space-y-2">
              <Label className="text-gray-300">Screenshot (optional, max 1 MB)</Label>
              {screenshotPreview ? (
                <div className="relative inline-block">
                  <img src={screenshotPreview} alt="Preview" className="max-h-40 rounded-lg border border-gray-600" />
                  <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 w-6 h-6" onClick={clearScreenshot}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-gray-600 cursor-pointer hover:border-green-500/50 hover:bg-gray-800/40 transition-colors">
                  <ImagePlus className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-400 text-sm">Attach a screenshot</span>
                  <Input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              )}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!description.trim() || isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? "Submitting..." : "Send Suggestion"}
            </Button>
          </div>
        </Card>

        {/* My previous suggestions */}
        {mySuggestions && mySuggestions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-300 mb-4">Your Previous Suggestions</h2>
            <div className="space-y-3">
              {mySuggestions.map((s: any) => (
                <Card key={s.id} className="p-4 bg-gray-900/40 border-gray-700/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={`${s.type === "issue" ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-green-500/20 text-green-300 border-green-500/30"} text-xs`}>
                          {s.type === "issue" ? "Issue" : "Suggestion"}
                        </Badge>
                        {s.related_app && <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">{s.related_app}</Badge>}
                        <Badge className={`${statusColors[s.status] || statusColors.open} text-xs`}>{s.status}</Badge>
                      </div>
                      <p className="text-gray-300 text-sm line-clamp-2">{s.description}</p>
                      {s.admin_notes && (
                        <p className="text-xs text-cyan-400 mt-2 italic">Admin: {s.admin_notes}</p>
                      )}
                    </div>
                    {s.screenshot_url && (
                      <img src={s.screenshot_url} alt="Screenshot" className="w-12 h-12 rounded object-cover border border-gray-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 font-mono">{new Date(s.created_at).toLocaleDateString()}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Suggestion;
