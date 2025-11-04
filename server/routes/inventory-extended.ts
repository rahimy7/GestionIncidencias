// ============================================================================
// ENDPOINTS ADICIONALES - SISTEMA DE INVENTARIOS
// Archivo: server/routes/inventory-extended.ts
// ============================================================================

import { Router } from 'express';
import { db } from '../db';
import { 
  inventoryCountItems, 
  inventoryAuditDocuments,
  inventoryAuditSamples,
  inventoryAdjustmentApprovals,
  inventoryHistory, 
  InsertInventoryAuditSample,
  centers,
  inventoryRequests
} from '../../shared/schema';
import { eq, and, inArray, sql, desc } from 'drizzle-orm';
import { isAuthenticated } from '../auth';
import { storage } from '../storage';
import { executeQuery } from 'server/sqlServerConnection';

const router = Router();


/**
 * 🔍 OBTENER DETALLE DE PRODUCTO POR CÓDIGO
 * GET /api/inventory/products/:code
 */
/**
 * ✅ OBTENER DETALLE DE PRODUCTO POR CÓDIGO (compatible con View_ProductosAlmacen_Inventario)
 * GET /api/inventory/products/:code
 */
router.get('/products/:code', isAuthenticated, async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ message: 'Debe especificar un código de producto' });
    }

    const query = `
      SELECT TOP 1
        [ItemNo] AS code,
        [ItemDescription] AS description1,
        [ItemDescription2] AS description2,
        [DivisionCode] AS divisionCode,
        [ItemCategoryCode] AS categoryCode,
        [ProductGroupCode] AS groupCode,
        [Barcode] AS barcode,
        [UnitMeasureCode] AS unitMeasure,
        [Inventory] AS systemInventory,
        [ItemUnitCost] AS unitCost,
        [ItemStatus] AS status
      FROM [INNOVACENTRO].[dbo].[View_ProductosAlmacen_Inventario]
      WHERE [ItemNo] = @param0
    `;

    const result = await executeQuery(query, [code]);

    if (result.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({ message: 'Error interno al obtener producto' });
  }
});

// ============================================================================
// SECCIÓN: AUDITORÍA
// ============================================================================

/**
 * 📋 CREAR DOCUMENTO DE AUDITORÍA
 * POST /api/inventory/audit/create-document
 */
router.post('/audit/create-document', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    // Validar rol de auditor
    if (user?.role !== 'inventory_auditor') {
      return res.status(403).json({ 
        message: 'Solo auditores pueden crear documentos de auditoría' 
      });
    }
    
    const { 
      centerId, 
      samplingType, // 'random', 'manual', 'mixed'
      samplingPercentage,
      requestId 
    } = req.body;
    
    // Validaciones
    if (!centerId || !samplingType) {
      return res.status(400).json({ 
        message: 'centerId y samplingType son requeridos' 
      });
    }
    
    if (samplingType === 'random' && (!samplingPercentage || samplingPercentage <= 0 || samplingPercentage > 100)) {
      return res.status(400).json({ 
        message: 'samplingPercentage debe estar entre 1 y 100' 
      });
    }
    
    // Obtener items aprobados del centro
    const approvedItems = await db.select()
      .from(inventoryCountItems)
      .where(
        and(
          eq(inventoryCountItems.centerId, centerId),
          eq(inventoryCountItems.status, 'approved'),
          requestId ? eq(inventoryCountItems.requestId, requestId) : undefined
        )
      );
    
    if (approvedItems.length === 0) {
      return res.status(400).json({ 
        message: 'No hay items aprobados para auditar en este centro' 
      });
    }
    
    // Generar número de documento
    const year = new Date().getFullYear();
    const prefix = `AUD-${year}-`;
    
    const lastDoc = await db.select()
      .from(inventoryAuditDocuments)
      .where(sql`${inventoryAuditDocuments.documentNumber} LIKE ${prefix + '%'}`)
      .orderBy(desc(inventoryAuditDocuments.createdAt))
      .limit(1);
    
    let nextNumber = 1;
    if (lastDoc.length > 0) {
      const lastNumber = parseInt(lastDoc[0].documentNumber.split('-').pop() || '0');
      nextNumber = lastNumber + 1;
    }
    
    const documentNumber = `${prefix}${nextNumber.toString().padStart(4, '0')}`;
    
    // Crear documento de auditoría
    const [auditDoc] = await db
      .insert(inventoryAuditDocuments)
      .values({
        id: crypto.randomUUID(),
        documentNumber,
        auditorId: userId,
        centerId,
        samplingType,
        samplingPercentage: samplingType === 'random' ? samplingPercentage : null,
        totalItems: approvedItems.length,
        sampledItems: 0, // Se actualizará al seleccionar muestra
        status: 'draft'
      })
      .returning();
    
    // Registrar en historial
    await db.insert(inventoryHistory).values({
         entityType: 'audit_document',
      entityId: auditDoc.id,
      action: 'created',
      description: `Documento de auditoría ${documentNumber} creado`,
      userId
    });
    
    res.status(201).json({
      auditDocument: auditDoc,
      availableItems: approvedItems.length
    });
    
  } catch (error) {
    console.error('Error creating audit document:', error);
    res.status(500).json({ message: 'Error al crear documento de auditoría' });
  }
});

