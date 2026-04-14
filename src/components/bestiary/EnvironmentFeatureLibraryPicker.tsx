import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { FeatureItem } from './FeatureLibraryPicker';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (feature: FeatureItem) => void;
}

export const EnvironmentFeatureLibraryPicker = ({ open, onClose, onSelect }: Props) => {
  const [features, setFeatures] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) loadFeatures();
  }, [open]);

  const loadFeatures = async () => {
    setLoading(true);

    // Load from environment_features library
    const { data: libraryFeatures } = await supabase
      .from('environment_features' as any)
      .select('*')
      .order('name');

    // Also extract unique features from existing environments
    const { data: environments } = await supabase
      .from('bestiary_environments')
      .select('features, tier');

    const envFeatureMap = new Map<string, any>();
    (environments || []).forEach(e => {
      const feats = typeof e.features === 'string' ? JSON.parse(e.features) : e.features || [];
      feats.forEach((f: any) => {
        if (f.name && !envFeatureMap.has(f.name)) {
          envFeatureMap.set(f.name, { ...f, tier: e.tier, source: 'environment' });
        }
      });
    });

    // Merge: library features take priority
    const libraryNames = new Set(((libraryFeatures as any[]) || []).map((f: any) => f.name));
    const merged = [
      ...((libraryFeatures as any[]) || []).map((f: any) => ({ ...f, source: 'library' })),
      ...Array.from(envFeatureMap.values()).filter(f => !libraryNames.has(f.name)),
    ];

    setFeatures(merged);
    setLoading(false);
  };

  const filtered = features.filter(f =>
    !search ||
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.type?.toLowerCase().includes(search.toLowerCase()) ||
    f.description?.toLowerCase().includes(search.toLowerCase())
  );

  const typeColors: Record<string, string> = {
    Passive: 'bg-blue-500/20 text-blue-300',
    Action: 'bg-red-500/20 text-red-300',
    Reaction: 'bg-yellow-500/20 text-yellow-300',
    'Free Action': 'bg-green-500/20 text-green-300',
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Environment Feature Library</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search environment features..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No features found</p>
          ) : (
            filtered.map((f, i) => (
              <button
                key={`${f.name}-${i}`}
                className="w-full text-left p-3 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                onClick={() => {
                  onSelect({ name: f.name, type: f.type, description: f.description });
                  onClose();
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{f.name}</span>
                  <Badge className={`text-xs ${typeColors[f.type] || 'bg-muted text-muted-foreground'}`}>
                    {f.type}
                  </Badge>
                  {f.tier && (
                    <Badge variant="outline" className="text-xs">T{f.tier}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{f.description}</p>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
