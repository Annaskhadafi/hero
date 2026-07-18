import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { employees } from './hero'
import { sites } from './hero'

// ============================================================
// EWH (EFFECTIVE WORKING HOURS) & UNIT UTILITY TRACKING
// ============================================================

/**
 * Master data unit/alat berat per site.
 * Digunakan untuk resolving freetext unitNumber dari session items
 * ke unit terstruktur, serta untuk Unit Utility Dashboard.
 */
export const unitMaster = pgTable(
  'hero_unit_master',
  {
    id: serial('id').primaryKey(),
    siteId: integer('site_id').references(() => sites.id, { onDelete: 'set null' }),
    unitCode: text('unit_code').notNull(),
    unitName: text('unit_name').notNull(),
    // 'dump_truck' | 'excavator' | 'grader' | 'compactor' | 'bulldozer' | 'crane' | 'truck' | 'other'
    unitType: text('unit_type').notNull().default('other'),
    unitModel: text('unit_model').notNull().default(''),
    unitYear: integer('unit_year'),
    licensePlate: text('license_plate').notNull().default(''),
    capacity: text('capacity').notNull().default(''),       // "60" for 60 ton
    capacityUnit: text('capacity_unit').notNull().default('ton'), // 'ton' | 'm3' | 'other'
    department: text('department').notNull().default(''),
    isActive: boolean('is_active').notNull().default(true),
    photoUrl: text('photo_url').notNull().default(''),
    notes: text('notes').notNull().default(''),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    siteCodeUnique: uniqueIndex('hero_unit_master_site_code_uq').on(table.siteId, table.unitCode),
  })
)

/**
 * Break/shift duration configuration per site per shift.
 * Digunakan untuk mengurangi break time dari jam kerja efektif (EWH).
 * Default: 60 menit untuk semua shift.
 */
export const ewhShiftConfig = pgTable(
  'hero_ewh_shift_config',
  {
    id: serial('id').primaryKey(),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    // 'DS' = Day Shift, 'NS' = Night Shift, 'ALL' = semua shift
    shiftCode: text('shift_code').notNull().default('ALL'),
    breakMinutes: integer('break_minutes').notNull().default(60),
    effectiveFrom: timestamp('effective_from').notNull().defaultNow(),
    effectiveTo: timestamp('effective_to'),
    isActive: boolean('is_active').notNull().default(true),
    createdByEmployeeId: integer('created_by_employee_id').references(() => employees.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    siteShiftActiveUnique: uniqueIndex('hero_ewh_shift_config_site_shift_uq').on(
      table.siteId,
      table.shiftCode
    ),
  })
)

/**
 * Snapshot EWH per karyawan per hari kerja.
 * Di-recalculate secara realtime setiap kali:
 * - Attendance real override berubah (clockIn/clockOut)
 * - Daily Activity session di-submit/approve
 * - SPL status berubah (untuk overtimeMinutes)
 *
 * Formula:
 *   clockDurationMinutes = clockOut - clockIn (dalam menit)
 *   effectiveMinutes     = clockDurationMinutes - breakMinutes
 *   idleMinutes          = 1440 - clockDurationMinutes
 *   ewhPercent           = (effectiveMinutes / 1440) * 100
 */
export const ewhDailySnapshots = pgTable(
  'hero_ewh_daily_snapshots',
  {
    id: serial('id').primaryKey(),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    // workDate = tanggal kerja. Untuk NS yang melewati tengah malam,
    // workDate mengikuti workDate dari dailyActivitySession (hari sebelumnya).
    workDate: timestamp('work_date').notNull(),
    period: text('period').notNull(),                   // "2026-07"
    shiftCode: text('shift_code').notNull().default('DS'),
    clockIn: text('clock_in'),                         // "07:00"
    clockOut: text('clock_out'),                       // "19:00"
    // Basis availability = 1440 menit (24 jam), standar pertambangan
    availabilityMinutes: integer('availability_minutes').notNull().default(1440),
    clockDurationMinutes: integer('clock_duration_minutes').notNull().default(0),
    breakMinutes: integer('break_minutes').notNull().default(60),
    effectiveMinutes: integer('effective_minutes').notNull().default(0),   // clockDuration - break
    idleMinutes: integer('idle_minutes').notNull().default(1440),          // 1440 - clockDuration
    ewhPercent: text('ewh_percent').notNull().default('0.00'),             // "54.17" (2 desimal)
    activitySessionCount: integer('activity_session_count').notNull().default(0),
    checkedItemCount: integer('checked_item_count').notNull().default(0),
    totalItemCount: integer('total_item_count').notNull().default(0),
    overtimeMinutes: integer('overtime_minutes').notNull().default(0),     // dari SPL yang approved
    isFinalized: boolean('is_finalized').notNull().default(false),
    calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    employeeDateUnique: uniqueIndex('hero_ewh_daily_snapshots_employee_date_uq').on(
      table.employeeId,
      table.workDate
    ),
  })
)

/**
 * Snapshot utilitas per unitNumber per hari kerja.
 * unitNumber bersifat freetext — bisa unit tambang (DT001, EX002)
 * atau objek workshop (SN-12345 untuk ban, EQ-PUMP-01 untuk equipment).
 *
 * Di-recalculate realtime setiap kali session item dengan unitNumber
 * yang sama di-save/update.
 *
 * Mode A (Unit Tambang): totalUsageMinutes = Σ jam semua operator
 *   → utilityPercent = totalUsageMinutes / 1440 * 100
 *
 * Mode B (Workshop Object): operatorSnapshot berisi breakdown per orang
 *   → totalUsageMinutes = Σ semua aktivitas (tapi ditampilkan per-aktivitas, bukan aggregate)
 */
export const unitUtilityDaily = pgTable(
  'hero_unit_utility_daily',
  {
    id: serial('id').primaryKey(),
    unitNumber: text('unit_number').notNull(),          // freetext, e.g. "DT001", "SN-12345"
    unitId: integer('unit_id').references(() => unitMaster.id, { onDelete: 'set null' }),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    workDate: timestamp('work_date').notNull(),
    period: text('period').notNull(),                   // "2026-07"
    totalUsageMinutes: integer('total_usage_minutes').notNull().default(0),
    utilityPercent: text('utility_percent').notNull().default('0.00'),
    operatorCount: integer('operator_count').notNull().default(0),
    activityEntryCount: integer('activity_entry_count').notNull().default(0),
    breakdownMinutes: integer('breakdown_minutes').notNull().default(0),
    standbyMinutes: integer('standby_minutes').notNull().default(0),
    // JSON: [{employeeId, employeeName, section, startedAt, endedAt, durationMinutes, activityLabel, sessionCode}]
    operatorSnapshot: jsonb('operator_snapshot').notNull().default('[]'),
    calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    unitNumberDateUnique: uniqueIndex('hero_unit_utility_daily_unit_date_uq').on(
      table.unitNumber,
      table.siteId,
      table.workDate
    ),
  })
)

/**
 * EWH Teams table.
 * Group employees into teams per site.
 */
export const ewhTeams = pgTable(
  'hero_ewh_teams',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    section: text('section').notNull().default(''),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  }
)

/**
 * EWH Team Members junction table.
 */
export const ewhTeamMembers = pgTable(
  'hero_ewh_team_members',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => ewhTeams.id, { onDelete: 'cascade' }),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'), // 'lead' | 'member'
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  }
)
