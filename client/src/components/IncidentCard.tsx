// client/src/components/IncidentCard.tsx
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IncidentDetail } from "@/components/IncidentDetail";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Users, 
  FileText, 
  Eye,
  MapPin,
  Calendar,
  Trash2
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface IncidentCardProps {
  incident: any;
  showType?: string;
  onDelete?: (incidentId: number) => void;
}

export function IncidentCard({ incident, showType, onDelete }: IncidentCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critica': return 'bg-red-500';
      case 'alta': return 'bg-orange-500';
      case 'media': return 'bg-yellow-500';
      case 'baja': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completado': return 'text-green-600 bg-green-50 border-green-200';
      case 'en_proceso': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pendiente_aprovacion': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'asignado': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'reportado': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completado': return <CheckCircle2 className="h-3 w-3" />;
      case 'en_proceso': return <Clock className="h-3 w-3" />;
      case 'pendiente_aprobacion': return <AlertCircle className="h-3 w-3" />;
      case 'asignado': return <Users className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'reportado': 'Reportada',
      'asignado': 'Asignada',
      'en_proceso': 'En Progreso',
      'pendiente_aprobacion': 'Pendiente Aprobación',
      'completado': 'Completada',
      'cerrado': 'Cerrada'
    };
    return statusMap[status] || status;
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(incident.id);
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="w-full hover:shadow-md transition-shadow h-full flex flex-col">
        <CardContent className="p-4 flex flex-col h-full">
          {/* Header compacto */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <h3 className="font-semibold text-sm">
                {incident.incidentNumber || `INC-${incident.id}`}
              </h3>
              {showType && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {showType}
                </Badge>
              )}
            </div>
            <h4 className="font-medium text-sm text-foreground mb-1.5 line-clamp-2">
              {incident.title}
            </h4>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {incident.description}
            </p>
          </div>

          {/* Badges de estado y prioridad */}
          <div className="flex items-center gap-2 mb-3">
            <Badge className={`${getStatusColor(incident.status)} text-xs px-2 py-0.5`}>
              <div className="flex items-center gap-1">
                {getStatusIcon(incident.status)}
                <span className="text-xs">{getStatusText(incident.status)}</span>
              </div>
            </Badge>
            <div 
              className={`w-2.5 h-2.5 rounded-full ${getPriorityColor(incident.priority)}`} 
              title={`Prioridad: ${incident.priority}`} 
            />
          </div>

          {/* Información adicional compacta */}
          <div className="space-y-1.5 text-xs text-muted-foreground mb-3 flex-grow">
            {incident.center && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{incident.center.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {new Date(incident.createdAt).toLocaleDateString('es-ES', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            {incident.assignee && (
              <div className="flex items-center gap-1.5">
                <Users className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">
                  {incident.assignee.firstName} {incident.assignee.lastName}
                </span>
              </div>
            )}
          </div>

          {/* Botones de acciones compactos */}
          <div className="flex gap-1.5 mt-auto">
            <Button 
              variant="outline" 
              size="sm" 
              data-testid={`button-view-incident-${incident.id}`}
              onClick={() => setShowDetail(true)}
              className="flex-1 h-8 text-xs px-2"
            >
              <Eye className="h-3 w-3 mr-1" />
              Ver
            </Button>
            {onDelete && (
              <Button 
                variant="outline" 
                size="sm" 
                data-testid={`button-delete-incident-${incident.id}`}
                onClick={() => setShowDeleteDialog(true)}
                className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de detalles */}
      {showDetail && (
        <IncidentDetail
          incident={incident}
          onClose={() => setShowDetail(false)}
        />
      )}

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la incidencia{' '}
              <strong>{incident.incidentNumber || `INC-${incident.id}`}</strong>
              {' '}- {incident.title}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}