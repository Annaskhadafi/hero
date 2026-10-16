import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { employees } from './hero'

// Tabel utama Compensation & Benefit per karyawan
// compensation_type: 'leadership_allowance' | 'housing_allowance' | 'position_site_allowance'
export const heroCompensationBenefit = pgTable('hero_compensation_benefit', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  compensationType: text('compensation_type').notNull(), // 'leadership_allowance' | 'housing_allowance' | 'position_site_allowance'
  nominal: integer('nominal').notNull().default(0),       // Nilai dalam Rupiah
  remarks: text('remarks').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type HeroCompensationBenefit = typeof heroCompensationBenefit.$inferSelect
export type NewHeroCompensationBenefit = typeof heroCompensationBenefit.$inferInsert

// Label display untuk compensation type
export const COMPENSATION_TYPE_LABELS: Record<string, string> = {
  leadership_allowance: 'Leadership Allowance',
  housing_allowance: 'Housing Allowance',
  position_site_allowance: 'Position Site Allowance',
}

export const COMPENSATION_TYPES = [
  { value: 'leadership_allowance', label: 'Leadership Allowance' },
  { value: 'housing_allowance', label: 'Housing Allowance' },
  { value: 'position_site_allowance', label: 'Position Site Allowance' },
] as const

// ─── Level Hierarchy Ranking (0: Tertinggi -> 99: Terendah) ───────────────────

export function getLevelRank(levelName: string | null | undefined): number {
  if (!levelName) return 99
  const lower = levelName.toLowerCase().trim().replace(/[\s_-]+/g, ' ')

  // 1. BOD / Executive / Direksi / General Manager
  if (/bod|executive|direktur|director|general manager|\bgm\b|presiden|president|komisaris/i.test(lower)) return 1

  // 2. Manager / Department Head / PJO Site
  if (/manager|mgr|kepala departemen|dept head|pjo/i.test(lower)) return 2

  // 3. Superintendent / Deputy Manager
  if (/superintendent|deputy manager|wakil manager/i.test(lower)) return 3

  // 4. Supervisor / SPV / Supervisi / Specialist
  if (/supervisor|spv|supervisi|specialist/i.test(lower)) return 4

  // 5. Coordinator / Koordinator
  if (/coordinator|koordinator/i.test(lower)) return 5

  // 6. Leader / Team Leader / Foreman / Head Section / Section Head
  if (/leader|foreman|section head|head section|lead|chief/i.test(lower)) return 6

  // 7. Sub Leader / Subleader
  if (/sub leader|subleader|sublead/i.test(lower)) return 7

  // 8. Senior Staff / Officer / Engineer / Analyst
  if (/senior staff|officer|engineer|analyst/i.test(lower)) return 8

  // 9. Staff
  if (/\bstaff\b/i.test(lower)) return 9

  // 10. Non Staff / Operator / Mekanik / Driver / Security / Helper
  if (/non staff|nonstaff|operator|mekanik|mechanic|driver|security|satpam|helper|office boy|\bob\b/i.test(lower)) return 10

  // 11. Rookie / Trainee / Intern / Magang
  if (/rookie|trainee|intern|magang/i.test(lower)) return 11

  return 50 // default unknown in the middle
}
