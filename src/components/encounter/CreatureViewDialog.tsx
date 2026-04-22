import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Heart, Zap, Sword, Shield, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ImageLightbox } from './ImageLightbox';

interface Props {
  creatureId: string | null;
  onClose: () => void;
}

export const CreatureViewDialog = ({ creatureId, onClose }: Props) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [openFeatures, setOpenFeatures] = useState<Record<number, boolean>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!creatureId) { setData(null); return; }
    setLoading(true);
    supabase.from('bestiary_creatures').select('*').eq('id', creatureId).maybeSingle()
      .then(({ data }) => { setData(data); setLoading(false); });
  }, [creatureId]);

  const features: any[] = Array.isArray(data?.features)
    ? data.features
    : (typeof data?.features === 'string' ? JSON.parse(data.features) : []);
  const thresholds = typeof data?.thresholds === 'string' ? JSON.parse(data.thresholds) : (data?.thresholds || {});

  return (
    <>
      <Dialog open={!!creatureId} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {data?.name || (loading ? 'Loading...' : 'Creature')}
              {data?.tier && <Badge variant="outline">T{data.tier}</Badge>}
              {data?.creature_type && <Badge variant="outline">{data.creature_type}</Badge>}
            </DialogTitle>
          </DialogHeader>

          {data && (
            <div className="space-y-4">
              {data.image_url && (
                <button onClick={() => setLightbox(data.image_url)} className="block w-full">
                  <img src={data.image_url} alt={data.name} className="w-full max-h-64 object-cover rounded cursor-zoom-in hover:opacity-90 transition-opacity" />
                </button>
              )}

              {data.description && (
                <p className="text-sm italic text-muted-foreground">{data.description}</p>
              )}

              {data.motives_tactics && (
                <div className="text-sm">
                  <span className="font-semibold text-amber-400">Motives & Tactics: </span>
                  <span className="text-muted-foreground">{data.motives_tactics}</span>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {data.difficulty != null && (
                  <div className="bg-muted/50 rounded p-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-400" />
                    <div><div className="text-xs text-muted-foreground">Difficulty</div><div className="font-bold">{data.difficulty}</div></div>
                  </div>
                )}
                {data.hp != null && (
                  <div className="bg-muted/50 rounded p-2 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-400" />
                    <div><div className="text-xs text-muted-foreground">HP</div><div className="font-bold">{data.hp}</div></div>
                  </div>
                )}
                {data.stress != null && (
                  <div className="bg-muted/50 rounded p-2 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-400" />
                    <div><div className="text-xs text-muted-foreground">Stress</div><div className="font-bold">{data.stress}</div></div>
                  </div>
                )}
                {data.attack_modifier != null && (
                  <div className="bg-muted/50 rounded p-2 flex items-center gap-2">
                    <Sword className="h-4 w-4 text-orange-400" />
                    <div><div className="text-xs text-muted-foreground">Attack</div><div className="font-bold">{data.attack_modifier >= 0 ? '+' : ''}{data.attack_modifier}</div></div>
                  </div>
                )}
              </div>

              {(thresholds?.major || thresholds?.severe) && (
                <div className="bg-muted/50 rounded p-2 text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <span className="font-semibold">Thresholds:</span>
                  <span>Major {thresholds.major || '—'} / Severe {thresholds.severe || '—'}</span>
                </div>
              )}

              {data.weapon_name && (
                <div className="bg-muted/50 rounded p-2 text-sm">
                  <div className="font-semibold">{data.weapon_name} <span className="text-xs text-muted-foreground">({data.weapon_range})</span></div>
                  {data.damage && <div className="text-xs text-muted-foreground">Damage: {data.damage}</div>}
                </div>
              )}

              {data.experience && (
                <div className="text-sm">
                  <span className="font-semibold">Experience: </span>
                  <span className="text-muted-foreground">{data.experience}</span>
                </div>
              )}

              {features.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold border-b border-border pb-1">Features</h4>
                  {features.map((f, i) => (
                    <Collapsible key={i} open={openFeatures[i]} onOpenChange={(o) => setOpenFeatures(p => ({ ...p, [i]: o }))}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between cursor-pointer bg-muted/40 hover:bg-muted/60 rounded p-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{f.name}</span>
                            {f.type && <Badge variant="outline" className="text-xs">{f.type}</Badge>}
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${openFeatures[i] ? 'rotate-180' : ''}`} />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-3 py-2 text-sm text-muted-foreground whitespace-pre-wrap">{f.description}</div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ImageLightbox url={lightbox} onClose={() => setLightbox(null)} />
    </>
  );
};
