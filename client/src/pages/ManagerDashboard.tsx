// client/src/pages/ManagerDashboard.tsx - VERSIÓN ACTUALIZADA CON SECCIÓN DE INCIDENCIAS COMPLETA
import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus,
  Building2,
  TrendingUp,
  Calendar,
  BarChart3,
  PieChart,
  Target,
  Users,
  ClipboardList,
  CheckSquare,
  Activity,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  Search,
  Filter,
  Eye,
  Edit,
  MoreVertical,
  User
} from "lucide-react";
import { Link } from "wouter";
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
  Pie,
  Area,
  AreaChart
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";


interface Incident {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  assigneeId?: string;
  reporterId: string;
  reporter?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  type?: {
    id: string;
    name: string;
  };
}

interface CenterInfo {
  id: string;
  name: string;
  code: string;
}

interface CenterStats {
  totalIncidents: number;
  enproceso: number;
  critica: number;
  completado: number;
  reportado: number;
  asignado: number;
  resolutionRate: number;
  actionPlans: {
    total: number;
    pendiente: number;
    enproceso: number;
    completado: number;
    retrasado: number;
  };
  tasks: {
    total: number;
    pendiente: number;
    enproceso: number;
    completado: number;
    retrasado: number;
  };
  trends: Array<{
    month: string;
    incidents: number;
    resolved: number;
    actionPlans: number;
    tasksCompleted: number;
  }>;
  performanceMetrics: {
    avgResolutionTime: number;
    avgResponseTime: number;
    completionRate: number;
    taskCompletionRate: number;
  };
}

interface ActionPlan {
  id: string;
  title: string;
  description: string;
  status: 'pendiente' | 'en_proceso' | 'completado' | 'retrasado';
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  assignee: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  incident: {
    id: string;
    incidentNumber: string;
    title: string;
    status: string;
    priority: string;
    type?: {
      id: string;
      name: string;
    };
  };
  participants: Array<{
    id: string;
    userId: string;
    role: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
  _count: {
    tasks: number;
    completedTasks: number;
    comments: number;
  };
  progress: number;
}

export function ManagerDashboard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(() => {
  // Leer el tab guardado en localStorage al inicializar
  const savedTab = localStorage.getItem('managerDashboardActiveTab');
  return savedTab || "overview";
});

// Función para cambiar el tab y guardarlo
const handleTabChange = (newTab: string) => {
  setActiveTab(newTab);
  localStorage.setItem('managerDashboardActiveTab', newTab);
};

// Función para navegar a incidencias con filtro
const goToIncidentsWithFilter = (filterType: 'status' | 'priority', filterValue: string) => {
  handleTabChange('incidents');
  if (filterType === 'status') {
    setStatusFilter(filterValue);
    setPriorityFilter('all');
  } else {
    setPriorityFilter(filterValue);
    setStatusFilter('all');
  }
};
  
  // Estados para filtros en la sección de incidencias
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [showFilters, setShowFilters] = useState(false);

  

