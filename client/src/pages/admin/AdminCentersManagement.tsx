// client/src/pages/admin/AdminCentersManagement.tsx
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Building2,
  Store,
  Edit,
  Trash2,
  Eye,
  Crown,
  Users,
  MapPin,
  Plus,
  ArrowLeft,
  AlertCircle
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface Center {
  id: string;
  name: string;
  code: string;
  address?: string;
  managerId?: string;
  manager?: { 
    firstName: string;
    lastName: string;
    name?: string;
  };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  centerId?: string;
}

export function AdminCentersManagement() {
  const [filterType, setFilterType] = useState<'all' | 'store' | 'center'>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: centers = [], isLoading: centersLoading, error: centersError } = useQuery({
    queryKey: ['/api/centers', filterType],
    queryFn: async (): Promise<Center[]> => {
      const token = localStorage.getItem('auth_token');
      const params = filterType !== 'all' ? `?type=${filterType}` : '';
      const response = await fetch(`/api/centers${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load centers');
      return response.json();
    }
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async (): Promise<User[]> => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load users');
      return response.json();
    }
  });

  const deleteCenterMutation = useMutation({
    mutationFn: async (centerId: string) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/centers/${centerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete center');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/centers'] });
      toast({
        title: "Centro/Tienda eliminado",
        description: "Ha sido eliminado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const getManagerName = (center: Center) => {
    if (center.manager) {
      return `${center.manager.firstName} ${center.manager.lastName}`;
    }
    if (center.managerId) {
      const manager = users.find(u => u.id === center.managerId);
      if (manager) {
        return `${manager.firstName} ${manager.lastName}`;
      }
    }
    return 'Sin asignar';
  };

  const getUsersCount = (centerId: string) => {
    return users.filter(user => user.centerId === centerId).length;
  };

  const getCenterType = (code: string) => {
    if (code.startsWith('T')) return { type: 'Tienda', color: 'bg-purple-100 text-purple-800', icon: Store };
    if (code.startsWith('TCD')) return { type: 'Centro', color: 'bg-blue-100 text-blue-800', icon: Building2 };
    return { type: 'Centro', color: 'bg-gray-100 text-gray-800', icon: Building2 };
  };

  const handleDeleteCenter = (centerId: string, centerName: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar ${centerName}?`)) {
      deleteCenterMutation.mutate(centerId);
    }
  };

  const allCenters = centers;
  const stores = centers.filter(c => c.code.startsWith('T'));
  const distributionCenters = centers.filter(c => c.code.startsWith('TCD'));

  if (centersError) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Error al cargar centros</h3>
            <p className="text-muted-foreground">No se pudieron cargar los centros. Intenta de nuevo.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">Gestión de Centros y Tiendas</h1>
            <p className="text-muted-foreground">
              Administra centros de distribución (TCD) y tiendas (T)
            </p>
          </div>
          <div className="flex gap-2">
            <select 
              className="px-3 py-2 border rounded-lg"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="all">Todos</option>
              <option value="store">Solo Tiendas (T)</option>
              <option value="center">Solo Centros (TCD)</option>
            </select>
            <Link href="/admin/centers/new">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Centro/Tienda
              </Button>
            </Link>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-500">Total Tiendas</p>
                  <p className="text-xl font-bold">{stores.length}</p>
                  <p className="text-xs text-gray-400">Código: T##</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Centros Distribución</p>
                  <p className="text-xl font-bold">{distributionCenters.length}</p>
                  <p className="text-xs text-gray-400">Código: TCD##</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">Total Usuarios</p>
                  <p className="text-xl font-bold">{users.filter(u => u.centerId).length}</p>
                  <p className="text-xs text-gray-400">Asignados a centros</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Centros/Tiendas */}
        {centersLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : centers.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay centros/tiendas registrados</h3>
            <p className="text-muted-foreground mb-4">
              {filterType === 'store' ? 'No hay tiendas registradas' :
               filterType === 'center' ? 'No hay centros registrados' :
               'Crea tu primer centro o tienda para comenzar'}
            </p>
            <Link href="/admin/centers/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Crear {filterType === 'store' ? 'tienda' : filterType === 'center' ? 'centro' : 'centro/tienda'}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {centers.map((center) => {
              const centerType = getCenterType(center.code);
              const IconComponent = centerType.icon;
              return (
                <Card key={center.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <IconComponent className="h-5 w-5 text-gray-500" />
                          <h3 className="font-semibold text-lg">{center.name}</h3>
                        </div>
                        <p className="text-sm text-gray-500 font-mono">{center.code}</p>
                        <Badge className={`mt-1 ${centerType.color}`}>
                          {centerType.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/centers/${center.id}`}>
                          <button className="p-1 text-gray-400 hover:text-blue-600">
                            <Eye className="h-4 w-4" />
                          </button>
                        </Link>
                        <Link href={`/admin/centers/${center.id}/edit`}>
                          <button className="p-1 text-gray-400 hover:text-green-600">
                            <Edit className="h-4 w-4" />
                          </button>
                        </Link>
                        <button 
                          className="p-1 text-gray-400 hover:text-red-600"
                          onClick={() => handleDeleteCenter(center.id, center.name)}
                          disabled={deleteCenterMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {center.address && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-600">{center.address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <Crown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-600">Gerente: {getManagerName(center)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-600">{getUsersCount(center.id)} usuarios</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Activo
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}