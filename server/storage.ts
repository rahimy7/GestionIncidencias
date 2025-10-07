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
  ActionPlanParticipant,
  InsertActionPlanParticipant,
  actionPlanParticipants,
  actionPlanComments,
  actionPlanTasks,
  commentAttachments,
  taskEvidence,
  incidentComments,
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
updateIncident(id: string, updates: Partial<InsertIncident>, userId: string): Promise<Incident>;
  getIncidentsByAssignee(userId: string): Promise<(Incident & { center?: Center; reporter?: User })[]>;
  
  // Action Plans operations
 getActionPlansByIncident(incidentId: string): Promise<(ActionPlan & { 
    assignee: User; 
    participants?: (ActionPlanParticipant & { user: User })[];
  })[]>;
  createActionPlan(actionPlan: InsertActionPlan): Promise<ActionPlan>;
  updateActionPlan(id: string, updates: Partial<InsertActionPlan>): Promise<ActionPlan>;

   addActionPlanParticipant(participant: InsertActionPlanParticipant): Promise<ActionPlanParticipant>;
  removeActionPlanParticipant(actionPlanId: string, userId: string): Promise<void>;
  getActionPlanParticipants(actionPlanId: string): Promise<(ActionPlanParticipant & { user: User })[]>;


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

async updateIncident(incidentId: string, updates: any, userId: string) {
  try {
    // Obtener estado actual para comparar
    const currentIncident = await this.getIncidentById(incidentId);
    
    const result = await db
      .update(incidents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(incidents.id, incidentId))
      .returning();

    if (result.length === 0) {
      throw new Error('Incidente no encontrado');
    }

    // Registrar cambios específicos en historial
    if (updates.status && updates.status !== currentIncident?.status) {
      await this.logIncidentAction(
        incidentId,
        userId,
        'status_change',
        `Estado cambiado de "${currentIncident?.status}" a "${updates.status}"`,
        { 
          oldStatus: currentIncident?.status, 
          newStatus: updates.status 
        }
      );
    }

    if (updates.assigneeId && updates.assigneeId !== currentIncident?.assigneeId) {
      await this.logIncidentAction(
        incidentId,
        userId,
        'assignment_change',
        'Incidente reasignado',
        { 
          oldAssignee: currentIncident?.assigneeId, 
          newAssignee: updates.assigneeId 
        }
      );
    }

    if (updates.priority && updates.priority !== currentIncident?.priority) {
      await this.logIncidentAction(
        incidentId,
        userId,
        'priority_change',
        `Prioridad cambiada de "${currentIncident?.priority}" a "${updates.priority}"`,
        { 
          oldPriority: currentIncident?.priority, 
          newPriority: updates.priority 
        }
      );
    }

    if (updates.rootCause && updates.rootCause !== currentIncident?.rootCause) {
      await this.logIncidentAction(
        incidentId,
        userId,
        'root_cause_updated',
        'Causa raíz actualizada',
        { rootCause: updates.rootCause }
      );
    }

    return result[0];
  } catch (error) {
    console.error('Error updating incident:', error);
    throw error;
  }
}

