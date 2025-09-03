// client/src/pages/CreateIncident.tsx
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
import { ArrowLeft, AlertTriangle, FileText, Upload, X, Building2, User, Calendar, Tag } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

// Schema de validación
const incidentSchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  priority: z.enum(["low", "medium", "high", "critical"], {
    required_error: "Debe seleccionar una prioridad",
  }),
   incidentType: z.string().optional(),
  centerId: z.string().min(1, "Debe seleccionar un centro"),
  location: z.string().min(3, "La ubicación debe tener al menos 3 caracteres"),
  incidentDate: z.string().min(1, "Debe seleccionar una fecha"),
  reportedBy: z.string().optional(),
});

type IncidentFormData = z.infer<typeof incidentSchema>;

export function CreateIncident() {
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
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

  // Tipos de incidencia predefinidos
  const incidentTypes = [
    { id: "accident", label: "Accidente Laboral" },
    { id: "near_miss", label: "Casi Accidente" },
    { id: "equipment", label: "Falla de Equipo" },
    { id: "environmental", label: "Incidente Ambiental" },
    { id: "security", label: "Incidente de Seguridad" },
    { id: "quality", label: "No Conformidad de Calidad" },
    { id: "other", label: "Otro" }
  ];

  const form = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: undefined,
      incidentType: "",
      centerId: "",
      location: "",
      incidentDate: new Date().toISOString().split('T')[0],
      reportedBy: `${user?.firstName} ${user?.lastName}` || "",
    },
  });

  // Función para manejar archivos
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validar tamaño (max 5MB por archivo)
    const maxSize = 5 * 1024 * 1024;
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast({
          title: "Archivo muy grande",
          description: `${file.name} excede el límite de 5MB`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    // Validar tipos de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
    const filteredFiles = validFiles.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Tipo de archivo no permitido",
          description: `${file.name} no es un tipo de archivo válido`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    setAttachments(prev => [...prev, ...filteredFiles]);
  };

  // Función para remover archivo
  const removeFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Función para subir archivos
  const uploadFiles = async (incidentId: string): Promise<string[]> => {
    if (attachments.length === 0) return [];

    const uploadedUrls: string[] = [];

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
          const { url } = await response.json();
          uploadedUrls.push(url);
        } else {
          throw new Error(`Error uploading ${file.name}`);
        }
      } catch (error) {
        toast({
          title: "Error al subir archivo",
          description: `No se pudo subir ${file.name}`,
          variant: "destructive",
        });
      }
    }

    return uploadedUrls;
  };

  const onSubmit = async (data: IncidentFormData) => {
    setIsSubmitting(true);
    try {
      // 1. Crear incidencia
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          ...data,
          status: 'reported',
          reportedById: user?.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al crear incidencia");
      }

      const { incident } = await response.json();

      // 2. Subir archivos si los hay
      if (attachments.length > 0) {
        await uploadFiles(incident.id);
      }

      toast({
        title: "Incidencia creada exitosamente",
        description: `Incidencia ${incident.incidentNumber} ha sido registrada`,
      });
      
      setLocation('/');
      
    } catch (error) {
      toast({
        title: "Error al crear incidencia",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
              Complete los detalles de la incidencia para su registro y seguimiento
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Información de la Incidencia
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Información Básica */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Información Básica</h3>
                  
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título de la Incidencia *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: Derrame de químico en área de producción"
                            {...field}
                            disabled={isSubmitting}
                            className="transition-all duration-200 focus:ring-2 focus:ring-primary focus:border-transparent"
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
                            placeholder="Describa en detalle lo ocurrido, incluyendo causas posibles, personas afectadas, etc."
                            {...field}
                            disabled={isSubmitting}
                            rows={4}
                            className="resize-none transition-all duration-200 focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Clasificación y Ubicación */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Clasificación y Ubicación</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prioridad *</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={isSubmitting}
                          >
                            <FormControl>
                              <SelectTrigger className={`transition-all duration-200 ${field.value ? getPriorityColor(field.value) : ''}`}>
                                <SelectValue placeholder="Seleccionar prioridad..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                  Baja
                                </div>
                              </SelectItem>
                              <SelectItem value="medium">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                  Media
                                </div>
                              </SelectItem>
                              <SelectItem value="high">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                  Alta
                                </div>
                              </SelectItem>
                              <SelectItem value="critical">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                  Crítica
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="incidentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Incidencia</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={isSubmitting}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar tipo..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {incidentTypes.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  <div className="flex items-center gap-2">
                                    <Tag className="h-4 w-4" />
                                    {type.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="centerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Centro *</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={isSubmitting || centersLoading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={
                                  centersLoading ? "Cargando centros..." : "Seleccionar centro..."
                                } />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {centers.map((center: any) => (
                                <SelectItem key={center.id} value={center.id}>
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    {center.name} - {center.code}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ubicación Específica *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: Línea de producción 2, Almacén A"
                              {...field}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Información Temporal y Reporte */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Información del Reporte</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="incidentDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha de la Incidencia *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="date"
                                className="pl-10"
                                {...field}
                                disabled={isSubmitting}
                                max={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reportedBy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reportado Por</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Nombre del reportante"
                                className="pl-10"
                                {...field}
                                disabled={isSubmitting}
                                readOnly
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Archivos Adjuntos */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Archivos Adjuntos</h3>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isSubmitting}
                          className="flex items-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Seleccionar Archivos
                        </Button>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        PNG, JPG, GIF, PDF hasta 5MB cada uno
                      </p>
                    </div>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {/* Lista de archivos seleccionados */}
                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Archivos Seleccionados:</h4>
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="font-medium text-sm">{file.name}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            disabled={isSubmitting}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Botones de Acción */}
                <div className="flex gap-4 pt-6 border-t">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Crear Incidencia
                      </>
                    )}
                  </Button>
                  
                  <Link href="/">
                    <Button 
                      type="button" 
                      variant="outline"
                      disabled={isSubmitting}
                      className="px-8"
                    >
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