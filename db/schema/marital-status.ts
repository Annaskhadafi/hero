import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { employees, sites } from './hero';

export const maritalStatusRequests = pgTable('hero_marital_status_requests', {
  id: serial('id').primaryKey(),
  requestNumber: text('request_number').notNull().unique(),
  employeeId: integer('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  siteId: integer('site_id').references(() => sites.id, { onDelete: 'set null' }),
  requestDate: timestamp('request_date').notNull().defaultNow(),
  currentMaritalStatus: text('current_marital_status').notNull(),
  targetMaritalStatus: text('target_marital_status').notNull(),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('pending_approval'),
  signatureUrl: text('signature_url'),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
