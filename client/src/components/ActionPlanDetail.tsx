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
  X,
  Upload,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from '@radix-ui/react-alert-dialog';
import { AlertDialogHeader, AlertDialogFooter } from './ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { EvidenceViewer } from '@/components/EvidenceViewer';

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
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);

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
      toast({
        title: "✅ Tarea creada",
        description: "La tarea se ha agregado correctamente",
      });
    },
  });

  // Mutation para subir evidencia a una tarea (usa el PATCH existente)
  const uploadEvidenceMutation = useMutation({
    mutationFn: async ({ taskId, files }: { taskId: string; files: File[] }) => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('evidence', file);
  });

  const userId = (user as any)?.id;
  formData.append('userId', userId); // ✅ include uploader ID

      
      const response = await fetch(`/api/action-plans/${actionPlanId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });
      
      if (!response.ok) throw new Error('Error al subir evidencia');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/action-plans/${actionPlanId}`] });
      setUploadingTaskId(null);
      toast({
        title: "✅ Evidencia agregada",
        description: "Los archivos se han subido correctamente",
      });
    },
    onError: (error: Error) => {
      setUploadingTaskId(null);
      toast({
        title: "❌ Error",
        description: error.message || "No se pudo subir la evidencia",
        variant: "destructive",
      });
    },
  });

  // 🔧 NUEVA: Función para subir evidencia
  const handleUploadEvidence = (taskId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,application/pdf,text/plain';
    
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      
      if (files.length > 0) {
        setUploadingTaskId(taskId);
        uploadEvidenceMutation.mutate({ taskId, files });
      }
    };
    
    input.click();
  };

  // 🔧 ACTUALIZADA: Mutation para completar tarea (sin archivos)
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest(`/api/action-plans/${actionPlanId}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completado' }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al completar tarea');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/action-plans/${actionPlanId}`] });
      toast({
        title: "✅ Tarea completada",
        description: "La tarea se ha marcado como completada",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Función para completar tarea
  const handleCompleteTask = (taskId: string) => {
    if (confirm('¿Estás seguro de completar esta tarea?')) {
      completeTaskMutation.mutate(taskId);
    }
  };

  // Mutation para eliminar tarea
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest(`/api/action-plans/${actionPlanId}/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar tarea');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/action-plans/${actionPlanId}`] });
      toast({
        title: "✅ Tarea eliminada",
        description: "La tarea se ha eliminado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteTask = (taskId: string, taskTitle: string) => {
    if (confirm(`¿Eliminar la tarea "${taskTitle}"? Esta acción no se puede deshacer.`)) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  // Mutation para agregar comentario
  const addCommentMutation = useMutation({
    mutationFn: async ({ content, files }: { content: string; files?: File[] }) => {
      const formData = new FormData();
      formData.append('content', content);
      
      if (files && files.length > 0) {
        files.forEach(file => {
          formData.append('attachments', file);
        });
      }
      
      const response = await fetch(`/api/action-plans/${actionPlanId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });
      
      if (!response.ok) throw new Error('Error adding comment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/action-plans/${actionPlanId}`] });
      setNewComment('');
      setCommentFiles([]);
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ 
      content: newComment,
      files: commentFiles.length > 0 ? commentFiles : undefined 
    });
  };

  const handleCommentFileUpload = async (files: File[]) => {
    setCommentFiles(prev => [...prev, ...files]);
  };

  // Mutation para eliminar plan
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
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Error",
        description: error.message || "No se pudo eliminar el plan de acción",
        variant: "destructive",
      });
    },
  });

  // 🔧 ACTUALIZADO: Permisos de eliminación solo para admin y manager
  const canDeletePlan = user?.role === 'admin' || user?.role === 'manager';
  
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
    const isResponsibleOrManager = actionPlan?.userRole === 'responsible' || actionPlan?.userRole === 'center_manager';
    const isTaskAssignee = task.assigneeId === currentUserId;
    return isResponsibleOrManager || isTaskAssignee;
  };

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
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
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
                        </div>

                        {/* Botón eliminar tarea */}
                        {canAddTasks && task.status !== 'completado' && (
                          <Button
                            onClick={() => handleDeleteTask(task.id, task.title)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={deleteTaskMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Evidencias de la tarea */}
                      {task.evidence && task.evidence.length > 0 && (
                        <div className="bg-muted/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              📎 Evidencia ({task.evidence.length})
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {task.evidence.map((evidence) => {
                              const isImage = evidence.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                              
                              return (
                                <a
                                  key={evidence.id}
                                  href={evidence.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group flex items-center gap-2 p-2 bg-background hover:bg-accent rounded border hover:border-primary/50 transition-all"
                                >
                                  {isImage ? (
                                    <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                                      <img 
                                        src={evidence.url} 
                                        alt={evidence.filename}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      {getFileIcon(evidence.filename)}
                                    </div>
                                  )}
                                  <span className="flex-1 text-xs truncate">{evidence.filename}</span>
                                  <Download className="h-3 w-3 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Botones de acción para tareas no completadas */}
                      {task.status !== 'completado' && canCompleteTask(task) && (
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            onClick={() => handleUploadEvidence(task.id)}
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            disabled={uploadingTaskId === task.id}
                          >
                            {uploadingTaskId === task.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent mr-2" />
                                Subiendo...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Agregar Evidencia
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => handleCompleteTask(task.id)}
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            disabled={completeTaskMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Completar
                          </Button>
                        </div>
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
          {/* Evidencias totales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Evidencias ({actionPlan.tasks.reduce((acc, task) => acc + (task.evidence?.length || 0), 0)})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {actionPlan.tasks.some(t => t.evidence && t.evidence.length > 0) ? (
                <div className="space-y-4">
                  {actionPlan.tasks
                    .filter(task => task.evidence && task.evidence.length > 0)
                    .map(task => (
                      <div key={task.id} className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          {task.title}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {task.evidence.map((evidence) => {
                            const isImage = evidence.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                            
                            return (
                              <a
                                key={evidence.id}
                                href={evidence.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-2 p-2 bg-muted/50 hover:bg-muted rounded border hover:border-primary/50 transition-all"
                              >
                                {isImage ? (
                                  <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                                    <img 
                                      src={evidence.url} 
                                      alt={evidence.filename}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    {getFileIcon(evidence.filename)}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">
                                    {evidence.filename}
                                  </p>
                                </div>
                                <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Paperclip className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sin evidencias</p>
                </div>
              )}
            </CardContent>
          </Card>

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
              <CardTitle className="text-lg">Comentarios y Evidencia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Formulario para nuevo comentario */}
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border-2 border-dashed">
                <Textarea
                  placeholder="Escribe un comentario..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  className="resize-none"
                />

                {/* Vista previa de archivos */}
                {commentFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {commentFiles.length} archivo(s)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCommentFiles([])}
                        className="h-6 text-xs"
                      >
                        Limpiar
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {commentFiles.map((file, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-2 p-2 bg-background rounded border text-xs"
                        >
                          <Paperclip className="h-3 w-3 flex-shrink-0" />
                          <span className="flex-1 truncate">{file.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => setCommentFiles(prev => prev.filter((_, i) => i !== index))}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botones */}
                <div className="flex flex-col gap-2">
                  <label className="w-full">
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf,.doc,.docx,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        handleCommentFileUpload(files);
                        e.target.value = '';
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      type="button"
                      onClick={(e) => {
                        e.currentTarget.parentElement?.querySelector('input')?.click();
                      }}
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Adjuntar archivos
                    </Button>
                  </label>
                  
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                    size="sm"
                    className="w-full"
                  >
                    {addCommentMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Comentar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Lista de comentarios */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {actionPlan.comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium mb-1">No hay comentarios</p>
                    <p className="text-sm">Sé el primero en comentar</p>
                  </div>
                ) : (
                  actionPlan.comments.map((comment) => (
                    <div key={comment.id} className="border-l-2 border-primary/30 pl-4 py-2 space-y-3">
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
                      
                      <p className="text-sm leading-relaxed">{comment.content}</p>
                      
                      {/* Archivos adjuntos */}
                      {comment.attachments && comment.attachments.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Archivos adjuntos ({comment.attachments.length})
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {comment.attachments.map((attachment) => {
                              const isImage = attachment.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                              
                              return (
                                <a
                                  key={attachment.id}
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group flex items-center gap-2 p-2 bg-muted/50 hover:bg-muted rounded-lg border hover:border-primary/50 transition-all"
                                >
                                  {isImage ? (
                                    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                                      <img 
                                        src={attachment.url} 
                                        alt={attachment.filename}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      {getFileIcon(attachment.filename)}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">
                                      {attachment.filename}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Ver archivo
                                    </p>
                                  </div>
                                  <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/50 animate-in fade-in"
            onClick={() => !deletePlanMutation.isPending && setShowDeleteDialog(false)}
          />
          
          <div className="relative z-[101] w-full max-w-lg mx-4 bg-white rounded-lg shadow-2xl animate-in zoom-in-95 duration-200">
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

            <div className="px-6 py-6 space-y-4 max-h-[70vh] overflow-y-auto">
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

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 text-center">
                  <span className="font-semibold text-gray-900">⚠️ Advertencia:</span> Esta acción es{' '}
                  <span className="font-bold text-red-600">permanente e irreversible</span>.
                  Todos los datos relacionados se perderán.
                </p>
              </div>
            </div>

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