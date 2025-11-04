// ============================================================================
// ENDPOINTS FALTANTES - SISTEMA DE INVENTARIOS
// Archivo: server/routes/inventory-missing-endpoints.ts
// Agregar estos endpoints a inventoryRoutes.ts o inventory-extended.ts
// ============================================================================

import { Router } from 'express';
import { db } from '../db';
import { 
  inventoryCountItems, 
  inventoryHistory,
  inventoryRequests,
  inventoryUserAssignments,
  centers,
  users
} from '@shared/schema';
import { eq, and, desc, sql, inArray, count } from 'drizzle-orm';
import { isAuthenticated } from '../auth';
import { storage } from '../storage';
import { executeQuery } from '../sqlServerConnection';
import ExcelJS from 'exceljs';

const router = Router();

// ============================================================================
// SECCIÓN: REPORTES Y CONSULTAS
// ============================================================================

/**
 * 📜 HISTORIAL COMPLETO DE UN ITEM
 * GET /api/inventory/items/:id/history
 */
router.get('/items/:id/history', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el item existe
    const item = await db.query.inventoryCountItems.findFirst({
      where: (items, { eq }) => eq(items.id, id)
    });
    
    if (!item) {
      return res.status(404).json({ message: 'Item no encontrado' });
    }
    
    // Obtener historial completo
    const history = await db.select()
      .from(inventoryHistory)
      .where(
        and(
          eq(inventoryHistory.entityType, 'count_item'),
          eq(inventoryHistory.entityId, id)
        )
      )
      .orderBy(desc(inventoryHistory.createdAt));
    
    // Enriquecer con información del usuario
    const enrichedHistory = await Promise.all(
      history.map(async (entry) => {
        const user = await storage.getUser(entry.userId);
        return {
          ...entry,
          user: {
            id: user?.id,
            name: `${user?.firstName} ${user?.lastName}`,
            role: user?.role
          }
        };
      })
    );
    
    res.json({
      item: {
        id: item.id,
        itemCode: item.itemCode,
        description: item.itemDescription,
        currentStatus: item.status
      },
      history: enrichedHistory
    });
    
  } catch (error) {
    console.error('Error fetching item history:', error);
    res.status(500).json({ message: 'Error al obtener historial' });
  }
});

/**
 * 🔍 DATOS ENRIQUECIDOS SQL SERVER (Transferencias, Tránsito, Domicilio)
 * GET /api/inventory/items/:id/enriched-data
 */
