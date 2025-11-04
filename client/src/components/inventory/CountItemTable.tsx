import { useState } from "react";
import { CountItemRow, CountItem } from "./CountItemRow";
import { Loader2 } from "lucide-react";

interface CountItemTableProps {
  items: CountItem[];
  editable?: boolean;
  onSaveItem?: (item: { id: string; physicalCount: number; counterComment: string }) => Promise<void> | void;
  isLoading?: boolean;
}

export function CountItemTable({ items, editable = true, onSaveItem, isLoading }: CountItemTableProps) {
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleSave = async (updated: { id: string; physicalCount: number; counterComment: string }) => {
    if (!onSaveItem) return;
    setSavingId(updated.id);
    try {
      await onSaveItem(updated);
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando ítems...
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-6 text-sm">
        No hay ítems disponibles para mostrar.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-2 text-left">Código</th>
            <th className="p-2 text-left">Descripción</th>
            <th className="p-2 text-right">Sistema</th>
            <th className="p-2 text-right">Físico</th>
            <th className="p-2 text-left">UM</th>
            <th className="p-2 text-left">Comentario</th>
            <th className="p-2 text-center">Estado</th>
            <th className="p-2 text-center"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <CountItemRow
              key={item.id}
              item={item}
              editable={editable}
              isSaving={savingId === item.id}
              onSave={handleSave}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CountItemTable;
