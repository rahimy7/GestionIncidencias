// client/src/pages/inventory/MyWorkPool.tsx - VERSIÓN CORREGIDA
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2, Send, Save, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/inventory/StatusBadge";

type CountItem = {
  id: string;
  itemCode: string;
  itemDescription: string;
  divisionCode: string;
  categoryCode: string;
  groupCode: string;
  systemInventory: number;
  unitMeasureCode: string;
  status: "pending" | "assigned" | "counted" | "reviewing" | "approved" | "rejected";
  physicalCount?: number | null;
  difference?: number | null;
  counterComment?: string | null;
};

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
});

export default function MyWorkPool() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ status: "", division: "", group: "" });
  const [editedItems, setEditedItems] = useState<Record<string, { physicalCount: number; counterComment: string }>>({});

  // Cargar items
  const { data: items = [], isLoading } = useQuery<CountItem[]>({
    queryKey: ["/api/inventory/my-work-pool", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.division) params.append("division", filters.division);
      if (filters.group) params.append("group", filters.group);
      
      const res = await fetch(`/api/inventory/my-work-pool?${params}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Error al cargar pool");
      return res.json();
    },
  });

  // Guardar conteo individual
  const countMutation = useMutation({
    mutationFn: async (item: CountItem) => {
      const payload = editedItems[item.id];
      if (!payload) throw new Error("No hay cambios");

      const res = await fetch(`/api/inventory/items/${item.id}/count-result`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al guardar");
      return res.json();
    },
    onSuccess: (_, item) => {
      toast({ title: "Guardado", description: `Item ${item.itemCode} actualizado` });
      qc.invalidateQueries({ queryKey: ["/api/inventory/my-work-pool"] });
      setEditedItems((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Enviar lote
  const submitBatch = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/inventory/items/submit-batch", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ itemIds: ids }),
      });
      if (!res.ok) throw new Error("Error al enviar");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Enviados", description: `${data.submittedCount} items a revisión` });
      qc.invalidateQueries({ queryKey: ["/api/inventory/my-work-pool"] });
    },
  });

  // Exportar Excel
  const handleExport = () => {
    const counted = items.filter(i => i.status === "counted");
    if (counted.length === 0) {
      toast({ title: "Sin datos", description: "No hay items contados para exportar" });
      return;
    }
    
    window.open(`/api/inventory/export-batch-excel?itemIds=${counted.map(i => i.id).join(",")}`, "_blank");
  };

  const handleEdit = (id: string, field: "physicalCount" | "counterComment", value: string) => {
    setEditedItems((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: field === "physicalCount" ? Number(value) : value,
      },
    }));
  };

  const readyToSubmit = items.filter(i => i.status === "counted").map(i => i.id);

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Mi Pool de Trabajo</h1>
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" /> Exportar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4">
              <Select value={filters.status} onValueChange={(val) => setFilters({ ...filters, status: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="assigned">Asignados</SelectItem>
                  <SelectItem value="counted">Contados</SelectItem>
                  <SelectItem value="rejected">Rechazados</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="División..."
                value={filters.division}
                onChange={(e) => setFilters({ ...filters, division: e.target.value })}
              />

              <Input
                placeholder="Grupo..."
                value={filters.group}
                onChange={(e) => setFilters({ ...filters, group: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card>
          <CardHeader>
            <CardTitle>Items Asignados</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
              </div>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground">Sin items asignados</p>
            ) : (
              <>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left">Código</th>
                        <th className="p-2 text-left">Descripción</th>
                        <th className="p-2 text-right">Sistema</th>
                        <th className="p-2 text-right">Físico</th>
                        <th className="p-2 text-left">Comentario</th>
                        <th className="p-2 text-center">Estado</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const edit = editedItems[item.id] || {};
                        return (
                          <tr key={item.id} className="border-t">
                            <td className="p-2 font-medium">{item.itemCode}</td>
                            <td className="p-2">{item.itemDescription}</td>
                            <td className="p-2 text-right">{item.systemInventory}</td>
                            <td className="p-2 text-right">
                              <Input
                                type="number"
                                value={edit.physicalCount ?? item.physicalCount ?? ""}
                                onChange={(e) => handleEdit(item.id, "physicalCount", e.target.value)}
                                disabled={!["pending", "assigned"].includes(item.status)}
                                className="w-24 text-right"
                              />
                            </td>
                            <td className="p-2">
                              <Textarea
                                rows={1}
                                value={edit.counterComment ?? item.counterComment ?? ""}
                                onChange={(e) => handleEdit(item.id, "counterComment", e.target.value)}
                                disabled={!["pending", "assigned"].includes(item.status)}
                              />
                            </td>
                            <td className="p-2 text-center">
                              <StatusBadge status={item.status} />
                            </td>
                            <td className="p-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => countMutation.mutate(item)}
                                disabled={!editedItems[item.id] || countMutation.isPending}
                              >
                                {countMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-1" />
                                    Guardar
                                  </>
                                )}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mt-4">
                  <Button
                    onClick={() => submitBatch.mutate(readyToSubmit)}
                    disabled={submitBatch.isPending || readyToSubmit.length === 0}
                  >
                    {submitBatch.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" /> Enviar {readyToSubmit.length} conteos
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}