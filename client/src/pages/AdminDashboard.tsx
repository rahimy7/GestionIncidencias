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
  Legend,
  Pie
} from "recharts";
import { useToast } from "@/hooks/use-toast";

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
  
  // FIX: Usar 'status' prop en lugar de 'filterStatus' no definido
  const { data: incidents, isLoading } = useQuery({
    queryKey: ['/api/incidents/filtered', status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      
     const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/incidents/filtered?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (!response.ok) throw new Error('Error fetching incidents');
    return response.json();
  }
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
            Incidencias {status ? statusLabels[status] || status : 'Todas'}
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
                No se encontraron incidencias {status ? `con estado "${statusLabels[status] || status}"` : ''}.
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
  const { toast } = useToast();
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
        setFilterStatus("critical");
        setView('incidents');
      }
    },
  ];

  if (view === 'incidents') {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Panel de Administración
            </h1>
            <p className="text-muted-foreground mt-2">
              Vista general del sistema de gestión de incidencias
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/settings">
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuración
              </Button>
            </Link>
            <Link href="/incidents/new">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nueva Incidencia
              </Button>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
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
                        {globalLoading ? '...' : stat.value}
                      </p>
                    </div>
                    <Icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Rest of the dashboard content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Distribución de Incidencias</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tendencia Mensual</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="incidents" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Reportadas"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="resolved" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Resueltas"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}