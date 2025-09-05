// client/src/pages/admin/AdminCentersManagement.tsx
import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Building2,
  Store,
  Users,
  MapPin,
  Crown,
  Plus,
  ArrowLeft,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ViewCenterDialog } from "@/components/ViewCenterDialog";
import { EditCenterDialog } from "@/components/EditCenterDialog";
import { DeleteCenterDialog } from "@/components/DeleteCenterDialog";

interface Center {
  id: string;
  name: string;
  code: string;
  address?: string;
  managerId?: string;
  manager?: { 
    firstName: string;
    lastName: string;
    email?: string;
  };
  createdAt: string;
  usersCount?: number;
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

  // Query para obtener centros
  const { data: centers = [], isLoading: centersLoading, error: centersError } = useQuery({
    queryKey: ['/api/centers'],
    queryFn: async (): Promise<Center[]> => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/centers', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load centers');
      return response.json();
    }
  });

  // Query para obtener usuarios
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

  // Filtrar centros según el tipo seleccionado
  const filteredCenters = centers.filter(center => {
    if (filterType === 'store') {
      return center.code.startsWith('T') && !center.code.startsWith('TCD');
    }
    if (filterType === 'center') {
      return center.code.startsWith('TCD');
    }
    return true; // 'all'
  });

  // Funciones auxiliares
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
    if (code.startsWith('T') && !code.startsWith('TCD')) {
      return { 
        type: 'Tienda', 
        color: 'bg-purple-100 text-purple-800', 
        icon: Store 
      };
    }
    if (code.startsWith('TCD')) {
      return { 
        type: 'Centro de Distribución', 
        color: 'bg-blue-100 text-blue-800', 
        icon: Building2 
      };
    }
    return { 
      type: 'Centro', 
      color: 'bg-gray-100 text-gray-800', 
      icon: Building2 
    };
  };

  // Estadísticas
  const stores = centers.filter(c => c.code.startsWith('T') && !c.code.startsWith('TCD'));
  const distributionCenters = centers.filter(c => c.code.startsWith('TCD'));
  const assignedUsers = users.filter(u => u.centerId);

  // Manejo de errores
  if (centersError) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Error al cargar centros</h3>
            <p className="text-muted-foreground">No se pudieron cargar los centros. Intenta de nuevo.</p>
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/centers'] })}
              className="mt-4"
            >
              Reintentar
            </Button>
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
                  <p className="text-xl font-bold">{assignedUsers.length}</p>
                  <p className="text-xs text-gray-400">Asignados a centros</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Centros/Tiendas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {filterType === 'store' ? 'Tiendas' : 
               filterType === 'center' ? 'Centros de Distribución' : 
               'Centros y Tiendas'} ({filteredCenters.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {centersLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
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
            ) : filteredCenters.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  No hay {filterType === 'store' ? 'tiendas' : 
                           filterType === 'center' ? 'centros' : 'centros/tiendas'} registrados
                </h3>
                <p className="text-muted-foreground mb-4">
                  {filterType === 'store' ? 'No hay tiendas registradas' :
                   filterType === 'center' ? 'No hay centros registrados' :
                   'Crea tu primer centro o tienda para comenzar'}
                </p>
                <Link href="/admin/centers/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear {filterType === 'store' ? 'tienda' : 
                           filterType === 'center' ? 'centro' : 'centro/tienda'}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {filteredCenters.map((center) => {
                  const centerType = getCenterType(center.code);
                  const IconComponent = centerType.icon;
                  const usersCount = getUsersCount(center.id);
                  
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
                        </div>
                        
                        <div className="space-y-3">
                          {center.address && (
                            <div className="flex items-start gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-600">{center.address}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-sm">
                            <Crown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-600">
                              <span className="font-medium">Gerente:</span> {getManagerName(center)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-600">
                              <span className="font-medium">Usuarios:</span> {usersCount} asignado(s)
                            </span>
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            Creado: {new Date(center.createdAt).toLocaleDateString('es-ES')}
                          </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                          {/* Componente ViewCenterDialog */}
                          <ViewCenterDialog center={{ ...center, usersCount }} />
                          
                          {/* Componente EditCenterDialog */}
                          <EditCenterDialog center={center} />
                          
                          {/* Componente DeleteCenterDialog */}
                          <DeleteCenterDialog center={center} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer con información adicional */}
        {filteredCenters.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Mostrando {filteredCenters.length} de {centers.length} centros/tiendas
            </p>
            <p>
              Última actualización: {new Date().toLocaleTimeString('es-ES')}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}