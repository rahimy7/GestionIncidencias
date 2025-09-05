// client/src/components/ViewCenterDialog.tsx
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
import { 
  Eye, 
  Building2, 
  Store, 
  MapPin, 
  Crown, 
  Users, 
  Calendar,
  Hash,
  User
} from "lucide-react";

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

interface ViewCenterDialogProps {
  center: Center;
}

export function ViewCenterDialog({ center }: ViewCenterDialogProps) {
  const [open, setOpen] = useState(false);

  const getCenterType = () => {
    if (center.code.startsWith('T') && !center.code.startsWith('TCD')) {
      return {
        type: 'Tienda',
        icon: Store,
        color: 'bg-purple-100 text-purple-800',
        description: 'Punto de venta al público'
      };
    }
    if (center.code.startsWith('TCD')) {
      return {
        type: 'Centro de Distribución',
        icon: Building2,
        color: 'bg-blue-100 text-blue-800',
        description: 'Centro logístico y de almacenamiento'
      };
    }
    return {
      type: 'Centro',
      icon: Building2,
      color: 'bg-gray-100 text-gray-800',
      description: 'Centro operativo'
    };
  };

  const centerType = getCenterType();
  const IconComponent = centerType.icon;

  const getManagerName = () => {
    if (center.manager) {
      return `${center.manager.firstName} ${center.manager.lastName}`;
    }
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
            <IconComponent className="h-5 w-5" />
            Detalles del {centerType.type}
          </DialogTitle>
          <DialogDescription>
            Información completa del centro seleccionado
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Información Principal */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full">
              <IconComponent className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">
                {center.name}
              </h3>
              <p className="text-sm text-gray-600 font-mono mt-1">
                {center.code}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={centerType.color}>
                  {centerType.type}
                </Badge>
              </div>
            </div>
          </div>

          {/* Descripción del Tipo */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>{centerType.type}:</strong> {centerType.description}
            </p>
          </div>

          {/* Información de Ubicación */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 border-b pb-2">Información de Ubicación</h4>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3">
                <Hash className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Código Identificador</p>
                  <p className="text-sm text-gray-600 font-mono">{center.code}</p>
                </div>
              </div>

              {center.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Dirección</p>
                    <p className="text-sm text-gray-600">{center.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Información de Gestión */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 border-b pb-2">Información de Gestión</h4>
            
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3">
                <Crown className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Gerente Asignado</p>
                  <p className="text-sm text-gray-600">{getManagerName()}</p>
                  {center.manager?.email && (
                    <p className="text-xs text-gray-500">{center.manager.email}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Usuarios Asignados</p>
                  <p className="text-sm text-gray-600">
                    {center.usersCount || 0} usuario(s) asignado(s)
                  </p>
                </div>
              </div>
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
                    {new Date(center.createdAt).toLocaleDateString('es-ES', {
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
                  <p className="text-sm font-medium text-gray-700">ID del Centro</p>
                  <p className="text-sm text-gray-600 font-mono">{center.id}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Funcionalidades y Capacidades */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 border-b pb-2">Funcionalidades</h4>
            
            <div className="bg-green-50 p-3 rounded-lg">
              <ul className="space-y-1 text-sm text-green-800">
                {centerType.type === 'Tienda' && (
                  <>
                    <li>• Atención al cliente directo</li>
                    <li>• Gestión de inventario local</li>
                    <li>• Reportes de ventas</li>
                    <li>• Gestión de incidencias de tienda</li>
                  </>
                )}
                {centerType.type === 'Centro de Distribución' && (
                  <>
                    <li>• Gestión de almacén y logística</li>
                    <li>• Distribución a tiendas</li>
                    <li>• Control de inventario regional</li>
                    <li>• Coordinación de envíos</li>
                  </>
                )}
                {centerType.type === 'Centro' && (
                  <>
                    <li>• Operaciones generales</li>
                    <li>• Gestión de recursos</li>
                    <li>• Reportes operativos</li>
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