/**
 * 🎲 SELECCIONAR MUESTRA ALEATORIA/MANUAL
 * POST /api/inventory/audit/select-sample
 */
router.post('/audit/select-sample', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (user?.role !== 'inventory_auditor') {
      return res.status(403).json({ 
        message: 'Solo auditores pueden seleccionar muestras' 
      });
    }
    
    const { 
      auditDocumentId, 
      manualItemIds // Array de IDs si es selección manual
    } = req.body;
    
    // Obtener documento de auditoría
    const [auditDoc] = await db.select()
      .from(inventoryAuditDocuments)
      .where(eq(inventoryAuditDocuments.id, auditDocumentId))
      .limit(1);
    
    if (!auditDoc) {
      return res.status(404).json({ message: 'Documento de auditoría no encontrado' });
    }
    
    if (auditDoc.auditorId !== userId) {
      return res.status(403).json({ message: 'No eres el auditor de este documento' });
    }
    
    if (auditDoc.status !== 'draft') {
      return res.status(400).json({ message: 'El documento ya no está en borrador' });
    }
    
    // Obtener items aprobados del centro
    const approvedItems = await db.select()
      .from(inventoryCountItems)
      .where(
        and(
          eq(inventoryCountItems.centerId, auditDoc.centerId),
          eq(inventoryCountItems.status, 'approved')
        )
      );
    
    let selectedItems: any[] = [];
    
    if (auditDoc.samplingType === 'random') {
      // Selección aleatoria
      const sampleSize = Math.ceil((approvedItems.length * auditDoc.samplingPercentage!) / 100);
      
      // Shuffle y tomar muestra
      const shuffled = [...approvedItems].sort(() => Math.random() - 0.5);
      selectedItems = shuffled.slice(0, sampleSize);
      
    } else if (auditDoc.samplingType === 'manual') {
      // Selección manual
      if (!manualItemIds || manualItemIds.length === 0) {
        return res.status(400).json({ 
          message: 'Debe proporcionar manualItemIds para selección manual' 
        });
      }
      
      selectedItems = approvedItems.filter(item => manualItemIds.includes(item.id));
      
    } else if (auditDoc.samplingType === 'mixed') {
      // Selección mixta: 50% aleatorio + 50% manual
      if (!manualItemIds || manualItemIds.length === 0) {
        return res.status(400).json({ 
          message: 'Debe proporcionar manualItemIds para selección mixta' 
        });
      }
      
      const randomSize = Math.ceil(approvedItems.length * 0.25); // 25% aleatorio
      const shuffled = [...approvedItems].sort(() => Math.random() - 0.5);
      const randomItems = shuffled.slice(0, randomSize);
      
      const manualItems = approvedItems.filter(item => manualItemIds.includes(item.id));
      
      selectedItems = [...randomItems, ...manualItems];
      // Remover duplicados
      selectedItems = Array.from(new Map(selectedItems.map(item => [item.id, item])).values());
    }
    
    // Crear registros de muestra
    const sampleRecords: InsertInventoryAuditSample[] = selectedItems.map(item => ({
  auditDocumentId: auditDoc.id,
  countItemId: item.id,
  auditPhysicalCount: null,
  auditDifference: null,
  matchesOriginal: null,      // integer 0/1/null en tu schema
  approved: false,            // ✅ boolean not null
  rejectionReason: null,      // opcional; puede ir null
  auditedBy: userId           // ✅ string requerido por schema
  // NO pongas id ni auditedAt: la BD los completa
}));

if (sampleRecords.length > 0) {
  await db.insert(inventoryAuditSamples).values(sampleRecords);
}
    
    // Actualizar documento con cantidad muestreada
    await db.update(inventoryAuditDocuments)
      .set({
        sampledItems: selectedItems.length,
        status: 'in_progress'
      })
      .where(eq(inventoryAuditDocuments.id, auditDoc.id));
    
    // Registrar en historial
    await db.insert(inventoryHistory).values({
      id: crypto.randomUUID(),
      entityType: 'audit_document',
      entityId: auditDoc.id,
      action: 'sample_selected',
      description: `Muestra de ${selectedItems.length} items seleccionada`,
      userId
    });
    
    res.json({
      message: 'Muestra seleccionada exitosamente',
      sampledCount: selectedItems.length,
      totalItems: approvedItems.length,
      samplingPercentage: ((selectedItems.length / approvedItems.length) * 100).toFixed(2)
    });
    
  } catch (error) {
    console.error('Error selecting sample:', error);
    res.status(500).json({ message: 'Error al seleccionar muestra' });
  }
});

