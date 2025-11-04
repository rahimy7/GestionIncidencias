import { Router } from 'express';
import { inventoryService } from '../services/inventoryService';
import { isAuthenticated } from '../auth';
import { inventoryRequests, inventoryCountItems } from '@shared/schema';
import { sql, eq, desc, and, inArray } from 'drizzle-orm';
import { db } from 'server/db';
import { storage } from 'server/storage';

const router = Router();

/**
 * 📋 CREAR SOLICITUD DE INVENTARIO
 * POST /api/inventory/requests
 */
router.post('/requests', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    // Validar permisos (admin, manager, o coordinator)
    if (!['admin', 'manager', 'inventory_coordinator'].includes(user?.role || '')) {
      return res.status(403).json({ 
        message: 'No tienes permisos para crear solicitudes de inventario' 
      });
    }
    
    const request = await inventoryService.createInventoryRequest({
      ...req.body,
      createdBy: userId
    });
    
    res.status(201).json(request);
  } catch (error: any) {
    console.error('Error creating inventory request:', error);
    res.status(500).json({ message: error.message || 'Error al crear solicitud' });
  }
});

/**
 * 📊 LISTAR SOLICITUDES DE INVENTARIO
 * GET /api/inventory/requests
 */
router.get('/requests', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    const { status, centerId, limit = 50, offset = 0 } = req.query;

    // ✅ Construcción segura de condiciones dinámicas
    const conditions: any[] = [];

    // 📍 Filtrar por centro si es manager
    if (user?.role === 'manager' && user?.centerId) {
      conditions.push(sql`${user.centerId} = ANY(${inventoryRequests.centers})`);
    }

    // 📍 Filtrar por estado
    if (status) {
      conditions.push(eq(inventoryRequests.status, status));
    }

    // 📍 Filtrar por centro específico
    if (centerId) {
      conditions.push(sql`${centerId} = ANY(${inventoryRequests.centers})`);
    }

    // ✅ Ejecutar consulta con condiciones dinámicas
    const requests = await db
      .select()
      .from(inventoryRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(inventoryRequests.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    res.json(requests);
  } catch (error: any) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ message: error?.message || 'Error al obtener solicitudes' });
  }
});

/**
 * 🔍 OBTENER DETALLE DE SOLICITUD
 * GET /api/inventory/requests/:id
 */
router.get('/requests/:id', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    const request = await db.query.inventoryRequests.findFirst({
      where: (requests, { eq }) => eq(requests.id, id)
    });
    
    if (!request) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }
    
    // Validar acceso
    if (user?.role === 'manager' && user?.centerId) {
      if (!request.centers.includes(user.centerId)) {
        return res.status(403).json({ message: 'Sin acceso a esta solicitud' });
      }
    }
    
    // Obtener items de conteo
    const items = await db.select()
      .from(inventoryCountItems)
      .where(eq(inventoryCountItems.requestId, id));
    
    res.json({
      ...request,
      items
    });
  } catch (error: any) {
    console.error('Error fetching request:', error);
    res.status(500).json({ message: 'Error al obtener solicitud' });
  }
});

/**
 * 📤 ENVIAR SOLICITUD (Cambiar a estado 'sent')
 * POST /api/inventory/requests/:id/send
 */
router.post('/requests/:id/send', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const [updated] = await db
      .update(inventoryRequests)
      .set({
        status: 'sent',
        sentAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(inventoryRequests.id, id))
      .returning();
    
    // Registrar en historial
    await inventoryService.addHistory({
      entityType: 'request',
      entityId: id,
      action: 'sent',
      description: 'Solicitud enviada a las tiendas',
      userId
    });
    
    // TODO: Enviar notificaciones a gerentes de centros
    
    res.json(updated);
  } catch (error: any) {
    console.error('Error sending request:', error);
    res.status(500).json({ message: 'Error al enviar solicitud' });
  }
});

/**
 * 👤 ASIGNAR ITEMS A USUARIO (Automático o Manual)
 * POST /api/inventory/items/assign
 */
