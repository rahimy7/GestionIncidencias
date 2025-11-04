import { Badge } from "@/components/ui/badge";

export type InventoryStatus =
  | "draft"
  | "sent"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "pending"
  | "assigned"
  | "counted"
  | "reviewing"
  | "approved"
  | "rejected";

interface StatusBadgeProps {
  status: InventoryStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styleMap: Record<InventoryStatus, string> = {
    draft: "bg-gray-200 text-gray-800",
    sent: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    pending: "bg-gray-100 text-gray-700",
    assigned: "bg-blue-50 text-blue-700",
    counted: "bg-amber-50 text-amber-800",
    reviewing: "bg-indigo-50 text-indigo-700",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  const labelMap: Record<InventoryStatus, string> = {
    draft: "Borrador",
    sent: "Enviado",
    in_progress: "En progreso",
    completed: "Completado",
    cancelled: "Cancelado",
    pending: "Pendiente",
    assigned: "Asignado",
    counted: "Contado",
    reviewing: "En revisión",
    approved: "Aprobado",
    rejected: "Rechazado",
  };

  return (
    <Badge className={`${styleMap[status]} capitalize`}>
      {labelMap[status] ?? status}
    </Badge>
  );
}

export default StatusBadge;
