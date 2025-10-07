import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { AlertTriangle, Trash2, FileText, Users, ClipboardList, History } from 'lucide-react';


interface Incident {
  id: string;
  incidentNumber: string;
  title: string;
  status: string;
  center?: { name: string; code: string; };
  type?: { name: string; };
  actionPlans?: any[];
  participants?: any[];
}

interface DeleteIncidentDialogProps {
  incident: Incident;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteIncidentDialog({ 
  incident, 
  open, 
  onOpenChange,
  onSuccess 
}: DeleteIncidentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteIncidentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/incidents/${incident.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al eliminar la incidencia');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Incidencia eliminada',
        description: `La incidencia ${incident.incidentNumber} fue eliminada exitosamente`,
      });
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['/api/incidents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/incidents/assigned'] });
      
      onOpenChange(false);
      
      // Llamar callback de éxito si existe
      if (onSuccess) {
        onSuccess();
      } else {
        // Si no hay callback, redirigir a la lista de incidencias
        setLocation('/incidents');
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteIncidentMutation.mutateAsync();
    } finally {
      setIsDeleting(false);
    }
  };

  const actionPlansCount = incident.actionPlans?.length || 0;
  const participantsCount = incident.participants?.length || 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            ¿Eliminar incidencia?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Esta acción es <span className="font-semibold text-red-600">permanente e irreversible</span>. 
            Se eliminará toda la información relacionada con esta incidencia.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Información de la incidencia */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Incidencia a eliminar:
            </h4>
            <div className="space-y-2 text-sm text-red-800">
              <p><span className="font-medium">Número:</span> {incident.incidentNumber}</p>
              <p><span className="font-medium">Título:</span> {incident.title}</p>
              {incident.center && (
                <p><span className="font-medium">Centro:</span> {incident.center.name} ({incident.center.code})</p>
              )}
              {incident.type && (
                <p><span className="font-medium">Tipo:</span> {incident.type.name}</p>
              )}
              <p><span className="font-medium">Estado:</span> {incident.status}</p>
            </div>
          </div>

          {/* Advertencia sobre datos relacionados */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h5 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Los siguientes datos serán eliminados permanentemente:
            </h5>
            <div className="space-y-2 text-sm text-yellow-800">
              <div className="flex items-start gap-2">
                <ClipboardList className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">
                    {actionPlansCount} {actionPlansCount === 1 ? 'Plan de acción' : 'Planes de acción'}
                  </span>
                  {actionPlansCount > 0 && (
                    <p className="text-xs text-yellow-700 mt-1">
                      Incluyendo todas sus tareas, participantes, comentarios y evidencias
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  {participantsCount} {participantsCount === 1 ? 'Participante' : 'Participantes'}
                </span>
              </div>
              
              <div className="flex items-start gap-2">
                <History className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Todo el historial de cambios y seguimiento</span>
              </div>
              
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Todos los comentarios y archivos adjuntos</span>
              </div>
            </div>
          </div>

          {/* Mensaje crítico */}
          <div className="bg-red-100 border-2 border-red-300 rounded-lg p-3">
            <p className="text-sm font-semibold text-red-900 text-center">
              ⚠️ Esta acción NO se puede deshacer ⚠️
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Incidencia
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}