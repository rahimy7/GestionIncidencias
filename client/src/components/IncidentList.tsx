// client/src/components/IncidentList.tsx
import { useState, useMemo } from "react";
import { useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isWithinInterval } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IncidentCard } from "@/components/IncidentCard";
import { 
  Filter,
  X,
  Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  assignee?: { firstName: string; lastName: string; email: string };
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [incidentToDelete, setIncidentToDelete] = useState<Incident | null>(null);

  // Filtros desde URL
  const centerId = get("centerId") || "all";
  const typeId = get("typeId") || "all";
  const status = get("status") || "all";
  const startDate = get("startDate");
  const endDate = get("endDate");
  const sortBy = (get("sortBy") as SortBy) || "createdAt";
  const sortDir = (get("sortDir") as SortDir) || "desc";

  // Cargar datos con token
  const { data: incidents = [], isLoading } = useQuery<Incident[]>({
    queryKey: ["incidents", { centerId, typeId, status, startDate, endDate, sortBy, sortDir }],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No auth token found');

      const qs = new URLSearchParams();
      if (centerId && centerId !== "all") qs.set("centerId", centerId);
      if (typeId && typeId !== "all") qs.set("typeId", typeId);
      if (status && status !== "all") qs.set("status", status);
      if (startDate) qs.set("startDate", startDate);
      if (endDate) qs.set("endDate", endDate);
      if (sortBy) qs.set("sortBy", sortBy);
      if (sortDir) qs.set("sortDir", sortDir);
      
      const url = `/api/incidents${qs.toString() ? `?${qs.toString()}` : ''}`;
      const res = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to fetch incidents');
      }

      return res.json();
    },
  });

  const { data: centers = [] } = useQuery<Center[]>({
    queryKey: ["/api/centers"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/centers', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch centers');
      return res.json();
    },
  });

  const { data: types = [] } = useQuery<IncidentType[]>({
    queryKey: ["/api/incident-types"],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/incident-types', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch incident types');
      return res.json();
    },
  });

  // Mutation para eliminar incidencia
  const deleteIncidentMutation = useMutation({
    mutationFn: async (incidentId: string) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/incidents/${incidentId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al eliminar la incidencia');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Incidencia eliminada',
        description: `La incidencia ${data.deletedIncidentNumber} fue eliminada exitosamente`,
      });
      
      // Invalidar queries para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      setIncidentToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setIncidentToDelete(null);
    },
  });

  const handleDeleteIncident = (incidentId: number) => {
    const incident = incidents.find(i => i.id === String(incidentId));
    if (incident) {
      setIncidentToDelete(incident);
    }
  };

  const confirmDelete = () => {
    if (incidentToDelete) {
      deleteIncidentMutation.mutate(incidentToDelete.id);
    }
  };

  // Filtros aplicados
  const filtered = useMemo(() => {
    let list = incidents;
    if (centerId !== "all") list = list.filter(i => i.centerId === centerId);
    if (typeId !== "all") list = list.filter(i => i.typeId === typeId);
    if (status !== "all") list = list.filter(i => i.status === status);
    if (startDate && endDate) {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      list = list.filter(i => {
        const d = parseISO(i.createdAt);
        return isWithinInterval(d, { start, end });
      });
    }
    return list;
  }, [incidents, centerId, typeId, status, startDate, endDate]);

  const activeFilters =
    (centerId !== "all" ? 1 : 0) +
    (typeId !== "all" ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (startDate && endDate ? 1 : 0);

  const clearFilters = () => {
    setMany({ centerId: null, typeId: null, status: null, startDate: null, endDate: null });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Centro</label>
              <Select value={centerId} onValueChange={v => setMany({ centerId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los centros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los centros</SelectItem>
                  {centers.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tipo</label>
              <Select value={typeId} onValueChange={v => setMany({ typeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {types.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Estado</label>
              <Select value={status} onValueChange={v => setMany({ status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="reported">Reportada</SelectItem>
                  <SelectItem value="assigned">Asignada</SelectItem>
                  <SelectItem value="in_progress">En Progreso</SelectItem>
                  <SelectItem value="pending_approval">Pendiente Aprobación</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="closed">Cerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Fecha</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setMany({ startDate: e.target.value })}
                  placeholder="Desde"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setMany({ endDate: e.target.value })}
                  placeholder="Hasta"
                />
              </div>
            </div>
          </div>

          {activeFilters > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Limpiar filtros
              </Button>
              <span className="text-sm text-muted-foreground">
                {filtered.length} de {incidents.length} incidencias
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          Lista de Incidencias ({filtered.length})
        </h2>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando incidencias...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No se encontraron incidencias</p>
              <p className="text-muted-foreground mt-2">
                {activeFilters > 0
                  ? "Intenta ajustar los filtros para ver más resultados"
                  : "No hay incidencias registradas"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(incident => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              onDelete={handleDeleteIncident}
            />
          ))}
        </div>
      )}

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={!!incidentToDelete} onOpenChange={() => setIncidentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la incidencia{' '}
              <strong>{incidentToDelete?.incidentNumber}</strong>
              {' '}- {incidentToDelete?.title} y todos sus datos relacionados (planes de acción, tareas, comentarios, etc.).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteIncidentMutation.isPending}
            >
              {deleteIncidentMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export { default as IncidentsList } from "./IncidentList";