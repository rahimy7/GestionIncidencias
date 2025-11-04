import { executeQuery } from '../sqlServerConnection';
import { db } from '../db';
import { inventoryRequests, inventoryCountItems, inventoryHistory } from '../../shared/schema';

export class InventoryService {
  
  /**
   * Obtener productos maestros
   */
  async getProductsMaster(filters: {
  divisions?: string[];
  categories?: string[];
  groups?: string[];
  specificCodes?: string[];
}): Promise<{ code: string; description: string; [key: string]: any }[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (filters.divisions?.length) {
      const placeholders = filters.divisions.map((_, i) => `@param${params.length + i}`).join(',');
      conditions.push(`[Division Code] IN (${placeholders})`);
      params.push(...filters.divisions);
    }
    
    if (filters.categories?.length) {
      const offset = params.length;
      const placeholders = filters.categories.map((_, i) => `@param${offset + i}`).join(',');
      conditions.push(`[Item Category Code] IN (${placeholders})`);
      params.push(...filters.categories);
    }
    
    if (filters.groups?.length) {
      const offset = params.length;
      const placeholders = filters.groups.map((_, i) => `@param${offset + i}`).join(',');
      conditions.push(`[Product Group Code] IN (${placeholders})`);
      params.push(...filters.groups);
    }
    
    if (filters.specificCodes?.length) {
      const offset = params.length;
      const placeholders = filters.specificCodes.map((_, i) => `@param${offset + i}`).join(',');
      conditions.push(`[No_] IN (${placeholders})`);
      params.push(...filters.specificCodes);
    }
    
    const whereClause = conditions.length ? conditions.join(' AND ') : '1=1';
    
    const query = `
      SELECT TOP (1000)
        [No_] AS code,
        [Description] AS description,
        [Description 2] AS description2,
        [Division Code] AS divisionCode,
        [Division] AS divisionName,
        [Item Category Code] AS categoryCode,
        [Categoria] AS categoryName,
        [Product Group Code] AS groupCode,
        [Grupo] AS groupName,
        [Codigo Subgrupo] AS subgroupCode,
        [SubGrupo] AS subgroupName,
        [MarcaCodigo] AS brandCode,
        [Marca] AS brandName
      FROM [INNOVACENTRO].[dbo].[View_ProductosLI]
      WHERE ${whereClause}
      ORDER BY [No_]
    `;
    
    return executeQuery(query, params);
  }
  
/**
 * Obtener inventario de un centro
 */
async getInventoryByCenter(
  centerCode: string,
  productCodes: string[]
): Promise<{
  itemCode: string;
  description: string;
  description2?: string;
  divisionCode: string;
  categoryCode: string;
  groupCode: string;
  systemInventory: number;
  unitMeasure: string;
  unitCost: number;
}[]> {
  if (!productCodes.length) return [];

  const params = [centerCode, ...productCodes];
  const placeholders = productCodes.map((_, i) => `@param${i + 1}`).join(',');

  const query = `
    SELECT 
      [ItemNo] AS itemCode,
      [ItemDescription] AS description,
      [ItemDescription2] AS description2,
      [DivisionCode] AS divisionCode,
      [ItemCategoryCode] AS categoryCode,
      [ProductGroupCode] AS groupCode,
      [UnitMeasureCode] AS unitMeasure,
      [Inventory] AS systemInventory,
      [ItemUnitCost] AS unitCost,
      [LocationCode] AS locationCode
    FROM [INNOVACENTRO].[dbo].[View_ProductosAlmacen_Inventario]
    WHERE [LocationCode] = @param0
      AND [ItemNo] IN (${placeholders})
  `;

  return executeQuery(query, params);
}

