// client/src/pages/UserDashboard.tsx - Versión actualizada

import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FileText, Clock, CheckCircle2, AlertCircle, Plus, Users, ClipboardCheck } from "lucide-react";
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

  // NUEVO: Obtener planes de acción asignados al usuario
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
    ).length || 0
  };

  if (loadingReported || loadingAssigned || loadingActionPlans) {
    return (
      <Layout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
              Mi Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Gestiona tus incidencias y planes de acción
            </p>
          </div>
          <Link href="/incidents/new">
            <Button className="flex items-center gap-2" data-testid="button-new-incident">
              <Plus className="h-4 w-4" />
              Nueva Incidencia
            </Button>
          </Link>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Estadísticas de Incidencias */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Incidencias</p>
                  <p className="text-2xl font-bold">{uniqueIncidents.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">En Progreso</p>
                  <p className="text-2xl font-bold">
                    {uniqueIncidents.filter(i => i.status === 'in_progress').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completadas</p>
                  <p className="text-2xl font-bold">
                    {uniqueIncidents.filter(i => i.status === 'completed').length}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          {/* Estadísticas de Planes de Acción */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Planes Asignados</p>
                  <p className="text-2xl font-bold">{actionPlansStats.total}</p>
                </div>
                <ClipboardCheck className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Planes Pendientes</p>
                  <p className="text-2xl font-bold">{actionPlansStats.pending + actionPlansStats.inProgress}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vencidos</p>
                  <p className="text-2xl font-bold text-red-600">{actionPlansStats.overdue}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs para Incidencias y Planes de Acción */}
        <Tabs defaultValue="incidents" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="incidents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Incidencias ({uniqueIncidents.length})
            </TabsTrigger>
            <TabsTrigger value="action-plans" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Planes de Acción ({actionPlansStats.total})
              {actionPlansStats.overdue > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {actionPlansStats.overdue}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incidents" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Mis Incidencias</h2>
              <div className="text-sm text-muted-foreground">
                {uniqueIncidents.length} incidencia{uniqueIncidents.length !== 1 ? 's' : ''}
              </div>
            </div>

            {uniqueIncidents.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">
                    No tienes incidencias
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Aquí aparecerán las incidencias que reportes o que te sean asignadas.
                  </p>
                  <Link href="/incidents/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Reportar Incidencia
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {uniqueIncidents.map((incident) => (
                  <IncidentCard key={incident.id} incident={incident} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="action-plans" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Mis Planes de Acción</h2>
              <div className="text-sm text-muted-foreground">
                {actionPlansStats.total} plan{actionPlansStats.total !== 1 ? 'es' : ''}
                {actionPlansStats.overdue > 0 && (
                  <span className="text-red-600 ml-2">
                    • {actionPlansStats.overdue} vencido{actionPlansStats.overdue !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Filtros rápidos para planes de acción */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                Pendientes: {actionPlansStats.pending}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                En Progreso: {actionPlansStats.inProgress}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Completados: {actionPlansStats.completed}
              </Badge>
              {actionPlansStats.overdue > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Vencidos: {actionPlansStats.overdue}
                </Badge>
              )}
            </div>

            {!myActionPlans || myActionPlans.length === 0 ? (
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
              <div className="grid gap-4">
                {myActionPlans
                  .sort((a: any, b: any) => {
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
            )}
          </TabsContent>
        </Tabs>

        {/* Resumen rápido al final */}
        {(uniqueIncidents.length > 0 || actionPlansStats.total > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumen de Actividad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <span>Pendientes:</span>
                      <span className="font-medium">
                        {actionPlansStats.pending + actionPlansStats.inProgress}
                      </span>
                    </div>
                    {actionPlansStats.overdue > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Vencidos:</span>
                        <span className="font-medium">{actionPlansStats.overdue}</span>
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