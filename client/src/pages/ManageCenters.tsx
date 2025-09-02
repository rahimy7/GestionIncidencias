import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Center {
  id: string;
  name: string;
  code: string;
  location?: string;
}

export function ManageCenters() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);
  const [editForm, setEditForm] = useState({ name: "", code: "", location: "" });
  const [deletingCenterId, setDeletingCenterId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Obtener centros
  const { data: centers = [], isLoading } = useQuery<Center[]>({
    queryKey: ['/api/centers'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/centers', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Error al cargar centros");
      return response.json();
    },
  });

  // Mutación para eliminar centro
  const deleteCenterMutation = useMutation({
    mutationFn: async (centerId: string) => {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error("No hay token de autenticación");
      const response = await fetch(`/api/centers/${centerId}`, {
        method: "DELETE",
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Error al eliminar centro");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Centro eliminado" });
      queryClient.invalidateQueries({ queryKey: ['/api/centers'] });
      setDeletingCenterId(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setDeletingCenterId(null);
    },
  });

  // Mutación para editar centro
  const editCenterMutation = useMutation({
    mutationFn: async (updates: Center) => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/centers/${updates.id}`, {
        method: "PUT",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Error al editar centro");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Centro actualizado" });
      queryClient.invalidateQueries({ queryKey: ['/api/centers'] });
      setEditingCenter(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredCenters = centers.filter(center =>
    center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    center.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (center.location || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Abrir modal de edición
  const handleEditClick = (center: Center) => {
    setEditingCenter(center);
    setEditForm({
      name: center.name,
      code: center.code,
      location: center.location || "",
    });
  };

  // Guardar cambios de edición
  const handleEditSave = () => {
    if (editingCenter) {
      editCenterMutation.mutate({
        ...editingCenter,
        ...editForm,
      });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold mb-4">Gestión de Centros</h1>
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Buscar centro..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <Button>Agregar Centro</Button>
      </div>
      {isLoading ? (
        <div>Cargando...</div>
      ) : (
        <div className="divide-y">
          {filteredCenters.length === 0 ? (
            <div className="p-4 text-muted-foreground">No hay centros registrados.</div>
          ) : (
            filteredCenters.map(center => (
              <div key={center.id} className="p-4 flex justify-between items-center">
                <div>
                  <div className="font-semibold">{center.name}</div>
                  <div className="text-sm text-muted-foreground">{center.code} | {center.location}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditClick(center)}>Editar</Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeletingCenterId(center.id)}
                  >
                    Eliminar
                  </Button>
                </div>
                {/* Confirmación de eliminación */}
                {deletingCenterId === center.id && (
                  <div className="ml-4 flex gap-2">
                    <span>¿Eliminar este centro?</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteCenterMutation.mutate(center.id)}
                      disabled={deleteCenterMutation.isPending}
                    >
                      Sí, eliminar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeletingCenterId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal de edición */}
      {editingCenter && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Editar Centro</h2>
            <div className="space-y-3">
              <Input
                placeholder="Nombre del centro"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
              <Input
                placeholder="Código"
                value={editForm.code}
                onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))}
              />
              <Input
                placeholder="Ubicación"
                value={editForm.location}
                onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <Button variant="outline" onClick={() => setEditingCenter(null)}>Cancelar</Button>
              <Button onClick={handleEditSave} disabled={editCenterMutation.isPending}>Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}