/**
 * 📝 REGISTRAR RESULTADOS DE AUDITORÍA
 * POST /api/inventory/audit/register-results
 */
router.post('/audit/register-results', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (user?.role !== 'inventory_auditor') {
      return res.status(403).json({ 
        message: 'Solo auditores pueden registrar resultados' 
      });
    }
    
    const { 
      sampleId, 
      auditPhysicalCount,
      approved,
      rejectionReason 
    } = req.body;
    
    // Validaciones
    if (!sampleId || auditPhysicalCount === undefined) {
      return res.status(400).json({ 
        message: 'sampleId y auditPhysicalCount son requeridos' 
      });
    }
    
    if (approved === false && !rejectionReason) {
      return res.status(400).json({ 
        message: 'rejectionReason es requerido cuando se rechaza' 
      });
    }
    
    // Obtener muestra
    const [sample] = await db.select()
      .from(inventoryAuditSamples)
      .where(eq(inventoryAuditSamples.id, sampleId))
      .limit(1);
    
    if (!sample) {
      return res.status(404).json({ message: 'Muestra no encontrada' });
    }
    
    // Verificar que el auditor sea el dueño del documento
    const [auditDoc] = await db.select()
      .from(inventoryAuditDocuments)
      .where(eq(inventoryAuditDocuments.id, sample.auditDocumentId))
      .limit(1);
    
    if (auditDoc.auditorId !== userId) {
      return res.status(403).json({ message: 'No eres el auditor de este documento' });
    }
    
    // Obtener item original
    const [originalItem] = await db.select()
      .from(inventoryCountItems)
      .where(eq(inventoryCountItems.id, sample.countItemId))
      .limit(1);
    
    if (!originalItem) {
      return res.status(404).json({ message: 'Item original no encontrado' });
    }
    
    // Calcular diferencia y coincidencia
    const auditDifference = auditPhysicalCount - (originalItem.systemInventory ?? 0);

    const matchesOriginal = auditPhysicalCount === originalItem.physicalCount ? 1 : 0;

    
    // Actualizar muestra
    await db.update(inventoryAuditSamples)
      .set({
        auditPhysicalCount,
        auditDifference,
        matchesOriginal,
        approved,
        rejectionReason: approved === false ? rejectionReason : null,
        auditedAt: new Date(),
        auditedBy: userId
      })
      .where(eq(inventoryAuditSamples.id, sampleId));
    
    // Si se rechaza, marcar item como rejected
    if (approved === false) {
      await db.update(inventoryCountItems)
        .set({
          status: 'rejected',
          auditorComment: rejectionReason,
          updatedAt: new Date()
        })
        .where(eq(inventoryCountItems.id, originalItem.id));
      
      // Registrar en historial
      await db.insert(inventoryHistory).values({
        id: crypto.randomUUID(),
        entityType: 'count_item',
        entityId: originalItem.id,
        action: 'rejected_by_auditor',
        description: `Rechazado en auditoría: ${rejectionReason}`,
        userId
      });
    }
    
    res.json({
      message: 'Resultado de auditoría registrado',
      matchesOriginal,
      auditDifference,
      status: approved ? 'approved' : 'rejected'
    });
    
  } catch (error) {
    console.error('Error registering audit results:', error);
    res.status(500).json({ message: 'Error al registrar resultados de auditoría' });
  }
});

