import { relations } from 'drizzle-orm'
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

import { employees, masterDepartments, sites } from './hero'

export const heroServiceDeskCategories = pgTable('hero_service_desk_categories', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // e.g., 'SYS_SYNC', 'SENSOR_FAULT', 'HARDWARE', 'NETWORK', 'ACCESS_REQ', 'INTER_DEPT_FACILITY'
  name: text('name').notNull(),
  description: text('description').default('').notNull(),
  color: text('color').default('#0753e7').notNull(),
  icon: text('icon').default('Tool').notNull(),
  targetDepartmentId: integer('target_department_id').references(() => masterDepartments.id, {
    onDelete: 'set null',
  }),
  defaultSlaHours: integer('default_sla_hours').default(24).notNull(),
  isSystemIssue: boolean('is_system_issue').default(true).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type TroubleshootingAttachment = {
  url: string
  name: string
  size: number
  type: string
}

export const heroServiceDeskTickets = pgTable(
  'hero_service_desk_tickets',
  {
    id: serial('id').primaryKey(),
    ticketNumber: text('ticket_number').notNull().unique(), // e.g. TKT-0031
    unitCode: text('unit_code'), // Unit / Kendaraan / Device / Modul Code e.g. C02345
    systemModule: text('system_module').default('General').notNull(), // Timesheet, Attendance, HSE, Form Studio, Network, Hardware
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id').references(() => heroServiceDeskCategories.id, {
      onDelete: 'set null',
    }),
    categoryName: text('category_name').notNull().default('General Issue'),
    reporterEmployeeId: integer('reporter_employee_id').references(() => employees.id, {
      onDelete: 'set null',
    }),
    sourceDepartmentId: integer('source_department_id').references(() => masterDepartments.id, {
      onDelete: 'set null',
    }),
    targetDepartmentId: integer('target_department_id').references(() => masterDepartments.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    findingDescription: text('finding_description').notNull(),
    sourceType: text('source_type').default('user_report').notNull(), // 'user_report' | 'system_detection' | 'scheduled_inspection' | 'spm_tpms'
    sourceDetail: text('source_detail').default('Pelaporan Langsung').notNull(),
    priority: text('priority').default('sedang').notNull(), // 'kritis' | 'tinggi' | 'sedang' | 'rendah'
    status: text('status').default('baru').notNull(), // 'baru' | 'assigned' | 'investigasi' | 'menunggu_part' | 'selesai' | 'dibatalkan'
    assignedEmployeeId: integer('assigned_employee_id').references(() => employees.id, {
      onDelete: 'set null',
    }),
    assignedEmployeeName: text('assigned_employee_name'),
    assignedRole: text('assigned_role'),
    detectedAt: timestamp('detected_at').defaultNow().notNull(),
    claimedAt: timestamp('claimed_at'),
    targetSlaAt: timestamp('target_sla_at').notNull(),
    resolvedAt: timestamp('resolved_at'),
    closedAt: timestamp('closed_at'),
    resolutionNotes: text('resolution_notes'),
    mttrHours: doublePrecision('mttr_hours'),
    satisfactionRating: integer('satisfaction_rating'), // 1 to 5 stars
    satisfactionFeedback: text('satisfaction_feedback'),
    attachments: jsonb('attachments').$type<TroubleshootingAttachment[]>().default([]).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    ticketNumberIdx: uniqueIndex('hero_service_desk_tickets_num_uq').on(table.ticketNumber),
  }),
)

export const heroServiceDeskActivities = pgTable('hero_service_desk_activities', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id')
    .notNull()
    .references(() => heroServiceDeskTickets.id, { onDelete: 'cascade' }),
  actorEmployeeId: integer('actor_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  actorName: text('actor_name').notNull().default('Sistem'),
  actionType: text('action_type').notNull(), // 'created' | 'assigned' | 'status_changed' | 'note_added' | 'escalated' | 'resolved'
  title: text('title').notNull(), // e.g. "Investigasi dimulai"
  description: text('description').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const heroServiceDeskMessages = pgTable('hero_service_desk_messages', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id')
    .notNull()
    .references(() => heroServiceDeskTickets.id, { onDelete: 'cascade' }),
  senderEmployeeId: integer('sender_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  senderName: text('sender_name').notNull().default('User'),
  senderRole: text('sender_role').default('Pelapor').notNull(),
  message: text('message').notNull(),
  attachments: jsonb('attachments').$type<TroubleshootingAttachment[]>().default([]).notNull(),
  isInternalNote: boolean('is_internal_note').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const heroServiceDeskKnowledgeBase = pgTable('hero_service_desk_knowledge_base', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  categoryCode: text('category_code').notNull(),
  systemModule: text('system_module').default('General').notNull(),
  symptom: text('symptom').notNull(),
  rootCause: text('root_cause').notNull(),
  solutionSteps: text('solution_steps').notNull(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  viewCount: integer('view_count').default(0).notNull(),
  helpfulCount: integer('helpful_count').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Relations
export const heroServiceDeskCategoriesRelations = relations(
  heroServiceDeskCategories,
  ({ one, many }) => ({
    targetDepartment: one(masterDepartments, {
      fields: [heroServiceDeskCategories.targetDepartmentId],
      references: [masterDepartments.id],
    }),
    tickets: many(heroServiceDeskTickets),
  }),
)

export const heroServiceDeskTicketsRelations = relations(
  heroServiceDeskTickets,
  ({ one, many }) => ({
    site: one(sites, {
      fields: [heroServiceDeskTickets.siteId],
      references: [sites.id],
    }),
    category: one(heroServiceDeskCategories, {
      fields: [heroServiceDeskTickets.categoryId],
      references: [heroServiceDeskCategories.id],
    }),
    reporter: one(employees, {
      fields: [heroServiceDeskTickets.reporterEmployeeId],
      references: [employees.id],
    }),
    sourceDepartment: one(masterDepartments, {
      fields: [heroServiceDeskTickets.sourceDepartmentId],
      references: [masterDepartments.id],
    }),
    targetDepartment: one(masterDepartments, {
      fields: [heroServiceDeskTickets.targetDepartmentId],
      references: [masterDepartments.id],
    }),
    assignedEmployee: one(employees, {
      fields: [heroServiceDeskTickets.assignedEmployeeId],
      references: [employees.id],
    }),
    activities: many(heroServiceDeskActivities),
    messages: many(heroServiceDeskMessages),
  }),
)

export const heroServiceDeskActivitiesRelations = relations(
  heroServiceDeskActivities,
  ({ one }) => ({
    ticket: one(heroServiceDeskTickets, {
      fields: [heroServiceDeskActivities.ticketId],
      references: [heroServiceDeskTickets.id],
    }),
  }),
)

export const heroServiceDeskMessagesRelations = relations(
  heroServiceDeskMessages,
  ({ one }) => ({
    ticket: one(heroServiceDeskTickets, {
      fields: [heroServiceDeskMessages.ticketId],
      references: [heroServiceDeskTickets.id],
    }),
  }),
)
