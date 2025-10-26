'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  X,
  Send,
  MessageSquare,
  User,
  Calendar,
  Filter,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReviewNote {
  id: string;
  note: string;
  createdAt: string;
  createdBy: string;
  actorType?: string;
  actorId?: string;
  documentId?: string;
  createdByUser?: {
    id: string;
    name: string;
    email: string;
  };
}

interface ReviewNotesProps {
  policyId: string;
  notes: ReviewNote[];
  selectedActorType?: string;
  selectedActorId?: string;
  selectedDocumentId?: string;
  onClose: () => void;
  onNoteAdded: () => void;
}

export default function ReviewNotes({
  policyId,
  notes,
  selectedActorType,
  selectedActorId,
  selectedDocumentId,
  onClose,
  onNoteAdded
}: ReviewNotesProps) {
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'actor' | 'policy'>('all');

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/policies/${policyId}/review/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: newNote,
          actorType: selectedActorType,
          actorId: selectedActorId,
          documentId: selectedDocumentId
        })
      });

      if (response.ok) {
        setNewNote('');
        onNoteAdded();
      } else {
        const error = await response.json();
        alert(`Error al agregar nota: ${error.message}`);
      }
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Error al agregar la nota');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta nota?')) return;

    try {
      const response = await fetch(
        `/api/policies/${policyId}/review/notes?noteId=${noteId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        onNoteAdded(); // Refresh notes
      } else {
        const error = await response.json();
        alert(`Error al eliminar nota: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Error al eliminar la nota');
    }
  };

  const getFilteredNotes = () => {
    switch (filter) {
      case 'actor':
        return notes.filter(n =>
          n.actorType === selectedActorType && n.actorId === selectedActorId
        );
      case 'policy':
        return notes.filter(n => !n.actorType && !n.documentId);
      default:
        return notes;
    }
  };

  const getNoteContext = (note: ReviewNote) => {
    if (note.documentId) {
      return <Badge variant="outline" className="text-xs">Documento</Badge>;
    }
    if (note.actorType) {
      const actorLabels = {
        landlord: 'Arrendador',
        tenant: 'Inquilino',
        jointObligor: 'Obligado S.',
        aval: 'Aval'
      };
      return (
        <Badge variant="outline" className="text-xs">
          {actorLabels[note.actorType as keyof typeof actorLabels] || note.actorType}
        </Badge>
      );
    }
    return <Badge variant="outline" className="text-xs">Póliza</Badge>;
  };

  const filteredNotes = getFilteredNotes();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Notas de Revisión
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-3">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Todas ({notes.length})
          </Button>
          {selectedActorId && (
            <Button
              variant={filter === 'actor' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('actor')}
            >
              Actor Actual ({notes.filter(n => n.actorId === selectedActorId).length})
            </Button>
          )}
          <Button
            variant={filter === 'policy' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('policy')}
          >
            Póliza ({notes.filter(n => !n.actorType && !n.documentId).length})
          </Button>
        </div>
      </div>

      {/* Notes list */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => (
              <Card key={note.id} className="relative">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium">
                        {note.createdByUser?.name || 'Usuario'}
                      </span>
                      {getNoteContext(note)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleDeleteNote(note.id)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {note.note}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(note.createdAt), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No hay notas para mostrar</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add note section */}
      <div className="p-4 border-t">
        <div className="space-y-2">
          <Textarea
            placeholder={
              selectedActorId
                ? "Agregar nota sobre este actor..."
                : "Agregar nota sobre la póliza..."
            }
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <Button
            className="w-full"
            onClick={handleAddNote}
            disabled={!newNote.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Agregar Nota
          </Button>
        </div>
      </div>
    </div>
  );
}