import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download, Database, Loader2 } from 'lucide-react';

const TABLE_NAMES = [
  'profiles', 'character_sheets', 'contacts', 'contact_tags',
  'quests', 'quest_acceptances', 'purchases', 'bills',
  'recurring_payments', 'transactions', 'stones', 'casts',
  'stone_participants', 'quick_notes', 'calendar_events',
  'calendar_event_shares', 'downtime_activities', 'downtime_balances',
  'downtime_config', 'game_calendar', 'game_cards', 'news_articles',
  'organizations', 'beholdr_channels', 'beholdr_videos',
  'beholdr_comments', 'beholdr_ratings', 'map_areas', 'map_locations',
  'map_notes', 'map_location_reviews', 'map_area_reviews',
  'map_route_nodes', 'map_route_edges', 'admin_sessions',
  'user_roles', 'reputation_tags', 'shop_items', 'succubus_profiles',
  'suggestions', 'tome_entries', 'tome_shares', 'user_activity',
  'user_augmentations', 'wishlist_items',
] as const;

type TableName = typeof TABLE_NAMES[number];

const jsonToCsv = (data: Record<string, unknown>[]): string => {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const escape = (val: unknown) => {
    const s = val === null || val === undefined ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...data.map(row => headers.map(h => escape(row[h])).join(','))].join('\n');
};

const downloadCsv = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const DataExport = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdmin();
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin || isLoading) return;
    const fetchCounts = async () => {
      const results: Record<string, number | null> = {};
      await Promise.all(
        TABLE_NAMES.map(async (t) => {
          const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
          results[t] = count;
        })
      );
      setCounts(results);
    };
    fetchCounts();
  }, [isAdmin, isLoading]);

  const handleExport = async (table: TableName) => {
    setExporting(table);
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw error;
      if (!data?.length) {
        alert(`Table "${table}" is empty.`);
        return;
      }
      downloadCsv(jsonToCsv(data), `${table}.csv`);
    } catch (e: any) {
      console.error(`Export error for ${table}:`, e);
      alert(`Failed to export ${table}: ${e.message}`);
    } finally {
      setExporting(null);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive text-lg font-semibold">Access Denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Data Export
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Tables ({TABLE_NAMES.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {TABLE_NAMES.map((table) => (
                <div key={table} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">{table}</span>
                    <span className="text-xs text-muted-foreground">
                      {counts[table] !== undefined ? `${counts[table] ?? 0} rows` : '...'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={exporting === table}
                    onClick={() => handleExport(table)}
                  >
                    {exporting === table ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Download className="h-4 w-4 mr-1" />
                    )}
                    Export CSV
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DataExport;
