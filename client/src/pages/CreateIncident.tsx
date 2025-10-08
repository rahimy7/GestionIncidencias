// client/src/pages/CreateIncident.tsx - CON CONTROL DE CENTRO POR ROL

import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, AlertTriangle, Upload, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

const incidentSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  typeId: z.string().min(1, "Debe seleccionar un tipo de incidencia"),
  centerId: z.string().min(1, "Debe seleccionar un centro"),
});

type IncidentFormData = z.infer<typeof incidentSchema>;

export function CreateIncident() {
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ✅ NUEVO: Obtener información del usuario autenticado
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const userCenterId = user?.centerId;

  // Obtener centros disponibles
  const { data: centers = [], isLoading: centersLoading } = useQuery({
    queryKey: ['/api/centers'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/centers', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch centers');
      return response.json();
    }
  });

  // Obtener tipos de incidencia
  const { data: incidentTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ['/api/incident-types'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/incident-types', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch incident types');
      return response.json();
    }
  });

  const form = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      typeId: "",
      centerId: "",
    },
  });

  // ✅ NUEVO: Preseleccionar centro si no es admin
  useEffect(() => {
    if (!isAdmin && userCenterId && centers.length > 0) {
      // Verificar que el centro del usuario existe en la lista
      const userCenter = centers.find((c: any) => c.id === userCenterId);
      if (userCenter) {
        form.setValue('centerId', userCenterId);
        console.log('✅ Centro preseleccionado:', userCenter.name);
      }
    }
  }, [isAdmin, userCenterId, centers, form]);

  const uploadFiles = async (incidentId: string): Promise<string[]> => {
    if (attachments.length === 0) return [];

    const uploadedUrls: string[] = [];
    setIsUploading(true);

    for (const file of attachments) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('incidentId', incidentId);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          uploadedUrls.push(result.url);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }

    setIsUploading(false);
    return uploadedUrls;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: IncidentFormData) => {
    try {
      setIsSubmitting(true);

      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear incidencia');
      }

      const incident = await response.json();

      // Subir archivos si los hay
      if (attachments.length > 0) {
        const uploadedUrls = await uploadFiles(incident.id);
        
        if (uploadedUrls.length > 0) {
          await fetch(`/api/incidents/${incident.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({
              evidenceFiles: uploadedUrls,
            }),
          });
        }
      }

      toast({
        title: "Incidencia creada",
        description: `Número: ${incident.incidentNumber || incident.id}`,
      });
      
      form.reset();
      setAttachments([]);
      setLocation('/');
      
    } catch (error) {
      console.error("Error completo:", error);
      toast({
        title: "Error al crear incidencia",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 border-red-300 bg-red-50';
      case 'high': return 'text-orange-600 border-orange-300 bg-orange-50';
      case 'medium': return 'text-yellow-600 border-yellow-300 bg-yellow-50';
      case 'low': return 'text-green-600 border-green-300 bg-green-50';
      default: return 'text-gray-600 border-gray-300 bg-gray-50';
    }
  };

  // ✅ NUEVO: Obtener el nombre del centro del usuario para mostrarlo
  const userCenterName = !isAdmin && userCenterId 
    ? centers.find((c: any) => c.id === userCenterId)?.name 
    : null;

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver al Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Reportar Nueva Incidencia
            </h1>
            <p className="text-muted-foreground mt-2">
              Complete los detalles de la incidencia para su registro
            </p>
          </div>
        </div>

        {/* ✅ NUEVO: Alerta informativa para usuarios no admin */}
        {!isAdmin && userCenterName && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Centro asignado:</strong> {userCenterName}
              <br />
              <span className="text-xs text-blue-600">
                Las incidencias se reportarán automáticamente para este centro
              </span>
            </p>
          </div>
        )}

        {/* Formulario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Información de la Incidencia
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Información Básica */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold border-b pb-2">
                    Información Básica
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título del Incidente *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Describe brevemente el incidente"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción Detallada</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describa el incidente con detalle: qué pasó, cuándo, dónde, personas involucradas..."
                            className="min-h-[120px]"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Clasificación */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold border-b pb-2">
                    Clasificación
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prioridad *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                            <FormControl>
                              <SelectTrigger className={field.value ? getPriorityColor(field.value) : ""}>
                                <SelectValue placeholder="Seleccionar prioridad" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low" className="text-green-600">Baja</SelectItem>
                              <SelectItem value="medium" className="text-yellow-600">Media</SelectItem>
                              <SelectItem value="high" className="text-orange-600">Alta</SelectItem>
                              <SelectItem value="critical" className="text-red-600">Crítica</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="typeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Incidencia *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || typesLoading}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={typesLoading ? "Cargando..." : "Seleccionar tipo"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {incidentTypes.map((type: any) => (
                                <SelectItem key={type.id} value={type.id}>
                                  {type.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* ✅ MODIFICADO: Campo de centro con lógica condicional */}
                  <FormField
                    control={form.control}
                    name="centerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Centro de Trabajo *</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value} 
                          disabled={isSubmitting || centersLoading || !isAdmin} // ✅ Deshabilitado si no es admin
                        >
                          <FormControl>
                            <SelectTrigger className={!isAdmin ? "bg-gray-100 cursor-not-allowed" : ""}>
                              <SelectValue 
                                placeholder={
                                  centersLoading 
                                    ? "Cargando..." 
                                    : !isAdmin && userCenterName 
                                      ? userCenterName 
                                      : "Seleccionar centro"
                                } 
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isAdmin ? (
                              // ✅ Admin ve todos los centros
                              centers.map((center: any) => (
                                <SelectItem key={center.id} value={center.id}>
                                  {center.name} ({center.code})
                                </SelectItem>
                              ))
                            ) : (
                              // ✅ No admin solo ve su centro (preseleccionado y deshabilitado)
                              userCenterId && (
                                <SelectItem value={userCenterId}>
                                  {userCenterName}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                        {!isAdmin && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Centro asignado automáticamente según tu perfil
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Archivos Adjuntos */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">
                    Evidencias (Opcional)
                  </h3>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      multiple
                      accept="image/*,application/pdf,.txt"
                      className="hidden"
                      disabled={isSubmitting || isUploading}
                    />
                    
                    <div className="text-center">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting || isUploading}
                      >
                        Seleccionar Archivos
                      </Button>
                      <p className="text-sm text-muted-foreground mt-2">
                        Formatos aceptados: Imágenes, PDF, TXT (máx. 5MB por archivo)
                      </p>
                    </div>
                  </div>

                  {/* Lista de archivos seleccionados */}
                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Archivos seleccionados:</p>
                      <div className="space-y-2">
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm truncate flex-1">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              disabled={isSubmitting || isUploading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Botones de acción */}
                <div className="flex gap-4 pt-6 border-t">
                  <Button
                    type="submit"
                    disabled={isSubmitting || isUploading}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Creando...' : isUploading ? 'Subiendo archivos...' : 'Crear Incidencia'}
                  </Button>
                  <Link href="/">
                    <Button type="button" variant="outline" disabled={isSubmitting || isUploading}>
                      Cancelar
                    </Button>
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}