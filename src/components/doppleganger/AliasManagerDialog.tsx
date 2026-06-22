import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Camera, Plus, Trash2, Check, UserCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { CharacterAlias } from "@/hooks/useAliases";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerUserId: string;
  primaryName: string;
  primaryAvatarUrl: string | null;
  aliases: CharacterAlias[];
  activeAlias: CharacterAlias | null;
  onCreate: (input: {
    name: string;
    avatar_url?: string | null;
    bio?: string | null;
    is_public: boolean;
    sheet_data?: any;
  }) => Promise<CharacterAlias | null>;
  onUpdate: (id: string, updates: Partial<CharacterAlias>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onActivate: (aliasId: string | null) => Promise<void>;
  /** snapshot of currently active sheet+profile, used as starting blob for new aliases */
  currentSheetSnapshot: any;
}

export function AliasManagerDialog({
  open,
  onOpenChange,
  ownerUserId,
  primaryName,
  primaryAvatarUrl,
  aliases,
  activeAlias,
  onCreate,
  onUpdate,
  onDelete,
  onActivate,
  currentSheetSnapshot,
}: Props) {
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBio, setNewBio] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(false);
  const [newAvatarUrl, setNewAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<CharacterAlias>>({});

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onUrl: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileName = `alias_${ownerUserId}_${Date.now()}.${file.name
        .split(".")
        .pop()}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      if (!data?.publicUrl) throw new Error("No public URL");
      onUrl(data.publicUrl);
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const resetCreate = () => {
    setCreating(false);
    setNewName("");
    setNewBio("");
    setNewIsPublic(false);
    setNewAvatarUrl(null);
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    await onCreate({
      name: newName.trim(),
      avatar_url: newAvatarUrl,
      bio: newBio.trim() || null,
      is_public: newIsPublic,
      sheet_data: currentSheetSnapshot,
    });
    toast({ title: "Alias created" });
    resetCreate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-gray-100 max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Aliases</DialogTitle>
          <DialogDescription className="text-gray-400">
            Switch between alternate forms or personas. Public aliases appear in
            Rol'dex as separate characters. Private aliases are for wild shapes,
            familiars, or disguises.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Primary */}
          <Card
            className={`p-3 flex items-center gap-3 ${
              !activeAlias
                ? "bg-indigo-950/60 border-indigo-500"
                : "bg-gray-800/40 border-gray-700"
            }`}
          >
            <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-600 shrink-0">
              {primaryAvatarUrl ? (
                <img
                  src={primaryAvatarUrl}
                  alt={primaryName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <UserCircle2 className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="font-bold text-white">{primaryName}</div>
              <div className="text-xs text-gray-400">Primary character</div>
            </div>
            {!activeAlias ? (
              <Badge className="bg-indigo-600">
                <Check className="w-3 h-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onActivate(null)}
                className="border-indigo-500 text-indigo-300"
              >
                Switch to
              </Button>
            )}
          </Card>

          {/* Aliases list */}
          {aliases.map((alias) => {
            const isEditing = editingId === alias.id;
            const isActive = alias.is_active;
            return (
              <Card
                key={alias.id}
                className={`p-3 ${
                  isActive
                    ? "bg-purple-950/60 border-purple-500"
                    : "bg-gray-800/40 border-gray-700"
                }`}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden border border-gray-600 shrink-0">
                        {(editDraft.avatar_url ?? alias.avatar_url) ? (
                          <img
                            src={(editDraft.avatar_url ?? alias.avatar_url) as string}
                            alt={alias.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                            <UserCircle2 className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer">
                          <Camera className="w-4 h-4 text-white" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handleAvatarUpload(e, (url) =>
                                setEditDraft((d) => ({ ...d, avatar_url: url }))
                              )
                            }
                          />
                        </label>
                      </div>
                      <Input
                        value={editDraft.name ?? alias.name}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, name: e.target.value }))
                        }
                        className="bg-gray-800 border-gray-600 text-gray-100"
                      />
                    </div>
                    <Textarea
                      value={editDraft.bio ?? alias.bio ?? ""}
                      onChange={(e) =>
                        setEditDraft((d) => ({ ...d, bio: e.target.value }))
                      }
                      placeholder="Bio / description"
                      className="bg-gray-800 border-gray-600 text-gray-100"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={editDraft.is_public ?? alias.is_public}
                          onCheckedChange={(v) =>
                            setEditDraft((d) => ({ ...d, is_public: v }))
                          }
                        />
                        <Label className="text-sm">
                          Public (appears in Rol'dex)
                        </Label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(null);
                            setEditDraft({});
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={async () => {
                            await onUpdate(alias.id, editDraft);
                            setEditingId(null);
                            setEditDraft({});
                            toast({ title: "Alias updated" });
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-600 shrink-0">
                      {alias.avatar_url ? (
                        <img
                          src={alias.avatar_url}
                          alt={alias.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                          <UserCircle2 className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white truncate flex items-center gap-2">
                        {alias.name}
                        <Badge
                          variant="outline"
                          className={
                            alias.is_public
                              ? "border-cyan-500 text-cyan-300"
                              : "border-gray-500 text-gray-400"
                          }
                        >
                          {alias.is_public ? "Public" : "Private"}
                        </Badge>
                      </div>
                      {alias.bio && (
                        <div className="text-xs text-gray-400 line-clamp-1">
                          {alias.bio}
                        </div>
                      )}
                    </div>
                    {isActive ? (
                      <Badge className="bg-purple-600">
                        <Check className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onActivate(alias.id)}
                        className="border-purple-500 text-purple-300"
                      >
                        Switch to
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(alias.id);
                        setEditDraft({});
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm(`Delete alias "${alias.name}"?`)) return;
                        await onDelete(alias.id);
                        toast({ title: "Alias deleted" });
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}

          {/* Create */}
          {creating ? (
            <Card className="p-3 bg-gray-800/40 border-gray-700 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden border border-gray-600 shrink-0">
                  {newAvatarUrl ? (
                    <img
                      src={newAvatarUrl}
                      alt="New alias"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                      <UserCircle2 className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer">
                    <Camera className="w-4 h-4 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleAvatarUpload(e, (url) => setNewAvatarUrl(url))
                      }
                    />
                  </label>
                </div>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Alias name"
                  className="bg-gray-800 border-gray-600 text-gray-100"
                  autoFocus
                />
              </div>
              <Textarea
                value={newBio}
                onChange={(e) => setNewBio(e.target.value)}
                placeholder="Bio / description (optional)"
                className="bg-gray-800 border-gray-600 text-gray-100"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newIsPublic}
                    onCheckedChange={setNewIsPublic}
                  />
                  <Label className="text-sm">
                    Public (independent character in Rol'dex)
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={resetCreate}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={uploading || !newName.trim()}
                  >
                    Create
                  </Button>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                The new alias starts with a copy of the currently active sheet.
              </div>
            </Card>
          ) : (
            <Button
              variant="outline"
              className="w-full border-dashed border-gray-600 text-gray-300"
              onClick={() => setCreating(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Alias
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
