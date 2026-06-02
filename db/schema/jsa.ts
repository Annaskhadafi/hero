import { integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const heroJsas = pgTable('hero_jsas', {
  id: uuid('id').defaultRandom().primaryKey(),
  jsaNumber: varchar('jsa_number', { length: 255 }).notNull(),
  jobDescription: text('job_description').notNull(),
  equipmentNumber: varchar('equipment_number', { length: 255 }).notNull(),
  teamMembers: text('team_members').notNull(),
  equipmentUsed: jsonb('equipment_used').notNull().default([]),
  requirements: jsonb('requirements').notNull().default([]),
  permits: jsonb('permits').notNull().default([]),
  ppeRequirements: jsonb('ppe_requirements').notNull().default([]),
  riskLevel: varchar('risk_level', { length: 50 }).notNull(),
  signatures: jsonb('signatures').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const heroJsaSteps = pgTable('hero_jsa_steps', {
  id: uuid('id').defaultRandom().primaryKey(),
  jsaId: uuid('jsa_id')
    .notNull()
    .references(() => heroJsas.id, { onDelete: 'cascade' }),
  stepOrder: integer('step_order').notNull(),
  workStep: text('work_step').notNull(),
  hazard: text('hazard').notNull(),
  consequence: text('consequence').notNull(),
  control: text('control').notNull(),
  residualRisk: varchar('residual_risk', { length: 50 }).notNull(),
  pic: varchar('pic', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type Jsa = typeof heroJsas.$inferSelect
export type NewJsa = typeof heroJsas.$inferInsert
export type JsaStep = typeof heroJsaSteps.$inferSelect
export type NewJsaStep = typeof heroJsaSteps.$inferInsert
