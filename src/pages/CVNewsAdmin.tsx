
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Edit, Trash2, Newspaper, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { MONTHS, getMonth } from '@/lib/gameCalendar';

const articleSchema = z.object({
  headline: z.string().trim().min(1, 'Headline is required').max(300, 'Headline too long (max 300 chars)'),
  summary: z.string().trim().max(1000, 'Summary too long (max 1000 chars)').nullable(),
  content: z.string().trim().max(50000, 'Content too long (max 50000 chars)').nullable(),
  image_url: z.string().trim().max(2000).nullable(),
  tags: z.array(z.string().max(50)).max(20),
  is_breaking: z.boolean(),
  is_published: z.boolean(),
});

interface NewsArticle {
  id: string;
  headline: string;
  summary: string | null;
  content: string | null;
  image_url: string | null;
  tags: string[];
  is_breaking: boolean;
  publish_day: number | null;
  publish_month: number | null;
  publish_year: number | null;
  publish_date: string | null;
  is_published: boolean;
  user_id: string | null;
  created_at: string;
}

const CVNewsAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading } = useAdmin();
  const { toast } = useToast();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [gameDate, setGameDate] = useState<{ day: number; month: number; year: number } | null>(null);

  // Form state
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isBreaking, setIsBreaking] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [pubDay, setPubDay] = useState('');
  const [pubMonth, setPubMonth] = useState('');
  const [pubYear, setPubYear] = useState('');

  useEffect(() => {
    if (isAdmin) {
      loadArticles();
      supabase.from('game_calendar').select('*').limit(1).single().then(({ data }) => {
        if (data) setGameDate({ day: data.current_day, month: data.current_month, year: data.current_year });
      });
    }
  }, [isAdmin]);

  const loadArticles = async () => {
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setArticles(data as unknown as NewsArticle[]);
    if (error) console.error('Error loading articles:', error);
  };

  const resetForm = () => {
    setHeadline('');
    setSummary('');
    setContent('');
    setImageUrl('');
    setTagsInput('');
    setIsBreaking(false);
    setIsPublished(false);
    setPubDay('');
    setPubMonth('');
    setPubYear('');
    setEditingArticle(null);
  };

  const openEditDialog = (article: NewsArticle) => {
    setEditingArticle(article);
    setHeadline(article.headline);
    setSummary(article.summary || '');
    setContent(article.content || '');
    setImageUrl(article.image_url || '');
    setTagsInput((article.tags || []).join(', '));
    setIsBreaking(article.is_breaking);
    setIsPublished(article.is_published);
    setPubDay(article.publish_day?.toString() || '');
    setPubMonth(article.publish_month?.toString() || '');
    setPubYear(article.publish_year?.toString() || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!headline.trim()) {
      toast({ title: "Error", description: "Headline is required", variant: "destructive" });
      return;
    }

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const rawData = {
      headline: headline.trim(),
      summary: summary.trim() || null,
      content: content.trim() || null,
      image_url: imageUrl.trim() || null,
      tags,
      is_breaking: isBreaking,
      is_published: isPublished,
    };

    const parsed = articleSchema.safeParse(rawData);
    if (!parsed.success) {
      toast({ title: "Validation Error", description: parsed.error.errors[0]?.message || "Invalid input", variant: "destructive" });
      return;
    }

    const articleData: any = {
      ...parsed.data,
      publish_day: pubDay ? parseInt(pubDay) : null,
      publish_month: pubMonth ? parseInt(pubMonth) : null,
      publish_year: pubYear ? parseInt(pubYear) : null,
    };

    // If marking as breaking, unmark all others first
    if (isBreaking) {
      await supabase
        .from('news_articles')
        .update({ is_breaking: false })
        .neq('id', editingArticle?.id || '');
    }

    let error;
    if (editingArticle) {
      ({ error } = await supabase
        .from('news_articles')
        .update(articleData)
        .eq('id', editingArticle.id));
    } else {
      ({ error } = await supabase
        .from('news_articles')
        .insert(articleData));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingArticle ? "Article Updated" : "Article Created" });
      setDialogOpen(false);
      resetForm();
      loadArticles();
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm('Delete this article?')) return;
    const { error } = await supabase.from('news_articles').delete().eq('id', id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Article Deleted" });
      loadArticles();
    }
  };

  const togglePublished = async (article: NewsArticle) => {
    const { error } = await supabase
      .from('news_articles')
      .update({ is_published: !article.is_published })
      .eq('id', article.id);
    if (!error) loadArticles();
  };

  const formatPubDate = (a: NewsArticle) => {
    if (!a.publish_day || !a.publish_month || !a.publish_year) return 'No date set';
    const m = getMonth(a.publish_month);
    if (a.publish_month === 8) return `Frippery, ${a.publish_year}`;
    return `${a.publish_day} ${m?.name || '?'}, ${a.publish_year}`;
  };

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><p>Loading...</p></div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Newspaper className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">CVNews Admin</h1>
          </div>
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />New Article</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingArticle ? 'Edit Article' : 'New Article'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Headline *</Label>
                    <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Article headline..." />
                  </div>
                  <div>
                    <Label>Summary (shown on front page)</Label>
                    <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Brief summary..." rows={2} />
                  </div>
                  <div>
                    <Label>Full Article Content</Label>
                    <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Full article body..." rows={8} />
                  </div>
                  <div>
                    <Label>Image URL (optional)</Label>
                    <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
                    {imageUrl && (
                      <img src={imageUrl} alt="Preview" className="mt-2 max-h-32 rounded-md object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    )}
                  </div>
                  <div>
                    <Label>Tags (comma-separated)</Label>
                    <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Politics, Crime, Economy..." />
                  </div>
                  <div>
                    <Label>Publish Date (In-Game Calendar)</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        value={pubDay}
                        onChange={(e) => setPubDay(e.target.value)}
                        placeholder="Day"
                        className="w-20"
                        min={1}
                        max={28}
                      />
                      <Select value={pubMonth} onValueChange={setPubMonth}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover text-popover-foreground z-50">
                          {MONTHS.map(m => (
                            <SelectItem key={m.number} value={m.number.toString()}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={pubYear}
                        onChange={(e) => setPubYear(e.target.value)}
                        placeholder="Year"
                        className="w-24"
                      />
                    </div>
                    {gameDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Current game date: {gameDate.day} {getMonth(gameDate.month)?.name}, {gameDate.year}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                      <Label>Published</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={isBreaking} onCheckedChange={setIsBreaking} />
                      <Label className="text-red-400">Breaking News</Label>
                    </div>
                  </div>
                  <Button onClick={handleSave} className="w-full">
                    {editingArticle ? 'Update Article' : 'Create Article'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />Admin
            </Button>
          </div>
        </div>

        {/* Articles List */}
        <div className="space-y-4">
          {articles.map((article) => (
            <Card key={article.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold truncate">{article.headline}</h3>
                      {article.is_breaking && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />BREAKING
                        </Badge>
                      )}
                      {article.is_published ? (
                        <Badge variant="secondary" className="text-xs">Published</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Draft</Badge>
                      )}
                      {article.user_id && (
                        <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-400">Player</Badge>
                      )}
                    </div>
                    {article.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{article.summary}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {(article.tags || []).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                      <span className="text-xs text-muted-foreground">
                        {formatPubDate(article)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => togglePublished(article)} title={article.is_published ? "Unpublish" : "Publish"}>
                      {article.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEditDialog(article)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteArticle(article.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {articles.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No articles yet. Create your first one!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CVNewsAdmin;