/**
 * ✅ APROBAR/COMPLETAR DOCUMENTO DE AUDITORÍA
 * POST /api/inventory/audit/approve-document
 */
router.post('/audit/approve-document', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (user?.role !== 'inventory_auditor') {
      return res.status(403).json({ 
        message: 'Solo auditores pueden aprobar documentos' 
      });
    }
    
    const { auditDocumentId, approvalResult, resultComments } = req.body;
    
    // Obtener documento
    const [auditDoc] = await db.select()
      .from(inventoryAuditDocuments)
      .where(eq(inventoryAuditDocuments.id, auditDocumentId))
      .limit(1);
    
    if (!auditDoc) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }
    
    if (auditDoc.auditorId !== userId) {
      return res.status(403).json({ message: 'No eres el auditor de este documento' });
    }
    
    // Verificar que todas las muestras tengan resultados
    const samples = await db.select()
      .from(inventoryAuditSamples)
      .where(eq(inventoryAuditSamples.auditDocumentId, auditDocumentId));
    
    const pendingSamples = samples.filter(s => s.approved === null);
    if (pendingSamples.length > 0) {
      return res.status(400).json({ 
        message: `Hay ${pendingSamples.length} muestras sin resultado` 
      });
    }
    
    // Actualizar documento
    await db.update(inventoryAuditDocuments)
      .set({
        status: 'completed',
        completedAt: new Date(),
        approvedBy: userId,
        approvalResult: approvalResult || 'approved',
        resultComments
      })
      .where(eq(inventoryAuditDocuments.id, auditDocumentId));
    
    // Marcar items NO muestreados como 'audited' automáticamente
    const allApprovedItems = await db.select()
      .from(inventoryCountItems)
      .where(
        and(
          eq(inventoryCountItems.centerId, auditDoc.centerId),
          eq(inventoryCountItems.status, 'approved')
        )
      );
    
    const sampledItemIds = samples.map(s => s.countItemId);
    const nonSampledItems = allApprovedItems.filter(item => !sampledItemIds.includes(item.id));
    
    if (nonSampledItems.length > 0) {
      await db.update(inventoryCountItems)
        .set({
          status: 'audited',
          auditedAt: new Date(),
          auditedBy: userId,
          updatedAt: new Date()
        })
        .where(
          inArray(
            inventoryCountItems.id, 
            nonSampledItems.map(item => item.id)
          )
        );
    }
    
    // Marcar muestras aprobadas como 'audited'
    const approvedSamples = samples.filter(s => s.approved === true);
    if (approvedSamples.length > 0) {
      await db.update(inventoryCountItems)
        .set({
          status: 'audited',
          auditedAt: new Date(),
          auditedBy: userId,
          updatedAt: new Date()
        })
        .where(
          inArray(
            inventoryCountItems.id, 
            approvedSamples.map(s => s.countItemId)
          )
        );
    }
    
    // Registrar en historial
    await db.insert(inventoryHistory).values({
      id: crypto.randomUUID(),
      entityType: 'audit_document',
      entityId: auditDocumentId,
      action: 'completed',
      description: `Documento ${auditDoc.documentNumber} completado - ${samples.length} muestras auditadas`,
      userId
    });
    
    res.json({
      message: 'Documento de auditoría completado',
      documentNumber: auditDoc.documentNumber,
      sampledItems: samples.length,
      approvedSamples: approvedSamples.length,
      rejectedSamples: samples.length - approvedSamples.length,
      autoAuditedItems: nonSampledItems.length
    });
    
  } catch (error) {
    console.error('Error approving audit document:', error);
    res.status(500).json({ message: 'Error al aprobar documento' });
  }
});

/**
 * 📊 POOL DE TRABAJO DEL AUDITOR
 * GET /api/inventory/auditor/work-pool
 */

