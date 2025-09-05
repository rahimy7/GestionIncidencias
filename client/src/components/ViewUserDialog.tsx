// client/src/components/ViewUserDialog.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye, User, Mail, MapPin, Building, Calendar, Crown, Shield, UserIcon } from "lucide-react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
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

interface ViewUserDialogProps {
  user: User;
}

export function ViewUserDialog({ user }: ViewUserDialogProps) {
  const [open, setOpen] = useState(false);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4 text-red-500" />;
      case 'manager': return <Shield className="h-4 w-4 text-yellow-500" />;
      default: return <UserIcon className="h-4 w-4 text-blue-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'user': return 'Usuario';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-yellow-100 text-yellow-800';
      case 'user': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAssignedTo = () => {
    if (user.role === 'admin') return 'Sistema completo';
    if (user.center) return `${user.center.code} - ${user.center.name}`;
    if (user.departmentInfo) return `${user.departmentInfo.code} - ${user.departmentInfo.name}`;
    if (user.department) return `Área: ${user.department}`;
    return 'Sin asignar';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Ver
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Detalles del Usuario
          </DialogTitle>
          <DialogDescription>
            Información completa del usuario seleccionado
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Información Principal */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full">
              {getRoleIcon(user.role)}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">
                {user.firstName} {user.lastName}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getRoleColor(user.role)}>
                  {getRoleLabel(user.role)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Datos de Contacto */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 border-b pb-2">Información de Contacto</h4>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Email</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>

              {user.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Ubicación</p>
                    <p className="text-sm text-gray-600">{user.location}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Información Organizacional */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 border-b pb-2">Información Organizacional</h4>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Asignado a</p>
                  <p className="text-sm text-gray-600">{getAssignedTo()}</p>
                </div>
              </div>

              {user.department && (
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Departamento</p>
                    <p className="text-sm text-gray-600">{user.department}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Información del Sistema */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 border-b pb-2">Información del Sistema</h4>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Fecha de creación</p>
                  <p className="text-sm text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">ID del Usuario</p>
                  <p className="text-sm text-gray-600 font-mono">{user.id}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Permisos y Capacidades */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 border-b pb-2">Permisos y Capacidades</h4>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <ul className="space-y-1 text-sm text-blue-800">
                {user.role === 'admin' && (
                  <>
                    <li>• Acceso completo al sistema</li>
                    <li>• Gestión de usuarios y roles</li>
                    <li>• Configuración del sistema</li>
                    <li>• Reportes globales</li>
                  </>
                )}
                {user.role === 'manager' && (
                  <>
                    <li>• Gestión de su centro/departamento</li>
                    <li>• Asignación de incidentes</li>
                    <li>• Creación de planes de acción</li>
                    <li>• Reportes de su área</li>
                  </>
                )}
                {user.role === 'user' && (
                  <>
                    <li>• Creación de incidentes</li>
                    <li>• Visualización de sus reportes</li>
                    <li>• Acceso a su panel personal</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}