// client/src/pages/admin/CreateDepartment.tsx
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, Save, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export function CreateDepartment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    headUserId: ''
  });

  // Obtener usuarios para el selector de jefe
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

  const createDepartmentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          headUserId: data.headUserId || null
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create department');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
      toast({
        title: "Departamento creado",
        description: "El departamento ha sido creado correctamente",
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

    createDepartmentMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Generar código automáticamente basado en el nombre
  const generateCode = () => {
    if (formData.name) {
      const code = formData.name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .slice(0, 3) + 
        String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      
      setFormData(prev => ({ ...prev, code }));
    }
  };

  // Filtrar usuarios elegibles para ser jefes (excluyendo usuarios básicos sin experiencia)
  const eligibleHeads = users.filter(user => 
    user.role === 'manager' || user.role === 'admin'
  );

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
            <h1 className="text-3xl font-bold text-foreground">Crear Departamento</h1>
            <p className="text-muted-foreground">
              Crea un nuevo departamento o área corporativa
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="code">Código del Departamento *</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={generateCode}
                    disabled={!formData.name}
                  >
                    Generar Código
                  </Button>
                </div>
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
                  disabled={createDepartmentMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {createDepartmentMutation.isPending ? 'Creando...' : 'Crear Departamento'}
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
            <CardTitle>Información Importante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-600">
              <h4 className="font-medium mb-2">Al crear un departamento:</h4>
              <ul className="space-y-1 list-disc list-inside">
                <li>Los usuarios podrán ser asignados a este departamento</li>
                <li>El jefe del departamento tendrá permisos especiales sobre los usuarios asignados</li>
                <li>El código debe ser único en todo el sistema</li>
                <li>Puedes modificar la información después de la creación</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}