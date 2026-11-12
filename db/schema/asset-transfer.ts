import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { user } from '@/db/schema/auth'
import { centralServiceAssets } from '@/db/schema/central-service'
import { employees, sites } from '@/db/schema/hero'

export const assetTransfers = pgTable('hero_asset_transfers', {
  id: serial('id').primaryKey(),
  transferNumber: text('transfer_number').notNull().unique(), // e.g. TRF-202611-0001
  
  // Asset Reference & Snapshot
  assetId: integer('asset_id')
    .notNull()
    .references(() => centralServiceAssets.id, { onDelete: 'restrict' }),
  assetName: text('asset_name').notNull(),
  assetNumber: text('asset_number'),
  serialNumber: text('serial_number'),
  
  // Kelengkapan Aset (Checklist)
  equipmentChecklist: text('equipment_checklist').array().notNull().default(sql`'{}'::text[]`),
  equipmentOtherNote: text('equipment_other_note'),
  
  // Foto Kondisi Aset (JSON string: Array of { fileName, fileUrl, fileSize, mimeType })
  assetPhotos: text('asset_photos').notNull().default('[]'),
  receivedPhotos: text('received_photos').notNull().default('[]'),
  
  // Holder & Lokasi Saat Ini (Asal)
  currentHolderEmployeeId: integer('current_holder_employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'restrict' }),
  currentHolderName: text('current_holder_name').notNull(),
  currentLocationSiteId: integer('current_location_site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'restrict' }),
  currentLocationName: text('current_location_name').notNull(),
  
  // Holder & Lokasi Baru (Tujuan)
  newHolderEmployeeId: integer('new_holder_employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'restrict' }),
  newHolderName: text('new_holder_name').notNull(),
  targetLocationSiteId: integer('target_location_site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'restrict' }),
  targetLocationName: text('target_location_name').notNull(),
  
  // Catatan Tambahan
  notes: text('notes'),
  
  // Status Alur
  status: text('status').notNull().default('pending'), // 'draft', 'pending', 'in_review', 'approved', 'rejected', 'completed', 'needs_revision'
  currentStepOrder: integer('current_step_order').notNull().default(1),
  currentApproverTitle: text('current_approver_title'),
  currentApproverName: text('current_approver_name'),
  currentApproverEmployeeId: integer('current_approver_employee_id'),
  approvalMatrixId: integer('approval_matrix_id'),
  lastRevertedByEmployeeId: integer('last_reverted_by_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  lastRevertStepOrder: integer('last_revert_step_order'),
  lastRevertNote: text('last_revert_note'),
  
  // Requester & Timestamps
  createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
  applicantEmployeeId: integer('applicant_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  pdfUrl: text('pdf_url'),
  submittedAt: timestamp('submitted_at').defaultNow(),
  transferredAt: timestamp('transferred_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const assetTransfersRelations = relations(assetTransfers, ({ one }) => ({
  asset: one(centralServiceAssets, {
    fields: [assetTransfers.assetId],
    references: [centralServiceAssets.id],
  }),
  currentHolder: one(employees, {
    fields: [assetTransfers.currentHolderEmployeeId],
    references: [employees.id],
    relationName: 'currentHolder',
  }),
  newHolder: one(employees, {
    fields: [assetTransfers.newHolderEmployeeId],
    references: [employees.id],
    relationName: 'newHolder',
  }),
  currentLocation: one(sites, {
    fields: [assetTransfers.currentLocationSiteId],
    references: [sites.id],
    relationName: 'currentLocation',
  }),
  targetLocation: one(sites, {
    fields: [assetTransfers.targetLocationSiteId],
    references: [sites.id],
    relationName: 'targetLocation',
  }),
  applicant: one(employees, {
    fields: [assetTransfers.applicantEmployeeId],
    references: [employees.id],
    relationName: 'transferApplicant',
  }),
}))

export type AssetTransferRow = typeof assetTransfers.$inferSelect
export type NewAssetTransferRow = typeof assetTransfers.$inferInsert
