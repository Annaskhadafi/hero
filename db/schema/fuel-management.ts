import { pgTable, serial, text, integer, numeric, date, timestamp, boolean, index } from 'drizzle-orm/pg-core'
import { employees, sites } from './hero'
import { heroVehicles } from './vehicles'

// ─── 1. Fuel Tanks ──────────────────────────────────────────────────────────
export const fuelTanks = pgTable('hero_fuel_tanks', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // e.g. TANK-BPN-01
  name: text('name').notNull(),          // e.g. Tangki Utama Solar Balikpapan
  siteId: integer('site_id').references(() => sites.id, { onDelete: 'set null' }),
  locationName: text('location_name').notNull().default('Balikpapan'),
  capacityLiters: numeric('capacity_liters', { precision: 12, scale: 2 }).notNull().default('10000.00'),
  currentStockLiters: numeric('current_stock_liters', { precision: 12, scale: 2 }).notNull().default('0.00'),
  minStockAlertLiters: numeric('min_stock_alert_liters', { precision: 12, scale: 2 }).notNull().default('1000.00'),
  fuelType: text('fuel_type').notNull().default('Solar / Biosolar (B35)'), // Solar, Biosolar, Dexlite
  status: text('status').notNull().default('active'), // 'active' | 'maintenance' | 'inactive'
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── 2. Fuel Transactions (Fuel In & Fuel Out) ──────────────────────────────
export const fuelTransactions = pgTable('hero_fuel_transactions', {
  id: serial('id').primaryKey(),
  transactionNumber: text('transaction_number').notNull().unique(), // FIN-YYYYMM-XXXX or FOUT-YYYYMM-XXXX
  transactionType: text('transaction_type').notNull(), // 'fuel_in' | 'fuel_out'
  tankId: integer('tank_id').notNull().references(() => fuelTanks.id, { onDelete: 'restrict' }),
  quantityLiters: numeric('quantity_liters', { precision: 12, scale: 2 }).notNull(),
  stockBeforeLiters: numeric('stock_before_liters', { precision: 12, scale: 2 }).notNull().default('0.00'),
  stockAfterLiters: numeric('stock_after_liters', { precision: 12, scale: 2 }).notNull().default('0.00'),

  // Fuel In specific fields:
  supplierName: text('supplier_name'),
  deliveryOrderNumber: text('delivery_order_number'),
  attachmentUrl: text('attachment_url'),

  // Fuel Out specific fields:
  equipmentId: integer('equipment_id').references(() => heroVehicles.id, { onDelete: 'set null' }),
  equipmentUnitCode: text('equipment_unit_code'), // e.g. DT-01, LV-02, CRANE-01
  previousHmKm: numeric('previous_hm_km', { precision: 12, scale: 2 }),
  currentHmKm: numeric('current_hm_km', { precision: 12, scale: 2 }),
  operatorName: text('operator_name'),

  // Common metadata
  notes: text('notes'),
  transactionDate: timestamp('transaction_date').defaultNow().notNull(),
  createdByUserId: text('created_by_user_id'),
  createdByName: text('created_by_name').notNull().default('Petugas Lapangan'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_hero_fuel_tx_tank').on(table.tankId),
  index('idx_hero_fuel_tx_type').on(table.transactionType),
  index('idx_hero_fuel_tx_date').on(table.transactionDate),
  index('idx_hero_fuel_tx_unit').on(table.equipmentUnitCode),
])

// ─── 3. Fuel Audit Logs ─────────────────────────────────────────────────────
export const fuelAuditLogs = pgTable('hero_fuel_audit_logs', {
  id: serial('id').primaryKey(),
  transactionId: integer('transaction_id').references(() => fuelTransactions.id, { onDelete: 'cascade' }),
  action: text('action').notNull(), // 'create' | 'correction' | 'cancel'
  oldData: text('old_data'),
  newData: text('new_data'),
  reason: text('reason'),
  performedByUserId: text('performed_by_user_id'),
  performedByName: text('performed_by_name').notNull().default('System'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type FuelTank = typeof fuelTanks.$inferSelect
export type NewFuelTank = typeof fuelTanks.$inferInsert
export type FuelTransaction = typeof fuelTransactions.$inferSelect
export type NewFuelTransaction = typeof fuelTransactions.$inferInsert
export type FuelAuditLog = typeof fuelAuditLogs.$inferSelect
