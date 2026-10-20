import { pgTable, serial, text, integer, numeric, date, timestamp, boolean } from 'drizzle-orm/pg-core'
import { employees, sites } from './hero'

export const heroVehicles = pgTable('hero_vehicles', {
  id: serial('id').primaryKey(),
  vehicleCode: text('vehicle_code').notNull().unique(),
  vehicleType: text('vehicle_type').notNull(),
  category: text('category').notNull(), // 'Truck' | 'Light Vehicle' | 'Passenger' | 'Crane Truck' | 'Other'
  plateNumber: text('plate_number').notNull().unique(),
  manufactureYear: integer('manufacture_year').notNull(),
  vinNumber: text('vin_number').notNull().default(''),
  engineNumber: text('engine_number').notNull().default(''),
  color: text('color').notNull().default('Putih'),
  ownership: text('ownership').notNull().default('owned'), // 'owned' | 'rented'
  rentalVendor: text('rental_vendor'),
  rentalCostMonthly: numeric('rental_cost_monthly', { precision: 14, scale: 2 }),
  rentalStartDate: date('rental_start_date'),
  rentalEndDate: date('rental_end_date'),
  stnkExpiryDate: date('stnk_expiry_date'),
  taxExpiryDate: date('tax_expiry_date'),
  kirExpiryDate: date('kir_expiry_date'),
  lastServiceDate: date('last_service_date'),
  lastServiceOdometer: integer('last_service_odometer').default(0),
  nextServiceDate: date('next_service_date'),
  nextServiceOdometer: integer('next_service_odometer').default(0),
  holderName: text('holder_name').notNull().default(''),
  holderEmployeeId: integer('holder_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  siteId: integer('site_id').references(() => sites.id, { onDelete: 'set null' }),
  locationName: text('location_name').notNull().default('Balikpapan'),
  status: text('status').notNull().default('active'), // 'active' | 'maintenance' | 'inactive' | 'returned'
  notes: text('notes'),
  photoUrl: text('photo_url'),
  stnkDocumentUrl: text('stnk_document_url'),
  taxDocumentUrl: text('tax_document_url'),
  kirDocumentUrl: text('kir_document_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const heroVehicleServiceLogs = pgTable('hero_vehicle_service_logs', {
  id: serial('id').primaryKey(),
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => heroVehicles.id, { onDelete: 'cascade' }),
  serviceDate: date('service_date').notNull(),
  serviceType: text('service_type').notNull().default('Routine Service'), // 'Routine Service' | 'Repair' | 'Tire Replacement' | 'Emergency'
  odometer: integer('odometer').default(0),
  workshopName: text('workshop_name').notNull().default(''),
  cost: numeric('cost', { precision: 14, scale: 2 }).default('0'),
  description: text('description').notNull().default(''),
  invoiceUrl: text('invoice_url'),
  performedByEmployeeId: integer('performed_by_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type HeroVehicle = typeof heroVehicles.$inferSelect
export type NewHeroVehicle = typeof heroVehicles.$inferInsert
export type HeroVehicleServiceLog = typeof heroVehicleServiceLogs.$inferSelect
export type NewHeroVehicleServiceLog = typeof heroVehicleServiceLogs.$inferInsert
