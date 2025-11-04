// client/src/pages/inventory/CreateInventoryRequest.tsx
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function CreateInventoryRequest() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    requestType: "manual",
    comments: "",
    filterSpecificCodes: [] as any[],
    centers: [] as string[], // ahora será multiselección
  });

  const [productInput, setProductInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔹 Cargar centros
  const { data: centers = [] } = useQuery({
    queryKey: ["/api/centers"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/centers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al cargar centros");
      return res.json();
    },
  });

  // 🔹 Función para obtener datos del producto desde el backend
  const fetchProductData = async (code: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/inventory/products/${code}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  // ✅ NUEVO: Permitir pegar varios códigos
// ✅ NUEVO: Permitir pegar varios códigos sin duplicados
const handleAddCodes = async () => {
  const rawCodes = productInput
    .replace(/\s+/g, ",") // reemplaza espacios o saltos de línea por comas
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => c.length > 0);

  if (rawCodes.length === 0) return;

  // Normaliza los códigos existentes en memoria
  const existingCodes = formData.filterSpecificCodes.map(
    (p) => p.code.trim().toUpperCase()
  );

  // Elimina duplicados dentro del texto pegado y los ya agregados
  const uniqueCodes = [...new Set(rawCodes)].filter(
    (c) => !existingCodes.includes(c)
  );

  if (uniqueCodes.length === 0) {
    toast({ title: "Todos los códigos ya fueron agregados" });
    setProductInput("");
    return;
  }

  setIsLoading(true);
  const results = await Promise.all(uniqueCodes.map(fetchProductData));
  const valid = results.filter(Boolean);

  if (valid.length > 0) {
    setFormData((prev) => ({
      ...prev,
      filterSpecificCodes: [
        ...prev.filterSpecificCodes,
        ...valid.map((p: any) => ({
          code: p.code.trim().toUpperCase(),
          description1: p.description1,
          description2: p.description2,
          divisionCode: p.divisionCode,
          categoryCode: p.categoryCode,
          groupCode: p.groupCode,
          unitMeasure: p.unitMeasure,
        })),
      ],
    }));

    toast({
      title: `Se agregaron ${valid.length} códigos válidos`,
      description: "Los productos se cargaron correctamente",
    });
  } else {
    toast({
      title: "No se encontraron códigos válidos",
      variant: "destructive",
    });
  }

  setProductInput("");
  setIsLoading(false);
};

  // ✅ Multiselección de centros
  const handleToggleCenter = (centerId: string) => {
    setFormData((prev) => ({
      ...prev,
      centers: prev.centers.includes(centerId)
        ? prev.centers.filter((c) => c !== centerId)
        : [...prev.centers, centerId],
    }));
  };

  // 🔹 Enviar solicitud
  const handleSubmit = async () => {
    if (formData.filterSpecificCodes.length === 0) {
      toast({ title: "Debe agregar códigos", variant: "destructive" });
      return;
    }

    if (formData.centers.length === 0) {
      toast({ title: "Debe seleccionar al menos una tienda", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/inventory/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          requestType: "manual",
          comments: formData.comments,
          centers: formData.centers,
          filterSpecificCodes: formData.filterSpecificCodes.map((p) => p.code),
        }),
      });

      if (!res.ok) throw new Error("Error al crear solicitud");
      const result = await res.json();

      toast({
        title: "Solicitud creada",
        description: `Número: ${result.requestNumber}`,
      });

      setFormData({ requestType: "manual", comments: "", filterSpecificCodes: [], centers: [] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Nueva Solicitud de Inventario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 🔹 Seleccionar Centros */}
            <div>
              <h3 className="font-semibold mb-2">Seleccionar Centros</h3>
              <div className="flex flex-wrap gap-2">
                {centers.map((center: any) => (
                  <Button
                    key={center.id}
                    variant={formData.centers.includes(center.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleCenter(center.id)}
                  >
                    {center.name}
                  </Button>
                ))}
              </div>
              {formData.centers.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Centros seleccionados: {formData.centers.length}
                </p>
              )}
            </div>

            {/* 🔹 Agregar varios códigos */}
            <div>
              <h3 className="font-semibold mb-2">Agregar Códigos de Producto</h3>
              <Textarea
                placeholder="Pega varios códigos separados por coma o salto de línea"
                value={productInput}
                onChange={(e) => setProductInput(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleAddCodes}
                disabled={isLoading}
                className="mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" /> Cargando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" /> Agregar Códigos
                  </>
                )}
              </Button>
            </div>

            {/* 🔹 Tabla de productos */}
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2">Código</th>
                    <th className="p-2">Descripción</th>
                    <th className="p-2">División</th>
             
                    
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.filterSpecificCodes.map((item) => (
                    <tr key={item.code} className="border-t">
                      <td className="p-2 font-medium">{item.code}</td>
                      <td className="p-2">{item.description1}</td>
                      <td className="p-2">{item.divisionCode}</td>
                
                  
                      <td className="p-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              filterSpecificCodes: prev.filterSpecificCodes.filter(
                                (p) => p.code !== item.code
                              ),
                            }))
                          }
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {formData.filterSpecificCodes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-gray-400 py-4">
                        No hay códigos agregados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 🔹 Comentarios */}
            <div>
              <h3 className="font-semibold mb-2">Comentarios</h3>
              <Textarea
                placeholder="Comentarios adicionales..."
                value={formData.comments}
                onChange={(e) =>
                  setFormData({ ...formData, comments: e.target.value })
                }
                rows={4}
              />
            </div>

            {/* 🔹 Botones */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
              >
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Creando..." : "Crear Solicitud"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
