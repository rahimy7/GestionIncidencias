// client/src/pages/admin/EditDepartment.tsx
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Briefcase,
  ArrowLeft,
  Save,
  X,
  AlertCircle,
  Loader2
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
  role: string;
}

export function EditDepartment() {
  const params = useParams();
  const departmentId = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    headUserId: '',
  });

  // Cargar departamento actual
  const { data: department, isLoading: deptLoading, error: deptError } = useQuery({
    queryKey: ['/api/departments', departmentId],
    queryFn: async (): Promise<Department> => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/departments/${departmentId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load department');
      return response.json();
    },
    enabled: !!departmentId,
  });

  // Cargar usuarios para selector de jefe
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

  // Actualizar formulario cuando se carga el departamento
  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name,
        code: department.code,
        description: department.description || '',
        headUserId: department.headUserId || '',
      });
    }
  }, [department]);

  const updateDepartmentMutation = useMutation({
    mutationFn: async (updates: any) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/departments/${departmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update department');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/departments', departmentId] });
      toast({
        title: "Departamento actualizado",
        description: "Los cambios se han guardado correctamente",
      });
      setLocation('/admin/departments');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.name.trim() || !formData.code.trim()) {
      toast({
        title: "Error",
        description: "Nombre y código son obligatorios",
        variant: "destructive",
      });
      return;
    }

    updateDepartmentMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Filtrar usuarios elegibles para ser jefes
  const eligibleHeads = users.filter(user => 
    user.role === 'manager' || user.role === 'admin'
  );

  if (deptLoading) {
    return (
      <Layout>
        <div className="p-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </Layout>
    );
  }

  if (deptError || !department) {
    return (
      <Layout>
        <div className="p-6 max-w-2xl mx-auto">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Departamento no encontrado</h3>
            <p className="text-muted-foreground mb-4">
              El departamento que intentas editar no existe o no tienes permisos para verlo.
            </p>
            <Link href="/admin/departments">
              <Button>Volver a Departamentos</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/departments">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Editar Departamento</h1>
            <p className="text-muted-foreground">
              Modifica la información del departamento "{department.name}"
            </p>
          </div>
        </div>

        {/* Formulario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Información del Departamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Departamento *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ej: Recursos Humanos, Marketing, Finanzas"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              {/* Código */}
              <div className="space-y-2">
                <Label htmlFor="code">Código del Departamento *</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Ej: RH001, MKT002, FIN003"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                  required
                />
                <p className="text-xs text-gray-500">
                  El código debe ser único y se recomienda usar 3 letras + 3 números
                </p>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Describe las funciones y responsabilidades del departamento..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              {/* Jefe del Departamento */}
              <div className="space-y-2">
                <Label htmlFor="headUserId">Jefe del Departamento</Label>
                <select
                  id="headUserId"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={formData.headUserId}
                  onChange={(e) => handleInputChange('headUserId', e.target.value)}
                >
                  <option value="">Seleccionar jefe (opcional)</option>
                  {eligibleHeads.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} - {user.email} ({user.role})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Solo usuarios con rol de manager o admin pueden ser jefes de departamento
                </p>
              </div>

              {/* Botones */}
              <div className="flex items-center gap-4 pt-6 border-t">
                <Button
                  type="submit"
                  disabled={updateDepartmentMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {updateDepartmentMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
                
                <Link href="/admin/departments">
                  <Button variant="outline" type="button" className="flex items-center gap-2">
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Información adicional */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Departamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-600">
              <p><strong>Creado:</strong> {new Date(department.createdAt).toLocaleDateString()}</p>
              <p><strong>ID:</strong> {department.id}</p>
              {department.head && (
                <p><strong>Jefe actual:</strong> {department.head.firstName} {department.head.lastName}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}