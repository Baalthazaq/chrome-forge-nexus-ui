import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

interface CharacterDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: any;
  contactData?: any;
  tags?: string[];
  trustLevel?: string;
  personalRating?: number;
  relationship?: string | null;
}

const getTrustColor = (rating: number) => {
  if (rating >= 5) return "text-green-400 border-green-400";
  if (rating >= 4) return "text-blue-400 border-blue-400";
  if (rating >= 3) return "text-purple-400 border-purple-400";
  if (rating >= 2) return "text-orange-400 border-orange-400";
  return "text-gray-400 border-gray-400";
};

export const CharacterDetailDialog = ({
  open,
  onOpenChange,
  profile,
  contactData,
  tags = [],
  trustLevel,
  personalRating,
  relationship,
}: CharacterDetailDialogProps) => {
  if (!profile) return null;

  const fallbackAvatar = "https://csyajgxbptbtluxdiepi.supabase.co/storage/v1/object/public/icons/Doppleganger.gif";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-gray-900 border-gray-700 text-gray-100 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-cyan-400 font-mono tracking-wide">
            {profile.character_name || 'Unknown Character'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Top section: Avatar + Basic Info */}
          <div className="flex items-start gap-6">
            <img
              src={profile.avatar_url || fallbackAvatar}
              alt={profile.character_name || 'Character'}
              className="w-28 h-28 rounded-lg object-cover border-2 border-cyan-500/50"
            />
            <div className="flex-1 space-y-2">
              {profile.alias && (
                <p className="text-blue-300 font-mono">@{profile.alias}</p>
              )}
              <div className="text-gray-300 space-y-1 text-sm">
                <p><span className="text-gray-500">Ancestry:</span> {profile.ancestry || 'Unknown'}</p>
                <p><span className="text-gray-500">Class:</span> {profile.character_class || 'Unknown'}</p>
                <p><span className="text-gray-500">Level:</span> {profile.level || 1}</p>
                <p><span className="text-gray-500">Job:</span> {profile.job || 'Unknown'}</p>
                <p><span className="text-gray-500">Company:</span> {profile.company || 'None'}</p>
              </div>
            </div>
          </div>

          {/* Trust & Relationship */}
          {contactData && (
            <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50 space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Your Assessment</h3>
              <div className="flex items-center gap-4 flex-wrap">
                {trustLevel && personalRating !== undefined && (
                  <Badge variant="outline" className={getTrustColor(personalRating)}>
                    <Star className="w-3 h-3 mr-1" />
                    {trustLevel} ({personalRating}/5)
                  </Badge>
                )}
                {relationship && (
                  <Badge variant="outline" className="text-cyan-300 border-cyan-500/50">
                    {relationship}
                  </Badge>
                )}
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs border-blue-600 text-blue-400">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              {contactData.notes && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{contactData.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Bio</h3>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}

          {/* Stats */}
          {(profile.agility || profile.strength || profile.finesse || profile.instinct || profile.presence || profile.knowledge) && (
            <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Known Stats</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Agility', value: profile.agility },
                  { label: 'Strength', value: profile.strength },
                  { label: 'Finesse', value: profile.finesse },
                  { label: 'Instinct', value: profile.instinct },
                  { label: 'Presence', value: profile.presence },
                  { label: 'Knowledge', value: profile.knowledge },
                ].filter(s => s.value != null).map(stat => (
                  <div key={stat.label} className="text-center p-2 rounded bg-gray-900/50 border border-gray-700/30">
                    <div className="text-lg font-bold text-cyan-400">{stat.value}</div>
                    <div className="text-xs text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional details */}
          <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {profile.age && (
                <div><span className="text-gray-500">Age:</span> <span className="text-gray-300">{profile.age}</span></div>
              )}
              {profile.employer && (
                <div><span className="text-gray-500">Employer:</span> <span className="text-gray-300">{profile.employer}</span></div>
              )}
              {profile.education && (
                <div><span className="text-gray-500">Education:</span> <span className="text-gray-300">{profile.education}</span></div>
              )}
              {profile.address && (
                <div><span className="text-gray-500">Address:</span> <span className="text-gray-300">{profile.address}</span></div>
              )}
              {profile.security_rating && (
                <div><span className="text-gray-500">Security:</span> <span className="text-gray-300">{profile.security_rating}</span></div>
              )}
              {profile.aliases && profile.aliases.length > 0 && (
                <div className="col-span-2"><span className="text-gray-500">Aliases:</span> <span className="text-gray-300">{profile.aliases.join(', ')}</span></div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
