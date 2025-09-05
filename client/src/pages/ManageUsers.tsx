// client/src/pages/ManageUsers.tsx
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Users, 
  Plus, 
  Search, 
  Crown, 
  Shield, 
  User as UserIcon,
  AlertCircle 
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { EditUserDialog } from "@/components/EditUserDialog";
import { DeleteUserDialog } from "@/components/DeleteUserDialog";
import { ViewUserDialog } from "@/components/ViewUserDialog";

interface User {
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
}

export function ManageUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para obtener usuarios
  const { data: users = [], isLoading, error } = useQuery<User[]>({
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

  // Filtrar usuarios basado en búsqueda
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(searchLower) ||
      user.lastName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.department && user.department.toLowerCase().includes(searchLower)) ||
      user.role.toLowerCase().includes(searchLower)
    );
  });

  // Funciones auxiliares
  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4 text-red-500" />;
      case "manager":
        return <Shield className="h-4 w-4 text-yellow-500" />;
      case "user":
        return <UserIcon className="h-4 w-4 text-blue-500" />;
      default:
        return <UserIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "manager":
        return "bg-yellow-100 text-yellow-800";
      case "user":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "manager":
        return "Gerente";
      case "user":
        return "Usuario";
      default:
        return role;
    }
  };

  // Manejo de errores
  if (error) {
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
                Gestión de Usuarios
              </h1>
              <p className="text-muted-foreground mt-2">
                Administra los usuarios del sistema
              </p>
            </div>
          </div>
          <Link href="/users/new">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Crear Usuario
            </Button>
          </Link>
        </div>

        {/* Búsqueda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por nombre, email o departamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
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
                <Crown className="h-5 w-5 text-red-500" />
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
                <Shield className="h-5 w-5 text-yellow-500" />
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
                <UserIcon className="h-5 w-5 text-blue-500" />
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
            <div className="divide-y">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Cargando usuarios...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No se encontraron usuarios
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? "Intenta con otros términos de búsqueda" : "No hay usuarios registrados"}
                  </p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
                          {getRoleIcon(user.role)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">
                              {user.firstName} {user.lastName}
                            </h3>
                            <Badge className={getRoleColor(user.role)}>
                              {getRoleDisplayName(user.role)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                          {(user.department || user.location) && (
                            <p className="text-sm text-muted-foreground">
                              {user.department} {user.department && user.location && "•"} {user.location}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Creado: {new Date(user.createdAt).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Componente ViewUserDialog */}
                        <ViewUserDialog user={user} />
                        
                        {/* Componente EditUserDialog */}
                        <EditUserDialog user={user} />
                        
                        {/* Componente DeleteUserDialog */}
                        <DeleteUserDialog user={user} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer con información adicional */}
        {filteredUsers.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Mostrando {filteredUsers.length} de {users.length} usuarios
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