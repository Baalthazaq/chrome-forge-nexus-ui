import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ImageLightbox } from './ImageLightbox';

interface Props {
  environmentId: string | null;
  onClose: () => void;
}

export const EnvironmentViewDialog = ({ environmentId, onClose }: Props) => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [openFeatures, setOpenFeatures] = useState<Record<number, boolean>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!environmentId) { setData(null); return; }
    setLoading(true);
    supabase.from('environments').select('*').eq('id', environmentId).maybeSingle()
      .then(({ data }) => { setData(data); setLoading(false); });
  }, [environmentId]);

  const features: any[] = Array.isArray(data?.features)
    ? data.features
    : (typeof data?.features === 'string' ? JSON.parse(data.features) : []);

  return (
    <>
      <Dialog open={!!environmentId} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {data?.name || (loading ? 'Loading...' : 'Environment')}
              {data?.tier && <Badge variant="outline">T{data.tier}</Badge>}
              {data?.environment_type && <Badge variant="outline">{data.environment_type}</Badge>}
              {data?.difficulty && <Badge variant="outline">Difficulty {data.difficulty}</Badge>}
            </DialogTitle>
          </DialogHeader>

          {data && (
            <div className="space-y-4">
              {data.image_url && (
                <button onClick={() => setLightbox(data.image_url)} className="block w-full">
                  <img src={data.image_url} alt={data.name} className="w-full max-h-64 object-cover rounded cursor-zoom-in hover:opacity-90 transition-opacity" />
                </button>
              )}

              {data.impulses?.length > 0 && (
                <div className="text-sm">
                  <span className="font-semibold text-emerald-400">Impulses: </span>
                  <span className="text-muted-foreground">{data.impulses.join(', ')}</span>
                </div>
              )}

              {data.potential_adversaries && (
                <div className="text-sm">
                  <span className="font-semibold">Potential Adversaries: </span>
                  <span className="text-muted-foreground">{data.potential_adversaries}</span>
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