router.post('/items/assign', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    // Solo managers pueden asignar
    if (user?.role !== 'manager') {
      return res.status(403).json({ message: 'Solo gerentes pueden asignar conteos' });
    }
    
    const { requestId, centerId, assignmentType, assignTo, filters } = req.body;
    
    // Validar que el gerente tenga acceso al centro
    if (user.centerId !== centerId) {
      return res.status(403).json({ message: 'Sin acceso a este centro' });
    }
    
    let itemsToAssign;
    
    if (assignmentType === 'automatic') {
      // Asignación automática basada en reglas configuradas
      itemsToAssign = await db.select()
        .from(inventoryCountItems)
        .where(
          and(
            eq(inventoryCountItems.requestId, requestId),
            eq(inventoryCountItems.centerId, centerId),
            eq(inventoryCountItems.status, 'pending'),
            // Aplicar filtros de división, categoría, grupo según configuración
          )
        );
    } else {
      // Asignación manual
      itemsToAssign = await db.select()
        .from(inventoryCountItems)
        .where(
          and(
            eq(inventoryCountItems.requestId, requestId),
            eq(inventoryCountItems.centerId, centerId),
            inArray(inventoryCountItems.id, req.body.itemIds)
          )
        );
    }
    
    // Actualizar asignación
    const itemIds = itemsToAssign.map(item => item.id);
    await db
      .update(inventoryCountItems)
      .set({
        assignedTo: assignTo,
        assignedAt: new Date(),
        status: 'assigned',
        updatedAt: new Date()
      })
      .where(inArray(inventoryCountItems.id, itemIds));
    
    // Registrar en historial
    await inventoryService.addHistory({
      entityType: 'count_items',
      entityId: requestId,
      action: 'assigned',
      description: `${itemIds.length} items asignados al usuario`,
      userId
    });
    
    res.json({ assignedCount: itemIds.length });
  } catch (error: any) {
    console.error('Error assigning items:', error);
    res.status(500).json({ message: 'Error al asignar items' });
  }
});

/**
 * 📝 POOL DE TRABAJO DEL USUARIO (Items asignados para contar)
 * GET /api/inventory/my-work-pool
 */
router.get('/my-work-pool', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { status, division, group } = req.query;

    // ✅ 1. Construir condiciones dinámicas
    const conditions: any[] = [eq(inventoryCountItems.assignedTo, userId)];

    if (status) {
      conditions.push(eq(inventoryCountItems.status, status));
    }
    if (division) {
      conditions.push(eq(inventoryCountItems.divisionCode, division));
    }
    if (group) {
      conditions.push(eq(inventoryCountItems.groupCode, group));
    }

    // ✅ 2. Ejecutar consulta
    const items = await db
      .select()
      .from(inventoryCountItems)
      .where(and(...conditions))
      .orderBy(
        inventoryCountItems.divisionCode,
        inventoryCountItems.itemCode
      );

    res.json(items);
  } catch (error: any) {
    console.error('Error fetching work pool:', error);
    res.status(500).json({ message: 'Error al obtener pool de trabajo' });
  }
});


/**
 * 📥 REGISTRAR RESULTADOS DE CONTEO
 * POST /api/inventory/items/:id/count-result
 */
router.post('/items/:id/count-result', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { physicalCount, counterComment } = req.body;
    
    // Obtener item
    const item = await db.query.inventoryCountItems.findFirst({
      where: (items, { eq }) => eq(items.id, id)
    });
    
    if (!item) {
      return res.status(404).json({ message: 'Item no encontrado' });
    }
    
    // Validar que el usuario sea el asignado
    if (item.assignedTo !== userId) {
      return res.status(403).json({ message: 'No eres el asignado a este conteo' });
    }
    
    // Calcular diferencia y tipo de ajuste
    const difference = physicalCount - item.systemInventory;
    const adjustmentType = difference > 0 ? 'positive' : difference < 0 ? 'negative' : 'none';
    const costImpact = difference * item.unitCost;
    
    // Actualizar item
    const [updated] = await db
      .update(inventoryCountItems)
      .set({
        physicalCount,
        difference,
        adjustmentType,
        costImpact,
        counterComment,
        status: 'counted',
        countedAt: new Date(),
        countedBy: userId,
        updatedAt: new Date()
      })
      .where(eq(inventoryCountItems.id, id))
      .returning();
    
    // Registrar en historial
    await inventoryService.addHistory({
      entityType: 'count_item',
      entityId: id,
      action: 'counted',
      description: `Conteo registrado: ${physicalCount} (Diferencia: ${difference})`,
      userId
    });
    
    res.json(updated);
  } catch (error: any) {
    console.error('Error registering count:', error);
    res.status(500).json({ message: 'Error al registrar conteo' });
  }
});

