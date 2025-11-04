// server/jobs/inventoryJobs.ts

import cron from 'node-cron';

// Verificar conteos vencidos (diario a las 8 AM)
cron.schedule('0 8 * * *', async () => {
  console.log('Verificando conteos vencidos...');
  // TODO: Marcar como vencidos los conteos que superaron fecha límite
});

// Recordatorios de conteos pendientes (diario a las 10 AM)
cron.schedule('0 10 * * *', async () => {
  console.log('Enviando recordatorios...');
  // TODO: Enviar emails de recordatorio
});