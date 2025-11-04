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
  index,
  boolean
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
  "admin",
  "inventory_auditor",      // NUEVO
  "inventory_coordinator",  // NUEVO
  "adjustment_approver"     // NUEVO
]);

// Incident status enum
export const incidentStatusEnum = pgEnum("incident_status", [
  "reportado",
  "asignado", 
  "en_proceso",
  "pendiente_aprobacion",
  "completado",
  "cerrado"
]);

// Incident priority enum
export const incidentPriorityEnum = pgEnum("incident_priority", [
  "baja",
  "media", 
  "alta",
  "critica"
]);

// Action plan status enum
export const actionStatusEnum = pgEnum("action_status", [
  "pendiente",
  "en_proceso", 
  "completado",
  "retrasado"
]);

// Inventory enums
export const inventoryRequestTypeEnum = pgEnum("inventory_request_type", [
  "manual",
  "automatic", 
  "division",
  "category",
  "group"
]);

export const inventoryRequestStatusEnum = pgEnum("inventory_request_status", [
  "draft",
  "sent",
  "in_progress",
  "completed",
  "cancelled"
]);

export const inventoryItemStatusEnum = pgEnum("inventory_item_status", [
  "pending",
  "assigned",
  "counted",
  "reviewing",
  "approved",
  "rejected",
  "audited",
  "sent_for_approval",
  "adjustment_approved",
  "adjustment_rejected",
  "adjusted"
]);

export const inventoryAdjustmentTypeEnum = pgEnum("inventory_adjustment_type", [
  "positive",
  "negative",
  "none"
]);

export const inventorySamplingTypeEnum = pgEnum("inventory_sampling_type", [
  "random",
  "manual",
  "mixed"
]);

