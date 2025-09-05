import { sql, relations } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp, 
  uuid, 
  pgEnum, 
  integer,
  jsonb,
  index
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const userRoleEnum = pgEnum("user_role", [
  "user", 
  "manager", 
  "department", 
  "supervisor", 
  "admin"
]);

// Incident status enum
export const incidentStatusEnum = pgEnum("incident_status", [
  "reported",
  "assigned", 
  "in_progress",
  "pending_approval",
  "completed",
  "closed"
]);

// Incident priority enum
export const incidentPriorityEnum = pgEnum("incident_priority", [
  "low",
  "medium", 
  "high",
  "critical"
]);

// Action plan status enum
export const actionStatusEnum = pgEnum("action_status", [
  "pending",
  "in_progress", 
  "completed",
  "overdue"
]);

// Users table
export const users = pgTable("users", (): {
  id: ReturnType<typeof varchar>;
  email: ReturnType<typeof varchar>;
  password: ReturnType<typeof varchar>;
  firstName: ReturnType<typeof varchar>;
  lastName: ReturnType<typeof varchar>;
  profileImageUrl: ReturnType<typeof varchar>;
  role: ReturnType<typeof userRoleEnum>;
  department: ReturnType<typeof varchar>;
  departmentId: ReturnType<typeof uuid>;
  location: ReturnType<typeof varchar>;
  centerId: ReturnType<typeof uuid>;
  createdAt: ReturnType<typeof timestamp>;
  updatedAt: ReturnType<typeof timestamp>;
} => ({
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default("user").notNull(),
  department: varchar("department"),
  departmentId: uuid("department_id").references(() => departments.id), 
  location: varchar("location"),
  centerId: uuid("center_id").references(() => centers.id), // <-- NUEVO CAMPO
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}));

