
import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Clock, AlertTriangle, Search, ChevronRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
  publish_date: string | null;
  created_at: string;
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

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const NexusWire = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [search, setSearch] = useState('');
  const [searchParams] = useSearchParams();
  const articleId = searchParams.get('article');

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    const { data } = await supabase
      .from('news_articles')
      .select('*')
      .eq('is_published', true)
      .lte('publish_date', new Date().toISOString())
      .order('publish_date', { ascending: false });
    if (data) setArticles(data);
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

          <div className="flex items-center gap-3 text-gray-400 text-sm mb-6">
            <Clock className="w-4 h-4" />
            <span>{selectedArticle.publish_date ? timeAgo(selectedArticle.publish_date) : ''}</span>
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
          <div className="w-20" />
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
                        {article.publish_date ? timeAgo(article.publish_date) : ''}
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
