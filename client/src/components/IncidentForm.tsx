import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Plus, Camera } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { UploadResult } from "@uppy/core";

const incidentSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().min(1, "La descripción es requerida"),
  centerId: z.string().min(1, "El centro es requerido"),
  typeId: z.string().min(1, "El tipo es requerido"),
  priority: z.enum(["low", "medium", "high", "critical"]),
});

type IncidentFormData = z.infer<typeof incidentSchema>;

export function IncidentForm() {
  const [evidenceFiles, setEvidenceFiles] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      priority: "medium",
    },
  });

  // Fetch centers
  const { data: centers } = useQuery({
    queryKey: ["/api/centers"],
    retry: false,
  });

  // Fetch incident types
  const { data: incidentTypes } = useQuery({
    queryKey: ["/api/incident-types"],
    retry: false,
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (data: IncidentFormData & { evidenceFiles: string[] }) => {
      const response = await apiRequest("POST", "/api/incidents", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Incidencia reportada correctamente",
      });
      form.reset();
      setEvidenceFiles([]);
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "No se pudo reportar la incidencia",
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
      const uploadedFiles: string[] = [];
      if (result.successful) {
        for (const file of result.successful) {
          if (file.uploadURL) {
            // Set ACL policy for the uploaded file
            const response = await apiRequest("PUT", "/api/evidence-files", {
              evidenceFileURL: file.uploadURL,
            });
            const data = await response.json();
            uploadedFiles.push(data.objectPath);
          }
        }
      }
      setEvidenceFiles(prev => [...prev, ...uploadedFiles]);
      toast({
        title: "Éxito",
        description: "Archivo subido correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al procesar el archivo subido",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: IncidentFormData) => {
    createIncidentMutation.mutate({
      ...data,
      evidenceFiles,
    });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          Reportar Nueva Incidencia
        </h3>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título de la Incidencia</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Describe brevemente la incidencia"
                      {...field}
                      data-testid="input-incident-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="centerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Centro/Tienda</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-center">
                          <SelectValue placeholder="Seleccionar centro..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(centers as any[])?.filter(center => center?.id && center?.name)?.map((center: any) => (
                          <SelectItem key={center.id} value={center.id}>
                            {center.name}
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
                name="typeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Incidencia</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-incident-type">
                          <SelectValue placeholder="Seleccionar tipo..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(incidentTypes as any[])?.filter(type => type?.id && type?.name)?.map((type: any) => (
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
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridad</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue placeholder="Seleccionar prioridad..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="critical">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Describe la incidencia detalladamente..."
                      {...field}
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Evidencia Fotográfica
              </label>
              <ObjectUploader
                maxNumberOfFiles={5}
                maxFileSize={10485760}
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handleUploadComplete}
                buttonClassName="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-primary/50 transition-colors bg-background"
              >
                <div className="flex flex-col items-center gap-2">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Haz clic para tomar foto o subir imagen
                  </p>
                  {evidenceFiles.length > 0 && (
                    <p className="text-xs text-primary">
                      {evidenceFiles.length} archivo(s) subido(s)
                    </p>
                  )}
                </div>
              </ObjectUploader>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => form.reset()}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createIncidentMutation.isPending}
                data-testid="button-submit"
              >
                {createIncidentMutation.isPending ? "Enviando..." : "Reportar Incidencia"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