router.get('/auditor/work-pool', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);

    if (user?.role !== 'inventory_auditor') {
      return res.status(403).json({ message: 'Solo auditores pueden acceder a este pool' });
    }

    const { centerId } = req.query;

    // Construye condiciones de forma segura
    const conditions = [eq(inventoryCountItems.status, 'approved')];
    if (centerId) {
      conditions.push(eq(inventoryCountItems.centerId, String(centerId)));
    }

    const items = await db.select({
      item: inventoryCountItems,
      centerName: centers.name,                       // alias legible
      requestNumber: inventoryRequests.requestNumber, // alias legible
    })
      .from(inventoryCountItems)
      .leftJoin(centers, eq(centers.id, inventoryCountItems.centerId))
      .leftJoin(inventoryRequests, eq(inventoryRequests.id, inventoryCountItems.requestId))
      .where(and(...conditions))
      .orderBy(inventoryCountItems.centerId, inventoryCountItems.divisionCode);

    // Documentos del auditor
    const myDocuments = await db.select()
      .from(inventoryAuditDocuments)
      .where(eq(inventoryAuditDocuments.auditorId, userId))
      .orderBy(desc(inventoryAuditDocuments.createdAt));

    res.json({
      availableItems: items,
      myDocuments,
      summary: {
        totalApproved: items.length,
        documentsInProgress: myDocuments.filter(d => d.status === 'in_progress').length,
        documentsCompleted: myDocuments.filter(d => d.status === 'completed').length,
      },
    });
  } catch (error) {
    console.error('Error fetching auditor work pool:', error);
    res.status(500).json({ message: 'Error al obtener pool de auditoría' });
  }
});
// ============================================================================
// SECCIÓN: COORDINACIÓN
// ============================================================================

/**
 * 📊 POOL DE TRABAJO DEL COORDINADOR
 * GET /api/inventory/coordinator/work-pool
 */
router.get('/coordinator/work-pool', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (user?.role !== 'inventory_coordinator') {
      return res.status(403).json({ 
        message: 'Solo coordinadores pueden acceder a este pool' 
      });
    }
    
    // Obtener items auditados listos para consolidar
    const auditedItems = await db.select({
      item: inventoryCountItems,
      center: sql`c.name`.as('centerName'),
      request: sql`r.request_number`.as('requestNumber')
    })
      .from(inventoryCountItems)
      .leftJoin(sql`centers c`, sql`c.id = ${inventoryCountItems.centerId}`)
      .leftJoin(sql`inventory_requests r`, sql`r.id = ${inventoryCountItems.requestId}`)
      .where(eq(inventoryCountItems.status, 'audited'))
      .orderBy(
        inventoryCountItems.divisionCode,
        inventoryCountItems.centerId
      );
    
    // Calcular impacto total por división
    const impactByDivision = auditedItems.reduce((acc, item) => {
      const division = item.item.divisionCode || 'SIN_DIVISION';
      if (!acc[division]) {
        acc[division] = {
          division,
          itemCount: 0,
          totalImpact: 0,
          positiveAdjustments: 0,
          negativeAdjustments: 0
        };
      }
      acc[division].itemCount++;
      acc[division].totalImpact += item.item.costImpact || 0;
      
      if ((item.item.costImpact || 0) > 0) {
        acc[division].positiveAdjustments++;
      } else if ((item.item.costImpact || 0) < 0) {
        acc[division].negativeAdjustments++;
      }
      
      return acc;
    }, {} as any);
    
    res.json({
      auditedItems,
      impactByDivision: Object.values(impactByDivision),
      summary: {
        totalItems: auditedItems.length,
        totalImpact: auditedItems.reduce((sum, item) => sum + (item.item.costImpact || 0), 0),
        divisions: Object.keys(impactByDivision).length
      }
    });
    
  } catch (error) {
    console.error('Error fetching coordinator work pool:', error);
    res.status(500).json({ message: 'Error al obtener pool de coordinación' });
  }
});

/**
 * ✅ APROBAR ITEMS CONSOLIDADOS
 * POST /api/inventory/coordinator/approve
 */
