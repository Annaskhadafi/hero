import { date, doublePrecision, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { user } from '@/db/schema/auth'
import { centralServiceAssets } from '@/db/schema/central-service'
import { employees, masterDepartments, masterSections, sites } from '@/db/schema/hero'

export const assetDisposals = pgTable('hero_asset_disposals', {
  id: serial('id').primaryKey(),
  disposalNumber: text('disposal_number').notNull().unique(), // DSP-YYYYMM-XXXX

  // Relasi Master Aset (Hybrid: null jika input manual)
  assetId: integer('asset_id').references(() => centralServiceAssets.id, {
    onDelete: 'set null',
  }),
  assetName: text('asset_name').notNull(),
  assetNumber: text('asset_number'),
  purchaseYear: text('purchase_year'),

  // Organisasi & Lokasi
  departmentId: integer('department_id').references(() => masterDepartments.id, {
    onDelete: 'set null',
  }),
  departmentName: text('department_name').notNull(),
  sectionId: integer('section_id').references(() => masterSections.id, {
    onDelete: 'set null',
  }),
  sectionName: text('section_name'),
  siteId: integer('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'restrict' }),
  siteName: text('site_name').notNull(),

  // Informasi Transaksi & Catatan
  disposalDate: date('disposal_date').notNull(),
  disposalType: text('disposal_type').notNull().default('Penghapusan'), // 'Penjualan' | 'Penghapusan' | 'Donasi'
  notes: text('notes').notNull(),
  items: text('items').notNull().default('[]'), // JSON array: [{ id?, assetId?, assetName, assetNumber, purchaseYear, bookValue?, estimatedSalePrice?, notes }]
  totalBookValue: doublePrecision('total_book_value').default(0),
  totalEstimatedSalePrice: doublePrecision('total_estimated_sale_price').default(0),
  attachments: text('attachments').notNull().default('[]'), // JSON array: [{ fileName, fileUrl, fileSize, mimeType }]

  // Dokumen Pasca-Approval (Lelang & Finance)
  auctionDocuments: text('auction_documents'), // JSON: { checklist: string[], files: Array<{ fileName, fileUrl, fileSize }> }
  auctionSubmittedAt: timestamp('auction_submitted_at'),
  auctionSubmittedById: integer('auction_submitted_by_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  financeDocuments: text('finance_documents'), // JSON: { checklist: string[], files: Array<{ fileName, fileUrl, fileSize }> }
  financeSubmittedAt: timestamp('finance_submitted_at'),
  financeSubmittedById: integer('finance_submitted_by_id').references(() => employees.id, {
    onDelete: 'set null',
  }),

  // Pengaju (Dibuat Oleh)
  applicantEmployeeId: integer('applicant_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  applicantName: text('applicant_name').notNull(),
  applicantJobTitle: text('applicant_job_title'),
  applicantSignatureUrl: text('applicant_signature_url'),
  createdById: text('created_by_id').references(() => user.id, {
    onDelete: 'set null',
  }),

  // Status & Alur Approval
  status: text('status').notNull().default('pending'), // 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'needs_revision'
  currentStepOrder: integer('current_step_order').notNull().default(1),
  totalSteps: integer('total_steps').notNull().default(5),
  currentApproverEmployeeId: integer('current_approver_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  currentApproverName: text('current_approver_name'),
  lastRevertedByEmployeeId: integer('last_reverted_by_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  lastRevertStepOrder: integer('last_revert_step_order'),
  lastRevertNote: text('last_revert_note'),

  // Audit Timestamps & Catatan Keputusan
  submittedAt: timestamp('submitted_at').defaultNow(),
  approvedAt: timestamp('approved_at'),
  rejectedAt: timestamp('rejected_at'),
  cancelledAt: timestamp('cancelled_at'),
  rejectionNote: text('rejection_note'),
  cancellationReason: text('cancellation_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const assetDisposalsRelations = relations(assetDisposals, ({ one }) => ({
  asset: one(centralServiceAssets, {
    fields: [assetDisposals.assetId],
    references: [centralServiceAssets.id],
  }),
  department: one(masterDepartments, {
    fields: [assetDisposals.departmentId],
    references: [masterDepartments.id],
  }),
  section: one(masterSections, {
    fields: [assetDisposals.sectionId],
    references: [masterSections.id],
  }),
  site: one(sites, {
    fields: [assetDisposals.siteId],
    references: [sites.id],
  }),
  applicant: one(employees, {
    fields: [assetDisposals.applicantEmployeeId],
    references: [employees.id],
  }),
  currentApprover: one(employees, {
    fields: [assetDisposals.currentApproverEmployeeId],
    references: [employees.id],
  }),
}))

export type AssetDisposalRow = typeof assetDisposals.$inferSelect
export type NewAssetDisposalRow = typeof assetDisposals.$inferInsert
