// client/src/components/EditUserDialog.tsx
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Edit, Building, Briefcase } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  location?: string;
  centerId?: string;
  departmentId?: string;
  center?: {
    id: string;
    name: string;
    code: string;
    address?: string;
  };
}

interface EditUserDialogProps {
  user: User;
}

export function EditUserDialog({ user }: EditUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    department: user.department || '',
    location: user.location || '',
    centerId: user.centerId || "",
    departmentId: user.departmentId || "",
    password: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Cargar centros
  const { data: centers = [] } = useQuery({
    queryKey: ['/api/centers'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/centers', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load centers');
      return response.json();
    }
  });

  // Cargar departamentos
  const { data: departments = [] } = useQuery({
    queryKey: ['/api/departments'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/departments', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to load departments');
      return response.json();
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async (updates: any) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al actualizar usuario');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Usuario actualizado",
        description: "Los cambios se han guardado correctamente.",
      });
      setOpen(false);
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
    
    // Preparar datos para envío
    const updates: any = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      role: formData.role,
      location: formData.location || undefined,
      departmentId: formData.departmentId || null,
      centerId: formData.centerId || null,
    };

    // Solo enviar password si se proporcionó
    if (formData.password.trim()) {
      updates.password = formData.password;
    }

    updateUserMutation.mutate(updates);
  };

  

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCenterChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      centerId: value === "none" ? "" : value,
      departmentId: value !== "none" ? "" : prev.departmentId // Limpiar departamento si selecciona centro
    }));
  };

  const handleDepartmentChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      departmentId: value === "none" ? "" : value,
      centerId: value !== "none" ? "" : prev.centerId // Limpiar centro si selecciona departamento
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogDescription>
            Modifica la información del usuario. Los campos marcados son obligatorios.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">Nombre *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Apellido *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="role">Rol *</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuario</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="password">Nueva Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="Dejar vacío para mantener actual"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
            />
          </div>

          {/* Asignación */}
          <div className="space-y-3">
            <Label>Asignación</Label>
            
            <div>
              <Label htmlFor="centerId" className="text-sm">Centro/Tienda</Label>
              <Select 
                value={formData.centerId || "none"} 
                onValueChange={handleCenterChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar centro..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin centro asignado</SelectItem>
                  {centers.map((center: any) => (
                    <SelectItem key={center.id} value={center.id}>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {center.name} ({center.code})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-center text-xs text-gray-500">- O -</div>

            <div>
              <Label htmlFor="departmentId" className="text-sm">Departamento</Label>
              <Select 
                value={formData.departmentId || "none"} 
                onValueChange={handleDepartmentChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar departamento..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin departamento asignado</SelectItem>
                  {departments.map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        {dept.name} ({dept.code})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="location">Ubicación</Label>
            <Input
              id="location"
              placeholder="Ej: Oficina 203"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}