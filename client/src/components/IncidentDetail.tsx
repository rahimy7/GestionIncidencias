// client/src/components/IncidentDetail.tsx - VERSIÓN COMPLETA CON INTEGRATION ACTIONPLANDETAIL

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  X, FileText, Users, ListCheck, History, Camera, Plus,
  User, Calendar, MapPin, AlertCircle, Clock, CheckCircle, Eye, ClipboardList
} from "lucide-react";
import type { IncidentWithDetails } from "@shared/schema";
import type { UploadResult, UppyFile } from "@uppy/core";
import { ParticipantSearch } from '@/components/ParticipantSearch';
import { ParticipantSelector } from "@/components/ParticipantSelector";
import { ActionPlansSection } from "./ActionPlansSection";
import { ActionPlanDetail } from "./ActionPlanDetail"; // Importar el componente existente
import { IncidentHistory } from "./IncidentHistory";

interface IncidentDetailProps {
  incident: IncidentWithDetails;
  onClose: () => void;
}

const statusColors = {
  reported: "bg-blue-100 text-blue-800",
  assigned: "bg-purple-100 text-purple-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  pending_approval: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

const priorityColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
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
  
  // Estados para ActionPlanDetail
  const [selectedActionPlanId, setSelectedActionPlanId] = useState<string | null>(null);
  const [isActionPlanDetailOpen, setIsActionPlanDetailOpen] = useState(false);

  // Cargar planes de acción de la incidencia
  const { data: actionPlans = [], isLoading: isLoadingActionPlans } = useQuery({
    queryKey: [`/api/incidents/${incident.id}/action-plans`],
    queryFn: async () => {
      const response = await apiRequest(`/api/incidents/${incident.id}/action-plans`);
      if (!response.ok) throw new Error('Error fetching action plans');
      return response.json();
    },
    enabled: !!incident.id,
  });

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

  // Funciones para manejar ActionPlanDetail
  const handleOpenActionPlan = (actionPlanId: string) => {
    setSelectedActionPlanId(actionPlanId);
    setIsActionPlanDetailOpen(true);
  };

  const handleCloseActionPlan = () => {
    setSelectedActionPlanId(null);
    setIsActionPlanDetailOpen(false);
    // Recargar los planes de acción para reflejar cambios
    queryClient.invalidateQueries({ queryKey: [`/api/incidents/${incident.id}/action-plans`] });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      in_progress: "bg-blue-100 text-blue-800", 
      completed: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <AlertCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Frontend: Error response:", errorData);
        throw new Error(errorData.message || 'Error creating action plan');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Plan de acción creado correctamente",
      });
      actionPlanForm.reset();
      setIsCreatingActionPlan(false);
      queryClient.invalidateQueries({ queryKey: [`/api/incidents/${incident.id}/action-plans`] });
    },
    onError: (error: Error) => {
      console.error("Frontend: Mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el plan de acción",
        variant: "destructive",
      });
    },
  });

  const updateRootCause = rootCauseForm.handleSubmit(async (data) => {
    updateIncidentMutation.mutate(data);
  });

  const createActionPlan = actionPlanForm.handleSubmit(async (data) => {
    if (!data.assigneeId) {
      toast({
        title: "Error",
        description: "Debe seleccionar un responsable",
        variant: "destructive",
      });
      return;
    }

    createActionPlanMutation.mutate(data);
  });

  const handleFileUpload = async () => {
    try {
      const response = await apiRequest("/api/upload", {
        method: "POST",
      });
      const { url } = await response.json();
      return {
        method: "PUT" as const,
        url,
      };
    } catch (error) {
      console.error("Error getting upload URL:", error);
      throw error;
    }
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    try {
      const newFiles = result.successful?.map((file: UppyFile<Record<string, unknown>, Record<string, unknown>>) => file.response?.uploadURL || "") || [];
      setEvidenceFiles(prev => [...prev, ...newFiles]);
      
      await updateIncidentMutation.mutateAsync({
        evidenceFiles: [...evidenceFiles, ...newFiles],
      });
      
      toast({
        title: "Éxito",
        description: "Archivos subidos correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al subir archivos",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
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
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="details">Detalles</TabsTrigger>
              <TabsTrigger value="action-plans">
                Planes de Acción 
                {actionPlans.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {actionPlans.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="participants">Participantes</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
              <TabsTrigger value="evidence">Evidencia</TabsTrigger>
            </TabsList>

            {/* Pestaña de Detalles */}
            <TabsContent value="details" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Basic Information */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground mb-3">Información Básica</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Centro/Tienda</p>
                            <p className="font-medium">{incident.center?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Tipo</p>
                            <p className="font-medium">{incident.type?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Reportado por</p>
                            <p className="font-medium">{incident.reporter?.firstName || incident.reporter?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Fecha de Reporte</p>
                            <p className="font-medium">{formatDate(incident.createdAt?.toString() || new Date().toISOString())}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Description */}
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground mb-3">Descripción</h3>
                      <p className="text-muted-foreground">{incident.description}</p>
                    </CardContent>
                  </Card>

                  {/* Root Cause Analysis */}
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground mb-3">Análisis de Causa Raíz</h3>
                      <Form {...rootCauseForm}>
                        <form onSubmit={updateRootCause} className="space-y-4">
                          <FormField
                            control={rootCauseForm.control}
                            name="rootCause"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Causa Raíz</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Describe la causa raíz de la incidencia..."
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" disabled={updateIncidentMutation.isPending}>
                            {updateIncidentMutation.isPending ? "Guardando..." : "Guardar Causa Raíz"}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </div>

                {/* Status Update */}
                <div>
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground mb-3">Estado</h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="status">Cambiar Estado</Label>
                          <Select 
                            value={incident.status} 
                            onValueChange={(value) => updateIncidentMutation.mutate({ status: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="reported">Reportada</SelectItem>
                              <SelectItem value="assigned">Asignada</SelectItem>
                              <SelectItem value="in_progress">En Progreso</SelectItem>
                              <SelectItem value="pending_approval">Pendiente de Aprobación</SelectItem>
                              <SelectItem value="completed">Completada</SelectItem>
                              <SelectItem value="closed">Cerrada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* NUEVA pestaña de Planes de Acción */}
            <TabsContent value="action-plans" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Planes de Acción</h3>
                {/* Botón para crear nuevo plan (si existe) */}
                <Button 
                  size="sm" 
                  onClick={() => setIsCreatingActionPlan(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo Plan
                </Button>
              </div>

              {isLoadingActionPlans ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Cargando planes de acción...</p>
                </div>
              ) : actionPlans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay planes de acción definidos</p>
                  <p className="text-sm">Los planes aparecerán aquí cuando se agreguen</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {actionPlans.map((plan: any) => {
                    const isOverdue = new Date(plan.dueDate) < new Date() && plan.status !== 'completed';
                    const actualStatus = isOverdue ? 'overdue' : plan.status;

                    return (
                      <Card key={plan.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{plan.title}</h4>
                                <Badge className={getStatusColor(actualStatus)}>
                                  <div className="flex items-center gap-1">
                                    {getStatusIcon(actualStatus)}
                                    {actualStatus === 'overdue' ? 'Vencido' : plan.status}
                                  </div>
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-muted-foreground mb-3">
                                {plan.description}
                              </p>

                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  <span>Responsable: {plan.responsible?.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>Vence: {formatDate(plan.dueDate)}</span>
                                </div>
                                {plan.progress !== undefined && (
                                  <div className="flex items-center gap-1">
                                    <div className="w-16 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all" 
                                        style={{ width: `${plan.progress}%` }}
                                      ></div>
                                    </div>
                                    <span>{plan.progress}%</span>
                                  </div>
                                )}
                              </div>

                              {plan.participants && plan.participants.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-xs text-muted-foreground mb-2">Participantes:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {plan.participants.map((participant: any) => (
                                      <div key={participant.id} className="flex items-center gap-1 text-xs">
                                        <Avatar className="h-5 w-5">
                                          <AvatarFallback className="text-xs">
                                            {participant.name.split(' ').map((n: string) => n[0]).join('')}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span>{participant.name}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {participant.role}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-2 ml-4">
                              {/* Botón para ver detalles del plan */}
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleOpenActionPlan(plan.id)}
                                className="flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                Ver Detalles
                              </Button>

                              {/* Botones de acción según el estado */}
                              {plan.status === 'pending' && (
                                <Button 
                                  size="sm" 
                                  onClick={() => {/* lógica para iniciar plan */}}
                                >
                                  Iniciar
                                </Button>
                              )}
                              {(plan.status === 'in_progress' || actualStatus === 'overdue') && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {/* lógica para completar plan */}}
                                >
                                  Completar
                                </Button>
                              )}
                              {plan.status === 'completed' && (
                                <Badge variant="secondary" className="text-green-600 justify-center">
                                  ✓ Completado
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Pestaña de Participantes */}
            <TabsContent value="participants" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Participantes</h3>
                <Button size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar Participante
                </Button>
              </div>
              
              <div className="space-y-4">
                {/* Lista de participantes */}
                <p className="text-muted-foreground">Funcionalidad de participantes por implementar</p>
              </div>
            </TabsContent>

            {/* Pestaña de Historial */}
            <TabsContent value="history" className="space-y-4">
  <IncidentHistory incidentId={incident.id} />
</TabsContent>

            {/* Pestaña de Evidencia */}
            <TabsContent value="evidence" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Archivos de Evidencia</h3>
                <ObjectUploader
                  maxNumberOfFiles={5}
                  onGetUploadParameters={handleFileUpload}
                  onComplete={handleUploadComplete}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Subir Archivos
                </ObjectUploader>
              </div>
              
              <div className="space-y-2">
                {incident.evidenceFiles?.map((file: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{file}</span>
                  </div>
                ))}
                {evidenceFiles.map((file: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{file}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Modal para ActionPlanDetail */}
      {selectedActionPlanId && (
        <ActionPlanDetail 
          actionPlanId={selectedActionPlanId}
          isOpen={isActionPlanDetailOpen}
          onClose={handleCloseActionPlan}
          userRole={currentUser?.role || 'user'}
        />
      )}
    </>
  );
}