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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, count, sql } from "drizzle-orm";

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
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

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
  async getIncidents(filters?: {
    status?: string;
    priority?: string;
    centerId?: string;
    assigneeId?: string;
    reporterId?: string;
  }): Promise<IncidentWithDetails[]> {
    let query = db
      .select()
      .from(incidents)
      .leftJoin(users, eq(incidents.reporterId, users.id))
      .leftJoin(centers, eq(incidents.centerId, centers.id))
      .leftJoin(incidentTypes, eq(incidents.typeId, incidentTypes.id))
      .orderBy(desc(incidents.createdAt));

    if (filters) {
      const conditions = [];
      if (filters.status) conditions.push(eq(incidents.status, filters.status as any));
      if (filters.priority) conditions.push(eq(incidents.priority, filters.priority as any));
      if (filters.centerId) conditions.push(eq(incidents.centerId, filters.centerId));
      if (filters.assigneeId) conditions.push(eq(incidents.assigneeId, filters.assigneeId));
      if (filters.reporterId) conditions.push(eq(incidents.reporterId, filters.reporterId));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
    }

    const result = await query;

    // Transform the result to include related data
    const incidentsMap = new Map<string, any>();
    
    for (const row of result) {
      const incident = row.incidents;
      if (!incidentsMap.has(incident.id)) {
        incidentsMap.set(incident.id, {
          ...incident,
          reporter: row.users,
          center: row.centers,
          type: row.incident_types,
          participants: [],
          actionPlans: [],
          history: []
        });
      }
    }

    // Fetch participants, action plans, and history for each incident
    for (const [incidentId, incident] of Array.from(incidentsMap.entries())) {
      // Get participants
      const participantsResult = await db
        .select()
        .from(incidentParticipants)
        .leftJoin(users, eq(incidentParticipants.userId, users.id))
        .where(eq(incidentParticipants.incidentId, incidentId));

      incident.participants = participantsResult.map(row => ({
        ...row.incident_participants,
        user: row.users
      }));

      // Get action plans
      const actionPlansResult = await db
        .select()
        .from(actionPlans)
        .leftJoin(users, eq(actionPlans.assigneeId, users.id))
        .where(eq(actionPlans.incidentId, incidentId));

      incident.actionPlans = actionPlansResult.map(row => ({
        ...row.action_plans,
        assignee: row.users
      }));

      // Get history
      const historyResult = await db
        .select()
        .from(incidentHistory)
        .leftJoin(users, eq(incidentHistory.userId, users.id))
        .where(eq(incidentHistory.incidentId, incidentId))
        .orderBy(desc(incidentHistory.createdAt));

      incident.history = historyResult.map(row => ({
        ...row.incident_history,
        user: row.users
      }));
    }

    return Array.from(incidentsMap.values());
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
      .values(actionPlan)
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

  // History operations
  async addIncidentHistory(history: InsertIncidentHistory): Promise<IncidentHistory> {
    const [newHistory] = await db
      .insert(incidentHistory)
      .values(history)
      .returning();

    return newHistory;
  }

  // Dashboard statistics
  async getDashboardStats(userId?: string): Promise<{
    totalIncidents: number;
    inProgress: number;
    completed: number;
    avgResolutionTime: number;
  }> {
    let baseQuery = db.select().from(incidents);
    
    if (userId) {
      baseQuery = baseQuery.where(
        or(
          eq(incidents.reporterId, userId),
          eq(incidents.assigneeId, userId),
          eq(incidents.supervisorId, userId)
        )
      ) as any;
    }

    // Total incidents
    const totalResult = await db
      .select({ count: count() })
      .from(incidents)
      .where(userId ? or(
        eq(incidents.reporterId, userId),
        eq(incidents.assigneeId, userId),
        eq(incidents.supervisorId, userId)
      ) : undefined);

    // In progress incidents
    const inProgressResult = await db
      .select({ count: count() })
      .from(incidents)
      .where(
        and(
          eq(incidents.status, "in_progress"),
          userId ? or(
            eq(incidents.reporterId, userId),
            eq(incidents.assigneeId, userId),
            eq(incidents.supervisorId, userId)
          ) : sql`true`
        )
      );

    // Completed incidents
    const completedResult = await db
      .select({ count: count() })
      .from(incidents)
      .where(
        and(
          eq(incidents.status, "completed"),
          userId ? or(
            eq(incidents.reporterId, userId),
            eq(incidents.assigneeId, userId),
            eq(incidents.supervisorId, userId)
          ) : sql`true`
        )
      );

    // Calculate average resolution time (in days)
    const completedIncidents = await db
      .select({
        createdAt: incidents.createdAt,
        actualResolutionDate: incidents.actualResolutionDate
      })
      .from(incidents)
      .where(
        and(
          eq(incidents.status, "completed"),
          sql`actual_resolution_date IS NOT NULL`,
          userId ? or(
            eq(incidents.reporterId, userId),
            eq(incidents.assigneeId, userId),
            eq(incidents.supervisorId, userId)
          ) : sql`true`
        )
      );

    let avgResolutionTime = 0;
    if (completedIncidents.length > 0) {
      const totalDays = completedIncidents.reduce((sum, incident) => {
        const created = new Date(incident.createdAt!);
        const resolved = new Date(incident.actualResolutionDate!);
        const diffTime = Math.abs(resolved.getTime() - created.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return sum + diffDays;
      }, 0);
      avgResolutionTime = totalDays / completedIncidents.length;
    }

    return {
      totalIncidents: totalResult[0].count,
      inProgress: inProgressResult[0].count,
      completed: completedResult[0].count,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10, // Round to 1 decimal place
    };
  }
}

export const storage = new DatabaseStorage();
