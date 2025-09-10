// client/src/components/ActionPlanDetail.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Button,
} from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Paperclip,
  Download,
  Image,
  Video,
  Plus,
  User,
  AlertTriangle,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiRequest } from '@/lib/queryClient';

interface ActionPlanDetailProps {
  actionPlanId: string;
  isOpen: boolean;
  onClose: () => void;
  userRole: 'responsible' | 'participant';
}

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigneeId: string;
  assigneeName: string;
  evidence: EvidenceFile[];
  completedAt?: string;
  completedBy?: string;
}

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  attachments: EvidenceFile[];
}

interface EvidenceFile {
  id: string;
  filename: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

interface ActionPlanDetails {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
  createdAt: string;
  responsible: {
    id: string;
    name: string;
    email: string;
  };
  participants: {
    id: string;
    name: string;
    email: string;
    role: string;
  }[];
  tasks: Task[];
  comments: Comment[];
  incident: {
    id: string;
    title: string;
    center: string;
  };
  progress: number;
}

export function ActionPlanDetail({ actionPlanId, isOpen, onClose, userRole }: ActionPlanDetailProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const queryClient = useQueryClient();

  // Cargar detalles del plan de acción
  const { data: actionPlan, isLoading } = useQuery<ActionPlanDetails>({
    queryKey: [`/api/action-plans/${actionPlanId}`],
    queryFn: async () => {
      const response = await apiRequest(`/api/action-plans/${actionPlanId}`, {
        method: 'GET',
      });
      if (!response.ok) throw new Error('Error fetching action plan');
      return response.json();
    },
    enabled: isOpen && !!actionPlanId,
  });


  // Mutation para agregar tarea
  const addTaskMutation = useMutation({
    mutationFn: async (taskData: {
      title: string;
      description: string;
      dueDate: string;
      assigneeId: string;
    }) => {
      const response = await apiRequest(`/api/action-plans/${actionPlanId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(taskData),
      });
      if (!response.ok) throw new Error('Error adding task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/action-plans/${actionPlanId}`] });
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskDueDate('');
      setShowNewTaskForm(false);
    },
  });

  // Mutation para completar tarea
// En ActionPlanDetail.tsx
const completeTaskMutation = useMutation({
  mutationFn: async ({ taskId }: { taskId: string }) => {
    const response = await apiRequest(`/api/action-plans/${actionPlanId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    if (!response.ok) throw new Error('Error completing task');
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: [`/api/action-plans/${actionPlanId}`] });
  },
});

const handleCompleteTask = (taskId: string) => {
  completeTaskMutation.mutate({ taskId });
};

  // Mutation para agregar comentario
// En ActionPlanDetail.tsx - Cambiar la mutación de comentario

const addCommentMutation = useMutation({
  mutationFn: async ({ content }: { content: string }) => {
    // CAMBIO: Usar JSON en lugar de FormData
    const response = await apiRequest(`/api/action-plans/${actionPlanId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) throw new Error('Error adding comment');
    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: [`/api/action-plans/${actionPlanId}`] });
    setNewComment('');
    setSelectedFiles([]); // Limpiar archivos seleccionados
  },
});

// Y actualizar el handler:
const handleAddComment = () => {
  if (!newComment.trim()) return;
  
  addCommentMutation.mutate({
    content: newComment,
    // Remover attachments por ahora
  });
};

  // Mutation para completar plan de acción
  const completePlanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/action-plans/${actionPlanId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      });
      if (!response.ok) throw new Error('Error completing action plan');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/action-plans/${actionPlanId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/action-plans/assigned'] });
    },
  });

  const handleAddTask = () => {
    if (!newTaskTitle.trim() || !newTaskDueDate) return;
    
    addTaskMutation.mutate({
      title: newTaskTitle,
      description: newTaskDescription,
      dueDate: newTaskDueDate,
      assigneeId: actionPlan?.responsible.id || '',
    });
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completada';
      case 'in_progress': return 'En Progreso';
      case 'pending': return 'Pendiente';
      default: return status;
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status !== 'completed' && new Date(dueDate) < new Date();
  };

  const canCompleteTask = (task: Task) => {
    return userRole === 'responsible' || task.assigneeId === 'current_user_id'; // Aquí usar el ID real del usuario
  };

  const canAddTasks = userRole === 'responsible';
  const canCompletePlan = userRole === 'responsible' && actionPlan?.tasks.every(task => task.status === 'completed');

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!actionPlan) return null;

// Función para obtener icono según tipo de archivo
const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    return <Image className="h-4 w-4" />;
  }
  if (['mp4', 'avi', 'mov', 'mkv'].includes(ext)) {
    return <Video className="h-4 w-4" />;
  }
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
    return <FileText className="h-4 w-4" />;
  }
  return <Paperclip className="h-4 w-4" />;
};

