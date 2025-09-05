// client/src/pages/ManageCenters.tsx
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Building2, 
  Store, 
  Plus, 
  Search, 
  Crown, 
  Users,
  MapPin,
  AlertCircle 
} from "lucide-react";
import { Link } from "wouter";
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

export function ManageCenters() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para obtener centros
  const { data: centers = [], isLoading, error } = useQuery<Center[]>({
    queryKey: ['/api/centers'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/centers', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch centers');
      }
      
      return response.json();
    },
  });

  // Query para obtener usuarios
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      return response.json();
    },
  });

  // Filtrar centros basado en búsqueda
  const filteredCenters = centers.filter(center => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      center.name.toLowerCase().includes(searchLower) ||
      center.code.toLowerCase().includes(searchLower) ||
      (center.address && center.address.toLowerCase().includes(searchLower)) ||
      (center.manager && `${center.manager.firstName} ${center.manager.lastName}`.toLowerCase().includes(searchLower))
    );
  });

  // Funciones auxiliares
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

  // Estadísticas
  const stores = centers.filter(c => c.code.startsWith('T') && !c.code.startsWith('TCD'));
  const distributionCenters = centers.filter(c => c.code.startsWith('TCD'));

  // Manejo de errores
  if (error) {
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver al Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Gestión de Centros y Tiendas
              </h1>
              <p className="text-muted-foreground mt-2">
                Administra centros de distribución y tiendas del sistema
              </p>
            </div>
          </div>
          <Link href="/centers/new">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Crear Centro/Tienda
            </Button>
          </Link>
        </div>

        {/* Búsqueda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Centros y Tiendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por nombre, código, dirección o gerente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

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
                <Building2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">Total Centros</p>
                  <p className="text-xl font-bold">{centers.length}</p>
                  <p className="text-xs text-gray-400">Todos los tipos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Centros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Centros y Tiendas ({filteredCenters.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Cargando centros...</p>
                </div>
              ) : filteredCenters.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No se encontraron centros
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? "Intenta con otros términos de búsqueda" : "No hay centros registrados"}
                  </p>
                </div>
              ) : (
                filteredCenters.map((center) => {
                  const centerType = getCenterType(center.code);
                  const IconComponent = centerType.icon;
                  const usersCount = getUsersCount(center.id);
                  
                  return (
                    <div
                      key={center.id}
                      className="p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">
                                {center.name}
                              </h3>
                              <Badge className={centerType.color}>
                                {centerType.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground font-mono">
                              {center.code}
                            </p>
                            {center.address && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                <MapPin className="h-3 w-3" />
                                {center.address}
                              </div>
                            )}
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Crown className="h-3 w-3" />
                                {getManagerName(center)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {usersCount} usuario(s)
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Creado: {new Date(center.createdAt).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Componente ViewCenterDialog */}
                          <ViewCenterDialog center={{ ...center, usersCount }} />
                          
                          {/* Componente EditCenterDialog */}
                          <EditCenterDialog center={center} />
                          
                          {/* Componente DeleteCenterDialog */}
                          <DeleteCenterDialog center={center} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
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