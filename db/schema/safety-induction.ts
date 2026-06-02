import { pgTable, serial, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const heroSafetyInductions = pgTable('hero_safety_inductions', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  companyOrigin: varchar('company_origin', { length: 255 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 50 }).notNull(),
  purpose: text('purpose').notNull(),
  signatureUrl: varchar('signature_url', { length: 2048 }),
  agreedAt: timestamp('agreed_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type SafetyInduction = typeof heroSafetyInductions.$inferSelect
export type NewSafetyInduction = typeof heroSafetyInductions.$inferInsert