return (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{actionPlan.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Incidencia: {actionPlan.incident.title} - {actionPlan.incident.center}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(actionPlan.status)}>
              {getStatusText(actionPlan.status)}
            </Badge>
            {canCompletePlan && (
              <Button
                onClick={() => completePlanMutation.mutate()}
                disabled={completePlanMutation.isPending}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Completar Plan
              </Button>
            )}
          </div>
        </DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel izquierdo - Información y tareas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información del plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalles del Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Descripción:</h4>
                <p className="text-sm text-muted-foreground">{actionPlan.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Fecha límite:</h4>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className={`text-sm ${isOverdue(actionPlan.dueDate, actionPlan.status) ? 'text-red-600 font-medium' : ''}`}>
                      {format(new Date(actionPlan.dueDate), 'PPP', { locale: es })}
                    </span>
                    {isOverdue(actionPlan.dueDate, actionPlan.status) && (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-1">Progreso:</h4>
                  <div className="flex items-center gap-2">
                    <Progress value={actionPlan.progress} className="flex-1" />
                    <span className="text-sm font-medium">{actionPlan.progress}%</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Responsable:</h4>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {actionPlan.responsible.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{actionPlan.responsible.name}</p>
                    <p className="text-xs text-muted-foreground">{actionPlan.responsible.email}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tareas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Tareas ({actionPlan.tasks.filter(t => t.status === 'completed').length}/{actionPlan.tasks.length})
                </CardTitle>
                {canAddTasks && (
                  <Button
                    onClick={() => setShowNewTaskForm(true)}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Tarea
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Formulario para nueva tarea */}
              {showNewTaskForm && (
                <Card className="border-dashed">
                  <CardContent className="p-4 space-y-3">
                    <Input
                      placeholder="Título de la tarea"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                    />
                    <Textarea
                      placeholder="Descripción (opcional)"
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      <Button
                        onClick={handleAddTask}
                        disabled={!newTaskTitle.trim() || !newTaskDueDate}
                        size="sm"
                      >
                        Agregar
                      </Button>
                      <Button
                        onClick={() => setShowNewTaskForm(false)}
                        variant="outline"
                        size="sm"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lista de tareas */}
              {actionPlan.tasks.map((task) => (
                <Card key={task.id} className={`${task.status === 'completed' ? 'bg-green-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </h4>
                          <Badge className={getStatusColor(task.status)}>
                            {getStatusText(task.status)}
                          </Badge>
                          {isOverdue(task.dueDate, task.status) && (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(task.dueDate), 'PPP', { locale: es })}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.assigneeName}
                          </div>
                        </div>

                        {/* Evidencia de la tarea */}
                        {task.evidence && task.evidence.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-muted-foreground mb-1">Evidencia:</div>
                            <div className="space-y-1">
                              {task.evidence.map((evidence) => (
                                <div 
                                  key={evidence.id}
                                  className="flex items-center gap-2 p-1.5 bg-green-50 rounded border text-xs"
                                >
                                  {getFileIcon(evidence.filename)}
                                  <span className="flex-1">{evidence.filename}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm" 
                                    asChild
                                    className="h-6 w-6 p-0"
                                  >
                                    <a 
                                      href={evidence.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download={evidence.filename}
                                    >
                                      <Download className="h-3 w-3" />
                                    </a>
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botones de acción */}
                      {task.status !== 'completed' && canCompleteTask(task) && (
                        <Button
                          onClick={() => handleCompleteTask(task.id)}
                          size="sm"
                          variant="outline"
                          className="ml-2"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Completar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {actionPlan.tasks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay tareas definidas</p>
                  {canAddTasks && (
                    <p className="text-sm">Agrega tareas para organizar el plan de acción</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Panel derecho - Participantes y comentarios */}
        <div className="space-y-6">
          {/* Participantes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Participantes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {actionPlan.participants.map((participant) => (
                <div key={participant.id} className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {participant.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{participant.name}</p>
                    <p className="text-xs text-muted-foreground">{participant.role}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Comentarios */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comentarios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Formulario para nuevo comentario */}
              <div className="space-y-3">
                <Textarea
                  placeholder="Escribe un comentario..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                
                {/* Input para archivos adjuntos */}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                    className="hidden"
                    id="comment-files"
                  />
                  <label
                    htmlFor="comment-files"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground cursor-pointer hover:text-foreground"
                  >
                    <Paperclip className="h-4 w-4" />
                    Adjuntar archivos
                  </label>
                  {selectedFiles.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {selectedFiles.length} archivo(s) seleccionado(s)
                    </span>
                  )}
                </div>

                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  size="sm"
                  className="w-full"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Agregar Comentario
                </Button>
              </div>

              <Separator />

              {/* Lista de comentarios */}
              <div className="space-y-4">
                {actionPlan.comments.map((comment) => (
                  <div key={comment.id} className="border-l-2 border-muted pl-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {comment.authorName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{comment.authorName}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.createdAt), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                      </span>
                    </div>
                    
                    <p className="text-sm mb-2">{comment.content}</p>
                    
                    {/* Display de archivos adjuntos */}
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="space-y-1">
                        {comment.attachments.map((attachment) => (
                          <div 
                            key={attachment.id} 
                            className="flex items-center gap-2 p-2 bg-muted/30 rounded-md border text-sm"
                          >
                            {getFileIcon(attachment.filename)}
                            <span className="text-sm text-muted-foreground flex-1">
                              {attachment.filename}
                            </span>
                            <Button
                              variant="ghost" 
                              size="sm"
                              asChild
                              className="h-8 w-8 p-0"
                            >
                              <a 
                                href={attachment.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                download={attachment.filename}
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);
 
}