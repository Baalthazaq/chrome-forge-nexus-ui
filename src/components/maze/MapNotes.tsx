import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, BookOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MapNotesProps {
  locationId?: string;
  areaId?: string;
  targetName: string;
}

export const MapNotes = ({ locationId, areaId, targetName }: MapNotesProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [hasEdited, setHasEdited] = useState(false);

  const noteKey = locationId ? ['map-note', 'location', locationId] : ['map-note', 'area', areaId];

  const noteQuery = useQuery({
    queryKey: noteKey,
    enabled: !!user,
    queryFn: async () => {
      let query = supabase.from('map_notes').select('*').eq('user_id', user!.id);
      if (locationId) query = query.eq('location_id', locationId);
      if (areaId) query = query.eq('area_id', areaId);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as { id: string; content: string } | null;
    },
  });

  useEffect(() => {
    if (noteQuery.data) {
      setContent(noteQuery.data.content);
      setHasEdited(false);
    }
  }, [noteQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (noteQuery.data) {
        const { error } = await supabase
          .from('map_notes')
          .update({ content })
          .eq('id', noteQuery.data.id);
        if (error) throw error;
      } else {
        const insertData: any = { user_id: user.id, content };
        if (locationId) insertData.location_id = locationId;
        if (areaId) insertData.area_id = areaId;
        const { error } = await supabase.from('map_notes').insert(insertData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKey });
      setHasEdited(false);
      toast.success('Notes saved');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const exportToTome = useMutation({
    mutationFn: async () => {
      if (!user || !content.trim()) return;
      const { error } = await supabase.from('tome_entries').insert({
        user_id: user.id,
        title: `Notes: ${targetName}`,
        content: content.trim(),
        tags: ['maze', locationId ? 'location' : 'area'],
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success('Exported to ToMe'),
    onError: (err: any) => toast.error(err.message),
  });

  if (!user) return null;

  return (
    <div className="space-y-2 border-t border-gray-700/50 pt-3">
      <h3 className="text-sm font-bold text-gray-300 font-mono">Personal Notes</h3>
      <Textarea
        value={content}
        onChange={e => { setContent(e.target.value); setHasEdited(true); }}
        placeholder="Write your private notes here..."
        className="bg-gray-900/50 border-gray-700/50 text-gray-300 text-sm min-h-[60px]"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={!hasEdited || saveMutation.isPending}
          className="bg-teal-600 hover:bg-teal-700"
        >
          {saveMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => exportToTome.mutate()}
          disabled={!content.trim() || exportToTome.isPending}
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          {exportToTome.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <BookOpen className="w-3 h-3 mr-1" />}
          Export to ToMe
        </Button>
      </div>
    </div>
  );
};
