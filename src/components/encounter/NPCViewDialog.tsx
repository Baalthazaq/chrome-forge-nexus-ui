import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ImageLightbox } from './ImageLightbox';

interface Props {
  userId: string | null;
  onClose: () => void;
}

interface CardEntry {
  title: string;
  content: string;
  source: string;
}

export const NPCViewDialog = ({ userId, onClose }: Props) => {
  const [profile, setProfile] = useState<any | null>(null);
  const [cards, setCards] = useState<CardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [openCards, setOpenCards] = useState<Record<number, boolean>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) { setProfile(null); setCards([]); return; }
    setLoading(true);
    (async () => {
      const [{ data: prof }, { data: sheet }, { data: gameCards }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('character_sheets').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('game_cards').select('*'),
      ]);
      setProfile(prof);

      const collected: CardEntry[] = [];
      const findCard = (type: string, name: string | null, source?: string | null) =>
        (gameCards || []).find((c: any) => c.card_type === type && c.name === name && (!source || c.source === source));

      if (sheet) {
        // Class auto cards
        if (sheet.class) {
          const cls = findCard('class', sheet.class);
          const meta = cls?.metadata as any;
          if (meta?.class_feature) collected.push({ title: `${sheet.class} Class Feature`, content: meta.class_feature, source: 'Class' });
          if (meta?.hope_feature) collected.push({ title: `${sheet.class} Hope Feature`, content: meta.hope_feature, source: 'Class' });
        }
        // Subclass
        if (sheet.subclass) {
          const sub = findCard('subclass', sheet.subclass, sheet.class);
          const meta = sub?.metadata as any;
          if (meta?.foundation) collected.push({ title: `${sheet.subclass} Foundation`, content: meta.foundation, source: 'Subclass' });
          if (meta?.specialization) collected.push({ title: `${sheet.subclass} Specialization`, content: meta.specialization, source: 'Subclass' });
          if (meta?.mastery) collected.push({ title: `${sheet.subclass} Mastery`, content: meta.mastery, source: 'Subclass' });
        }
        // Ancestry
        if (sheet.ancestry) {
          (gameCards || []).filter((c: any) => c.card_type === 'ancestry' && c.source === sheet.ancestry)
            .forEach((c: any) => collected.push({ title: c.name, content: c.content || '', source: `Ancestry: ${c.source}` }));
        }
        // Community
        if (sheet.community) {
          (gameCards || []).filter((c: any) => c.card_type === 'community' && c.source === sheet.community)
            .forEach((c: any) => collected.push({ title: c.name, content: c.content || '', source: `Community: ${c.source}` }));
        }
        // Selected cards
        const selected: any[] = (sheet.selected_card_ids as any[]) || [];
        selected.forEach((sc) => {
          if (sc.custom) {
            collected.push({ title: sc.title || 'Custom', content: sc.content || '', source: sc.category || 'Custom' });
          } else if (sc.card_id) {
            const card = (gameCards || []).find((c: any) => c.id === sc.card_id);
            if (card) {
              const meta = card.metadata as any;
              const src = card.card_type === 'domain' ? `${card.source || ''} Lv${meta?.level || '?'}` : (card.source || card.card_type);
              collected.push({ title: card.name, content: card.content || '', source: src });
            }
          }
        });
      }
      setCards(collected);
      setLoading(false);
    })();
  }, [userId]);

  return (
    <>
      <Dialog open={!!userId} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {profile?.character_name || (loading ? 'Loading...' : 'NPC')}
              {profile?.level && <Badge variant="outline">Lv.{profile.level}</Badge>}
              {profile?.character_class && <Badge variant="outline">{profile.character_class}</Badge>}
              {profile?.ancestry && <Badge variant="outline">{profile.ancestry}</Badge>}
            </DialogTitle>
          </DialogHeader>

          {profile && (
            <div className="space-y-4">
              {profile.avatar_url && (
                <button onClick={() => setLightbox(profile.avatar_url)} className="block">
                  <img src={profile.avatar_url} alt={profile.character_name} className="w-32 h-32 object-cover rounded cursor-zoom-in hover:opacity-90 transition-opacity" />
                </button>
              )}
              {profile.bio && <p className="text-sm italic text-muted-foreground">{profile.bio}</p>}

              {cards.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold border-b border-border pb-1">Ability Cards ({cards.length})</h4>
                  {cards.map((c, i) => (
                    <Collapsible key={i} open={openCards[i]} onOpenChange={(o) => setOpenCards(p => ({ ...p, [i]: o }))}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between cursor-pointer bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded p-2 text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{c.title}</span>
                            <span className="text-xs text-muted-foreground">{c.source}</span>
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${openCards[i] ? 'rotate-180' : ''}`} />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-3 py-2 text-sm text-muted-foreground whitespace-pre-wrap">{c.content}</div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No ability cards on this NPC's sheet.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ImageLightbox url={lightbox} onClose={() => setLightbox(null)} />
    </>
  );
};
