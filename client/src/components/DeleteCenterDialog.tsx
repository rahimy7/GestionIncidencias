// client/src/components/DeleteCenterDialog.tsx
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import { Trash2, AlertTriangle, Building2, Store } from "lucide-react";

interface Center {
  id: string;
  name: string;
  code: string;
  address?: string;
  manager?: {
    firstName: string;
    lastName: string;
  };
}

interface DeleteCenterDialogProps {
  center: Center;
}

export function DeleteCenterDialog({ center }: DeleteCenterDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteCenterMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/centers/${center.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al eliminar centro');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/centers'] });
      toast({
        title: "Centro eliminado",
        description: `${center.name} ha sido eliminado correctamente.`,
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

  const handleDelete = () => {
    deleteCenterMutation.mutate();
  };

  const getCenterTypeIcon = () => {
    if (center.code.startsWith('T') && !center.code.startsWith('TCD')) {
      return <Store className="h-5 w-5 text-purple-500" />;
    }
    return <Building2 className="h-5 w-5 text-blue-500" />;
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
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          Eliminar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <DialogTitle>Confirmar Eliminación</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Esta acción no se puede deshacer. Se eliminará permanentemente el centro y toda su información asociada.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-900 mb-3 flex items-center gap-2">
              {getCenterTypeIcon()}
              {getCenterTypeName()} a eliminar:
            </h4>
            <div className="space-y-2 text-sm text-red-800">
              <p><span className="font-medium">Nombre:</span> {center.name}</p>
              <p><span className="font-medium">Código:</span> {center.code}</p>
              {center.address && (
                <p><span className="font-medium">Dirección:</span> {center.address}</p>
              )}
              {center.manager && (
                <p><span className="font-medium">Gerente:</span> {center.manager.firstName} {center.manager.lastName}</p>
              )}
            </div>
          </div>

          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <h5 className="font-medium text-yellow-900 mb-2">⚠️ Advertencia:</h5>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Los usuarios asignados a este centro quedarán sin asignar</li>
              <li>• Las incidencias relacionadas mantendrán el registro histórico</li>
              <li>• Esta acción no se puede deshacer</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={deleteCenterMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteCenterMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteCenterMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar {getCenterTypeName()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}