async deleteIncident(id: string): Promise<void> {
  try {
    console.log(`🗑️ Iniciando eliminación de incidencia: ${id}`);
    
    // Obtener información de la incidencia antes de eliminar (para logs)
    const incident = await this.getIncidentById(id);
    if (!incident) {
      throw new Error(`Incidencia ${id} no encontrada`);
    }
    
    console.log(`📋 Eliminando incidencia: ${incident.incidentNumber} - ${incident.title}`);
    
    // Contar datos relacionados antes de eliminar (para logs)
    const [actionPlansCount, participantsCount, historyCount, commentsCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(actionPlans)
        .where(eq(actionPlans.incidentId, id))
        .then(r => Number(r[0]?.count || 0)),
      db.select({ count: sql<number>`count(*)` })
        .from(incidentParticipants)
        .where(eq(incidentParticipants.incidentId, id))
        .then(r => Number(r[0]?.count || 0)),
      db.select({ count: sql<number>`count(*)` })
        .from(incidentHistory)
        .where(eq(incidentHistory.incidentId, id))
        .then(r => Number(r[0]?.count || 0)),
      db.select({ count: sql<number>`count(*)` })
        .from(incidentComments)
        .where(eq(incidentComments.incidentId, id))
        .then(r => Number(r[0]?.count || 0))
    ]);
    
    console.log(`📊 Datos a eliminar en cascada:
      - ${actionPlansCount} planes de acción (con sus tareas, participantes y comentarios)
      - ${participantsCount} participantes
      - ${historyCount} entradas de historial
      - ${commentsCount} comentarios`);
    
    // Eliminar la incidencia (el cascade eliminará todo lo relacionado)
    const result = await db
      .delete(incidents)
      .where(eq(incidents.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`No se pudo eliminar la incidencia ${id}`);
    }
    
    console.log(`✅ Incidencia ${incident.incidentNumber} eliminada exitosamente`);
    
  } catch (error) {
    console.error(`❌ Error eliminando incidencia ${id}:`, error);
    throw error;
  }
}

  // Action Plans operations

 async getActionPlansByIncident(incidentId: string): Promise<(ActionPlan & { 
    assignee: User; 
    participants?: (ActionPlanParticipant & { user: User })[];
  })[]> {
    const result = await db
      .select()
      .from(actionPlans)
      .leftJoin(users, eq(actionPlans.assigneeId, users.id))
      .where(eq(actionPlans.incidentId, incidentId))
      .orderBy(actionPlans.createdAt);

    const actionPlansWithDetails = [];

    for (const row of result) {
      // Obtener participantes del plan
      const participantsResult = await db
        .select()
        .from(actionPlanParticipants)
        .leftJoin(users, eq(actionPlanParticipants.userId, users.id))
        .where(eq(actionPlanParticipants.actionPlanId, row.action_plans.id));

      actionPlansWithDetails.push({
        ...row.action_plans,
        assignee: row.users!,
        participants: participantsResult.map(p => ({
          ...p.action_plan_participants,
          user: p.users!
        }))
      });
    }

    return actionPlansWithDetails;
  }

  async createActionPlan(actionPlan: InsertActionPlan): Promise<ActionPlan> {
    const [newActionPlan] = await db
      .insert(actionPlans)
      .values({
        ...actionPlan,
        startDate: actionPlan.startDate ? new Date(actionPlan.startDate) : null,
        dueDate: new Date(actionPlan.dueDate),
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


  // Action Plan Participants operations - NUEVO
  async addActionPlanParticipant(participant: InsertActionPlanParticipant): Promise<ActionPlanParticipant> {
    const [newParticipant] = await db
      .insert(actionPlanParticipants)
      .values(participant)
      .returning();

    return newParticipant;
  }

  async removeActionPlanParticipant(actionPlanId: string, userId: string): Promise<void> {
    await db
      .delete(actionPlanParticipants)
      .where(
        and(
          eq(actionPlanParticipants.actionPlanId, actionPlanId),
          eq(actionPlanParticipants.userId, userId)
        )
      );
  }

  async getActionPlanParticipants(actionPlanId: string): Promise<(ActionPlanParticipant & { user: User })[]> {
    const result = await db
      .select()
      .from(actionPlanParticipants)
      .leftJoin(users, eq(actionPlanParticipants.userId, users.id))
      .where(eq(actionPlanParticipants.actionPlanId, actionPlanId))
      .orderBy(actionPlanParticipants.createdAt);

    return result.map(row => ({
      ...row.action_plan_participants,
      user: row.users!
    }));
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

async getCenterStatsDetailed(centerId: string, userId: string) {
  try {
    // Estadísticas básicas de incidencias
    const [incidentStats] = await db
      .select({
        total: count(),
        inProgress: count(sql`CASE WHEN status = 'in_progress' THEN 1 END`),
        critical: count(sql`CASE WHEN priority = 'critical' AND status != 'completed' THEN 1 END`),
        completed: count(sql`CASE WHEN status = 'completed' THEN 1 END`),
        reported: count(sql`CASE WHEN status = 'reported' THEN 1 END`),
        assigned: count(sql`CASE WHEN status = 'assigned' THEN 1 END`),
        avgResolutionDays: avg(sql`CASE WHEN status = 'completed' AND actual_resolution_date IS NOT NULL 
          THEN EXTRACT(day FROM actual_resolution_date - created_at) END`),
        avgResponseDays: avg(sql`CASE WHEN assignee_id IS NOT NULL AND created_at IS NOT NULL 
          THEN EXTRACT(day FROM updated_at - created_at) END`)
      })
      .from(incidents)
      .where(eq(incidents.centerId, centerId));

    // Estadísticas de planes de acción
    const [actionPlanStats] = await db
      .select({
        total: count(),
        pending: count(sql`CASE WHEN action_plans.status = 'pending' THEN 1 END`),
        inProgress: count(sql`CASE WHEN action_plans.status = 'in_progress' THEN 1 END`),
        completed: count(sql`CASE WHEN action_plans.status = 'completed' THEN 1 END`),
        overdue: count(sql`CASE WHEN action_plans.status != 'completed' AND action_plans.due_date < NOW() THEN 1 END`)
      })
      .from(actionPlans)
      .leftJoin(incidents, eq(actionPlans.incidentId, incidents.id))
      .where(eq(incidents.centerId, centerId));

    // Estadísticas de tareas de planes de acción
    const [taskStats] = await db
      .select({
        total: count(),
        pending: count(sql`CASE WHEN action_plan_tasks.status = 'pending' THEN 1 END`),
        inProgress: count(sql`CASE WHEN action_plan_tasks.status = 'in_progress' THEN 1 END`),
        completed: count(sql`CASE WHEN action_plan_tasks.status = 'completed' THEN 1 END`),
        overdue: count(sql`CASE WHEN action_plan_tasks.status != 'completed' AND action_plan_tasks.due_date < NOW() THEN 1 END`)
      })
      .from(actionPlanTasks)
      .leftJoin(actionPlans, eq(actionPlanTasks.actionPlanId, actionPlans.id))
      .leftJoin(incidents, eq(actionPlans.incidentId, incidents.id))
      .where(eq(incidents.centerId, centerId));

    // Tendencias de los últimos 6 meses
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const trendData = await db
      .select({
        month: sql<string>`TO_CHAR(incidents.created_at, 'Mon')`,
        monthNum: sql<number>`EXTRACT(month FROM incidents.created_at)`,
        year: sql<number>`EXTRACT(year FROM incidents.created_at)`,
        incidents: count(),
        resolved: count(sql`CASE WHEN incidents.status = 'completed' THEN 1 END`)
      })
      .from(incidents)
      .where(
        and(
          eq(incidents.centerId, centerId),
          sql`incidents.created_at >= ${sixMonthsAgo}`
        )
      )
      .groupBy(
        sql`EXTRACT(year FROM incidents.created_at)`,
        sql`EXTRACT(month FROM incidents.created_at)`,
        sql`TO_CHAR(incidents.created_at, 'Mon')`
      )
      .orderBy(
        sql`EXTRACT(year FROM incidents.created_at)`,
        sql`EXTRACT(month FROM incidents.created_at)`
      );

    // Obtener datos de planes de acción completados por mes
    const actionPlanTrends = await db
      .select({
        month: sql<string>`TO_CHAR(action_plans.completed_at, 'Mon')`,
        monthNum: sql<number>`EXTRACT(month FROM action_plans.completed_at)`,
        year: sql<number>`EXTRACT(year FROM action_plans.completed_at)`,
        actionPlans: count()
      })
      .from(actionPlans)
      .leftJoin(incidents, eq(actionPlans.incidentId, incidents.id))
      .where(
        and(
          eq(incidents.centerId, centerId),
          eq(actionPlans.status, 'completed'),
          sql`action_plans.completed_at >= ${sixMonthsAgo}`
        )
      )
      .groupBy(
        sql`EXTRACT(year FROM action_plans.completed_at)`,
        sql`EXTRACT(month FROM action_plans.completed_at)`,
        sql`TO_CHAR(action_plans.completed_at, 'Mon')`
      )
      .orderBy(
        sql`EXTRACT(year FROM action_plans.completed_at)`,
        sql`EXTRACT(month FROM action_plans.completed_at)`
      );

    // Obtener datos de tareas completadas por mes
    const taskTrends = await db
      .select({
        month: sql<string>`TO_CHAR(action_plan_tasks.completed_at, 'Mon')`,
        monthNum: sql<number>`EXTRACT(month FROM action_plan_tasks.completed_at)`,
        year: sql<number>`EXTRACT(year FROM action_plan_tasks.completed_at)`,
        tasksCompleted: count()
      })
      .from(actionPlanTasks)
      .leftJoin(actionPlans, eq(actionPlanTasks.actionPlanId, actionPlans.id))
      .leftJoin(incidents, eq(actionPlans.incidentId, incidents.id))
      .where(
        and(
          eq(incidents.centerId, centerId),
          eq(actionPlanTasks.status, 'completed'),
          sql`action_plan_tasks.completed_at >= ${sixMonthsAgo}`
        )
      )
      .groupBy(
        sql`EXTRACT(year FROM action_plan_tasks.completed_at)`,
        sql`EXTRACT(month FROM action_plan_tasks.completed_at)`,
        sql`TO_CHAR(action_plan_tasks.completed_at, 'Mon')`
      )
      .orderBy(
        sql`EXTRACT(year FROM action_plan_tasks.completed_at)`,
        sql`EXTRACT(month FROM action_plan_tasks.completed_at)`
      );

    // Combinar datos de tendencias
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trends = [];
    
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = months[date.getMonth()];
      const monthNum = date.getMonth() + 1;
      const year = date.getFullYear();

      const incidentData = trendData.find(t => t.monthNum === monthNum && t.year === year);
      const actionPlanData = actionPlanTrends.find(t => t.monthNum === monthNum && t.year === year);
      const taskData = taskTrends.find(t => t.monthNum === monthNum && t.year === year);

      trends.unshift({
        month: monthName,
        incidents: incidentData?.incidents || 0,
        resolved: incidentData?.resolved || 0,
        actionPlans: actionPlanData?.actionPlans || 0,
        tasksCompleted: taskData?.tasksCompleted || 0
      });
    }

    // Calcular métricas de rendimiento
    const completionRate = incidentStats.total > 0 
      ? Math.round((incidentStats.completed / incidentStats.total) * 100) 
      : 0;

    const taskCompletionRate = taskStats.total > 0 
      ? Math.round((taskStats.completed / taskStats.total) * 100) 
      : 0;

    return {
      totalIncidents: incidentStats.total,
      inProgress: incidentStats.inProgress,
      critical: incidentStats.critical,
      completed: incidentStats.completed,
      reported: incidentStats.reported,
      assigned: incidentStats.assigned,
      resolutionRate: completionRate,
      actionPlans: {
        total: actionPlanStats.total,
        pending: actionPlanStats.pending,
        inProgress: actionPlanStats.inProgress,
        completed: actionPlanStats.completed,
        overdue: actionPlanStats.overdue
      },
      tasks: {
        total: taskStats.total,
        pending: taskStats.pending,
        inProgress: taskStats.inProgress,
        completed: taskStats.completed,
        overdue: taskStats.overdue
      },
      trends,
      performanceMetrics: {
        avgResolutionTime: Math.round((Number(incidentStats.avgResolutionDays) || 0) * 10) / 10,
        avgResponseTime: Math.round((Number(incidentStats.avgResponseDays) || 0) * 10) / 10,
        completionRate,
        taskCompletionRate
      }
    };

  } catch (error) {
    console.error('Error getting detailed center stats:', error);
    throw error;
  }
}

async getActionPlansByCenter(centerId: string) {
  try {
    const result = await db
      .select({
        actionPlan: actionPlans,
        assignee: users,
        incident: incidents,
        center: centers,
        incidentType: incidentTypes
      })
      .from(actionPlans)
      .leftJoin(users, eq(actionPlans.assigneeId, users.id))
      .leftJoin(incidents, eq(actionPlans.incidentId, incidents.id))
      .leftJoin(centers, eq(incidents.centerId, centers.id))
      .leftJoin(incidentTypes, eq(incidents.typeId, incidentTypes.id))
      .where(eq(incidents.centerId, centerId))
      .orderBy(desc(actionPlans.createdAt));

    // Procesar cada plan para incluir estadísticas y participantes
    const plansWithDetails = [];
    for (const row of result) {
      // Obtener participantes del plan
      const participants = await db
        .select()
        .from(actionPlanParticipants)
        .leftJoin(users, eq(actionPlanParticipants.userId, users.id))
        .where(eq(actionPlanParticipants.actionPlanId, row.actionPlan.id));

      // Obtener estadísticas de tareas
      const allTasks = await db
        .select()
        .from(actionPlanTasks)
        .where(eq(actionPlanTasks.actionPlanId, row.actionPlan.id));

      const completedTasks = allTasks.filter(t => t.status === 'completed');
      
      // Obtener número de comentarios
      const comments = await db
        .select()
        .from(actionPlanComments)
        .where(eq(actionPlanComments.actionPlanId, row.actionPlan.id));

      // Calcular progreso
      const progress = allTasks.length > 0 
        ? Math.round((completedTasks.length / allTasks.length) * 100) 
        : 0;

      plansWithDetails.push({
        id: row.actionPlan.id,
        title: row.actionPlan.title,
        description: row.actionPlan.description,
        status: row.actionPlan.status,
        dueDate: row.actionPlan.dueDate,
        createdAt: row.actionPlan.createdAt,
        completedAt: row.actionPlan.completedAt,
        assignee: row.assignee ? {
          id: row.assignee.id,
          firstName: row.assignee.firstName,
          lastName: row.assignee.lastName,
          email: row.assignee.email,
        } : null,
        incident: row.incident ? {
          id: row.incident.id,
          incidentNumber: row.incident.incidentNumber,
          title: row.incident.title,
          status: row.incident.status,
          priority: row.incident.priority,
          type: row.incidentType,
        } : null,
        participants: participants.map(p => ({
          id: p.action_plan_participants.id,
          userId: p.action_plan_participants.userId,
          role: p.action_plan_participants.role,
          user: p.users,
        })),
        _count: {
          tasks: allTasks.length,
          completedTasks: completedTasks.length,
          comments: comments.length,
        },
        progress,
      });
    }

    return plansWithDetails;
  } catch (error) {
    console.error('Error getting action plans by center:', error);
    throw error;
  }
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

      // Get action plans - ESTA LÍNEA FALTABA
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

      // Procesar action plans con participantes
      const actionPlansWithParticipants = [];
      for (const planRow of actionPlansResult) {
        // Obtener participantes del plan
        const planParticipants = await db
          .select()
          .from(actionPlanParticipants)
          .leftJoin(users, eq(actionPlanParticipants.userId, users.id))
          .where(eq(actionPlanParticipants.actionPlanId, planRow.action_plans.id));

        actionPlansWithParticipants.push({
          ...planRow.action_plans,
          assignee: planRow.users!,
          participants: planParticipants.map(p => ({
            ...p.action_plan_participants,
            user: p.users!
          }))
        });
      }

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
        actionPlans: actionPlansWithParticipants,
        history: historyResult.map(h => ({
          ...h.incident_history,
          user: h.users || undefined
        }))
      });
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

// server/storage.ts - Métodos corregidos para planes de acción

// Agregar estos métodos a la clase Storage


async getActionPlanById(planId: string) {
  try {
    const result = await db
      .select()
      .from(actionPlans)
      .leftJoin(users, eq(actionPlans.assigneeId, users.id))
      .leftJoin(incidents, eq(actionPlans.incidentId, incidents.id))
      .where(eq(actionPlans.id, planId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const planRow = result[0];

    // Obtener participantes
    const participants = await db
      .select()
      .from(actionPlanParticipants)
      .leftJoin(users, eq(actionPlanParticipants.userId, users.id))
      .where(eq(actionPlanParticipants.actionPlanId, planId));

    return {
      ...planRow.action_plans,
      assignee: planRow.users,
      incident: planRow.incidents,
      participants: participants.map(p => ({
        ...p.action_plan_participants,
        user: p.users
      }))
    };
  } catch (error) {
    console.error('Error fetching action plan by id:', error);
    throw error;
  }
}

async updateActionPlanStatus(planId: string, updateData: {
  status: "pending" | "in_progress" | "completed" | "overdue";
  completedAt?: Date | null;
  updatedBy: string;
}) {
  try {
    // Usar el tipo correcto para el status
    const updateObject: any = {
      status: updateData.status,
      updatedAt: new Date()
    };

    // Solo agregar completedAt si se proporciona
    if (updateData.completedAt !== undefined) {
      updateObject.completedAt = updateData.completedAt;
    }

    await db
      .update(actionPlans)
      .set(updateObject)
      .where(eq(actionPlans.id, planId));

    // Registrar en historial si existe tabla de historial para planes
    // Si no existe, considera agregar esta funcionalidad

    return await this.getActionPlanById(planId);
  } catch (error) {
    console.error('Error updating action plan status:', error);
    throw error;
  }
}

// Obtener detalles completos de un plan de acción
async getActionPlanWithDetails(actionPlanId: string, userId: string) {
  try {
    // Usar la función de verificación actualizada
    const hasAccess = await this.userHasAccessToActionPlan(actionPlanId, userId);
    if (!hasAccess) {
      console.log('❌ User has no access to plan:', { actionPlanId, userId });
      return null;
    }

    // Obtener plan completo con relaciones
    const planData = await db
      .select()
      .from(actionPlans)
      .innerJoin(users, eq(actionPlans.assigneeId, users.id))
      .leftJoin(incidents, eq(actionPlans.incidentId, incidents.id))
      .leftJoin(centers, eq(incidents.centerId, centers.id))
      .leftJoin(incidentTypes, eq(incidents.typeId, incidentTypes.id))
      .where(eq(actionPlans.id, actionPlanId))
      .limit(1);

    if (planData.length === 0) {
      return null;
    }

    const plan = planData[0];

    // Verificar que tenemos los datos necesarios
    if (!plan.users) {
      throw new Error(`No user found for action plan ${actionPlanId}`);
    }

    // Obtener participantes del plan
    const participantsData = await db
      .select()
      .from(actionPlanParticipants)
      .innerJoin(users, eq(actionPlanParticipants.userId, users.id))
      .where(eq(actionPlanParticipants.actionPlanId, actionPlanId));

    // Obtener tareas
    const tasks = await this.getActionPlanTasks(actionPlanId);

    // Obtener comentarios
    const comments = await this.getActionPlanComments(actionPlanId);

    // Calcular progreso
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

    // Determinar rol del usuario (más específico)
    let userRole = 'participant';
    if (plan.action_plans.assigneeId === userId) {
      userRole = 'responsible';
    } else if (plan.incidents?.reporterId === userId) {
      userRole = 'incident_reporter';
    } else if (plan.incidents?.assigneeId === userId) {
      userRole = 'incident_assignee';
    } else if (plan.centers?.managerId === userId) {
      userRole = 'center_manager';
    }

    return {
      id: plan.action_plans.id,
      title: plan.action_plans.title,
      description: plan.action_plans.description,
      status: plan.action_plans.status,
      dueDate: plan.action_plans.dueDate,
      createdAt: plan.action_plans.createdAt,
      responsible: {
        id: plan.users.id,
        name: `${plan.users.firstName} ${plan.users.lastName}`.trim(),
        email: plan.users.email,
      },
      participants: participantsData.map(p => ({
        id: p.users.id,
        name: `${p.users.firstName} ${p.users.lastName}`.trim(),
        email: p.users.email,
        role: p.action_plan_participants.role,
      })),
      tasks,
      comments,
      incident: plan.incidents ? {
        id: plan.incidents.id,
        title: plan.incidents.title,
        center: plan.centers?.name || 'Sin centro asignado',
      } : null,
      progress: Math.round(progress),
      userRole,
    };
  } catch (error) {
    console.error('Error getting action plan details:', error);
    throw error;
  }
}

async isUserResponsibleForActionPlan(actionPlanId: string, userId: string): Promise<boolean> {
  try {
    // Verificar si es el responsable directo
    const planResult = await db
      .select()
      .from(actionPlans)
      .where(
        and(
          eq(actionPlans.id, actionPlanId),
          eq(actionPlans.assigneeId, userId)
        )
      )
      .limit(1);

    if (planResult.length > 0) {
      return true;
    }

    // NUEVO: Verificar si es el manager del centro
    const planInfo = await db
      .select({
        centerId: incidents.centerId,
        centerManagerId: centers.managerId
      })
      .from(actionPlans)
      .leftJoin(incidents, eq(actionPlans.incidentId, incidents.id))
      .leftJoin(centers, eq(incidents.centerId, centers.id))
      .where(eq(actionPlans.id, actionPlanId))
      .limit(1);

    if (planInfo.length > 0 && planInfo[0].centerManagerId === userId) {
      console.log('✅ Center manager permission granted for action plan');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking user responsibility:', error);
    return false;
  }
}

// Verificar si el usuario tiene acceso al plan
// En server/storage.ts - Reemplazar userHasAccessToActionPlan

async userHasAccessToActionPlan(actionPlanId: string, userId: string): Promise<boolean> {
  try {
    console.log('🔐 Checking access:', { actionPlanId, userId });
    
    // Obtener información del plan y la incidencia
    const planInfo = await db
      .select({
        planId: actionPlans.id,
        planAssigneeId: actionPlans.assigneeId,
        incidentId: actionPlans.incidentId,
        incidentReporterId: incidents.reporterId,
        incidentAssigneeId: incidents.assigneeId,
        centerId: incidents.centerId,
        centerManagerId: centers.managerId
      })
      .from(actionPlans)
      .leftJoin(incidents, eq(actionPlans.incidentId, incidents.id))
      .leftJoin(centers, eq(incidents.centerId, centers.id))
      .where(eq(actionPlans.id, actionPlanId))
      .limit(1);

    if (planInfo.length === 0) {
      console.log('❌ Plan not found');
      return false;
    }

    const plan = planInfo[0];
    console.log('📋 Plan info:', { 
      centerId: plan.centerId,
      centerManagerId: plan.centerManagerId,
      incidentReporterId: plan.incidentReporterId,
      incidentAssigneeId: plan.incidentAssigneeId,
      planAssigneeId: plan.planAssigneeId
    });

    // Verificar acceso directo (responsable del plan, reportero, asignado de incidencia)
    if (plan.planAssigneeId === userId || 
        plan.incidentReporterId === userId || 
        plan.incidentAssigneeId === userId ||
        plan.centerManagerId === userId) {
      console.log('✅ Direct access granted');
      return true;
    }

    // Verificar si es participante del plan
    const planParticipants = await db
      .select()
      .from(actionPlanParticipants)
      .where(
        and(
          eq(actionPlanParticipants.actionPlanId, actionPlanId),
          eq(actionPlanParticipants.userId, userId)
        )
      )
      .limit(1);

    if (planParticipants.length > 0) {
      console.log('✅ Plan participant access granted');
      return true;
    }

    // Verificar si es manager del centro usando isManagerOfCenter
    if (plan.centerId) {
      const isManager = await this.isManagerOfCenter(userId, plan.centerId);
      console.log('🏢 Manager check:', { userId, centerId: plan.centerId, isManager });
      
      if (isManager) {
        console.log('✅ Center manager access granted');
        return true;
      }
    }

    console.log('❌ No access found');
    return false;
  } catch (error) {
    console.error('💥 Error checking user access:', error);
    return false;
  }
}
// Agregar tarea a plan de acción
async addActionPlanTask(taskData: {
  actionPlanId: string;
  title: string;
  description: string;
  dueDate: Date;
  assigneeId: string;
  createdBy: string;
}) {
  try {
    const newTask = await db
      .insert(actionPlanTasks)
      .values({
        id: crypto.randomUUID(),
        actionPlanId: taskData.actionPlanId,
        title: taskData.title,
        description: taskData.description,
        dueDate: taskData.dueDate,
        status: 'pending',
        assigneeId: taskData.assigneeId,
        createdBy: taskData.createdBy,
        createdAt: new Date(),
      })
      .returning();

    // Actualizar progreso del plan
    await this.updateActionPlanProgress(taskData.actionPlanId);

    return newTask[0];
  } catch (error) {
    console.error('Error adding action plan task:', error);
    throw error;
  }
}

// Obtener tareas de un plan de acción
async getActionPlanTasks(actionPlanId: string) {
  try {
    const tasks = await db
      .select()
      .from(actionPlanTasks)
      .innerJoin(users, eq(actionPlanTasks.assigneeId, users.id)) // Cambiar a innerJoin
      .where(eq(actionPlanTasks.actionPlanId, actionPlanId))
      .orderBy(actionPlanTasks.createdAt);

    // Para cada tarea, obtener evidencia
    const tasksWithEvidence = [];
    for (const taskRow of tasks) {
      const evidence = await db
        .select()
        .from(taskEvidence)
        .where(eq(taskEvidence.taskId, taskRow.action_plan_tasks.id));

      tasksWithEvidence.push({
        id: taskRow.action_plan_tasks.id,
        title: taskRow.action_plan_tasks.title,
        description: taskRow.action_plan_tasks.description,
        dueDate: taskRow.action_plan_tasks.dueDate,
        status: taskRow.action_plan_tasks.status,
        assigneeId: taskRow.action_plan_tasks.assigneeId,
        assigneeName: `${taskRow.users.firstName} ${taskRow.users.lastName}`.trim(),
        evidence: evidence.map(e => ({
          id: e.id,
          filename: e.filename,
          url: e.url,
          uploadedAt: e.uploadedAt,
          uploadedBy: e.uploadedBy,
        })),
        completedAt: taskRow.action_plan_tasks.completedAt,
        completedBy: taskRow.action_plan_tasks.completedBy,
        createdAt: taskRow.action_plan_tasks.createdAt,
      });
    }

    return tasksWithEvidence;
  } catch (error) {
    console.error('Error getting action plan tasks:', error);
    throw error;
  }
}

// Verificar si el usuario puede completar una tarea
async canUserCompleteTask(taskId: string, userId: string): Promise<boolean> {
  try {
    // Verificar si es el asignado a la tarea o el responsable del plan
    const result = await db
      .select({
        taskAssigneeId: actionPlanTasks.assigneeId,
        planAssigneeId: actionPlans.assigneeId,
        centerId: incidents.centerId,
        centerManagerId: centers.managerId
      })
      .from(actionPlanTasks)
      .leftJoin(actionPlans, eq(actionPlanTasks.actionPlanId, actionPlans.id))
      .leftJoin(incidents, eq(actionPlans.incidentId, incidents.id))
      .leftJoin(centers, eq(incidents.centerId, centers.id))
      .where(eq(actionPlanTasks.id, taskId))
      .limit(1);

    if (result.length === 0) {
      return false;
    }

    const task = result[0];

    // Puede completar si es:
    // 1. El asignado a la tarea
    // 2. El responsable del plan
    // 3. El manager del centro
    return (
      task.taskAssigneeId === userId ||
      task.planAssigneeId === userId ||
      task.centerManagerId === userId
    );
  } catch (error) {
    console.error('Error checking task completion permission:', error);
    return false;
  }
}

// Actualizar tarea
async updateActionPlanTask(taskId: string, updates: {
  status?: string;
  completedAt?: Date | null;
  completedBy?: string | null;
  evidence?: string[];
  assigneeId?: string;
}) {
  try {
    const updatedTask = await db
      .update(actionPlanTasks)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(actionPlanTasks.id, taskId))
      .returning();

    // Si se agrega evidencia, guardarla
    if (updates.evidence && updates.evidence.length > 0) {
      for (const evidenceUrl of updates.evidence) {
        await db.insert(taskEvidence).values({
          id: crypto.randomUUID(),
          taskId,
          filename: evidenceUrl.split('/').pop() || 'evidence',
          url: evidenceUrl,
          uploadedAt: new Date(),
          uploadedBy: updates.completedBy || '',
        });
      }
    }

    return updatedTask[0];
  } catch (error) {
    console.error('Error updating action plan task:', error);
    throw error;
  }
}


async updateActionPlanProgress(actionPlanId: string) {
  try {
    const tasks = await db
      .select()
      .from(actionPlanTasks)
      .where(eq(actionPlanTasks.actionPlanId, actionPlanId));

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

    // Actualizar estado del plan si es necesario
    let newStatus: typeof actionPlans.status.enumValues[number] = 'pending';
    if (progress === 100) {
      newStatus = 'completed';
    } else if (progress > 0) {
      newStatus = 'in_progress';
    }

    await db
      .update(actionPlans)
      .set({
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(actionPlans.id, actionPlanId));

  } catch (error) {
    console.error('Error updating action plan progress:', error);
    throw error;
  }
}
// Agregar comentario al plan de acción
async addActionPlanComment(commentData: {
  actionPlanId: string;
  content: string;
  authorId: string;
  attachments?: string[];
}) {
  try {
    const newComment = await db
      .insert(actionPlanComments)
      .values({
        id: crypto.randomUUID(),
        actionPlanId: commentData.actionPlanId,
        content: commentData.content,
        authorId: commentData.authorId,
        createdAt: new Date(),
      })
      .returning();

    // Si hay archivos adjuntos, guardarlos
    if (commentData.attachments && commentData.attachments.length > 0) {
      for (const attachmentUrl of commentData.attachments) {
        await db.insert(commentAttachments).values({
          id: crypto.randomUUID(),
          commentId: newComment[0].id,
          filename: attachmentUrl.split('/').pop() || 'attachment',
          url: attachmentUrl,
          uploadedAt: new Date(),
          uploadedBy: commentData.authorId,
        });
      }
    }

    return newComment[0];
  } catch (error) {
    console.error('Error adding action plan comment:', error);
    throw error;
  }
}

// Obtener comentarios del plan de acción
async getActionPlanComments(actionPlanId: string) {
  try {
    const comments = await db
      .select()
      .from(actionPlanComments)
      .leftJoin(users, eq(actionPlanComments.authorId, users.id))
      .where(eq(actionPlanComments.actionPlanId, actionPlanId))
      .orderBy(desc(actionPlanComments.createdAt));

    // Para cada comentario, obtener archivos adjuntos
    const commentsWithAttachments = [];
    for (const commentRow of comments) {
      const attachments = await db
        .select()
        .from(commentAttachments)
        .where(eq(commentAttachments.commentId, commentRow.action_plan_comments.id));

      commentsWithAttachments.push({
        id: commentRow.action_plan_comments.id,
        content: commentRow.action_plan_comments.content,
        authorId: commentRow.action_plan_comments.authorId,
        authorName: commentRow.users 
          ? `${commentRow.users.firstName} ${commentRow.users.lastName}`.trim()
          : 'Usuario eliminado',
        createdAt: commentRow.action_plan_comments.createdAt,
        attachments: attachments.map(a => ({
          id: a.id,
          filename: a.filename,
          url: a.url,
          uploadedAt: a.uploadedAt,
          uploadedBy: a.uploadedBy,
        })),
      });
    }

    return commentsWithAttachments;
  } catch (error) {
    console.error('Error getting action plan comments:', error);
    throw error;
  }
}

// Actualizar plan de acción
async updateActionPlan(actionPlanId: string, updates: {
  status?: typeof actionPlans.status.enumValues[number];
  completedAt?: Date | null;
  completedBy?: string | null;
}) {
  try {
    const updatedPlan = await db
      .update(actionPlans)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(actionPlans.id, actionPlanId))
      .returning();

    return updatedPlan[0];
  } catch (error) {
    console.error('Error updating action plan:', error);
    throw error;
  }
}

// Verificar si todas las tareas están completadas
async areAllTasksCompleted(actionPlanId: string): Promise<boolean> {
  try {
    const tasks = await db
      .select()
      .from(actionPlanTasks)
      .where(eq(actionPlanTasks.actionPlanId, actionPlanId));

    if (tasks.length === 0) {
      return true; // No hay tareas, consideramos que está "completado"
    }

    return tasks.every(task => task.status === 'completed');
  } catch (error) {
    console.error('Error checking if all tasks are completed:', error);
    return false;
  }
}

async getIncidentComments(incidentId: string) {
  return await db
    .select({
      id: incidentComments.id,
      content: incidentComments.content,
      createdAt: incidentComments.createdAt,
      updatedAt: incidentComments.updatedAt,
      author: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      },
    })
    .from(incidentComments)
    .leftJoin(users, eq(incidentComments.authorId, users.id))
    .where(eq(incidentComments.incidentId, incidentId))
    .orderBy(asc(incidentComments.createdAt));
}

/**
 * Crear un nuevo comentario para una incidencia
 */
async createIncidentComment(data: {
  incidentId: string;
  content: string;
  authorId: string;
}) {
  const commentId = crypto.randomUUID();
  
  const [comment] = await db
    .insert(incidentComments)
    .values({
      id: commentId,
      incidentId: data.incidentId,
      content: data.content,
      authorId: data.authorId,
    })
    .returning();

  // Obtener el comentario completo con datos del autor
  const fullComment = await db
    .select({
      id: incidentComments.id,
      content: incidentComments.content,
      createdAt: incidentComments.createdAt,
      updatedAt: incidentComments.updatedAt,
      author: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      },
    })
    .from(incidentComments)
    .innerJoin(users, eq(incidentComments.authorId, users.id))
    .where(eq(incidentComments.id, commentId));

  return fullComment[0];
}


/**
 * Actualizar un comentario existente
 */
async updateIncidentComment(commentId: string, content: string) {
  const [updatedComment] = await db
    .update(incidentComments)
    .set({ 
      content,
      updatedAt: new Date(),
    })
    .where(eq(incidentComments.id, commentId))
    .returning();

  return updatedComment;
}

/**
 * Eliminar un comentario
 */
async deleteIncidentComment(commentId: string) {
  await db
    .delete(incidentComments)
    .where(eq(incidentComments.id, commentId));
}

/**
 * Verificar si un usuario puede acceder a los comentarios de una incidencia
 */

async userCanAccessIncidentComments(incidentId: string, userId: string): Promise<boolean> {
  // Usar la lógica existente de acceso a incidencias
  const incident = await this.getIncidentById(incidentId);
  if (!incident) return false;

  const user = await this.getUser(userId);
  if (!user) return false;

  // Admin tiene acceso total
  if (user.role === 'admin') return true;

  // El reporter, assignee tiene acceso
  if (incident.reporterId === userId || incident.assigneeId === userId) {
    return true;
  }

  // Manager tiene acceso si es manager del centro
  if (user.role === 'manager' && incident.centerId) {
    return await this.isManagerOfCenter(userId, incident.centerId);
  }

  return false;
}

// 2. Función helper para registrar en historial (storage.ts)
async logIncidentAction(
  incidentId: string, 
  userId: string, 
  action: string, 
  description: string, 
  metadata?: any
) {
  try {
    await db.insert(incidentHistory).values({
      incidentId,
      userId,
      action,
      description,
      metadata: metadata ? JSON.stringify(metadata) : null
    });
  } catch (error) {
    console.error('Error logging incident action:', error);
  }
}
// Eliminar tarea
async deleteActionPlanTask(taskId: string) {
  try {
    // Primero eliminar evidencia relacionada
    await db
      .delete(taskEvidence)
      .where(eq(taskEvidence.taskId, taskId));

    // Luego eliminar la tarea
    await db
      .delete(actionPlanTasks)
      .where(eq(actionPlanTasks.id, taskId));

  } catch (error) {
    console.error('Error deleting action plan task:', error);
    throw error;
  }
}

// Actualizar getActionPlansByUser para incluir estadísticas
async getActionPlansByUser(userId: string) {
  try {
    // Obtener planes donde el usuario es responsable
    const assignedPlans = await db
      .select()
      .from(actionPlans)
      .leftJoin(users, eq(actionPlans.assigneeId, users.id))
      .leftJoin(incidents, eq(actionPlans.incidentId, incidents.id))
      .leftJoin(centers, eq(incidents.centerId, centers.id))
      .leftJoin(incidentTypes, eq(incidents.typeId, incidentTypes.id))
      .where(eq(actionPlans.assigneeId, userId))
      .orderBy(desc(actionPlans.createdAt));

    // Obtener planes donde el usuario es participante
    const participantPlans = await db
      .select()
      .from(actionPlans)
      .leftJoin(actionPlanParticipants, eq(actionPlanParticipants.actionPlanId, actionPlans.id))
      .leftJoin(users, eq(actionPlans.assigneeId, users.id))
      .leftJoin(incidents, eq(actionPlans.incidentId, incidents.id))
      .leftJoin(centers, eq(incidents.centerId, centers.id))
      .leftJoin(incidentTypes, eq(incidents.typeId, incidentTypes.id))
      .where(eq(actionPlanParticipants.userId, userId))
      .orderBy(desc(actionPlans.createdAt));

    // Combinar y eliminar duplicados
    const allPlans = [...assignedPlans, ...participantPlans];
    const uniquePlans = allPlans.filter((plan, index, self) => 
      index === self.findIndex(p => p.action_plans.id === plan.action_plans.id)
    );

    // Procesar cada plan para incluir estadísticas y participantes
    const plansWithDetails = [];
    for (const planRow of uniquePlans) {
      // Obtener participantes del plan
      const planParticipants = await db
        .select()
        .from(actionPlanParticipants)
        .leftJoin(users, eq(actionPlanParticipants.userId, users.id))
        .where(eq(actionPlanParticipants.actionPlanId, planRow.action_plans.id));

      // Obtener estadísticas de tareas
      const allTasks = await db
        .select()
        .from(actionPlanTasks)
        .where(eq(actionPlanTasks.actionPlanId, planRow.action_plans.id));

      const completedTasks = allTasks.filter(t => t.status === 'completed');
      
      // Obtener número de comentarios
      const comments = await db
        .select()
        .from(actionPlanComments)
        .where(eq(actionPlanComments.actionPlanId, planRow.action_plans.id));

      // Calcular progreso
      const progress = allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;

      plansWithDetails.push({
        ...planRow.action_plans,
        assignee: planRow.users,
        incident: {
          ...planRow.incidents,
          center: planRow.centers,
          type: planRow.incident_types
        },
        participants: planParticipants.map(p => ({
          ...p.action_plan_participants,
          user: p.users
        })),
        // Indicar el rol del usuario en este plan
        userRole: planRow.action_plans.assigneeId === userId ? 'responsible' : 'participant',
        // Estadísticas
        _count: {
          tasks: allTasks.length,
          completedTasks: completedTasks.length,
          comments: comments.length,
        },
        progress,
      });
    }

    return plansWithDetails;
  } catch (error) {
    console.error('Error getting action plans by user:', error);
    throw error;
  }
}

async closeIncidentActionPlansAndTasks(incidentId: string, userId: string): Promise<{
  actionPlansCount: number;
  tasksCount: number;
}> {
  try {
    console.log(`🔒 Cerrando planes y tareas para incidencia ${incidentId}...`);
    
    let closedPlansCount = 0;
    let closedTasksCount = 0;
    
    // Obtener todos los planes de acción de la incidencia
    const actionPlansList = await this.getActionPlansByIncident(incidentId);
    
    for (const plan of actionPlansList) {
      // Solo cerrar planes que no estén ya completados
      if (plan.status !== 'completed') {
        // Primero cerrar todas las tareas del plan
        const tasksList = await this.getActionPlanTasks(plan.id);
        
        for (const task of tasksList) {
          if (task.status !== 'completed') {
            await db
              .update(actionPlanTasks)  // Usar la tabla importada
              .set({
                status: 'completed',
                completedAt: new Date(),
                completedBy: userId,
                updatedAt: new Date()
              })
              .where(eq(actionPlanTasks.id, task.id));
            
            closedTasksCount++;
            console.log(`✅ Tarea "${task.title}" (${task.id}) cerrada`);
          }
        }
        
        // Luego cerrar el plan de acción
        await db
          .update(actionPlans)  // Usar la tabla importada
          .set({
            status: 'completed',
            completedAt: new Date(),
            completedBy: userId,
            updatedAt: new Date()
          })
          .where(eq(actionPlans.id, plan.id));
        
        closedPlansCount++;
        console.log(`✅ Plan de acción "${plan.title}" (${plan.id}) cerrado`);
      }
    }
    
    console.log(`✅ Cierre completado: ${closedPlansCount} planes y ${closedTasksCount} tareas`);
    
    return {
      actionPlansCount: closedPlansCount,
      tasksCount: closedTasksCount
    };
  } catch (error) {
    console.error('Error cerrando planes y tareas:', error);
    throw error;
  }
}


}

export const storage = new DatabaseStorage();
