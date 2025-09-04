// client/src/components/IncidentList.tsx - MEJORADO
import { useState, useMemo } from "react";
import { useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isWithinInterval } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IncidentDetail } from "@/components/IncidentDetail";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  MapPin,
  Filter,
  X,
  Search,
  Eye
} from "lucide-react";

type Incident = {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  status: "reported" | "in_progress" | "resolved" | string;
  priority: "low" | "medium" | "high" | "critical" | string;
  centerId: string;
  typeId: string;
  createdAt: string;
  updatedAt: string;
  center?: { id: string; name: string; code: string };
  type?: { id: string; name: string };
  reporter?: { firstName: string; lastName: string; email: string };
};

type Center = { id: string; name: string; code?: string };
type IncidentType = { id: string; name: string };
type SortBy = "center" | "type" | "createdAt";
type SortDir = "asc" | "desc";

function useQueryString() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);

  const get = (k: string) => params.get(k) || "";
  const setMany = (entries: Record<string, string | undefined | null>) => {
    const p = new URLSearchParams(search);
    Object.entries(entries).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") p.delete(k);
      else p.set(k, String(v));
    });
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  };

  return { get, setMany, all: params };
}

export default function IncidentList() {
  const { get, setMany } = useQueryString();
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Filtros desde URL
  const centerId = get("centerId") || "all";
  const typeId = get("typeId") || "all";
  const startDate = get("startDate");
  const endDate = get("endDate");
  const sortBy = (get("sortBy") as SortBy) || "createdAt";
  const sortDir = (get("sortDir") as SortDir) || "desc";

  // Cargar datos con token
  const { data: incidents = [], isLoading } = useQuery<Incident[]>({
    queryKey: ["incidents", { centerId, typeId, startDate, endDate, sortBy, sortDir }],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No auth token found');

      const qs = new URLSearchParams();
      if (centerId && centerId !== "all") qs.set("centerId", centerId);
  if (typeId && typeId !== "all") qs.set("typeId", typeId);
      if (startDate) qs.set("startDate", startDate);
      if (endDate) qs.set("endDate", endDate);
      if (sortBy) qs.set("sortBy", sortBy);
      if (sortDir) qs.set("sortDir", sortDir);
      
      const url = `/api/incidents${qs.toString() ? `?${qs.toString()}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch incidents: ${response.status}`);
      }
      
      return response.json();
    },
  });

  const { data: centers = [] } = useQuery<Center[]>({
    queryKey: ["centers"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No auth token found');

      const response = await fetch("/api/centers", {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch centers: ${response.status}`);
      }
      
      return response.json();
    },
  });

  const { data: incidentTypes = [] } = useQuery<IncidentType[]>({
    queryKey: ["incident-types"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No auth token found');

      const response = await fetch("/api/incident-types", {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch incident types: ${response.status}`);
      }
      
      const data = await response.json();
      // Filtrar cualquier tipo con ID vacío
      return data.filter((t: IncidentType) => t.id && t.id.trim() !== '');
    },
  });

  // Filtrado del lado cliente
  const clientFiltered = useMemo(() => {
    let filtered = [...incidents];

    if (startDate || endDate) {
      filtered = filtered.filter((incident) => {
        const date = parseISO(incident.createdAt);
        const start = startDate ? parseISO(`${startDate}T00:00:00`) : new Date(0);
        const end = endDate ? parseISO(`${endDate}T23:59:59`) : new Date();
        return isWithinInterval(date, { start, end });
      });
    }

    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      if (sortBy === "center") {
        aVal = a.center?.name || "";
        bVal = b.center?.name || "";
      } else if (sortBy === "type") {
        aVal = a.type?.name || "";
        bVal = b.type?.name || "";
      } else {
        aVal = new Date(a.createdAt);
        bVal = new Date(b.createdAt);
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [incidents, startDate, endDate, sortBy, sortDir]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending_approval': return 'bg-orange-100 text-orange-800';
      case 'reported': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'low': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const statusLabels: Record<string, string> = {
    'reported': 'Reportado',
    'assigned': 'Asignado',
    'in_progress': 'En Progreso',
    'pending_approval': 'Pendiente',
    'completed': 'Completado',
    'resolved': 'Resuelto'
  };

  const priorityLabels: Record<string, string> = {
    'low': 'Baja',
    'medium': 'Media',
    'high': 'Alta',
    'critical': 'Crítica'
  };

  const hasActiveFilters = centerId || typeId || startDate || endDate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lista de Incidencias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Centro</label>
              <Select value={centerId} onValueChange={(value) => setMany({ centerId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los centros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los centros</SelectItem>
                  {centers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.code && `(${c.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tipo</label>
              <Select value={typeId} onValueChange={(value) => setMany({ typeId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {incidentTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Fecha desde</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setMany({ startDate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Fecha hasta</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setMany({ endDate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ordenar</label>
              <div className="flex gap-1">
                <Select value={sortBy} onValueChange={(value) => setMany({ sortBy: value })}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Fecha</SelectItem>
                    <SelectItem value="center">Centro</SelectItem>
                    <SelectItem value="type">Tipo</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMany({ sortDir: sortDir === "asc" ? "desc" : "asc" })}
                  className="px-3"
                >
                  {sortDir === "asc" ? "↑" : "↓"}
                </Button>
              </div>
            </div>
          </div>

          {/* Limpiar filtros */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMany({ centerId: "all", typeId: "all", startDate: "", endDate: "" })}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Limpiar filtros
              </Button>
              <span className="text-sm text-muted-foreground">
                {clientFiltered.length} de {incidents.length} incidencias
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de incidencias */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : clientFiltered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron incidencias</h3>
              <p className="text-muted-foreground">
                {hasActiveFilters 
                  ? "Intenta ajustar los filtros de búsqueda"
                  : "No hay incidencias disponibles en este momento"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientFiltered.map((incident) => (
              <Card 
                key={incident.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => setSelectedIncident(incident)}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {incident.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          #{incident.incidentNumber}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIncident(incident);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(incident.status)}>
                        {statusLabels[incident.status] || incident.status}
                      </Badge>
                      <Badge className={getPriorityColor(incident.priority)}>
                        <div className="flex items-center gap-1">
                          {getPriorityIcon(incident.priority)}
                          {priorityLabels[incident.priority] || incident.priority}
                        </div>
                      </Badge>
                    </div>

                    {/* Descripción */}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {incident.description}
                    </p>

                    {/* Meta información */}
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{incident.center?.name || `Centro ${incident.centerId}`}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{format(parseISO(incident.createdAt), "dd/MM/yyyy HH:mm")}</span>
                      </div>
                      {incident.type && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span>{incident.type.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de detalles */}
      {selectedIncident && (
        <IncidentDetail
          incident={selectedIncident as any}
          onClose={() => setSelectedIncident(null)}
        />
      )}
    </div>
  );
}

export { default as IncidentsList } from "./IncidentList";