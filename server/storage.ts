import {
  users,
  centers,
  incidentTypes,
  incidents,
  incidentParticipants,
  actionPlans,
  incidentHistory,
  type User,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, count, sql, avg, } from "drizzle-orm";
const reporterUser = alias(users, 'reporterUser');
const assigneeUser = alias(users, 'assigneeUser');

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

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
    const results = await this.getIncidents();
    return results.find(incident => incident.id === id);
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


  // Dashboard statistics

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

  async getIncidentsByCenter(centerId?: string, userId?: string, limit: number = 10, offset: number = 0): Promise<(Incident & { reporter?: User, center?: Center })[]> {
    // Ejemplo usando SQL con paginación
    return await db
      .select()
      .from(incidents)
      .where(centerId ? eq(incidents.centerId, centerId) : undefined)
      .limit(limit)
      .offset(offset);
  }

  async getCenterByManager(userId: string): Promise<Center | undefined> {
    const [center] = await db.select().from(centers).where(eq(centers.managerId, userId));
    return center || undefined;
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
    const [center] = await db.select().from(centers).where(eq(centers.code, code.toUpperCase()));
    return center;
  }

// server/storage.ts - Agregar métodos de gestión de usuarios

async getUsers() {
  return await db
    .select({
      id: users.id,
      department: users.department,
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
    })
    .from(users)
    .orderBy(users.firstName, users.lastName);
}

async getUser(userId: string): Promise<User | undefined> {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      password: users.password,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImageUrl: users.profileImageUrl,
      role: users.role,
      department: users.department,
      location: users.location,
      centerId: users.centerId,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId));
  
  return user;
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

// Método mejorado para estadísticas globales
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

    // Estadísticas de centros
    const [centerStats] = await db
      .select({
        totalCenters: count(),
      })
      .from(centers);

    // Estadísticas de usuarios
    const [userStats] = await db
      .select({
        totalUsers: count(),
      })
      .from(users);

    // Centro más activo
    const mostActiveCenter = await db
      .select({
        centerId: incidents.centerId,
        centerName: centers.name,
        incidentCount: count(),
      })
      .from(incidents)
      .leftJoin(centers, eq(incidents.centerId, centers.id))
      .groupBy(incidents.centerId, centers.name)
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
          id: centers.id,
          name: centers.name,
        }
      })
      .from(incidents)
      .leftJoin(centers, eq(incidents.centerId, centers.id))
      .orderBy(desc(incidents.createdAt))
      .limit(10);

    // Calcular promedio diario (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [recentIncidentsCount] = await db
      .select({
        count: count(),
      })
      .from(incidents)
      .where(sql`created_at >= ${thirtyDaysAgo}`);

    const dailyAverage = Math.round(recentIncidentsCount.count / 30 * 10) / 10;

    // Tiempo promedio de resolución
    const [avgResolution] = await db
      .select({
        avgDays: avg(sql`EXTRACT(day FROM actual_resolution_date - created_at)`),
      })
      .from(incidents)
      .where(
        and(
          eq(incidents.status, 'completed'),
          isNotNull(incidents.actualResolutionDate)
        )
      );

    const avgResolutionTime = avgResolution.avgDays 
      ? `${Math.round(Number(avgResolution.avgDays) * 10) / 10} días`
      : 'N/A';

    // Tasa de resolución global
    const globalResolutionRate = incidentStats.total > 0 
      ? Math.round((incidentStats.completed / incidentStats.total) * 100)
      : 0;

    return {
      totalIncidents: incidentStats.total,
      inProgress: incidentStats.inProgress,
      completed: incidentStats.completed,
      critical: incidentStats.critical,
      reported: incidentStats.reported,
      assigned: incidentStats.assigned,
      pendingApproval: incidentStats.pendingApproval,
      totalCenters: centerStats.totalCenters,
      totalUsers: userStats.totalUsers,
      dailyAverage,
      avgResolutionTime,
      globalResolutionRate,
      mostActiveCenterName: mostActiveCenter[0]?.centerName || 'N/A',
      recentIncidents: recentIncidents.map(incident => ({
        ...incident,
        createdAt: incident.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error('Error getting global stats:', error);
    throw error;
  }
}

// Método mejorado para obtener incidencias con filtros
async getIncidents(filters: any = {}, limit: number = 50, offset: number = 0): Promise<(Incident & { center?: Center, reporter?: User, assignee?: User })[]> {
  try {
    let query = db
      .select({
        incident: incidents,
        center: centers,
        reporter: {
          id: reporterUser.id,
          name: reporterUser.name,
          email: reporterUser.email,
        },
        assignee: {
          id: assigneeUser.id,
          name: assigneeUser.name,
          email: assigneeUser.email,
        }
      })
      .from(incidents)
      .leftJoin(centers, eq(incidents.centerId, centers.id))
      .leftJoin(reporterUser, eq(incidents.reporterId, reporterUser.id))
      .leftJoin(assigneeUser, eq(incidents.assigneeId, assigneeUser.id))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(incidents.createdAt));

    // Aplicar filtros dinámicamente
    const conditions: any[] = [];
    
    if (filters.status) {
      conditions.push(eq(incidents.status, filters.status));
    }
    
    if (filters.priority) {
      conditions.push(eq(incidents.priority, filters.priority));
    }
    
    if (filters.centerId) {
      conditions.push(eq(incidents.centerId, filters.centerId));
    }
    
    if (filters.assigneeId) {
      conditions.push(eq(incidents.assigneeId, filters.assigneeId));
    }
    
    if (filters.reporterId) {
      conditions.push(eq(incidents.reporterId, filters.reporterId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query;

    return results.map(row => ({
      ...row.incident,
      center: row.center || undefined,
      reporter: row.reporter || undefined,
      assignee: row.assignee || undefined,
    }));
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


}

export const storage = new DatabaseStorage();
