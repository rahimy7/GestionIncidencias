
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Clock, CheckCircle, TrendingUp } from "lucide-react";
import { IncidentForm } from "./IncidentForm";
import IncidentList, { IncidentsList } from "./IncidentList";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  totalIncidents: number;
  enproceso: number;
  completado: number;
  avgResolutionTime: number;
}

export default function Dashboard() {
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading, error } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  if (error && isUnauthorizedError(error as Error)) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Incidencias</p>
                <p className="text-3xl font-bold text-foreground" data-testid="text-total-incidents">
                  {statsLoading ? "..." : stats?.totalIncidents || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Sistema completo</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En Progreso</p>
                <p className="text-3xl font-bold text-warning" data-testid="text-in-progress">
                  {statsLoading ? "..." : stats?.enproceso || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completadas</p>
                <p className="text-3xl font-bold text-secondary" data-testid="text-completed">
                  {statsLoading ? "..." : stats?.completado || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-secondary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats?.totalIncidents ? Math.round((stats.completado / stats.totalIncidents) * 100) : 0}% tasa de resolución
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tiempo Promedio</p>
                <p className="text-3xl font-bold text-accent" data-testid="text-avg-resolution">
                  {statsLoading ? "..." : `${stats?.avgResolutionTime || 0}d`}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Días de resolución</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* New Incident Form */}
        <IncidentForm />

        {/* Recent Incidents List */}
        <div className="bg-card p-6 rounded-lg border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-secondary" />
              Incidencias Recientes
            </span>
            <a href="/incidents" className="text-sm text-primary hover:text-primary/80">
              Ver todas
            </a>
          </h3>
          <IncidentList limit={5} showFilters={false} />
        </div>
      </div>
    </div>
  );
}
