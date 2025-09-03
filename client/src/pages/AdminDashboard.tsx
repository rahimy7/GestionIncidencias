// client/src/pages/AdminDashboard.tsx
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueries } from "@tanstack/react-query";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus,
  Settings,
  Building2,
  Users,
  TrendingUp,
  Calendar,
  BarChart3,
  PieChart,
  Filter,
  ArrowLeft
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Cell, 
  XAxis, 
  YAxis, 
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";
import { toast } from "@/hooks/use-toast";

interface GlobalStats {
  totalIncidents: number;
  inProgress: number;
  completed: number;
  critical: number;
  totalCenters: number;
  totalUsers: number;
  dailyAverage: number;
  avgResolutionTime: string;
  globalResolutionRate: number;
  mostActiveCenterName: string;
  recentIncidents: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    center: { name: string };
  }>;
}

interface CenterStats {
  totalIncidents: number;
  inProgress: number;
  critical: number;
  completed: number;
  resolutionRate: number;
}

interface Center {
  id: string;
  name: string;
  code: string;
  manager?: { name: string };
}

// Vista detallada de incidencias filtradas
interface IncidentsListViewProps {
  status?: string;
  onBack: () => void;
}

function IncidentsListView({ status, onBack }: IncidentsListViewProps) {
  const { user } = useAuth();
  
  const { data: incidents, isLoading } = useQuery({
    queryKey: ['/api/incidents', status],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      let url = '/api/incidents';
      if (status) {
        url += `?${status === 'critical' ? 'priority' : 'status'}=${status}`;
      }
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load incidents');
      return response.json();
    },
    enabled: !!user,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'pending_approval': return 'text-orange-600 bg-orange-50';
      case 'reported': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const statusLabels: Record<string, string> = {
    'reported': 'Reportadas',
    'assigned': 'Asignadas', 
    'in_progress': 'En Progreso',
    'pending_approval': 'Pendiente Aprobación',
    'completed': 'Completadas'
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} size="sm">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">
            Incidencias {status ? statusLabels[status] : 'Todas'}
          </h2>
          <p className="text-muted-foreground">
            {incidents?.length || 0} incidencias encontradas
          </p>
        </div>
      </div>

      {/* Lista de incidencias */}
      <div className="space-y-4">
        {incidents?.map((incident: any) => (
          <Card key={incident.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-2 h-12 rounded-full ${getPriorityColor(incident.priority)}`}></div>
                  <div>
                    <h3 className="font-semibold">{incident.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {incident.center?.name} • {new Date(incident.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {incident.description?.substring(0, 100)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(incident.status)}>
                    {statusLabels[incident.status] || incident.status}
                  </Badge>
                  <Link href={`/incidents/${incident.id}`}>
                    <Button variant="outline" size="sm">
                      Ver Detalles
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {incidents?.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay incidencias</h3>
              <p className="text-muted-foreground">
                No se encontraron incidencias {status ? `con estado "${statusLabels[status]}"` : ''}.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [selectedCenter, setSelectedCenter] = useState<string>("");
  const [view, setView] = useState<'dashboard' | 'incidents'>('dashboard');
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Queries con mejor manejo de errores y cache
  const queries = useQueries({
    queries: [
      {
        queryKey: ['/api/dashboard/global-stats'],
        queryFn: async (): Promise<GlobalStats> => {
          const token = localStorage.getItem('auth_token');
          const response = await fetch('/api/dashboard/global-stats', {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!response.ok) throw new Error('Failed to load global stats');
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

  // Query para estadísticas de centro específico (solo cuando se selecciona)
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
    staleTime: 1000 * 60 * 2, // 2 minutes cache
  });

  // Datos para gráficas
  const chartData = [
    { name: 'Reportadas', value: globalStats.totalIncidents - globalStats.inProgress - globalStats.completed, color: '#6b7280' },
    { name: 'En Progreso', value: globalStats.inProgress, color: '#3b82f6' },
    { name: 'Completadas', value: globalStats.completed, color: '#10b981' },
    { name: 'Críticas', value: globalStats.critical, color: '#ef4444' },
  ];

  // Datos de tendencia (simulados - aquí deberías obtener datos reales de API)
  const trendData = [
    { month: 'Ene', incidents: 45, resolved: 38 },
    { month: 'Feb', incidents: 52, resolved: 45 },
    { month: 'Mar', incidents: 38, resolved: 35 },
    { month: 'Abr', incidents: 61, resolved: 52 },
    { month: 'May', incidents: 55, resolved: 48 },
    { month: 'Jun', incidents: 67, resolved: 58 },
  ];

  const statsCards = [
    {
      title: "Total Incidencias",
      value: globalStats.totalIncidents || 0,
      icon: FileText,
      color: "text-primary",
      onClick: () => {
        setFilterStatus("");
        setView('incidents');
      }
    },
    {
      title: "En Progreso", 
      value: globalStats.inProgress || 0,
      icon: Clock,
      color: "text-blue-500",
      onClick: () => {
        setFilterStatus("in_progress");
        setView('incidents');
      }
    },
    {
      title: "Completadas",
      value: globalStats.completed || 0,
      icon: CheckCircle2,
      color: "text-green-500",
      onClick: () => {
        setFilterStatus("completed");
        setView('incidents');
      }
    },
    {
      title: "Críticas",
      value: globalStats.critical || 0,
      icon: AlertCircle,
      color: "text-red-500",
      onClick: () => {
        setFilterStatus("critical"); // Filtrar por prioridad crítica
        setView('incidents');
      }
    },
  ];

  if (globalLoading) {
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

  if (view === 'incidents') {
    return (
      <Layout>
        <div className="p-6 max-w-7xl mx-auto">
          <IncidentsListView 
            status={filterStatus} 
            onBack={() => setView('dashboard')} 
          />
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
            <p className="text-muted-foreground mt-2">
              Vista general del sistema de gestión de incidencias
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/settings">
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

        {/* Statistics Cards con navegación */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={index} 
                className="border-border hover:shadow-lg transition-shadow cursor-pointer"
                onClick={stat.onClick}
              >
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
            <TabsTrigger value="charts">Gráficas</TabsTrigger>
            <TabsTrigger value="centers">Por Centro</TabsTrigger>
            <TabsTrigger value="reports">Reportes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Métricas clave */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Métricas Clave
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Centros Activos</span>
                    <Badge variant="secondary">
                      {globalLoading ? '...' : (globalStats?.totalCenters || 0)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Promedio Incidencias/Centro</span>
                    <span className="font-medium">
                      {globalLoading ? '...' : Math.round((globalStats?.totalIncidents || 0) / Math.max(globalStats?.totalCenters || 1, 1))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Centro Más Activo</span>
                    <span className="font-medium text-sm">
                      {globalLoading ? '...' : (globalStats?.mostActiveCenterName || 'N/A')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Tasa de Resolución Global</span>
                    <span className="font-medium text-green-600">
                      {globalLoading ? '...' : `${globalStats?.globalResolutionRate || 0}%`}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Incidencias recientes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Actividad Reciente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {globalStats?.recentIncidents?.slice(0, 5).map((incident: any) => (
                      <div key={incident.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{incident.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {incident.center?.name} • {new Date(incident.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {incident.status}
                        </Badge>
                      </div>
                    )) || (
                      <p className="text-muted-foreground text-sm">No hay actividad reciente</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sección de Alertas y Notificaciones */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Alertas Importantes */}
              <Card className="border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <AlertCircle className="h-5 w-5" />
                    Alertas Importantes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {globalStats?.critical > 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="font-medium text-red-700">
                            {globalStats.critical} incidencias críticas pendientes
                          </span>
                        </div>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="text-red-600 p-0 h-auto"
                          onClick={() => {
                            setFilterStatus("critical");
                            setView('incidents');
                          }}
                        >
                          Ver todas →
                        </Button>
                      </div>
                    )}
                    
                    {globalStats?.inProgress > 10 && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span className="font-medium text-blue-700">
                            Alto volumen: {globalStats.inProgress} incidencias en progreso
                          </span>
                        </div>
                      </div>
                    )}

                    {((globalStats?.totalIncidents || 0) === 0) && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="font-medium text-green-700">
                            Sistema funcionando sin incidencias
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {(!globalStats?.critical && !globalStats?.inProgress) && globalStats?.totalIncidents > 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                        <p>No hay alertas importantes en este momento</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Resumen de Rendimiento */}
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-600">
                    <TrendingUp className="h-5 w-5" />
                    Rendimiento del Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Indicador de rendimiento general */}
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-1">
                        {globalStats?.globalResolutionRate || 0}%
                      </div>
                      <p className="text-sm text-muted-foreground">Tasa de resolución</p>
                    </div>
                    
                    {/* Métricas de rendimiento */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Tiempo promedio resolución</span>
                        <Badge variant="secondary">
                          {globalStats?.avgResolutionTime || 'N/A'}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Productividad diaria</span>
                        <Badge variant={globalStats?.dailyAverage > 5 ? "destructive" : "default"}>
                          {globalStats?.dailyAverage || 0} incidencias/día
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Centro más eficiente</span>
                        <span className="text-sm font-medium">
                          {globalStats?.mostActiveCenterName || 'N/A'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Botón para reporte detallado */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-4"
                      onClick={() => {
                        toast({
                          title: "Reporte de Rendimiento",
                          description: "Funcionalidad en desarrollo",
                        });
                      }}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Ver Reporte Completo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="charts" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfica de distribución de estados */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Distribución por Estado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StatusDistributionChart data={chartData} />
                </CardContent>
              </Card>

              {/* Gráfica de tendencia mensual */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Tendencia Mensual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendChart data={processedTrendData} />
                </CardContent>
              </Card>

              {/* Gráfica de barras por centro */}
              <Card className="col-span-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Incidencias por Centro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CenterBarChart data={centers.slice(0, 10)} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="centers" className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Seleccionar centro..." />
                </SelectTrigger>
                <SelectContent>
                  {centers.map((center: Center) => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.name} ({center.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCenter && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold">
                          {centerStatsLoading ? '...' : (centerStats?.totalIncidents || 0)}
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
                        <p className="text-2xl font-bold text-blue-600">
                          {centerStatsLoading ? '...' : (centerStats?.inProgress || 0)}
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
                        <p className="text-sm text-muted-foreground">Completadas</p>
                        <p className="text-2xl font-bold text-green-600">
                          {centerStatsLoading ? '...' : (centerStats?.completed || 0)}
                        </p>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Críticas</p>
                        <p className="text-2xl font-bold text-red-600">
                          {centerStatsLoading ? '...' : (centerStats?.critical || 0)}
                        </p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {!selectedCenter && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Selecciona un Centro</h3>
                  <p className="text-muted-foreground">
                    Elige un centro de trabajo para ver sus estadísticas detalladas.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Recursos del Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total de Usuarios</span>
                      <span className="font-medium">{globalStats?.totalUsers || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Centros Activos</span>
                      <span className="font-medium">{globalStats?.totalCenters || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Incidencias por Usuario</span>
                      <span className="font-medium">
                        {Math.round((globalStats?.totalIncidents || 0) / Math.max(globalStats?.totalUsers || 1, 1))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Eficiencia del Sistema</span>
                      <span className="font-medium text-blue-600">
                        {globalStats?.globalResolutionRate || 0}% efectividad
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Card de Acciones Rápidas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Acciones Rápidas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/incidents/new">
                    <Button className="w-full flex items-center gap-2" size="sm">
                      <Plus className="h-4 w-4" />
                      Nueva Incidencia
                    </Button>
                  </Link>
                  <Link href="/admin/centers/new">
                    <Button variant="outline" className="w-full flex items-center gap-2" size="sm">
                      <Building2 className="h-4 w-4" />
                      Nuevo Centro
                    </Button>
                  </Link>
                  <Link href="/admin/users">
                    <Button variant="outline" className="w-full flex items-center gap-2" size="sm">
                      <Users className="h-4 w-4" />
                      Gestionar Usuarios
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full flex items-center gap-2" 
                    size="sm"
                    onClick={() => {
                      globalStatsQuery.refetch();
                      centersQuery.refetch();
                    }}
                  >
                    <TrendingUp className="h-4 w-4" />
                    Actualizar Datos
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}