router.post('/coordinator/approve', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (user?.role !== 'inventory_coordinator') {
      return res.status(403).json({ 
        message: 'Solo coordinadores pueden aprobar consolidados' 
      });
    }
    
    const { itemIds, coordinatorComment } = req.body;
    
    if (!itemIds || itemIds.length === 0) {
      return res.status(400).json({ message: 'Debe proporcionar itemIds' });
    }
    
    // Actualizar items a estado 'sent_for_approval'
    await db.update(inventoryCountItems)
      .set({
        status: 'sent_for_approval',
        coordinatorComment,
        updatedAt: new Date()
      })
      .where(
        and(
          inArray(inventoryCountItems.id, itemIds),
          eq(inventoryCountItems.status, 'audited')
        )
      );
    
    // Registrar en historial
    await db.insert(inventoryHistory).values({
      id: crypto.randomUUID(),
      entityType: 'count_items',
      entityId: 'batch',
      action: 'sent_for_approval',
      description: `${itemIds.length} items enviados para aprobación de ajuste`,
      userId
    });
    
    res.json({
      message: 'Items aprobados y enviados para autorización de ajuste',
      approvedCount: itemIds.length
    });
    
  } catch (error) {
    console.error('Error approving consolidated items:', error);
    res.status(500).json({ message: 'Error al aprobar items' });
  }
});

// ============================================================================
// SECCIÓN: APROBACIÓN Y EJECUCIÓN DE AJUSTES
// ============================================================================

/**
 * 📤 ENVIAR PARA APROBACIÓN DE AJUSTE
 * POST /api/inventory/adjustment/send-for-approval
 */
router.post('/adjustment/send-for-approval', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (user?.role !== 'inventory_coordinator') {
      return res.status(403).json({ 
        message: 'Solo coordinadores pueden enviar para aprobación' 
      });
    }
    
    const { requestId, divisionCodes } = req.body;
    
    if (!requestId || !divisionCodes || divisionCodes.length === 0) {
      return res.status(400).json({ 
        message: 'requestId y divisionCodes son requeridos' 
      });
    }
    
    // Para cada división, buscar aprobadores configurados
    for (const divisionCode of divisionCodes) {
      // Aquí deberías tener una configuración de aprobadores por división
      // Por ahora, usaremos una configuración de ejemplo
      
      const [approval] = await db
        .insert(inventoryAdjustmentApprovals)
        .values({
          id: crypto.randomUUID(),
          requestId,
          divisionCode,
          approvers: [], // TODO: Obtener de configuración
          approvalStatus: 'pending'
        })
        .returning();
      
      // TODO: Enviar notificaciones por email a aprobadores
      
      // Registrar en historial
      await db.insert(inventoryHistory).values({
        id: crypto.randomUUID(),
        entityType: 'adjustment_approval',
        entityId: approval.id,
        action: 'sent_for_approval',
        description: `Ajuste de división ${divisionCode} enviado para aprobación`,
        userId
      });
    }
    
    res.json({
      message: 'Ajustes enviados para aprobación',
      divisionsCount: divisionCodes.length
    });
    
  } catch (error) {
    console.error('Error sending for approval:', error);
    res.status(500).json({ message: 'Error al enviar para aprobación' });
  }
});

/**
 * ✅ APROBAR/RECHAZAR AJUSTE
 * POST /api/inventory/adjustment/approve
 */
router.post('/adjustment/approve', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (user?.role !== 'adjustment_approver') {
      return res.status(403).json({ 
        message: 'Solo aprobadores pueden autorizar ajustes' 
      });
    }
    
    const { approvalId, approved, rejectionReason } = req.body;
    
    if (approved === undefined) {
      return res.status(400).json({ message: 'approved es requerido' });
    }
    
    if (!approved && !rejectionReason) {
      return res.status(400).json({ 
        message: 'rejectionReason es requerido al rechazar' 
      });
    }
    
    // Obtener aprobación
    const [approval] = await db.select()
      .from(inventoryAdjustmentApprovals)
      .where(eq(inventoryAdjustmentApprovals.id, approvalId))
      .limit(1);
    
    if (!approval) {
      return res.status(404).json({ message: 'Aprobación no encontrada' });
    }
    
    // Verificar que el usuario sea un aprobador válido
    // TODO: Verificar que userId esté en approval.approvers
    
    // Actualizar estado de aprobación
    await db.update(inventoryAdjustmentApprovals)
      .set({
        approvalStatus: approved ? 'approved' : 'rejected',
        approvedBy: userId,
        approvedAt: new Date(),
        rejectionReason: approved ? null : rejectionReason
      })
      .where(eq(inventoryAdjustmentApprovals.id, approvalId));
    
    if (approved) {
      // Marcar items como 'adjustment_approved'
      await db.update(inventoryCountItems)
        .set({
          status: 'adjustment_approved',
          updatedAt: new Date()
        })
        .where(
          and(
            eq(inventoryCountItems.requestId, approval.requestId),
            eq(inventoryCountItems.divisionCode, approval.divisionCode),
            eq(inventoryCountItems.status, 'sent_for_approval')
          )
        );
    } else {
      // Devolver a audited
      await db.update(inventoryCountItems)
        .set({
          status: 'audited',
          coordinatorComment: `Ajuste rechazado: ${rejectionReason}`,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(inventoryCountItems.requestId, approval.requestId),
            eq(inventoryCountItems.divisionCode, approval.divisionCode),
            eq(inventoryCountItems.status, 'sent_for_approval')
          )
        );
    }
    
    // Registrar en historial
    await db.insert(inventoryHistory).values({
      id: crypto.randomUUID(),
      entityType: 'adjustment_approval',
      entityId: approvalId,
      action: approved ? 'approved' : 'rejected',
      description: approved 
        ? `Ajuste aprobado por ${user?.firstName} ${user?.lastName}`
        : `Ajuste rechazado: ${rejectionReason}`,
      userId
    });
    
    res.json({
      message: approved ? 'Ajuste aprobado' : 'Ajuste rechazado',
      status: approved ? 'adjustment_approved' : 'rejected'
    });
    
  } catch (error) {
    console.error('Error approving adjustment:', error);
    res.status(500).json({ message: 'Error al aprobar ajuste' });
  }
});

