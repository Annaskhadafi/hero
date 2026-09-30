import { boolean, integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { employees } from './hero';

export const tireRepairInspections = pgTable('hero_tire_repair_inspections', {
  id: serial('id').primaryKey(),
  serialNumber: varchar('serial_number', { length: 100 }).notNull(),
  customer: varchar('customer', { length: 150 }).notNull().default('PT Kaltim Prima Coal'),
  customerSite: varchar('customer_site', { length: 150 }).notNull().default('Sangatta KPC'),
  inspectLocation: varchar('inspect_location', { length: 150 }).notNull(),
  dateInspect: timestamp('date_inspect').notNull().defaultNow(),
  dateReceived: timestamp('date_received').notNull().defaultNow(),
  reportBy: varchar('report_by', { length: 150 }).notNull(),
  repairDuration: varchar('repair_duration', { length: 10 }).notNull().default('R1'), // R1, R2, R3, R4
  maxDays: integer('max_days').notNull().default(4),
  repairCompletedDate: timestamp('repair_completed_date'),
  cargoManifestNo: varchar('cargo_manifest_no', { length: 100 }),
  rtd1: varchar('rtd_1', { length: 50 }),
  rtd2: varchar('rtd_2', { length: 50 }),
  remarks: text('remarks'),
  tireSize: varchar('tire_size', { length: 100 }).notNull(),
  isCustomTireSize: boolean('is_custom_tire_size').notNull().default(false),
  brand: varchar('brand', { length: 100 }),
  typeConstruction: varchar('type_construction', { length: 50 }).notNull().default('RADIAL'),
  pattern: varchar('pattern', { length: 100 }),
  status: varchar('status', { length: 50 }).notNull().default('Repair'), // Repair, Retread, Reject
  removalReason: varchar('removal_reason', { length: 255 }),
  scrapReason: varchar('scrap_reason', { length: 255 }),
  deffectexRepair: varchar('deffectex_repair', { length: 255 }),
  vehicle: varchar('vehicle', { length: 100 }),
  wheelPosition: varchar('wheel_position', { length: 100 }),
  hours: varchar('hours', { length: 50 }),
  hoursSinceLastRepair: varchar('hours_since_last_repair', { length: 50 }),
  pitLocation: varchar('pit_location', { length: 150 }),
  marking: varchar('marking', { length: 255 }),
  createdBy: integer('created_by').references(() => employees.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tireRepairPhotos = pgTable('hero_tire_repair_photos', {
  id: serial('id').primaryKey(),
  inspectionId: integer('inspection_id')
    .notNull()
    .references(() => tireRepairInspections.id, { onDelete: 'cascade' }),
  photoArea: varchar('photo_area', { length: 255 }).notNull(), // Multi-area tags (e.g. Serial Number, Area Sidewall)
  photoUrl: text('photo_url').notNull(),
  inspectDate: timestamp('inspect_date').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const tireRepairInspectionsRelations = relations(tireRepairInspections, ({ many, one }) => ({
  photos: many(tireRepairPhotos),
  creator: one(employees, {
    fields: [tireRepairInspections.createdBy],
    references: [employees.id],
  }),
}));

export const tireRepairPhotosRelations = relations(tireRepairPhotos, ({ one }) => ({
  inspection: one(tireRepairInspections, {
    fields: [tireRepairPhotos.inspectionId],
    references: [tireRepairInspections.id],
  }),
}));

export type TireRepairInspection = typeof tireRepairInspections.$inferSelect;
export type NewTireRepairInspection = typeof tireRepairInspections.$inferInsert;
export type TireRepairPhoto = typeof tireRepairPhotos.$inferSelect;

export const tireRepairJobcards = pgTable('hero_tire_repair_jobcards', {
  id: serial('id').primaryKey(),
  jobcardNo: varchar('jobcard_no', { length: 100 }).notNull().unique(),
  woNo: varchar('wo_no', { length: 100 }),
  woDate: timestamp('wo_date'),
  inspectionId: integer('inspection_id').references(() => tireRepairInspections.id, { onDelete: 'set null' }),
  plant: varchar('plant', { length: 150 }).notNull().default('Workshop Sangatta'),
  customerName: varchar('customer_name', { length: 255 }).notNull().default('PT Kaltim Prima Coal'),
  customerId: varchar('customer_id', { length: 100 }),
  receivedDate: timestamp('received_date').notNull().defaultNow(),
  serialNumber: varchar('serial_number', { length: 100 }).notNull(),
  tireSize: varchar('tire_size', { length: 100 }).notNull(),
  brand: varchar('brand', { length: 100 }),
  pattern: varchar('pattern', { length: 100 }),
  tireConstruction: varchar('tire_construction', { length: 50 }).notNull().default('RADIAL'),
  status: varchar('status', { length: 50 }).notNull().default('In Progress'), // In Progress | QC Inspection | Completed | Rework
  offRepairDate: timestamp('off_repair_date'),
  signQc: varchar('sign_qc', { length: 255 }),
  byHeadSection: varchar('by_head_section', { length: 255 }),
  createdBy: integer('created_by').references(() => employees.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tireRepairJobcardInjuries = pgTable('hero_tire_repair_jobcard_injuries', {
  id: serial('id').primaryKey(),
  jobcardId: integer('jobcard_id').notNull().references(() => tireRepairJobcards.id, { onDelete: 'cascade' }),
  injuryName: varchar('injury_name', { length: 150 }).notNull(),
  injuryDate: timestamp('injury_date').notNull().defaultNow(),
  dimensiLukaL: varchar('dimensi_luka_l', { length: 50 }),
  dimensiLukaW: varchar('dimensi_luka_w', { length: 50 }),
  dimensiLukaP: varchar('dimensi_luka_p', { length: 50 }),
  dimensiLukaT: varchar('dimensi_luka_t', { length: 50 }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const tireRepairJobcardProcesses = pgTable('hero_tire_repair_jobcard_processes', {
  id: serial('id').primaryKey(),
  injuryId: integer('injury_id').notNull().references(() => tireRepairJobcardInjuries.id, { onDelete: 'cascade' }),
  processName: varchar('process_name', { length: 100 }).notNull(),
  materialUsed: varchar('material_used', { length: 255 }),
  qty: varchar('qty', { length: 100 }),
  hours: varchar('hours', { length: 100 }),
  byWhom: varchar('by_whom', { length: 255 }),
  hardness: varchar('hardness', { length: 100 }),
  snHeatPad: varchar('sn_heat_pad', { length: 100 }),
  signQc: varchar('sign_qc', { length: 100 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type TireRepairJobcard = typeof tireRepairJobcards.$inferSelect;
export type NewTireRepairJobcard = typeof tireRepairJobcards.$inferInsert;
export type TireRepairJobcardInjury = typeof tireRepairJobcardInjuries.$inferSelect;
export type NewTireRepairJobcardInjury = typeof tireRepairJobcardInjuries.$inferInsert;
export type TireRepairJobcardProcess = typeof tireRepairJobcardProcesses.$inferSelect;
export type NewTireRepairJobcardProcess = typeof tireRepairJobcardProcesses.$inferInsert;

export type NewTireRepairPhoto = typeof tireRepairPhotos.$inferInsert;

