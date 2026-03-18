
import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Clock, AlertTriangle, Search, ChevronRight, Plus } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { MONTHS, getMonth } from "@/lib/gameCalendar";

const ORGS = [
  "Biogen","Void Systems","Neuro-Corp","Arcane Inc.","Titan Heavy Industries","Apex Dynamics",
  "Bargain Bin","Brittlewisp Industries","BHoldR","Sending","Wyrmcart","Succubus",
  "Bloodstone Insurance","Hex-Gear Foundries","Zenith Systems","Chimera-Tech",
  "Mammoth Heavy Works","Keymaster Inc.","Beast-B-Good","Aero-Clad Dynamics",
  "Ink-Flow Studios","Heavy Handlers","Bit-Fix","Mercury Logistics","Elixir Express",
  "Dreamscape","Data-Pirates","Slum-Lordz Inc.","Lingua-Soft","Wipe-It","Crystal-Eye",
  "Spectral Services","Silence Co.","REM-Tech","Scribe-Bot","Cyber-Lube","Recall Inc.",
  "Clear-View","Void-Storage","Iron-Clad","Instant-Pro","Tenement Corp.","Ward-It",
  "Ley-Line Power","Cloud-Burst","Blink-Box","Click-Farm","Auto-Law","Panzer-Taxi",
  "Sky-Hook","Lazarus Group","Haggle-Bot","Djinn-Climate","Phylactery Inc.",
  "Spire Estates","Orbital-Lux"
];

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
  user_id: string | null;
  created_at: string;
}

interface GameDate {
  day: number;
  month: number;
  year: number;
}

