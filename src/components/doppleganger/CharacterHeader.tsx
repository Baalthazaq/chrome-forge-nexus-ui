import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, ArrowLeft, Pencil, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import type { CharacterSheet, GameCard } from "@/data/gameCardTypes";

interface Props {
  profile: any;
  sheet: CharacterSheet;
  updateSheet: (updates: Partial<CharacterSheet>) => Promise<void>;
  classCards: GameCard[];
  filteredSubclasses: GameCard[];
  ancestryCards: GameCard[];
  communityCards: GameCard[];
  domains: string[];
  displayUser: any;
  isEditing: boolean;
  onProfileUpdate: (field: string, value: any) => void;
}

function AncestryCombobox({ value, onChange, ancestryCards, isEditing }: {
  value: string;
  onChange: (val: string) => void;
  ancestryCards: GameCard[];
  isEditing: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setInputValue(value); }, [value]);

  const ancestryNames = [...new Set(ancestryCards.map(c => c.name))];
  const filtered = inputValue
    ? ancestryNames.filter(n => n.toLowerCase().includes(inputValue.toLowerCase()))
    : ancestryNames;

  const handleSelect = (name: string) => {
    setInputValue(name);
    onChange(name);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange(e.target.value);
    if (!open) setOpen(true);
  };

  if (!isEditing) {
    return (
      <div>
        <label className="text-gray-300 text-xs mb-1 block">Ancestry</label>
        <div className="text-lg font-bold text-white">{value || '—'}</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="text-gray-300 text-xs mb-1 block">Ancestry</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            placeholder="Type or select ancestry..."
            className="bg-gray-800/50 border-gray-600 text-gray-100 text-sm"
          />
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-[var(--radix-popover-trigger-width)] bg-gray-800 border-gray-600 z-50"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-48 overflow-y-auto">
            {filtered.length > 0 ? filtered.map(name => (
              <button
                key={name}
                onClick={() => handleSelect(name)}
                className="w-full text-left px-3 py-2 text-sm text-gray-100 hover:bg-gray-700 transition-colors"
              >
                {name}
              </button>
            )) : (
              <div className="px-3 py-2 text-sm text-gray-400">No matches — custom value will be used</div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function CharacterHeader({
  profile, sheet, updateSheet,
  classCards, filteredSubclasses, ancestryCards, communityCards,
  domains, displayUser, isEditing, onProfileUpdate,
}: Props) {
  const { toast } = useToast();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(profile.character_name || '');

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !displayUser) return;
    setAvatarUploading(true);
    try {
      const fileName = `avatar_${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      if (!urlData?.publicUrl) throw new Error('Failed to get public URL');
      const userId = displayUser.user_id || displayUser.id;
      await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('user_id', userId);
      toast({ title: 'Avatar updated' });
      window.location.reload();
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveName = async () => {
    onProfileUpdate('character_name', nameValue);
    setEditingName(false);
  };

  const communitySources = [...new Set(communityCards.map(c => c.source))].filter(Boolean) as string[];

  const handleClassChange = (value: string) => {
    const val = value === '__none__' ? null : value;
    updateSheet({ class: val, subclass: null });
  };

  return (
    <>
      {/* Nav */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/">
          <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to OS
          </Button>
        </Link>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Doppleganger
        </h1>
        <div className="w-20" />
      </div>

      {/* Profile Card */}
      <Card className="p-6 bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border-indigo-500/30 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar */}
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-indigo-500 shrink-0 self-center md:self-start">
            <img
              src={profile.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'}
              alt={profile.character_name || 'Character'}
              className="w-full h-full object-cover"
            />
            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="w-6 h-6 text-white" />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={avatarUploading} className="hidden" />
            </label>
            {avatarUploading && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-white text-xs">Uploading...</div>
              </div>
            )}
          </div>

          {/* Identity Selectors */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Name - editable */}
            <div>
              <label className="text-gray-300 text-xs mb-1 block">Name</label>
              {editingName ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="bg-gray-800/50 border-gray-600 text-gray-100 text-lg font-bold"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  />
                  <button onClick={saveName} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setEditingName(false)} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-white truncate">{profile.character_name || 'Unnamed'}</div>
                  <button onClick={() => { setNameValue(profile.character_name || ''); setEditingName(true); }} className="text-gray-500 hover:text-gray-300">
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Level */}
            <div>
              <label className="text-gray-300 text-xs mb-1 block">Level</label>
              {isEditing ? (
                <Select value={String(sheet.level)} onValueChange={(v) => updateSheet({ level: Number(v) })}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-600 text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-lg font-bold text-white">{sheet.level}</div>
              )}
            </div>

            {/* Class */}
            <div>
              <label className="text-gray-300 text-xs mb-1 block">Class</label>
              {isEditing ? (
                <Select value={sheet.class || '__none__'} onValueChange={handleClassChange}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-600 text-gray-100">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {classCards.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-lg font-bold text-white">{sheet.class || '—'}</div>
              )}
            </div>

            {/* Subclass */}
            <div>
              <label className="text-gray-300 text-xs mb-1 block">Subclass</label>
              {isEditing ? (
                <Select
                  value={sheet.subclass || '__none__'}
                  onValueChange={(v) => updateSheet({ subclass: v === '__none__' ? null : v })}
                  disabled={!sheet.class}
                >
                  <SelectTrigger className="bg-gray-800/50 border-gray-600 text-gray-100">
                    <SelectValue placeholder={sheet.class ? "Select subclass" : "Choose class first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {filteredSubclasses.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-lg font-bold text-white">{sheet.subclass || '—'}</div>
              )}
            </div>

            {/* Ancestry - combobox: type or pick */}
            <AncestryCombobox
              value={sheet.ancestry || ''}
              onChange={(val) => updateSheet({ ancestry: val || null })}
              ancestryCards={ancestryCards}
              isEditing={isEditing}
            />

            {/* Community */}
            <div>
              <label className="text-gray-300 text-xs mb-1 block">Community</label>
              {isEditing ? (
                <Select
                  value={sheet.community || '__none__'}
                  onValueChange={(v) => updateSheet({ community: v === '__none__' ? null : v })}
                >
                  <SelectTrigger className="bg-gray-800/50 border-gray-600 text-gray-100">
                    <SelectValue placeholder="Select community" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {communitySources.map(src => (
                      <SelectItem key={src} value={src}>{src}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-lg font-bold text-white">{sheet.community || '—'}</div>
              )}
            </div>

            {/* Domains (read-only, derived from class) */}
            {domains.length > 0 && (
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-gray-300 text-xs mb-1 block">Domains</label>
                <div className="flex gap-2">
                  {domains.map((d, i) => (
                    <span key={i} className="px-3 py-1 bg-purple-900/50 border border-purple-500/30 rounded-md text-purple-300 text-sm">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
