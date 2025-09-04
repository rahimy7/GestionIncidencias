// client/src/components/IncidentsListView.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Calendar as CalendarIcon,
  SortAsc,
  SortDesc,
  X
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface IncidentsListViewProps {
  status?: string;
  onBack: () => void;
}

interface IncidentFilters {
  search: string;
  centerId: string;
  priority: string;
  status: string;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy: 'date' | 'priority';
  sortOrder: 'asc' | 'desc';
}

export function IncidentsList({ status, onBack }: IncidentsListViewProps) {
  const [filters, setFilters] = useState<IncidentFilters>({
    search: '',
    centerId: '',
    priority: '',
    status: status || '',
    sortBy: 'date',
    sortOrder: 'desc'
  });

  const [showFilters, setShowFilters] = useState(false);

  // Obtener lista de centros para el filtro
const { data: centers = [] } = useQuery({
  queryKey: ['/api/centers'],
  queryFn: async () => {
    const response = await fetch('/api/centers');
    if (!response.ok) throw new Error('Error fetching centers');
    return response.json();
  }
});

  // Obtener incidencias con filtros
// Obtener incidencias con filtros
const { data: incidents, isLoading, refetch } = useQuery({
  queryKey: ['/api/incidents/filtered', filters],
  queryFn: async () => {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.centerId) params.append('centerId', filters.centerId);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.status) params.append('status', filters.status);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom.toISOString());
    if (filters.dateTo) params.append('dateTo', filters.dateTo.toISOString());
    params.append('sortBy', filters.sortBy);
    params.append('sortOrder', filters.sortOrder);

    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/incidents/filtered?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Error fetching incidents');
    return response.json();
  }
});

  const updateFilter = (key: keyof IncidentFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      centerId: '',
      priority: '',
      status: status || '',
      sortBy: 'date',
      sortOrder: 'desc'
    });
  };

  const toggleSort = (field: 'date' | 'priority') => {
    if (filters.sortBy === field) {
      updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      updateFilter('sortBy', field);
      updateFilter('sortOrder', 'desc');
    }
  };

  const priorityLabels = {
    low: 'Baja',
    medium: 'Media', 
    high: 'Alta',
    critical: 'Crítica'
  };

  const statusLabels = {
    reported: 'Reportada',
    assigned: 'Asignada',
    in_progress: 'En Progreso',
    pending_approval: 'Pendiente Aprobación',
    completed: 'Completada'
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      critical: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      reported: 'bg-gray-100 text-gray-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-indigo-100 text-indigo-800',
      pending_approval: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Gestión de Incidencias</h1>
            <p className="text-muted-foreground">
              {incidents?.length || 0} incidencias encontradas
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Búsqueda */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Título o número..."
                    value={filters.search}
                    onChange={(e) => updateFilter('search', e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Tienda/Centro */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tienda</label>
                <Select value={filters.centerId} onValueChange={(value) => updateFilter('centerId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tienda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas las tiendas</SelectItem>
                  {(Array.isArray(centers) ? centers : []).map((center: any) => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Prioridad */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Prioridad</label>
                <Select value={filters.priority} onValueChange={(value) => updateFilter('priority', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Estado */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="reported">Reportada</SelectItem>
                    <SelectItem value="assigned">Asignada</SelectItem>
                    <SelectItem value="in_progress">En Progreso</SelectItem>
                    <SelectItem value="pending_approval">Pendiente Aprobación</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filtros de fecha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha desde</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? format(filters.dateFrom, "dd/MM/yyyy", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => updateFilter('dateFrom', date)}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha hasta</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? format(filters.dateTo, "dd/MM/yyyy", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => updateFilter('dateTo', date)}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Acciones de filtro */}
            <div className="flex justify-between items-center">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpiar filtros
              </Button>

              <div className="flex gap-2">
                <Button
                  variant={filters.sortBy === 'date' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSort('date')}
                >
                  {filters.sortBy === 'date' && filters.sortOrder === 'asc' ? 
                    <SortAsc className="h-4 w-4 mr-2" /> : 
                    <SortDesc className="h-4 w-4 mr-2" />
                  }
                  Fecha
                </Button>
                <Button
                  variant={filters.sortBy === 'priority' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSort('priority')}
                >
                  {filters.sortBy === 'priority' && filters.sortOrder === 'asc' ? 
                    <SortAsc className="h-4 w-4 mr-2" /> : 
                    <SortDesc className="h-4 w-4 mr-2" />
                  }
                  Prioridad
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de incidencias */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : incidents?.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground text-lg">
                No se encontraron incidencias con los filtros aplicados
              </p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </CardContent>
          </Card>
        ) : (
          incidents?.map((incident: any) => (
            <Card key={incident.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{incident.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {incident.incidentNumber}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm line-clamp-2">
                      {incident.description}
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Badge className={getPriorityColor(incident.priority)}>
                      {priorityLabels[incident.priority as keyof typeof priorityLabels]}
                    </Badge>
                    <Badge className={getStatusColor(incident.status)}>
                      {statusLabels[incident.status as keyof typeof statusLabels]}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span>📍 {incident.center?.name}</span>
                    <span>👤 {incident.reporter?.name}</span>
                    {incident.assignee && (
                      <span>🔧 {incident.assignee.name}</span>
                    )}
                  </div>
                  <span>
                    {format(new Date(incident.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}