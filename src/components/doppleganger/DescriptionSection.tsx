import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Palette, User } from "lucide-react";
import type { CharacterSheet, PhysicalDescription } from "@/data/gameCardTypes";
import { useState, useCallback } from "react";

interface Props {
  sheet: CharacterSheet;
  updateSheet: (updates: Partial<CharacterSheet>) => Promise<void>;
  bio: string;
  job: string;
  company: string;
  isEditing: boolean;
  onBioUpdate?: (bio: string) => void;
  onProfileUpdate?: (field: string, value: any) => void;
}

export function DescriptionSection({ sheet, updateSheet, bio, job, company, isEditing, onBioUpdate, onProfileUpdate }: Props) {
  const pd = sheet.physical_description || { clothes: '', eyes: '', body: '', skin: '' };

  const [localPd, setLocalPd] = useState(pd);
  const [localPersonality, setLocalPersonality] = useState(sheet.personality || '');
  const [localBio, setLocalBio] = useState(bio);
  const [localJob, setLocalJob] = useState(job);
  const [localCompany, setLocalCompany] = useState(company);

  const savePd = useCallback((field: keyof PhysicalDescription, value: string) => {
    const updated = { ...localPd, [field]: value };
    setLocalPd(updated);
    updateSheet({ physical_description: updated });
  }, [localPd, updateSheet]);

  const savePersonality = useCallback(() => {
    updateSheet({ personality: localPersonality });
  }, [localPersonality, updateSheet]);

  const saveBio = useCallback(() => {
    onBioUpdate?.(localBio);
  }, [localBio, onBioUpdate]);

  const fields: { key: keyof PhysicalDescription; label: string }[] = [
    { key: 'clothes', label: 'Clothes' },
    { key: 'eyes', label: 'Eyes' },
    { key: 'body', label: 'Body' },
    { key: 'skin', label: 'Skin' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      {/* Physical Description */}
      <Card className="p-4 bg-gray-900/30 border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Palette className="w-5 h-5 text-teal-400" />
          Physical Description
        </h3>
        <div className="space-y-3">
          {fields.map(({ key, label }) => (
            <div key={key}>
              <label className="text-gray-400 text-xs mb-1 block">{label}</label>
              {isEditing ? (
                <Input
                  value={localPd[key]}
                  onChange={(e) => setLocalPd(prev => ({ ...prev, [key]: e.target.value }))}
                  onBlur={() => savePd(key, localPd[key])}
                  placeholder={`Describe ${label.toLowerCase()}...`}
                  className="bg-gray-800/50 border-gray-600 text-gray-100 text-sm"
                />
              ) : (
                <div className="text-gray-200 text-sm">{localPd[key] || '—'}</div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Personality & Bio */}
      <Card className="p-4 bg-gray-900/30 border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <User className="w-5 h-5 text-pink-400" />
          Personality & Bio
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Personality</label>
            {isEditing ? (
              <Textarea
                value={localPersonality}
                onChange={(e) => setLocalPersonality(e.target.value)}
                onBlur={savePersonality}
                placeholder="Describe personality traits..."
                className="bg-gray-800/50 border-gray-600 text-gray-100 text-sm"
                rows={4}
              />
            ) : (
              <div className="text-gray-200 text-sm whitespace-pre-wrap">{localPersonality || '—'}</div>
            )}
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Bio</label>
            {isEditing ? (
              <Textarea
                value={localBio}
                onChange={(e) => setLocalBio(e.target.value)}
                onBlur={saveBio}
                placeholder="Write a bio..."
                className="bg-gray-800/50 border-gray-600 text-gray-100 text-sm"
                rows={3}
              />
            ) : (
              <div className="text-gray-300 text-sm p-2 bg-gray-800/30 rounded min-h-[60px] whitespace-pre-wrap">
                {localBio || '—'}
              </div>
            )}
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Job</label>
            {isEditing ? (
              <Input
                value={localJob}
                onChange={(e) => setLocalJob(e.target.value)}
                onBlur={() => onProfileUpdate?.('job', localJob)}
                placeholder="Character's job or occupation..."
                className="bg-gray-800/50 border-gray-600 text-gray-100 text-sm"
              />
            ) : (
              <div className="text-gray-200 text-sm">{localJob || '—'}</div>
            )}
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Company</label>
            {isEditing ? (
              <Input
                value={localCompany}
                onChange={(e) => setLocalCompany(e.target.value)}
                onBlur={() => onProfileUpdate?.('company', localCompany)}
                placeholder="Company or guild..."
                className="bg-gray-800/50 border-gray-600 text-gray-100 text-sm"
              />
            ) : (
              <div className="text-gray-200 text-sm">{localCompany || '—'}</div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
