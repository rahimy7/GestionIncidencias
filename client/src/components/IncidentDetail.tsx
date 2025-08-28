import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  X, FileText, Users, ListCheck, History, Camera, Plus,
  User, Calendar, MapPin, AlertCircle, Clock
} from "lucide-react";
import type { IncidentWithDetails } from "@shared/schema";
import type { UploadResult } from "@uppy/core";

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

  const updateIncidentMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest("PUT", `/api/incidents/${incident.id}`, updates);
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

  const createActionPlanMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/incidents/${incident.id}/action-plans`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Plan de acción creado correctamente",
      });
      actionPlanForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el plan de acción",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest("POST", "/api/objects/upload", {});
      const data = await response.json();
      return {
        method: "PUT" as const,
        url: data.uploadURL,
      };
    } catch (error) {
      throw new Error("Failed to get upload parameters");
    }
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    try {
      const uploadedFiles = [];
      for (const file of result.successful) {
        if (file.uploadURL) {
          const response = await apiRequest("PUT", "/api/evidence-files", {
            evidenceFileURL: file.uploadURL,
          });
          const data = await response.json();
          uploadedFiles.push(data.objectPath);
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

  const onUpdateRootCause = (data: any) => {
    updateIncidentMutation.mutate({ rootCause: data.rootCause });
  };

  const onCreateActionPlan = (data: any) => {
    createActionPlanMutation.mutate({
      ...data,
      dueDate: new Date(data.dueDate),
    });
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

  return (
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
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Detalles</TabsTrigger>
            <TabsTrigger value="participants">Participantes</TabsTrigger>
            <TabsTrigger value="actions">Acciones</TabsTrigger>
            <TabsTrigger value="timeline">Cronología</TabsTrigger>
          </TabsList>

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
                          <p className="font-medium">{formatDate(incident.createdAt!)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mt-4">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground mb-3">Descripción</h3>
                    <p className="text-sm text-foreground">{incident.description}</p>
                  </CardContent>
                </Card>

                {/* Root Cause Analysis */}
                <Card className="mt-4">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground mb-3">Análisis de Causa Raíz</h3>
                    <Form {...rootCauseForm}>
                      <form onSubmit={rootCauseForm.handleSubmit(onUpdateRootCause)} className="space-y-3">
                        <FormField
                          control={rootCauseForm.control}
                          name="rootCause"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea
                                  rows={3}
                                  placeholder="Describir el análisis de la causa raíz..."
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <Button type="submit" size="sm" disabled={updateIncidentMutation.isPending}>
                          {updateIncidentMutation.isPending ? "Guardando..." : "Guardar Análisis"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>

              {/* Evidence */}
              <div>
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground mb-3">Evidencias</h3>
                    <div className="space-y-3">
                      {incident.evidenceFiles?.map((file, index) => (
                        <div key={index} className="relative group cursor-pointer">
                          <img
                            src={file}
                            alt={`Evidence ${index + 1}`}
                            className="w-full h-24 object-cover rounded-md border border-border"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                            <Button variant="ghost" size="sm" className="text-white">
                              Ver
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      <ObjectUploader
                        maxNumberOfFiles={5}
                        maxFileSize={10485760}
                        onGetUploadParameters={handleGetUploadParameters}
                        onComplete={handleUploadComplete}
                        buttonClassName="w-full border border-dashed border-muted-foreground/25 rounded-md p-3 text-sm text-muted-foreground hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          <span>Agregar Evidencia</span>
                        </div>
                      </ObjectUploader>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card className="mt-4">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <Button 
                        className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                        onClick={() => updateIncidentMutation.mutate({ status: "completed" })}
                        disabled={updateIncidentMutation.isPending}
                      >
                        Marcar como Completada
                      </Button>
                      <Button 
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => updateIncidentMutation.mutate({ status: "in_progress" })}
                        disabled={updateIncidentMutation.isPending}
                      >
                        Actualizar Estado
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="participants" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Participantes
                  </h3>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Participante
                  </Button>
                </div>
                <div className="space-y-2">
                  {incident.participants?.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                          {getInitials(participant.user.firstName, participant.user.email)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {participant.user.firstName || participant.user.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {participant.user.department || "Sin departamento"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {participant.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <ListCheck className="h-5 w-5" />
                    Planes de Acción
                  </h3>
                </div>
                
                {/* Action Plans List */}
                <div className="space-y-3 mb-6">
                  {incident.actionPlans?.map((actionPlan) => (
                    <Card key={actionPlan.id} className="border">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-foreground">{actionPlan.title}</h4>
                          <Badge variant="outline">
                            {actionPlan.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{actionPlan.description}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Asignado a: {actionPlan.assignee?.firstName || actionPlan.assignee?.email}</span>
                          <span>Vence: {formatDate(actionPlan.dueDate)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* New Action Plan Form */}
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-3">Nuevo Plan de Acción</h4>
                    <Form {...actionPlanForm}>
                      <form onSubmit={actionPlanForm.handleSubmit(onCreateActionPlan)} className="space-y-3">
                        <FormField
                          control={actionPlanForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Título</FormLabel>
                              <FormControl>
                                <Input placeholder="Título del plan de acción" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={actionPlanForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descripción</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Descripción detallada" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={actionPlanForm.control}
                            name="assigneeId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Asignar a</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleccionar usuario" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {incident.participants?.map((participant) => (
                                      <SelectItem key={participant.userId} value={participant.userId}>
                                        {participant.user.firstName || participant.user.email}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={actionPlanForm.control}
                            name="dueDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Fecha límite</FormLabel>
                                <FormControl>
                                  <Input type="datetime-local" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button type="submit" disabled={createActionPlanMutation.isPending}>
                          {createActionPlanMutation.isPending ? "Creando..." : "Crear Plan de Acción"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Línea de Tiempo
                </h3>
                <div className="space-y-4">
                  {incident.history?.map((entry, index) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-3 w-3 rounded-full ${
                          index === 0 ? 'bg-primary' : 'bg-muted-foreground'
                        }`}></div>
                        {index < incident.history!.length - 1 && (
                          <div className="h-8 w-0.5 bg-border mt-2"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium">{entry.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(entry.createdAt!)} - {entry.user?.firstName || entry.user?.email || "Sistema"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
