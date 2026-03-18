import { useState } from 'react';
import { MapArea, MapAreaReview, useMazeData } from '@/hooks/useMazeData';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { EnvironmentCardDisplay } from './EnvironmentCard';
import { MapNotes } from './MapNotes';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Star, Send, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AreaPanelProps {
  area: MapArea;
  onClose: () => void;
  isAdmin?: boolean;
}

export const AreaPanel = ({ area, onClose, isAdmin: isAdminProp = false }: AreaPanelProps) => {
  const { user } = useAuth();
  const { createReview, deleteReview } = useMazeData();
  const [rating, setRating] = useState(3);
  const [reviewContent, setReviewContent] = useState('');

  const reviewsQuery = useQuery({
    queryKey: ['map-area-reviews', area.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('map_area_reviews')
        .select('*')
        .eq('area_id', area.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, character_name, avatar_url')
        .in('user_id', userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return (data || []).map((r: any) => ({
        ...r,
        profile: profileMap.get(r.user_id) || null,
      })) as MapAreaReview[];
    },
  });

  const handleSubmitReview = async () => {
    if (!user) return;
    try {
      await createReview.mutateAsync({
        area_id: area.id,
        user_id: user.id,
        rating,
        content: reviewContent.trim() || '',
      });
      setReviewContent('');
      setRating(3);
      toast.success('Review posted');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const reviews = reviewsQuery.data || [];

  return (
    <div className="bg-gray-900/95 border border-gray-700/50 rounded-lg overflow-y-auto max-h-[80vh] w-full md:w-96 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-teal-400">{area.name}</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {area.description && (
        <p className="text-sm text-gray-300">{area.description}</p>
      )}

      {area.image_url && (
        <img src={area.image_url} alt={area.name} className="w-full rounded-md" />
      )}

      {/* Environment Card */}
      <EnvironmentCardDisplay card={area.environment_card} areaName={area.name} isAdmin={false} />

      <MapNotes
        areaId={area.id}
        targetName={area.name}
        isAdmin={isAdminProp}
        locationDescription={area.description}
        locationImageUrl={area.image_url}
        environmentCards={area.environment_card?.tier || area.environment_card?.type || area.environment_card?.features?.length
          ? [{ areaName: area.name, card: area.environment_card }]
          : []}
        reviews={reviews}
      />

      {/* Reviews */}
      <div className="space-y-3 border-t border-gray-700/50 pt-3">
        <h3 className="text-sm font-bold text-gray-300 font-mono">Reviews</h3>
        
        {/* Write review */}
        {user && (
          <div className="space-y-2 bg-gray-800/50 rounded p-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRating(s)}>
                  <Star className={`w-4 h-4 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`} />
                </button>
              ))}
            </div>
            <Textarea
              value={reviewContent}
              onChange={e => setReviewContent(e.target.value)}
              placeholder="Write a review..."
              className="bg-gray-900/50 border-gray-700/50 text-gray-300 text-sm min-h-[60px]"
            />
            <Button size="sm" onClick={handleSubmitReview} disabled={createReview.isPending} className="bg-teal-600 hover:bg-teal-700">
              <Send className="w-3 h-3 mr-1" /> Post
            </Button>
          </div>
        )}

        {/* Review list */}
        {reviews.map(review => (
          <div key={review.id} className="bg-gray-800/30 rounded p-3 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-200">
                  {review.profile?.character_name || 'Unknown'}
                </span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`} />
                  ))}
                </div>
              </div>
              {user?.id === review.user_id && (
                <button onClick={() => deleteReview.mutate({ id: review.id, area_id: area.id })}>
                  <Trash2 className="w-3 h-3 text-gray-500 hover:text-red-400" />
                </button>
              )}
            </div>
            {review.content && <p className="text-xs text-gray-400">{review.content}</p>}
          </div>
        ))}
        {reviews.length === 0 && <p className="text-xs text-gray-500 font-mono">No reviews yet.</p>}
      </div>
    </div>
  );
};
