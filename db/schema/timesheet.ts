import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  date,
  decimal,
  jsonb,
  uniqueIndex,
  doublePrecision,
} from 'drizzle-orm/pg-core'
import { sites, employees, formSubmissions } from '@/db/schema/hero'
import { user } from '@/db/schema/auth'

// Site-specific allowance rates configuration
export const timesheetSiteConfigs = pgTable('hero_timesheet_site_configs', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  siteCode: text('site_code').notNull(), // PPA BIB, AMM MIFA, VALE, etc
  siteName: text('site_name').notNull(),

  // Allowance rates (in Rupiah)
  msaRate: integer('msa_rate').notNull().default(0), // Mine Site Allowance
  mealsRate: integer('meals_rate').notNull().default(0),
  tlkRate: integer('tlk_rate').notNull().default(0), // Tunjangan Lokasi Khusus

  // OT calculation settings
  otDecimalMode: boolean('ot_decimal_mode').notNull().default(false), // true for VALE (4.5, 12.5), false for others (integer)

  // Summary output settings
  hasMsaSummary: boolean('has_msa_summary').notNull().default(true),
  hasMealsSummary: boolean('has_meals_summary').notNull().default(false),
  hasTlkSummary: boolean('has_tlk_summary').notNull().default(false),

  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Import batch tracking
export const timesheetImports = pgTable('hero_timesheet_imports', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),

  // Period
  periodMonth: integer('period_month').notNull(), // 1-12
  periodYear: integer('period_year').notNull(),

  // Import metadata
  importType: text('import_type').notNull(), // "ot_record" | "spl_record"
  originalFilename: text('original_filename').notNull(),
  fileStoragePath: text('file_storage_path').notNull(),

  // Processing status
  status: text('status').notNull().default('pending'), // pending | processing | completed | failed
  totalSheets: integer('total_sheets').notNull().default(0),
  processedSheets: integer('processed_sheets').notNull().default(0),
  totalRecords: integer('total_records').notNull().default(0),
  errorCount: integer('error_count').notNull().default(0),
  errorLog: jsonb('error_log'), // Array of error messages

  uploadedByUserId: text('uploaded_by_user_id').references(() => user.id, { onDelete: 'set null' }),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
})