router.get('/items/:id/enriched-data', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    
    const item = await db.query.inventoryCountItems.findFirst({
      where: (items, { eq }) => eq(items.id, id)
    });
    
    if (!item) {
      return res.status(404).json({ message: 'Item no encontrado' });
    }
    
    // Obtener código del centro
    const center = await db.query.centers.findFirst({
      where: (centers, { eq }) => eq(centers.id, item.centerId)
    });
    
    if (!center) {
      return res.status(404).json({ message: 'Centro no encontrado' });
    }
    
    const locationCode = center.code?.startsWith('T') 
      ? center.code.substring(1) 
      : center.code;
    
    // 1. TRANSFERENCIAS RECIENTES
    const transfersQuery = `
      SELECT TOP 5
        [Document No_] AS documentNo,
        [Posting Date] AS postingDate,
        [Transfer-from Code] AS fromLocation,
        [Transfer-to Code] AS toLocation,
        [Quantity] AS quantity,
        [Unit of Measure Code] AS unitMeasure
      FROM [INNOVACENTRO].[dbo].[View_MovimientoProducto_Inventario]
      WHERE [Item No_] = @param0
        AND ([Transfer-from Code] = @param1 OR [Transfer-to Code] = @param1)
      ORDER BY [Posting Date] DESC
    `;
    
    const transfers = await executeQuery(transfersQuery, [
      item.itemCode, 
      locationCode
    ]);
    
    // 2. PRODUCTOS EN TRÁNSITO
    const transitQuery = `
      SELECT 
        [Transfer Order No_] AS transferOrderNo,
        [Transfer-from Code] AS fromLocation,
        [Transfer-to Code] AS toLocation,
        [Qty_ in Transit] AS quantityInTransit,
        [Shipment Date] AS shipmentDate,
        [Receipt Date] AS estimatedReceiptDate
      FROM [INNOVACENTRO].[dbo].[View_DiasTransitoAlmacen09]
      WHERE [Item No_] = @param0
        AND ([Transfer-from Code] = @param1 OR [Transfer-to Code] = @param1)
        AND [Qty_ in Transit] > 0
    `;
    
    const transit = await executeQuery(transitQuery, [
      item.itemCode, 
      locationCode
    ]);
    
    // 3. PRODUCTOS EN DOMICILIO (Facturados no entregados)
    const homeDeliveryQuery = `
      SELECT 
        [Document No_] AS invoiceNo,
        [Posting Date] AS invoiceDate,
        [Quantity] AS quantity,
        [Customer No_] AS customerNo,
        [Customer Name] AS customerName,
        [Status] AS deliveryStatus,
        [Expected Delivery Date] AS expectedDelivery
      FROM [INNOVACENTRO].[dbo].[View_Detalle_Domicilio_Inventario]
      WHERE [Item No_] = @param0
        AND [Location Code] = @param1
        AND [Status] NOT IN ('Entregado', 'Cancelado')
      ORDER BY [Posting Date] DESC
    `;
    
    const homeDelivery = await executeQuery(homeDeliveryQuery, [
      item.itemCode, 
      locationCode
    ]);
    
    // Calcular totales
    const totalInTransit = transit.reduce(
      (sum: number, t: any) => sum + (t.quantityInTransit || 0), 
      0
    );
    const totalInDelivery = homeDelivery.reduce(
      (sum: number, d: any) => sum + (d.quantity || 0), 
      0
    );
    
    res.json({
      item: {
        code: item.itemCode,
        description: item.itemDescription,
        systemInventory: item.systemInventory,
        physicalCount: item.physicalCount,
        difference: item.difference
      },
      enrichedData: {
        recentTransfers: transfers,
        inTransit: {
          items: transit,
          totalQuantity: totalInTransit
        },
        homeDelivery: {
          items: homeDelivery,
          totalQuantity: totalInDelivery
        }
      },
      adjustedInventory: {
        systemInventory: item.systemInventory,
        minusInTransit: totalInTransit,
        minusHomeDelivery: totalInDelivery,
        adjustedTotal: item.systemInventory - totalInTransit - totalInDelivery
      }
    });
    
  } catch (error) {
    console.error('Error fetching enriched data:', error);
    res.status(500).json({ message: 'Error al obtener datos enriquecidos' });
  }
});

/**
 * 📊 RESUMEN GENERAL DE INVENTARIOS
 * GET /api/inventory/reports/summary
 */
router.get('/reports/summary', isAuthenticated, async (req: any, res) => {
  try {
    const { requestId } = req.query;
    
    let whereCondition = requestId 
      ? eq(inventoryCountItems.requestId, requestId)
      : undefined;
    
    // Contar items por estado
    const statusCounts = await db
      .select({
        status: inventoryCountItems.status,
        count: count()
      })
      .from(inventoryCountItems)
      .where(whereCondition)
      .groupBy(inventoryCountItems.status);
    
    // Obtener estadísticas de diferencias
    const stats = await db
      .select({
        totalItems: count(),
        totalDifference: sql<number>`SUM(COALESCE(${inventoryCountItems.difference}, 0))`,
        totalCostImpact: sql<number>`SUM(COALESCE(${inventoryCountItems.costImpact}, 0))`,
        positiveAdjustments: sql<number>`COUNT(CASE WHEN ${inventoryCountItems.adjustmentType} = 'positive' THEN 1 END)`,
        negativeAdjustments: sql<number>`COUNT(CASE WHEN ${inventoryCountItems.adjustmentType} = 'negative' THEN 1 END)`,
        noAdjustments: sql<number>`COUNT(CASE WHEN ${inventoryCountItems.adjustmentType} = 'none' THEN 1 END)`
      })
      .from(inventoryCountItems)
      .where(whereCondition);
    
    // Diferencias por división
    const byDivision = await db
      .select({
        divisionCode: inventoryCountItems.divisionCode,
        divisionName: inventoryCountItems.divisionName,
        totalItems: count(),
        totalDifference: sql<number>`SUM(COALESCE(${inventoryCountItems.difference}, 0))`,
        costImpact: sql<number>`SUM(COALESCE(${inventoryCountItems.costImpact}, 0))`
      })
      .from(inventoryCountItems)
      .where(whereCondition)
      .groupBy(
        inventoryCountItems.divisionCode,
        inventoryCountItems.divisionName
      );
    
    res.json({
      summary: stats[0],
      byStatus: statusCounts,
      byDivision
    });
    
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ message: 'Error al generar resumen' });
  }
});

