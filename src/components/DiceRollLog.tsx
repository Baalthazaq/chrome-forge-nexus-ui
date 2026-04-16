import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Dice5, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface RollEntry {
  id: string;
  user_id: string;
  equation: string;
  result: number;
  individual_dice: any[];
  rolled_at: string;
  character_name?: string;
}

const DiceRollLog = () => {
  const [rolls, setRolls] = useState<RollEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadRolls();
    const interval = setInterval(loadRolls, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadRolls = async () => {
    const { data } = await (supabase as any)
      .from('dice_roll_log')
      .select('*')
      .order('rolled_at', { ascending: false })
      .limit(200);

    if (!data) { setLoading(false); return; }

    const userIds = [...new Set(data.map((r: any) => r.user_id))] as string[];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, character_name')
      .in('user_id', userIds);

    const nameMap = new Map(profiles?.map(p => [p.user_id, p.character_name]) || []);

    setRolls(data.map((r: any) => ({
      ...r,
      individual_dice: r.individual_dice || [],
      character_name: nameMap.get(r.user_id) || 'Unknown',
    })));
    setLoading(false);
  };

  const clearLog = async () => {
    if (!confirm('Clear all dice roll log entries?')) return;
    setClearing(true);
    const { error } = await (supabase as any)
      .from('dice_roll_log')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setRolls([]);
      toast({ title: 'Log cleared' });
    }
    setClearing(false);
  };

  const filtered = rolls.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.character_name?.toLowerCase().includes(s) ||
           r.equation.toLowerCase().includes(s) ||
           String(r.result).includes(s);
  });

  // Detect crit pairs (matching hope+fear values) in a roll's individual_dice
  function detectCritIndices(dice: any[]): Set<number> {
    const crits = new Set<number>();
    const hopes = dice.map((d, i) => ({ ...d, idx: i })).filter(d => d.flavor === 'hope');
    const fears = dice.map((d, i) => ({ ...d, idx: i })).filter(d => d.flavor === 'fear');
    const usedFears = new Set<number>();
    for (const h of hopes) {
      for (const f of fears) {
        if (!usedFears.has(f.idx) && h.value === f.value) {
          crits.add(h.idx);
          crits.add(f.idx);
          usedFears.add(f.idx);
          break;
        }
      }
    }
    return crits;
  }

  function getDieColor(d: any, isCrit: boolean): string {
    if (isCrit) return '#ffd700';
    if (d.color) return d.color;
    if (d.flavor === 'hope') return '#ffd700';
    if (d.flavor === 'fear') return '#ff2a6d';
    if (d.sign < 0) return '#ff8a8a';
    return 'inherit';
  }

  function getDieLabel(d: any, isCrit: boolean): string {
    if (isCrit) return 'C';
    if (d.flavor === 'hope') return 'H';
    if (d.flavor === 'fear') return 'F';
    return `d${d.sides === 100 ? '%' : d.sides}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Dice5 className="h-5 w-5" />
            Dice Roll Log ({filtered.length})
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={clearLog}
            disabled={clearing || rolls.length === 0}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear Log
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by player, equation, result..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-4">Loading rolls...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No rolls found</p>
        ) : (
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {filtered.map(r => {
              const critIndices = detectCritIndices(r.individual_dice);
              const hasCrit = critIndices.size > 0;
              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between p-3 border rounded-lg text-sm ${hasCrit ? 'border-yellow-500/50 bg-yellow-500/5' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-semibold shrink-0">{r.character_name}</span>
                    <code className="text-xs text-muted-foreground truncate">{r.equation || '—'}</code>
                    <div className="flex gap-1 shrink-0 flex-wrap">
                      {r.individual_dice.map((d: any, i: number) => {
                        const isCrit = critIndices.has(i);
                        return (
                          <span
                            key={i}
                            className={`text-xs font-bold ${isCrit ? 'underline' : ''}`}
                            style={{ color: getDieColor(d, isCrit) }}
                          >
                            {getDieLabel(d, isCrit)}:{d.sign < 0 ? '-' : ''}{d.value}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-lg font-black ${hasCrit ? 'text-yellow-400' : ''}`}>{r.result}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.rolled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DiceRollLog;
