// client/src/pages/AdminDashboard.tsx - VISTA PRINCIPAL
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
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
  ArrowLeft,
  Briefcase,
  Store,
  ArrowRight
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
  enproceso: number;
  completado: number;
  critico: number;
  totalCenters: number;
  totalStores: number;
  totalDistributionCenters: number;
  totalUsers: number;
  totalDepartments: number;
  dailyAverage: number;
  avgResolutionTime: string;
  globalResolutionRate: number;
  mostActiveCenterName: string;
  mostActiveCenterCode: string;
  recentIncidents: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    center: { name: string; code: string };
  }>;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Query para estadísticas globales
  const { data: globalStats = {} as GlobalStats, isLoading: globalLoading } = useQuery({
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
  });

  const chartData = [
    { name: 'Reportadas', value: globalStats.totalIncidents - globalStats.enproceso - globalStats.completado || 0, color: '#3b82f6' },
    { name: 'En Progreso', value: globalStats.enproceso || 0, color: '#eab308' },
    { name: 'Completadas', value: globalStats.completado || 0, color: '#22c55e' },
    { name: 'Críticas', value: globalStats.critico || 0, color: '#ef4444' },
  ];

  const trendData = [
    { month: 'Ene', incidents: 65, resolved: 58 },
    { month: 'Feb', incidents: 78, resolved: 72 },
    { month: 'Mar', incidents: 90, resolved: 85 },
    { month: 'Abr', incidents: 81, resolved: 79 },
    { month: 'May', incidents: 95, resolved: 88 },
    { month: 'Jun', incidents: 102, resolved: 95 },
  ];

  const incidentStatsCards = [
    {
      title: "Total Incidencias",
      value: globalStats.totalIncidents || 0,
      icon: FileText,
      color: "text-blue-600",
      href: "/admin/incidents"
    },
    {
      title: "En Progreso",
      value: globalStats.enproceso || 0,
      icon: Clock,
      color: "text-yellow-600",
      href: "/admin/incidents?status=en_proceso"
    },
    {
      title: "Completadas",
      value: globalStats.completado || 0,
      icon: CheckCircle2,
      color: "text-green-600",
      href: "/admin/incidents?status=completado"
    },
    {
      title: "Críticas",
      value: globalStats.critico || 0,
      icon: AlertCircle,
      color: "text-red-600",
      href: "/admin/incidents?status=critica"
    },
  ];

  const managementCards = [
    {
      title: "Gestión de Usuarios",
      description: "Administrar usuarios, roles y asignaciones",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      count: globalStats.totalUsers || 0,
      href: "/admin/users"
    },
    {
      title: "Centros y Tiendas",
      description: "Gestionar centros de distribución y tiendas",
      icon: Building2,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      count: (globalStats.totalStores || 0) + (globalStats.totalDistributionCenters || 0),
      href: "/admin/centers"
    },
    {
      title: "Departamentos",
      description: "Administrar áreas corporativas",
      icon: Briefcase,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      count: globalStats.totalDepartments || 0,
      href: "/admin/departments"
    }
  ];

  if (globalLoading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando estadísticas...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Administrativo</h1>
            <p className="text-muted-foreground">
              Vista general del sistema de incidencias
              {globalStats.mostActiveCenterName && (
                <span className="ml-2 text-primary font-medium">
                  • Centro más activo: {globalStats.mostActiveCenterCode} - {globalStats.mostActiveCenterName}
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

        {/* Statistics Cards - Incidencias */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Estadísticas de Incidencias</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {incidentStatsCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Link key={index} href={stat.href}>
                  <Card className="border-border hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {stat.title}
                          </p>
                          <p className="text-2xl font-bold">
                            {stat.value}
                          </p>
                        </div>
                        <Icon className={`h-8 w-8 ${stat.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Statistics Cards - Sistema */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Resumen del Sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Tiendas</p>
                    <p className="text-2xl font-bold">{globalStats.totalStores || 0}</p>
                    <p className="text-xs text-gray-500">Código: T##</p>
                  </div>
                  <Store className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Centros Distribución</p>
                    <p className="text-2xl font-bold">{globalStats.totalDistributionCenters || 0}</p>
                    <p className="text-xs text-gray-500">Código: TCD##</p>
                  </div>
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Departamentos</p>
                    <p className="text-2xl font-bold">{globalStats.totalDepartments || 0}</p>
                    <p className="text-xs text-gray-500">Áreas corporativas</p>
                  </div>
                  <Briefcase className="h-8 w-8 text-indigo-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Usuarios</p>
                    <p className="text-2xl font-bold">{globalStats.totalUsers || 0}</p>
                    <p className="text-xs text-gray-500">Promedio: {globalStats.dailyAverage}/día</p>
                  </div>
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
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
                  <Legend />
                  <Line type="monotone" dataKey="incidents" stroke="#3b82f6" name="Reportadas" />
                  <Line type="monotone" dataKey="resolved" stroke="#22c55e" name="Resueltas" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas del sistema */}
        <Card>
          <CardHeader>
            <CardTitle>Métricas de Rendimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <h3 className="text-lg font-semibold mb-2">Tasa de Resolución</h3>
                <p className="text-3xl font-bold text-green-600">{globalStats.globalResolutionRate || 0}%</p>
                <p className="text-sm text-gray-500">De incidencias completadas</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Tiempo Promedio</h3>
                <p className="text-3xl font-bold text-blue-600">{globalStats.avgResolutionTime || "N/A"}</p>
                <p className="text-sm text-gray-500">Para resolver incidencias</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Promedio Diario</h3>
                <p className="text-3xl font-bold text-orange-600">{globalStats.dailyAverage || 0}</p>
                <p className="text-sm text-gray-500">Incidencias por día</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gestión del Sistema */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Gestión del Sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {managementCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <Link key={index} href={card.href}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-lg ${card.bgColor}`}>
                          <Icon className={`h-6 w-6 ${card.color}`} />
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{card.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{card.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-gray-900">{card.count}</span>
                        <Badge variant="secondary">Ver todos</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Incidencias recientes */}
        {globalStats.recentIncidents && globalStats.recentIncidents.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Incidencias Recientes</CardTitle>
                <Link href="/admin/incidents">
                  <Button variant="outline" size="sm">
                    Ver todas
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {globalStats.recentIncidents.slice(0, 5).map((incident: any) => (
                  <div key={incident.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">{incident.title}</h4>
                      <p className="text-sm text-gray-500">
                        {incident.center?.code} - {incident.center?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={
                          incident.priority === 'critica' ? 'bg-red-100 text-red-800' :
                          incident.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }
                      >
                        {incident.priority}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(incident.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}