export const auditDocumentStatusEnum = pgEnum("audit_document_status", [
  "draft",
  "in_progress",
  "completed",
  "approved",
  "rejected"
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected"
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
  description: text("description"),
  status: incidentStatusEnum("status").default("reportado").notNull(),
  priority: incidentPriorityEnum("priority").default("media").notNull(),
  
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
  status: actionStatusEnum("status").default("pendiente").notNull(),
  priority: incidentPriorityEnum("priority").default("media").notNull(),
  progress: integer('progress').default(0),
  
  // Assignment
  assigneeId: varchar("assignee_id").references(() => users.id).notNull(),
  departmentId: varchar("department_id"),
  
  // Timeline
  
  dueDate: timestamp("due_date").notNull(),
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by").references(() => users.id), // AGREGAR ESTA LÍNEA
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const actionPlanParticipants = pgTable("action_plan_participants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  actionPlanId: uuid("action_plan_id").references(() => actionPlans.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  role: varchar("role").default("participant").notNull(), // participant, reviewer, supervisor
  createdAt: timestamp("created_at").defaultNow(),
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


// server/schema.ts - Agregar estas tablas al esquema existente

// Tabla para tareas de planes de acción
export const actionPlanTasks = pgTable('action_plan_tasks', {
  id: text('id').primaryKey(),
  actionPlanId: text('action_plan_id').notNull().references(() => actionPlans.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').default(''),
  dueDate: timestamp('due_date').notNull(),
  status: text('status').notNull().default('pendiente'), 
  assigneeId: text('assignee_id').notNull().references(() => users.id),
  createdBy: text('created_by').notNull().references(() => users.id),
  completedAt: timestamp('completed_at'),
  completedBy: text('completed_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
});

// Tabla para evidencia de tareas
export const taskEvidence = pgTable('task_evidence', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => actionPlanTasks.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  url: text('url').notNull(),
  uploadedAt: timestamp('uploaded_at').notNull().default(sql`now()`),
  uploadedBy: text('uploaded_by').notNull().references(() => users.id),
});

// Tabla para comentarios de planes de acción
export const actionPlanComments = pgTable('action_plan_comments', {
  id: text('id').primaryKey(),
  actionPlanId: text('action_plan_id').notNull().references(() => actionPlans.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  authorId: text('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
});

// Tabla para archivos adjuntos de comentarios
export const commentAttachments = pgTable('comment_attachments', {
  id: text('id').primaryKey(),
  commentId: text('comment_id').notNull().references(() => actionPlanComments.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  url: text('url').notNull(),
  uploadedAt: timestamp('uploaded_at').notNull().default(sql`now()`),
  uploadedBy: text('uploaded_by').notNull().references(() => users.id),
});


export const incidentComments = pgTable("incident_comments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: uuid("incident_id").references(() => incidents.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Solicitudes de inventario
export const inventoryRequests = pgTable("inventory_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  requestNumber: varchar("request_number", { length: 50 }).unique().notNull(),
  requestType: inventoryRequestTypeEnum("request_type").notNull(),
  status: inventoryRequestStatusEnum("status").default("draft").notNull(),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Filtros
  filterDivisions: text("filter_divisions").array(),
  filterCategories: text("filter_categories").array(),
  filterGroups: text("filter_groups").array(),
  filterSpecificCodes: text("filter_specific_codes").array(),
  
  // Centros incluidos
  centers: uuid("centers").array().notNull(),
  
  // Metadata
  comments: text("comments"),
  attachmentFiles: text("attachment_files").array(),
  
  // Auditoría
  sentAt: timestamp("sent_at"),
  completedAt: timestamp("completed_at"),
});

// Items a contar
export const inventoryCountItems = pgTable("inventory_count_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: uuid("request_id").references(() => inventoryRequests.id, { onDelete: "cascade" }).notNull(),
  centerId: uuid("center_id").references(() => centers.id).notNull(),
  
  // Datos del producto (desde SQL Server)
  itemCode: varchar("item_code", { length: 50 }).notNull(),
  itemDescription: varchar("item_description", { length: 200 }),
  itemDescription2: varchar("item_description2", { length: 200 }),
  divisionCode: varchar("division_code", { length: 20 }),
  divisionName: varchar("division_name", { length: 100 }),
  categoryCode: varchar("category_code", { length: 20 }),
  categoryName: varchar("category_name", { length: 100 }),
  groupCode: varchar("group_code", { length: 20 }),
  groupName: varchar("group_name", { length: 100 }),
  subgroupCode: varchar("subgroup_code", { length: 20 }),
  subgroupName: varchar("subgroup_name", { length: 100 }),
  brandCode: varchar("brand_code", { length: 20 }),
  brandName: varchar("brand_name", { length: 100 }),
  
  // Inventario de sistema
  systemInventory: integer("system_inventory").notNull().default(0),
  unitMeasureCode: varchar("unit_measure_code", { length: 10 }),
  unitCost: integer("unit_cost").notNull().default(0), // Usar integer para decimales (cents)
  
  // Datos del conteo
  physicalCount: integer("physical_count"),
  difference: integer("difference"),
  adjustmentType: inventoryAdjustmentTypeEnum("adjustment_type"),
  costImpact: integer("cost_impact"), // En cents
  
  // Estado y asignación
  status: inventoryItemStatusEnum("status").default("pending").notNull(),
  assignedTo: varchar("assigned_to").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  
  // Fechas de transición
  countedAt: timestamp("counted_at"),
  countedBy: varchar("counted_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  auditedAt: timestamp("audited_at"),
  auditedBy: varchar("audited_by").references(() => users.id),
  adjustedAt: timestamp("adjusted_at"),
  adjustedBy: varchar("adjusted_by").references(() => users.id),
  
  // Comentarios por línea
  counterComment: text("counter_comment"),
  managerComment: text("manager_comment"),
  auditorComment: text("auditor_comment"),
  coordinatorComment: text("coordinator_comment"),
  
  // Auditoría
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documentos de auditoría
export const inventoryAuditDocuments = pgTable("inventory_audit_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  documentNumber: varchar("document_number", { length: 50 }).unique().notNull(),
  auditorId: varchar("auditor_id").references(() => users.id).notNull(),
  centerId: uuid("center_id").references(() => centers.id).notNull(),
  
  // Configuración del muestreo
  samplingType: inventorySamplingTypeEnum("sampling_type").notNull(),
  samplingPercentage: integer("sampling_percentage"), // 0-100
  totalItems: integer("total_items").notNull(),
  sampledItems: integer("sampled_items").notNull(),
  
  // Estado
  status: auditDocumentStatusEnum("status").default("draft").notNull(),
  
  // Fechas
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  
  // Resultado
  approvalResult: varchar("approval_result", { length: 20 }),
  resultComments: text("result_comments"),
});

// Muestras de auditoría
export const inventoryAuditSamples = pgTable("inventory_audit_samples", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  auditDocumentId: uuid("audit_document_id").references(() => inventoryAuditDocuments.id, { onDelete: "cascade" }).notNull(),
  countItemId: uuid("count_item_id").references(() => inventoryCountItems.id).notNull(),
  
  // Resultado del muestreo
  auditPhysicalCount: integer("audit_physical_count"),
  auditDifference: integer("audit_difference"),
  matchesOriginal: integer("matches_original"), // 0=false, 1=true, null=not_checked
  
  // Aprobación
 approved: boolean("approved").default(sql`false`).notNull(),
  rejectionReason: text("rejection_reason"),
  
  // Auditoría
  auditedAt: timestamp("audited_at").defaultNow(),
  auditedBy: varchar("audited_by").references(() => users.id).notNull(),
});

// Aprobaciones de ajustes
export const inventoryAdjustmentApprovals = pgTable("inventory_adjustment_approvals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: uuid("request_id").references(() => inventoryRequests.id).notNull(),
  divisionCode: varchar("division_code", { length: 20 }).notNull(),
  
  // Aprobadores configurados
  approvers: varchar("approvers").array().notNull(), // Array de user IDs
  
  // Estado
  approvalStatus: approvalStatusEnum("approval_status").default("pending").notNull(),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  
  // Auditoría
  createdAt: timestamp("created_at").defaultNow(),
  notificationSentAt: timestamp("notification_sent_at"),
});

// Historial de inventario
export const inventoryHistory = pgTable("inventory_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: varchar("entity_id").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  description: text("description"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  userId: varchar("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Asignaciones automáticas de usuarios
export const inventoryUserAssignments = pgTable("inventory_user_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  centerId: uuid("center_id").references(() => centers.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  
  // Criterios de asignación
  assignmentType: varchar("assignment_type", { length: 20 }).notNull(), // division, category, group
  assignmentValues: text("assignment_values").array().notNull(),
  
  // Estado
  isActive: integer("is_active").default(1).notNull(), // 1=true, 0=false
  
  // Auditoría
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// ============================================================================
// RELACIONES DE INVENTARIO
// ============================================================================

export const inventoryRequestsRelations = relations(inventoryRequests, ({ one, many }) => ({
  creator: one(users, {
    fields: [inventoryRequests.createdBy],
    references: [users.id],
  }),
  items: many(inventoryCountItems),
  approvals: many(inventoryAdjustmentApprovals),
}));

export const inventoryCountItemsRelations = relations(inventoryCountItems, ({ one }) => ({
  request: one(inventoryRequests, {
    fields: [inventoryCountItems.requestId],
    references: [inventoryRequests.id],
  }),
  center: one(centers, {
    fields: [inventoryCountItems.centerId],
    references: [centers.id],
  }),
  assignedUser: one(users, {
    fields: [inventoryCountItems.assignedTo],
    references: [users.id],
  }),
  countedByUser: one(users, {
    fields: [inventoryCountItems.countedBy],
    references: [users.id],
  }),
  approvedByUser: one(users, {
    fields: [inventoryCountItems.approvedBy],
    references: [users.id],
  }),
  auditedByUser: one(users, {
    fields: [inventoryCountItems.auditedBy],
    references: [users.id],
  }),
}));

export const inventoryAuditDocumentsRelations = relations(inventoryAuditDocuments, ({ one, many }) => ({
  auditor: one(users, {
    fields: [inventoryAuditDocuments.auditorId],
    references: [users.id],
  }),
  center: one(centers, {
    fields: [inventoryAuditDocuments.centerId],
    references: [centers.id],
  }),
  samples: many(inventoryAuditSamples),
}));

export const inventoryAuditSamplesRelations = relations(inventoryAuditSamples, ({ one }) => ({
  auditDocument: one(inventoryAuditDocuments, {
    fields: [inventoryAuditSamples.auditDocumentId],
    references: [inventoryAuditDocuments.id],
  }),
  countItem: one(inventoryCountItems, {
    fields: [inventoryAuditSamples.countItemId],
    references: [inventoryCountItems.id],
  }),
  auditor: one(users, {
    fields: [inventoryAuditSamples.auditedBy],
    references: [users.id],
  }),
}));

// Relaciones para la tabla de comentarios
export const incidentCommentsRelations = relations(incidentComments, ({ one }) => ({
  incident: one(incidents, {
    fields: [incidentComments.incidentId],
    references: [incidents.id],
  }),
  author: one(users, {
    fields: [incidentComments.authorId],
    references: [users.id],
  }),
}));



// Actualizar las relaciones existentes
export const actionPlanTasksRelations = relations(actionPlanTasks, ({ one, many }) => ({
  actionPlan: one(actionPlans, {
    fields: [actionPlanTasks.actionPlanId],
    references: [actionPlans.id],
  }),
  assignee: one(users, {
    fields: [actionPlanTasks.assigneeId],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [actionPlanTasks.createdBy],
    references: [users.id],
  }),
  completedByUser: one(users, {
    fields: [actionPlanTasks.completedBy],
    references: [users.id],
  }),
  evidence: many(taskEvidence),
}));

export const taskEvidenceRelations = relations(taskEvidence, ({ one }) => ({
  task: one(actionPlanTasks, {
    fields: [taskEvidence.taskId],
    references: [actionPlanTasks.id],
  }),
  uploadedByUser: one(users, {
    fields: [taskEvidence.uploadedBy],
    references: [users.id],
  }),
}));

export const actionPlanCommentsRelations = relations(actionPlanComments, ({ one, many }) => ({
  actionPlan: one(actionPlans, {
    fields: [actionPlanComments.actionPlanId],
    references: [actionPlans.id],
  }),
  author: one(users, {
    fields: [actionPlanComments.authorId],
    references: [users.id],
  }),
  attachments: many(commentAttachments),
}));

export const commentAttachmentsRelations = relations(commentAttachments, ({ one }) => ({
  comment: one(actionPlanComments, {
    fields: [commentAttachments.commentId],
    references: [actionPlanComments.id],
  }),
  uploadedByUser: one(users, {
    fields: [commentAttachments.uploadedBy],
    references: [users.id],
  }),
}));

// Actualizar las relaciones de actionPlans para incluir las nuevas tablas
export const actionPlansRelationsUpdated = relations(actionPlans, ({ one, many }) => ({
  incident: one(incidents, {
    fields: [actionPlans.incidentId],
    references: [incidents.id],
  }),
  assignee: one(users, {
    fields: [actionPlans.assigneeId],
    references: [users.id],
  }),
  completedByUser: one(users, {
    fields: [actionPlans.completedBy],
    references: [users.id],
  }),
  participants: many(actionPlanParticipants),
  tasks: many(actionPlanTasks),
  comments: many(actionPlanComments),
}));

export const incidentsRelationsUpdated = relations(incidents, ({ one, many }) => ({
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
  comments: many(incidentComments), // Nueva relación
}));

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
  comments: many(incidentComments), // Nueva relación
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

export const actionPlansRelations = relations(actionPlans, ({ one, many }) => ({
  incident: one(incidents, {
    fields: [actionPlans.incidentId],
    references: [incidents.id],
  }),
  assignee: one(users, {
    fields: [actionPlans.assigneeId],
    references: [users.id],
  }),
  completedByUser: one(users, {
    fields: [actionPlans.completedBy],
    references: [users.id],
  }),
  participants: many(actionPlanParticipants),
}));

export const actionPlanParticipantsRelations = relations(actionPlanParticipants, ({ one }) => ({
  actionPlan: one(actionPlans, {
    fields: [actionPlanParticipants.actionPlanId],
    references: [actionPlans.id],
  }),
  user: one(users, {
    fields: [actionPlanParticipants.userId],
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

export const insertActionPlanSchema = z.object({
  incidentId: z.string().uuid("ID de incidencia inválido"),
  title: z.string().min(1, "El título es requerido").max(500, "El título es muy largo"),
  description: z.string().max(2000, "La descripción es muy larga").default(""),
  status: z.enum(["pendiente", "en_proceso", "completado", "retrasado"]).default("pendiente"),
  assigneeId: z.string().min(1, "El responsable es requerido"),
  departmentId: z.string().nullable().optional(),
  dueDate: z.union([
    z.string().transform((str) => new Date(str)),
    z.date()
  ]).refine((date) => date instanceof Date && !isNaN(date.getTime()), {
    message: "La fecha límite debe ser una fecha válida",
  }),
});

export const updateActionPlanSchema = z.object({
  title: z.string().min(1, "El título es requerido").max(500, "El título es muy largo").optional(),
  description: z.string().min(1, "La descripción es requerida").optional(),
  status: z.enum(["pendiente", "en_proceso", "completado", "retrasado"]).optional(),
  assigneeId: z.string().min(1, "El responsable es requerido").optional(),
  departmentId: z.string().optional(),
  dueDate: z.union([
    z.string().transform((str) => new Date(str)),
    z.date()
  ]).refine((date) => date instanceof Date && !isNaN(date.getTime()), {
    message: "La fecha límite debe ser una fecha válida",
  }),
  completedAt: z.date().optional().nullable(),
});

export const insertActionPlanParticipantSchema = createInsertSchema(actionPlanParticipants).omit({
  id: true,
  createdAt: true,
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

export const insertInventoryRequestSchema = createInsertSchema(inventoryRequests).omit({
  id: true,
  requestNumber: true,
  createdAt: true,
  updatedAt: true,
  sentAt: true,
  completedAt: true,
});

export const insertInventoryCountItemSchema = createInsertSchema(inventoryCountItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryAuditDocumentSchema = createInsertSchema(inventoryAuditDocuments).omit({
  id: true,
  documentNumber: true,
  createdAt: true,
});

export const insertInventoryAuditSampleSchema = createInsertSchema(inventoryAuditSamples).omit({
  id: true,
  auditedAt: true,
});


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
export type InsertActionPlan = typeof actionPlans.$inferInsert;
export type ActionPlan = typeof actionPlans.$inferSelect;
export type ActionPlanParticipant = typeof actionPlanParticipants.$inferSelect;
export type InsertActionPlanParticipant = typeof actionPlanParticipants.$inferInsert;
export type InsertIncidentHistory = z.infer<typeof insertIncidentHistorySchema>;
export type IncidentHistory = typeof incidentHistory.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type CreateDepartment = typeof departments.$inferInsert;
export type UpdateDepartment = Partial<CreateDepartment>;
export type UpdateUser = Partial<CreateUser>;
export type CreateCenter = typeof centers.$inferInsert;
export type UpdateCenter = Partial<CreateCenter>;
export type InventoryRequest = typeof inventoryRequests.$inferSelect;
export type InsertInventoryRequest = z.infer<typeof insertInventoryRequestSchema>;

export type InventoryCountItem = typeof inventoryCountItems.$inferSelect;
export type InsertInventoryCountItem = z.infer<typeof insertInventoryCountItemSchema>;

export type InventoryAuditDocument = typeof inventoryAuditDocuments.$inferSelect;
export type InsertInventoryAuditDocument = z.infer<typeof insertInventoryAuditDocumentSchema>;

export type InventoryAuditSample = typeof inventoryAuditSamples.$inferSelect;
export type InsertInventoryAuditSample = z.infer<typeof insertInventoryAuditSampleSchema>;

export type InventoryAdjustmentApproval = typeof inventoryAdjustmentApprovals.$inferSelect;
export type InsertInventoryAdjustmentApproval = typeof inventoryAdjustmentApprovals.$inferInsert;

export type InventoryHistory = typeof inventoryHistory.$inferSelect;
export type InsertInventoryHistory = typeof inventoryHistory.$inferInsert;

export type InventoryUserAssignment = typeof inventoryUserAssignments.$inferSelect;
export type InsertInventoryUserAssignment = typeof inventoryUserAssignments.$inferInsert;

// Tipos extendidos con relaciones
export type InventoryRequestWithDetails = InventoryRequest & {
  creator: User;
  items: InventoryCountItem[];
};

export type InventoryCountItemWithDetails = InventoryCountItem & {
  request: InventoryRequest;
  center: Center;
  assignedUser?: User;
  countedByUser?: User;
  approvedByUser?: User;
};

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
  departmentId?: string;
  location?: string;
  center_id?: string; // <-- AGREGAR AQUÍ
};

// Agrega este tipo después de los tipos existentes
export type DepartmentWithHead = Department & {
  head?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
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