export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).unique().notNull(),
  description: text("description"),
  headUserId: varchar("head_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Centers/Stores table
export const centers = pgTable("centers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).unique().notNull(),
  address: text("address"),
  managerId: varchar("manager_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});



// Incident types table
export const incidentTypes = pgTable("incident_types", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  defaultResolutionDays: integer("default_resolution_days").default(7),
  createdAt: timestamp("created_at").defaultNow(),
});

// Main incidents table
export const incidents = pgTable("incidents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentNumber: varchar("incident_number").unique().notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  status: incidentStatusEnum("status").default("reported").notNull(),
  priority: incidentPriorityEnum("priority").default("medium").notNull(),
  
  // Relationships
  reporterId: varchar("reporter_id").references(() => users.id).notNull(),
  centerId: uuid("center_id").references(() => centers.id).notNull(),
  typeId: uuid("type_id").references(() => incidentTypes.id).notNull(),
  assigneeId: varchar("assignee_id").references(() => users.id),
  supervisorId: varchar("supervisor_id").references(() => users.id),
  
  // Root cause analysis
  rootCause: text("root_cause"),
  
  // Time tracking
  theoreticalResolutionDate: timestamp("theoretical_resolution_date"),
  actualResolutionDate: timestamp("actual_resolution_date"),
  
  // Evidence
evidenceFiles: jsonb("evidence_files").$type<string[]>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Incident participants table
export const incidentParticipants = pgTable("incident_participants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: uuid("incident_id").references(() => incidents.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  role: varchar("role").default("participant").notNull(), // participant, responsible, supervisor
  createdAt: timestamp("created_at").defaultNow(),
});

// Action plans table
export const actionPlans = pgTable("action_plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: uuid("incident_id").references(() => incidents.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  status: actionStatusEnum("status").default("pending").notNull(),
  
  // Assignment
  assigneeId: varchar("assignee_id").references(() => users.id).notNull(),
  departmentId: varchar("department_id"),
  
  // Timeline
  dueDate: timestamp("due_date").notNull(),
  completedAt: timestamp("completed_at"),
  

  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Incident timeline/history table
export const incidentHistory = pgTable("incident_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: uuid("incident_id").references(() => incidents.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(), // status_change, assignment, comment, etc.
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  reportedIncidents: many(incidents, { relationName: "reporter" }),
  assignedIncidents: many(incidents, { relationName: "assignee" }),
  supervisedIncidents: many(incidents, { relationName: "supervisor" }),
  managedCenters: many(centers),
  participations: many(incidentParticipants),
  actionPlans: many(actionPlans),
  historyEntries: many(incidentHistory),
   department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  center: one(centers, {
    fields: [users.centerId],
    references: [centers.id],
  }),
  headedDepartment: one(departments, {
    fields: [users.id],
    references: [departments.headUserId],
  }),
}));

export const centersRelations = relations(centers, ({ one, many }) => ({
  manager: one(users, {
    fields: [centers.managerId],
    references: [users.id],
  }),
  incidents: many(incidents),
}));

export const incidentTypesRelations = relations(incidentTypes, ({ many }) => ({
  incidents: many(incidents),
}));

export const incidentsRelations = relations(incidents, ({ one, many }) => ({
  reporter: one(users, {
    fields: [incidents.reporterId],
    references: [users.id],
    relationName: "reporter",
  }),
  assignee: one(users, {
    fields: [incidents.assigneeId],
    references: [users.id],
    relationName: "assignee",
  }),
  supervisor: one(users, {
    fields: [incidents.supervisorId],
    references: [users.id],
    relationName: "supervisor",
  }),
  center: one(centers, {
    fields: [incidents.centerId],
    references: [centers.id],
  }),
  type: one(incidentTypes, {
    fields: [incidents.typeId],
    references: [incidentTypes.id],
  }),
  participants: many(incidentParticipants),
  actionPlans: many(actionPlans),
  history: many(incidentHistory),
}));

export const incidentParticipantsRelations = relations(incidentParticipants, ({ one }) => ({
  incident: one(incidents, {
    fields: [incidentParticipants.incidentId],
    references: [incidents.id],
  }),
  user: one(users, {
    fields: [incidentParticipants.userId],
    references: [users.id],
  }),
}));

export const actionPlansRelations = relations(actionPlans, ({ one }) => ({
  incident: one(incidents, {
    fields: [actionPlans.incidentId],
    references: [incidents.id],
  }),
  assignee: one(users, {
    fields: [actionPlans.assigneeId],
    references: [users.id],
  }),
}));

export const incidentHistoryRelations = relations(incidentHistory, ({ one }) => ({
  incident: one(incidents, {
    fields: [incidentHistory.incidentId],
    references: [incidents.id],
  }),
  user: one(users, {
    fields: [incidentHistory.userId],
    references: [users.id],
  }),
}));


export const insertCenterSchema = createInsertSchema(centers).omit({
  id: true,
  createdAt: true,
});

export const insertIncidentTypeSchema = createInsertSchema(incidentTypes).omit({
  id: true,
  createdAt: true,
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  incidentNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIncidentParticipantSchema = createInsertSchema(incidentParticipants).omit({
  id: true,
  createdAt: true,
});

export const insertActionPlanSchema = createInsertSchema(actionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIncidentHistorySchema = createInsertSchema(incidentHistory).omit({
  id: true,
  createdAt: true,
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateDepartmentSchema = insertDepartmentSchema.partial();

export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
  department: true,
  departmentId: true, // NUEVO
  location: true,
  centerId: true,
});

export const updateUserSchema = upsertUserSchema.partial().omit({ id: true });

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCenter = z.infer<typeof insertCenterSchema>;
export type Center = typeof centers.$inferSelect;
export type InsertIncidentType = z.infer<typeof insertIncidentTypeSchema>;
export type IncidentType = typeof incidentTypes.$inferSelect;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;
export type InsertIncidentParticipant = z.infer<typeof insertIncidentParticipantSchema>;
export type IncidentParticipant = typeof incidentParticipants.$inferSelect;
export type InsertActionPlan = z.infer<typeof insertActionPlanSchema>;
export type ActionPlan = typeof actionPlans.$inferSelect;
export type InsertIncidentHistory = z.infer<typeof insertIncidentHistorySchema>;
export type IncidentHistory = typeof incidentHistory.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type CreateDepartment = typeof departments.$inferInsert;
export type UpdateDepartment = Partial<CreateDepartment>;
export type UpdateUser = Partial<CreateUser>;
export type CreateCenter = typeof centers.$inferInsert;
export type UpdateCenter = Partial<CreateCenter>;

// Extended types with relations
export type IncidentWithDetails = Incident & {
  reporter: User;
  assignee?: User;
  supervisor?: User;
  center: Center;
  type: IncidentType;
  participants: (IncidentParticipant & { user: User })[];
  actionPlans: (ActionPlan & { assignee: User })[];
  history: (IncidentHistory & { user?: User })[];
};
export type CreateUser = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: "user" | "manager" | "department" | "supervisor" | "admin";
  department?: string;
  location?: string;
  centerId?: string; // <-- AGREGAR AQUÍ
};

// shared/schema.ts - Agregar al final del archivo, después de los tipos existentes

// Nuevo tipo: User con información del centro incluida
export type UserWithCenter = User & {
  center?: {
    id: string;
    name: string;
    code: string;
    address?: string | null; // Permitir null
  };
  departmentInfo?: {
    id: string;
    name: string;
    code: string;
  };
};