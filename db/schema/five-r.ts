import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { employees, sites } from './hero'

// Master Area 5R
export const fiveRMasterAreas = pgTable('hero_five_r_master_areas', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  areaScale: text('area_scale').notNull().default('medium'), // 'small' | 'medium' | 'large'
  siteId: integer('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  picEmployeeId: integer('pic_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  description: text('description').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Laporan Header 5R
export const fiveRReports = pgTable('hero_five_r_reports', {
  id: serial('id').primaryKey(),
  reportNumber: text('report_number').notNull().unique(),
  masterAreaId: integer('master_area_id').references(() => fiveRMasterAreas.id, {
    onDelete: 'set null',
  }),
  picAreaName: text('pic_area_name').notNull().default(''),
  siteId: integer('site_id').references(() => sites.id, {
    onDelete: 'set null',
  }),
  auditorId: integer('auditor_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  auditorName: text('auditor_name').notNull(),
  auditorEmail: text('auditor_email').notNull().default(''),
  auditPeriod: text('audit_period').notNull(), // 'January', 'February', ...
  auditDate: date('audit_date').notNull(),
  reportType: text('report_type').notNull(), // 'ada_temuan' | 'after_temuan_sebelumnya' | 'tidak_ada_temuan'
  previousReportId: integer('previous_report_id'), // Relasi untuk temuan bulan sebelumnya
  
  // Skor 5 Pilar (20 = Tidak Baik, 40 = Kurang Baik, 60 = Cukup Baik, 80 = Baik, 100 = Sangat Baik)
  scoreRapi: integer('score_rapi').notNull().default(100),
  scoreRingkas: integer('score_ringkas').notNull().default(100),
  scoreResik: integer('score_resik').notNull().default(100),
  scoreRawat: integer('score_rawat').notNull().default(100),
  scoreRajin: integer('score_rajin').notNull().default(100),
  
  // Nilai Audit (Rata-rata 5 pilar: 0.00 - 100.00)
  totalScore: numeric('total_score', { precision: 5, scale: 2 }).notNull().default('100.00'),
  
  // Status Approval & Lifecycle
  status: text('status').notNull().default('pending_approval'), // 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'revision'
  currentApprovalLevel: integer('current_approval_level').notNull().default(1), // 1: Ria Annisa, 2: PJO, 3: Bardinia
  approvalNotes: text('approval_notes').notNull().default(''),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Baris Detail / Temuan 5R
export const fiveRFindings = pgTable('hero_five_r_findings', {
  id: serial('id').primaryKey(),
  reportId: integer('report_id')
    .notNull()
    .references(() => fiveRReports.id, { onDelete: 'cascade' }),
  rowOrder: integer('row_order').notNull().default(1),
  category5r: text('category_5r').notNull().default('Rapi'), // 'Rapi' | 'Ringkas' | 'Resik' | 'Rawat' | 'Rajin'
  area: text('area').notNull().default(''),
  findingDescription: text('finding_description').notNull().default(''),
  findingPhotoUrl: text('finding_photo_url').notNull().default(''),
  actionDescription: text('action_description').notNull().default(''),
  actionPhotoUrl: text('action_photo_url').notNull().default(''),
  noFindingPhotoUrl: text('no_finding_photo_url').notNull().default(''),
  isResolved: boolean('is_resolved').notNull().default(false),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Approval Log 5R
export const fiveRApprovalLogs = pgTable('hero_five_r_approval_logs', {
  id: serial('id').primaryKey(),
  reportId: integer('report_id')
    .notNull()
    .references(() => fiveRReports.id, { onDelete: 'cascade' }),
  level: integer('level').notNull(), // 1, 2, 3
  roleLabel: text('role_label').notNull(), // 'Quality Management Verifier', 'PJO / Atasan Langsung', 'Head of CPI Approval'
  approverEmployeeId: integer('approver_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  approverName: text('approver_name').notNull(),
  action: text('action').notNull(), // 'approved' | 'rejected' | 'returned'
  notes: text('notes').notNull().default(''),
  actedAt: timestamp('acted_at').notNull().defaultNow(),
})
