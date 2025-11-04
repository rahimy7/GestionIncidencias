import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Shuffle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type AuditItem = {
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
  status: string;
};

interface AuditSampleSelectorProps {
  items: AuditItem[];
  onSampleChange: (sample: AuditItem[]) => void;
}

export function AuditSampleSelector({ items, onSampleChange }: AuditSampleSelectorProps) {
  const [manualSelection, setManualSelection] = useState<Set<string>>(new Set());
  const [autoCount, setAutoCount] = useState<number>(0);
  const [autoPercent, setAutoPercent] = useState<number>(0);
  const [autoMode, setAutoMode] = useState<"count" | "percent">("count");
  const [isGenerating, setIsGenerating] = useState(false);

  // ✅ Cálculo automático de muestra aleatoria
  const handleGenerateAutomatic = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const availableItems = items.filter((i) => !manualSelection.has(i.id));
      let totalToPick = 0;

      if (autoMode === "count") {
        totalToPick = Math.min(autoCount, availableItems.length);
      } else {
        totalToPick = Math.floor((autoPercent / 100) * availableItems.length);
      }

      const shuffled = [...availableItems].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, totalToPick);

      const combined = new Set([...manualSelection, ...selected.map((i) => i.id)]);
      setManualSelection(combined);
      setIsGenerating(false);
    }, 300);
  };

  // ✅ Actualizar la lista combinada al padre
  useEffect(() => {
    const selected = items.filter((i) => manualSelection.has(i.id));
    onSampleChange(selected);
  }, [manualSelection]);

  // ✅ Alternar selección manual
  const toggleManual = (id: string) => {
    setManualSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalSelected = manualSelection.size;
  const totalItems = items.length;

  const selectedPreview = useMemo(() => {
    return items.filter((i) => manualSelection.has(i.id)).slice(0, 5);
  }, [manualSelection, items]);

  return (
    <div className="space-y-6">
      {/* 🔹 Panel de controles */}
      <Card className="border">
        <CardHeader>
          <CardTitle>Configuración de muestra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Selección por cantidad */}
            <div>
              <label className="text-sm font-medium">Cantidad automática</label>
              <Input
                type="number"
                value={autoCount}
                onChange={(e) => {
                  setAutoMode("count");
                  setAutoCount(Number(e.target.value));
                }}
                placeholder="Ej: 5"
              />
            </div>

            {/* Selección por porcentaje */}
            <div>
              <label className="text-sm font-medium">Porcentaje automático</label>
              <Input
                type="number"
                value={autoPercent}
                onChange={(e) => {
                  setAutoMode("percent");
                  setAutoPercent(Number(e.target.value));
                }}
                placeholder="Ej: 10 (%)"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Total ítems: <Badge variant="outline">{totalItems}</Badge>
            </div>
            <Button
              variant="secondary"
              onClick={handleGenerateAutomatic}
              disabled={isGenerating || items.length === 0}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...
                </>
              ) : (
                <>
                  <Shuffle className="h-4 w-4 mr-2" /> Selección aleatoria
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 🔹 Tabla de selección manual */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-center">✔</th>
              <th className="p-2 text-left">Código</th>
              <th className="p-2 text-left">Descripción</th>
              <th className="p-2 text-left">División</th>
              <th className="p-2 text-left">Categoría</th>
              <th className="p-2 text-left">Grupo</th>
              <th className="p-2 text-right">Inventario</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t hover:bg-muted/20">
                <td className="p-2 text-center">
                  <Checkbox
                    checked={manualSelection.has(item.id)}
                    onCheckedChange={() => toggleManual(item.id)}
                  />
                </td>
                <td className="p-2 font-medium">{item.itemCode}</td>
                <td className="p-2">{item.itemDescription}</td>
                <td className="p-2">{item.divisionCode ?? "—"}</td>
                <td className="p-2">{item.categoryCode ?? "—"}</td>
                <td className="p-2">{item.groupCode ?? "—"}</td>
                <td className="p-2 text-right">{item.systemInventory}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🔹 Vista previa */}
      <div className="text-sm text-muted-foreground mt-2">
        <p>
          Seleccionados: <Badge variant="secondary">{totalSelected}</Badge> de {totalItems}
        </p>
        {selectedPreview.length > 0 && (
          <p className="mt-1">
            Ejemplo de selección:{" "}
            {selectedPreview.map((i) => i.itemCode).join(", ")}...
          </p>
        )}
      </div>
    </div>
  );
}
