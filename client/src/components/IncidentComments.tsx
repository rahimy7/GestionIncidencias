// client/src/components/IncidentComments.tsx

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, 
  Send, 
  User, 
  Edit3, 
  Trash2, 
  Save,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface IncidentCommentsProps {
  incidentId: string;
  currentUser?: {
    id: string;
    role: string;
  };
  className?: string;
}

export function IncidentComments({ incidentId, currentUser, className }: IncidentCommentsProps) {
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para obtener comentarios
  const { data: comments = [], isLoading, error } = useQuery({
    queryKey: ['incident-comments', incidentId],
    queryFn: async () => {
      const response = await apiRequest(`/api/incidents/${incidentId}/comments`);
      if (!response.ok) {
        throw new Error('Error al cargar comentarios');
      }
      return response.json();
    },
    retry: 2,
  });

  // Mutation para crear comentario
  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest(`/api/incidents/${incidentId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: content }),
      });
      if (!response.ok) {
        throw new Error('Error al crear comentario');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-comments', incidentId] });
      setNewComment('');
      toast({
        title: "Comentario agregado",
        description: "Tu comentario ha sido agregado correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar el comentario",
        variant: "destructive",
      });
    },
  });

  // Mutation para actualizar comentario
  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const response = await apiRequest(`/api/incidents/${incidentId}/comments/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ text: content }),
      });
      if (!response.ok) {
        throw new Error('Error al actualizar comentario');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-comments', incidentId] });
      setEditingCommentId(null);
      setEditContent('');
      toast({
        title: "Comentario actualizado",
        description: "El comentario ha sido actualizado correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el comentario",
        variant: "destructive",
      });
    },
  });

  // Mutation para eliminar comentario
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await apiRequest(`/api/incidents/${incidentId}/comments/${commentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Error al eliminar comentario');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-comments', incidentId] });
      toast({
        title: "Comentario eliminado",
        description: "El comentario ha sido eliminado correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el comentario",
        variant: "destructive",
      });
    },
  });

  // Funciones auxiliares
  const handleAddComment = () => {
    const content = newComment.trim();
    if (content) {
      createCommentMutation.mutate(content);
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = () => {
    const content = editContent.trim();
    if (editingCommentId && content) {
      updateCommentMutation.mutate({
        commentId: editingCommentId,
        content,
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditContent('');
  };

  const handleDeleteComment = (commentId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este comentario?')) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  const canEditComment = (comment: Comment) => {
    return currentUser && (
      currentUser.id === comment.author.id || 
      currentUser.role === 'admin'
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'hace un momento';
    if (diffMins < 60) return `hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    return formatDate(dateString);
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Error al cargar comentarios</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['incident-comments', incidentId] })}
            >
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Comentarios</h3>
          <Badge variant="secondary" className="ml-auto">
            {comments.length} comentario{comments.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Formulario para nuevo comentario */}
        <div className="space-y-4 mb-6 p-4 bg-muted/50 rounded-lg border-2 border-dashed">
          <Textarea
            placeholder="Escribe un comentario sobre esta incidencia..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-20 resize-none"
            disabled={createCommentMutation.isPending}
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              {newComment.length}/1000 caracteres
            </p>
            <Button 
              onClick={handleAddComment}
              disabled={!newComment.trim() || createCommentMutation.isPending || newComment.length > 1000}
              size="sm"
              className="flex items-center gap-2"
            >
              {createCommentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {createCommentMutation.isPending ? 'Enviando...' : 'Comentar'}
            </Button>
          </div>
        </div>

        {/* Lista de comentarios */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando comentarios...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-muted-foreground mb-2">
                No hay comentarios aún
              </h4>
              <p className="text-sm text-muted-foreground">
                Sé el primero en comentar sobre esta incidencia
              </p>
            </div>
          ) : (
            comments.map((comment: Comment) => (
              <div 
                key={comment.id} 
                className="border rounded-lg p-4 space-y-3 bg-background hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">
                          {comment.author.firstName} {comment.author.lastName}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                        {comment.updatedAt !== comment.createdAt && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            editado
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {comment.author.email}
                      </p>
                    </div>
                  </div>
                  
                  {canEditComment(comment) && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditComment(comment)}
                        className="h-8 w-8 p-0"
                        disabled={editingCommentId === comment.id}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={deleteCommentMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Contenido del comentario */}
                {editingCommentId === comment.id ? (
                  <div className="space-y-3 ml-13">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-20 resize-none"
                      disabled={updateCommentMutation.isPending}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={updateCommentMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={!editContent.trim() || updateCommentMutation.isPending || editContent.length > 1000}
                      >
                        {updateCommentMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        {updateCommentMutation.isPending ? 'Guardando...' : 'Guardar'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="ml-13">
                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {comment.content}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}