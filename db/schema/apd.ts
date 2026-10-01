import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { employees, sites } from './hero';

export const masterApd = pgTable('hero_master_apd', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull().default('APD'), // 'APD', 'Tools', 'Material'
  unit: text('unit').notNull().default('Pcs'),
  hasSize: boolean('has_size').notNull().default(false),
  sizeOptions: jsonb('size_options').$type<string[]>().default([]),
  minStock: integer('min_stock').notNull().default(0),
  isQtyOnly: boolean('is_qty_only').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const apdRequests = pgTable('hero_apd_requests', {
  id: serial('id').primaryKey(),
  requestNumber: text('request_number').notNull().unique(),
  employeeId: integer('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  siteId: integer('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  requestDate: timestamp('request_date').notNull().defaultNow(),
  requestCategory: text('request_category').notNull().default('APD'),
  status: text('status').notNull().default('pending_approval'),
  notes: text('notes').notNull().default(''),
  signatureUrl: text('signature_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const apdRequestItems = pgTable('hero_apd_request_items', {
  id: serial('id').primaryKey(),
  requestId: integer('request_id').notNull().references(() => apdRequests.id, { onDelete: 'cascade' }),
  itemType: text('item_type').notNull(),
  requestType: text('request_type').notNull(), // 'baru' or 'pergantian'
  photoUrl: text('photo_url'),
  quantity: integer('quantity').notNull().default(1),
  notes: text('notes').notNull().default(''),
});