/**
 * ✅ ENVIAR LOTE DE CONTEOS
 * POST /api/inventory/items/submit-batch
 */
router.post('/items/submit-batch', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { itemIds } = req.body;
    
    // Actualizar todos los items a estado 'reviewing'
    await db
      .update(inventoryCountItems)
      .set({
        status: 'reviewing',
        updatedAt: new Date()
      })
      .where(
        and(
          inArray(inventoryCountItems.id, itemIds),
          eq(inventoryCountItems.assignedTo, userId),
          eq(inventoryCountItems.status, 'counted')
        )
      );
    
    // Registrar en historial
    await inventoryService.addHistory({
      entityType: 'count_items',
      entityId: 'batch',
      action: 'submitted',
      description: `${itemIds.length} conteos enviados para revisión`,
      userId
    });
    
    res.json({ submittedCount: itemIds.length });
  } catch (error: any) {
    console.error('Error submitting batch:', error);
    res.status(500).json({ message: 'Error al enviar conteos' });
  }
});

/**
 * 🔎 POOL DE REVISIÓN DEL GERENTE
 * GET /api/inventory/manager/review-pool
 */
router.get('/manager/review-pool', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (user?.role !== 'manager' || !user?.centerId) {
      return res.status(403).json({ message: 'Solo gerentes pueden acceder' });
    }
    
    const items = await db.select()
      .from(inventoryCountItems)
      .where(
        and(
          eq(inventoryCountItems.centerId, user.centerId),
          eq(inventoryCountItems.status, 'reviewing')
        )
      )
      .orderBy(inventoryCountItems.updatedAt);
    
    res.json(items);
  } catch (error: any) {
    console.error('Error fetching review pool:', error);
    res.status(500).json({ message: 'Error al obtener pool de revisión' });
  }
});

/**
 * ✅ APROBAR CONTEO (Gerente)
 * POST /api/inventory/items/:id/approve
 */
router.post('/items/:id/approve', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    const { managerComment } = req.body;
    
    if (user?.role !== 'manager') {
      return res.status(403).json({ message: 'Solo gerentes pueden aprobar' });
    }
    
    const [updated] = await db
      .update(inventoryCountItems)
      .set({
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: userId,
        managerComment,
        updatedAt: new Date()
      })
      .where(eq(inventoryCountItems.id, id))
      .returning();
    
    await inventoryService.addHistory({
      entityType: 'count_item',
      entityId: id,
      action: 'approved',
      description: 'Conteo aprobado por gerente',
      userId
    });
    
    res.json(updated);
  } catch (error: any) {
    console.error('Error approving item:', error);
    res.status(500).json({ message: 'Error al aprobar conteo' });
  }
});

/**
 * ❌ RECHAZAR CONTEO (Gerente)
 * POST /api/inventory/items/:id/reject
 */
router.post('/items/:id/reject', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    const { managerComment } = req.body;
    
    if (user?.role !== 'manager') {
      return res.status(403).json({ message: 'Solo gerentes pueden rechazar' });
    }
    
    if (!managerComment) {
      return res.status(400).json({ message: 'Debe proporcionar un comentario' });
    }
    
    const [updated] = await db
      .update(inventoryCountItems)
      .set({
        status: 'rejected',
        managerComment,
        updatedAt: new Date()
      })
      .where(eq(inventoryCountItems.id, id))
      .returning();
    
    await inventoryService.addHistory({
      entityType: 'count_item',
      entityId: id,
      action: 'rejected',
      description: `Conteo rechazado: ${managerComment}`,
      userId
    });
    
    res.json(updated);
  } catch (error: any) {
    console.error('Error rejecting item:', error);
    res.status(500).json({ message: 'Error al rechazar conteo' });
  }
});

// Exportar router
export default router;