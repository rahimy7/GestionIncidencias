// server/services/emailService.ts

export async function sendInventoryNotification(type: string, data: any) {
  switch (type) {
    case 'request_sent':
      // Notificar a gerentes de centros
      break;
    case 'count_submitted':
      // Notificar a gerente para revisión
      break;
    case 'count_approved':
      // Notificar a auditor
      break;
    case 'audit_completed':
      // Notificar a coordinador
      break;
    case 'ready_for_adjustment':
      // Notificar a aprobadores
      break;
  }
}