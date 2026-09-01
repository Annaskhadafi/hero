import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { employees, sites } from './hero';
import { masterSections } from './hero';
import { apdRequests } from './apd';

// Summary header
export const apdSummaries = pgTable('hero_apd_summaries', {
  id: serial('id').primaryKey(),
  summaryNumber: text('summary_number').notNull().unique(),
  sectionId: integer('section_id').notNull().references(() => masterSections.id, { onDelete: 'cascade' }),
  targetSite: text('target_site').notNull().default('GABUNGAN'), // 'VALE' atau 'GABUNGAN'
  status: text('status').notNull().default('draft'), // draft, pending, approved
  generatedByEmployeeId: integer('generated_by_employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  submitterSignatureUrl: text('submitter_signature_url'),
  generatedAt: timestamp('generated_at'),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Summary items (approved requests yang masuk summary)
export const apdSummaryItems = pgTable('hero_apd_summary_items', {
  id: serial('id').primaryKey(),
  summaryId: integer('summary_id').notNull().references(() => apdSummaries.id, { onDelete: 'cascade' }),
  apdRequestId: integer('apd_request_id').notNull().references(() => apdRequests.id, { onDelete: 'cascade' }),
  employeeId: integer('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  employeeName: text('employee_name').notNull(),
  employeeSn: text('employee_sn').notNull().default(''),
  siteName: text('site_name').notNull().default(''),
  itemName: text('item_name').notNull(),
  quantity: integer('quantity').notNull().default(1),
  requestType: text('request_type').notNull().default('baru'),
});

// Summary approvals
export const apdSummaryApprovals = pgTable('hero_apd_summary_approvals', {
  id: serial('id').primaryKey(),
  summaryId: integer('summary_id').notNull().references(() => apdSummaries.id, { onDelete: 'cascade' }),
  level: integer('level').notNull(), // 1: Section Head, 2: Department Head
  approverEmployeeId: integer('approver_employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'), // pending, approved
  signatureUrl: text('signature_url'),
  decisionNote: text('decision_note').notNull().default(''),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
