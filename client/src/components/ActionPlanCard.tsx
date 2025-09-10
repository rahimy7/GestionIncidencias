// client/src/components/ActionPlanCard.tsx - Actualización compatible

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, CheckCircle2, AlertCircle, User, Building2, ExternalLink, MessageSquare, ClipboardList } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { ActionPlanDetail } from "./ActionPlanDetail";

interface ActionPlan {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate: string;
  completedAt?: string | null;
  assignee: {
    name?: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  incident: {
    incidentNumber?: string;
    title: string;
    center: {
      name: string;
      code?: string;
    };
    type: {
      name: string;
    };
  };
  participants?: Array<{
    user: {
      name?: string;
      firstName?: string;
      lastName?: string;
      email: string;
    };
  }>;
  userRole: 'assignee' | 'participant' | 'responsible';
  _count?: {
    tasks?: number;
    completedTasks?: number;
    comments?: number;
  };
  progress?: number;
}

interface ActionPlanCardProps {
  actionPlan: ActionPlan;
}

export function ActionPlanCard({ actionPlan }: ActionPlanCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
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
    return (actionPlan.userRole === 'assignee' || actionPlan.userRole === 'responsible') && actionPlan.status !== 'completed';
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

  // Obtener el nombre del asignado
  const getAssigneeName = () => {
    if (actionPlan.assignee.name) return actionPlan.assignee.name;
    if (actionPlan.assignee.firstName && actionPlan.assignee.lastName) {
      return `${actionPlan.assignee.firstName} ${actionPlan.assignee.lastName}`;
    }
    return actionPlan.assignee.email;
  };

  // Obtener nombres de participantes
  const getParticipantNames = () => {
    if (!actionPlan.participants || actionPlan.participants.length === 0) return [];
    return actionPlan.participants.map(p => {
      if (p.user.name) return p.user.name;
      if (p.user.firstName && p.user.lastName) {
        return `${p.user.firstName} ${p.user.lastName}`;
      }
      return p.user.email;
    });
  };

  const getRoleDisplayText = (role: string) => {
    if (role === 'assignee' || role === 'responsible') return 'Responsable';
    return 'Participante';
  };

  const getRoleColor = (role: string) => {
    if (role === 'assignee' || role === 'responsible') {
      return 'bg-purple-100 text-purple-800';
    }
    return 'bg-blue-100 text-blue-800';
  };

  const tasksCount = actionPlan._count?.tasks || 0;
  const completedTasks = actionPlan._count?.completedTasks || 0;
  const commentsCount = actionPlan._count?.comments || 0;
  const progress = actionPlan.progress || (tasksCount > 0 ? (completedTasks / tasksCount) * 100 : 0);

  return (
    <>
      <Card className={`transition-all hover:shadow-md ${isOverdue() ? 'border-red-200 bg-red-50' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-lg truncate">{actionPlan.title}</CardTitle>
                {isOverdue() && (
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge className={getStatusColor(actionPlan.status)}>
                  {getStatusText(actionPlan.status)}
                </Badge>
                <Badge variant="outline" className={getRoleColor(actionPlan.userRole)}>
                  {getRoleDisplayText(actionPlan.userRole)}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {actionPlan.description}
              </p>

              {/* Información del incidente */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <h4 className="text-xs font-medium text-gray-700 mb-1">Incidencia Relacionada:</h4>
                <p className="text-sm font-medium">{actionPlan.incident.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>{actionPlan.incident.center.name}</span>
                  <span>•</span>
                  <span>{actionPlan.incident.type.name}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setIsDetailOpen(true)}
              variant="outline"
              size="sm"
              className="ml-3 flex-shrink-0"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Abrir
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {/* Responsable */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{getAssigneeName()}</p>
              <p className="text-xs text-muted-foreground">Responsable</p>
            </div>
            {actionPlan.participants && actionPlan.participants.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span>+{actionPlan.participants.length}</span>
              </div>
            )}
          </div>

          {/* Progreso de tareas */}
          {tasksCount > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Tareas</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {completedTasks}/{tasksCount}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Estadísticas rápidas */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              {tasksCount > 0 && (
                <div className="flex items-center gap-1">
                  <ClipboardList className="h-3 w-3" />
                  <span>{tasksCount} tareas</span>
                </div>
              )}
              {commentsCount > 0 && (
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>{commentsCount} comentarios</span>
                </div>
              )}
            </div>
          </div>

          {/* Fecha límite */}
          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className={`text-sm ${
                isOverdue() ? 'text-red-600 font-medium' : 'text-muted-foreground'
              }`}>
                {new Date(actionPlan.dueDate).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>

            {isOverdue() && (
              <Badge variant="destructive" className="text-xs">
                Vencido
              </Badge>
            )}
          </div>

          {/* Indicador de días restantes o completado */}
          {actionPlan.status === 'completed' && actionPlan.completedAt && (
            <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
              Completado: {new Date(actionPlan.completedAt).toLocaleDateString('es-ES')}
            </div>
          )}

          {!isOverdue() && actionPlan.status !== 'completed' && (
            <div className="text-xs text-muted-foreground">
              {(() => {
                const today = new Date();
                const dueDate = new Date(actionPlan.dueDate);
                const diffTime = dueDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 0) return '⏰ Vence hoy';
                if (diffDays === 1) return '⏰ Vence mañana';
                if (diffDays <= 7) return `⏰ Vence en ${diffDays} días`;
                return null;
              })()}
            </div>
          )}

          {/* Participantes */}
          {actionPlan.participants && actionPlan.participants.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Participantes:</h4>
              <p className="text-xs text-muted-foreground">
                {getParticipantNames().join(', ')}
              </p>
            </div>
          )}

          {/* Acciones rápidas */}
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

      {/* Modal de detalles - Solo si existe el componente ActionPlanDetail */}
      {typeof ActionPlanDetail !== 'undefined' && (
        <ActionPlanDetail
          actionPlanId={actionPlan.id}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          userRole={actionPlan.userRole === 'assignee' || actionPlan.userRole === 'responsible' ? 'responsible' : 'participant'}
        />
      )}
    </>
  );
}