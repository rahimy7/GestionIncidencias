import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";

interface AssignmentModalProps {
  open: boolean;
  onClose: () => void;
  requestId: string;
  centerId: string;
  availableUsers: { id: string; name: string }[];
  onAssigned?: (count: number) => void;
}

export function AssignmentModal({
  open,
  onClose,
  requestId,
  centerId,
  availableUsers,
  onAssigned,
}: AssignmentModalProps) {
  const [assignmentType, setAssignmentType] = useState<"manual" | "automatic">("automatic");
  const [assignTo, setAssignTo] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    divisionCode: "",
    categoryCode: "",
    groupCode: "",
  });

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
  });

  const handleAssign = async () => {
    if (!assignTo) {
      toast({ title: "Selecciona un usuario antes de asignar", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/inventory/items/assign", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          requestId,
          centerId,
          assignmentType,
          assignTo,
          filters,
        }),
      });
      if (!res.ok) throw new Error("Error al asignar ítems");
      const result = await res.json();

      toast({
        title: "Asignación realizada",
        description: `${result.assignedCount || 0} ítems asignados correctamente.`,
      });

      onAssigned?.(result.assignedCount);
      onClose();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudo completar la asignación",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Asignar Ítems de Conteo</DialogTitle>
        </DialogHeader>

        {/* Tipo de asignación */}
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Tipo de asignación</label>
            <Select value={assignmentType} onValueChange={(val) => setAssignmentType(val as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">Automática</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Usuario destino */}
          <div>
            <label className="text-sm font-medium mb-1 block">Usuario asignado</label>
            <Select value={assignTo} onValueChange={(val) => setAssignTo(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un usuario" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtros opcionales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium">División</label>
              <Input
                value={filters.divisionCode}
                onChange={(e) => setFilters((f) => ({ ...f, divisionCode: e.target.value }))}
                placeholder="Ej: D01"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Categoría</label>
              <Input
                value={filters.categoryCode}
                onChange={(e) => setFilters((f) => ({ ...f, categoryCode: e.target.value }))}
                placeholder="Ej: C05"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Grupo</label>
              <Input
                value={filters.groupCode}
                onChange={(e) => setFilters((f) => ({ ...f, groupCode: e.target.value }))}
                placeholder="Ej: G10"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleAssign} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Asignando...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" /> Asignar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AssignmentModal;
