import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Search, BookOpen, StickyNote, Star, Clock, Edit3, Trash2, Pin, GripVertical, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Quick Note Component
const SortableQuickNote = ({ note, onDelete, onUpdate }: { note: any, onDelete: (id: string) => void, onUpdate: (note: any) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / 36e5;
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return 'Today';
    if (diffInHours < 48) return 'Yesterday';
    return Math.floor(diffInHours / 24) + ' days ago';
  };

  return (
    <Card ref={setNodeRef} style={style} className="relative overflow-hidden group cursor-move">
      <div className={`absolute inset-0 bg-gradient-to-br ${note.color} opacity-20`}></div>
      <div className="relative p-4 bg-gray-900/80 border border-gray-700/50 hover:border-gray-600 transition-all duration-300">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-2">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="w-4 h-4 text-gray-500" />
            </div>
            {note.is_pinned && <Pin className="w-4 h-4 text-yellow-400" />}
            <span className="text-xs text-gray-400">{formatDate(note.created_at)}</span>
          </div>
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-white">
              <Edit3 className="w-3 h-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
              onClick={() => onDelete(note.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <p className="text-white text-sm leading-relaxed">{note.content}</p>
      </div>
    </Card>
  );
};

const ToMe = () => {
  const { user } = useAuth();
  const { impersonatedUser } = useAdmin();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("tome");
  const [tomeEntries, setTomeEntries] = useState([]);
  const [quickNotes, setQuickNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog states
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
  
  // Form states
  const [newEntry, setNewEntry] = useState({ title: '', content: '', tags: '' });
  const [newNote, setNewNote] = useState({ content: '', color: 'from-blue-500 to-cyan-500' });
  const [expandedTome, setExpandedTome] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingTome, setEditingTome] = useState<string | null>(null);

  // Use impersonated user if available, otherwise use authenticated user
  const displayUser = impersonatedUser || user;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchData = async () => {
    if (!displayUser) return;
    
    setLoading(true);
    try {
      // Fetch tome entries
      const { data: tomeData, error: tomeError } = await supabase
        .from('tome_entries')
        .select('*')
        .eq('user_id', displayUser.user_id || displayUser.id)
        .order('created_at', { ascending: false });

      if (tomeError) throw tomeError;

      // Fetch quick notes
      const { data: notesData, error: notesError } = await supabase
        .from('quick_notes')
        .select('*')
        .eq('user_id', displayUser.user_id || displayUser.id)
        .order('sort_order', { ascending: true });

      if (notesError) throw notesError;

      setTomeEntries(tomeData || []);
      setQuickNotes(notesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [displayUser]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = quickNotes.findIndex((note) => note.id === active.id);
      const newIndex = quickNotes.findIndex((note) => note.id === over.id);

      const newQuickNotes = arrayMove(quickNotes, oldIndex, newIndex);
      setQuickNotes(newQuickNotes);

      // Update sort order in database
      try {
        const updates = newQuickNotes.map((note, index) => ({
          id: note.id,
          sort_order: index,
        }));

        for (const update of updates) {
          await supabase
            .from('quick_notes')
            .update({ sort_order: update.sort_order })
            .eq('id', update.id);
        }
      } catch (error) {
        console.error('Error updating sort order:', error);
        toast({
          title: "Error",
          description: "Failed to update note order",
          variant: "destructive",
        });
        // Revert the change
        fetchData();
      }
    }
  };

  // Calculate pages based on content length (approximately 250 words per page)
  const calculatePages = (content: string) => {
    const wordCount = content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / 250));
  };

  const getPageContent = (content: string, pageNumber: number) => {
    const words = content.trim().split(/\s+/);
    const wordsPerPage = 250;
    const startIndex = (pageNumber - 1) * wordsPerPage;
    const endIndex = startIndex + wordsPerPage;
    return words.slice(startIndex, endIndex).join(' ');
  };

  const createTomeEntry = async () => {
    if (!displayUser || !newEntry.title.trim()) return;
    
    try {
      const tagsArray = newEntry.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const pages = calculatePages(newEntry.content);
      
      const { error } = await supabase
        .from('tome_entries')
        .insert({
          user_id: displayUser.user_id || displayUser.id,
          title: newEntry.title,
          content: newEntry.content,
          tags: tagsArray,
          pages: pages,
        });

      if (error) throw error;

      setNewEntry({ title: '', content: '', tags: '' });
      setIsNewEntryOpen(false);
      fetchData();
      toast({
        title: "Success",
        description: "Tome entry created",
      });
    } catch (error) {
      console.error('Error creating tome entry:', error);
      toast({
        title: "Error",
        description: "Failed to create tome entry",
        variant: "destructive",
      });
    }
  };

  const updateTomeEntry = async () => {
    if (!editingTome || !newEntry.title.trim()) return;
    
    try {
      const tagsArray = newEntry.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const pages = calculatePages(newEntry.content);
      
      const { error } = await supabase
        .from('tome_entries')
        .update({
          title: newEntry.title,
          content: newEntry.content,
          tags: tagsArray,
          pages: pages,
        })
        .eq('id', editingTome);

      if (error) throw error;

      setNewEntry({ title: '', content: '', tags: '' });
      setEditingTome(null);
      setIsNewEntryOpen(false);
      fetchData();
      toast({
        title: "Success",
        description: "Tome entry updated",
      });
    } catch (error) {
      console.error('Error updating tome entry:', error);
      toast({
        title: "Error",
        description: "Failed to update tome entry",
        variant: "destructive",
      });
    }
  };

  const createQuickNote = async () => {
    if (!displayUser || !newNote.content.trim()) return;
    
    try {
      const { error } = await supabase
        .from('quick_notes')
        .insert({
          user_id: displayUser.user_id || displayUser.id,
          content: newNote.content,
          color: newNote.color,
          sort_order: quickNotes.length,
        });

      if (error) throw error;

      setNewNote({ content: '', color: 'from-blue-500 to-cyan-500' });
      setIsNewNoteOpen(false);
      fetchData();
      toast({
        title: "Success",
        description: "Quick note created",
      });
    } catch (error) {
      console.error('Error creating quick note:', error);
      toast({
        title: "Error",
        description: "Failed to create quick note",
        variant: "destructive",
      });
    }
  };

  const deleteQuickNote = async (noteId) => {
    try {
      const { error } = await supabase
        .from('quick_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setQuickNotes(quickNotes.filter(note => note.id !== noteId));
      toast({
        title: "Success",
        description: "Note deleted",
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    }
  };

  const deleteTomeEntry = async (entryId) => {
    try {
      const { error } = await supabase
        .from('tome_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      setTomeEntries(tomeEntries.filter(entry => entry.id !== entryId));
      toast({
        title: "Success",
        description: "Tome entry deleted",
      });
    } catch (error) {
      console.error('Error deleting tome entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete tome entry",
        variant: "destructive",
      });
    }
  };

  const filteredTomeEntries = tomeEntries.filter(entry => 
    entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredQuickNotes = quickNotes.filter(note =>
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-black to-purple-900/20"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_80%,rgba(120,119,198,0.1)_0%,transparent_50%)]"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/">
            <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to OS
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            ToMe
          </h1>
          <Dialog open={activeTab === "tome" ? isNewEntryOpen : isNewNoteOpen} onOpenChange={(open) => {
            if (activeTab === "tome") {
              setIsNewEntryOpen(open);
              if (!open) {
                setEditingTome(null);
                setNewEntry({ title: '', content: '', tags: '' });
              }
            } else {
              setIsNewNoteOpen(open);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
                <Plus className="w-4 h-4 mr-2" />
                New {activeTab === "tome" ? "Entry" : "Note"}
              </Button>
            </DialogTrigger>
            
            {activeTab === "tome" ? (
              <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    {editingTome ? "Edit Tome Entry" : "Create New Tome Entry"}
                  </DialogTitle>
                  <DialogDescription className="text-gray-400">
                    {editingTome ? "Modify your tome entry." : "Add a new entry to your tome archives."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="title" className="text-right text-gray-300">
                      Title
                    </Label>
                    <Input
                      id="title"
                      value={newEntry.title}
                      onChange={(e) => setNewEntry({...newEntry, title: e.target.value})}
                      className="col-span-3 bg-gray-800 border-gray-600 text-white"
                      placeholder="Enter tome title..."
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right text-gray-300">
                      Pages
                    </Label>
                    <div className="col-span-3 text-gray-400 text-sm py-2">
                      Auto-calculated based on content length
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="tags" className="text-right text-gray-300">
                      Tags
                    </Label>
                    <Input
                      id="tags"
                      value={newEntry.tags}
                      onChange={(e) => setNewEntry({...newEntry, tags: e.target.value})}
                      className="col-span-3 bg-gray-800 border-gray-600 text-white"
                      placeholder="tag1, tag2, tag3..."
                    />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="content" className="text-right text-gray-300 mt-2">
                      Content
                    </Label>
                    <Textarea
                      id="content"
                      value={newEntry.content}
                      onChange={(e) => setNewEntry({...newEntry, content: e.target.value})}
                      className="col-span-3 bg-gray-800 border-gray-600 text-white"
                      placeholder="Enter tome content..."
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    onClick={editingTome ? updateTomeEntry : createTomeEntry}
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                  >
                    {editingTome ? "Update Entry" : "Create Entry"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            ) : (
              <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Quick Note</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Add a new quick note with custom styling.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="note-content" className="text-right text-gray-300 mt-2">
                      Note
                    </Label>
                    <Textarea
                      id="note-content"
                      value={newNote.content}
                      onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                      className="col-span-3 bg-gray-800 border-gray-600 text-white"
                      placeholder="Enter your quick note..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="color" className="text-right text-gray-300">
                      Color
                    </Label>
                    <select
                      id="color"
                      value={newNote.color}
                      onChange={(e) => setNewNote({...newNote, color: e.target.value})}
                      className="col-span-3 bg-gray-800 border border-gray-600 text-white rounded-md p-2"
                    >
                      <option value="from-blue-500 to-cyan-500">Blue</option>
                      <option value="from-red-500 to-pink-500">Red</option>
                      <option value="from-green-500 to-emerald-500">Green</option>
                      <option value="from-purple-500 to-violet-500">Purple</option>
                      <option value="from-yellow-500 to-orange-500">Orange</option>
                      <option value="from-indigo-500 to-blue-500">Indigo</option>
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    onClick={createQuickNote}
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                  >
                    Create Note
                  </Button>
                </DialogFooter>
              </DialogContent>
            )}
          </Dialog>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-gray-900/50 p-1 rounded-lg border border-gray-700/50">
          <button
            onClick={() => setActiveTab("tome")}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-md transition-all ${
              activeTab === "tome"
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800/50"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Tome Archives</span>
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-6 rounded-md transition-all ${
              activeTab === "notes"
                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800/50"
            }`}
          >
            <StickyNote className="w-4 h-4" />
            <span>Quick Notes</span>
          </button>
        </div>

        {/* Search Bar */}
        <Card className="p-4 bg-gray-900/50 border-purple-500/30 mb-8">
          <div className="flex items-center space-x-4">
            <Search className="w-5 h-5 text-purple-400" />
            <input 
              placeholder={`Search ${activeTab === "tome" ? "tome entries" : "quick notes"}...`}
              className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Card>

        {/* Content */}
        {activeTab === "tome" ? (
          <div className="space-y-6">
            {filteredTomeEntries.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No tome entries found</p>
              </div>
            ) : (
              filteredTomeEntries.map((entry) => (
                <Card key={entry.id} className="p-6 bg-gray-900/30 border-gray-700/50 hover:border-purple-500/30 transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">{entry.title}</h3>
                        {entry.is_pinned && <Pin className="w-4 h-4 text-yellow-400" />}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(entry.created_at)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{entry.pages} pages</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-gray-400 hover:text-white"
                        onClick={() => {
                          setEditingTome(entry.id);
                          setNewEntry({
                            title: entry.title,
                            content: entry.content || '',
                            tags: entry.tags?.join(', ') || ''
                          });
                          setIsNewEntryOpen(true);
                        }}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-gray-400 hover:text-red-400"
                        onClick={() => deleteTomeEntry(entry.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-gray-300 mb-4 line-clamp-2">{entry.content}</p>

                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      {entry.tags?.map((tag: string, tagIndex: number) => (
                        <Badge key={tagIndex} variant="outline" className="border-purple-600 text-purple-400">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button 
                      variant="outline" 
                      className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
                      onClick={() => {
                        setExpandedTome(entry.id);
                        setCurrentPage(1);
                      }}
                    >
                      Open Tome
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={filteredQuickNotes.map(note => note.id)} strategy={verticalListSortingStrategy}>
              {filteredQuickNotes.length === 0 ? (
                <div className="text-center py-12 col-span-full">
                  <StickyNote className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No quick notes found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredQuickNotes.map((note) => (
                    <SortableQuickNote 
                      key={note.id} 
                      note={note} 
                      onDelete={deleteQuickNote}
                      onUpdate={() => {}}
                    />
                  ))}
                </div>
              )}
            </SortableContext>
          </DndContext>
        )}

        {/* Stats Footer */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-white">{tomeEntries.length}</div>
            <div className="text-gray-400 text-sm">Tome Entries</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-purple-400">{quickNotes.length}</div>
            <div className="text-gray-400 text-sm">Quick Notes</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-indigo-400">
              {((tomeEntries.length * 50 + quickNotes.length * 1) / 1000).toFixed(1)}MB
            </div>
            <div className="text-gray-400 text-sm">Data Stored</div>
          </Card>
          <Card className="p-4 bg-gray-900/30 border-gray-700/50 text-center">
            <div className="text-2xl font-bold text-blue-400">
              {displayUser ? "Online" : "Offline"}
            </div>
            <div className="text-gray-400 text-sm">Sync Status</div>
          </Card>
        </div>
      </div>

      {/* Expanded Tome View */}
      {expandedTome && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <Button 
              variant="ghost" 
              onClick={() => setExpandedTome(null)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5 mr-2" />
              Close
            </Button>
            
            {(() => {
              const entry = tomeEntries.find(e => e.id === expandedTome);
              const totalPages = entry?.pages || 1;
              return (
                <>
                  <h2 className="text-2xl font-bold text-white">{entry?.title}</h2>
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="ghost"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                      className="text-gray-400 hover:text-white disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      Previous
                    </Button>
                    <span className="text-gray-300">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                      className="text-gray-400 hover:text-white disabled:opacity-50"
                    >
                      Next
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
          
          <div className="flex-1 p-8 overflow-y-auto">
            {(() => {
              const entry = tomeEntries.find(e => e.id === expandedTome);
              if (!entry) return null;
              
              const pageContent = getPageContent(entry.content || '', currentPage);
              
              return (
                <div className="max-w-4xl mx-auto">
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-8">
                    <div className="text-white text-lg leading-relaxed whitespace-pre-wrap">
                      {pageContent}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ToMe;