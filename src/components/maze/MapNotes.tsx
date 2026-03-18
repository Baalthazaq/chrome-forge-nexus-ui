import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, BookOpen, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { EnvironmentCard } from '@/hooks/useMazeData';

interface ReviewData {
  rating: number;
  content: string | null;
  profile?: { character_name: string | null } | null;
}

interface MapNotesProps {
  locationId?: string;
  areaId?: string;
  targetName: string;
  isAdmin?: boolean;
  locationDescription?: string | null;
  locationImageUrl?: string | null;
  containingAreas?: string[];
  environmentCards?: { areaName: string; card: EnvironmentCard }[];
  reviews?: ReviewData[];
}

interface NoteWithProfile {
  id: string;
  content: string;
  user_id: string;
  character_name?: string | null;
}

export const MapNotes = ({ locationId, areaId, targetName, isAdmin = false, locationDescription, locationImageUrl, containingAreas = [], environmentCards = [], reviews = [] }: MapNotesProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [hasEdited, setHasEdited] = useState(false);

  const noteKey = locationId ? ['map-note', 'location', locationId] : ['map-note', 'area', areaId];

  // Player's own note
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

  // All notes (admin only)
  const allNotesKey = locationId ? ['map-notes-all', 'location', locationId] : ['map-notes-all', 'area', areaId];
  const allNotesQuery = useQuery({
    queryKey: allNotesKey,
    enabled: !!user && isAdmin,
    queryFn: async () => {
      let query = supabase.from('map_notes').select('*');
      if (locationId) query = query.eq('location_id', locationId);
      if (areaId) query = query.eq('area_id', areaId);
      const { data, error } = await query;
      if (error) throw error;
      const notes = data || [];
      if (notes.length === 0) return [] as NoteWithProfile[];
      const userIds = [...new Set(notes.map((n: any) => n.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, character_name')
        .in('user_id', userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.character_name]));
      return notes.map((n: any) => ({
        id: n.id,
        content: n.content,
        user_id: n.user_id,
        character_name: profileMap.get(n.user_id) || 'Unknown',
      })) as NoteWithProfile[];
    },
  });

  useEffect(() => {
    setContent(noteQuery.data?.content ?? '');
    setHasEdited(false);
  }, [noteQuery.data, locationId, areaId]);

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
      if (isAdmin) queryClient.invalidateQueries({ queryKey: allNotesKey });
      setHasEdited(false);
      toast.success('Notes saved');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const exportToTome = useMutation({
    mutationFn: async () => {
      if (!user || !targetName) return;

      const chapters: { title: string; content: string }[] = [];

      // Chapter 1: Overview
      const overviewParts: string[] = [];
      overviewParts.push(`# ${targetName}`);
      if (locationDescription) overviewParts.push(`\n${locationDescription}`);
      if (locationImageUrl) overviewParts.push(`\nImage: ${locationImageUrl}`);
      if (containingAreas.length > 0) {
        overviewParts.push(`\n**Areas:** ${containingAreas.join(' → ')}`);
      }
      chapters.push({ title: 'Overview', content: overviewParts.join('\n') });

      // Chapter 2: Environment (if any cards)
      if (environmentCards.length > 0) {
        const envParts: string[] = [];
        environmentCards.forEach(({ areaName, card }) => {
          envParts.push(`### ${areaName}`);
          if (card.tier || card.type) envParts.push(`Tier ${card.tier || '?'} ${card.type || ''}`);
          if (card.difficulty) envParts.push(`**Difficulty:** ${card.difficulty}`);
          if (card.impulses?.length) envParts.push(`**Impulses:** ${card.impulses.join(', ')}`);
          if (card.potential_adversaries) envParts.push(`**Potential Adversaries:** ${card.potential_adversaries}`);
          if (card.features?.length) {
            envParts.push(`**Features:**`);
            card.features.forEach(f => envParts.push(`- **${f.name}** (${f.type}): ${f.description}`));
          }
          envParts.push('');
        });
        chapters.push({ title: 'Environment', content: envParts.join('\n') });
      }

      // Chapter 3: Reviews (if any)
      if (reviews.length > 0) {
        const reviewParts: string[] = [];
        reviewParts.push(`### Reviews (${reviews.length})`);
        reviews.forEach(r => {
          const name = r.profile?.character_name || 'Unknown';
          const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
          reviewParts.push(`- **${name}** ${stars}${r.content ? `: ${r.content}` : ''}`);
        });
        chapters.push({ title: 'Reviews', content: reviewParts.join('\n') });
      }

      // Chapter 4: Personal Notes (if any)
      if (content.trim()) {
        chapters.push({ title: 'Personal Notes', content: content.trim() });
      }

      const allContent = chapters.map(c => c.content).join('\n\n');
      const wordCount = allContent.trim().split(/\s+/).length;
      const pages = Math.max(1, Math.ceil(wordCount / 750));
      const tags = ['maze', locationId ? 'location' : 'area'];

      const { error } = await supabase.from('tome_entries').insert({
        user_id: user.id,
        title: targetName,
        content: JSON.stringify(chapters),
        tags,
        pages,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success('Exported to ToMe'),
    onError: (err: any) => toast.error(err.message),
  });

  if (!user) return null;

  const allNotes = allNotesQuery.data || [];
  const otherNotes = allNotes.filter(n => n.user_id !== user.id);

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
          disabled={exportToTome.isPending}
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          {exportToTome.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <BookOpen className="w-3 h-3 mr-1" />}
          Export to ToMe
        </Button>
      </div>

      {/* Admin: show all players' notes */}
      {isAdmin && otherNotes.length > 0 && (
        <div className="space-y-2 border-t border-gray-700/50 pt-3 mt-2">
          <h3 className="text-sm font-bold text-gray-300 font-mono flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Player Notes ({otherNotes.length})
          </h3>
          {otherNotes.map(note => (
            <div key={note.id} className="bg-gray-800/30 rounded p-3 space-y-1">
              <span className="text-xs font-medium text-teal-400">{note.character_name}</span>
              <p className="text-xs text-gray-400 whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
