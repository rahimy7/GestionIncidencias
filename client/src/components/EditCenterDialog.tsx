// client/src/components/EditCenterDialog.tsx
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { Edit, Building2, Store } from "lucide-react";

interface Center {
  id: string;
  name: string;
  code: string;
  address?: string;
  managerId?: string;
  manager?: {
    firstName: string;
    lastName: string;
  };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface EditCenterDialogProps {
  center: Center;
}

export function EditCenterDialog({ center }: EditCenterDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: center.name,
    code: center.code,
    address: center.address || '',
    managerId: center.managerId || '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutación para actualizar centro
  const updateCenterMutation = useMutation({
    mutationFn: async (updates: any) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/centers/${center.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al actualizar centro');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/centers'] });
      toast({
        title: "Centro actualizado",
        description: "Los cambios se han guardado correctamente.",
      });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Obtener usuarios disponibles para asignar como gerentes
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async (): Promise<User[]> => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  // Filtrar usuarios que pueden ser gerentes (admin y manager)
  const availableManagers = users?.filter(user => 
    user.role === 'admin' || user.role === 'manager'
  ) || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: any = {
      name: formData.name,
      code: formData.code,
      address: formData.address || null,
      managerId: formData.managerId || null,
    };

    updateCenterMutation.mutate(updates);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getCenterTypeIcon = () => {
    if (center.code.startsWith('T') && !center.code.startsWith('TCD')) {
      return <Store className="h-4 w-4" />;
    }
    return <Building2 className="h-4 w-4" />;
  };

  const getCenterTypeName = () => {
    if (center.code.startsWith('T') && !center.code.startsWith('TCD')) {
      return 'Tienda';
    }
    if (center.code.startsWith('TCD')) {
      return 'Centro de Distribución';
    }
    return 'Centro';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Edit className="h-4 w-4" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getCenterTypeIcon()}
            Editar {getCenterTypeName()}
          </DialogTitle>
          <DialogDescription>
            Actualiza la información del centro. Los campos marcados son obligatorios.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="name">Nombre del Centro *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ej: Tienda Central, TCD Norte"
                required
              />
            </div>
            <div>
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                placeholder="Ej: T01, TCD02"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                T## para tiendas, TCD## para centros de distribución
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="address">Dirección</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Dirección completa del centro..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="managerId">Gerente Asignado</Label>
            <Select 
              value={formData.managerId || "none"} 
              onValueChange={(value) => handleInputChange('managerId', value === "none" ? "" : value)}
              disabled={usersLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar gerente..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {availableManagers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Solo administradores y gerentes pueden ser asignados
            </p>
          </div>

          {/* Información del centro actual */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Información actual:</h4>
            <div className="space-y-1 text-sm text-blue-800">
              <p><span className="font-medium">Tipo:</span> {getCenterTypeName()}</p>
              <p><span className="font-medium">Código actual:</span> {center.code}</p>
              {center.manager && (
                <p><span className="font-medium">Gerente actual:</span> {center.manager.firstName} {center.manager.lastName}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateCenterMutation.isPending}
            >
              {updateCenterMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}