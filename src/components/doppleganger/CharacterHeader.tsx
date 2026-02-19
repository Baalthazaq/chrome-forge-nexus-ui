import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, ArrowLeft, Pencil, Check, X, Plus, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { CharacterSheet, GameCard } from "@/data/gameCardTypes";
import { LevelUpDialog } from "./LevelUpDialog";
import { getProficiency, getMulticlassInfo, type LevelUpChoices } from "@/lib/levelUpUtils";

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
  onStatChange: (stat: string, value: number) => void;
  gameCards: GameCard[];
  subclassCards: GameCard[];
  domainCards: GameCard[];
  selectedSubclass: GameCard | undefined;
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

  const ancestryNames = [...new Set(ancestryCards.map(c => c.source).filter(Boolean))] as string[];
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
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Type or select ancestry..."
        className="bg-gray-800/50 border-gray-600 text-gray-100 text-sm"
      />
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
          {filtered.length > 0 ? filtered.map(name => (
            <button
              key={name}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(name)}
              className="w-full text-left px-3 py-2 text-sm text-gray-100 hover:bg-gray-700 transition-colors"
            >
              {name}
            </button>
          )) : (
            <div className="px-3 py-2 text-sm text-gray-400">No matches — custom value will be used</div>
          )}
        </div>
      )}
    </div>
  );
}

export function CharacterHeader({
  profile, sheet, updateSheet,
  classCards, filteredSubclasses, ancestryCards, communityCards,
  domains, displayUser, isEditing, onProfileUpdate, onStatChange,
  gameCards, subclassCards, domainCards, selectedSubclass,
}: Props) {
  const { toast } = useToast();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(profile.character_name || '');
  const [levelUpOpen, setLevelUpOpen] = useState(false);

  const choices = (sheet.level_up_choices || {}) as LevelUpChoices;
  const proficiency = getProficiency(sheet.level, choices);
  const multiclasses = getMulticlassInfo(choices);
  const multiclassDomains = multiclasses.map(mc => mc.domain).filter(Boolean);
  const allDomains = [...domains, ...multiclassDomains];

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
            {/* Name */}
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

            {/* Level + Proficiency */}
            <div>
              <label className="text-gray-300 text-xs mb-1 block">Level</label>
              <div className="flex items-center gap-2">
                <div className="text-lg font-bold text-white">{sheet.level}</div>
                {isEditing && sheet.level < 10 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLevelUpOpen(true)}
                    className="border-indigo-500/50 text-indigo-300 hover:text-indigo-200 hover:bg-indigo-900/30 h-7 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Level Up
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Zap className="w-3 h-3 text-purple-400" />
                <span className="text-xs text-purple-300">Proficiency: {proficiency}</span>
              </div>
            </div>

            {/* Class */}
            <div>
              <label className="text-gray-300 text-xs mb-1 block">Class</label>
              {isEditing ? (
                <Select value={sheet.class || '__none__'} onValueChange={handleClassChange}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-600 text-gray-100">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999] bg-gray-800 border-gray-600 text-white">
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
                  <SelectContent className="z-[9999] bg-gray-800 border-gray-600 text-white">
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

            {/* Ancestry */}
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
                  <SelectContent className="z-[9999] bg-gray-800 border-gray-600 text-white">
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

            {/* Multiclass */}
            {multiclasses.length > 0 && multiclasses.map((mc, mcIndex) => {
              const mcLabel = multiclasses.length > 1 ? ` ${mcIndex + 1}` : '';
              const mcFilteredSubclasses = subclassCards.filter(s => s.source === mc.class);

              const updateMulticlassField = (field: 'class' | 'subclass', value: string) => {
                const updatedChoices = { ...choices };
                let mcCount = 0;
                for (const [lvl, data] of Object.entries(updatedChoices)) {
                  if (!data.upgrades) continue;
                  for (const u of data.upgrades) {
                    if (u.type === 'multiclass' && u.multiclass_data) {
                      if (mcCount === mcIndex) {
                        u.multiclass_data[field] = value;
                        if (field === 'class') u.multiclass_data.subclass = '';
                        updateSheet({ level_up_choices: updatedChoices as any });
                        return;
                      }
                      mcCount++;
                    }
                  }
                }
              };

              return (
                <React.Fragment key={`mc-header-${mcIndex}`}>
                  {/* MC Class */}
                  <div>
                    <label className="text-cyan-400 text-xs mb-1 block">Multiclass{mcLabel}</label>
                    {isEditing ? (
                      <Select value={mc.class || '__none__'} onValueChange={(v) => updateMulticlassField('class', v === '__none__' ? '' : v)}>
                        <SelectTrigger className="bg-gray-800/50 border-gray-600 text-gray-100">
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent className="z-[9999] bg-gray-800 border-gray-600 text-white">
                          <SelectItem value="__none__">None</SelectItem>
                          {classCards.map(c => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-lg font-bold text-white">{mc.class || '—'}</div>
                    )}
                  </div>
                  {/* MC Subclass */}
                  <div>
                    <label className="text-cyan-400 text-xs mb-1 block">MC Subclass{mcLabel}</label>
                    {isEditing ? (
                      <Select
                        value={mc.subclass || '__none__'}
                        onValueChange={(v) => updateMulticlassField('subclass', v === '__none__' ? '' : v)}
                        disabled={!mc.class}
                      >
                        <SelectTrigger className="bg-gray-800/50 border-gray-600 text-gray-100">
                          <SelectValue placeholder={mc.class ? "Select subclass" : "Choose class first"} />
                        </SelectTrigger>
                        <SelectContent className="z-[9999] bg-gray-800 border-gray-600 text-white">
                          <SelectItem value="__none__">None</SelectItem>
                          {mcFilteredSubclasses.map(c => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-lg font-bold text-white">{mc.subclass || '—'}</div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}

            {/* Domains */}
            {allDomains.length > 0 && (
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-gray-300 text-xs mb-1 block">Domains</label>
                <div className="flex gap-2 flex-wrap">
                  {domains.map((d, i) => (
                    <span key={`main-${i}`} className="px-3 py-1 bg-purple-900/50 border border-purple-500/30 rounded-md text-purple-300 text-sm">
                      {d}
                    </span>
                  ))}
                  {multiclassDomains.map((d, i) => (
                    <span key={`mc-${i}`} className="px-3 py-1 bg-cyan-900/50 border border-cyan-500/30 rounded-md text-cyan-300 text-sm">
                      {d} <span className="text-xs opacity-60">(MC)</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <LevelUpDialog
        open={levelUpOpen}
        onOpenChange={setLevelUpOpen}
        sheet={sheet}
        updateSheet={updateSheet}
        profile={profile}
        onStatChange={onStatChange}
        gameCards={gameCards}
        classCards={classCards}
        subclassCards={subclassCards}
        domainCards={domainCards}
        domains={allDomains}
        selectedSubclass={selectedSubclass}
      />
    </>
  );
}
