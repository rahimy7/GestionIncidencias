import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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

export default function CountResults() {
  const qc = useQueryClient();
  const [editedItems, setEditedItems] = useState<Record<string, { physicalCount: number; counterComment: string }>>({});

  // 🔹 Cargar pool de trabajo del usuario
  const { data: items = [], isLoading } = useQuery<CountItem[]>({
    queryKey: ["/api/inventory/my-work-pool"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/my-work-pool", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Error al cargar pool de trabajo");
      return res.json();
    },
  });

  // 🔹 Registrar conteo individual
  const countMutation = useMutation({
    mutationFn: async (item: CountItem) => {
      const payload = editedItems[item.id];
      if (!payload) throw new Error("No hay cambios que registrar");

      const res = await fetch(`/api/inventory/items/${item.id}/count-result`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al registrar conteo");
      return res.json();
    },
    onSuccess: (_, item) => {
      toast({ title: "Conteo guardado", description: `${item.itemCode} actualizado.` });
      qc.invalidateQueries({ queryKey: ["/api/inventory/my-work-pool"] });
      setEditedItems((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "No se pudo registrar el conteo", variant: "destructive" });
    },
  });

  // 🔹 Enviar lote de conteos
  const submitBatch = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/inventory/items/submit-batch", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ itemIds: ids }),
      });
      if (!res.ok) throw new Error("Error al enviar conteos");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Conteos enviados",
        description: `${data.submittedCount} ítems enviados para revisión.`,
      });
      qc.invalidateQueries({ queryKey: ["/api/inventory/my-work-pool"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "No se pudo enviar el lote", variant: "destructive" });
    },
  });

  // 🔹 Control de edición
  const handleEdit = (id: string, field: "physicalCount" | "counterComment", value: string) => {
    setEditedItems((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: field === "physicalCount" ? Number(value) : value,
      },
    }));
  };

  const readyToSubmit = items.filter((i) => i.status === "counted").map((i) => i.id);

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Mis Conteos Asignados</h1>
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pool de trabajo</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando ítems...
              </div>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tienes ítems asignados actualmente.</p>
            ) : (
              <>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left">Código</th>
                        <th className="p-2 text-left">Descripción</th>
                        <th className="p-2 text-right">Inventario Sistema</th>
                        <th className="p-2 text-right">Conteo Físico</th>
                        <th className="p-2 text-left">Comentario</th>
                        <th className="p-2 text-center">Estado</th>
                        <th className="p-2 text-center"></th>
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
                                disabled={item.status !== "pending" && item.status !== "assigned"}
                                className="w-24 text-right"
                              />
                            </td>
                            <td className="p-2">
                              <Textarea
                                rows={1}
                                value={edit.counterComment ?? item.counterComment ?? ""}
                                onChange={(e) => handleEdit(item.id, "counterComment", e.target.value)}
                                disabled={item.status !== "pending" && item.status !== "assigned"}
                              />
                            </td>
                            <td className="p-2 text-center">
                              <Badge
                                variant={
                                  item.status === "counted"
                                    ? "default"
                                    : item.status === "reviewing"
                                    ? "outline"
                                    : item.status === "approved"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {item.status}
                              </Badge>
                            </td>
                            <td className="p-2 text-center">
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

                {/* Botón de envío en lote */}
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
