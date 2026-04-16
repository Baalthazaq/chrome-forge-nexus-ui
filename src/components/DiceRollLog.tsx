import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Dice5 } from 'lucide-react';

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

    // Fetch profile names
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

  const filtered = rolls.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.character_name?.toLowerCase().includes(s) ||
           r.equation.toLowerCase().includes(s) ||
           String(r.result).includes(s);
  });

  function getDieColor(d: any): string | undefined {
    if (d.color) return d.color;
    if (d.flavor === 'hope') return '#ffd700';
    if (d.flavor === 'fear') return '#ff2a6d';
    if (d.sign < 0) return '#ff8a8a';
    return undefined;
  }

  function getDieLabel(d: any): string {
    if (d.flavor === 'hope') return 'H';
    if (d.flavor === 'fear') return 'F';
    return `d${d.sides === 100 ? '%' : d.sides}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dice5 className="h-5 w-5" />
          Dice Roll Log ({filtered.length})
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
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filtered.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-semibold shrink-0">{r.character_name}</span>
                  <code className="text-xs text-muted-foreground truncate">{r.equation || '—'}</code>
                  <div className="flex gap-1 shrink-0">
                    {r.individual_dice.map((d: any, i: number) => (
                      <span key={i} className="text-xs font-bold" style={{ color: getDieColor(d) }}>
                        {getDieLabel(d)}:{d.sign < 0 ? '-' : ''}{d.value}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-lg font-black">{r.result}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.rolled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DiceRollLog;
