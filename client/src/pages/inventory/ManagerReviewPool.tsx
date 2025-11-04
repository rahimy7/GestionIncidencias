import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

type ReviewItem = {
  id: string;
  itemCode: string;
  itemDescription: string;
  divisionCode?: string;
  categoryCode?: string;
  groupCode?: string;
  systemInventory: number;
  physicalCount?: number | null;
  difference?: number | null;
  adjustmentType?: string | null;
  costImpact?: number | null;
  counterComment?: string | null;
  managerComment?: string | null;
  status: "reviewing" | "approved" | "rejected";
};

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
});

export default function ManagerReviewPool() {
  const qc = useQueryClient();
  const [comments, setComments] = useState<Record<string, string>>({});

  // 🔹 Cargar pool de revisión
  const { data: items = [], isLoading } = useQuery<ReviewItem[]>({
    queryKey: ["/api/inventory/manager/review-pool"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/manager/review-pool", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Error al obtener pool de revisión");
      return res.json();
    },
  });

  // 🔹 Aprobar conteo
  const approveMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/inventory/items/${itemId}/approve`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          managerComment: comments[itemId] || "",
        }),
      });
      if (!res.ok) throw new Error("Error al aprobar conteo");
      return res.json();
    },
    onSuccess: (_, itemId) => {
      toast({ title: "Aprobado", description: `Conteo ${itemId} aprobado.` });
      qc.invalidateQueries({ queryKey: ["/api/inventory/manager/review-pool"] });
      setComments((prev) => ({ ...prev, [itemId]: "" }));
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "No se pudo aprobar el conteo",
        variant: "destructive",
      });
    },
  });

  // 🔹 Rechazar conteo
  const rejectMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const comment = comments[itemId];
      if (!comment) throw new Error("Debe proporcionar un comentario");

      const res = await fetch(`/api/inventory/items/${itemId}/reject`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ managerComment: comment }),
      });
      if (!res.ok) throw new Error("Error al rechazar conteo");
      return res.json();
    },
    onSuccess: (_, itemId) => {
      toast({ title: "Rechazado", description: `Conteo ${itemId} rechazado.` });
      qc.invalidateQueries({ queryKey: ["/api/inventory/manager/review-pool"] });
      setComments((prev) => ({ ...prev, [itemId]: "" }));
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "No se pudo rechazar el conteo",
        variant: "destructive",
      });
    },
  });

  const handleCommentChange = (id: string, text: string) => {
    setComments((prev) => ({ ...prev, [id]: text }));
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Revisión de Conteos</h1>
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pool de revisión</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando ítems...
              </div>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay ítems pendientes de revisión.</p>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2 text-left">Código</th>
                      <th className="p-2 text-left">Descripción</th>
                      <th className="p-2 text-right">Sistema</th>
                      <th className="p-2 text-right">Físico</th>
                      <th className="p-2 text-right">Diferencia</th>
                      <th className="p-2 text-center">Tipo</th>
                      <th className="p-2 text-right">Impacto</th>
                      <th className="p-2 text-left">Comentario del Contador</th>
                      <th className="p-2 text-left w-52">Comentario del Gerente</th>
                      <th className="p-2 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-2 font-medium">{item.itemCode}</td>
                        <td className="p-2">{item.itemDescription}</td>
                        <td className="p-2 text-right">{item.systemInventory}</td>
                        <td className="p-2 text-right">{item.physicalCount ?? "—"}</td>
                        <td className="p-2 text-right">
                          {item.difference !== null && item.difference !== undefined ? item.difference : "—"}
                        </td>
                        <td className="p-2 text-center">
                          <Badge
                            variant={
                              item.adjustmentType === "positive"
                                ? "secondary"
                                : item.adjustmentType === "negative"
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {item.adjustmentType ?? "—"}
                          </Badge>
                        </td>
                        <td className="p-2 text-right">
                          {item.costImpact !== null && item.costImpact !== undefined
                            ? item.costImpact.toFixed(2)
                            : "—"}
                        </td>
                        <td className="p-2 text-sm text-muted-foreground">{item.counterComment ?? "—"}</td>
                        <td className="p-2">
                          <Textarea
                            rows={1}
                            value={comments[item.id] ?? ""}
                            onChange={(e) => handleCommentChange(item.id, e.target.value)}
                            placeholder="Escribe tu comentario..."
                          />
                        </td>
                        <td className="p-2 text-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approveMutation.mutate(item.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            {approveMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectMutation.mutate(item.id)}
                            disabled={rejectMutation.isPending || approveMutation.isPending}
                          >
                            {rejectMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
