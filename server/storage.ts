import {
  users,
  centers,
  incidentTypes,
  incidents,
  incidentParticipants,
  actionPlans,
  incidentHistory,
  type User,
   type UserWithCenter,
  type UpsertUser,
  type Center,
  type InsertCenter,
  type IncidentType,
  type InsertIncidentType,
  type Incident,
  type InsertIncident,
  type IncidentWithDetails,
  type InsertIncidentParticipant,
  type IncidentParticipant,
  type InsertActionPlan,
  type ActionPlan,
  type InsertIncidentHistory,
  type IncidentHistory,
  CreateUser,
  departments,
  CreateDepartment,
  Department,
  UpdateDepartment,
  UpdateCenter,
  DepartmentWithHead,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, count, sql, avg, isNotNull } from "drizzle-orm";
import {  asc, gte, lte } from 'drizzle-orm';
import { alias } from "drizzle-orm/pg-core";
//import { alias } from "drizzle-orm/mysql-core";
const reporterUser = alias(users, 'reporterUser');
const assigneeUser = alias(users, 'assigneeUser');

type UserBasic = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<UserWithCenter | undefined>; // CAMBIAR AQUÍ
  upsertUser(user: UpsertUser): Promise<User>;
  getUsers(): Promise<UserWithCenter[]>; 

  // Centers operations
  getCenters(): Promise<Center[]>;
  createCenter(center: InsertCenter): Promise<Center>;

  // Incident Types operations
  getIncidentTypes(): Promise<IncidentType[]>;
  createIncidentType(type: InsertIncidentType): Promise<IncidentType>;

  // Incidents operations
 getIncidents(filters?: {
  status?: string;
  priority?: string;
  centerId?: string;
  assigneeId?: string;
  reporterId?: string;
}): Promise<IncidentWithDetails[]>;
  getIncidentById(id: string): Promise<IncidentWithDetails | undefined>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  updateIncident(id: string, updates: Partial<InsertIncident>): Promise<Incident>;
  getIncidentsByAssignee(userId: string): Promise<(Incident & { center?: Center; reporter?: User })[]>;
  
  // Action Plans operations
  getActionPlansByIncident(incidentId: string): Promise<(ActionPlan & { assignee: User })[]>;
  createActionPlan(actionPlan: InsertActionPlan): Promise<ActionPlan>;
  updateActionPlan(id: string, updates: Partial<InsertActionPlan>): Promise<ActionPlan>;

  // Participants operations
  addIncidentParticipant(participant: InsertIncidentParticipant): Promise<IncidentParticipant>;
  removeIncidentParticipant(incidentId: string, userId: string): Promise<void>;

  // History operations
  addIncidentHistory(history: InsertIncidentHistory): Promise<IncidentHistory>;

  // Dashboard statistics
  getDashboardStats(userId?: string): Promise<{
    totalIncidents: number;
    inProgress: number;
    completed: number;
    avgResolutionTime: number;
  }>;

  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: CreateUser): Promise<User>;
   getCenters(): Promise<Center[]>;
  createCenter(center: InsertCenter): Promise<Center>;
  getCenterByCode(code: string): Promise<Center | undefined>;
  
  // Users operations  
  getUsers(): Promise<User[]>;

  // Test users for development
  getTestUsers(): Promise<User[]>;

  getUsers(): Promise<User[]>;
