import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const FIELDS = ['name', 'tier', 'creature_type', 'description', 'motives_tactics', 'difficulty', 'thresholds', 'hp', 'stress', 'attack_modifier', 'weapon_name', 'weapon_range', 'damage', 'experience', 'features', 'horde_value', 'is_custom', 'image_url'] as const;
const INT = ['tier', 'difficulty', 'hp', 'stress', 'attack_modifier', 'horde_value'];
const JSONF = ['thresholds', 'features'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = { data: any; status: 'new' | 'identical' | 'conflict' | 'invalid'; existing?: any; diffs: string[]; error?: string; matchBy?: string };

const norm = (v: any) => (v === null || v === undefined || v === '' ? null : typeof v === 'object' ? JSON.stringify(v) : String(v));

function parseRow(raw: any) {
  const out: any = {};
  for (const f of FIELDS) {
    let v = raw[f];
    if (v === undefined || v === '') { out[f] = null; continue; }
    if (INT.includes(f)) { const n = parseInt(String(v), 10); out[f] = isNaN(n) ? null : n; }
    else if (JSONF.includes(f)) { out[f] = typeof v === 'string' ? JSON.parse(v) : v; }
    else if (f === 'is_custom') out[f] = String(v).toLowerCase() === 'true';
    else out[f] = String(v);
  }
  const id = raw.id ? String(raw.id).trim() : '';
  out.id = UUID_RE.test(id) ? id : crypto.randomUUID();
  if (out.is_custom === null) out.is_custom = false;
  if (out.features === null) out.features = [];
  return out;
}

export function BestiaryBulkUploadDialog({ open, onClose, existing, onDone }: { open: boolean; onClose: () => void; existing: any[]; onDone: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [overwrite, setOverwrite] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    const wb = XLSX.read(await file.text(), { type: 'string', raw: true });
    const json: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false });
    const byId = new Map(existing.map(e => [e.id, e]));
    const byName = new Map(existing.map(e => [e.name.trim().toLowerCase(), e]));
    const seen = new Set<string>();
    const result: Row[] = json.map(raw => {
      let data: any;
      try { data = parseRow(raw); } catch (e: any) { return { data: { name: raw.name }, status: 'invalid', diffs: [], error: 'Bad JSON in thresholds/features' }; }
      if (!data.name || !data.tier || !data.creature_type) return { data, status: 'invalid', diffs: [], error: 'Missing name, tier or type' };
      const key = data.name.trim().toLowerCase();
      if (seen.has(key)) return { data, status: 'invalid', diffs: [], error: 'Duplicate name within file' };
      seen.add(key);
      const ex = byId.get(data.id) || byName.get(key);
      if (!ex) return { data, status: 'new', diffs: [] };
      const matchBy = byId.get(data.id) ? 'id' : 'name';
      if (matchBy === 'name') data.id = ex.id;
      const diffs = FIELDS.filter(f => norm(ex[f]) !== norm(data[f]));
      return { data, existing: ex, matchBy, status: diffs.length ? 'conflict' : 'identical', diffs };
    });
    setRows(result);
    setOverwrite(new Set());
  };

  const commit = async () => {
    setBusy(true);
    const inserts = rows.filter(r => r.status === 'new').map(r => r.data);
    const updates = rows.filter((r, i) => r.status === 'conflict' && overwrite.has(i)).map(r => r.data);
    try {
      if (inserts.length) { const { error } = await supabase.from('bestiary_creatures').insert(inserts); if (error) throw error; }
      for (const u of updates) { const { id, ...rest } = u; const { error } = await supabase.from('bestiary_creatures').update(rest).eq('id', id); if (error) throw error; }
      toast.success(`Added ${inserts.length}, updated ${updates.length}`);
      onDone(); setRows([]); onClose();
    } catch (e: any) { toast.error('Upload failed: ' + e.message); }
    setBusy(false);
  };

  const count = (s: Row['status']) => rows.filter(r => r.status === s).length;
  const color: Record<Row['status'], string> = { new: 'bg-green-500/20 text-green-300', identical: 'bg-muted text-muted-foreground', conflict: 'bg-yellow-500/20 text-yellow-300', invalid: 'bg-red-500/20 text-red-300' };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setRows([]); onClose(); } }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk upload creatures</DialogTitle>
          <DialogDescription>CSV in the bestiary export format. Missing IDs are generated. Matches by ID or name are checked for differences.</DialogDescription>
        </DialogHeader>
        <Input type="file" accept=".csv,.xlsx" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        {rows.length > 0 && (
          <>
            <div className="flex gap-2 flex-wrap text-sm">
              <Badge className={color.new}>{count('new')} new</Badge>
              <Badge className={color.identical}>{count('identical')} already present</Badge>
              <Badge className={color.conflict}>{count('conflict')} contradictions</Badge>
              <Badge className={color.invalid}>{count('invalid')} invalid</Badge>
            </div>
            <div className="space-y-1 text-sm">
              {rows.map((r, i) => (
                <div key={i} className="flex items-start gap-2 border border-border/50 rounded p-2">
                  <Badge className={`text-xs ${color[r.status]}`}>{r.status}</Badge>
                  <div className="flex-1">
                    <div className="font-medium">{r.data.name || '(no name)'}</div>
                    {r.error && <div className="text-xs text-destructive">{r.error}</div>}
                    {r.status === 'conflict' && <div className="text-xs text-muted-foreground">Matched by {r.matchBy}; differs in: {r.diffs.join(', ')}</div>}
                  </div>
                  {r.status === 'conflict' && (
                    <label className="flex items-center gap-1 text-xs">
                      <Checkbox checked={overwrite.has(i)} onCheckedChange={v => setOverwrite(p => { const n = new Set(p); v ? n.add(i) : n.delete(i); return n; })} />
                      Overwrite
                    </label>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRows([])}>Clear</Button>
              <Button onClick={commit} disabled={busy || (count('new') === 0 && overwrite.size === 0)}>
                {busy ? 'Uploading...' : `Add ${count('new')}${overwrite.size ? `, update ${overwrite.size}` : ''}`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