const MarketTicker = () => {
  const tickerData = useMemo(() => {
    return ORGS.map(org => ({
      name: org,
      change: (Math.random() * 12 - 4).toFixed(1),
    }));
  }, []);

  return (
    <div className="overflow-hidden relative">
      <div className="flex animate-[scroll_60s_linear_infinite] whitespace-nowrap gap-6">
        {[...tickerData, ...tickerData].map((item, i) => {
          const isPositive = parseFloat(item.change) >= 0;
          return (
            <span key={i} className={`text-sm font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {item.name} {isPositive ? '+' : ''}{item.change}%
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** Compare game dates: is a <= b? */
function gameDateLte(a: { day: number; month: number; year: number }, b: GameDate): boolean {
  if (a.year !== b.year) return a.year < b.year;
  if (a.month !== b.month) return a.month < b.month;
  return a.day <= b.day;
}

function formatGameDateShort(day: number | null, month: number | null, year: number | null): string {
  if (!day || !month || !year) return '';
  const m = getMonth(month);
  if (!m) return '';
  if (month === 8) return `Frippery, ${year}`;
  return `${day} ${m.name}, ${year}`;
}

const NexusWire = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allArticles, setAllArticles] = useState<NewsArticle[]>([]);
  const [gameDate, setGameDate] = useState<GameDate | null>(null);
  const [search, setSearch] = useState('');
  const [searchParams] = useSearchParams();
  const articleId = searchParams.get('article');

  // Submit article dialog
  const [submitOpen, setSubmitOpen] = useState(false);
  const [newHeadline, setNewHeadline] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTagsInput, setNewTagsInput] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [articlesRes, calRes] = await Promise.all([
      supabase.from('news_articles').select('*').eq('is_published', true).order('created_at', { ascending: false }),
      supabase.from('game_calendar').select('*').limit(1).single(),
    ]);
    if (articlesRes.data) setAllArticles(articlesRes.data as unknown as NewsArticle[]);
    if (calRes.data) setGameDate({ day: calRes.data.current_day, month: calRes.data.current_month, year: calRes.data.current_year });
  };

  // Filter articles: only show those whose game publish date <= current game date
  const articles = useMemo(() => {
    if (!gameDate) return [];
    return allArticles.filter(a => {
      // If no game date set on article, show it (legacy or player-submitted)
      if (!a.publish_day || !a.publish_month || !a.publish_year) return true;
      return gameDateLte({ day: a.publish_day, month: a.publish_month, year: a.publish_year }, gameDate);
    });
  }, [allArticles, gameDate]);

  const handleSubmitArticle = async () => {
    if (!newHeadline.trim() || !user) return;
    const tags = newTagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const { error } = await supabase.from('news_articles').insert({
      headline: newHeadline.trim(),
      summary: newSummary.trim() || null,
      content: newContent.trim() || null,
      tags,
      is_published: true,
      is_breaking: false,
      user_id: user.id,
      publish_day: gameDate?.day || null,
      publish_month: gameDate?.month || null,
      publish_year: gameDate?.year || null,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Article Published' });
      setSubmitOpen(false);
      setNewHeadline('');
      setNewSummary('');
      setNewContent('');
      setNewTagsInput('');
      loadData();
    }
  };

  const breakingArticle = articles.find(a => a.is_breaking);
  const filteredArticles = useMemo(() => {
    if (!search.trim()) return articles;
    const q = search.toLowerCase();
    return articles.filter(a =>
      a.headline.toLowerCase().includes(q) ||
      a.summary?.toLowerCase().includes(q) ||
      (a.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }, [articles, search]);

  // Article detail view
  const selectedArticle = articleId ? articles.find(a => a.id === articleId) : null;
  if (selectedArticle) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-cyan-900/20" />
        <div className="relative z-10 container mx-auto px-4 py-8 max-w-3xl">
          <Link to="/nexuswire">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300 mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />Back to Headlines
            </Button>
          </Link>

          {selectedArticle.is_breaking && (
            <Badge variant="destructive" className="mb-4">
              <AlertTriangle className="w-3 h-3 mr-1" />BREAKING
            </Badge>
          )}

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{selectedArticle.headline}</h1>

          <div className="flex items-center gap-3 text-gray-400 text-sm mb-6 flex-wrap">
            <Clock className="w-4 h-4" />
            <span>{formatGameDateShort(selectedArticle.publish_day, selectedArticle.publish_month, selectedArticle.publish_year)}</span>
            {(selectedArticle.tags || []).map(tag => (
              <Badge key={tag} variant="outline" className="border-blue-500/50 text-blue-400 text-xs">{tag}</Badge>
            ))}
          </div>

          {selectedArticle.image_url && (
            <img
              src={selectedArticle.image_url}
              alt={selectedArticle.headline}
              className="w-full rounded-lg mb-6 max-h-96 object-cover"
            />
          )}

          {selectedArticle.summary && (
            <p className="text-lg text-gray-300 mb-6 italic border-l-2 border-cyan-500 pl-4">
              {selectedArticle.summary}
            </p>
          )}

          <div className="text-gray-200 leading-relaxed whitespace-pre-wrap">
            {selectedArticle.content || selectedArticle.summary || 'No content available.'}
          </div>
        </div>
      </div>
    );
  }

  // Headlines view
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-cyan-900/20" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            CVNews
          </h1>
          <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-blue-500/50 text-blue-400 hover:bg-blue-900/30">
                <Plus className="w-4 h-4 mr-1" />Submit Story
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Submit a News Story</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Headline *</Label>
                  <Input value={newHeadline} onChange={e => setNewHeadline(e.target.value)} placeholder="Your headline..." className="bg-gray-900/50 border-gray-700 text-white" />
                </div>
                <div>
                  <Label>Summary</Label>
                  <Textarea value={newSummary} onChange={e => setNewSummary(e.target.value)} placeholder="Brief summary..." rows={2} className="bg-gray-900/50 border-gray-700 text-white" />
                </div>
                <div>
                  <Label>Full Article</Label>
                  <Textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Full story..." rows={6} className="bg-gray-900/50 border-gray-700 text-white" />
                </div>
                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input value={newTagsInput} onChange={e => setNewTagsInput(e.target.value)} placeholder="Crime, Economy..." className="bg-gray-900/50 border-gray-700 text-white" />
                </div>
                {gameDate && (
                  <p className="text-xs text-gray-400">
                    Publishing on: {formatGameDateShort(gameDate.day, gameDate.month, gameDate.year)}
                  </p>
                )}
                <Button onClick={handleSubmitArticle} className="w-full" disabled={!newHeadline.trim()}>
                  Publish Story
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Breaking News Banner */}
        {breakingArticle && (
          <Link to={`/nexuswire?article=${breakingArticle.id}`}>
            <Card className="p-4 bg-red-900/30 border-red-500/50 mb-8 cursor-pointer hover:bg-red-900/40 transition-colors">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-red-400 font-bold text-sm">BREAKING</div>
                  <div className="text-white truncate">{breakingArticle.headline}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-red-400 shrink-0" />
              </div>
            </Card>
          </Link>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search headlines, tags..."
            className="pl-10 bg-gray-900/50 border-gray-700/50 text-white placeholder:text-gray-500"
          />
        </div>

        {/* News Feed */}
        <div className="space-y-6">
          {filteredArticles.map((article) => (
            <Link key={article.id} to={`/nexuswire?article=${article.id}`}>
              <Card className="p-4 md:p-6 bg-gray-900/30 border-gray-700/50 hover:border-blue-500/30 transition-all duration-300 cursor-pointer mb-2">
                <div className="flex gap-4">
                  {article.image_url && (
                    <img
                      src={article.image_url}
                      alt=""
                      className="w-20 h-20 md:w-28 md:h-20 rounded-md object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {(article.tags || []).slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                      <span className="text-gray-400 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatGameDateShort(article.publish_day, article.publish_month, article.publish_year)}
                      </span>
                      {article.is_breaking && (
                        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1 hover:text-blue-400 transition-colors line-clamp-2">
                      {article.headline}
                    </h3>
                    {article.summary && (
                      <p className="text-gray-400 text-sm line-clamp-2">{article.summary}</p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600 shrink-0 self-center" />
                </div>
              </Card>
            </Link>
          ))}
          {articles.length === 0 && (
            <p className="text-center text-gray-500 py-12">No news available at this time.</p>
          )}
          {articles.length > 0 && filteredArticles.length === 0 && (
            <p className="text-center text-gray-500 py-8">No articles match your search.</p>
          )}
        </div>

        {/* Market Data Ticker */}
        <Card className="p-4 bg-gray-900/30 border-gray-700/50 mt-8">
          <div className="text-gray-400 text-xs mb-2 text-center">MARKET DATA</div>
          <MarketTicker />
        </Card>
      </div>

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default NexusWire;