/**
 * 📈 REPORTE POR DIVISIÓN
 * GET /api/inventory/reports/by-division
 */
router.get('/reports/by-division', isAuthenticated, async (req: any, res) => {
  try {
    const { divisionCode, requestId } = req.query;
    
    if (!divisionCode) {
      return res.status(400).json({ message: 'divisionCode es requerido' });
    }
    
    const conditions: any[] = [
      eq(inventoryCountItems.divisionCode, divisionCode)
    ];
    
    if (requestId) {
      conditions.push(eq(inventoryCountItems.requestId, requestId));
    }
    
    // Items de la división
    const items = await db.select()
      .from(inventoryCountItems)
      .where(and(...conditions))
      .orderBy(inventoryCountItems.itemCode);
    
    // Estadísticas
    const stats = await db
      .select({
        totalItems: count(),
        counted: sql<number>`COUNT(CASE WHEN ${inventoryCountItems.status} IN ('counted', 'reviewing', 'approved', 'audited', 'adjusted') THEN 1 END)`,
        pending: sql<number>`COUNT(CASE WHEN ${inventoryCountItems.status} IN ('pending', 'assigned') THEN 1 END)`,
        totalDifference: sql<number>`SUM(COALESCE(${inventoryCountItems.difference}, 0))`,
        totalCostImpact: sql<number>`SUM(COALESCE(${inventoryCountItems.costImpact}, 0))`
      })
      .from(inventoryCountItems)
      .where(and(...conditions));
    
    res.json({
      division: {
        code: divisionCode,
        name: items[0]?.divisionName || divisionCode
      },
      statistics: stats[0],
      items
    });
    
  } catch (error) {
    console.error('Error generating division report:', error);
    res.status(500).json({ message: 'Error al generar reporte por división' });
  }
});

/**
 * 🏪 REPORTE POR CENTRO
 * GET /api/inventory/reports/by-center
 */
router.get('/reports/by-center', isAuthenticated, async (req: any, res) => {
  try {
    const { centerId, requestId } = req.query;
    
    if (!centerId) {
      return res.status(400).json({ message: 'centerId es requerido' });
    }
    
    const conditions: any[] = [
      eq(inventoryCountItems.centerId, centerId)
    ];
    
    if (requestId) {
      conditions.push(eq(inventoryCountItems.requestId, requestId));
    }
    
    // Obtener centro
    const center = await db.query.centers.findFirst({
      where: (centers, { eq }) => eq(centers.id, centerId)
    });
    
    // Items del centro agrupados por división
    const byDivision = await db
      .select({
        divisionCode: inventoryCountItems.divisionCode,
        divisionName: inventoryCountItems.divisionName,
        totalItems: count(),
        totalDifference: sql<number>`SUM(COALESCE(${inventoryCountItems.difference}, 0))`,
        costImpact: sql<number>`SUM(COALESCE(${inventoryCountItems.costImpact}, 0))`
      })
      .from(inventoryCountItems)
      .where(and(...conditions))
      .groupBy(
        inventoryCountItems.divisionCode,
        inventoryCountItems.divisionName
      );
    
    // Items completos
    const items = await db.select()
      .from(inventoryCountItems)
      .where(and(...conditions))
      .orderBy(
        inventoryCountItems.divisionCode,
        inventoryCountItems.itemCode
      );
    
    res.json({
      center: {
        id: center?.id,
        name: center?.name,
        code: center?.code
      },
      byDivision,
      items
    });
    
  } catch (error) {
    console.error('Error generating center report:', error);
    res.status(500).json({ message: 'Error al generar reporte por centro' });
  }
});

