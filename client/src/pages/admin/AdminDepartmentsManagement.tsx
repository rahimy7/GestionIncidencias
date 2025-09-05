// client/src/pages/admin/AdminDepartmentsManagement.tsx
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Briefcase,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  Users,
  Calendar,
  Plus,
  ArrowLeft,
  AlertCircle
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  headUserId?: string;
  head?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId?: string;
}

export function AdminDepartmentsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: departments = [], isLoading: deptsLoading, error: deptsError } = useQuery({
    queryKey: ['/api/departments'],
    queryFn: async (): Promise<Department[]> => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/departments', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load departments');
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

  const deleteDepartmentMutation = useMutation({
    mutationFn: async (deptId: string) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/departments/${deptId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete department');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      toast({
        title: "Departamento eliminado",
        description: "El departamento ha sido eliminado correctamente",
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

  const getHeadName = (dept: Department) => {
    if (dept.head) {
      return `${dept.head.firstName} ${dept.head.lastName}`;
    }
    if (dept.headUserId) {
      const head = users.find(u => u.id === dept.headUserId);
      if (head) {
        return `${head.firstName} ${head.lastName}`;
      }
    }
    return 'Sin asignar';
  };

  const getUsersCount = (deptId: string) => {
    return users.filter(user => user.departmentId === deptId).length;
  };

  const handleDeleteDepartment = (deptId: string, deptName: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el departamento ${deptName}?`)) {
      deleteDepartmentMutation.mutate(deptId);
    }
  };

  if (deptsError) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Error al cargar departamentos</h3>
            <p className="text-muted-foreground">No se pudieron cargar los departamentos. Intenta de nuevo.</p>
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
            <h1 className="text-3xl font-bold text-foreground">Gestión de Departamentos</h1>
            <p className="text-muted-foreground">
              Administra áreas corporativas y departamentos organizacionales
            </p>
          </div>
          <Link href="/admin/departments/new">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Departamento
            </Button>
          </Link>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-indigo-500" />
                <div>
                  <p className="text-sm text-gray-500">Total Departamentos</p>
                  <p className="text-xl font-bold">{departments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">Con Jefe Asignado</p>
                  <p className="text-xl font-bold">{departments.filter(d => d.headUserId || d.head).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Usuarios Asignados</p>
                  <p className="text-xl font-bold">{users.filter(u => u.departmentId).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Departamentos */}
        {deptsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : departments.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay departamentos registrados</h3>
            <p className="text-muted-foreground mb-4">Crea tu primer departamento para comenzar</p>
            <Link href="/admin/departments/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Crear primer departamento
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {departments.map((dept) => (
              <Card key={dept.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Briefcase className="h-5 w-5 text-indigo-500" />
                        <h3 className="font-semibold text-lg">{dept.name}</h3>
                      </div>
                      <p className="text-sm text-gray-500 font-mono">{dept.code}</p>
                      <Badge variant="secondary" className="mt-1 bg-blue-100 text-blue-800">
                        Área Corporativa
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link href={`/admin/departments/${dept.id}`}>
                        <button className="p-1 text-gray-400 hover:text-blue-600">
                          <Eye className="h-4 w-4" />
                        </button>
                      </Link>
                      <Link href={`/admin/departments/${dept.id}/edit`}>
                        <button className="p-1 text-gray-400 hover:text-green-600">
                          <Edit className="h-4 w-4" />
                        </button>
                      </Link>
                      <button 
                        className="p-1 text-gray-400 hover:text-red-600"
                        onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                        disabled={deleteDepartmentMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {dept.description && (
                    <p className="text-gray-600 text-sm mb-4 bg-gray-50 p-3 rounded-lg">
                      {dept.description}
                    </p>
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <UserCheck className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600">
                        <span className="font-medium">Jefe:</span> {getHeadName(dept)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600">
                        <span className="font-medium">Usuarios:</span> {getUsersCount(dept.id)} asignados
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600">
                        <span className="font-medium">Creado:</span> {new Date(dept.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Activo
                      </Badge>
                      <Link href={`/admin/departments/${dept.id}`}>
                        <Button variant="outline" size="sm">
                          Ver detalles
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}