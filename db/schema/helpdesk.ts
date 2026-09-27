import { relations } from 'drizzle-orm'
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

import { customers } from './customers'
import { employees, sites } from './hero'
import { maestroCustomerUsers } from './maestro'

export const heroTicketCategories = pgTable('hero_ticket_categories', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').default('').notNull(),
  color: text('color').default('#3b82f6').notNull(),
  icon: text('icon').default('HelpCircle').notNull(),
  defaultSlaHours: integer('default_sla_hours').default(24).notNull(),
  isAiEnabled: boolean('is_ai_enabled').default(true).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const heroTicketRoutingRules = pgTable('hero_ticket_routing_rules', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id')
    .notNull()
    .references(() => heroTicketCategories.id, { onDelete: 'cascade' }),
  siteId: integer('site_id').references(() => sites.id, { onDelete: 'cascade' }),
  assignedEmployeeId: integer('assigned_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  notifyEmployeeIds: jsonb('notify_employee_ids').$type<number[]>().default([]).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const heroTickets = pgTable(
  'hero_tickets',
  {
    id: serial('id').primaryKey(),
    ticketNumber: text('ticket_number').notNull().unique(),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => heroTicketCategories.id, { onDelete: 'restrict' }),
    customerUserId: text('customer_user_id')
      .notNull()
      .references(() => maestroCustomerUsers.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    priority: text('priority').default('medium').notNull(), // 'low' | 'medium' | 'high' | 'urgent'
    status: text('status').default('bot_active').notNull(), // 'bot_active' | 'escalated' | 'assigned' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'
    assignedEmployeeId: integer('assigned_employee_id').references(() => employees.id, {
      onDelete: 'set null',
    }),
    claimedAt: timestamp('claimed_at'),
    aiSummary: text('ai_summary'),
    escalationReason: text('escalation_reason'),
    resolutionNotes: text('resolution_notes'),
    resolvedAt: timestamp('resolved_at'),
    closedAt: timestamp('closed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    ticketNumberIdx: uniqueIndex('hero_tickets_ticket_number_uq').on(table.ticketNumber),
  }),
)

export type TicketAttachment = {
  url: string
  name: string
  size: number
  type: string
}

export const heroTicketMessages = pgTable('hero_ticket_messages', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id')
    .notNull()
    .references(() => heroTickets.id, { onDelete: 'cascade' }),
  senderType: text('sender_type').notNull(), // 'customer' | 'bot' | 'hero_agent' | 'system'
  senderCustomerUserId: text('sender_customer_user_id').references(() => maestroCustomerUsers.id, {
    onDelete: 'set null',
  }),
  senderEmployeeId: integer('sender_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  message: text('message').notNull(),
  attachments: jsonb('attachments').$type<TicketAttachment[]>().default([]).notNull(),
  isInternalNote: boolean('is_internal_note').default(false).notNull(),
  aiTokens: integer('ai_tokens'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const heroHelpdeskSettings = pgTable('hero_helpdesk_settings', {
  id: serial('id').primaryKey(),
  aiEnabled: boolean('ai_enabled').default(true).notNull(),
  aiModel: text('ai_model').default('openai/gpt-4o-mini').notNull(),
  aiSystemPrompt: text('ai_system_prompt'),
  aiGreetingMessage: text('ai_greeting_message'),
  autoEscalateKeywords: jsonb('auto_escalate_keywords')
    .$type<string[]>()
    .default(['kecelakaan', 'darurat', 'urgent', 'bahaya', 'kebakaran', 'tumpahan', 'breakdown'])
    .notNull(),
  maxBotTurnsBeforeEscalate: integer('max_bot_turns_before_escalate').default(5).notNull(),
  updatedByEmployeeId: integer('updated_by_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Relations
export const heroTicketCategoriesRelations = relations(heroTicketCategories, ({ many }) => ({
  routingRules: many(heroTicketRoutingRules),
  tickets: many(heroTickets),
}))

export const heroTicketRoutingRulesRelations = relations(heroTicketRoutingRules, ({ one }) => ({
  category: one(heroTicketCategories, {
    fields: [heroTicketRoutingRules.categoryId],
    references: [heroTicketCategories.id],
  }),
  site: one(sites, {
    fields: [heroTicketRoutingRules.siteId],
    references: [sites.id],
  }),
  assignedEmployee: one(employees, {
    fields: [heroTicketRoutingRules.assignedEmployeeId],
    references: [employees.id],
  }),
}))

export const heroTicketsRelations = relations(heroTickets, ({ one, many }) => ({
  category: one(heroTicketCategories, {
    fields: [heroTickets.categoryId],
    references: [heroTicketCategories.id],
  }),
  customer: one(customers, {
    fields: [heroTickets.customerId],
    references: [customers.id],
  }),
  site: one(sites, {
    fields: [heroTickets.siteId],
    references: [sites.id],
  }),
  customerUser: one(maestroCustomerUsers, {
    fields: [heroTickets.customerUserId],
    references: [maestroCustomerUsers.id],
  }),
  assignedEmployee: one(employees, {
    fields: [heroTickets.assignedEmployeeId],
    references: [employees.id],
  }),
  messages: many(heroTicketMessages),
}))

export const heroTicketMessagesRelations = relations(heroTicketMessages, ({ one }) => ({
  ticket: one(heroTickets, {
    fields: [heroTicketMessages.ticketId],
    references: [heroTickets.id],
  }),
  senderCustomerUser: one(maestroCustomerUsers, {
    fields: [heroTicketMessages.senderCustomerUserId],
    references: [maestroCustomerUsers.id],
  }),
  senderEmployee: one(employees, {
    fields: [heroTicketMessages.senderEmployeeId],
    references: [employees.id],
  }),
}))