  /**
   * Crear solicitud de inventario
   */
  async createInventoryRequest(data: {
    createdBy: string;
    requestType: string;
    centers: string[];
    filterDivisions?: string[];
    filterCategories?: string[];
    filterGroups?: string[];
    filterSpecificCodes?: string[];
    comments?: string;
    attachmentFiles?: string[];
  }) {
    // 1. Obtener productos
    const products = await this.getProductsMaster({
      divisions: data.filterDivisions,
      categories: data.filterCategories,
      groups: data.filterGroups,
      specificCodes: data.filterSpecificCodes
    });
    
    if (!products.length) {
      throw new Error('No se encontraron productos con los filtros especificados');
    }
    
    // 2. Generar número
    const requestNumber = await this.generateRequestNumber();
    
    // 3. Crear solicitud
   const [request] = await db
  .insert(inventoryRequests)
  .values({
    // id: crypto.randomUUID(), ❌ REMOVER - autogenerado por la BD
    requestNumber,
    requestType: data.requestType as "manual" | "automatic" | "division" | "category" | "group", // ✅ Cast al tipo del enum
    status: 'draft',
    createdBy: data.createdBy,
    centers: data.centers,
    filterDivisions: data.filterDivisions || null,
    filterCategories: data.filterCategories || null,
    filterGroups: data.filterGroups || null,
    filterSpecificCodes: data.filterSpecificCodes || null,
    comments: data.comments || null,
    attachmentFiles: data.attachmentFiles || null
  })
  .returning();
    
    // 4. Crear items de conteo por cada centro
 // 4. Crear items de conteo por cada centro
for (const centerId of data.centers) {
  // 1️⃣ Buscar centro por ID
  const center = await db.query.centers.findFirst({
    where: (centers, { eq }) => eq(centers.id, centerId),
    columns: {
      id: true,
      name: true,
      code: true,
    },
  });

  if (!center) {
    console.warn(`⚠️ Centro no encontrado en BD: ${centerId}`);
    continue;
  }

  // 2️⃣ Normalizar código para SQL Server (quita prefijo "T" si lo tiene)
  const locationCode = center.code?.startsWith("T")
    ? center.code.substring(1)
    : center.code;

  if (!locationCode) {
    console.warn(`⚠️ Centro ${center.name} no tiene código válido`);
    continue;
  }

  console.log(`📦 Procesando centro ${center.name} (LocationCode=${locationCode})`);

  // 3️⃣ Obtener inventario desde SQL Server
  const centerInventory = await this.getInventoryByCenter(
    locationCode,
    products.map((p) => p.code)
  );

  if (!centerInventory.length) {
    console.warn(`⚠️ No se encontraron productos para el centro ${center.name} (${locationCode})`);
    continue;
  }

  // 4️⃣ Preparar items de conteo
  const countItems = centerInventory.map((inv) => ({
    requestId: request.id,
    centerId: center.id,
    itemCode: inv.itemCode,
    itemDescription: inv.description,
    itemDescription2: inv.description2,
    divisionCode: inv.divisionCode,
    categoryCode: inv.categoryCode,
    groupCode: inv.groupCode,
    systemInventory: inv.systemInventory,
    unitMeasureCode: inv.unitMeasure,
    unitCost: inv.unitCost,
    status: "pending" as const,
  }));

  // 5️⃣ Insertar en PostgreSQL
  await db.insert(inventoryCountItems).values(countItems);

  console.log(`✅ ${countItems.length} items insertados para ${center.name}`);

    }
    
    return request;
  }
  
  /**
   * Generar número correlativo
   */
  private async generateRequestNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    
    const lastRequest = await db.query.inventoryRequests.findFirst({
      where: (requests, { like }) => like(requests.requestNumber, `${prefix}%`),
      orderBy: (requests, { desc }) => [desc(requests.createdAt)]
    });
    
    let nextNumber = 1;
    if (lastRequest) {
      const lastNumber = parseInt(lastRequest.requestNumber.split('-').pop() || '0');
      nextNumber = lastNumber + 1;
    }
    
    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

    /**
   * Registrar evento en historial de inventario
   */
  async addHistory(entry: {
    entityType: 'request' | 'count_item' | 'count_items' | string;
    entityId: string;
    action: string;
    description: string;
    userId: string;
  }) {
    try {
      await db.insert(inventoryHistory).values({
        id: crypto.randomUUID(),
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        description: entry.description,
        userId: entry.userId,
        createdAt: new Date(),
      });

      console.log(`🕘 Historial registrado: ${entry.action} (${entry.entityType}:${entry.entityId})`);
    } catch (error) {
      console.error('⚠️ Error al registrar historial:', error);
    }
  }

}

export const inventoryService = new InventoryService();