getCenterByCode(code: string): Promise<Center | undefined>;
getTestUsers(): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)


  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Centers operations
  async getCenters(): Promise<Center[]> {
    return await db.select().from(centers).orderBy(centers.name);
  }

  async createCenter(center: InsertCenter): Promise<Center> {
    const [newCenter] = await db.insert(centers).values(center).returning();
    return newCenter;
  }

  // Incident Types operations
  async getIncidentTypes(): Promise<IncidentType[]> {
    return await db.select().from(incidentTypes).orderBy(incidentTypes.name);
  }

  async createIncidentType(type: InsertIncidentType): Promise<IncidentType> {
    const [newType] = await db.insert(incidentTypes).values(type).returning();
    return newType;
  }

  // Incidents operations


  async getIncidentsByAssignee(userId: string): Promise<(Incident & { center?: Center; reporter?: User })[]> {
  const result = await db
    .select()
    .from(incidents)
    .leftJoin(centers, eq(incidents.centerId, centers.id))
    .leftJoin(users, eq(incidents.reporterId, users.id))
    .where(eq(incidents.assigneeId, userId))
    .orderBy(desc(incidents.createdAt));

  return result.map(row => ({
    ...row.incidents,
    center: row.centers || undefined,
    reporter: row.users || undefined
  }));
}

  async getIncidentById(id: string): Promise<IncidentWithDetails | undefined> {
  const result = await db
    .select()
    .from(incidents)
    .leftJoin(centers, eq(incidents.centerId, centers.id))
    .leftJoin(incidentTypes, eq(incidents.typeId, incidentTypes.id))
    .leftJoin(reporterUser, eq(incidents.reporterId, reporterUser.id))
    .leftJoin(assigneeUser, eq(incidents.assigneeId, assigneeUser.id))
    .where(eq(incidents.id, id));

  if (!result[0]) return undefined;

  const incident = result[0];

  // Get participants
  const participantsResult = await db
    .select()
    .from(incidentParticipants)
    .leftJoin(users, eq(incidentParticipants.userId, users.id))
    .where(eq(incidentParticipants.incidentId, id));

  // Get action plans  
  const actionPlansResult = await db
    .select()
    .from(actionPlans)
    .leftJoin(users, eq(actionPlans.assigneeId, users.id))
    .where(eq(actionPlans.incidentId, id));

  // Get history
  const historyResult = await db
    .select()
    .from(incidentHistory)
    .leftJoin(users, eq(incidentHistory.userId, users.id))
    .where(eq(incidentHistory.incidentId, id))
    .orderBy(desc(incidentHistory.createdAt));

  return {
    ...incident.incidents,
    reporter: incident.reporterUser!,
    assignee: incident.assigneeUser || undefined,
    center: incident.centers!,
    type: incident.incident_types!,
    participants: participantsResult.map(p => ({
      ...p.incident_participants,
      user: p.users!
    })),
    actionPlans: actionPlansResult.map(a => ({
      ...a.action_plans,
      assignee: a.users!
    })),
    history: historyResult.map(h => ({
      ...h.incident_history,
      user: h.users || undefined
    }))
  } as IncidentWithDetails;
}

  async createIncident(incident: InsertIncident): Promise<Incident> {
    // Generate incident number
    const year = new Date().getFullYear();
    const countResult = await db
      .select({ count: count() })
      .from(incidents)
      .where(sql`EXTRACT(YEAR FROM created_at) = ${year}`);
    
    const incidentNumber = `INC-${year}-${String(countResult[0].count + 1).padStart(3, '0')}`;

    const [newIncident] = await db
      .insert(incidents)
      .values({
        ...incident,
        incidentNumber,
      } as any)
      .returning();

    // Add to history
    await this.addIncidentHistory({
      incidentId: newIncident.id,
      userId: incident.reporterId,
      action: "created",
      description: "Incidencia reportada",
    });

    return newIncident;
  }

  async updateIncident(id: string, updates: Partial<InsertIncident>): Promise<Incident> {
    const [updatedIncident] = await db
      .update(incidents)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(incidents.id, id))
      .returning();

    return updatedIncident;
  }

  // Action Plans operations
  async getActionPlansByIncident(incidentId: string): Promise<(ActionPlan & { assignee: User })[]> {
    const result = await db
      .select()
      .from(actionPlans)
      .leftJoin(users, eq(actionPlans.assigneeId, users.id))
      .where(eq(actionPlans.incidentId, incidentId))
      .orderBy(actionPlans.createdAt);

    return result.map(row => ({
      ...row.action_plans,
      assignee: row.users!
    }));
  }

 async createActionPlan(actionPlan: InsertActionPlan): Promise<ActionPlan> {
  const [newActionPlan] = await db
    .insert(actionPlans)
    .values({
      ...actionPlan,
    
    })
    .returning();

    // Add to incident history
    await this.addIncidentHistory({
      incidentId: actionPlan.incidentId,
      userId: actionPlan.assigneeId,
      action: "action_plan_created",
      description: `Plan de acción creado: ${actionPlan.title}`,
    });

    return newActionPlan;
  }

  async updateActionPlan(id: string, updates: Partial<InsertActionPlan>): Promise<ActionPlan> {
    const [updatedActionPlan] = await db
      .update(actionPlans)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(actionPlans.id, id))
      .returning();

    return updatedActionPlan;
  }

  // Participants operations
  async addIncidentParticipant(participant: InsertIncidentParticipant): Promise<IncidentParticipant> {
    const [newParticipant] = await db
      .insert(incidentParticipants)
      .values(participant)
      .returning();

    return newParticipant;
  }

  async removeIncidentParticipant(incidentId: string, userId: string): Promise<void> {
    await db
      .delete(incidentParticipants)
      .where(
        and(
          eq(incidentParticipants.incidentId, incidentId),
          eq(incidentParticipants.userId, userId)
        )
      );
  }

async getIncidentParticipants(incidentId: string): Promise<(IncidentParticipant & { user: User })[]> {
  const result = await db
    .select({
      id: incidentParticipants.id,
      incidentId: incidentParticipants.incidentId,
      userId: incidentParticipants.userId,
      role: incidentParticipants.role,
      createdAt: incidentParticipants.createdAt,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        centerId: users.centerId,
        departmentId: users.departmentId,
      }
    })
    .from(incidentParticipants)
    .leftJoin(users, eq(incidentParticipants.userId, users.id))
    .where(eq(incidentParticipants.incidentId, incidentId))
    .orderBy(incidentParticipants.createdAt);

  return result.map(row => ({
    ...row,
    user: row.user as User
  }));
}
  // Dashboard statistics

  
async removeManagerFromCenters(managerId: string): Promise<void> {
  try {
    await db
      .update(centers)
      .set({ managerId: null })
      .where(eq(centers.managerId, managerId));
  } catch (error) {
    console.error('Error removing manager from centers:', error);
    throw error;
  }
}

