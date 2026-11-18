import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { user } from '@/db/schema/auth'
import { centralServiceAssets } from '@/db/schema/central-service'
import { employees } from '@/db/schema/hero'

export const assetBorrows = pgTable('hero_asset_borrows', {
  id: serial('id').primaryKey(),
  borrowNumber: text('borrow_number').notNull().unique(), // e.g. BRW-202611-0001
  
  // Asset Reference & Snapshot
  assetId: integer('asset_id')
    .notNull()
    .references(() => centralServiceAssets.id, { onDelete: 'restrict' }),
  assetName: text('asset_name').notNull(),
  assetNumber: text('asset_number'),
  serialNumber: text('serial_number'),
  
  // Peminjam (Borrower)
  borrowerEmployeeId: integer('borrower_employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'restrict' }),
  borrowerName: text('borrower_name').notNull(),
  borrowerSignatureUrl: text('borrower_signature_url'),
  
  // Pemegang Saat Ini (Holder Asal yang Meminjamkan)
  holderEmployeeId: integer('holder_employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'restrict' }),
  holderName: text('holder_name').notNull(),
  
  // Kelengkapan Aset (Teks bebas sesuai instruksi user)
  equipmentNotes: text('equipment_notes'),
  
  // Tujuan Peminjaman
  purpose: text('purpose').notNull(),
  
  // Waktu Peminjaman & Estimasi Pengembalian
  borrowDate: timestamp('borrow_date').notNull(),
  expectedReturnDate: timestamp('expected_return_date'),
  actualReturnDate: timestamp('actual_return_date'),
  
  // Catatan & Verifikasi Pengembalian (2 Langkah)
  returnRequestDate: timestamp('return_request_date'),
  returnNotes: text('return_notes'),
  returnPhotoUrls: text('return_photo_urls'), // JSON array string of physical photo URLs
  returnConditionNotes: text('return_condition_notes'),
  holderReturnSignatureUrl: text('holder_return_signature_url'),
  holderReturnSignedAt: timestamp('holder_return_signed_at'),
  
  // Status Alur: 'pending' | 'borrowed' | 'pending_return' | 'returned' | 'rejected' | 'cancelled' | 'needs_revision'
  status: text('status').notNull().default('pending'),
  currentStepOrder: integer('current_step_order').notNull().default(1),
  lastRevertedByEmployeeId: integer('last_reverted_by_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  lastRevertStepOrder: integer('last_revert_step_order'),
  lastRevertNote: text('last_revert_note'),
  
  // Catatan Approval / Penolakan
  approvalNote: text('approval_note'),
  approvedAt: timestamp('approved_at'),
  rejectedAt: timestamp('rejected_at'),
  pdfUrl: text('pdf_url'),
  
  // Requester & Timestamps
  createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
  applicantEmployeeId: integer('applicant_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  submittedAt: timestamp('submitted_at').defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const assetBorrowHistories = pgTable('hero_asset_borrow_histories', {
  id: serial('id').primaryKey(),
  assetBorrowId: integer('asset_borrow_id')
    .notNull()
    .references(() => assetBorrows.id, { onDelete: 'cascade' }),
  action: text('action').notNull(), // 'submitted' | 'approved' | 'rejected' | 'needs_revision' | 'resubmitted' | 'return_requested' | 'returned' | 'cancelled'
  actorEmployeeId: integer('actor_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role').notNull(), // 'Peminjam' | 'Holder' | 'Super Admin' | 'Pemohon'
  note: text('note'),
  photoUrl: text('photo_url'),
  signatureUrl: text('signature_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const assetBorrowsRelations = relations(assetBorrows, ({ one, many }) => ({
  asset: one(centralServiceAssets, {
    fields: [assetBorrows.assetId],
    references: [centralServiceAssets.id],
  }),
  borrower: one(employees, {
    fields: [assetBorrows.borrowerEmployeeId],
    references: [employees.id],
  }),
  holder: one(employees, {
    fields: [assetBorrows.holderEmployeeId],
    references: [employees.id],
  }),
  creator: one(user, {
    fields: [assetBorrows.createdById],
    references: [user.id],
  }),
  applicant: one(employees, {
    fields: [assetBorrows.applicantEmployeeId],
    references: [employees.id],
  }),
  histories: many(assetBorrowHistories),
}))

export const assetBorrowHistoriesRelations = relations(assetBorrowHistories, ({ one }) => ({
  borrow: one(assetBorrows, {
    fields: [assetBorrowHistories.assetBorrowId],
    references: [assetBorrows.id],
  }),
  actor: one(employees, {
    fields: [assetBorrowHistories.actorEmployeeId],
    references: [employees.id],
  }),
}))

export type AssetBorrowRow = typeof assetBorrows.$inferSelect
export type NewAssetBorrowRow = typeof assetBorrows.$inferInsert
export type AssetBorrowHistoryRow = typeof assetBorrowHistories.$inferSelect
export type NewAssetBorrowHistoryRow = typeof assetBorrowHistories.$inferInsert
