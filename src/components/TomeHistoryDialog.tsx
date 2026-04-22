import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, RotateCcw, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Version {
  id: string;
  title: string | null;
  content: string | null;
  editor_name: string | null;
  edited_by: string | null;
  created_at: string;
}

interface Props {
  tomeEntryId: string;
  tomeTitle: string;
  children: React.ReactNode;
  onRestored?: () => void;
}

const preview = (raw: string | null) => {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((c: any) => c?.content || '')
        .join('\n')
        .slice(0, 160);
    }
  } catch {}
  return raw.slice(0, 160);
};

export const TomeHistoryDialog = ({ tomeEntryId, tomeTitle, children, onRestored }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Version | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tome_versions')
        .select('*')
        .eq('tome_entry_id', tomeEntryId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setVersions(data || []);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load history', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      load();
      setSelected(null);
    }
  }, [open, tomeEntryId]);

  const restore = async (v: Version) => {
    if (!confirm('Restore this version? The current content will itself be saved as a new history entry first, so nothing is lost.')) return;
    try {
      const { error } = await supabase
        .from('tome_entries')
        .update({ title: v.title, content: v.content })
        .eq('id', tomeEntryId);
      if (error) throw error;
      toast({ title: 'Restored', description: 'Version restored. A new history entry was logged.' });
      setOpen(false);
      onRestored?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to restore', variant: 'destructive' });
    }
  };

  const copyToClipboard = async (v: Version) => {
    try {
      await navigator.clipboard.writeText(v.content || '');
      toast({ title: 'Copied', description: 'Content copied to clipboard.' });
    } catch {
      toast({ title: 'Error', description: 'Clipboard unavailable', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            History — {tomeTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-xs uppercase text-muted-foreground mb-1">Versions</p>
            <ScrollArea className="h-[420px] rounded-md border border-border">
              {loading && <p className="p-3 text-sm text-muted-foreground">Loading…</p>}
              {!loading && versions.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">No history yet.</p>
              )}
              <div className="divide-y divide-border">
                {versions.map((v, i) => (
                  <button
                    key={v.id}
                    onClick={() => setSelected(v)}
                    className={`w-full text-left p-3 hover:bg-accent transition ${
                      selected?.id === v.id ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{v.editor_name || 'Unknown'}</span>
                      {i === 0 && <Badge variant="secondary" className="text-xs">current</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {preview(v.content)}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div>
            <p className="text-xs uppercase text-muted-foreground mb-1">Preview</p>
            <ScrollArea className="h-[420px] rounded-md border border-border p-3">
              {!selected && <p className="text-sm text-muted-foreground">Select a version to preview.</p>}
              {selected && (
                <div className="space-y-2">
                  <div className="font-semibold">{selected.title}</div>
                  <pre className="text-xs whitespace-pre-wrap font-sans text-foreground/90">
                    {(() => {
                      try {
                        const parsed = JSON.parse(selected.content || '');
                        if (Array.isArray(parsed)) {
                          return parsed
                            .map((c: any) => `## ${c?.title || ''}\n${c?.content || ''}`)
                            .join('\n\n');
                        }
                      } catch {}
                      return selected.content || '';
                    })()}
                  </pre>
                </div>
              )}
            </ScrollArea>
            {selected && (
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(selected)}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button size="sm" onClick={() => restore(selected)}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Restore
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
