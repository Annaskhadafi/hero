import { integer, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { employees } from './hero'

export const emailReleaseApprovals = pgTable('hero_email_release_approvals', {
  id: text('id').primaryKey(),
  ticketNumber: text('ticket_number').notNull(),
  repository: text('repository').notNull(),
  ref: text('ref').notNull(),
  base: text('base').notNull(),
  tree: text('tree').notNull(),
  approverId: integer('approver_id').notNull().references(() => employees.id),
  recipient: text('recipient').notNull(),
  messageId: text('message_id').notNull().unique(),
  correlation: text('correlation').notNull().unique(),
  state: text('state').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  decisionMessageId: text('decision_message_id').unique(),
}, t => [unique().on(t.ticketNumber, t.repository, t.ref, t.base, t.tree)])
