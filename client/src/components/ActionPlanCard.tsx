// client/src/components/ActionPlanCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, CheckCircle2, AlertCircle, User, Building2 } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

interface ActionPlan {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate: string;
  completedAt?: string | null;
  assignee: {
    name: string;
    email: string;
  };
  incident: {
    incidentNumber: string;
    title: string;
    center: {
      name: string;
      code: string;
    };
    type: {
      name: string;
    };
  };
  participants: Array<{
    user: {
      name: string;
      email: string;
    };
  }>;
  userRole: 'assignee' | 'participant';
}

interface ActionPlanCardProps {
  actionPlan: ActionPlan;
}

export function ActionPlanCard({ actionPlan }: ActionPlanCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'Pendiente',
      'in_progress': 'En Progreso',
      'completed': 'Completado',
      'overdue': 'Vencido'
    };
    return statusMap[status] || status;
  };

  const getPriorityIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const isOverdue = () => {
    if (actionPlan.status === 'completed') return false;
    return new Date(actionPlan.dueDate) < new Date();
  };

  const canUpdateStatus = () => {
    // Solo el responsable puede cambiar el estado
    return actionPlan.userRole === 'assignee' && actionPlan.status !== 'completed';
  };

  const getNextStatus = () => {
    switch (actionPlan.status) {
      case 'pending': return 'in_progress';
      case 'in_progress': return 'completed';
      default: return null;
    }
  };

  const getNextStatusText = () => {
    switch (actionPlan.status) {
      case 'pending': return 'Iniciar';
      case 'in_progress': return 'Completar';
      default: return null;
    }
  };

  const handleStatusUpdate = async () => {
    const nextStatus = getNextStatus();
    if (!nextStatus) return;

    setIsUpdating(true);
    try {
      await apiRequest(`/api/action-plans/${actionPlan.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: nextStatus,
          completedAt: nextStatus === 'completed' ? new Date().toISOString() : null
        })
      });

      // Invalidar queries para actualizar la UI
      queryClient.invalidateQueries({ queryKey: ['/api/action-plans/assigned'] });
    } catch (error) {
      console.error('Error updating action plan status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className={`transition-all hover:shadow-md ${isOverdue() ? 'border-red-200' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-foreground mb-2">
              {actionPlan.title}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{actionPlan.incident.center.name}</span>
              <span>•</span>
              <span>#{actionPlan.incident.incidentNumber}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Badge className={getStatusColor(actionPlan.status)}>
              {getPriorityIcon(actionPlan.status)}
              <span className="ml-1">{getStatusText(actionPlan.status)}</span>
            </Badge>
            {actionPlan.userRole === 'assignee' && (
              <Badge variant="outline" className="text-xs">
                Responsable
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {actionPlan.description}
        </p>

        {/* Información del incidente relacionado */}
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-sm font-medium text-foreground mb-1">
            Incidente: {actionPlan.incident.title}
          </p>
          <p className="text-xs text-muted-foreground">
            Tipo: {actionPlan.incident.type.name}
          </p>
        </div>

        {/* Fechas */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Vence: {new Date(actionPlan.dueDate).toLocaleDateString()}</span>
            {isOverdue() && (
              <Badge variant="destructive" className="text-xs">
                Vencido
              </Badge>
            )}
          </div>
          {actionPlan.completedAt && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Completado: {new Date(actionPlan.completedAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Responsable y participantes */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Responsable:</span>
            <span className="font-medium">{actionPlan.assignee.name}</span>
          </div>
          {actionPlan.participants.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Participantes:</span>
              <span className="text-xs">
                {actionPlan.participants.map(p => p.user.name).join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Acciones */}
        {canUpdateStatus() && (
          <div className="pt-2 border-t">
            <Button
              onClick={handleStatusUpdate}
              disabled={isUpdating}
              size="sm"
              className="w-full"
            >
              {isUpdating ? 'Actualizando...' : getNextStatusText()}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}