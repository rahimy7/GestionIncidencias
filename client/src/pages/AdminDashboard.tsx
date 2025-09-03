// client/src/pages/AdminDashboard.tsx - OPTIMIZED VERSION
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useState, useMemo } from "react";
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

interface GlobalStats {
  totalIncidents: number;
  pendingIncidents: number;
  resolvedIncidents: number;
  totalCenters: number;
  dailyAverage: number;
  avgResolutionTime: string;
  globalResolutionRate: number;
  totalAdmins: number;
  totalManagers: number;
  totalUsers: number;
  mostActiveCenterName: string;
}

interface CenterStats {
  totalIncidents: number;
  pendingIncidents: number;
  resolvedIncidents: number;
  avgResolutionTime: string;
  resolutionRate: number;
}

export function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedCenter, setSelectedCenter] = useState<string>("");
  
  // Use parallel queries to load initial data faster
  const queries = useQueries({
    queries: [
      {
        queryKey: ['/api/dashboard/global-stats'],
        queryFn: async (): Promise<GlobalStats> => {
          const token = localStorage.getItem('auth_token');
          const response = await fetch('/api/dashboard/global-stats', {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!response.ok) throw new Error('Failed to load stats');
          return response.json();
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
      },
      {
        queryKey: ['/api/centers'],
        queryFn: async () => {
          const token = localStorage.getItem('auth_token');
          const response = await fetch('/api/centers', {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!response.ok) throw new Error('Failed to load centers');
          return response.json();
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 10, // 10 minutes cache for centers
      },
    ],
  });

  const [globalStatsQuery, centersQuery] = queries;
  const globalStats = globalStatsQuery.data || {} as GlobalStats;
  const centers = centersQuery.data || [];
  const globalLoading = globalStatsQuery.isLoading;
  const centersLoading = centersQuery.isLoading;

  // Only fetch center-specific data when a center is selected
  const INCIDENTS_LIMIT = 10;
  
  const { data: centerIncidents = [], isLoading: incidentsLoading } = useQuery({
    queryKey: ['/api/incidents/center', selectedCenter, INCIDENTS_LIMIT],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/incidents/center/${selectedCenter}?limit=${INCIDENTS_LIMIT}&offset=0`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Error al cargar incidencias');
      return response.json();
    },
    enabled: !!selectedCenter && !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes cache
  });

  const { data: centerStats = {} as CenterStats, isLoading: centerStatsLoading } = useQuery({
    queryKey: ['/api/dashboard/center-stats', selectedCenter],
    queryFn: async (): Promise<CenterStats> => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/dashboard/center-stats/${selectedCenter}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load center stats');
      return response.json();
    },
    enabled: !!selectedCenter && !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // Memoize expensive calculations
  const statsCards = useMemo(() => [
    {
      title: "Total Incidencias",
      value: globalStats.totalIncidents || 0,
      icon: FileText,
      color: "text-blue-600"
    },
    {
      title: "Pendientes",
      value: globalStats.pendingIncidents || 0,
      icon: Clock,
      color: "text-orange-600"
    },
    {
      title: "Resueltas",
      value: globalStats.resolvedIncidents || 0,
      icon: CheckCircle2,
      color: "text-green-600"
    },
    {
      title: "Centros Activos",
      value: globalStats.totalCenters || 0,
      icon: Building2,
      color: "text-purple-600"
    },
  ], [globalStats]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Show loading only for auth, other data can load progressively
  if (authLoading) {
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold">
                        {globalLoading ? (
                          <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                          stat.value
                        )}
                      </p>
                    </div>
                    <Icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Vista General</TabsTrigger>
            <TabsTrigger value="centers">Por Centro</TabsTrigger>
            <TabsTrigger value="reports">Reportes</TabsTrigger>
            <TabsTrigger value="management">Gestión</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Additional overview cards can go here */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Métricas Clave
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Promedio Diario</span>
                    <span className="font-medium">
                      {globalLoading ? '...' : (globalStats?.dailyAverage || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tiempo Promedio Resolución</span>
                    <span className="font-medium">
                      {globalLoading ? '...' : (globalStats?.avgResolutionTime || 'N/A')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tasa Resolución Global</span>
                    <span className="font-medium text-green-600">
                      {globalLoading ? '...' : `${globalStats?.globalResolutionRate || 0}%`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="centers" className="space-y-4">
            {/* Center Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Seleccionar Centro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={
                      centersLoading ? "Cargando centros..." : "Selecciona un centro"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {centers.map((center: any) => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.name} ({center.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Center-specific content */}
            {selectedCenter && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Center Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Estadísticas del Centro</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {centerStatsLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-4 bg-gray-200 animate-pulse rounded"></div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span>Total Incidencias</span>
                          <span className="font-medium">{centerStats.totalIncidents || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pendientes</span>
                          <span className="font-medium text-orange-600">{centerStats.pendingIncidents || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Resueltas</span>
                          <span className="font-medium text-green-600">{centerStats.resolvedIncidents || 0}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Incidents */}
                <Card>
                  <CardHeader>
                    <CardTitle>Incidencias Recientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {incidentsLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-16 bg-gray-200 animate-pulse rounded"></div>
                        ))}
                      </div>
                    ) : centerIncidents.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No hay incidencias recientes
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {centerIncidents.slice(0, 5).map((incident: any) => (
                          <div key={incident.id} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{incident.title}</p>
                              <p className="text-xs text-muted-foreground">{incident.description}</p>
                            </div>
                            <Badge className={`${getPriorityColor(incident.priority)} text-white`}>
                              {incident.priority}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="management" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Acciones Rápidas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/incidents/new">
                    <Button className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Nueva Incidencia
                    </Button>
                  </Link>
                  <Link href="/centers/new">
                    <Button variant="outline" className="w-full justify-start">
                      <Building2 className="h-4 w-4 mr-2" />
                      Nuevo Centro
                    </Button>
                  </Link>
                  <Link href="/users/new">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Nuevo Usuario
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* System Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Administración
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/users">
                    <Button variant="ghost" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Gestionar Usuarios
                    </Button>
                  </Link>
                  <Link href="/centers">
                    <Button variant="ghost" className="w-full justify-start">
                      <Building2 className="h-4 w-4 mr-2" />
                      Gestionar Centros
                    </Button>
                  </Link>
                  <Link href="/settings">
                    <Button variant="ghost" className="w-full justify-start">
                      <Settings className="h-4 w-4 mr-2" />
                      Configuración
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Actividad Reciente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {globalLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-12 bg-gray-200 animate-pulse rounded"></div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Actividad reciente aparecerá aquí</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Management Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Usuarios del Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Administradores</span>
                      <Badge variant="secondary">
                        {globalLoading ? '...' : (globalStats?.totalAdmins || 0)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Gerentes</span>
                      <Badge variant="secondary">
                        {globalLoading ? '...' : (globalStats?.totalManagers || 0)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Usuarios</span>
                      <Badge variant="secondary">
                        {globalLoading ? '...' : (globalStats?.totalUsers || 0)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Estado de Centros
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Centros Activos</span>
                      <Badge className="bg-green-500 text-white">
                        {globalLoading ? '...' : (globalStats?.totalCenters || 0)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Promedio Incidencias/Centro</span>
                      <span className="font-medium">
                        {globalLoading ? '...' : Math.round((globalStats?.totalIncidents || 0) / (globalStats?.totalCenters || 1))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Centro Más Activo</span>
                      <span className="font-medium text-sm">
                        {globalLoading ? '...' : (globalStats?.mostActiveCenterName || 'N/A')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
                  <div className="text-center py-8 text-muted-foreground">
                    Gráfico de incidencias por mes (próximamente)
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
                      <span className="font-medium">{globalStats?.avgResolutionTime || 'N/A'}</span>
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
        </Tabs>
      </div>
    </Layout>
  );
}