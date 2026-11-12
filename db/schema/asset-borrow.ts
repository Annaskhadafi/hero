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
  
  // Catatan Pengembalian
  returnNotes: text('return_notes'),
  
  // Status Alur: 'pending' | 'borrowed' | 'returned' | 'rejected' | 'cancelled' | 'needs_revision'
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

export const assetBorrowsRelations = relations(assetBorrows, ({ one }) => ({
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
}))

export type AssetBorrowRow = typeof assetBorrows.$inferSelect
export type NewAssetBorrowRow = typeof assetBorrows.$inferInsert
