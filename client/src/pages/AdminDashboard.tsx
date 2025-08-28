import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { 
  Building2, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus,
  Users,
  TrendingUp,
  Calendar,
  BarChart3,
  Globe,
  Settings
} from "lucide-react";
import { Link } from "wouter";

export function AdminDashboard() {
  const { user } = useAuth();
  const [selectedCenter, setSelectedCenter] = useState<string>("");
  
  // Obtener estadísticas globales
  const { data: globalStats = {}, isLoading: globalLoading } = useQuery({
    queryKey: ['/api/dashboard/global-stats'],
    enabled: !!user,
  });

  // Obtener todos los centros
  const { data: centers = [], isLoading: centersLoading } = useQuery({
    queryKey: ['/api/centers'],
    enabled: !!user,
  });

  // Obtener incidencias del centro seleccionado
  const { data: centerIncidents, isLoading: incidentsLoading } = useQuery({
    queryKey: ['/api/incidents/center', selectedCenter],
    enabled: !!selectedCenter,
  });

  // Obtener estadísticas del centro seleccionado
  const { data: centerStats = {}, isLoading: centerStatsLoading } = useQuery({
    queryKey: ['/api/dashboard/center-stats', selectedCenter],
    enabled: !!selectedCenter,
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

  if (globalLoading || centersLoading) {
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

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
              Dashboard Administrativo
            </h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Vista completa del sistema de incidencias
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/settings">
              <Button variant="outline" className="flex items-center gap-2" data-testid="button-settings">
                <Settings className="h-4 w-4" />
                Configuración
              </Button>
            </Link>
            <Link href="/incidents/new">
              <Button className="flex items-center gap-2" data-testid="button-new-incident">
                <Plus className="h-4 w-4" />
                Nueva Incidencia
              </Button>
            </Link>
          </div>
        </div>

        {/* Global Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Global</p>
                  <p className="text-2xl font-bold" data-testid="stat-global-total">
                    {globalStats?.totalIncidents || 0}
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
                  <p className="text-sm text-muted-foreground">En Progreso</p>
                  <p className="text-2xl font-bold text-blue-600" data-testid="stat-global-in-progress">
                    {globalStats?.inProgress || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Críticas</p>
                  <p className="text-2xl font-bold text-red-600" data-testid="stat-global-critical">
                    {globalStats?.critical || 0}
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
                  <p className="text-sm text-muted-foreground">Centros Activos</p>
                  <p className="text-2xl font-bold" data-testid="stat-active-centers">
                    {globalStats?.activeCenters || 0}
                  </p>
                </div>
                <Building2 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completadas</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="stat-global-completed">
                    {globalStats?.completed || 0}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center Selection and Analysis */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">
              Resumen General
            </TabsTrigger>
            <TabsTrigger value="centers" data-testid="tab-centers">
              Análisis por Centro
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">
              Reportes
            </TabsTrigger>
            <TabsTrigger value="management" data-testid="tab-management">
              Gestión
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Critical Incidents Across All Centers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Incidencias Críticas Globales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {globalStats?.criticalIncidents?.slice(0, 5).map((incident: any) => (
                      <div key={incident.id} className="flex items-center justify-between p-3 border border-red-200 bg-red-50 dark:bg-red-950/20 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{incident.incidentNumber}</p>
                          <p className="text-xs text-muted-foreground">{incident.center?.name}</p>
                        </div>
                        <Badge className="bg-red-500 text-white">CRÍTICA</Badge>
                      </div>
                    )) || (
                      <div className="text-center py-4 text-muted-foreground">
                        No hay incidencias críticas
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Performing Centers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Centros con Mejor Rendimiento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {globalStats?.topCenters?.slice(0, 5).map((center: any, index: number) => (
                      <div key={center.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{center.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {center.completedIncidents} resueltas
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">
                            {center.resolutionRate}%
                          </p>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-4 text-muted-foreground">
                        Cargando datos...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="centers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Análisis Detallado por Centro</CardTitle>
                <div className="flex items-center gap-4">
                  <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                    <SelectTrigger className="w-64" data-testid="select-center-analysis">
                      <SelectValue placeholder="Seleccionar centro para análisis..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(centers as any[])?.filter(center => center?.id && center?.name)?.map((center: any) => (
                        <SelectItem key={center.id} value={center.id}>
                          {center.name} - {center.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCenter && (
                    <Link href={`/centers/${selectedCenter}`}>
                      <Button variant="outline" size="sm">
                        Ver Detalles Completos
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedCenter ? (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Selecciona un Centro
                    </h3>
                    <p className="text-muted-foreground">
                      Elige un centro de la lista para ver su análisis detallado
                    </p>
                  </div>
                ) : incidentsLoading || centerStatsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Cargando datos del centro...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Center Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="p-4 border border-border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-xl font-bold">{centerStats?.totalIncidents || 0}</p>
                      </div>
                      <div className="p-4 border border-border rounded-lg">
                        <p className="text-sm text-muted-foreground">En Progreso</p>
                        <p className="text-xl font-bold text-blue-600">{centerStats?.inProgress || 0}</p>
                      </div>
                      <div className="p-4 border border-border rounded-lg">
                        <p className="text-sm text-muted-foreground">Críticas</p>
                        <p className="text-xl font-bold text-red-600">{centerStats?.critical || 0}</p>
                      </div>
                      <div className="p-4 border border-border rounded-lg">
                        <p className="text-sm text-muted-foreground">Tasa de Resolución</p>
                        <p className="text-xl font-bold text-green-600">{centerStats?.resolutionRate || 0}%</p>
                      </div>
                    </div>

                    {/* Recent Incidents */}
                    <div>
                      <h4 className="font-semibold mb-4">Incidencias Recientes</h4>
                      <div className="space-y-3">
                        {centerIncidents?.slice(0, 10).map((incident: any) => (
                          <div 
                            key={incident.id}
                            className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                            data-testid={`center-incident-${incident.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <Badge 
                                variant="outline" 
                                className={`${getPriorityColor(incident.priority)} text-white border-transparent`}
                              >
                                {incident.priority}
                              </Badge>
                              <div>
                                <p className="font-medium text-sm">{incident.incidentNumber}</p>
                                <p className="text-xs text-muted-foreground">{incident.title}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">
                                {new Date(incident.createdAt).toLocaleDateString('es-ES')}
                              </p>
                              <Link href={`/incidents/${incident.id}`}>
                                <Button variant="ghost" size="sm" className="text-xs">
                                  Ver
                                </Button>
                              </Link>
                            </div>
                          </div>
                        )) || (
                          <div className="text-center py-4 text-muted-foreground">
                            No hay incidencias en este centro
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Reportes por Mes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center py-8 text-muted-foreground">
                      Gráfico de incidencias por mes (próximamente)
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Estadísticas del Período
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Promedio Diario</span>
                      <span className="font-medium">{globalStats?.dailyAverage || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tiempo Promedio de Resolución</span>
                      <span className="font-medium">{globalStats?.avgResolutionTime || 'N/A'} días</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tasa de Resolución Global</span>
                      <span className="font-medium text-green-600">{globalStats?.globalResolutionRate || 0}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="management" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Centros</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Link href="/centers/new">
                      <Button className="w-full" data-testid="button-create-center">
                        <Building2 className="h-4 w-4 mr-2" />
                        Crear Nuevo Centro
                      </Button>
                    </Link>
                    <Link href="/centers">
                      <Button variant="outline" className="w-full" data-testid="button-manage-centers">
                        Gestionar Centros Existentes
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Usuarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Link href="/users">
                      <Button className="w-full" data-testid="button-manage-users">
                        <Users className="h-4 w-4 mr-2" />
                        Gestionar Usuarios
                      </Button>
                    </Link>
                    <Link href="/incident-types">
                      <Button variant="outline" className="w-full" data-testid="button-manage-incident-types">
                        Gestionar Tipos de Incidencia
                      </Button>
                    </Link>
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