// ============================================================================
// SECCIÓN: EXPORTACIÓN EXCEL
// ============================================================================

/**
 * 📥 EXPORTAR HOJA DE CONTEO A EXCEL
 * GET /api/inventory/items/:id/export-excel
 */
router.get('/items/:id/export-excel', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    
    const item = await db.query.inventoryCountItems.findFirst({
      where: (items, { eq }) => eq(items.id, id)
    });
    
    if (!item) {
      return res.status(404).json({ message: 'Item no encontrado' });
    }
    
    // Crear workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Hoja de Conteo');
    
    // Configurar columnas
    worksheet.columns = [
      { header: 'Código', key: 'code', width: 15 },
      { header: 'Descripción', key: 'description', width: 40 },
      { header: 'División', key: 'division', width: 20 },
      { header: 'Categoría', key: 'category', width: 20 },
      { header: 'Grupo', key: 'group', width: 20 },
      { header: 'Inv. Sistema', key: 'systemInventory', width: 15 },
      { header: 'Conteo Físico', key: 'physicalCount', width: 15 },
      { header: 'Diferencia', key: 'difference', width: 15 },
      { header: 'Comentario', key: 'comment', width: 30 }
    ];
    
    // Agregar fila con datos
    worksheet.addRow({
      code: item.itemCode,
      description: item.itemDescription,
      division: item.divisionName,
      category: item.categoryName,
      group: item.groupName,
      systemInventory: item.systemInventory,
      physicalCount: item.physicalCount || '',
      difference: item.difference || '',
      comment: item.counterComment || ''
    });
    
    // Estilos de encabezado
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    
    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Enviar archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=conteo-${item.itemCode}.xlsx`);
    res.send(buffer);
    
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({ message: 'Error al exportar Excel' });
  }
});

/**
 * 📥 EXPORTAR MÚLTIPLES ITEMS A EXCEL
 * POST /api/inventory/export-batch-excel
 */
router.post('/export-batch-excel', isAuthenticated, async (req: any, res) => {
  try {
    const { itemIds, requestId } = req.body;
    
    let items;
    if (itemIds && itemIds.length > 0) {
      items = await db.select()
        .from(inventoryCountItems)
        .where(inArray(inventoryCountItems.id, itemIds));
    } else if (requestId) {
      items = await db.select()
        .from(inventoryCountItems)
        .where(eq(inventoryCountItems.requestId, requestId));
    } else {
      return res.status(400).json({ 
        message: 'Debe proporcionar itemIds o requestId' 
      });
    }
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Hoja de Conteo');
    
    worksheet.columns = [
      { header: 'Código', key: 'code', width: 15 },
      { header: 'Descripción', key: 'description', width: 40 },
      { header: 'División', key: 'division', width: 20 },
      { header: 'Inv. Sistema', key: 'systemInventory', width: 15 },
      { header: 'Conteo Físico', key: 'physicalCount', width: 15 },
      { header: 'Diferencia', key: 'difference', width: 15 }
    ];
    
    items.forEach(item => {
      worksheet.addRow({
        code: item.itemCode,
        description: item.itemDescription,
        division: item.divisionName,
        systemInventory: item.systemInventory,
        physicalCount: item.physicalCount || '',
        difference: item.difference || ''
      });
    });
    
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    
    const buffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=conteo-batch.xlsx`);
    res.send(buffer);
    
  } catch (error) {
    console.error('Error exporting batch to Excel:', error);
    res.status(500).json({ message: 'Error al exportar lote a Excel' });
  }
});

// ============================================================================
// SECCIÓN: UTILIDADES
// ============================================================================

/**
 * 🗑️ CANCELAR SOLICITUD
 * DELETE /api/inventory/requests/:id
 */