  // Obtener información del centro del manager
  const { data: centerInfo, isLoading: centerLoading } = useQuery({
    queryKey: ['/api/centers/my'],
    queryFn: async (): Promise<CenterInfo> => {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No auth token found');

      const response = await fetch('/api/centers/my', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: !!user,
    retry: 1,
  });

  // Obtener todas las incidencias del centro con filtros
  const { data: centerIncidents, isLoading: incidentsLoading } = useQuery({
    queryKey: ['/api/incidents/center'],
    queryFn: async (): Promise<Incident[]> => {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No auth token found');

      const response = await fetch('/api/incidents/center', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: !!user,
    retry: 1,
    refetchOnWindowFocus: true,  
  refetchOnMount: true,     
  staleTime: 0,  
  });

  // Obtener estadísticas detalladas del centro
  const { data: centerStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/center-stats-detailed'],
    queryFn: async (): Promise<CenterStats> => {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No auth token found');

      const response = await fetch('/api/dashboard/center-stats-detailed', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    enabled: !!user,
    retry: 1,
     refetchOnWindowFocus: true,  // ✅ AGREGAR
  refetchOnMount: true,         // ✅ AGREGAR
  staleTime: 0, 
  });

  const [actionPlanSearchTerm, setActionPlanSearchTerm] = useState("");
const [actionPlanStatusFilter, setActionPlanStatusFilter] = useState("all");
const [actionPlanSortBy, setActionPlanSortBy] = useState("date");
const [showActionPlanFilters, setShowActionPlanFilters] = useState(false);

// Obtener planes de acción del centro
const { data: centerActionPlans, isLoading: actionPlansLoading } = useQuery({
  queryKey: ['/api/action-plans/center'],
  queryFn: async (): Promise<ActionPlan[]> => {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('No auth token found');

    const response = await fetch('/api/action-plans/center', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
  enabled: !!user && !!centerInfo?.id,
  retry: 1,
   refetchOnWindowFocus: true,  // ✅ AGREGAR
  refetchOnMount: true,         // ✅ AGREGAR
  staleTime: 0,  
});

// Procesar y filtrar planes de acción
const filteredActionPlans = useMemo(() => {
  if (!centerActionPlans) return [];

  return centerActionPlans.filter((plan: ActionPlan) => {
    // Filtro por búsqueda
    if (actionPlanSearchTerm) {
      const searchLower = actionPlanSearchTerm.toLowerCase();
      const matchesSearch = 
        plan.title.toLowerCase().includes(searchLower) ||
        plan.description.toLowerCase().includes(searchLower) ||
        plan.incident?.title.toLowerCase().includes(searchLower) ||
        plan.incident?.incidentNumber.toLowerCase().includes(searchLower) ||
        plan.assignee?.firstName.toLowerCase().includes(searchLower) ||
        plan.assignee?.lastName.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Filtro por estado
    if (actionPlanStatusFilter !== "all" && plan.status !== actionPlanStatusFilter) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    switch (actionPlanSortBy) {
      case "status":
        return a.status.localeCompare(b.status);
      case "progress":
        return b.progress - a.progress;
      case "dueDate":
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      case "date":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
}, [centerActionPlans, actionPlanSearchTerm, actionPlanStatusFilter, actionPlanSortBy]);

// Funciones de utilidad para planes de acción
const getActionPlanStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'completado': return 'default';
    case 'en_proceso': return 'secondary';
    case 'pendiente': return 'outline';
    case 'retrasado': return 'destructive';
    default: return 'outline';
  }
};

const getActionPlanStatusText = (status: string) => {
  switch (status) {
    case 'pendiente': return 'Pendiente';
    case 'en_proceso': return 'En Progreso';
    case 'completado': return 'Completado';
    case 'retrasado': return 'Atrasado';
    default: return status;
  }
};

const getActionPlanStatusColor = (status: string) => {
  switch (status) {
    case 'pendiente': return 'text-gray-600';
    case 'en_proceso': return 'text-blue-600';
    case 'completada': return 'text-green-600';
    case 'retrasado': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

const isretrasado = (dueDate: string, status: string) => {
  return status !== 'completado'&& new Date(dueDate) < new Date();
};

  // Procesar y filtrar incidencias
  const filteredIncidents = useMemo(() => {
    if (!centerIncidents) return [];

    return centerIncidents.filter((incident: Incident) => {
      // Filtro por búsqueda
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          incident.title.toLowerCase().includes(searchLower) ||
          incident.description.toLowerCase().includes(searchLower) ||
          incident.incidentNumber.toLowerCase().includes(searchLower) ||
          incident.reporter?.firstName.toLowerCase().includes(searchLower) ||
          incident.reporter?.lastName.toLowerCase().includes(searchLower) ||
          incident.assignee?.firstName.toLowerCase().includes(searchLower) ||
          incident.assignee?.lastName.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Filtro por estado
      if (statusFilter !== "all" && incident.status !== statusFilter) {
        return false;
      }

      // Filtro por prioridad
      if (priorityFilter !== "all" && incident.priority !== priorityFilter) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case "priority":
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                 (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
        case "status":
          return a.status.localeCompare(b.status);
        case "date":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [centerIncidents, searchTerm, statusFilter, priorityFilter, sortBy]);

  if (centerLoading || !centerInfo) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando información del centro...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Mensaje si no tiene centro asignado
  if (!centerInfo.id) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Centro no asignado
            </h2>
            <p className="text-muted-foreground">
              Contacta al administrador para que te asigne un centro.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Calcular estadísticas básicas desde incidencias
  const allIncidents = centerIncidents || [];
  const totalIncidents = allIncidents.length;
  const pendingIncidents = allIncidents.filter((i: Incident) => 
    ['reported', 'assigned'].includes(i.status)
  );
  const inProgressIncidents = allIncidents.filter((i: Incident) => 
    i.status === 'en_proceso'
  );
  const completedIncidents = allIncidents.filter((i: Incident) => 
    i.status === 'completado'
  );
  const criticalIncidents = allIncidents.filter((i: Incident) => 
    i.priority === 'critica' && i.status !== 'completado'
  );

  // Función para obtener el color del badge según el estado
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completado': return 'default';
      case 'en_proceso': return 'secondary';
      case 'asignado': return 'outline';
      case 'reportado': return 'outline';
      case 'pendiente_aprobacion': return 'secondary';
      default: return 'outline';
    }
  };

  // Función para obtener el color del badge según la prioridad
  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'critica': return 'bg-red-100 text-red-800 border-red-200';
      case 'alta': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'media': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'baja': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Función para obtener texto del estado
  const getStatusText = (status: string) => {
    switch (status) {
      case 'reportado': return 'Reportada';
      case 'asignado': return 'Asignada';
      case 'en_proceso': return 'En Progreso';
      case 'pendiente_aprobacion': return 'Pendiente Aprobación';
      case 'completado': return 'Completada';
      default: return status;
    }
  };

  // Función para obtener texto de la prioridad
  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'critica': return 'Crítica';
      case 'alta': return 'Alta';
      case 'media': return 'Media';
      case 'baja': return 'Baja';
      default: return priority;
    }
  };

  // Datos para gráficos (usar datos reales si están disponibles, sino usar datos calculados)
  const incidentStatusData = [
    { name: 'Reportadas', value: pendingIncidents.length, color: '#3b82f6' },
    { name: 'En Progreso', value: inProgressIncidents.length, color: '#eab308' },
    { name: 'Completadas', value: completedIncidents.length, color: '#22c55e' },
    { name: 'Críticas', value: criticalIncidents.length, color: '#ef4444' },
  ];

  // Datos de tendencias (últimos 6 meses)
  const trendData = centerStats?.trends || [
    { month: 'Jul', incidents: 12, resolved: 10, actionPlans: 8, tasksCompleted: 25 },
    { month: 'Ago', incidents: 15, resolved: 14, actionPlans: 12, tasksCompleted: 30 },
    { month: 'Sep', incidents: 18, resolved: 16, actionPlans: 15, tasksCompleted: 35 },
    { month: 'Oct', incidents: 14, resolved: 13, actionPlans: 11, tasksCompleted: 28 },
    { month: 'Nov', incidents: 20, resolved: 18, actionPlans: 18, tasksCompleted: 42 },
    { month: 'Dic', incidents: 16, resolved: 15, actionPlans: 14, tasksCompleted: 38 },
  ];

  // Función para obtener el ícono de tendencia
  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (current < previous) return <ArrowDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  // Métricas de rendimiento
  const performanceMetrics = centerStats?.performanceMetrics || {
    avgResolutionTime: 3.2,
    avgResponseTime: 0.5,
    completionRate: 85,
    taskCompletionRate: 78
  };

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
              {centerInfo.name} ({centerInfo.code})
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/incidents/new">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nueva Incidencia
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs para organizar el contenido */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="incidents">Incidencias ({totalIncidents})</TabsTrigger>
            <TabsTrigger value="action-plans">Planes de Acción</TabsTrigger>
            <TabsTrigger value="performance">Rendimiento</TabsTrigger>
          </TabsList>

        {/* Tab: Resumen General */}
<TabsContent value="overview" className="space-y-6">
  {/* Tarjetas de estadísticas principales */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => goToIncidentsWithFilter('status', 'all')}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Incidencias</p>
            <p className="text-2xl font-bold">{totalIncidents}</p>
          </div>
          <FileText className="h-8 w-8 text-blue-600" />
        </div>
        <div className="flex items-center mt-2">
          {getTrendIcon(totalIncidents, trendData[trendData.length - 2]?.incidents || 0)}
          <span className="text-xs text-muted-foreground ml-1">vs mes anterior</span>
        </div>
      </CardContent>
    </Card>

    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => goToIncidentsWithFilter('status', 'en_proceso')}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">En Progreso</p>
            <p className="text-2xl font-bold">{inProgressIncidents.length}</p>
          </div>
          <Clock className="h-8 w-8 text-yellow-600" />
        </div>
        <div className="flex items-center mt-2">
          <Activity className="h-4 w-4 text-blue-600" />
          <span className="text-xs text-muted-foreground ml-1">requieren atención</span>
        </div>
      </CardContent>
    </Card>

    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => goToIncidentsWithFilter('status', 'completado')}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Completadas</p>
            <p className="text-2xl font-bold">{completedIncidents.length}</p>
          </div>
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <div className="flex items-center mt-2">
          <Target className="h-4 w-4 text-green-600" />
          <span className="text-xs text-muted-foreground ml-1">
            {totalIncidents > 0 ? Math.round((completedIncidents.length / totalIncidents) * 100) : 0}% tasa de resolución
          </span>
        </div>
      </CardContent>
    </Card>

    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => goToIncidentsWithFilter('priority', 'critica')}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Críticas</p>
            <p className="text-2xl font-bold">{criticalIncidents.length}</p>
          </div>
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <div className="flex items-center mt-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="text-xs text-muted-foreground ml-1">atención urgente</span>
        </div>
      </CardContent>
    </Card>
  </div>

            {/* Gráficos de resumen */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de tendencias */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Tendencias Mensuales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trendData}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="incidents" 
                        stackId="1"
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.3}
                        name="Incidencias"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="resolved" 
                        stackId="2"
                        stroke="#22c55e" 
                        fill="#22c55e" 
                        fillOpacity={0.3}
                        name="Resueltas"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Distribución de estados */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Estado de Incidencias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={incidentStatusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {incidentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Incidencias - SECCIÓN COMPLETA CON FILTROS */}
          <TabsContent value="incidents" className="space-y-6">
            {/* Controles de filtros y búsqueda */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Gestión de Incidencias del Centro
                  </CardTitle>
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                  </Button>
                </div>
              </CardHeader>
              {showFilters && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Búsqueda */}
                    <div className="lg:col-span-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Buscar por título, descripción, número o persona..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Filtro por estado */}
                    <Select 
  value={statusFilter} 
  onValueChange={(value) => {
    setStatusFilter(value);
    if (value !== "all") setPriorityFilter("all"); // Limpiar prioridad
  }}
>
  <SelectTrigger>
    <SelectValue placeholder="Estado" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Todos los estados</SelectItem>
    <SelectItem value="reportado">Reportada</SelectItem>
    <SelectItem value="asignado">Asignada</SelectItem>
    <SelectItem value="en_proceso">En Progreso</SelectItem>
    <SelectItem value="pendiente_aprobacion">Pendiente Aprobación</SelectItem>
    <SelectItem value="completado">Completada</SelectItem>
  </SelectContent>
</Select>

                    {/* Filtro por prioridad */}
                    <Select 
  value={priorityFilter} 
  onValueChange={(value) => {
    setPriorityFilter(value);
    if (value !== "all") setStatusFilter("all"); // Limpiar estado
  }}
>
  <SelectTrigger>
    <SelectValue placeholder="Prioridad" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Todas las prioridades</SelectItem>
    <SelectItem value="critica">Crítica</SelectItem>
    <SelectItem value="alta">Alta</SelectItem>
    <SelectItem value="media">Media</SelectItem>
    <SelectItem value="baja">Baja</SelectItem>
  </SelectContent>
</Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Ordenar por" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Fecha (más reciente)</SelectItem>
                          <SelectItem value="priority">Prioridad</SelectItem>
                          <SelectItem value="status">Estado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Botón para limpiar filtros */}
                    {(searchTerm || statusFilter !== "all" || priorityFilter !== "all") && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("all");
                          setPriorityFilter("all");
                        }}
                      >
                        Limpiar Filtros
                      </Button>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Estadísticas rápidas de filtros activos */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="cursor-pointer" onClick={() => setStatusFilter("all")}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-xl font-bold">{filteredIncidents.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer" onClick={() => setStatusFilter("en_proceso")}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-yellow-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">En Progreso</p>
                      <p className="text-xl font-bold">
                        {filteredIncidents.filter(i => i.status === 'en_proceso').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

      

              <Card className="cursor-pointer" onClick={() => setStatusFilter("completado")}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Completadas</p>
                      <p className="text-xl font-bold">
                        {filteredIncidents.filter(i => i.status === 'completado').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lista de incidencias filtradas */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Incidencias 
                  {filteredIncidents.length !== totalIncidents && 
                    ` (${filteredIncidents.length} de ${totalIncidents})`
                  }
                </CardTitle>
              </CardHeader>
              <CardContent>
                {incidentsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Cargando incidencias...</p>
                  </div>
                ) : filteredIncidents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      {(statusFilter !== "all" || priorityFilter !== "all" || searchTerm) 
                        ? "No se encontraron incidencias que coincidan con los filtros"
                        : "No hay incidencias registradas"
                      }
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {(statusFilter !== "all" || priorityFilter !== "all" || searchTerm)
                        ? "Intenta ajustar los filtros para ver más resultados."
                        : "Cuando se reporten incidencias en tu centro, aparecerán aquí."
                      }
                    </p>
                    {(statusFilter !== "all" || priorityFilter !== "all" || searchTerm) && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("all");
                          setPriorityFilter("all");
                        }}
                      >
                        Limpiar Filtros
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredIncidents.map((incident: Incident) => (
                      <div key={incident.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          {/* Información principal */}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-medium text-lg">{incident.title}</h3>
                              <Badge
                                variant={getStatusBadgeVariant(incident.status)}
                                className="text-xs"
                              >
                                {getStatusText(incident.status)}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-xs ${getPriorityBadgeColor(incident.priority)}`}
                              >
                                {getPriorityText(incident.priority)}
                              </Badge>
                            </div>

                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {incident.description}
                            </p>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {incident.incidentNumber}
                              </span>
                              
                              {incident.reporter && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  Reportó: {incident.reporter.firstName} {incident.reporter.lastName}
                                </span>
                              )}

                              {incident.assignee && (
                                <span className="flex items-center gap-1">
                                  <Target className="h-3 w-3" />
                                  Asignado: {incident.assignee.firstName} {incident.assignee.lastName}
                                </span>
                              )}

                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(incident.createdAt).toLocaleDateString('es-ES', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>

                              {incident.type && (
                                <span className="flex items-center gap-1">
                                  <ClipboardList className="h-3 w-3" />
                                  {incident.type.name}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center gap-2 ml-4">
                            <Link href={`/incidents/${incident.id}`}>
                              <Button variant="ghost" size="sm" className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                Ver
                              </Button>
                            </Link>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/incidents/${incident.id}`} className="flex items-center gap-2">
                                    <Eye className="h-4 w-4" />
                                    Ver Detalles
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/incidents/${incident.id}/edit`} className="flex items-center gap-2">
                                    <Edit className="h-4 w-4" />
                                    Editar
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumen de filtros aplicados */}
            {(searchTerm || statusFilter !== "all" || priorityFilter !== "all") && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    <span>Filtros aplicados:</span>
                    {searchTerm && (
                      <Badge variant="outline" className="text-xs">
                        Búsqueda: "{searchTerm}"
                      </Badge>
                    )}
                    {statusFilter !== "all" && (
                      <Badge variant="outline" className="text-xs">
                        Estado: {getStatusText(statusFilter)}
                      </Badge>
                    )}
                    {priorityFilter !== "all" && (
                      <Badge variant="outline" className="text-xs">
                        Prioridad: {getPriorityText(priorityFilter)}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Planes de Acción */}
     <TabsContent value="action-plans" className="space-y-6">
  {/* Controles de filtros y búsqueda para planes de acción */}
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Planes de Acción del Centro
        </CardTitle>
        <Button
          variant="outline"
          onClick={() => setShowActionPlanFilters(!showActionPlanFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          {showActionPlanFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
        </Button>
      </div>
    </CardHeader>
    {showActionPlanFilters && (
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por título, descripción, incidencia o responsable..."
                value={actionPlanSearchTerm}
                onChange={(e) => setActionPlanSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filtro por estado */}
          <Select value={actionPlanStatusFilter} onValueChange={setActionPlanStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="en_proceso">En Progreso</SelectItem>
              <SelectItem value="completado">Completado</SelectItem>
              <SelectItem value="retrasado">Atrasado</SelectItem>
            </SelectContent>
          </Select>

          {/* Ordenamiento */}
          <Select value={actionPlanSortBy} onValueChange={setActionPlanSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Fecha (más reciente)</SelectItem>
              <SelectItem value="dueDate">Fecha límite</SelectItem>
              <SelectItem value="status">Estado</SelectItem>
              <SelectItem value="progress">Progreso</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Botón para limpiar filtros */}
        {(actionPlanSearchTerm || actionPlanStatusFilter !== "all") && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setActionPlanSearchTerm("");
                setActionPlanStatusFilter("all");
              }}
            >
              Limpiar Filtros
            </Button>
          </div>
        )}
      </CardContent>
    )}
  </Card>

  {/* Estadísticas rápidas de planes de acción */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <Card className="cursor-pointer" onClick={() => setActionPlanStatusFilter("all")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-blue-600" />
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-xl font-bold">{filteredActionPlans.length}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="cursor-pointer" onClick={() => setActionPlanStatusFilter("en_proceso")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-yellow-600" />
          <div>
            <p className="text-sm text-muted-foreground">En Progreso</p>
            <p className="text-xl font-bold">
              {filteredActionPlans.filter(p => p.status === 'en_proceso').length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="cursor-pointer" onClick={() => setActionPlanStatusFilter("retrasado")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <div>
            <p className="text-sm text-muted-foreground">Atrasados</p>
            <p className="text-xl font-bold">
              {filteredActionPlans.filter(p => isretrasado(p.dueDate, p.status)).length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="cursor-pointer" onClick={() => setActionPlanStatusFilter("completado")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <div>
            <p className="text-sm text-muted-foreground">Completados</p>
            <p className="text-xl font-bold">
              {filteredActionPlans.filter(p => p.status === 'completado').length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  {/* Lista de planes de acción filtrados */}
  <Card>
    <CardHeader>
      <CardTitle>
        Planes de Acción 
        {filteredActionPlans.length !== (centerActionPlans?.length || 0) && 
          ` (${filteredActionPlans.length} de ${centerActionPlans?.length || 0})`
        }
      </CardTitle>
    </CardHeader>
    <CardContent>
      {actionPlansLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando planes de acción...</p>
        </div>
      ) : filteredActionPlans.length === 0 ? (
        <div className="text-center py-8">
          <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {(actionPlanStatusFilter !== "all" || actionPlanSearchTerm) 
              ? "No se encontraron planes de acción que coincidan con los filtros"
              : "No hay planes de acción registrados"
            }
          </h3>
          <p className="text-muted-foreground mb-4">
            {(actionPlanStatusFilter !== "all" || actionPlanSearchTerm)
              ? "Intenta ajustar los filtros para ver más resultados."
              : "Los planes de acción de las incidencias de tu centro aparecerán aquí."
            }
          </p>
          {(actionPlanStatusFilter !== "all" || actionPlanSearchTerm) && (
            <Button
              variant="outline"
              onClick={() => {
                setActionPlanSearchTerm("");
                setActionPlanStatusFilter("all");
              }}
            >
              Limpiar Filtros
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredActionPlans.map((plan: ActionPlan) => (
            <div key={plan.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                {/* Información principal */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-medium text-lg">{plan.title}</h3>
                    <Badge
                      variant={getActionPlanStatusBadgeVariant(plan.status)}
                      className={`text-xs ${getActionPlanStatusColor(plan.status)}`}
                    >
                      {getActionPlanStatusText(plan.status)}
                    </Badge>
                    
                    {isretrasado(plan.dueDate, plan.status) && (
                      <Badge variant="destructive" className="text-xs">
                        Atrasado
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {plan.description}
                  </p>

                  {/* Información de la incidencia relacionada */}
                  {plan.incident && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                          Incidencia: {plan.incident.incidentNumber}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {plan.incident.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-blue-700">{plan.incident.title}</p>
                    </div>
                  )}

                  {/* Progreso y estadísticas */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all" 
                          style={{ width: `${plan.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-muted-foreground">{plan.progress}%</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckSquare className="h-3 w-3" />
                        {plan._count.completedTasks}/{plan._count.tasks} tareas
                      </span>
                      
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Vence: {new Date(plan.dueDate).toLocaleDateString('es-ES')}
                      </span>

                      {plan._count.comments > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {plan._count.comments} comentarios
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Responsable y participantes */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {plan.assignee && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Responsable: {plan.assignee.firstName} {plan.assignee.lastName}
                      </span>
                    )}

                    {plan.participants.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {plan.participants.length} participante(s)
                      </span>
                    )}

                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Creado: {new Date(plan.createdAt).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 ml-4">
                  <Link href={`/action-plans/${plan.id}`}>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      Ver
                    </Button>
                  </Link>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/action-plans/${plan.id}`} className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Ver Detalles
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/incidents/${plan.incident?.id}`} className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Ver Incidencia
                        </Link>
                      </DropdownMenuItem>
                      {plan.assignee && (
                        <DropdownMenuItem asChild>
                          <Link href={`/action-plans/${plan.id}/edit`} className="flex items-center gap-2">
                            <Edit className="h-4 w-4" />
                            Editar Plan
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>

  {/* Resumen de filtros aplicados para planes de acción */}
  {(actionPlanSearchTerm || actionPlanStatusFilter !== "all") && (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filtros aplicados:</span>
          {actionPlanSearchTerm && (
            <Badge variant="outline" className="text-xs">
              Búsqueda: "{actionPlanSearchTerm}"
            </Badge>
          )}
          {actionPlanStatusFilter !== "all" && (
            <Badge variant="outline" className="text-xs">
              Estado: {getActionPlanStatusText(actionPlanStatusFilter)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )}
</TabsContent>

          {/* Tab: Rendimiento */}
          <TabsContent value="performance" className="space-y-6">
            {/* KPIs principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Eficiencia Global</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round((performanceMetrics.completionRate + performanceMetrics.taskCompletionRate) / 2)}%
                  </div>
                  <p className="text-xs text-muted-foreground">Promedio de completitud</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Tiempo de Resolución</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {performanceMetrics.avgResolutionTime} días
                  </div>
                  <p className="text-xs text-muted-foreground">Promedio para resolver</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Tiempo de Respuesta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {performanceMetrics.avgResponseTime} días
                  </div>
                  <p className="text-xs text-muted-foreground">Promedio para asignar</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Tasa de Finalización</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {performanceMetrics.completionRate}%
                  </div>
                  <p className="text-xs text-muted-foreground">Incidencias completadas</p>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de tendencias de productividad */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Tendencias de Productividad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={trendData}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="resolved" 
                      stroke="#22c55e" 
                      strokeWidth={3}
                      name="Incidencias Resueltas"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="actionPlans" 
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      name="Planes Completados"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="tasksCompleted" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      name="Tareas Completadas"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Alertas y recomendaciones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Alertas y Recomendaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {criticalIncidents.length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium text-red-800">
                        {criticalIncidents.length} incidencia(s) critica(s) requieren atención inmediata
                      </p>
                      <p className="text-sm text-red-600">
                        Revisa y asigna recursos para resolver estas incidencias prioritarias.
                      </p>
                    </div>
                  </div>
                )}

                {(centerStats?.actionPlans?.retrasado || 0) > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-orange-800">
                        {centerStats?.actionPlans?.retrasado} plan(es) de acción retrasado(s)
                      </p>
                      <p className="text-sm text-orange-600">
                        Contacta a los responsables para acelerar la implementación.
                      </p>
                    </div>
                  </div>
                )}

                {performanceMetrics.completionRate >= 90 && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">
                        ¡Excelente rendimiento!
                      </p>
                      <p className="text-sm text-green-600">
                        Tu centro mantiene una alta tasa de resolución. Continúa con las buenas prácticas.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}