async removeUserReferences(userId: string): Promise<void> {
  try {
    // Desasignar como manager de centros
    await db
      .update(centers)
      .set({ managerId: null })
      .where(eq(centers.managerId, userId));

    // Desasignar como head de departamentos
    await db
      .update(departments)
      .set({ headUserId: null })
      .where(eq(departments.headUserId, userId));

    // Eliminar de participaciones en incidentes
    await db
      .delete(incidentParticipants)
      .where(eq(incidentParticipants.userId, userId));

    // Limpiar historial de incidentes
    await db
      .update(incidentHistory)
      .set({ userId: null })
      .where(eq(incidentHistory.userId, userId));

    // Remover asignaciones en incidentes (assigneeId, supervisorId)
    await db
      .update(incidents)
      .set({ 
        assigneeId: null,
        supervisorId: null 
      })
      .where(or(
        eq(incidents.assigneeId, userId),
        eq(incidents.supervisorId, userId)
      ));

    // Eliminar action plans asignados al usuario (en lugar de nullificar)
    await db
      .delete(actionPlans)
      .where(eq(actionPlans.assigneeId, userId));
    
  } catch (error) {
    console.error('Error removing user references:', error);
    throw error;
  }
}
// server/storage.ts - Optimizar consultas del dashboard

async getDashboardStats(userId?: string) {
  // Una sola consulta con agregaciones múltiples
  const statsQuery = await db
    .select({
      total: count(),
      inProgress: count(sql`CASE WHEN status = 'in_progress' THEN 1 END`),
      completed: count(sql`CASE WHEN status = 'completed' THEN 1 END`),
      avgDays: avg(sql`CASE WHEN status = 'completed' AND actual_resolution_date IS NOT NULL 
        THEN EXTRACT(day FROM actual_resolution_date - created_at) END`)
    })
    .from(incidents)
    .where(
      userId ? or(
        eq(incidents.reporterId, userId),
        eq(incidents.assigneeId, userId),
        eq(incidents.supervisorId, userId)
      ) : sql`true`
    );

  const stats = statsQuery[0];
  return {
    totalIncidents: stats.total,
    inProgress: stats.inProgress,
    completed: stats.completed,
    avgResolutionTime: Math.round((Number(stats.avgDays) || 0) * 10) / 10
  };
}



  // New methods for role-based dashboards


  async getIncidentsByReporter(userId: string): Promise<(Incident & { center?: Center })[]> {
    const result = await db
      .select()
      .from(incidents)
      .leftJoin(centers, eq(incidents.centerId, centers.id))
      .where(eq(incidents.reporterId, userId))
      .orderBy(desc(incidents.createdAt));

    return result.map(row => ({
      ...row.incidents,
      center: row.centers || undefined
    }));
  }

async getIncidentsByCenter(centerId: string, userId?: string, limit: number = 100, offset: number = 0): Promise<IncidentWithDetails[]> {
  try {
    // Usar el método existente getIncidentsWithAdvancedFilters que ya funciona correctamente
    const filters = { centerId: centerId };
    return await this.getIncidentsWithAdvancedFilters(filters, limit, offset);
  } catch (error) {
    console.error('Error getting incidents by center:', error);
    throw error;
  }
}

