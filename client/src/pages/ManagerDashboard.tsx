import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Calendar,
  Search,
  Filter,
  Eye,
  ArrowUpDown
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

// Interfaces para TypeScript
interface Center {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  managerId?: string | null;
  createdAt?: Date | null;
}

interface User {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

interface Incident {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  centerId: string;
  typeId?: string;
  reporterId: string;
  assigneeId?: string | null;
  createdAt: string;
  updatedAt: string;
  reporter?: User;
  assignee?: User;
  center?: Center;
}

export function ManagerDashboard() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  
  // Obtener información del centro del manager
  const { data: centerInfo, isLoading: centerLoading } = useQuery<Center | null>({
    queryKey: ['/api/centers/my'],
    enabled: !!user,
  });

  // Obtener todas las incidencias del centro usando el endpoint correcto
  const { data: centerIncidents, isLoading: incidentsLoading, refetch: refetchIncidents } = useQuery<Incident[]>({
    queryKey: ['/api/incidents/filtered', centerInfo?.id, statusFilter, priorityFilter, searchTerm, sortBy],
    queryFn: async () => {
      if (!centerInfo?.id) return [];
      
      const params = new URLSearchParams({
        centerId: centerInfo.id,
        sortBy: sortBy === 'date' ? 'createdAt' : sortBy,
        sortOrder: 'desc',
        limit: '100'
      });
      
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/incidents/filtered?${params}`);
      if (!response.ok) throw new Error('Failed to load incidents');
      return response.json();
    },
    enabled: !!centerInfo?.id,
  });

  // Obtener estadísticas del centro
  const { data: centerStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/center-stats', centerInfo?.id],
    queryFn: async () => {
      if (!centerInfo?.id) return null;
      const response = await fetch(`/api/dashboard/center-stats/${centerInfo.id}`);
      if (!response.ok) throw new Error('Failed to load center stats');
      return response.json();
    },
    enabled: !!centerInfo?.id,
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
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'assigned': return 'text-purple-600 bg-purple-50';
      case 'pending_approval': return 'text-orange-600 bg-orange-50';
      case 'reported': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completada';
      case 'in_progress': return 'En Progreso';
      case 'assigned': return 'Asignada';
      case 'pending_approval': return 'Pendiente Aprobación';
      case 'reported': return 'Reportada';
      default: return status;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'critical': return 'Crítica';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  };

  if (centerLoading || statsLoading) {
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

  // Si no hay centro asignado al manager
  if (!centerInfo) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-12">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Sin Centro Asignado</h1>
            <p className="text-muted-foreground mb-4">
              No tienes un centro o tienda asignado para gestionar. 
            </p>
            <p className="text-sm text-muted-foreground">
              Contacta al administrador para que te asigne un centro.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Calcular estadísticas básicas
  const allIncidents = centerIncidents || [];
  const totalIncidents = allIncidents.length;
  const pendingIncidents = allIncidents.filter((i: Incident) => 
    ['reported', 'assigned'].includes(i.status)
  );
  const inProgressIncidents = allIncidents.filter((i: Incident) => 
    i.status === 'in_progress'
  );
  const completedIncidents = allIncidents.filter((i: Incident) => 
    i.status === 'completed'
  );
  const criticalIncidents = allIncidents.filter((i: Incident) => 
    i.priority === 'critical' && i.status !== 'completed'
  );

  // Obtener incidencias recientes (últimas 10)
  const recentIncidents = allIncidents.slice(0, 10);

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

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Incidencias</p>
                  <p className="text-2xl font-bold text-foreground">{totalIncidents}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
                  <p className="text-2xl font-bold text-foreground">{pendingIncidents.length}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">En Progreso</p>
                  <p className="text-2xl font-bold text-foreground">{inProgressIncidents.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Críticas</p>
                  <p className="text-2xl font-bold text-foreground">{criticalIncidents.length}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="recent" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="recent">Recientes</TabsTrigger>
            <TabsTrigger value="pending">Pendientes ({pendingIncidents.length})</TabsTrigger>
            <TabsTrigger value="critical">Críticas ({criticalIncidents.length})</TabsTrigger>
            <TabsTrigger value="all">Todas ({totalIncidents})</TabsTrigger>
          </TabsList>

          {/* Filtros y búsqueda para la vista "Todas" */}
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros y Búsqueda
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Buscar por título, descripción o número..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="reported">Reportada</SelectItem>
                      <SelectItem value="assigned">Asignada</SelectItem>
                      <SelectItem value="in_progress">En Progreso</SelectItem>
                      <SelectItem value="pending_approval">Pendiente Aprobación</SelectItem>
                      <SelectItem value="completed">Completada</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las prioridades</SelectItem>
                      <SelectItem value="critical">Crítica</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="low">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Fecha (más reciente)</SelectItem>
                      <SelectItem value="priority">Prioridad</SelectItem>
                      <SelectItem value="status">Estado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            
            {/* Lista de todas las incidencias con filtros aplicados */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Todas las Incidencias del Centro 
                  {(statusFilter !== 'all' || priorityFilter !== 'all' || searchTerm) && 
                    ` (${allIncidents.length} ${allIncidents.length === 1 ? 'resultado' : 'resultados'})`
                  }
                </CardTitle>
              </CardHeader>
              <CardContent>
                {incidentsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Cargando incidencias...</p>
                  </div>
                ) : allIncidents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      {(statusFilter !== 'all' || priorityFilter !== 'all' || searchTerm) 
                        ? 'No se encontraron incidencias'
                        : 'No hay incidencias registradas'
                      }
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {(statusFilter !== 'all' || priorityFilter !== 'all' || searchTerm)
                        ? 'Intenta ajustar los filtros o términos de búsqueda'
                        : 'Las incidencias aparecerán aquí cuando se reporten'
                      }
                    </p>
                    <Link href="/incidents/new">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Reportar Primera Incidencia
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allIncidents.map((incident: Incident) => (
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
                              <div className={`w-3 h-3 rounded-full ${getPriorityColor(incident.priority)}`} />
                              <Badge variant="outline" className={getStatusColor(incident.status)}>
                                {getStatusText(incident.status)}
                              </Badge>
                              <Badge variant="secondary">
                                {getPriorityText(incident.priority)}
                              </Badge>
                            </div>
                            <h3 className="font-semibold mb-1">{incident.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {incident.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>
                                Reportado por: {incident.reporter?.firstName} {incident.reporter?.lastName || incident.reporter?.email}
                              </span>
                              <span>•</span>
                              <span>
                                {new Date(incident.createdAt).toLocaleDateString('es-ES', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {incident.assignee && (
                                <>
                                  <span>•</span>
                                  <span>
                                    Asignado a: {incident.assignee.firstName} {incident.assignee.lastName}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <Link href={`/incidents/${incident.id}`}>
                            <Button variant="outline" size="sm" className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              Ver Detalle
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

          {/* Vista de incidencias recientes */}
          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Incidencias Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                {recentIncidents.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay incidencias recientes</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentIncidents.map((incident: Incident) => (
                      <div 
                        key={incident.id}
                        className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-medium text-primary">
                                {incident.incidentNumber}
                              </span>
                              <div className={`w-3 h-3 rounded-full ${getPriorityColor(incident.priority)}`} />
                              <Badge variant="outline" className={getStatusColor(incident.status)}>
                                {getStatusText(incident.status)}
                              </Badge>
                            </div>
                            <h3 className="font-semibold mb-1">{incident.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              Reportado por: {incident.reporter?.firstName} {incident.reporter?.lastName || incident.reporter?.email}
                            </p>
                            <div className="text-xs text-muted-foreground">
                              {new Date(incident.createdAt).toLocaleDateString('es-ES')}
                            </div>
                          </div>
                          <Link href={`/incidents/${incident.id}`}>
                            <Button variant="outline" size="sm">
                              Ver Detalle
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

          {/* Vista de incidencias pendientes */}
          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Incidencias Pendientes de Acción</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingIncidents.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">¡Excelente trabajo!</h3>
                    <p className="text-muted-foreground">No hay incidencias pendientes por atender</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingIncidents.map((incident: Incident) => (
                      <div 
                        key={incident.id}
                        className="border border-orange-200 bg-orange-50 rounded-lg p-4 hover:bg-orange-100 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-medium text-primary">
                                {incident.incidentNumber}
                              </span>
                              <div className={`w-3 h-3 rounded-full ${getPriorityColor(incident.priority)}`} />
                              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                                {getStatusText(incident.status)}
                              </Badge>
                              <Badge variant="secondary">
                                {getPriorityText(incident.priority)}
                              </Badge>
                            </div>
                            <h3 className="font-semibold mb-1">{incident.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              Reportado por: {incident.reporter?.firstName} {incident.reporter?.lastName || incident.reporter?.email}
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

          {/* Vista de incidencias críticas */}
          <TabsContent value="critical" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  Incidencias Críticas Activas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {criticalIncidents.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Sin incidencias críticas</h3>
                    <p className="text-muted-foreground">No hay incidencias críticas activas en este centro</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {criticalIncidents.map((incident: Incident) => (
                      <div 
                        key={incident.id}
                        className="border border-red-200 bg-red-50 rounded-lg p-4 hover:bg-red-100 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-medium text-primary">
                                {incident.incidentNumber}
                              </span>
                              <div className="w-3 h-3 rounded-full bg-red-500" />
                              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                                {getStatusText(incident.status)}
                              </Badge>
                              <Badge className="bg-red-500 text-white">
                                CRÍTICA
                              </Badge>
                            </div>
                            <h3 className="font-semibold mb-1">{incident.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              Reportado por: {incident.reporter?.firstName} {incident.reporter?.lastName || incident.reporter?.email}
                            </p>
                            <div className="text-xs text-muted-foreground">
                              {new Date(incident.createdAt).toLocaleDateString('es-ES')}
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
        </Tabs>
      </div>
    </Layout>
  );
}