router.delete('/requests/:id', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    // Solo admin o coordinator pueden cancelar
    if (!['admin', 'inventory_coordinator'].includes(user?.role || '')) {
      return res.status(403).json({ 
        message: 'No tienes permisos para cancelar solicitudes' 
      });
    }
    
    const request = await db.query.inventoryRequests.findFirst({
      where: (requests, { eq }) => eq(requests.id, id)
    });
    
    if (!request) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }
    
    // No permitir cancelar si ya está completada o tiene conteos
    if (request.status === 'completed') {
      return res.status(400).json({ 
        message: 'No se puede cancelar una solicitud completada' 
      });
    }
    
    // Verificar si hay conteos registrados
    const countedItems = await db.select()
      .from(inventoryCountItems)
      .where(
        and(
          eq(inventoryCountItems.requestId, id),
          sql`${inventoryCountItems.status} NOT IN ('pending', 'assigned')`
        )
      );
    
    if (countedItems.length > 0) {
      return res.status(400).json({ 
        message: 'No se puede cancelar: hay conteos registrados' 
      });
    }
    
    // Actualizar a cancelado
    await db.update(inventoryRequests)
      .set({
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(inventoryRequests.id, id));
    
    // Registrar en historial
    await db.insert(inventoryHistory).values({
      entityType: 'request',
      entityId: id,
      action: 'cancelled',
      description: 'Solicitud cancelada',
      userId
    });
    
    res.json({ message: 'Solicitud cancelada exitosamente' });
    
  } catch (error) {
    console.error('Error cancelling request:', error);
    res.status(500).json({ message: 'Error al cancelar solicitud' });
  }
});

/**
 * 👥 OBTENER USUARIOS DE UN CENTRO
 * GET /api/inventory/centers/:id/users
 */
router.get('/centers/:id/users', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { role } = req.query;
    
    const center = await db.query.centers.findFirst({
      where: (centers, { eq }) => eq(centers.id, id)
    });
    
    if (!center) {
      return res.status(404).json({ message: 'Centro no encontrado' });
    }
    
    // Obtener usuarios del centro
    // Obtener usuarios del centro
const centerUsers = await db
  .select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.email,
    role: users.role
  })
  .from(users)
  .where(
    role
      ? and(eq(users.centerId, id), eq(users.role, role))
      : eq(users.centerId, id)
  );

res.json({
  center: {
    id: center.id,
    name: center.name,
    code: center.code
  },
  users: centerUsers
});

    
  } catch (error) {
    console.error('Error fetching center users:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
});

/**
 * 🔌 TEST CONEXIÓN SQL SERVER
 * GET /api/inventory/sql-server/test
 */
router.get('/sql-server/test', isAuthenticated, async (req: any, res) => {
  try {
    // 🔹 Tipamos el resultado del query explícitamente
    const result = await executeQuery<{ test: number; serverTime: Date }>(
      'SELECT 1 AS test, GETDATE() AS serverTime'
    );

    // 🔹 Accedemos a la propiedad con confianza de tipo
    res.json({
      connected: true,
      serverTime: result[0]?.serverTime,
      message: 'Conexión SQL Server exitosa',
    });

  } catch (error: any) {
    console.error('SQL Server connection test failed:', error);
    res.status(500).json({
      connected: false,
      error: error.message,
      message: 'Error al conectar con SQL Server',
    });
  }
});


/**
 * 🔍 BUSCAR PRODUCTOS EN SQL SERVER
 * GET /api/inventory/sql-server/products/search
 */
router.get('/sql-server/products/search', isAuthenticated, async (req: any, res) => {
  try {
    const { query, limit = 20 } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ 
        message: 'La búsqueda debe tener al menos 2 caracteres' 
      });
    }
    
    const searchQuery = `
      SELECT TOP ${limit}
        [ItemNo] AS code,
        [ItemDescription] AS description,
        [ItemDescription2] AS description2,
        [DivisionCode] AS divisionCode,
        [ItemCategoryCode] AS categoryCode,
        [ProductGroupCode] AS groupCode,
        [Barcode] AS barcode
      FROM [INNOVACENTRO].[dbo].[View_ProductosAlmacen_Inventario]
      WHERE [ItemNo] LIKE @param0
         OR [ItemDescription] LIKE @param0
         OR [Barcode] LIKE @param0
      GROUP BY 
        [ItemNo], [ItemDescription], [ItemDescription2],
        [DivisionCode], [ItemCategoryCode], [ProductGroupCode], [Barcode]
      ORDER BY [ItemNo]
    `;
    
    const results = await executeQuery(searchQuery, [`%${query}%`]);
    
    res.json({
      query,
      results,
      count: results.length
    });
    
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ message: 'Error al buscar productos' });
  }
});