async isManagerOfCenter(userId: string, centerId: string): Promise<boolean> {
  try {
    const [user] = await db
      .select({ role: users.role, centerId: users.centerId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    return user?.role === 'manager' && user?.centerId === centerId;
    
  } catch (error) {
    console.error('Error checking manager access:', error);
    return false;
  }
}

// server/storage.ts - Método mejorado getCenterByManager
// server/storage.ts - Método getCenterByManager simplificado y correcto

async getCenterByManager(userId: string): Promise<Center | undefined> {
  try {
    console.log(`🔍 [DEBUG] getCenterByManager called with userId: ${userId}`);
    
    // ESTRATEGIA ÚNICA: Buscar centro del usuario usando users.centerId
    // Esto permite que gerentes y subgerentes vean el mismo centro
    const [user] = await db
      .select({ centerId: users.centerId })
      .from(users)
      .where(eq(users.id, userId));
    
    console.log(`👤 [DEBUG] User query result:`, user);
    
    if (!user?.centerId) {
      console.log(`❌ [DEBUG] User has no centerId assigned`);
      return undefined;
    }
    
    console.log(`🏢 [DEBUG] Looking for center with ID: ${user.centerId}`);
    
    const [center] = await db
      .select()
      .from(centers)
      .where(eq(centers.id, user.centerId));
    
    console.log(`🏢 [DEBUG] Center query result:`, center);
    
    if (center) {
      console.log(`✅ [DEBUG] Center found successfully:`, {
        id: center.id,
        name: center.name,
        code: center.code
      });
    } else {
      console.log(`❌ [DEBUG] Center not found in database`);
    }
    
    return center || undefined;
  } catch (error) {
    console.error('❌ [ERROR] in getCenterByManager:', error);
    throw error;
  }
}


  // Incident History operations
  async addIncidentHistory(history: InsertIncidentHistory): Promise<IncidentHistory> {
    const [newHistory] = await db
      .insert(incidentHistory)
      .values(history)
      .returning();

    return newHistory;
  }

  // Agregar estos métodos a server/storage.ts en la clase DatabaseStorage

async getCenterByCode(code: string): Promise<Center | undefined> {
  const [center] = await db
    .select()
    .from(centers)
    .where(eq(centers.code, code));
  return center;
}

async updateCenter(id: string, updates: UpdateCenter): Promise<Center> {
  const [center] = await db
    .update(centers)
    .set(updates)
    .where(eq(centers.id, id))
    .returning();
  return center;
}

// server/storage.ts - Agregar métodos de gestión de usuarios

// server/storage.ts - Actualizar el método getUsers()



// server/storage.ts - Actualizar el método getUser()
  async getUsers(): Promise<UserWithCenter[]> {
    const result = await db
      .select({
        // Campos del usuario
        id: users.id,
        department: users.department,
        departmentId: users.departmentId,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        role: users.role,
        location: users.location,
        centerId: users.centerId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        // Campos del centro (cuando está asignado)
        centerName: centers.name,
        centerCode: centers.code,
        centerAddress: centers.address,
      })
      .from(users)
      .leftJoin(centers, eq(users.centerId, centers.id))
      .orderBy(users.firstName, users.lastName);

    // Mapear los resultados para incluir la información del centro en el formato esperado
    return result.map(row => ({
      id: row.id,
      department: row.department,
      departmentId: row.departmentId,
      email: row.email,
      password: row.password,
      firstName: row.firstName,
      lastName: row.lastName,
      profileImageUrl: row.profileImageUrl,
      role: row.role,
      location: row.location,
      centerId: row.centerId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      // Incluir información del centro si existe y tiene datos válidos
      center: row.centerId && row.centerName && row.centerCode ? {
        id: row.centerId,
        name: row.centerName,
        code: row.centerCode,
        address: row.centerAddress,
      } : undefined
    }));
  }

  // Agregar en server/storage.ts en la clase DatabaseStorage

async getUsersWithDetails(): Promise<any[]> {
  try {
    const result = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        centerId: users.centerId,
        departmentId: users.departmentId,
        center: {
          id: centers.id,
          name: centers.name,
          code: centers.code,
        },
        departmentInfo: {
          id: departments.id,
          name: departments.name,
          code: departments.code,
        }
      })
      .from(users)
      .leftJoin(centers, eq(users.centerId, centers.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
   

    return result.map(row => ({
  id: row.id,
  firstName: row.firstName,
  lastName: row.lastName,
  email: row.email,
  role: row.role,
  centerId: row.centerId,
  departmentId: row.departmentId,
  center: row.center?.id ? row.center : null,
  departmentInfo: row.departmentInfo?.id ? row.departmentInfo : null,
}));
  } catch (error) {
    console.error('Error getting users with details:', error);
    throw error;
  }
}

  // Método getUser actualizado
  async getUser(userId: string): Promise<UserWithCenter | undefined> {
    const result = await db
      .select({
        // Campos del usuario
        id: users.id,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        role: users.role,
        department: users.department,
        departmentId: users.departmentId,
        location: users.location,
        centerId: users.centerId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        // Campos del centro (cuando está asignado)
        centerName: centers.name,
        centerCode: centers.code,
        centerAddress: centers.address,
      })
      .from(users)
      .leftJoin(centers, eq(users.centerId, centers.id))
      .where(eq(users.id, userId));

    if (result.length === 0) {
      return undefined;
    }

    const row = result[0];
    
    // Mapear el resultado para incluir la información del centro
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      firstName: row.firstName,
      lastName: row.lastName,
      profileImageUrl: row.profileImageUrl,
      role: row.role,
      department: row.department,
      departmentId: row.departmentId,
      location: row.location,
      centerId: row.centerId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      // Incluir información del centro si existe y tiene datos válidos
      center: row.centerId && row.centerName && row.centerCode ? {
        id: row.centerId,
        name: row.centerName,
        code: row.centerCode,
        address: row.centerAddress,
      } : undefined
    };
  }

async updateUser(userId: string, updates: any) {
  const [updatedUser] = await db
    .update(users)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  
  return updatedUser;
}

async deleteUser(userId: string) {
  await db
    .delete(users)
    .where(eq(users.id, userId));
}

  async getIncidentHistory(incidentId: string): Promise<(IncidentHistory & { user: User })[]> {
    const result = await db
      .select()
      .from(incidentHistory)
      .leftJoin(users, eq(incidentHistory.userId, users.id))
      .where(eq(incidentHistory.incidentId, incidentId))
      .orderBy(incidentHistory.createdAt);

    return result.map(row => ({
      ...row.incident_history,
      user: row.users!
    }));
  }

  // Get test users for development
  async getTestUsers(): Promise<User[]> {
    const testUsers = await db
      .select()
      .from(users)
      .where(sql`email LIKE '%@test.com'`)
      .orderBy(users.role, users.firstName);
      
    return testUsers;
  }

   async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

async createUser(userData: CreateUser): Promise<User> {
  const [user] = await db.insert(users).values(userData).returning();
  return user;
}

async deleteCenter(centerId: string) {
  await db.delete(centers).where(eq(centers.id, centerId));
}

// server/storage.ts - Agregar estos métodos a la clase Database

async getCenterTypeStats() {
  try {
    // Estadísticas de tiendas (código inicia con T)
    const [storeStats] = await db
      .select({
        totalStores: count(),
        storesWithManager: count(sql`CASE WHEN manager_id IS NOT NULL THEN 1 END`),
      })
      .from(centers)
      .where(sql`code LIKE 'T%'`);

    // Estadísticas de centros (código inicia con TCD)
    const [centerStats] = await db
      .select({
        totalCenters: count(),
        centersWithManager: count(sql`CASE WHEN manager_id IS NOT NULL THEN 1 END`),
      })
      .from(centers)
      .where(sql`code LIKE 'TCD%'`);

    // Usuarios por tipo de asignación
    const [userStats] = await db
      .select({
        usersInStores: count(sql`CASE WHEN centers.code LIKE 'T%' THEN 1 END`),
        usersInCenters: count(sql`CASE WHEN centers.code LIKE 'TCD%' THEN 1 END`),
        usersInDepartments: count(sql`CASE WHEN users.department_id IS NOT NULL THEN 1 END`),
        unassignedUsers: count(sql`CASE WHEN users.center_id IS NULL AND users.department_id IS NULL AND users.role != 'admin' THEN 1 END`),
      })
      .from(users)
      .leftJoin(centers, eq(users.centerId, centers.id));

    return {
      stores: {
        total: storeStats.totalStores || 0,
        withManager: storeStats.storesWithManager || 0,
        users: userStats.usersInStores || 0,
      },
      centers: {
        total: centerStats.totalCenters || 0,
        withManager: centerStats.centersWithManager || 0,
        users: userStats.usersInCenters || 0,
      },
      departments: {
        users: userStats.usersInDepartments || 0,
      },
      unassigned: {
        users: userStats.unassignedUsers || 0,
      },
    };
  } catch (error) {
    console.error('Error getting center type stats:', error);
    return {
      stores: { total: 0, withManager: 0, users: 0 },
      centers: { total: 0, withManager: 0, users: 0 },
      departments: { users: 0 },
      unassigned: { users: 0 },
    };
  }
}

async getDepartmentStats() {
  try {
    // Estadísticas básicas de departamentos
    const [deptStats] = await db
      .select({
        totalDepartments: count(),
        departmentsWithHead: count(sql`CASE WHEN head_user_id IS NOT NULL THEN 1 END`),
      })
      .from(departments);

    // Departamentos con más usuarios
    const topDepartments = await db
      .select({
        departmentId: departments.id,
        departmentName: departments.name,
        userCount: count(users.id),
      })
      .from(departments)
      .leftJoin(users, eq(departments.id, users.departmentId))
      .groupBy(departments.id, departments.name)
      .orderBy(desc(count(users.id)))
      .limit(5);

    return {
      total: deptStats.totalDepartments || 0,
      withHead: deptStats.departmentsWithHead || 0,
      topDepartments: topDepartments || [],
    };
  } catch (error) {
    console.error('Error getting department stats:', error);
    return {
      total: 0,
      withHead: 0,
      topDepartments: [],
    };
  }
}
// Agregar este método en server/storage.ts en la clase DatabaseStorage

async getDepartment(id: string): Promise<any> {
  try {
    const [department] = await db
      .select()
      .from(departments)
      .leftJoin(users, eq(departments.headUserId, users.id))
      .where(eq(departments.id, id));
    
    if (!department.departments) {
      return null;
    }

    return {
      ...department.departments,
      head: department.users && department.users.firstName && department.users.lastName && department.users.email ? {
        firstName: department.users.firstName,
        lastName: department.users.lastName,
        email: department.users.email,
      } : null,
    };
  } catch (error) {
    console.error('Error getting department:', error);
    return null;
  }
}


// =================== ESTADÍSTICAS GLOBALES MEJORADAS ===================

async getGlobalStats() {
  try {
    // Estadísticas básicas de incidencias
    const [incidentStats] = await db
      .select({
        total: count(),
        inProgress: count(sql`CASE WHEN status = 'in_progress' THEN 1 END`),
        completed: count(sql`CASE WHEN status = 'completed' THEN 1 END`),
        critical: count(sql`CASE WHEN priority = 'critical' AND status != 'completed' THEN 1 END`),
        reported: count(sql`CASE WHEN status = 'reported' THEN 1 END`),
        assigned: count(sql`CASE WHEN status = 'assigned' THEN 1 END`),
        pendingApproval: count(sql`CASE WHEN status = 'pending_approval' THEN 1 END`),
      })
      .from(incidents);

    // Estadísticas de centros y tiendas
    const [centerStats] = await db
      .select({
        totalCenters: count(),
        totalStores: count(sql`CASE WHEN code LIKE 'T%' THEN 1 END`),
        totalDistributionCenters: count(sql`CASE WHEN code LIKE 'TCD%' THEN 1 END`),
      })
      .from(centers);

    // Estadísticas de usuarios y departamentos
    const [userStats] = await db
      .select({
        totalUsers: count(),
        totalDepartments: sql`(SELECT COUNT(*) FROM departments)`,
      })
      .from(users);

    // Centro más activo
    const mostActiveCenter = await db
      .select({
        centerId: incidents.centerId,
        centerName: centers.name,
        centerCode: centers.code,
        incidentCount: count(),
      })
      .from(incidents)
      .leftJoin(centers, eq(incidents.centerId, centers.id))
      .groupBy(incidents.centerId, centers.name, centers.code)
      .orderBy(desc(count()))
      .limit(1);

    // Incidencias recientes (últimas 10)
    const recentIncidents = await db
      .select({
        id: incidents.id,
        title: incidents.title,
        status: incidents.status,
        priority: incidents.priority,
        createdAt: incidents.createdAt,
        center: {
          name: centers.name,
          code: centers.code,
        },
      })
      .from(incidents)
      .leftJoin(centers, eq(incidents.centerId, centers.id))
      .orderBy(desc(incidents.createdAt))
      .limit(10);

    // Calcular promedio diario (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [dailyAvgResult] = await db
      .select({
        recentIncidents: count(),
      })
      .from(incidents)
      .where(sql`created_at >= ${thirtyDaysAgo}`);

    const dailyAverage = Math.round((dailyAvgResult.recentIncidents || 0) / 30);

    return {
      totalIncidents: incidentStats.total || 0,
      inProgress: incidentStats.inProgress || 0,
      completed: incidentStats.completed || 0,
      critical: incidentStats.critical || 0,
      reported: incidentStats.reported || 0,
      assigned: incidentStats.assigned || 0,
      pendingApproval: incidentStats.pendingApproval || 0,
      
      totalCenters: centerStats.totalCenters || 0,
      totalStores: centerStats.totalStores || 0,
      totalDistributionCenters: centerStats.totalDistributionCenters || 0,
      
      totalUsers: userStats.totalUsers || 0,
      totalDepartments: Number(userStats.totalDepartments) || 0,
      
      dailyAverage,
      avgResolutionTime: "2.5 días", // Este cálculo se puede mejorar
      globalResolutionRate: incidentStats.total > 0 ? 
        Math.round(((incidentStats.completed || 0) / incidentStats.total) * 100) : 0,
      
      mostActiveCenterName: mostActiveCenter[0]?.centerName || "N/A",
      mostActiveCenterCode: mostActiveCenter[0]?.centerCode || "N/A",
      
      recentIncidents: recentIncidents || [],
    };
  } catch (error) {
    console.error('Error getting global stats:', error);
    throw error;
  }
}


// Método mejorado para obtener incidencias con filtros
async getIncidents(filters: any = {}): Promise<IncidentWithDetails[]> {
  try {
    // Construir condiciones
    const conditions: any[] = [];
    
    if (filters.status) conditions.push(eq(incidents.status, filters.status));
    if (filters.priority) conditions.push(eq(incidents.priority, filters.priority));
    if (filters.centerId) conditions.push(eq(incidents.centerId, filters.centerId));
    if (filters.assigneeId) conditions.push(eq(incidents.assigneeId, filters.assigneeId));
    if (filters.reporterId) conditions.push(eq(incidents.reporterId, filters.reporterId));

    // Query única con filtros opcionales
    const baseQuery = db
      .select()
      .from(incidents)
      .leftJoin(centers, eq(incidents.centerId, centers.id))
      .leftJoin(incidentTypes, eq(incidents.typeId, incidentTypes.id))
      .leftJoin(reporterUser, eq(incidents.reporterId, reporterUser.id))
      .leftJoin(assigneeUser, eq(incidents.assigneeId, assigneeUser.id))
      .orderBy(desc(incidents.createdAt));

    const results = conditions.length > 0 
      ? await baseQuery.where(and(...conditions))
      : await baseQuery;

    // Para cada incidente, obtener participantes, planes de acción e historial
    const incidentsWithDetails: IncidentWithDetails[] = [];

    for (const row of results) {
      // Get participants
      const participantsResult = await db
        .select()
        .from(incidentParticipants)
        .leftJoin(users, eq(incidentParticipants.userId, users.id))
        .where(eq(incidentParticipants.incidentId, row.incidents.id));

      // Get action plans
      const actionPlansResult = await db
        .select()
        .from(actionPlans)
        .leftJoin(users, eq(actionPlans.assigneeId, users.id))
        .where(eq(actionPlans.incidentId, row.incidents.id));

      // Get history
      const historyResult = await db
        .select()
        .from(incidentHistory)
        .leftJoin(users, eq(incidentHistory.userId, users.id))
        .where(eq(incidentHistory.incidentId, row.incidents.id))
        .orderBy(desc(incidentHistory.createdAt));

      incidentsWithDetails.push({
        ...row.incidents,
        reporter: row.reporterUser!,
        assignee: row.assigneeUser || undefined,
        center: row.centers!,
        type: row.incident_types!,
        participants: participantsResult.map(p => ({
          ...p.incident_participants,
          user: p.users!
        })),
        actionPlans: actionPlansResult.map(a => ({
          ...a.action_plans,
          assignee: a.users!
        })),
        history: historyResult.map(h => ({
          ...h.incident_history,
          user: h.users || undefined
        }))
      } as IncidentWithDetails);
    }

    return incidentsWithDetails;
  } catch (error) {
    console.error('Error getting incidents:', error);
    throw error;
  }
}

// Método para obtener datos de tendencias
async getTrendData() {
  try {
    // Obtener datos de los últimos 6 meses
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = await db
      .select({
        month: sql<string>`TO_CHAR(created_at, 'Mon')`,
        monthNum: sql<number>`EXTRACT(month FROM created_at)`,
        year: sql<number>`EXTRACT(year FROM created_at)`,
        incidents: count(),
        resolved: count(sql`CASE WHEN status = 'completed' THEN 1 END`),
      })
      .from(incidents)
      .where(sql`created_at >= ${sixMonthsAgo}`)
      .groupBy(
        sql`EXTRACT(year FROM created_at)`,
        sql`EXTRACT(month FROM created_at)`,
        sql`TO_CHAR(created_at, 'Mon')`
      )
      .orderBy(
        sql`EXTRACT(year FROM created_at)`,
        sql`EXTRACT(month FROM created_at)`
      );

    return monthlyData;
  } catch (error) {
    console.error('Error getting trend data:', error);
    throw error;
  }
}

// Método mejorado para estadísticas de centro
async getCenterStats(centerId?: string, userId?: string) {
  if (!centerId) return {};

  try {
    const [centerStats] = await db
      .select({
        total: count(),
        inProgress: count(sql`CASE WHEN status = 'in_progress' THEN 1 END`),
        critical: count(sql`CASE WHEN priority = 'critical' AND status != 'completed' THEN 1 END`),
        completed: count(sql`CASE WHEN status = 'completed' THEN 1 END`),
        reported: count(sql`CASE WHEN status = 'reported' THEN 1 END`),
        assigned: count(sql`CASE WHEN status = 'assigned' THEN 1 END`),
      })
      .from(incidents)
      .where(eq(incidents.centerId, centerId));

    return {
      totalIncidents: centerStats.total,
      inProgress: centerStats.inProgress,
      critical: centerStats.critical,
      completed: centerStats.completed,
      reported: centerStats.reported,
      assigned: centerStats.assigned,
      resolutionRate: centerStats.total > 0 ? 
        Math.round((centerStats.completed / centerStats.total) * 100) : 0
    };
  } catch (error) {
    console.error('Error getting center stats:', error);
    throw error;
  }
}
// server/storage.ts - Método corregido
async getIncidentsWithAdvancedFilters(filters: any = {}, limit: number = 50, offset: number = 0): Promise<any[]> {
  try {
    const conditions: any[] = [];
    
    // Filtros básicos
    if (filters.status) conditions.push(eq(incidents.status, filters.status));
    if (filters.priority) conditions.push(eq(incidents.priority, filters.priority));
    if (filters.centerId) conditions.push(eq(incidents.centerId, filters.centerId));
    if (filters.assigneeId) conditions.push(eq(incidents.assigneeId, filters.assigneeId));
    if (filters.reporterId) conditions.push(eq(incidents.reporterId, filters.reporterId));

    // Filtro por rango de fechas
    if (filters.dateFrom) {
      conditions.push(gte(incidents.createdAt, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(incidents.createdAt, filters.dateTo));
    }

    // Configurar ordenamiento
    let orderByClause;
    if (filters.sortBy === 'priority') {
      // Ordenar por prioridad: critical -> high -> medium -> low
      const priorityOrder = sql`
        CASE ${incidents.priority}
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END
      `;
      orderByClause = filters.sortOrder === 'asc' ? asc(priorityOrder) : desc(priorityOrder);
    } else {
      // Ordenar por fecha (default)
      orderByClause = filters.sortOrder === 'asc' ? asc(incidents.createdAt) : desc(incidents.createdAt);
    }

    // Query base con campos correctos según tu schema
    let baseQuery = db
      .select({
        id: incidents.id,
        incidentNumber: incidents.incidentNumber,
        title: incidents.title,
        description: incidents.description,
        status: incidents.status,
        priority: incidents.priority,
        centerId: incidents.centerId,
        typeId: incidents.typeId,
        reporterId: incidents.reporterId,
        assigneeId: incidents.assigneeId,
        supervisorId: incidents.supervisorId,
        rootCause: incidents.rootCause,
        theoreticalResolutionDate: incidents.theoreticalResolutionDate,
        actualResolutionDate: incidents.actualResolutionDate,
        evidenceFiles: incidents.evidenceFiles,
        createdAt: incidents.createdAt,
        updatedAt: incidents.updatedAt,
        center: {
          id: centers.id,
          name: centers.name,
          code: centers.code,
          address: centers.address,
        },
        type: {
          id: incidentTypes.id,
          name: incidentTypes.name,
        },
        reporter: {
          id: reporterUser.id,
          firstName: reporterUser.firstName,
          lastName: reporterUser.lastName,
          email: reporterUser.email,
        },
        assignee: {
          id: assigneeUser.id,
          firstName: assigneeUser.firstName,
          lastName: assigneeUser.lastName,
          email: assigneeUser.email,
        },
      })
      .from(incidents)
      .leftJoin(centers, eq(incidents.centerId, centers.id))
      .leftJoin(incidentTypes, eq(incidents.typeId, incidentTypes.id))
      .leftJoin(reporterUser, eq(incidents.reporterId, reporterUser.id))
      .leftJoin(assigneeUser, eq(incidents.assigneeId, assigneeUser.id))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Aplicar condiciones si existen
    const results = conditions.length > 0 
      ? await baseQuery.where(and(...conditions))
      : await baseQuery;

    // Filtro de búsqueda por texto
    let filteredResults = results;
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredResults = results.filter(incident => 
        incident.title?.toLowerCase().includes(searchTerm) ||
        incident.description?.toLowerCase().includes(searchTerm) ||
        incident.incidentNumber?.toLowerCase().includes(searchTerm) ||
        incident.center?.name?.toLowerCase().includes(searchTerm)
      );
    }

    // Mapear resultados al formato IncidentWithDetails
    return filteredResults.map(result => ({
      id: result.id,
      incidentNumber: result.incidentNumber,
      title: result.title,
      description: result.description,
      status: result.status,
      priority: result.priority,
      centerId: result.centerId,
      typeId: result.typeId,
      reporterId: result.reporterId,
      assigneeId: result.assigneeId,
      supervisorId: result.supervisorId,
      rootCause: result.rootCause,
      theoreticalResolutionDate: result.theoreticalResolutionDate,
      actualResolutionDate: result.actualResolutionDate,
      evidenceFiles: result.evidenceFiles,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      // Relaciones
      reporter: result.reporter ? {
  id: result.reporter.id!,
  firstName: result.reporter.firstName,
  lastName: result.reporter.lastName,
  email: result.reporter.email,
} as UserBasic : null as any,
      assignee: result.assignee?.id ? {
  id: result.assignee.id!,
  firstName: result.assignee.firstName,
  lastName: result.assignee.lastName,
  email: result.assignee.email,
} as UserBasic : undefined,
      center: result.center as Center,
      type: result.type as IncidentType,
      // Campos requeridos por IncidentWithDetails pero no consultados aquí
      supervisor: undefined,
      participants: [],
      actionPlans: [],
      history: [],
    }));
    
  } catch (error) {
    console.error('Error getting incidents with advanced filters:', error);
    throw error;
  }
}

// Método para obtener todos los centros
async getAllCenters(type?: 'store' | 'center'): Promise<Center[]> {
  const baseQuery = db
    .select({
      id: centers.id,
      name: centers.name,
      code: centers.code,
      address: centers.address,
      managerId: centers.managerId,
      createdAt: centers.createdAt,
      manager: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      },
    })
    .from(centers)
    .leftJoin(users, eq(centers.managerId, users.id));

  // Aplicar filtros según el tipo
  let query;
  if (type === 'store') {
    query = baseQuery.where(sql`${centers.code} LIKE 'T%'`);
  } else if (type === 'center') {
    query = baseQuery.where(sql`${centers.code} LIKE 'TCD%'`);
  } else {
    query = baseQuery;
  }

  const results = await query.orderBy(centers.name);

  return results.map(center => ({
    ...center,
    manager: center.manager?.id ? center.manager : null, // Usar optional chaining
  }));
}

