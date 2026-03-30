import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, BookOpen, Search, ChevronDown, ChevronRight, ChevronLeft, Eye, FileText, Users, Download } from 'lucide-react';
import { renderMarkdown } from '@/lib/markdownRenderer';

const PAGE_BREAK_MARKER = '---PAGE_BREAK---';
const WORDS_PER_PAGE = 750;

const calculatePages = (text: string) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return Math.max(1, Math.ceil(words.length / WORDS_PER_PAGE));
};

const getPageContent = (text: string, page: number) => {
  const lines = text.split('\n');
  const pages: string[] = [];
  let currentPageLines: string[] = [];
  let wordCount = 0;

  lines.forEach((line) => {
    const lineWords = line.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount + lineWords > WORDS_PER_PAGE && wordCount > 0) {
      pages.push(currentPageLines.join('\n'));
      currentPageLines = [line];
      wordCount = lineWords;
    } else {
      currentPageLines.push(line);
      wordCount += lineWords;
    }
  });
  if (currentPageLines.length > 0) pages.push(currentPageLines.join('\n'));
  return pages[page - 1] || '';
};

interface TomeEntry {
  id: string;
  title: string;
  content: string | null;
  tags: string[] | null;
  pages: number | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface Profile {
  user_id: string;
  character_name: string | null;
}

interface GroupedTome {
  title: string;
  entries: (TomeEntry & { character_name: string })[];
}

const ToMeAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading } = useAdmin();
  const [allEntries, setAllEntries] = useState<TomeEntry[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [viewingEntry, setViewingEntry] = useState<TomeEntry | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchData = async () => {
      setLoading(true);
      const [entriesRes, profilesRes] = await Promise.all([
        supabase.from('tome_entries').select('*').order('title'),
        supabase.from('profiles').select('user_id, character_name'),
      ]);
      setAllEntries((entriesRes.data as TomeEntry[]) || []);
      setProfiles((profilesRes.data as Profile[]) || []);
      setLoading(false);
    };
    fetchData();
  }, [isAdmin]);

  const profileMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles.forEach((p) => {
      map[p.user_id] = p.character_name || 'Unknown';
    });
    return map;
  }, [profiles]);

  const grouped = useMemo(() => {
    const groups: Record<string, GroupedTome> = {};
    allEntries.forEach((entry) => {
      const key = entry.title.trim().toLowerCase();
      if (!groups[key]) {
        groups[key] = { title: entry.title, entries: [] };
      }
      groups[key].entries.push({
        ...entry,
        character_name: profileMap[entry.user_id] || 'Unknown',
      });
    });
    // Sort entries within each group by character name
    Object.values(groups).forEach((g) =>
      g.entries.sort((a, b) => a.character_name.localeCompare(b.character_name))
    );
    return Object.values(groups).sort((a, b) => a.title.localeCompare(b.title));
  }, [allEntries, profileMap]);

  const filtered = useMemo(() => {
    if (!searchTerm) return grouped;
    const lower = searchTerm.toLowerCase();
    return grouped.filter(
      (g) =>
        g.title.toLowerCase().includes(lower) ||
        g.entries.some((e) => e.character_name.toLowerCase().includes(lower)) ||
        g.entries.some((e) => e.tags?.some((t) => t.toLowerCase().includes(lower)))
    );
  }, [grouped, searchTerm]);

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  // Reading view logic
  const buildFlatPages = (entry: TomeEntry) => {
    let chapters: { title: string; content: string }[];
    try {
      chapters =
        typeof entry.content === 'string'
          ? JSON.parse(entry.content)
          : [{ title: 'Chapter 1', content: entry.content || '' }];
    } catch {
      chapters = [{ title: 'Chapter 1', content: entry.content || '' }];
    }
    if (!Array.isArray(chapters))
      chapters = [{ title: 'Chapter 1', content: entry.content || '' }];

    const flatPages: { title: string; content: string; chapterIndex: number }[] = [];
    const chapterStartPages: { title: string; startPage: number }[] = [];

    chapters.forEach((chapter, chIdx) => {
      chapterStartPages.push({
        title: chapter.title || `Chapter ${chIdx + 1}`,
        startPage: flatPages.length + 1,
      });
      const segments = (chapter.content || '').split(PAGE_BREAK_MARKER);
      segments.forEach((segment) => {
        const trimmed = segment.trim();
        if (!trimmed) return;
        const subPageCount = calculatePages(trimmed);
        for (let sp = 0; sp < subPageCount; sp++) {
          flatPages.push({
            title: chapter.title,
            content: getPageContent(trimmed, sp + 1),
            chapterIndex: chIdx,
          });
        }
      });
    });
    if (flatPages.length === 0)
      flatPages.push({ title: '', content: '', chapterIndex: 0 });

    return { flatPages, chapterStartPages, chapters };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <Button onClick={() => navigate('/')} variant="outline">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Full reading view
  if (viewingEntry) {
    const { flatPages, chapterStartPages, chapters } = buildFlatPages(viewingEntry);
    const totalPages = flatPages.length;
    const currentFlatPage = flatPages[currentPage - 1];

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="border-b border-border p-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setViewingEntry(null);
                setCurrentPage(1);
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div>
              <h2 className="text-lg font-bold">{viewingEntry.title}</h2>
              <p className="text-sm text-muted-foreground">
                by {profileMap[viewingEntry.user_id] || 'Unknown'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {chapters.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">Chapter:</span>
                <select
                  value={currentFlatPage?.chapterIndex ?? 0}
                  onChange={(e) => {
                    const idx = parseInt(e.target.value);
                    const target = chapterStartPages[idx];
                    if (target) setCurrentPage(target.startPage);
                  }}
                  className="bg-muted border border-border text-foreground rounded-md px-3 py-1.5 text-sm"
                >
                  {chapterStartPages.map((ch, idx) => (
                    <option key={idx} value={idx}>
                      {ch.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto">
          {currentFlatPage && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-card border border-border rounded-lg p-8">
                {currentFlatPage.title && (
                  <h3 className="text-xl font-semibold text-primary mb-6 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    {currentFlatPage.title}
                  </h3>
                )}
                <div className="text-foreground text-lg leading-relaxed">
                  {renderMarkdown(currentFlatPage.content)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold">ToMe Admin</h1>
            <Badge variant="secondary">{allEntries.length} entries</Badge>
            <Badge variant="outline">{grouped.length} unique titles</Badge>
          </div>
          <Button onClick={() => navigate('/admin')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Admin
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, character, or tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tome list */}
        {loading ? (
          <p className="text-muted-foreground">Loading entries...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No tome entries found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((group) => {
              const isExpanded = expandedGroups.has(group.title);
              const isDuplicate = group.entries.length > 1;

              if (!isDuplicate) {
                // Single entry — show inline
                const entry = group.entries[0];
                return (
                  <Card key={group.title} className="overflow-hidden">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <BookOpen className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{group.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {entry.character_name}
                          </p>
                        </div>
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {entry.tags.slice(0, 3).map((t) => (
                              <Badge key={t} variant="outline" className="text-xs">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {entry.pages || 1} pg
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setViewingEntry(entry);
                            setCurrentPage(1);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              }

              // Duplicate title — collapsible group
              return (
                <Card key={group.title} className="overflow-hidden">
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={() => toggleGroup(group.title)}
                  >
                    <CollapsibleTrigger asChild>
                      <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
                        <div className="flex items-center gap-3 min-w-0">
                          <BookOpen className="h-4 w-4 text-primary shrink-0" />
                          <p className="font-medium truncate">{group.title}</p>
                          <Badge variant="secondary" className="shrink-0">
                            <Users className="w-3 h-3 mr-1" />
                            {group.entries.length} copies
                          </Badge>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Character</TableHead>
                              <TableHead>Tags</TableHead>
                              <TableHead className="text-right">Pages</TableHead>
                              <TableHead className="text-right">Updated</TableHead>
                              <TableHead className="text-right"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.entries.map((entry) => (
                              <TableRow key={entry.id}>
                                <TableCell className="font-medium">
                                  {entry.character_name}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1 flex-wrap">
                                    {entry.tags?.slice(0, 3).map((t) => (
                                      <Badge
                                        key={t}
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {t}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {entry.pages || 1}
                                </TableCell>
                                <TableCell className="text-right text-sm text-muted-foreground">
                                  {new Date(entry.updated_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setViewingEntry(entry);
                                      setCurrentPage(1);
                                    }}
                                  >
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ToMeAdmin;
