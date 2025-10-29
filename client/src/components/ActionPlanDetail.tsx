// client/src/components/ActionPlanDetail.tsx
import React, { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  CheckCircle2,
  FileText,
  MessageSquare,
  Paperclip,
  Download,
  Image,
  Video,
  Plus,
  User,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from '@radix-ui/react-alert-dialog';
import { AlertDialogHeader, AlertDialogFooter } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface ActionPlanDetailProps {
  actionPlanId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pendiente' | 'en_proceso' | 'completado';
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
  status: 'pendiente' | 'en_proceso' | 'completado';
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
  userRole: 'responsible' | 'participant' | 'incident_reporter' | 'incident_assignee' | 'center_manager';
  center?: {
    id: string;
    name: string;
    managerId?: string;
  };
}

export function ActionPlanDetail({ actionPlanId, isOpen, onClose }: ActionPlanDetailProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentUserId = (user as any)?.id;

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
  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, files }: { taskId: string; files?: File[] }) => {
      const formData = new FormData();
      formData.append('status', 'completado');
      
      if (files && files.length > 0) {
        files.forEach(file => {
          formData.append('evidence', file);
        });
      }
      
      const response = await fetch(`/api/action-plans/${actionPlanId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });
      
      if (!response.ok) throw new Error('Error completing task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/action-plans/${actionPlanId}`] });
    },
  });

  const handleCompleteTask = (taskId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,application/pdf,text/plain';
    
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      
      if (files.length > 0) {
        if (confirm(`¿Deseas completar la tarea con ${files.length} archivo(s) de evidencia?`)) {
          completeTaskMutation.mutate({ taskId, files });
        }
      } else {
        if (confirm('¿Deseas completar la tarea sin evidencia?')) {
          completeTaskMutation.mutate({ taskId });
        }
      }
    };
    
    input.click();
  };

  // Mutation para agregar comentario
  const addCommentMutation = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
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
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ content: newComment });
  };

// Reemplaza la mutación deletePlanMutation con esta:
const deletePlanMutation = useMutation({
  mutationFn: async () => {
    return await apiRequest(`/api/action-plans/${actionPlanId}`, {
      method: 'DELETE',
    });
  },
  onSuccess: () => {
    toast({
      title: "✅ Plan eliminado",
      description: "El plan de acción ha sido eliminado correctamente",
    });
    setShowDeleteDialog(false);
    queryClient.invalidateQueries({ queryKey: ['/api/action-plans'] });
    queryClient.invalidateQueries({ queryKey: ['/api/incidents'] });
    onClose(); // Cerrar el modal principal después de eliminar
  },
  onError: (error: Error) => {
    toast({
      title: "❌ Error",
      description: error.message || "No se pudo eliminar el plan de acción",
      variant: "destructive",
    });
  },
});

