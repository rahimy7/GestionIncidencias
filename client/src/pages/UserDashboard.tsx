import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { FileText, Clock, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { Link } from "wouter";

export function UserDashboard() {
  const { user } = useAuth();
  
  // Obtener incidencias del usuario actual
  const { data: myIncidents, isLoading } = useQuery({
    queryKey: ['/api/incidents/my'],
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'pending_approval': return <AlertCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (isLoading) {
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
              Mis Incidencias
            </h1>
            <p className="text-muted-foreground mt-2">
              Gestiona tus reportes de incidencias y sigue su progreso
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
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold" data-testid="stat-total">
                    {myIncidents?.length || 0}
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
                  <p className="text-2xl font-bold" data-testid="stat-in-progress">
                    {myIncidents?.filter((i: any) => i.status === 'in_progress').length || 0}
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
                  <p className="text-2xl font-bold" data-testid="stat-completed">
                    {myIncidents?.filter((i: any) => i.status === 'completed').length || 0}
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
                  <p className="text-2xl font-bold" data-testid="stat-critical">
                    {myIncidents?.filter((i: any) => i.priority === 'critical').length || 0}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Incidents List */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Incidencias</CardTitle>
          </CardHeader>
          <CardContent>
            {!myIncidents || myIncidents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No tienes incidencias reportadas
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
                {myIncidents.map((incident: any) => (
                  <div 
                    key={incident.id} 
                    className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    data-testid={`incident-card-${incident.id}`}
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
                          <div className={`flex items-center gap-1 ${getStatusColor(incident.status)}`}>
                            {getStatusIcon(incident.status)}
                            <span className="text-sm capitalize">
                              {incident.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <h4 className="font-medium text-foreground mb-1">
                          {incident.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {incident.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Creado: {new Date(incident.createdAt).toLocaleDateString('es-ES')}
                          </span>
                          {incident.center && (
                            <span>Centro: {incident.center.name}</span>
                          )}
                        </div>
                      </div>
                      <Link href={`/incidents/${incident.id}`}>
                        <Button variant="outline" size="sm" data-testid={`button-view-incident-${incident.id}`}>
                          Ver Detalles
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}