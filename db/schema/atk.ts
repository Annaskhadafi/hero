import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { employees, masterDepartments, sites } from './hero';

// Master Data Katalog ATK
export const heroMasterAtk = pgTable('hero_master_atk', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull().default('Umum'), // 'Kertas & Buku', 'Alat Tulis & Koreksi', 'Arsip & Binder', 'Aksesoris & Meja', 'Lainnya'
  unit: text('unit').notNull().default('Pcs'), // 'Pcs', 'Box', 'Rim', 'Pack', 'Set', 'Rol'
  description: text('description').notNull().default(''),
  minStock: integer('min_stock').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Transaksi Pengajuan ATK
export const heroAtkRequests = pgTable('hero_atk_requests', {
  id: serial('id').primaryKey(),
  requestNumber: text('request_number').notNull().unique(),
  employeeId: integer('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  siteId: integer('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  departmentId: integer('department_id').references(() => masterDepartments.id, { onDelete: 'set null' }),
  requestType: text('request_type').notNull().default('personal'), // 'personal' | 'department'
  targetRecipientName: text('target_recipient_name').notNull().default(''), // nama divisi/divisi PIC jika requestType === 'department'
  requestDate: timestamp('request_date').notNull().defaultNow(),
  status: text('status').notNull().default('pending_approval'), // 'pending_approval' | 'approved' | 'ready_for_pickup' | 'completed' | 'rejected'
  notes: text('notes').notNull().default(''),
  requesterSignatureUrl: text('requester_signature_url'),
  processedByEmployeeId: integer('processed_by_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  reviewerNote: text('reviewer_note').notNull().default(''),
  reviewedAt: timestamp('reviewed_at'),
  recipientSignatureUrl: text('recipient_signature_url'),
  recipientName: text('recipient_name').notNull().default(''),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Item Rincian Pengajuan ATK
export const heroAtkRequestItems = pgTable('hero_atk_request_items', {
  id: serial('id').primaryKey(),
  requestId: integer('request_id').notNull().references(() => heroAtkRequests.id, { onDelete: 'cascade' }),
  masterAtkId: integer('master_atk_id').references(() => heroMasterAtk.id, { onDelete: 'set null' }),
  customItemName: text('custom_item_name').notNull().default(''),
  quantity: integer('quantity').notNull().default(1),
  unit: text('unit').notNull().default('Pcs'),
  notes: text('notes').notNull().default(''),
});
