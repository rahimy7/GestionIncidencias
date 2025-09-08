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

  const allIncidents = [...(myReportedIncidents || []), ...(myAssignedIncidents || [])];
  const uniqueIncidents = allIncidents.filter((incident, index, self) => 
    index === self.findIndex(i => i.id === incident.id)
  );

  if (loadingReported || loadingAssigned) {
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
              Gestiona tus incidencias reportadas y asignadas
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold" data-testid="stat-total">
                    {uniqueIncidents.length}
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
                  <p className="text-sm text-muted-foreground">Reportadas</p>
                  <p className="text-2xl font-bold" data-testid="stat-reported">
                    {myReportedIncidents?.length || 0}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Asignadas</p>
                  <p className="text-2xl font-bold" data-testid="stat-assigned">
                    {myAssignedIncidents?.length || 0}
                  </p>
                </div>
                <ClipboardCheck className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">En Progreso</p>
                  <p className="text-2xl font-bold" data-testid="stat-in-progress">
                    {uniqueIncidents.filter((i: any) => i.status === 'in_progress').length}
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
                  <p className="text-sm text-muted-foreground">Críticas</p>
                  <p className="text-2xl font-bold" data-testid="stat-critical">
                    {uniqueIncidents.filter((i: any) => i.priority === 'critical').length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different incident views */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Todas mis Incidencias</TabsTrigger>
            <TabsTrigger value="reported">Incidencias Reportadas</TabsTrigger>
            <TabsTrigger value="assigned">Incidencias Asignadas</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Todas mis Incidencias</CardTitle>
              </CardHeader>
              <CardContent>
                {uniqueIncidents.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No tienes incidencias
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Crea tu primera incidencia para comenzar a usar el sistema
                    </p>
                    <Link href="/incidents/new">
                      <Button data-testid="button-create-first-incident">
                        <Plus className="h-4 w-4 mr-2" />
                        Crear Primera Incidencia
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {uniqueIncidents.map((incident: any) => {
                      const isReported = myReportedIncidents?.some((r: any) => r.id === incident.id);
                      const isAssigned = myAssignedIncidents?.some((a: any) => a.id === incident.id);
                      let showType = "";
                      if (isReported && isAssigned) {
                        showType = "Reportada y Asignada";
                      } else if (isReported) {
                        showType = "Reportada";
                      } else if (isAssigned) {
                        showType = "Asignada";
                      }
                      
                      return (
                        <IncidentCard 
                          key={incident.id} 
                          incident={incident} 
                          showType={showType}
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reported" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Incidencias que he Reportado
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!myReportedIncidents || myReportedIncidents.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No has reportado incidencias
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Reporta una incidencia para darle seguimiento
                    </p>
                    <Link href="/incidents/new">
                      <Button data-testid="button-report-first-incident">
                        <Plus className="h-4 w-4 mr-2" />
                        Reportar Incidencia
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myReportedIncidents.map((incident: any) => (
                      <IncidentCard key={incident.id} incident={incident} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assigned" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Incidencias que debo Trabajar
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!myAssignedIncidents || myAssignedIncidents.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      No tienes incidencias asignadas
                    </h3>
                    <p className="text-muted-foreground">
                      Las incidencias que te asignen aparecerán aquí para que puedas trabajar en ellas
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myAssignedIncidents.map((incident: any) => (
                      <IncidentCard key={incident.id} incident={incident} />
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