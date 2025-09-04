// client/src/pages/AdminDashboard.tsx - ACTUALIZADO
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
import IncidentList from "@/components/IncidentList"; // <-- NUEVO IMPORT
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

// Componente simplificado para vista de incidencias con IncidentList
interface IncidentsListViewProps {
  status?: string;
  onBack: () => void;
}

function IncidentsListView({ status, onBack }: IncidentsListViewProps) {
  const statusLabels: Record<string, string> = {
    'reported': 'Reportadas',
    'assigned': 'Asignadas', 
    'in_progress': 'En Progreso',
    'pending_approval': 'Pendiente Aprobación',
    'completed': 'Completadas'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} size="sm">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">
            Incidencias {status ? `con estado "${statusLabels[status] || status}"` : ''}
          </h2>
          <p className="text-muted-foreground">
            Vista detallada de incidencias {status ? 
              `con estado "${statusLabels[status] || status}"` : ''}.
          </p>
        </div>
      </div>

      {/* Usar el componente IncidentList existente */}
      <Card>
        <CardContent className="p-0">
          <IncidentList />
        </CardContent>
      </Card>
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
    staleTime: 1000 * 60 * 5,
  });

  // Mock data para gráficos (esto puede venir del backend también)
  const chartData = [
    { name: 'Reportadas', value: globalStats.totalIncidents - globalStats.inProgress - globalStats.completed || 0, color: '#3b82f6' },
    { name: 'En Progreso', value: globalStats.inProgress || 0, color: '#eab308' },
    { name: 'Completadas', value: globalStats.completed || 0, color: '#22c55e' },
    { name: 'Críticas', value: globalStats.critical || 0, color: '#ef4444' },
  ];

  const trendData = [
    { month: 'Ene', incidents: 65, resolved: 58 },
    { month: 'Feb', incidents: 78, resolved: 72 },
    { month: 'Mar', incidents: 90, resolved: 85 },
    { month: 'Abr', incidents: 81, resolved: 79 },
    { month: 'May', incidents: 95, resolved: 88 },
    { month: 'Jun', incidents: 102, resolved: 95 },
  ];

  const statsCards = [
    {
      title: "Total Incidencias",
      value: globalStats.totalIncidents || 0,
      icon: FileText,
      color: "text-blue-600",
      onClick: () => setView('incidents')
    },
    {
      title: "En Progreso",
      value: globalStats.inProgress || 0,
      icon: Clock,
      color: "text-yellow-600",
      onClick: () => {
        setFilterStatus('in_progress');
        setView('incidents');
      }
    },
    {
      title: "Completadas",
      value: globalStats.completed || 0,
      icon: CheckCircle2,
      color: "text-green-600",
      onClick: () => {
        setFilterStatus('completed');
        setView('incidents');
      }
    },
    {
      title: "Críticas",
      value: globalStats.critical || 0,
      icon: AlertCircle,
      color: "text-red-600",
      onClick: () => {
        setFilterStatus('critical');
        setView('incidents');
      }
    },
  ];

  // Si estamos en vista de incidencias, mostrar el componente IncidentsListView
  if (view === 'incidents') {
    return (
      <Layout>
        <IncidentsListView 
          status={filterStatus}
          onBack={() => {
            setView('dashboard');
            setFilterStatus("");
          }}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Administrativo</h1>
            <p className="text-muted-foreground">
              Vista general del sistema de incidencias
              {selectedCenter && centers.length > 0 && (
                <span className="ml-2 text-primary font-medium">
                  • {centers.find((c: Center) => c.id === selectedCenter)?.name}
                </span>
              )}
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