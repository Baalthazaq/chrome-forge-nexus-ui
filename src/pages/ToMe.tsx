import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Search, BookOpen, StickyNote, Star, Clock, Edit3, Trash2, Pin, GripVertical, ChevronLeft, ChevronRight, X, FileText, List, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragOverEvent,
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
import { useDroppable } from '@dnd-kit/core';
import { TomeShareDialog } from '@/components/TomeShareDialog';
import { TomeShareNotifications } from '@/components/TomeShareNotifications';

// Drop Zone Component for empty columns
const ColumnDropZone = ({ columnIndex }: { columnIndex: number }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${columnIndex}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[100px] rounded-lg border-2 border-dashed transition-colors ${
        isOver 
          ? 'border-purple-400 bg-purple-400/10' 
          : 'border-gray-600 hover:border-gray-500'
      }`}
    />
  );
};

// Insertion Indicator Component
const InsertionIndicator = ({ position }: { position: 'above' | 'below' }) => (
  <div className={`h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-[0_0_12px_rgba(139,92,246,0.8)] ${position === 'above' ? 'mb-3' : 'mt-3'}`} />
);

// Sortable Quick Note Component
const SortableQuickNote = ({ note, onDelete, onEdit, showIndicator, indicatorPosition }: { 
  note: any, 
  onDelete: (id: string) => void, 
  onEdit: (note: any) => void,
  showIndicator?: boolean,
  indicatorPosition?: 'above' | 'below'
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  const style = {
    // Completely disable all transforms during any drag operation
    opacity: isDragging ? 0 : 1,
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only prevent default for mouse events, not touch
    if (e.type === 'mousedown') e.preventDefault();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / 36e5;
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (diffInHours < 48) return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return Math.floor(diffInHours / 24) + ' days ago';
  };

  return (
    <div>
      {showIndicator && indicatorPosition === 'above' && <InsertionIndicator position="above" />}
      <Card ref={setNodeRef} style={style} className="relative overflow-hidden group h-fit">
        {/* Color bar at top */}
        <div className={`h-1 bg-gradient-to-r ${note.color}`}></div>
      
      <div className="relative p-4 bg-gray-900/80 border border-gray-700/50 hover:border-gray-600 transition-all duration-300">
        {/* Grippable top bar */}
          {/* Touch-visible drag handle with touch-action:none to enable touch drag */}
          <div 
            {...attributes} 
            {...listeners} 
            onMouseDown={handleMouseDown}
            className="absolute top-0 left-0 right-0 h-10 cursor-grab active:cursor-grabbing z-10 flex items-center justify-center touch-none"
          >
            <GripVertical className="w-4 h-4 text-gray-500" />
          </div>
        
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-2">
            {note.is_pinned && <Pin className="w-4 h-4 text-yellow-400" />}
            <span className="text-xs text-gray-400">{formatDate(note.created_at)}</span>
          </div>
          <div className="flex space-x-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(note);
              }}
            >
              <Edit3 className="w-3 h-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(note.id);
              }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <p className="text-white text-sm leading-relaxed mb-3">{note.content}</p>
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {note.tags.map((tag: string, index: number) => (
              <Badge key={index} variant="outline" className="border-purple-600 text-purple-400 text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
    {showIndicator && indicatorPosition === 'below' && <InsertionIndicator position="below" />}
    </div>
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
  const [newEntry, setNewEntry] = useState({ title: '', content: '', tags: '', chapters: [{ title: 'Chapter 1', content: '' }] });
  const [newNote, setNewNote] = useState({ content: '', color: 'from-blue-500 to-cyan-500', tags: '' });
  const [expandedTome, setExpandedTome] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [editingTome, setEditingTome] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Use impersonated user if available, otherwise use authenticated user
  const displayUser = impersonatedUser || user;

  // Responsive column count - matches the CSS grid breakpoints
  const [columnCount, setColumnCount] = useState(() => {
    if (typeof window === 'undefined') return 1;
    if (window.innerWidth >= 1024) return 3;
    if (window.innerWidth >= 768) return 2;
    return 1;
  });

  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth >= 1024) setColumnCount(3);
      else if (window.innerWidth >= 768) setColumnCount(2);
      else setColumnCount(1);
    };
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
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

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id.toString() || null);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const activeNote = quickNotes.find(note => note.id === active.id);
    if (!activeNote) return;

    const oldColumn = activeNote.layout_column ?? 0;
    const oldPosition = activeNote.layout_position ?? 0;
    
    let newColumn: number;
    let newPosition: number;

    // Check if dropping on a column drop zone
    if (over.id.toString().startsWith('column-')) {
      newColumn = parseInt(over.id.toString().replace('column-', ''));
      // Get the count of notes in target column to place at bottom
      newPosition = quickNotes.filter(note => (note.layout_column ?? 0) === newColumn).length;
    } else {
      // Dropping on another note
      const overNote = quickNotes.find(note => note.id === over.id);
      if (!overNote) return;
      
      newColumn = overNote.layout_column ?? 0;
      newPosition = overNote.layout_position ?? 0;
    }

    // Update local state immediately for instant feedback
    const updatedNotes = [...quickNotes];
    const updates = [];

    if (oldColumn === newColumn) {
      // Same column: shift positions between old and new
      if (oldPosition < newPosition) {
        // Moving down: shift up everything between old+1 and new
        updatedNotes.forEach(note => {
          if ((note.layout_column ?? 0) === oldColumn && 
              (note.layout_position ?? 0) > oldPosition && 
              (note.layout_position ?? 0) <= newPosition) {
            note.layout_position = (note.layout_position ?? 0) - 1;
            updates.push({ id: note.id, layout_position: note.layout_position });
          }
        });
      } else {
        // Moving up: shift down everything between new and old-1
        updatedNotes.forEach(note => {
          if ((note.layout_column ?? 0) === oldColumn && 
              (note.layout_position ?? 0) >= newPosition && 
              (note.layout_position ?? 0) < oldPosition) {
            note.layout_position = (note.layout_position ?? 0) + 1;
            updates.push({ id: note.id, layout_position: note.layout_position });
          }
        });
      }
    } else {
      // Different columns
      // Remove from old column: shift up everything below old position
      updatedNotes.forEach(note => {
        if ((note.layout_column ?? 0) === oldColumn && 
            (note.layout_position ?? 0) > oldPosition) {
          note.layout_position = (note.layout_position ?? 0) - 1;
          updates.push({ id: note.id, layout_position: note.layout_position });
        }
      });

      // Add to new column: shift down everything at/below new position
      updatedNotes.forEach(note => {
        if ((note.layout_column ?? 0) === newColumn && 
            (note.layout_position ?? 0) >= newPosition && 
            note.id !== active.id) {
          note.layout_position = (note.layout_position ?? 0) + 1;
          updates.push({ id: note.id, layout_position: note.layout_position });
        }
      });
    }

    // Update the active note
    const activeNoteInArray = updatedNotes.find(note => note.id === active.id);
    if (activeNoteInArray) {
      activeNoteInArray.layout_column = newColumn;
      activeNoteInArray.layout_position = newPosition;
      updates.push({
        id: active.id,
        layout_column: newColumn,
        layout_position: newPosition
      });
    }

    // Update local state immediately
    setQuickNotes(updatedNotes);

    // Save to database in background
    try {
      for (const update of updates) {
        await supabase
          .from('quick_notes')
          .update({ 
            layout_column: update.layout_column, 
            layout_position: update.layout_position 
          })
          .eq('id', update.id);
      }
    } catch (error) {
      console.error('Error updating note positions:', error);
      toast({
        title: "Error",
        description: "Failed to update note order",
        variant: "destructive",
      });
      // Revert on error
      fetchData();
    }

    setActiveId(null);
    setOverId(null);
  };

  // Calculate pages based on content length (approximately 750 words per page)
  const calculatePages = (content: string) => {
    const wordCount = content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / 750));
  };

  const getPageContent = (content: string, pageNumber: number) => {
    const words = content.trim().split(/\s+/);
    const wordsPerPage = 750;
    const startIndex = (pageNumber - 1) * wordsPerPage;
    const endIndex = startIndex + wordsPerPage;
    return words.slice(startIndex, endIndex).join(' ');
  };

  const getChapterContent = (chapters: any[], chapterIndex: number) => {
    if (!chapters || !chapters[chapterIndex]) return '';
    return chapters[chapterIndex].content || '';
  };

  const addChapter = () => {
    const newChapters = [...newEntry.chapters, { title: `Chapter ${newEntry.chapters.length + 1}`, content: '' }];
    setNewEntry({ ...newEntry, chapters: newChapters });
    setCurrentChapter(newChapters.length - 1);
  };

  const removeChapter = (chapterIndex: number) => {
    if (newEntry.chapters.length <= 1) return; // Don't allow removing the last chapter
    const newChapters = newEntry.chapters.filter((_, index) => index !== chapterIndex);
    setNewEntry({ ...newEntry, chapters: newChapters });
    if (currentChapter >= newChapters.length) {
      setCurrentChapter(newChapters.length - 1);
    }
  };

  const updateChapter = (chapterIndex: number, field: string, value: string) => {
    const newChapters = [...newEntry.chapters];
    newChapters[chapterIndex] = { ...newChapters[chapterIndex], [field]: value };
    setNewEntry({ ...newEntry, chapters: newChapters });
  };

  const createTomeEntry = async () => {
    if (!displayUser || !newEntry.title.trim()) return;
    
    try {
      const tagsArray = newEntry.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const allContent = newEntry.chapters.map(chapter => chapter.content).join('\n\n');
      const pages = calculatePages(allContent);
      
      const { error } = await supabase
        .from('tome_entries')
        .insert({
          user_id: displayUser.user_id || displayUser.id,
          title: newEntry.title,
          content: JSON.stringify(newEntry.chapters), // Store chapters as JSON
          tags: tagsArray,
          pages: pages,
        });

      if (error) throw error;

      setNewEntry({ title: '', content: '', tags: '', chapters: [{ title: 'Chapter 1', content: '' }] });
      setCurrentChapter(0);
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
      const allContent = newEntry.chapters.map(chapter => chapter.content).join('\n\n');
      const pages = calculatePages(allContent);
      
      const { error } = await supabase
        .from('tome_entries')
        .update({
          title: newEntry.title,
          content: JSON.stringify(newEntry.chapters), // Store chapters as JSON
          tags: tagsArray,
          pages: pages,
        })
        .eq('id', editingTome);

      if (error) throw error;

      setNewEntry({ title: '', content: '', tags: '', chapters: [{ title: 'Chapter 1', content: '' }] });
      setCurrentChapter(0);
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
      // Find the shortest column (with leftmost preference in case of ties)
      const columnCounts = [0, 1, 2].map(colIndex => 
        quickNotes.filter(note => (note.layout_column ?? 0) === colIndex).length
      );
      const minCount = Math.min(...columnCounts);
      const targetColumn = columnCounts.findIndex(count => count === minCount);
      const targetPosition = columnCounts[targetColumn];

      const { error } = await supabase
        .from('quick_notes')
        .insert({
          user_id: displayUser.user_id || displayUser.id,
          content: newNote.content,
          color: newNote.color,
          tags: newNote.tags ? newNote.tags.split(',').map(tag => tag.trim()) : null,
          layout_column: targetColumn,
          layout_position: targetPosition,
          sort_order: quickNotes.length, // Keep for backwards compatibility
        });

      if (error) throw error;

      setNewNote({ content: '', color: 'from-blue-500 to-cyan-500', tags: '' });
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

  const updateQuickNote = async () => {
    if (!editingNote || !newNote.content.trim()) return;
    
    try {
        const { error } = await supabase
        .from('quick_notes')
        .update({
          content: newNote.content,
          color: newNote.color,
          tags: newNote.tags ? newNote.tags.split(',').map(tag => tag.trim()) : null,
        })
        .eq('id', editingNote);

      if (error) throw error;

      setNewNote({ content: '', color: 'from-blue-500 to-cyan-500', tags: '' });
      setEditingNote(null);
      setIsNewNoteOpen(false);
      fetchData();
      toast({
        title: "Success",
        description: "Quick note updated",
      });
    } catch (error) {
      console.error('Error updating quick note:', error);
      toast({
        title: "Error",
        description: "Failed to update quick note",
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

  const filteredTomeEntries = tomeEntries.filter(entry => {
    const contentToSearch = typeof entry.content === 'string' 
      ? entry.content 
      : JSON.stringify(entry.content);
    
    return entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contentToSearch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const filteredQuickNotes = quickNotes.filter(note =>
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (note.tags && note.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase())))
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
              setCurrentChapter(0);
              setNewEntry({ title: '', content: '', tags: '', chapters: [{ title: 'Chapter 1', content: '' }] });
            }
            } else {
              setIsNewNoteOpen(open);
              if (!open) {
                setEditingNote(null);
                setNewNote({ content: '', color: 'from-blue-500 to-cyan-500', tags: '' });
              }
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
                <Plus className="w-4 h-4 mr-2" />
                New {activeTab === "tome" ? "Entry" : "Note"}
              </Button>
            </DialogTrigger>
            
            {activeTab === "tome" ? (
              <DialogContent className="max-w-6xl w-[90vw] h-[90vh] bg-gray-900 border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    {editingTome ? "Edit Tome Entry" : "Create New Tome Entry"}
                  </DialogTitle>
                  <DialogDescription className="text-gray-400">
                    {editingTome ? "Modify your tome entry." : "Add a new entry to your tome archives."}
                  </DialogDescription>
                </DialogHeader>
                <div className="flex-1 grid grid-cols-3 gap-6 py-4 overflow-hidden">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title" className="text-gray-300 mb-2 block">
                        Title
                      </Label>
                      <Input
                        id="title"
                        value={newEntry.title}
                        onChange={(e) => setNewEntry({...newEntry, title: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="Enter tome title..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="tags" className="text-gray-300 mb-2 block">
                        Tags
                      </Label>
                      <Input
                        id="tags"
                        value={newEntry.tags}
                        onChange={(e) => setNewEntry({...newEntry, tags: e.target.value})}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="tag1, tag2, tag3..."
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-gray-300">Chapters</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addChapter}
                          className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Chapter
                        </Button>
                      </div>
                      <Select value={currentChapter.toString()} onValueChange={(value) => setCurrentChapter(parseInt(value))}>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue placeholder="Select chapter" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          {newEntry.chapters.map((chapter, index) => (
                            <SelectItem key={index} value={index.toString()} className="text-white hover:bg-gray-700">
                              {chapter.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="chapter-title" className="text-gray-300 mb-2 block">
                        Chapter Title
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="chapter-title"
                          value={newEntry.chapters[currentChapter]?.title || ''}
                          onChange={(e) => updateChapter(currentChapter, 'title', e.target.value)}
                          className="bg-gray-800 border-gray-600 text-white flex-1"
                          placeholder="Enter chapter title..."
                        />
                        {newEntry.chapters.length > 1 && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-gray-900 border-gray-700">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-400">
                                  This action cannot be undone. This will permanently delete the chapter "{newEntry.chapters[currentChapter]?.title}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => removeChapter(currentChapter)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Chapter
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="chapter-content" className="text-gray-300 mb-2 block">
                      Chapter Content
                    </Label>
                    <Textarea
                      id="chapter-content"
                      value={newEntry.chapters[currentChapter]?.content || ''}
                      onChange={(e) => updateChapter(currentChapter, 'content', e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white h-[calc(100vh-240px)] resize-none"
                      placeholder="Enter chapter content..."
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
                  <DialogTitle className="text-white">
                    {editingNote ? "Edit Quick Note" : "Create New Quick Note"}
                  </DialogTitle>
                  <DialogDescription className="text-gray-400">
                    {editingNote ? "Modify your quick note." : "Add a new quick note with custom styling."}
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
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="note-tags" className="text-right text-gray-300 mt-2">
                      Tags
                    </Label>
                    <Input
                      id="note-tags"
                      value={newNote.tags}
                      onChange={(e) => setNewNote({...newNote, tags: e.target.value})}
                      className="col-span-3 bg-gray-800 border-gray-600 text-white"
                      placeholder="Enter tags separated by commas..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    onClick={editingNote ? updateQuickNote : createQuickNote}
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                  >
                    {editingNote ? "Update Note" : "Create Note"}
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

        {/* Shared ToMe Notifications */}
        <TomeShareNotifications onTomeAdded={fetchData} />

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
                          <span>
                            {entry.pages} pages
                            {(() => {
                              try {
                                if (typeof entry.content === 'string') {
                                  const parsed = JSON.parse(entry.content);
                                  if (Array.isArray(parsed)) {
                                    return ` • ${parsed.length} chapters`;
                                  }
                                }
                                return ' • 1 chapter';
                              } catch {
                                return ' • 1 chapter';
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <TomeShareDialog tomeEntry={entry}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-gray-400 hover:text-purple-400"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </TomeShareDialog>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-gray-400 hover:text-white"
                        onClick={() => {
                          setEditingTome(entry.id);
                          let chapters;
                          try {
                            chapters = typeof entry.content === 'string' 
                              ? JSON.parse(entry.content)
                              : [{ title: 'Chapter 1', content: entry.content || '' }];
                          } catch {
                            chapters = [{ title: 'Chapter 1', content: entry.content || '' }];
                          }
                          setNewEntry({
                            title: entry.title,
                            content: entry.content || '',
                            tags: entry.tags?.join(', ') || '',
                            chapters: chapters
                          });
                          setCurrentChapter(0);
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

                  <p className="text-gray-300 mb-4 line-clamp-2">
                    {(() => {
                      try {
                        if (typeof entry.content === 'string') {
                          // Try to parse as JSON first to check if it's chapter format
                          const parsed = JSON.parse(entry.content);
                          if (Array.isArray(parsed) && parsed[0]) {
                            const chapterTitle = parsed[0].title ? `Chapter: ${parsed[0].title} | ` : '';
                            return chapterTitle + (parsed[0].content || 'No content');
                          }
                          return entry.content;
                        }
                        return entry.content || 'No content';
                      } catch {
                        // If parsing fails, it's regular string content
                        return entry.content || 'No content';
                      }
                    })()}
                  </p>

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
                        setCurrentChapter(0);
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
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={filteredQuickNotes.map(note => note.id)} strategy={verticalListSortingStrategy}>
              {filteredQuickNotes.length === 0 ? (
                <div className="text-center py-12 col-span-full">
                  <StickyNote className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No quick notes found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                  {Array.from({ length: columnCount }, (_, colIndex) => {
                    const columnNotes = filteredQuickNotes
                      .filter((note, index) => {
                        const noteColumn = note.layout_column != null ? note.layout_column : index % columnCount;
                        return (noteColumn % columnCount) === colIndex;
                      })
                      .sort((a, b) => (a.layout_position || 0) - (b.layout_position || 0));

                    return (
                      <div key={colIndex} className="space-y-4 min-h-[200px]">
                        {columnNotes.length === 0 ? (
                          <ColumnDropZone columnIndex={colIndex} />
                        ) : (
                          columnNotes.map((note) => {
                            const isOverThis = overId === note.id;
                            const showIndicator = activeId && isOverThis && activeId !== note.id;
                            
                            return (
                              <SortableQuickNote 
                                key={note.id} 
                                note={note} 
                                onDelete={deleteQuickNote}
                                onEdit={(note) => {
                                  setEditingNote(note.id);
                                   setNewNote({
                                     content: note.content,
                                     color: note.color,
                                     tags: note.tags?.join(', ') || ''
                                   });
                                   setIsNewNoteOpen(true);
                                }}
                                showIndicator={showIndicator}
                                indicatorPosition="above"
                              />
                            );
                          })
                        )}
                        {columnNotes.length > 0 && (
                          <div className="h-16">
                            <ColumnDropZone columnIndex={colIndex} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </SortableContext>
            <DragOverlay>
              {activeId ? (
                <SortableQuickNote 
                  note={filteredQuickNotes.find(note => note.id === activeId)!} 
                  onDelete={() => {}} 
                  onEdit={() => {}}
                />
              ) : null}
            </DragOverlay>
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
              let chapters;
              try {
                chapters = typeof entry?.content === 'string' 
                  ? JSON.parse(entry.content)
                  : [{ title: 'Chapter 1', content: entry?.content || '' }];
              } catch {
                chapters = [{ title: 'Chapter 1', content: entry?.content || '' }];
              }
              
              const currentChapterContent = chapters[currentChapter]?.content || '';
              const totalPages = calculatePages(currentChapterContent);
              
              return (
                <>
                  <div className="flex items-center space-x-4">
                    <h2 className="text-2xl font-bold text-white">{entry?.title}</h2>
                    {chapters.length > 1 && (
                      <Select value={currentChapter.toString()} onValueChange={(value) => {
                        setCurrentChapter(parseInt(value));
                        setCurrentPage(1);
                      }}>
                        <SelectTrigger className="w-[200px] bg-gray-800 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          {chapters.map((chapter, index) => (
                            <SelectItem key={index} value={index.toString()} className="text-white hover:bg-gray-700">
                              <div className="flex items-center space-x-2">
                                <List className="w-4 h-4" />
                                <span>{chapter.title}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
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
              
              let chapters;
              try {
                chapters = typeof entry.content === 'string' 
                  ? JSON.parse(entry.content)
                  : [{ title: 'Chapter 1', content: entry.content || '' }];
              } catch {
                chapters = [{ title: 'Chapter 1', content: entry.content || '' }];
              }
              
              const currentChapterContent = chapters[currentChapter]?.content || '';
              const pageContent = getPageContent(currentChapterContent, currentPage);
              
              return (
                <div className="max-w-4xl mx-auto">
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-8">
                    {chapters.length > 1 && (
                      <h3 className="text-xl font-semibold text-purple-400 mb-6 flex items-center">
                        <FileText className="w-5 h-5 mr-2" />
                        {chapters[currentChapter]?.title}
                      </h3>
                    )}
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