/**
 * ⚡ EJECUTAR AJUSTE FINAL
 * POST /api/inventory/adjustment/execute
 */
router.post('/adjustment/execute', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (user?.role !== 'inventory_coordinator') {
      return res.status(403).json({ 
        message: 'Solo coordinadores pueden ejecutar ajustes' 
      });
    }
    
    const { requestId, divisionCode } = req.body;
    
    if (!requestId) {
      return res.status(400).json({ message: 'requestId es requerido' });
    }
    
    // Construir filtros
    let whereConditions = [
      eq(inventoryCountItems.requestId, requestId),
      eq(inventoryCountItems.status, 'adjustment_approved')
    ];
    
    if (divisionCode) {
      whereConditions.push(eq(inventoryCountItems.divisionCode, divisionCode));
    }
    
    // Obtener items aprobados para ajuste
    const itemsToAdjust = await db.select()
      .from(inventoryCountItems)
      .where(and(...whereConditions));
    
    if (itemsToAdjust.length === 0) {
      return res.status(400).json({ 
        message: 'No hay items aprobados para ajustar' 
      });
    }
    
    // Marcar como ajustados
    await db.update(inventoryCountItems)
      .set({
        status: 'adjusted',
        adjustedAt: new Date(),
        adjustedBy: userId,
        updatedAt: new Date()
      })
      .where(and(...whereConditions));
    
    // TODO: Aquí integrar con ERP/Navision para crear documento de ajuste
    // - Generar documento de ajuste en formato requerido
    // - Enviar a sistema contable
    // - Actualizar inventario en SQL Server
    
    // Calcular impacto total
    const totalImpact = itemsToAdjust.reduce((sum, item) => sum + (item.costImpact || 0), 0);
    const positiveItems = itemsToAdjust.filter(item => (item.difference || 0) > 0).length;
    const negativeItems = itemsToAdjust.filter(item => (item.difference || 0) < 0).length;
    
    // Registrar en historial
    await db.insert(inventoryHistory).values({
      id: crypto.randomUUID(),
      entityType: 'count_items',
      entityId: requestId,
      action: 'adjusted',
      description: `Ajuste ejecutado: ${itemsToAdjust.length} items, impacto: $${totalImpact.toFixed(2)}`,
      userId,
      newValue: {
        itemsCount: itemsToAdjust.length,
        totalImpact,
        positiveItems,
        negativeItems
      }
    });
    
    res.json({
      message: 'Ajuste ejecutado exitosamente',
      itemsAdjusted: itemsToAdjust.length,
      totalImpact,
      summary: {
        positiveAdjustments: positiveItems,
        negativeAdjustments: negativeItems
      }
    });
    
  } catch (error) {
    console.error('Error executing adjustment:', error);
    res.status(500).json({ message: 'Error al ejecutar ajuste' });
  }
});

// ============================================================================
// EXPORTAR ROUTER
// ============================================================================

export default router;