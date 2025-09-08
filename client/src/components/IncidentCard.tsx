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
  Calendar
} from "lucide-react";

interface IncidentCardProps {
  incident: any;
  showType?: string;
}

export function IncidentCard({ incident, showType }: IncidentCardProps) {
  const [showDetail, setShowDetail] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pending_approval': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'assigned': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'reported': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'pending_approval': return <AlertCircle className="h-4 w-4" />;
      case 'assigned': return <Users className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'reported': 'Reportada',
      'assigned': 'Asignada',
      'in_progress': 'En Progreso',
      'pending_approval': 'Pendiente Aprobación',
      'completed': 'Completada',
      'closed': 'Cerrada'
    };
    return statusMap[status] || status;
  };

  return (
    <>
      <Card className="w-full hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">
                  {incident.incidentNumber || `INC-${incident.id}`}
                </h3>
                {showType && (
                  <Badge variant="outline" className="text-xs">
                    {showType}
                  </Badge>
                )}
              </div>
              <h4 className="font-medium text-foreground mb-2">
                {incident.title}
              </h4>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {incident.description}
              </p>
            </div>
          </div>

          {/* Badges de estado y prioridad */}
          <div className="flex items-center gap-2 mb-4">
            <Badge className={getStatusColor(incident.status)}>
              <div className="flex items-center gap-1">
                {getStatusIcon(incident.status)}
                {getStatusText(incident.status)}
              </div>
            </Badge>
            <div className={`w-3 h-3 rounded-full ${getPriorityColor(incident.priority)}`} 
                 title={`Prioridad: ${incident.priority}`} />
          </div>

          {/* Información adicional */}
          <div className="space-y-2 text-sm text-muted-foreground mb-4">
            {incident.center && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Centro: {incident.center.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(incident.createdAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            {incident.assignee && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>
                  Asignado a: {incident.assignee.firstName} {incident.assignee.lastName}
                </span>
              </div>
            )}
          </div>

          {/* Botón para ver detalles */}
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              data-testid={`button-view-incident-${incident.id}`}
              onClick={() => setShowDetail(true)}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Ver Detalles
            </Button>
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
    </>
  );
}