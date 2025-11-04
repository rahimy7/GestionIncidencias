import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, FileSpreadsheet, FileText, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/inventory/StatusBadge";

type InventoryRequest = {
  id: string;
  requestNumber: string;
  requestType: string;
  status: "draft" | "sent" | "in_progress" | "completed" | "cancelled";
  centers: string[];
  createdAt: string;
  updatedAt?: string;
  sentAt?: string;
  completedAt?: string;
};

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
});

export default function CoordinatorWorkPool() {
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const { data: requests = [], isLoading } = useQuery<InventoryRequest[]>({
    queryKey: ["/api/inventory/requests", status, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== "all") params.append("status", status);
      const res = await fetch(`/api/inventory/requests?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Error al obtener solicitudes");
      const all = await res.json();
      if (!search) return all;
      return all.filter((r: InventoryRequest) =>
        r.requestNumber.toLowerCase().includes(search.toLowerCase())
      );
    },
  });

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold">Panel del Coordinador</h1>
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={status} onValueChange={(val) => setStatus(val)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="in_progress">En progreso</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="text"
              placeholder="Buscar por número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[200px]"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Solicitudes de Inventario</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando solicitudes...
              </div>
            ) : requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No se encontraron solicitudes.</p>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2 text-left"># Solicitud</th>
                      <th className="p-2 text-left">Tipo</th>
                      <th className="p-2 text-center">Estado</th>
                      <th className="p-2 text-left">Centros</th>
                      <th className="p-2 text-left">Creada</th>
                      <th className="p-2 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r.id} className="border-t hover:bg-muted/30">
                        <td className="p-2 font-medium">{r.requestNumber}</td>
                        <td className="p-2">{r.requestType}</td>
                        <td className="p-2 text-center">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="p-2">
                          <div className="flex flex-wrap gap-1">
                            {r.centers.slice(0, 3).map((c) => (
                              <Badge key={c} variant="outline">
                                {c}
                              </Badge>
                            ))}
                            {r.centers.length > 3 && (
                              <Badge variant="secondary">+{r.centers.length - 3}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-muted-foreground text-sm">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-2 text-center space-x-2">
                          <Link to={`/inventory/requests/${r.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" /> Ver
                            </Button>
                          </Link>
                          <Button size="sm" variant="secondary">
                            <FileSpreadsheet className="h-4 w-4 mr-1" /> Exportar
                          </Button>
                          {r.status === "completed" && (
                            <Button size="sm" variant="default">
                              <FileText className="h-4 w-4 mr-1" /> Enviar a aprobación
                            </Button>
                          )}
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
