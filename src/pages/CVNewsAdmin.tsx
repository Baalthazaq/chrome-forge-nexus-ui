
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Edit, Trash2, Newspaper, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';

const articleSchema = z.object({
  headline: z.string().trim().min(1, 'Headline is required').max(300, 'Headline too long (max 300 chars)'),
  summary: z.string().trim().max(1000, 'Summary too long (max 1000 chars)').nullable(),
  content: z.string().trim().max(50000, 'Content too long (max 50000 chars)').nullable(),
  image_url: z.string().trim().max(2000).nullable(),
  tags: z.array(z.string().max(50)).max(20),
  is_breaking: z.boolean(),
  publish_date: z.string().nullable(),
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
  publish_date: string | null;
  is_published: boolean;
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

  // Form state
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isBreaking, setIsBreaking] = useState(false);
  const [publishDate, setPublishDate] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (isAdmin) loadArticles();
  }, [isAdmin]);

  const loadArticles = async () => {
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setArticles(data);
    if (error) console.error('Error loading articles:', error);
  };

  const resetForm = () => {
    setHeadline('');
    setSummary('');
    setContent('');
    setImageUrl('');
    setTagsInput('');
    setIsBreaking(false);
    setPublishDate('');
    setIsPublished(false);
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
    setPublishDate(article.publish_date ? new Date(article.publish_date).toISOString().slice(0, 16) : '');
    setIsPublished(article.is_published);
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
      publish_date: publishDate ? new Date(publishDate).toISOString() : null,
      is_published: isPublished,
    };

    const parsed = articleSchema.safeParse(rawData);
    if (!parsed.success) {
      toast({ title: "Validation Error", description: parsed.error.errors[0]?.message || "Invalid input", variant: "destructive" });
      return;
    }
    const articleData = parsed.data as {
      headline: string;
      summary: string | null;
      content: string | null;
      image_url: string | null;
      tags: string[];
      is_breaking: boolean;
      publish_date: string | null;
      is_published: boolean;
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
                    <Label>Publish Date (real-world, hidden from players)</Label>
                    <Input type="datetime-local" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
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
                    </div>
                    {article.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{article.summary}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {(article.tags || []).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                      {article.publish_date && (
                        <span className="text-xs text-muted-foreground">
                          Publishes: {new Date(article.publish_date).toLocaleString()}
                        </span>
                      )}
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
