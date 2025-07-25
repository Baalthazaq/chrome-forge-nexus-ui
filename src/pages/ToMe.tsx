import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Search, BookOpen, StickyNote, Star, Clock, Edit3, Trash2, Pin, GripVertical } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  const [activeTab, setActiveTab] = useState("tome");
  const [tomeEntries, setTomeEntries] = useState([]);
  const [quickNotes, setQuickNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
      toast.error('Failed to load data');
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
        toast.error('Failed to update note order');
        // Revert the change
        fetchData();
      }
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
      toast.success('Note deleted');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
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
      toast.success('Tome entry deleted');
    } catch (error) {
      console.error('Error deleting tome entry:', error);
      toast.error('Failed to delete tome entry');
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
          <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
            <Plus className="w-4 h-4 mr-2" />
            New Entry
          </Button>
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
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
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
                    <Button variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white">
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
    </div>
  );
};

export default ToMe;