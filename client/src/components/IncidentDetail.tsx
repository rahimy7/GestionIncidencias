// client/src/components/IncidentDetail.tsx - VERSIÓN CON EVIDENCEVIEWER

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ObjectUploader } from "@/components/ObjectUploader";
import { EvidenceViewer } from "@/components/EvidenceViewer"; // NUEVO IMPORT
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  X, FileText, Users, ListCheck, History, Camera, Plus,
  User, Calendar, MapPin, AlertCircle, Clock,
  Loader2
} from "lucide-react";
import type { IncidentWithDetails } from "@shared/schema";
import type { UploadResult } from "@uppy/core";
import { ParticipantSearch } from '@/components/ParticipantSearch';
import { ParticipantSelector } from "@/components/ParticipantSelector";
import { ActionPlansSection } from "./ActionPlansSection";
import { MessageSquare, Send, Edit3, Trash2, Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { IncidentHistory } from "./IncidentHistory";
import { DeleteIncidentDialog } from '@/components/DeleteIncidentDialog';


interface IncidentDetailProps {
  incident: IncidentWithDetails;
  onClose: () => void;
}

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

const statusColors = {
  reportado: "bg-blue-100 text-blue-800",
  asignado: "bg-purple-100 text-purple-800",
  en_proceso: "bg-yellow-100 text-yellow-800",
  pendiente_aprobacion: "bg-orange-100 text-orange-800",
  completado: "bg-green-100 text-green-800",
  cerrado: "bg-gray-100 text-gray-800",
};

const priorityColors = {
  baja: "bg-green-100 text-green-800",
  media: "bg-yellow-100 text-yellow-800",
  alta: "bg-orange-100 text-orange-800",
  critica: "bg-red-100 text-red-800",
};

export function IncidentDetail({ incident, onClose }: IncidentDetailProps) {
  const [activeTab, setActiveTab] = useState("details");
  const [evidenceFiles, setEvidenceFiles] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [participants, setParticipants] = useState<any[]>([]);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('');
  const [isCreatingActionPlan, setIsCreatingActionPlan] = useState(false);

   const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

const [selectedStatus, setSelectedStatus] = useState<string>(incident.status);

useEffect(() => {
  fetchCurrentUser();
}, []);

const fetchCurrentUser = async () => {
  try {
    const response = await apiRequest('/api/auth/user');
    const user = await response.json();
    setCurrentUser(user);
  } catch (error) {
    console.error('Error fetching user:', error);
  }
};

  const rootCauseForm = useForm({
    defaultValues: {
      rootCause: incident.rootCause || "",
    },
  });

  const actionPlanForm = useForm({
    defaultValues: {
      title: "",
      description: "",
      assigneeId: "",
      dueDate: "",
    },
  });

  // CORREGIDO: updateIncidentMutation
const updateIncidentMutation = useMutation({
  mutationFn: async (updates: any) => {
    const response = await apiRequest(`/api/incidents/${incident.id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.json();
  },
  onSuccess: () => {
    toast({
      title: "Éxito",
      description: "Incidencia actualizada correctamente",
    });
    
    // Invalida TODAS las queries que empiezan con "incidents"
    queryClient.invalidateQueries({ queryKey: ["incidents"] });
    queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
    queryClient.invalidateQueries({ queryKey: ["/api/incidents/assigned"] });
    queryClient.invalidateQueries({ queryKey: ["/api/incidents/my"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    
    // Cerrar el modal después de actualizar
 
  },
  onError: () => {
    toast({
      title: "Error",
      description: "No se pudo actualizar la incidencia",
      variant: "destructive",
    });
  },
});
  const refetchIncident = async () => {
  return queryClient.invalidateQueries({ 
    queryKey: [`/api/incidents/${incident.id}`] 
  });
};

  // CORREGIDO: createActionPlanMutation
const createActionPlanMutation = useMutation({
  mutationFn: async (data: any) => {
    console.log("Frontend: Sending action plan data:", data);
    
    const response = await apiRequest(`/api/incidents/${incident.id}/action-plans`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    console.log("Frontend: Response status:", response.status);
    console.log("Frontend: Response headers:", response.headers);
    
    // Check if response is actually JSON
    const contentType = response.headers.get('content-type');
    console.log("Frontend: Content type:", contentType);
    
    if (!contentType || !contentType.includes('application/json')) {
      // If not JSON, get the text to see what we got
      const text = await response.text();
      console.error("Frontend: Expected JSON but got:", text.substring(0, 200));
      throw new Error('Server returned HTML instead of JSON. Check server logs.');
    }
    
    const result = await response.json();
    console.log("Frontend: Parsed JSON result:", result);
    
    return result;
  },
  onSuccess: (data) => {
    console.log("Frontend: Action plan created successfully:", data);
    toast({
      title: "Éxito",
      description: "Plan de acción creado correctamente",
    });
    actionPlanForm.reset();
    queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
  },
  onError: (error) => {
    console.error("Frontend: Error creating action plan:", error);
    toast({
      title: "Error",
      description: "No se pudo crear el plan de acción",
      variant: "destructive",
    });
  },
});

const canDeleteIncident = () => {
  if (!currentUser) return false;
  return currentUser.role === 'admin';
};

  // CORREGIDO: handleGetUploadParameters
  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest("/api/objects/upload", {
        method: 'POST',
        body: JSON.stringify({})
      });
      const data = await response.json();
      return {
        method: "PUT" as const,
        url: data.uploadURL,
      };
    } catch (error) {
      throw new Error("Failed to get upload parameters");
    }
  };

  // CORREGIDO: handleUploadComplete (función completa)
  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    try {
      const uploadedFiles = [];
      if (result.successful) {
        for (const file of result.successful) {
          if (file.uploadURL) {
            const response = await apiRequest("/api/evidence-files", {
              method: 'PUT',
              body: JSON.stringify({
                evidenceFileURL: file.uploadURL,
              })
            });
            const data = await response.json();
            uploadedFiles.push(data.objectPath);
          }
        }
      }
      
      // Update incident with new evidence files
      const currentFiles = incident.evidenceFiles || [];
      updateIncidentMutation.mutate({
        evidenceFiles: [...currentFiles, ...uploadedFiles],
      });
      
      toast({
        title: "Éxito",
        description: "Evidencia subida correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al procesar el archivo subido",
        variant: "destructive",
      });
    }
  };

const handleFileUpload = async (files: File[]) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  const token = localStorage.getItem('auth_token');
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });

  if (!response.ok) throw new Error('Error uploading');

  const { files: uploadedPaths } = await response.json();
  
  const currentFiles = incident.evidenceFiles || [];
  await updateIncidentMutation.mutateAsync({
    evidenceFiles: [...currentFiles, ...uploadedPaths],
  });
  
  queryClient.invalidateQueries({ queryKey: [`/api/incidents/${incident.id}`] });
};

  const onUpdateRootCause = (data: any) => {
    updateIncidentMutation.mutate({ rootCause: data.rootCause });
  };

const onCreateActionPlan = async (values: any) => {
  if (!incident?.id) return;
  
  console.log("Frontend: Form values received:", values);
  
  // Preparar datos para enviar
  const actionPlanData = {
    title: values.title,
    description: values.description,
    assigneeId: values.assigneeId,
    dueDate: values.dueDate ? values.dueDate.toISOString() : null
  };
  
  console.log("Frontend: Prepared data for API:", actionPlanData);
  
  setIsCreatingActionPlan(true);
  try {
    await createActionPlanMutation.mutateAsync(actionPlanData);
    
    actionPlanForm.reset();
    setSelectedParticipantId('');
  } catch (error) {
    console.error("Frontend: Failed to create action plan:", error);
  } finally {
    setIsCreatingActionPlan(false);
  }
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

  const getInitials = (name?: string, email?: string) => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase();
    if (email) return email.substring(0, 2).toUpperCase();
    return 'U';
  };

  useEffect(() => {
  fetchParticipants();
}, [incident.id]);

const fetchParticipants = async () => {
  try {
    const response = await apiRequest(`/api/incidents/${incident.id}/participants`);
    const data = await response.json();
    setParticipants(data);
  } catch (error) {
    console.error('Error fetching participants:', error);
  }
};

const handleAddParticipant = async (userId: string, role: string) => {
  try {
    await apiRequest(`/api/incidents/${incident.id}/participants`, {
      method: 'POST',
      body: JSON.stringify({ userId, role })
    });
    fetchParticipants();
    toast({
      title: "Éxito",
      description: "Participante agregado correctamente",
    });
  } catch (error) {
    toast({
      title: "Error", 
      description: "No se pudo agregar el participante",
      variant: "destructive",
    });
  }
};

const handleRemoveParticipant = async (userId: string) => {
  try {
    await apiRequest(`/api/incidents/${incident.id}/participants/${userId}`, {
      method: 'DELETE'
    });
    fetchParticipants();
    toast({
      title: "Éxito",
      description: "Participante removido correctamente",
    });
  } catch (error) {
    toast({
      title: "Error",
      description: "No se pudo remover el participante", 
      variant: "destructive",
    });
  }
};

 // NUEVOS queries y mutations para comentarios
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['incident-comments', incident.id],
    queryFn: async () => {
      const response = await apiRequest(`/api/incidents/${incident.id}/comments`);
      return response.json();
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest(`/api/incidents/${incident.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: content }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-comments', incident.id] });
      setNewComment('');
      toast({
        title: "Éxito",
        description: "Comentario agregado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo agregar el comentario",
        variant: "destructive",
      });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const response = await apiRequest(`/api/incidents/${incident.id}/comments/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ text: content }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-comments', incident.id] });
      setEditingCommentId(null);
      setEditContent('');
      toast({
        title: "Éxito",
        description: "Comentario actualizado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el comentario",
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiRequest(`/api/incidents/${incident.id}/comments/${commentId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident-comments', incident.id] });
      toast({
        title: "Éxito",
        description: "Comentario eliminado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el comentario",
        variant: "destructive",
      });
    },
  });

  // Funciones auxiliares para comentarios
  const handleAddComment = () => {
    if (newComment.trim()) {
      createCommentMutation.mutate(newComment.trim());
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = () => {
    if (editingCommentId && editContent.trim()) {
      updateCommentMutation.mutate({
        commentId: editingCommentId,
        content: editContent.trim(),
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
    return currentUser && (currentUser.id === comment.author.id || currentUser.role === 'admin');
  };

  // Función para formatear tiempo relativo
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

return (
  <>
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Incidencia {incident.incidentNumber}
              </DialogTitle>
              <p className="text-muted-foreground">{incident.title}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[incident.status]}>
                {incident.status}
              </Badge>
              <Badge className={priorityColors[incident.priority]}>
                {incident.priority}
              </Badge>
            </div>
          </div>
          
            <DialogDescription className="sr-only">
            Detalles completos de la incidencia {incident.incidentNumber}
          </DialogDescription>
             
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="action-plans">Planes de Acción</TabsTrigger>
            <TabsTrigger value="participants">Participantes</TabsTrigger>
            <TabsTrigger value="comments">Comentarios</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
            <TabsTrigger value="evidence">Evidencia</TabsTrigger>
          </TabsList>

    

<TabsContent value="details" className="space-y-6">
  {/* Información Principal */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MapPin className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Centro/Tienda</p>
            <p className="font-semibold truncate">{incident.center?.name}</p>
            <p className="text-xs text-muted-foreground">{incident.center?.code}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <AlertCircle className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Tipo</p>
            <p className="font-semibold truncate">{incident.type?.name}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <User className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Reportado por</p>
            <p className="font-semibold truncate">{incident.reporter?.firstName} {incident.reporter?.lastName}</p>
            <p className="text-xs text-muted-foreground truncate">{incident.reporter?.email}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Calendar className="h-5 w-5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Fecha de Reporte</p>
            <p className="font-semibold truncate">{formatDate(incident.createdAt?.toString() || new Date().toISOString())}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  {/* Descripción y Análisis */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Descripción</h3>
        </div>
        <div className="prose prose-sm max-w-none">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {incident.description}
          </p>
        </div>
      </CardContent>
    </Card>

    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Análisis de Causa Raíz</h3>
        </div>
        <Form {...rootCauseForm}>
          <form onSubmit={rootCauseForm.handleSubmit(onUpdateRootCause)} className="space-y-3">
            <FormField
              control={rootCauseForm.control}
              name="rootCause"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      rows={5}
                      placeholder="Describir el análisis de la causa raíz..."
                      {...field}
                      className="resize-none"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              size="sm" 
              disabled={updateIncidentMutation.isPending}
              className="w-full"
            >
              {updateIncidentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Análisis"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  </div>

  {/* Acciones Rápidas */}
  <Card className="hover:shadow-md transition-shadow bg-gradient-to-br from-primary/5 to-primary/10">
    <CardContent className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Acciones Rápidas</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Button 
          className="w-full justify-start"
          variant="outline"
          onClick={() => setShowStatusModal(true)}
        >
          <Clock className="h-4 w-4 mr-2" />
          Actualizar Estado
        </Button>
        <Button 
          className="w-full justify-start"
          variant="outline"
          onClick={() => setActiveTab('action-plans')}
        >
          <ListCheck className="h-4 w-4 mr-2" />
          Ver Planes de Acción
        </Button>
        <Button 
          className="w-full justify-start"
          variant="outline"
          onClick={() => setActiveTab('evidence')}
        >
          <Camera className="h-4 w-4 mr-2" />
          Ver Evidencias
        </Button>
      </div>
    </CardContent>
  </Card>
</TabsContent>

          <TabsContent value="action-plans" className="space-y-4">
            <ActionPlansSection 
              incident={{
                ...incident,
                participants: (incident.participants || []).map((p: any) => ({
                  id: p.id,
                  userId: p.userId,
                  role: p.role === "participant" || p.role === "reviewer" || p.role === "supervisor" ? p.role : undefined,
                  user: {
                    id: p.user?.id ?? "",
                    firstName: p.user?.firstName ?? "",
                    lastName: p.user?.lastName ?? "",
                    email: p.user?.email ?? "",
                    role: p.user?.role ?? "",
                    center: p.user?.center
                      ? {
                          code: p.user.center.code ?? "",
                          name: p.user.center.name ?? "",
                        }
                      : undefined,
                  },
                })),
              }} 
              onUpdate={refetchIncident}
            />
          </TabsContent>
          
          <TabsContent value="participants" className="space-y-4">
            <ParticipantSearch
              incidentCenterId={incident.centerId}
              currentParticipants={participants.map(p => p.userId)}
              onAddParticipant={(userId, user) => handleAddParticipant(userId, 'participant')}
              onRemoveParticipant={handleRemoveParticipant}
            />
          </TabsContent>

          <TabsContent value="comments" className="space-y-4">
            <Card>
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
                  {commentsLoading ? (
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
                    Array.isArray(comments) && comments.map((comment) => (
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
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <IncidentHistory incidentId={incident.id} />
              </CardContent>
            </Card>
          </TabsContent>
<TabsContent value="evidence" className="space-y-4">
  <Card>
    <CardContent className="p-4">
      <h3 className="font-semibold text-foreground mb-3">Evidencias</h3>
      <EvidenceViewer 
        files={incident.evidenceFiles || []} 
        allowUpload={true}
        onFileUpload={handleFileUpload}
        maxFileSize={10}
      />
    </CardContent>
  </Card>
</TabsContent>
      
        </Tabs>
 <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Creada: {incident.createdAt ? new Date(incident.createdAt).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : 'Fecha no disponible'}
          </div>
          
          {canDeleteIncident() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Incidencia
            </Button>
          )}
        </div>
        
      </DialogContent>

      {/* Modal para actualizar estado */}
<Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Actualizar Estado de Incidencia</DialogTitle>
    </DialogHeader>
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Seleccionar nuevo estado</label>
        <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value)}>
          
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reportado">Reportada</SelectItem>
            <SelectItem value="asignado">Asignada</SelectItem>
            <SelectItem value="en_proceso">En Progreso</SelectItem>
            <SelectItem value="pendiente_aprobacion">Pendiente Aprobación</SelectItem>
            <SelectItem value="completado">Completada</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setShowStatusModal(false)}>
          Cancelar
        </Button>
        <Button 
          onClick={() => {
            updateIncidentMutation.mutate({ status: selectedStatus });
            setShowStatusModal(false);
          }}
          disabled={updateIncidentMutation.isPending || selectedStatus === incident.status}
        >
          {updateIncidentMutation.isPending ? "Actualizando..." : "Actualizar"}
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>

    </Dialog>

    {/* Dialog de confirmación de eliminación */}
    <DeleteIncidentDialog
      incident={incident}
      open={showDeleteDialog}
      onOpenChange={setShowDeleteDialog}
      onSuccess={onClose}
    />
  </>
);
}