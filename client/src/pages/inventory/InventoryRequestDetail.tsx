import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type InventoryRequest = {
  id: string;
  requestNumber: string;
  requestType: "manual" | "division" | "category" | "group" | "automatic";
  status: "draft" | "sent" | "in_progress" | "completed" | "cancelled";
  centers: string[];
  filterDivisions?: string[] | null;
  filterCategories?: string[] | null;
  filterGroups?: string[] | null;
  filterSpecificCodes?: string[] | null;
  comments?: string | null;
  createdAt?: string;
  sentAt?: string | null;
  completedAt?: string | null;
  items?: CountItem[];
};

type CountItem = {
  id: string;
  requestId: string;
  centerId: string;
  itemCode: string;
  itemDescription: string | null;
  itemDescription2?: string | null;
  divisionCode: string | null;
  categoryCode: string | null;
  groupCode: string | null;
  systemInventory: number;
  unitMeasureCode: string | null;
  unitCost: number | null;
  status: "pending" | "assigned" | "counted" | "reviewing" | "approved" | "rejected";
};

type Center = { id: string; code: string; name: string };

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
});

// Pequeño helper local para “badges” de estado (luego podremos reemplazar por <StatusBadge />)
function StatusPill({ status }: { status: InventoryRequest["status"] }) {
  const variants: Record<InventoryRequest["status"], string> = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return <Badge className={variants[status] || ""}>{status}</Badge>;
}

export default function InventoryRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: centers = [], isLoading: centersLoading } = useQuery<Center[]>({
    queryKey: ["/api/centers"],
    queryFn: async () => {
      const res = await fetch("/api/centers", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Error al cargar centros");
      return res.json();
    },
  });

  const {
    data: request,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<InventoryRequest>({
    queryKey: ["/api/inventory/requests", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await fetch(`/api/inventory/requests/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Error al cargar solicitud");
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/inventory/requests/${id}/send`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t?.message || "Error al enviar la solicitud");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Solicitud enviada", description: "Las tiendas fueron notificadas." });
      qc.invalidateQueries({ queryKey: ["/api/inventory/requests", id] });
      refetch();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "No se pudo enviar", variant: "destructive" });
    },
  });

  const centerNameById = useMemo(() => {
    const map = new Map<string, string>();
    centers.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [centers]);

  const selectedCentersNames = useMemo(() => {
    if (!request?.centers?.length) return [];
    return request.centers.map((cid) => centerNameById.get(cid) || cid);
  }, [request?.centers, centerNameById]);

  const totalItems = request?.items?.length || 0;

  const loading = isLoading || centersLoading;

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/inventory/requests">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Detalle de Solicitud</h1>
          {isFetching && <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>{request?.requestNumber || "..."}</CardTitle>
              <div className="text-sm text-muted-foreground">
                Tipo: <span className="font-medium">{request?.requestType}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {request && <StatusPill status={request.status} />}
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={!request || request.status !== "draft" || sendMutation.isPending}
              >
                {sendMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar solicitud
                  </>
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando datos...
              </div>
            )}

            {!loading && request && (
              <>
                {/* Centros seleccionados */}
                <section>
                  <h3 className="font-semibold mb-2">Centros</h3>
                  {selectedCentersNames.length ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedCentersNames.map((name) => (
                        <Badge key={name} variant="secondary" className="py-1">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin centros</p>
                  )}
                </section>

                {/* Filtros aplicados */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Divisiones</h4>
                    <p className="text-sm text-muted-foreground">
                      {request.filterDivisions?.length ? request.filterDivisions.join(", ") : "—"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Categorías</h4>
                    <p className="text-sm text-muted-foreground">
                      {request.filterCategories?.length ? request.filterCategories.join(", ") : "—"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Grupos</h4>
                    <p className="text-sm text-muted-foreground">
                      {request.filterGroups?.length ? request.filterGroups.join(", ") : "—"}
                    </p>
                  </div>
                  <div className="md:col-span-3">
                    <h4 className="text-sm font-medium mb-1">Códigos específicos</h4>
                    <p className="text-sm text-muted-foreground">
                      {request.filterSpecificCodes?.length ? request.filterSpecificCodes.join(", ") : "—"}
                    </p>
                  </div>
                </section>

                {/* Comentarios */}
                <section>
                  <h3 className="font-semibold mb-1">Comentarios</h3>
                  <p className="text-sm text-muted-foreground">{request.comments || "—"}</p>
                </section>

                {/* Items */}
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Items ({totalItems})</h3>
                  </div>
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-2 text-left">Centro</th>
                          <th className="p-2 text-left">Código</th>
                          <th className="p-2 text-left">Descripción</th>
                          <th className="p-2 text-left">División</th>
                          <th className="p-2 text-left">Categoría</th>
                          <th className="p-2 text-left">Grupo</th>
                          <th className="p-2 text-right">Sistema</th>
                          <th className="p-2 text-left">UM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {request.items && request.items.length > 0 ? (
                          request.items.map((it) => (
                            <tr key={it.id} className="border-t">
                              <td className="p-2">{centerNameById.get(it.centerId) || it.centerId}</td>
                              <td className="p-2 font-medium">{it.itemCode}</td>
                              <td className="p-2">{it.itemDescription ?? "—"}</td>
                              <td className="p-2">{it.divisionCode ?? "—"}</td>
                              <td className="p-2">{it.categoryCode ?? "—"}</td>
                              <td className="p-2">{it.groupCode ?? "—"}</td>
                              <td className="p-2 text-right">{it.systemInventory}</td>
                              <td className="p-2">{it.unitMeasureCode ?? "—"}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="p-4 text-center text-muted-foreground">
                              No hay ítems cargados para esta solicitud.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