// Daily timesheet records (normalized from Excel)
export const timesheetDailyRecords = pgTable('hero_timesheet_daily_records', {
  id: serial('id').primaryKey(),

  importId: integer('import_id')
    .notNull()
    .references(() => timesheetImports.id, { onDelete: 'cascade' }),

  siteId: integer('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),

  // Employee identification
  employeeSn: text('employee_sn').notNull(), // Primary key for matching
  employeeName: text('employee_name').notNull(),
  department: text('department').notNull().default(''),

  // Date
  recordDate: date('record_date').notNull(),
  dayOfMonth: integer('day_of_month').notNull(), // 1-31

  // OT data
  otHours: decimal('ot_hours', { precision: 5, scale: 2 }), // null if status day
  otStatus: text('ot_status'), // OFF | FB | SICK | IZIN | ALPA | LIBUR | etc
  otRemark: text('ot_remark').notNull().default(''),

  // Allowance data
  msaAmount: integer('msa_amount'), // null if not applicable
  mealsAmount: integer('meals_amount'),
  tlkAmount: integer('tlk_amount'),
  allowanceStatus: text('allowance_status'), // FB | SICK | IZIN | ALPA | etc (if no allowance given)

  // Transfer detection
  transferredToSite: text('transferred_to_site'), // Site code if employee transferred

  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Summary output generation tracking
export const timesheetSummaryOutputs = pgTable('hero_timesheet_summary_outputs', {
  id: serial('id').primaryKey(),

  // Period
  periodMonth: integer('period_month').notNull(),
  periodYear: integer('period_year').notNull(),

  // Output metadata
  outputFilename: text('output_filename').notNull(),
  fileStoragePath: text('file_storage_path').notNull(),

  // Generation status
  status: text('status').notNull().default('draft'), // draft | finalized
  totalSites: integer('total_sites').notNull().default(0),
  totalEmployees: integer('total_employees').notNull().default(0),

  // Approval tracking
  preparedBy: text('prepared_by'),
  acknowledgedBy: text('acknowledged_by'),
  approvedBy: text('approved_by'),
  checkedBy: text('checked_by'),

  generatedByUserId: text('generated_by_user_id').references(() => user.id, {
    onDelete: 'set null',
  }),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  finalizedAt: timestamp('finalized_at'),
})

// Validation warnings/errors for review
export const timesheetValidationIssues = pgTable('hero_timesheet_validation_issues', {
  id: serial('id').primaryKey(),

  importId: integer('import_id')
    .notNull()
    .references(() => timesheetImports.id, { onDelete: 'cascade' }),

  issueType: text('issue_type').notNull(), // "warning" | "error"
  severity: text('severity').notNull(), // "low" | "medium" | "high"

  employeeSn: text('employee_sn'),
  employeeName: text('employee_name'),
  recordDate: date('record_date'),

  message: text('message').notNull(),
  details: jsonb('details'),

  isResolved: boolean('is_resolved').notNull().default(false),
  resolvedByUserId: text('resolved_by_user_id').references(() => user.id, { onDelete: 'set null' }),
  resolvedAt: timestamp('resolved_at'),
  resolutionNote: text('resolution_note'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const indonesiaHolidays = pgTable(
  'hero_indonesia_holidays',
  {
    id: serial('id').primaryKey(),
    date: date('date').notNull(),
    name: text('name').notNull(),
    localName: text('local_name').notNull(),
    countryCode: text('country_code').notNull().default('ID'),
    source: text('source').notNull().default('openholiday'),
    sourceId: text('source_id'),
    types: jsonb('types').notNull().default([]),
    nationwide: boolean('nationwide').notNull().default(true),
    rawPayload: jsonb('raw_payload'),
    syncedAt: timestamp('synced_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    dateSourceUnique: uniqueIndex('hero_indonesia_holidays_date_source_uidx').on(
      table.date,
      table.source
    ),
  })
)

export const timesheetSchedulingConfigs = pgTable(
  'hero_timesheet_scheduling_configs',
  {
    id: serial('id').primaryKey(),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    scheduleType: text('schedule_type').notNull().default('office'),
    rosterType: text('roster_type').notNull().default('5:2'),
    msaType: text('msa_type').notNull().default('staff-nonstaff'),
    mealsType: text('meals_type').notNull().default('field-break'),
    overtimeType: text('overtime_type').notNull().default('five-hour'),
    fieldBreakConfig: jsonb('field_break_config'),
    allowanceVariables: jsonb('allowance_variables').notNull().default([]),
    overtimeVariables: jsonb('overtime_variables').notNull().default([]),
    overtimeConfig: jsonb('overtime_config'),
    pdfConfig: jsonb('pdf_config'),
    savedByUserId: text('saved_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    siteUnique: uniqueIndex('hero_timesheet_scheduling_configs_site_uidx').on(table.siteId),
  })
)

export const timesheetSchedulingStatuses = pgTable(
  'hero_timesheet_scheduling_statuses',
  {
    id: serial('id').primaryKey(),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    period: text('period').notNull(),
    scheduleStatus: text('schedule_status').notNull().default('draft'),
    attendanceStatus: text('attendance_status').notNull().default('draft'),
    importStatus: text('import_status').notNull().default('none'),
    conflictCount: integer('conflict_count').notNull().default(0),
    lastGeneratedAt: timestamp('last_generated_at'),
    lastSavedAt: timestamp('last_saved_at'),
    lastImportedAt: timestamp('last_imported_at'),
    finalizedAt: timestamp('finalized_at'),
    savedByUserId: text('saved_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    sitePeriodUnique: uniqueIndex('hero_timesheet_scheduling_statuses_site_period_uidx').on(
      table.siteId,
      table.period
    ),
  })
)

export const timesheetAttendanceImportTemplates = pgTable(
  'hero_timesheet_attendance_import_templates',
  {
    id: serial('id').primaryKey(),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    templateName: text('template_name').notNull(),
    sourceType: text('source_type').notNull().default('fingerprint'),
    sheetName: text('sheet_name').notNull().default(''),
    headerRow: integer('header_row'),
    columnMapping: jsonb('column_mapping').notNull().default({}),
    matchRules: jsonb('match_rules').notNull().default({}),
    templateKind: text('template_kind').notNull().default('auto'),
    headerSignature: text('header_signature').notNull().default(''),
    lastUsedAt: timestamp('last_used_at'),
    usageCount: integer('usage_count').notNull().default(0),
    confidence: integer('confidence').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    siteTemplateUnique: uniqueIndex('hero_timesheet_attendance_import_templates_site_name_uidx').on(
      table.siteId,
      table.templateName
    ),
  })
)

export const timesheetAttendanceImportPreviews = pgTable(
  'hero_timesheet_attendance_import_previews',
  {
    id: serial('id').primaryKey(),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    period: text('period').notNull(),
    filename: text('filename').notNull(),
    status: text('status').notNull().default('preview'),
    matchedCount: integer('matched_count').notNull().default(0),
    unmatchedCount: integer('unmatched_count').notNull().default(0),
    cellCount: integer('cell_count').notNull().default(0),
    conflictCount: integer('conflict_count').notNull().default(0),
    previewRows: jsonb('preview_rows').notNull().default([]),
    conflicts: jsonb('conflicts').notNull().default([]),
    templateId: integer('template_id').references(() => timesheetAttendanceImportTemplates.id, {
      onDelete: 'set null',
    }),
    templateKind: text('template_kind').notNull().default('auto'),
    sheetName: text('sheet_name').notNull().default(''),
    detectionSummary: jsonb('detection_summary').notNull().default({}),
    validationSummary: jsonb('validation_summary').notNull().default({}),
    uploadedByUserId: text('uploaded_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    appliedAt: timestamp('applied_at'),
    deletedAt: timestamp('deleted_at'),
    rolledBackAt: timestamp('rolled_back_at'),
  }
)

export const timesheetSchedulingPlans = pgTable(
  'hero_timesheet_scheduling_plans',
  {
    id: serial('id').primaryKey(),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    period: text('period').notNull(),
    siteScheduleType: text('site_schedule_type').notNull().default('office'),
    draftSchedule: jsonb('draft_schedule').notNull().default([]),
    fixedSchedule: jsonb('fixed_schedule').notNull().default([]),
    employeeProfiles: jsonb('employee_profiles').notNull().default([]),
    fieldBreakConfig: jsonb('field_break_config'),
    savedByUserId: text('saved_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    sitePeriodUnique: uniqueIndex('hero_timesheet_scheduling_plans_site_period_uidx').on(
      table.siteId,
      table.period
    ),
  })
)

export const timesheetSchedulingPlansV2 = pgTable(
  'hero_timesheet_scheduling_plans_v2',
  {
    id: serial('id').primaryKey(),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    period: text('period').notNull(),
    status: text('status').notNull().default('draft'),
    draftSchedule: jsonb('draft_schedule').notNull().default([]),
    activeSchedule: jsonb('active_schedule').notNull().default([]),
    createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    updatedByUserId: text('updated_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    activatedAt: timestamp('activated_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    sitePeriodUnique: uniqueIndex('hero_timesheet_scheduling_plans_v2_site_period_uidx').on(
      table.siteId,
      table.period
    ),
  })
)

export const timesheetFieldBreakPlans = pgTable(
  'hero_timesheet_field_break_plans',
  {
    id: serial('id').primaryKey(),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    period: text('period').notNull(),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    employeeName: text('employee_name').notNull(),
    sectionName: text('section_name').notNull().default(''),
    rosterSection: text('roster_section').notNull().default(''),
    onSiteDate: date('on_site_date'),
    dayCount: integer('day_count'),
    fieldBreakDate: date('field_break_date'),
    fieldBreakEndDate: date('field_break_end_date'),
    source: text('source').notNull().default('manual'),
    isLocked: boolean('is_locked').notNull().default(false),
    notes: text('notes').notNull().default(''),
    savedByUserId: text('saved_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    employeePeriodUnique: uniqueIndex('hero_timesheet_field_break_plans_employee_period_uidx').on(
      table.siteId,
      table.period,
      table.employeeId
    ),
  })
)

export const timesheetPayrollSnapshots = pgTable(
  'hero_timesheet_payroll_snapshots',
  {
    id: serial('id').primaryKey(),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    period: text('period').notNull(),
    status: text('status').notNull().default('draft'),
    employeeCount: integer('employee_count').notNull().default(0),
    totalMsa: integer('total_msa').notNull().default(0),
    totalMeals: integer('total_meals').notNull().default(0),
    totalTlk: integer('total_tlk').notNull().default(0),
    totalOvertimeHours: decimal('total_overtime_hours', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    metadata: jsonb('metadata').notNull().default({}),
    savedByUserId: text('saved_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    generatedAt: timestamp('generated_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    sitePeriodUnique: uniqueIndex('hero_timesheet_payroll_snapshots_site_period_uidx').on(
      table.siteId,
      table.period
    ),
  })
)

export const timesheetPayrollSnapshotItems = pgTable(
  'hero_timesheet_payroll_snapshot_items',
  {
    id: serial('id').primaryKey(),
    snapshotId: integer('snapshot_id')
      .notNull()
      .references(() => timesheetPayrollSnapshots.id, { onDelete: 'cascade' }),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    day: integer('day').notNull(),
    scheduleCode: text('schedule_code').notNull().default(''),
    attendanceStatus: text('attendance_status').notNull().default('empty'),
    clockIn: text('clock_in').notNull().default(''),
    clockOut: text('clock_out').notNull().default(''),
    msaAmount: integer('msa_amount').notNull().default(0),
    mealsAmount: integer('meals_amount').notNull().default(0),
    tlkAmount: integer('tlk_amount').notNull().default(0),
    overtimeHours: decimal('overtime_hours', { precision: 8, scale: 2 }).notNull().default('0'),
    source: text('source').notNull().default('attendance'),
    notes: text('notes').notNull().default(''),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    snapshotEmployeeDayUnique: uniqueIndex(
      'hero_timesheet_payroll_snapshot_items_snapshot_employee_day_uidx'
    ).on(table.snapshotId, table.employeeId, table.day),
  })
)

export const timesheetAttendanceEmployeeAliases = pgTable(
  'hero_timesheet_attendance_employee_aliases',
  {
    id: serial('id').primaryKey(),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    aliasName: text('alias_name').notNull().default(''),
    aliasSn: text('alias_sn').notNull().default(''),
    source: text('source').notNull().default('attendance-import'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    siteAliasUnique: uniqueIndex('hero_timesheet_attendance_employee_aliases_site_alias_uidx').on(
      table.siteId,
      table.aliasName,
      table.aliasSn
    ),
  })
)

export const timesheetAttendanceRealOverrides = pgTable(
  'hero_timesheet_attendance_real_overrides',
  {
    id: serial('id').primaryKey(),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    period: text('period').notNull(),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    day: integer('day').notNull(),
    status: text('status').notNull().default('empty'),
    clockIn: text('clock_in').notNull().default(''),
    clockOut: text('clock_out').notNull().default(''),
    note: text('note').notNull().default(''),
    source: text('source').notNull().default('manual'),
    importPreviewId: integer('import_preview_id').references(
      () => timesheetAttendanceImportPreviews.id,
      {
        onDelete: 'set null',
      }
    ),
    validationFlags: jsonb('validation_flags').notNull().default([]),
    workMinutes: integer('work_minutes'),
    overtimeHours: doublePrecision('overtime_hours'),
    savedByUserId: text('saved_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    employeeDayUnique: uniqueIndex('hero_timesheet_attendance_real_overrides_employee_day_uidx').on(
      table.siteId,
      table.period,
      table.employeeId,
      table.day
    ),
  })
)

export const attendancePermissionRequests = pgTable(
  'hero_attendance_permission_requests',
  {
    id: serial('id').primaryKey(),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    approvalSubmissionId: integer('approval_submission_id').references(() => formSubmissions.id, {
      onDelete: 'set null',
    }),
    permissionType: text('permission_type').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    sickCategory: text('sick_category').notNull().default(''),
    lateReason: text('late_reason').notNull().default(''),
    returnTime: text('return_time').notNull().default(''),
    reason: text('reason').notNull().default(''),
    attachmentUrl: text('attachment_url').notNull().default(''),
    status: text('status').notNull().default('pending'),
    approverUserId: text('approver_user_id').references(() => user.id, { onDelete: 'set null' }),
    approverNote: text('approver_note').notNull().default(''),
    approvedAt: timestamp('approved_at'),
    rejectedAt: timestamp('rejected_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    employeeDateIdx: uniqueIndex('hero_attendance_permission_requests_employee_date_uidx').on(
      table.employeeId,
      table.startDate,
      table.permissionType
    ),
  })
)