// Agregar la función para verificar permisos de eliminación:
const canDeletePlan = actionPlan?.userRole === 'responsible' || 
                      actionPlan?.userRole === 'center_manager';
  
  // Mutation para completar plan de acción
  const completePlanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/action-plans/${actionPlanId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completado' }),
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
      case 'completado': return 'bg-green-100 text-green-800';
      case 'en_proceso': return 'bg-blue-100 text-blue-800';
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completado': return 'Completado';
      case 'en_proceso': return 'En Progreso';
      case 'pendiente': return 'Pendiente';
      default: return status;
    }
  };

  const getUserRoleText = (role: string) => {
    switch (role) {
      case 'responsible': return 'Responsable';
      case 'center_manager': return 'Manager del Centro';
      case 'incident_reporter': return 'Reportador';
      case 'incident_assignee': return 'Asignado de Incidencia';
      case 'participant': return 'Participante';
      default: return role;
    }
  };

  const getUserRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'responsible': return 'bg-purple-100 text-purple-800';
      case 'center_manager': return 'bg-orange-100 text-orange-800';
      case 'incident_reporter': return 'bg-cyan-100 text-cyan-800';
      case 'incident_assignee': return 'bg-teal-100 text-teal-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status !== 'completado' && new Date(dueDate) < new Date();
  };

  const canCompleteTask = (task: Task) => {
    // El responsable del plan, el manager del centro, o el asignado de la tarea pueden completarla
    const isResponsibleOrManager = actionPlan?.userRole === 'responsible' || actionPlan?.userRole === 'center_manager';
    const isTaskAssignee = task.assigneeId === currentUserId;
    return isResponsibleOrManager || isTaskAssignee;
  };

  // CORRECCIÓN: Incluir center_manager en los permisos
  const canAddTasks = actionPlan?.userRole === 'responsible' || actionPlan?.userRole === 'center_manager';
  const canCompletePlan = (actionPlan?.userRole === 'responsible' || actionPlan?.userRole === 'center_manager') && 
    actionPlan?.tasks.every(task => task.status === 'completado');

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
            {actionPlan.userRole && (
              <Badge className={getUserRoleBadgeColor(actionPlan.userRole)}>
                {getUserRoleText(actionPlan.userRole)}
              </Badge>
            )}
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
            {canDeletePlan && actionPlan.status !== 'completado' && (
              <Button
                onClick={() => setShowDeleteDialog(true)}
                disabled={deletePlanMutation.isPending}
                size="sm"
                variant="destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
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
              {/* Indicador de permisos especiales */}
              {actionPlan.userRole === 'center_manager' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-900">Permisos de Manager del Centro</p>
                    <p className="text-xs text-orange-700 mt-1">
                      Como manager del centro, puedes agregar tareas, completarlas y finalizar este plan de acción.
                    </p>
                  </div>
                </div>
              )}
              
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
                  Tareas ({actionPlan.tasks.filter(t => t.status === 'completado').length}/{actionPlan.tasks.length})
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
                <Card key={task.id} className={`${task.status === 'completado' ? 'bg-green-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className={`font-medium ${task.status === 'completado' ? 'line-through text-muted-foreground' : ''}`}>
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
                      {task.status !== 'completado' && canCompleteTask(task) && (
                        <Button
                          onClick={() => handleCompleteTask(task.id)}
                          size="sm"
                          variant="outline"
                          className="ml-2"
                          disabled={completeTaskMutation.isPending}
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
{/* Modal de confirmación de eliminación - INDEPENDIENTE */}
{showDeleteDialog && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center">
    {/* Backdrop oscuro */}
    <div 
      className="fixed inset-0 bg-black/50 animate-in fade-in"
      onClick={() => !deletePlanMutation.isPending && setShowDeleteDialog(false)}
    />
    
    {/* Modal de confirmación */}
    <div className="relative z-[101] w-full max-w-lg mx-4 bg-white rounded-lg shadow-2xl animate-in zoom-in-95 duration-200">
      {/* Header con color rojo */}
      <div className="bg-red-600 text-white px-6 py-4 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full">
            <Trash2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold">¿Eliminar plan de acción?</h3>
            <p className="text-sm text-red-100 mt-1">Esta acción no se puede deshacer</p>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="px-6 py-6 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Información del plan a eliminar */}
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <FileText className="h-5 w-5 text-red-700" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-2">
                Plan de acción a eliminar:
              </h4>
              <div className="space-y-1.5 text-sm text-red-800">
                <div className="flex">
                  <span className="font-medium w-24">Título:</span>
                  <span className="flex-1">{actionPlan.title}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-24">Responsable:</span>
                  <span className="flex-1">{actionPlan.responsible.name}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-24">Estado:</span>
                  <Badge className={getStatusColor(actionPlan.status)}>
                    {getStatusText(actionPlan.status)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advertencia sobre datos que se eliminarán */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-700" />
            </div>
            <div className="flex-1">
              <h5 className="font-semibold text-yellow-900 mb-3">
                Se eliminarán permanentemente:
              </h5>
              <div className="space-y-2.5 text-sm text-yellow-800">
                <div className="flex items-center gap-3 p-2 bg-white/50 rounded">
                  <CheckCircle2 className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <span className="font-medium">
                    {actionPlan.tasks.length} {actionPlan.tasks.length === 1 ? 'tarea' : 'tareas'}
                  </span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-white/50 rounded">
                  <MessageSquare className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <span className="font-medium">
                    {actionPlan.comments.length} {actionPlan.comments.length === 1 ? 'comentario' : 'comentarios'}
                  </span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-white/50 rounded">
                  <User className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                  <span className="font-medium">
                    {actionPlan.participants.length} {actionPlan.participants.length === 1 ? 'participante' : 'participantes'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mensaje final de advertencia */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-700 text-center">
            <span className="font-semibold text-gray-900">⚠️ Advertencia:</span> Esta acción es{' '}
            <span className="font-bold text-red-600">permanente e irreversible</span>.
            Todos los datos relacionados con este plan se perderán para siempre.
          </p>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="px-6 py-4 bg-gray-50 rounded-b-lg border-t flex items-center justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => setShowDeleteDialog(false)}
          disabled={deletePlanMutation.isPending}
          className="min-w-[100px]"
        >
          Cancelar
        </Button>
        <Button
          variant="destructive"
          onClick={() => deletePlanMutation.mutate()}
          disabled={deletePlanMutation.isPending}
          className="min-w-[140px] bg-red-600 hover:bg-red-700"
        >
          {deletePlanMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              Eliminando...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Sí, eliminar
            </>
          )}
        </Button>
      </div>
    </div>
  </div>
)}

    </DialogContent>
  </Dialog>
);
}