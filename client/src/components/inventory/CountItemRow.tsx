import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "./StatusBadge";

export interface CountItem {
  id: string;
  itemCode: string;
  itemDescription: string;
  systemInventory: number;
  physicalCount?: number | null;
  difference?: number | null;
  counterComment?: string | null;
  unitMeasureCode?: string | null;
  status: string;
}

interface CountItemRowProps {
  item: CountItem;
  onSave?: (updated: { id: string; physicalCount: number; counterComment: string }) => Promise<void> | void;
  editable?: boolean;
  isSaving?: boolean;
}

export function CountItemRow({ item, onSave, editable = true, isSaving }: CountItemRowProps) {
  const [physicalCount, setPhysicalCount] = useState<number | string>(item.physicalCount ?? "");
  const [counterComment, setCounterComment] = useState(item.counterComment ?? "");
  const [localSaving, setLocalSaving] = useState(false);

  const handleSave = async () => {
    if (!onSave) return;
    try {
      setLocalSaving(true);
      await onSave({
        id: item.id,
        physicalCount: Number(physicalCount) || 0,
        counterComment,
      });
    } finally {
      setLocalSaving(false);
    }
  };

  return (
    <tr className="border-t hover:bg-muted/30 transition">
      <td className="p-2 font-medium">{item.itemCode}</td>
      <td className="p-2">{item.itemDescription}</td>
      <td className="p-2 text-right">{item.systemInventory}</td>
      <td className="p-2 text-right">
        {editable ? (
          <Input
            type="number"
            className="w-24 text-right"
            value={physicalCount}
            onChange={(e) => setPhysicalCount(e.target.value)}
          />
        ) : (
          item.physicalCount ?? "—"
        )}
      </td>
      <td className="p-2">{item.unitMeasureCode ?? "—"}</td>
      <td className="p-2">
        {editable ? (
          <Textarea
            rows={1}
            className="min-h-[30px]"
            placeholder="Comentario..."
            value={counterComment}
            onChange={(e) => setCounterComment(e.target.value)}
          />
        ) : (
          item.counterComment ?? "—"
        )}
      </td>
      <td className="p-2 text-center">
        <StatusBadge status={item.status as any} />
      </td>
      <td className="p-2 text-center">
        {editable && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={isSaving || localSaving}
          >
            {localSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" /> Guardar
              </>
            )}
          </Button>
        )}
      </td>
    </tr>
  );
}

export default CountItemRow;
