import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Shield, 
  Crown, 
  User, 
  Search, 
  AlertCircle,
  Plus,
  ArrowLeft,
  Building2,
  Store
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EditUserDialog } from "@/components/EditUserDialog";
import { DeleteUserDialog } from "@/components/DeleteUserDialog";
import { ViewUserDialog } from "@/components/ViewUserDialog";
import type { Center } from "@shared/schema";

// Definir el tipo User localmente compatible con los componentes de diálogo
interface UserType {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  location?: string;
  createdAt: string;
  centerId?: string;
  center?: {
    id: string;
    name: string;
    code: string;
    address?: string;
  };
  departmentInfo?: {
    id: string;
    name: string;
    code: string;
  };
}

export function AdminUsersManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCenter, setFilterCenter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener usuarios
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async (): Promise<UserType[]> => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  // NUEVA QUERY: Obtener centros/tiendas
  const { data: centers = [], isLoading: centersLoading } = useQuery({
    queryKey: ['/api/centers'],
    queryFn: async (): Promise<Center[]> => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/centers', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch centers');
      return response.json();
    }
  });

  // Filtrar usuarios - ACTUALIZADO CON FILTRO DE CENTRO
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.departmentInfo && user.departmentInfo.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterType === 'all' || user.role === filterType;
    
    // NUEVA LÓGICA: Filtro por centro/tienda
    const matchesCenter = filterCenter === 'all' || user.centerId === filterCenter;
    
    return matchesSearch && matchesFilter && matchesCenter;
  });

  // Funciones auxiliares
  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case 'admin': return <Shield className="h-4 w-4 text-red-500" />;
      case 'manager': return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'user': return <User className="h-4 w-4 text-blue-500" />;
      default: return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'user': return 'Usuario';
      default: return 'Sin rol';
    }
  };

  const getRoleColor = (role: string | null) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-yellow-100 text-yellow-800';
      case 'user': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAssignedTo = (user: UserType) => {
    if (user.role === 'admin') return 'Sistema';
    if (user.center) return `${user.center.code} - ${user.center.name}`;
    if (user.departmentInfo) return `${user.departmentInfo.code} - ${user.departmentInfo.name}`;
    if (user.department) return `Área: ${user.department}`;
    return 'Sin asignar';
  };

  // NUEVA FUNCIÓN: Obtener ícono de tipo de centro
  const getCenterIcon = (code: string) => {
    if (code.startsWith('T') && !code.startsWith('TCD')) {
      return <Store className="h-4 w-4 text-purple-500" />;
    }
    return <Building2 className="h-4 w-4 text-blue-500" />;
  };

  // Manejo de errores
  if (usersError) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Error al cargar usuarios</h3>
            <p className="text-muted-foreground">No se pudieron cargar los usuarios. Intenta de nuevo.</p>
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/users'] })}
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
            <h1 className="text-3xl font-bold text-foreground">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">
              Administra usuarios, roles y asignaciones del sistema
            </p>
          </div>
          <Link href="/admin/users/new">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Usuario
            </Button>
          </Link>
        </div>

        {/* Búsqueda y Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar y Filtrar Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Buscar por nombre, email o departamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <select 
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">Todos los roles</option>
                <option value="admin">Administradores</option>
                <option value="manager">Gerentes</option>
                <option value="user">Usuarios</option>
              </select>

              {/* FILTRO DE TIENDA/CENTRO */}
              <select 
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
                value={filterCenter}
                onChange={(e) => setFilterCenter(e.target.value)}
                disabled={centersLoading}
              >
                <option value="all">Todas las tiendas</option>
                {centers
                  .sort((a, b) => a.code.localeCompare(b.code))
                  .map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.code} - {center.name}
                    </option>
                  ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Total Usuarios</p>
                  <p className="text-xl font-bold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-gray-500">Administradores</p>
                  <p className="text-xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-500">Gerentes</p>
                  <p className="text-xl font-bold">{users.filter(u => u.role === 'manager').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Usuarios</p>
                  <p className="text-xl font-bold">{users.filter(u => u.role === 'user').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Usuarios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuarios ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {usersLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Cargando usuarios...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No se encontraron usuarios</h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterType !== 'all' || filterCenter !== 'all' 
                    ? 'Intenta ajustar los filtros de búsqueda' 
                    : 'No hay usuarios registrados'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asignado a</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha creación</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.firstName || ''} {user.lastName || ''}
                            </div>
                            <div className="text-sm text-gray-500">{user.email || 'Sin email'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getRoleIcon(user.role)}
                            <Badge className={getRoleColor(user.role)}>
                              {getRoleLabel(user.role)}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{getAssignedTo(user)}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{user.location || 'No especificada'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-DO') : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {/* Componente ViewUserDialog */}
                            <ViewUserDialog user={user} />
                            
                            {/* Componente EditUserDialog */}
                            <EditUserDialog user={user} />
                            
                            {/* Componente DeleteUserDialog */}
                            <DeleteUserDialog user={user} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}