// client/src/pages/UserDashboard.tsx - Versión corregida

import React from 'react';
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Users, 
  ClipboardCheck,
  AlertTriangle,
  TrendingUp,
  Calendar
} from "lucide-react";
import { Link } from "wouter";
import { IncidentCard } from "@/components/IncidentCard";
import { ActionPlanCard } from "@/components/ActionPlanCard";

export function UserDashboard() {
  const { user } = useAuth();
  
  // Obtener incidencias reportadas por el usuario
  const { data: myReportedIncidents, isLoading: loadingReported } = useQuery({
    queryKey: ['/api/incidents/my'],
    queryFn: async () => {
      const response = await apiRequest('/api/incidents/my', {
        method: 'GET',
      });
      if (!response.ok) {
        throw new Error('Error fetching reported incidents');
      }
      return response.json();
    },
    enabled: !!user,
    retry: false,
  });

  // Obtener incidencias asignadas al usuario
  const { data: myAssignedIncidents, isLoading: loadingAssigned } = useQuery({
    queryKey: ['/api/incidents/assigned'],
    queryFn: async () => {
      const response = await apiRequest('/api/incidents/assigned', {
        method: 'GET',
      });
      if (!response.ok) {
        throw new Error('Error fetching assigned incidents');
      }
      return response.json();
    },
    enabled: !!user,
    retry: false,
  });

  // Obtener planes de acción asignados al usuario
  const { data: myActionPlans, isLoading: loadingActionPlans } = useQuery({
    queryKey: ['/api/action-plans/assigned'],
    queryFn: async () => {
      const response = await apiRequest('/api/action-plans/assigned', {
        method: 'GET',
      });
      if (!response.ok) {
        throw new Error('Error fetching assigned action plans');
      }
      return response.json();
    },
    enabled: !!user,
    retry: false,
  });

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
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-blue-600';
      case 'pending_approval': return 'text-orange-600';
      case 'assigned': return 'text-purple-600';
      case 'reported': return 'text-gray-600';
      default: return 'text-gray-600';
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

  // Estadísticas combinadas
  const allIncidents = [...(myReportedIncidents || []), ...(myAssignedIncidents || [])];
  const uniqueIncidents = allIncidents.filter((incident, index, self) => 
    index === self.findIndex(i => i.id === incident.id)
  );

  // Estadísticas de planes de acción
  const actionPlansStats = {
    total: myActionPlans?.length || 0,
    pending: myActionPlans?.filter((p: any) => p.status === 'pending').length || 0,
    inProgress: myActionPlans?.filter((p: any) => p.status === 'in_progress').length || 0,
    completed: myActionPlans?.filter((p: any) => p.status === 'completed').length || 0,
    overdue: myActionPlans?.filter((p: any) => 
      p.status !== 'completed' && new Date(p.dueDate) < new Date()
    ).length || 0,
    asResponsible: myActionPlans?.filter((p: any) => p.userRole === 'assignee').length || 0,
    asParticipant: myActionPlans?.filter((p: any) => p.userRole === 'participant').length || 0,
  };

  if (!user) {
    return <div>Cargando...</div>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Mi Dashboard</h1>
          <p className="text-muted-foreground">
            Bienvenido, {user.firstName} {user.lastName}
          </p>
        </div>

        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Incidencias</p>
                  <p className="text-2xl font-bold">{uniqueIncidents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <ClipboardCheck className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Planes de Acción</p>
                  <p className="text-2xl font-bold">{actionPlansStats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">En Progreso</p>
                  <p className="text-2xl font-bold">{actionPlansStats.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className={`h-8 w-8 ${actionPlansStats.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Vencidos</p>
                  <p className="text-2xl font-bold">{actionPlansStats.overdue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contenido principal con tabs */}
        <Tabs defaultValue="action-plans" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="action-plans" className="relative">
              Planes de Acción
              {actionPlansStats.total > 0 && (
                <Badge className="ml-2 px-1.5 py-0.5 text-xs">
                  {actionPlansStats.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="incidents" className="relative">
              Incidencias
              {uniqueIncidents.length > 0 && (
                <Badge className="ml-2 px-1.5 py-0.5 text-xs">
                  {uniqueIncidents.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab de Planes de Acción */}
          <TabsContent value="action-plans" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" />
                    Mis Planes de Acción
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {loadingActionPlans ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : actionPlansStats.total === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">
                        No tienes planes de acción asignados
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Aquí aparecerán los planes de acción donde seas responsable o participante.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {/* Filtros rápidos */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant={actionPlansStats.overdue > 0 ? "destructive" : "secondary"}>
                        Vencidos: {actionPlansStats.overdue}
                      </Badge>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                        Pendientes: {actionPlansStats.pending}
                      </Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                        En Progreso: {actionPlansStats.inProgress}
                      </Badge>
                      <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
                        Completados: {actionPlansStats.completed}
                      </Badge>
                    </div>

                    {/* Lista de planes de acción */}
                    <div className="grid gap-4">
                      {myActionPlans
                        ?.sort((a: any, b: any) => {
                          // Priorizar planes vencidos y en progreso
                          const aOverdue = a.status !== 'completed' && new Date(a.dueDate) < new Date();
                          const bOverdue = b.status !== 'completed' && new Date(b.dueDate) < new Date();
                          
                          if (aOverdue && !bOverdue) return -1;
                          if (!aOverdue && bOverdue) return 1;
                          
                          // Luego por estado (en progreso primero)
                          const statusOrder = { 'in_progress': 0, 'pending': 1, 'completed': 2, 'cancelled': 3 };
                          const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 4;
                          const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 4;
                          
                          if (aOrder !== bOrder) return aOrder - bOrder;
                          
                          // Finalmente por fecha de vencimiento
                          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                        })
                        .map((actionPlan: any) => (
                          <ActionPlanCard key={actionPlan.id} actionPlan={actionPlan} />
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumen de roles */}
            {actionPlansStats.total > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Users className="h-6 w-6 text-purple-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Como Responsable</p>
                          <p className="text-xl font-bold">{actionPlansStats.asResponsible}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        Responsable
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <TrendingUp className="h-6 w-6 text-blue-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Como Participante</p>
                          <p className="text-xl font-bold">{actionPlansStats.asParticipant}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Participante
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Tab de Incidencias */}
          <TabsContent value="incidents" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Incidencias reportadas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Incidencias Reportadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingReported ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : myReportedIncidents?.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No has reportado incidencias</p>
                      <Link href="/incidents/new">
                        <Button className="mt-4" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Reportar Incidencia
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myReportedIncidents?.slice(0, 3).map((incident: any) => (
                        <IncidentCard key={incident.id} incident={incident} showActions={false} />
                      ))}
                      {myReportedIncidents?.length > 3 && (
                        <Link href="/incidents">
                          <Button variant="outline" size="sm" className="w-full">
                            Ver todas las incidencias reportadas
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Incidencias asignadas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Incidencias Asignadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingAssigned ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : myAssignedIncidents?.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No tienes incidencias asignadas</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myAssignedIncidents?.slice(0, 3).map((incident: any) => (
                        <IncidentCard key={incident.id} incident={incident} showActions={true} />
                      ))}
                      {myAssignedIncidents?.length > 3 && (
                        <Link href="/incidents">
                          <Button variant="outline" size="sm" className="w-full">
                            Ver todas las incidencias asignadas
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Resumen general */}
        {(uniqueIncidents.length > 0 || actionPlansStats.total > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumen de Actividad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Incidencias</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-medium">{uniqueIncidents.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Activas:</span>
                      <span className="font-medium">
                        {uniqueIncidents.filter(i => !['completed', 'closed'].includes(i.status)).length}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Planes de Acción</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-medium">{actionPlansStats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completados:</span>
                      <span className="font-medium">{actionPlansStats.completed}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Atención Requerida</h4>
                  <div className="space-y-1 text-sm">
                    {actionPlansStats.overdue > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-red-800">
                          {actionPlansStats.overdue} plan{actionPlansStats.overdue !== 1 ? 'es' : ''} vencido{actionPlansStats.overdue !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    {actionPlansStats.inProgress > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-800">
                          {actionPlansStats.inProgress} plan{actionPlansStats.inProgress !== 1 ? 'es' : ''} en progreso
                        </span>
                      </div>
                    )}
                    {actionPlansStats.overdue === 0 && actionPlansStats.inProgress === 0 && actionPlansStats.pending === 0 && actionPlansStats.total > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-green-800">
                          Todos los planes están completados
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}