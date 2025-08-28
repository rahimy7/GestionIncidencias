import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { 
  Building2, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus,
  Users,
  TrendingUp,
  Calendar
} from "lucide-react";
import { Link } from "wouter";

export function ManagerDashboard() {
  const { user } = useAuth();
  
  // Obtener incidencias del centro del manager
  const { data: centerIncidents, isLoading: incidentsLoading } = useQuery({
    queryKey: ['/api/incidents/center'],
    enabled: !!user,
  });

  // Obtener información del centro
  const { data: centerInfo, isLoading: centerLoading } = useQuery({
    queryKey: ['/api/centers/my'],
    enabled: !!user,
  });

  // Obtener estadísticas del centro
  const { data: centerStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/center-stats'],
    enabled: !!user,
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
      case 'reported': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  if (incidentsLoading || centerLoading || statsLoading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const pendingIncidents = centerIncidents?.filter((i: any) => 
    ['reported', 'assigned'].includes(i.status)
  ) || [];
  
  const criticalIncidents = centerIncidents?.filter((i: any) => 
    i.priority === 'critical' && i.status !== 'completed'
  ) || [];

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
              Dashboard de Gerencia
            </h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {centerInfo?.name || 'Centro de Trabajo'}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Incidencias</p>
                  <p className="text-2xl font-bold" data-testid="stat-total">
                    {centerStats?.totalIncidents || 0}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendientes</p>
                  <p className="text-2xl font-bold text-orange-600" data-testid="stat-pending">
                    {pendingIncidents.length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Críticas</p>
                  <p className="text-2xl font-bold text-red-600" data-testid="stat-critical">
                    {criticalIncidents.length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completadas</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="stat-completed">
                    {centerStats?.completedIncidents || 0}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Content */}
        <Tabs defaultValue="critical" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="critical" data-testid="tab-critical">
              Críticas ({criticalIncidents.length})
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pendientes ({pendingIncidents.length})
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all">
              Todas las Incidencias
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              Análisis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="critical" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Incidencias Críticas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {criticalIncidents.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No hay incidencias críticas pendientes
                    </h3>
                    <p className="text-muted-foreground">
                      Excelente trabajo manteniendo el centro seguro
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {criticalIncidents.map((incident: any) => (
                      <div 
                        key={incident.id}
                        className="border border-red-200 bg-red-50 dark:bg-red-950/20 rounded-lg p-4"
                        data-testid={`critical-incident-${incident.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-medium text-primary">
                                {incident.incidentNumber}
                              </span>
                              <Badge className="bg-red-500 text-white">
                                CRÍTICA
                              </Badge>
                            </div>
                            <h4 className="font-medium text-foreground mb-1">
                              {incident.title}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              {incident.description}
                            </p>
                            <div className="text-xs text-muted-foreground">
                              Reportado: {new Date(incident.createdAt).toLocaleDateString('es-ES')}
                            </div>
                          </div>
                          <Link href={`/incidents/${incident.id}`}>
                            <Button variant="destructive" size="sm">
                              Atender Urgente
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  Incidencias Pendientes de Atención
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingIncidents.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No hay incidencias pendientes
                    </h3>
                    <p className="text-muted-foreground">
                      Todas las incidencias están siendo atendidas
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingIncidents.map((incident: any) => (
                      <div 
                        key={incident.id}
                        className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        data-testid={`pending-incident-${incident.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-medium text-primary">
                                {incident.incidentNumber}
                              </span>
                              <Badge 
                                variant="outline" 
                                className={`${getPriorityColor(incident.priority)} text-white border-transparent`}
                              >
                                {incident.priority}
                              </Badge>
                            </div>
                            <h4 className="font-medium text-foreground mb-1">
                              {incident.title}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              Reportado por: {incident.reporter?.firstName || incident.reporter?.email}
                            </p>
                            <div className="text-xs text-muted-foreground">
                              {new Date(incident.createdAt).toLocaleDateString('es-ES')}
                            </div>
                          </div>
                          <Link href={`/incidents/${incident.id}`}>
                            <Button variant="outline" size="sm">
                              Asignar y Gestionar
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Todas las Incidencias del Centro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {centerIncidents?.map((incident: any) => (
                    <div 
                      key={incident.id}
                      className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      data-testid={`incident-${incident.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium text-primary">
                              {incident.incidentNumber}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`${getPriorityColor(incident.priority)} text-white border-transparent`}
                            >
                              {incident.priority}
                            </Badge>
                            <span className={`text-sm ${getStatusColor(incident.status)}`}>
                              {incident.status}
                            </span>
                          </div>
                          <h4 className="font-medium text-foreground mb-1">
                            {incident.title}
                          </h4>
                          <div className="text-xs text-muted-foreground">
                            {new Date(incident.createdAt).toLocaleDateString('es-ES')} - 
                            Reportado por: {incident.reporter?.firstName || incident.reporter?.email}
                          </div>
                        </div>
                        <Link href={`/incidents/${incident.id}`}>
                          <Button variant="outline" size="sm">
                            Ver Detalles
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Resumen del Mes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Incidencias Creadas</span>
                      <span className="font-medium">{centerStats?.monthlyCreated || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Incidencias Resueltas</span>
                      <span className="font-medium">{centerStats?.monthlyResolved || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tiempo Promedio de Resolución</span>
                      <span className="font-medium">{centerStats?.avgResolutionTime || 'N/A'} días</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Equipo de Trabajo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Usuarios Activos</span>
                      <span className="font-medium">{centerStats?.activeUsers || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reportes por Usuario</span>
                      <span className="font-medium">{centerStats?.avgReportsPerUser || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}