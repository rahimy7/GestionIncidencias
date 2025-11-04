import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardCheck, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/inventory/StatusBadge";

type AuditSample = {
  id: string;
  sampleCode: string;
  createdAt: string;
  sampleSize: number;
  status: "pending" | "in_review" | "completed";
};

type AuditItem = {
  id: string;
  itemCode: string;
  itemDescription: string;
  systemInventory: number;
  physicalCount?: number | null;
  difference?: number | null;
  adjustmentType?: string | null;
  auditorResult?: "match" | "difference" | null;
  auditorComment?: string | null;
  status: "pending" | "audited";
};

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
});

export default function AuditWorkPool() {
  const qc = useQueryClient();
  const [selectedSample, setSelectedSample] = useState<string>("");
  const [localComments, setLocalComments] = useState<Record<string, string>>({});
  const [localResults, setLocalResults] = useState<Record<string, "match" | "difference">>({});

  // 🔹 Obtener muestras de auditoría disponibles
  const { data: samples = [], isLoading: loadingSamples } = useQuery<AuditSample[]>({
    queryKey: ["/api/inventory/audit/samples"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/audit/samples", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Error al obtener muestras de auditoría");
      return res.json();
    },
  });

  // 🔹 Obtener ítems de la muestra seleccionada
  const { data: items = [], isLoading: loadingItems } = useQuery<AuditItem[]>({
    queryKey: ["/api/inventory/audit/items", selectedSample],
    enabled: !!selectedSample,
    queryFn: async () => {
      const res = await fetch(`/api/inventory/audit/items/${selectedSample}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Error al obtener ítems de auditoría");
      return res.json();
    },
  });

  // 🔹 Registrar resultado de auditoría por ítem
  const saveResultMutation = useMutation({
    mutationFn: async (item: AuditItem) => {
      const payload = {
        auditorResult: localResults[item.id],
        auditorComment: localComments[item.id] || "",
      };
      const res = await fetch(`/api/inventory/audit/items/${item.id}/result`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al registrar resultado");
      return res.json();
    },
    onSuccess: (_, item) => {
      toast({ title: "Resultado guardado", description: `Ítem ${item.itemCode} actualizado.` });
      qc.invalidateQueries({ queryKey: ["/api/inventory/audit/items", selectedSample] });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "No se pudo registrar el resultado",
        variant: "destructive",
      });
    },
  });

  const handleResultChange = (id: string, result: "match" | "difference") => {
    setLocalResults((prev) => ({ ...prev, [id]: result }));
  };

  const handleCommentChange = (id: string, text: string) => {
    setLocalComments((prev) => ({ ...prev, [id]: text }));
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* 🔹 Encabezado */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Trabajo del Auditor</h1>
          {(loadingSamples || loadingItems) && (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* 🔹 Selector de muestra */}
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar muestra de auditoría</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSamples ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando muestras...
              </div>
            ) : samples.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay muestras disponibles.</p>
            ) : (
              <Select value={selectedSample} onValueChange={setSelectedSample}>
                <SelectTrigger className="w-full md:w-96">
                  <SelectValue placeholder="Selecciona una muestra" />
                </SelectTrigger>
                <SelectContent>
                  {samples.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.sampleCode} — {s.sampleSize} ítems
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* 🔹 Tabla de ítems de la muestra */}
        {selectedSample && (
          <Card>
            <CardHeader>
              <CardTitle>Ítems de la muestra</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingItems ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando ítems...
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay ítems para esta muestra.</p>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left">Código</th>
                        <th className="p-2 text-left">Descripción</th>
                        <th className="p-2 text-right">Inventario</th>
                        <th className="p-2 text-right">Físico</th>
                        <th className="p-2 text-center">Tipo Ajuste</th>
                        <th className="p-2 text-center">Resultado</th>
                        <th className="p-2 text-left">Comentario Auditor</th>
                        <th className="p-2 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => (
                        <tr key={it.id} className="border-t">
                          <td className="p-2 font-medium">{it.itemCode}</td>
                          <td className="p-2">{it.itemDescription}</td>
                          <td className="p-2 text-right">{it.systemInventory}</td>
                          <td className="p-2 text-right">{it.physicalCount ?? "—"}</td>
                          <td className="p-2 text-center">
                            <StatusBadge
                              status={
                                it.adjustmentType === "positive"
                                  ? "approved"
                                  : it.adjustmentType === "negative"
                                  ? "rejected"
                                  : "pending"
                              }
                            />
                          </td>
                          <td className="p-2 text-center">
                            <Select
                              value={localResults[it.id] ?? ""}
                              onValueChange={(val) => handleResultChange(it.id, val as any)}
                            >
                              <SelectTrigger className="w-32 text-xs">
                                <SelectValue placeholder="Selecciona" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="match">Coincide</SelectItem>
                                <SelectItem value="difference">Diferencia</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2">
                            <Textarea
                              rows={1}
                              value={localComments[it.id] ?? ""}
                              onChange={(e) => handleCommentChange(it.id, e.target.value)}
                              placeholder="Observaciones..."
                            />
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => saveResultMutation.mutate(it)}
                              disabled={saveResultMutation.isPending}
                            >
                              {saveResultMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ClipboardCheck className="h-4 w-4 text-green-600" />
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
        )}
      </div>
    </Layout>
  );
}
