// client/src/pages/CreateIncident.tsx - VERSIÓN CORREGIDA COMPLETA
import { useState, useRef } from "react";
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
import { ArrowLeft, AlertTriangle, FileText, Upload, X, Building2, User, Calendar, Tag, MapPin } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

// Schema que coincide exactamente con el backend insertIncidentSchema
const incidentSchema = z.object({
  title: z.string().min(1, "El título debe tener al menos 5 caracteres"),
  description: z.string(),
  priority: z.enum(["low", "medium", "high", "critical"], {
    required_error: "Debe seleccionar una prioridad",
  }),
  typeId: z.string().min(1, "Debe seleccionar un tipo de incidencia"),
  centerId: z.string().min(1, "Debe seleccionar un centro"),
  // Solo campos que existen en el backend
});

type IncidentFormData = z.infer<typeof incidentSchema>;

export function CreateIncident() {
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

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

  // Obtener tipos de incidencia disponibles
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

  // Función simplificada para subir archivos sin progreso complejo
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
        } else {
          console.error(`Error uploading ${file.name}:`, response.status);
        }
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
      }
    }

    setIsUploading(false);
    return uploadedUrls;
  };

  // Función para manejar archivos
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'application/pdf', 'text/plain'
    ];
    
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast({
          title: "Archivo muy grande",
          description: `${file.name} excede 10MB`,
          variant: "destructive",
        });
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Tipo no permitido",
          description: `${file.name} no es válido`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    setAttachments(prev => [...prev, ...validFiles]);
    
    if (event.target) {
      event.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Función principal de envío
  const onSubmit = async (data: IncidentFormData) => {
    setIsSubmitting(true);
    try {
      console.log("=== CREANDO INCIDENCIA ===");
      console.log("Datos del formulario:", data);
      console.log("Usuario actual:", user);

      // 1. Crear incidencia con los campos exactos del backend
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(data), // Solo enviar los campos del schema
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const incident = await response.json();
      console.log("Incidencia creada:", incident);

      // 2. Subir archivos si los hay
      if (attachments.length > 0) {
        console.log("Subiendo archivos...");
        const uploadedUrls = await uploadFiles(incident.id);
        
        if (uploadedUrls.length > 0) {
          console.log("Actualizando incidencia con archivos:", uploadedUrls);
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
              <div className="space-y-8">
                
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
                        <FormLabel>Descripción Detallada *</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="centerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Centro de Trabajo *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || centersLoading}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={centersLoading ? "Cargando..." : "Seleccionar centro"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {centers.map((center: any) => (
                              <SelectItem key={center.id} value={center.id}>
                                {center.name} ({center.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Upload className="h-4 w-4 mr-2" />
                        Seleccionar Archivos
                      </Button>
                      <p className="text-sm text-gray-500 mt-2">
                        Imágenes, PDF o documentos de texto (máximo 10MB)
                      </p>
                    </div>
                  </div>

                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Archivos seleccionados ({attachments.length}):</h4>
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            disabled={isSubmitting || isUploading}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Información del Reportero */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Reportado por
                  </h3>
                  <p className="text-sm">
                    {user?.firstName} {user?.lastName} ({user?.email})
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date().toLocaleDateString('es-ES')} a las {new Date().toLocaleTimeString('es-ES')}
                  </p>
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-4 pt-6 border-t">
                  <Link href="/">
                    <Button type="button" variant="outline" disabled={isSubmitting || isUploading}>
                      Cancelar
                    </Button>
                  </Link>
                  <Button 
                    type="button" 
                    disabled={isSubmitting || isUploading} 
                    className="min-w-[150px]"
                    onClick={form.handleSubmit(onSubmit)}
                  >
                    {isSubmitting || isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {isUploading ? 'Subiendo...' : 'Creando...'}
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Crear Incidencia
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}