async getDepartments(): Promise<Department[]> {
  const depts = await db
    .select({
      id: departments.id,
      name: departments.name,
      code: departments.code,
      description: departments.description,
      headUserId: departments.headUserId,
      createdAt: departments.createdAt,
      updatedAt: departments.updatedAt,
      head: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      },
    })
    .from(departments)
    .leftJoin(users, eq(departments.headUserId, users.id))
    .orderBy(departments.name);

  return depts.map(dept => ({
    ...dept,
    head: dept.head?.id ? dept.head : null, // CAMBIAR: Agregar optional chaining
  }));
}

async getDepartmentByCode(code: string): Promise<Department | undefined> {
  const [dept] = await db
    .select()
    .from(departments)
    .where(eq(departments.code, code));
  return dept;
}

async createDepartment(departmentData: CreateDepartment): Promise<Department> {
  const [department] = await db
    .insert(departments)
    .values(departmentData)
    .returning();
  return department;
}

async updateDepartment(id: string, updates: UpdateDepartment): Promise<Department> {
  const [department] = await db
    .update(departments)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(departments.id, id))
    .returning();
  return department;
}

async deleteDepartment(id: string): Promise<void> {
  await db.delete(departments).where(eq(departments.id, id));
}

async getUsersByDepartment(departmentId: string): Promise<User[]> {
  return await db
    .select()
    .from(users)
    .where(eq(users.departmentId, departmentId));
}
// Método para obtener un centro específico
async getCenter(centerId: string): Promise<Center | null> {
  try {
    const center = await db
      .select()
      .from(centers)
      .where(eq(centers.id, centerId))
      .limit(1);
    
    return center[0] || null;
  } catch (error) {
    console.error('Error getting center:', error);
    throw error;
  }
}




}

export const storage = new DatabaseStorage();