// ============================================================================
// SECCIÓN: CONFIGURACIÓN Y ASIGNACIONES
// ============================================================================

/**
 * ⚙️ CONFIGURAR ASIGNACIÓN AUTOMÁTICA POR DIVISIÓN/CATEGORÍA
 * POST /api/inventory/assignments/auto-config
 */
router.post('/assignments/auto-config', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (user?.role !== 'manager') {
      return res.status(403).json({ 
        message: 'Solo gerentes pueden configurar asignaciones' 
      });
    }
    
    const { 
      centerId, 
      assignToUserId, 
      assignmentType, // 'division', 'category', 'group'
      assignmentValues // Array de códigos
    } = req.body;
    
    if (!centerId || !assignToUserId || !assignmentType || !assignmentValues) {
      return res.status(400).json({ 
        message: 'Todos los campos son requeridos' 
      });
    }
    
    // Validar que el gerente tenga acceso al centro
    if (user.centerId !== centerId) {
      return res.status(403).json({ message: 'Sin acceso a este centro' });
    }
    
    // Verificar que el usuario asignado pertenezca al centro
    const assignee = await storage.getUser(assignToUserId);
    if (assignee?.centerId !== centerId) {
      return res.status(400).json({ 
        message: 'El usuario no pertenece a este centro' 
      });
    }
    
    // Verificar si ya existe una configuración
    const existing = await db.select()
      .from(inventoryUserAssignments)
      .where(
        and(
          eq(inventoryUserAssignments.centerId, centerId),
          eq(inventoryUserAssignments.userId, assignToUserId),
          eq(inventoryUserAssignments.assignmentType, assignmentType)
        )
      );
    
    if (existing.length > 0) {
      // Actualizar configuración existente
      await db.update(inventoryUserAssignments)
        .set({
          assignmentValues,
          updatedAt: new Date()
        })
        .where(eq(inventoryUserAssignments.id, existing[0].id));
      
      res.json({
        message: 'Configuración actualizada',
        config: { ...existing[0], assignmentValues }
      });
    } else {
      // Crear nueva configuración
      const [config] = await db.insert(inventoryUserAssignments)
        .values({
          centerId,
          userId: assignToUserId,
           createdBy: req.user.id,
          assignmentType,
          assignmentValues
        })
        .returning();
      
      res.status(201).json({
        message: 'Configuración creada',
        config
      });
    }
    
  } catch (error) {
    console.error('Error configuring auto-assignment:', error);
    res.status(500).json({ message: 'Error al configurar asignación' });
  }
});

/**
 * 💬 AGREGAR COMENTARIO A ITEM
 * PATCH /api/inventory/items/:id/comment
 */
router.patch('/items/:id/comment', isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    const { comment, commentType } = req.body; // commentType: 'counter', 'manager', 'auditor', 'coordinator'
    
    if (!comment) {
      return res.status(400).json({ message: 'El comentario es requerido' });
    }
    
    const item = await db.query.inventoryCountItems.findFirst({
      where: (items, { eq }) => eq(items.id, id)
    });
    
    if (!item) {
      return res.status(404).json({ message: 'Item no encontrado' });
    }
    
    // Determinar qué campo actualizar según el rol
    let updateField = {};
    
    switch (user?.role) {
      case 'user':
        updateField = { counterComment: comment };
        break;
      case 'manager':
        updateField = { managerComment: comment };
        break;
      case 'inventory_auditor':
        updateField = { auditorComment: comment };
        break;
      case 'inventory_coordinator':
        updateField = { coordinatorComment: comment };
        break;
      default:
        return res.status(403).json({ 
          message: 'No tienes permisos para comentar' 
        });
    }
    
    // Actualizar item
    const [updated] = await db.update(inventoryCountItems)
      .set({
        ...updateField,
        updatedAt: new Date()
      })
      .where(eq(inventoryCountItems.id, id))
      .returning();
    
    // Registrar en historial
    await db.insert(inventoryHistory).values({
      entityType: 'count_item',
      entityId: id,
      action: 'comment_added',
      description: `Comentario agregado por ${user?.role}`,
      userId
    });
    
    res.json(updated);
    
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Error al agregar comentario' });
  }
});

export default router;