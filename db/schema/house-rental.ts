import { pgTable, serial, text, integer, numeric, date, timestamp } from 'drizzle-orm/pg-core'
import { employees, sites } from './hero'

export const heroGaHouseRentals = pgTable('hero_ga_house_rentals', {
  id: serial('id').primaryKey(),
  rentalCode: text('rental_code').notNull().unique(),
  workLocation: text('work_location').notNull(),
  siteId: integer('site_id').references(() => sites.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  propertyType: text('property_type').notNull().default('Mess Karyawan'), // 'Mess Karyawan' | 'Rumah Karyawan' | 'Sewa Lahan & Bangunan' | 'Wisma' | 'Lainnya'
  ownerName: text('owner_name').notNull(),
  ownerPhone: text('owner_phone').default(''),
  ownerBank: text('owner_bank').default(''),
  contractStart: date('contract_start').notNull(),
  contractEnd: date('contract_end').notNull(),
  costRent: numeric('cost_rent', { precision: 15, scale: 2 }).notNull().default('0'),
  paymentCycle: text('payment_cycle').default('yearly'), // 'monthly' | '6_months' | 'yearly' | 'custom'
  status: text('status').notNull().default('active'), // 'active' | 'expiring_soon' | 'expired' | 'terminated' | 'extended'
  extensionNotes: text('extension_notes').default(''),
  address: text('address').default(''),
  capacity: integer('capacity').default(0),
  contractDocumentUrl: text('contract_document_url'),
  contractDocumentName: text('contract_document_name'),
  propertyPhotoUrl: text('property_photo_url'),
  assignedEmployeeId: integer('assigned_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  assignedEmployeeName: text('assigned_employee_name').default(''),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type HeroGaHouseRental = typeof heroGaHouseRentals.$inferSelect
export type NewHeroGaHouseRental = typeof heroGaHouseRentals.$inferInsert
