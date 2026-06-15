import {
  type AnyPgColumn,
  boolean,
  decimal,
  doublePrecision,
  integer,
  date,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { user } from '@/db/schema/auth'

export const sites = pgTable('hero_sites', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  provinceId: text('province_id').notNull().default(''),
  provinceName: text('province_name').notNull().default(''),
  regencyId: text('regency_id').notNull().default(''),
  regencyName: text('regency_name').notNull().default(''),
  districtId: text('district_id').notNull().default(''),
  districtName: text('district_name').notNull().default(''),
  villageId: text('village_id').notNull().default(''),
  villageName: text('village_name').notNull().default(''),
  addressDetail: text('address_detail').notNull().default(''),
  geoLatitude: text('geo_latitude').notNull().default(''),
  geoLongitude: text('geo_longitude').notNull().default(''),
  geoRadiusMeters: integer('geo_radius_meters').notNull().default(500),
  customerName: text('customer_name').notNull(),
  contractNumber: text('contract_number').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
// Sub Section (kept for backward compatibility)
export const masterSubSections = pgTable('hero_master_sub_sections', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  sectionId: integer('section_id').references(() => masterSections.id, { onDelete: 'set null' }),
  description: text('description').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Job Title
export const masterJobTitles = pgTable('hero_master_job_titles', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Level Staff
export const masterLevelStaff = pgTable('hero_master_level_staff', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  code: text('code').notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const employees = pgTable('hero_employees', {
  id: serial('id').primaryKey(),
  authUserId: text('auth_user_id').references(() => user.id, {
    onDelete: 'set null',
  }),
  siteId: integer('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  employeeSn: text('employee_sn').notNull().default(''),
  joinYear: integer('join_year').notNull().default(new Date().getFullYear()),
  joinDate: date('join_date'),
  contractDurationStart: date('contract_duration_start'),
  contractDurationEnd: date('contract_duration_end'),
  permanentDate: date('permanent_date'),
  pointOfHire: text('point_of_hire').notNull().default(''),
  birthDate: date('birth_date'),
  gender: text('gender').notNull().default(''),
  maritalStatus: text('marital_status').notNull().default(''),
  religion: text('religion').notNull().default(''),
  education: text('education').notNull().default(''),
  birthPlaceDate: text('birth_place_date').notNull().default(''),
  domicile: text('domicile').notNull().default(''),
  directManagerId: integer('direct_manager_id'),
  departmentId: integer('department_id'),
  sectionId: integer('section_id'),
  positionId: integer('position_id'),
  orgNodeId: integer('org_node_id'),
  section: text('section').notNull().default(''),
  role: text('role').notNull(),
  department: text('department').notNull(),
  jobTitle: text('job_title').notNull().default(''),
  workLocation: text('work_location').notNull().default(''),
  phoneNumber: text('phone_number').notNull().default(''),
  employmentStatus: text('employment_status').notNull().default('active'),
  employeeStatusType: text('employee_status_type').notNull().default('Permanen | Staff'),
  accessRole: text('access_role').notNull().default('Site Admin'),
  levelName: text('level_name').notNull().default('Rookie'),
  totalPoints: integer('total_points').notNull().default(0),
  fitStatus: text('fit_status').notNull().default('fit'),
  isActive: boolean('is_active').notNull().default(true),
  invitationToken: text('invitation_token'),
  invitationExpiresAt: timestamp('invitation_expires_at'),
  invitationAcceptedAt: timestamp('invitation_accepted_at'),
  emailVerificationToken: text('email_verification_token'),
  emailVerificationExpiresAt: timestamp('email_verification_expires_at'),
  emailVerified: boolean('email_verified').notNull().default(false),
  faceEmbedding: jsonb('face_embedding'),
  faceRegisteredAt: timestamp('face_registered_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const employeeSiteAssignments = pgTable(
  'hero_employee_site_assignments',
  {
    id: serial('id').primaryKey(),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    assignmentType: text('assignment_type').notNull().default('primary'),
    effectiveFrom: date('effective_from').notNull(),
    effectiveTo: date('effective_to'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    employeeSiteEffectiveUnique: uniqueIndex(
      'hero_employee_site_assignments_employee_site_effective_uq'
    ).on(table.employeeId, table.siteId, table.effectiveFrom),
  })
)

export const activityLibraries = pgTable('hero_activity_libraries', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').references(() => sites.id, { onDelete: 'set null' }),
  activityCode: text('activity_code').notNull().unique(),
  activityName: text('activity_name').notNull(),
  category: text('category').notNull().default('Technical'),
  departmentId: integer('department_id'),
  sectionId: integer('section_id'),
  basePoints: integer('base_points').notNull().default(5),
  complexityLevel: integer('complexity_level').notNull().default(1),
  requiresPhoto: boolean('requires_photo').notNull().default(false),
  requiresEquipmentNo: boolean('requires_equipment_no').notNull().default(false),
  requiresDuration: boolean('requires_duration').notNull().default(true),
  requiresLocationGps: boolean('requires_location_gps').notNull().default(false),
  requiresMaterialUsed: boolean('requires_material_used').notNull().default(false),
  maxDailyCount: integer('max_daily_count').notNull().default(3),
  maxPointsPerDay: integer('max_points_per_day').notNull().default(50),
  isAssignable: boolean('is_assignable').notNull().default(true),
  isSelfInput: boolean('is_self_input').notNull().default(true),
  approvalRequired: boolean('approval_required').notNull().default(true),
  autoApproveIfGpsValid: boolean('auto_approve_if_gps_valid').notNull().default(false),
  slaHours: integer('sla_hours').notNull().default(24),
  isActive: boolean('is_active').notNull().default(true),
  createdByEmployeeId: integer('created_by_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const activityRouteTemplates = pgTable('hero_activity_route_templates', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').references(() => sites.id, { onDelete: 'set null' }),
  departmentId: integer('department_id'),
  sectionId: integer('section_id'),
  positionId: integer('position_id'),
  routeCode: text('route_code').notNull().unique(),
  routeName: text('route_name').notNull(),
  shiftCode: text('shift_code').notNull().default('ALL'),
  description: text('description').notNull().default(''),
  mobileEnabled: boolean('mobile_enabled').notNull().default(true),
  approvalRequired: boolean('approval_required').notNull().default(false),
  versionLabel: text('version_label').notNull().default('v1'),
  effectiveFrom: timestamp('effective_from').notNull().defaultNow(),
  effectiveTo: timestamp('effective_to'),
  isActive: boolean('is_active').notNull().default(true),
  createdByEmployeeId: integer('created_by_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const activityRouteGroups = pgTable('hero_activity_route_groups', {
  id: serial('id').primaryKey(),
  routeTemplateId: integer('route_template_id')
    .notNull()
    .references(() => activityRouteTemplates.id, { onDelete: 'cascade' }),
  groupKey: text('group_key').notNull(),
  groupName: text('group_name').notNull(),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(1),
  isRequired: boolean('is_required').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const activityRouteItems = pgTable('hero_activity_route_items', {
  id: serial('id').primaryKey(),
  routeGroupId: integer('route_group_id')
    .notNull()
    .references(() => activityRouteGroups.id, { onDelete: 'cascade' }),
  libraryActivityId: integer('library_activity_id').references(() => activityLibraries.id, {
    onDelete: 'set null',
  }),
  itemCode: text('item_code').notNull().default(''),
  itemLabel: text('item_label').notNull(),
  itemDescription: text('item_description').notNull().default(''),
  pointOverride: integer('point_override'),
  requiresUnit: boolean('requires_unit').notNull().default(false),
  requiresTime: boolean('requires_time').notNull().default(true),
  requiresRemark: boolean('requires_remark').notNull().default(false),
  requiresPhoto: boolean('requires_photo').notNull().default(false),
  requiresChecklistEvidence: boolean('requires_checklist_evidence').notNull().default(false),
  isOptional: boolean('is_optional').notNull().default(false),
  allowCustomUnit: boolean('allow_custom_unit').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const activitySectionPointOverrides = pgTable('hero_activity_section_point_overrides', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').references(() => sites.id, { onDelete: 'set null' }),
  departmentId: integer('department_id'),
  sectionId: integer('section_id'),
  positionId: integer('position_id'),
  libraryActivityId: integer('library_activity_id')
    .notNull()
    .references(() => activityLibraries.id, { onDelete: 'cascade' }),
  overrideLabel: text('override_label').notNull().default(''),
  overridePoints: integer('override_points'),
  reason: text('reason').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdByEmployeeId: integer('created_by_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const overtimeCommandLetters = pgTable('hero_overtime_command_letters', {
  id: serial('id').primaryKey(),
  requestSubmissionId: integer('request_submission_id'),
  siteId: integer('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  departmentId: integer('department_id'),
  sectionId: integer('section_id'),
  positionId: integer('position_id'),
  requestedByEmployeeId: integer('requested_by_employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  approvedByEmployeeId: integer('approved_by_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  splNumber: text('spl_number').notNull().unique(),
  title: text('title').notNull(),
  workDate: timestamp('work_date').notNull(),
  plannedStartAt: timestamp('planned_start_at'),
  plannedEndAt: timestamp('planned_end_at'),
  status: text('status').notNull().default('draft'),
  requestNotes: text('request_notes').notNull().default(''),
  executionNotes: text('execution_notes').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const overtimeCommandLetterItems = pgTable('hero_overtime_command_letter_items', {
  id: serial('id').primaryKey(),
  overtimeCommandLetterId: integer('overtime_command_letter_id')
    .notNull()
    .references(() => overtimeCommandLetters.id, { onDelete: 'cascade' }),
  assignedEmployeeId: integer('assigned_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  routeTemplateId: integer('route_template_id').references(() => activityRouteTemplates.id, {
    onDelete: 'set null',
  }),
  routeItemId: integer('route_item_id').references(() => activityRouteItems.id, {
    onDelete: 'set null',
  }),
  libraryActivityId: integer('library_activity_id').references(() => activityLibraries.id, {
    onDelete: 'set null',
  }),
  lineLabel: text('line_label').notNull(),
  lineDescription: text('line_description').notNull().default(''),
  targetUnit: text('target_unit').notNull().default(''),
  estimatedMinutes: integer('estimated_minutes').notNull().default(60),
  plannedPoints: integer('planned_points').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(1),
  isCustomLine: boolean('is_custom_line').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const overtimeRequestLeaderPermissions = pgTable(
  'hero_overtime_request_leader_permissions',
  {
    id: serial('id').primaryKey(),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    leaderEmployeeId: integer('leader_employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    enabledByEmployeeId: integer('enabled_by_employee_id').references(() => employees.id, {
      onDelete: 'set null',
    }),
    note: text('note').notNull().default(''),
    isActive: boolean('is_active').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    siteLeaderUnique: uniqueIndex('hero_overtime_request_leader_permissions_site_leader_uq').on(
      table.siteId,
      table.leaderEmployeeId
    ),
  })
)

export const dailyActivitySessions = pgTable('hero_daily_activity_sessions', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  employeeId: integer('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  departmentId: integer('department_id'),
  sectionId: integer('section_id'),
  positionId: integer('position_id'),
  routeTemplateId: integer('route_template_id').references(() => activityRouteTemplates.id, {
    onDelete: 'set null',
  }),
  overtimeCommandLetterId: integer('overtime_command_letter_id').references(
    () => overtimeCommandLetters.id,
    {
      onDelete: 'set null',
    }
  ),
  legacyAssignmentId: integer('legacy_assignment_id'),
  sessionCode: text('session_code').notNull().unique(),
  shiftCode: text('shift_code').notNull().default('ALL'),
  workDate: timestamp('work_date').notNull(),
  status: text('status').notNull().default('draft'),
  submissionSource: text('submission_source').notNull().default('route'),
  startedAt: timestamp('started_at'),
  submittedAt: timestamp('submitted_at'),
  approvedAt: timestamp('approved_at'),
  summaryRemark: text('summary_remark').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const dailyActivitySessionItems = pgTable('hero_daily_activity_session_items', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .notNull()
    .references(() => dailyActivitySessions.id, { onDelete: 'cascade' }),
  routeItemId: integer('route_item_id').references(() => activityRouteItems.id, {
    onDelete: 'set null',
  }),
  libraryActivityId: integer('library_activity_id').references(() => activityLibraries.id, {
    onDelete: 'set null',
  }),
  overtimeCommandLetterItemId: integer('overtime_command_letter_item_id').references(
    () => overtimeCommandLetterItems.id,
    { onDelete: 'set null' }
  ),
  snapshotLabel: text('snapshot_label').notNull(),
  snapshotGroupName: text('snapshot_group_name').notNull().default(''),
  snapshotPayload: text('snapshot_payload').notNull().default('{}'),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  checkedAt: timestamp('checked_at'),
  unitNumber: text('unit_number').notNull().default(''),
  remark: text('remark').notNull().default(''),
  actualPoints: integer('actual_points').notNull().default(0),
  isChecked: boolean('is_checked').notNull().default(false),
  isCustomItem: boolean('is_custom_item').notNull().default(false),
  photoCount: integer('photo_count').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const dailyActivitySessionSignoffs = pgTable(
  'hero_daily_activity_session_signoffs',
  {
    id: serial('id').primaryKey(),
    sessionId: integer('session_id')
      .notNull()
      .references(() => dailyActivitySessions.id, { onDelete: 'cascade' }),
    employeeSignerName: text('employee_signer_name').notNull().default(''),
    employeeSignatureUrl: text('employee_signature_url').notNull().default(''),
    employeeSignedAt: timestamp('employee_signed_at'),
    customerSignerName: text('customer_signer_name').notNull().default(''),
    customerSignatureUrl: text('customer_signature_url').notNull().default(''),
    customerSignedAt: timestamp('customer_signed_at'),
    hrCheckerName: text('hr_checker_name').notNull().default(''),
    hrChecklistStatus: text('hr_checklist_status').notNull().default('pending'),
    hrChecklistNote: text('hr_checklist_note').notNull().default(''),
    hrSignatureUrl: text('hr_signature_url').notNull().default(''),
    hrCheckedAt: timestamp('hr_checked_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    sessionUnique: uniqueIndex('hero_daily_activity_session_signoffs_session_id_uq').on(
      table.sessionId
    ),
  })
)

export const jobAssignments = pgTable('hero_job_assignments', {
  id: serial('id').primaryKey(),
  assignedByEmployeeId: integer('assigned_by_employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  assignedToEmployeeId: integer('assigned_to_employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  siteId: integer('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  libraryActivityId: integer('library_activity_id').references(() => activityLibraries.id, {
    onDelete: 'set null',
  }),
  customJobName: text('custom_job_name').notNull().default(''),
  priority: text('priority').notNull().default('Normal'),
  estimatedDuration: integer('estimated_duration').notNull().default(60),
  notes: text('notes').notNull().default(''),
  assignmentType: text('assignment_type').notNull().default('individual'),
  assignedDate: timestamp('assigned_date').notNull().defaultNow(),
  deadline: timestamp('deadline'),
  status: text('status').notNull().default('NOT_STARTED'),
  isMandatory: boolean('is_mandatory').notNull().default(false),
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurrenceRule: text('recurrence_rule').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const activities = pgTable('hero_activities', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  employeeId: integer('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  activityCode: text('activity_code').notNull(),
  activityType: text('activity_type').notNull(),
  title: text('title').notNull(),
  unitNumber: text('unit_number').notNull(),
  libraryActivityId: integer('library_activity_id'),
  assignmentId: integer('assignment_id'),
  sourceMode: text('source_mode').notNull().default('self_input'),
  customActivityName: text('custom_activity_name').notNull().default(''),
  customActivityDescription: text('custom_activity_description').notNull().default(''),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  status: text('status').notNull(),
  priority: text('priority').notNull().default('normal'),
  submissionTime: timestamp('submission_time'),
  submissionCategory: text('submission_category').notNull().default('on_time'),
  equipmentNo: text('equipment_no').notNull().default(''),
  materialUsed: text('material_used').notNull().default(''),
  gpsLat: text('gps_lat').notNull().default(''),
  gpsLng: text('gps_lng').notNull().default(''),
  gpsValid: boolean('gps_valid').notNull().default(false),
  photoCount: integer('photo_count').notNull().default(0),
  remarks: text('remarks').notNull().default(''),
  pointsAwarded: integer('points_awarded').notNull().default(0),
  penaltyDeducted: integer('penalty_deducted').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const approvals = pgTable('hero_approvals', {
  id: serial('id').primaryKey(),
  activityId: integer('activity_id')
    .notNull()
    .references(() => activities.id, { onDelete: 'cascade' }),
  level: integer('level').notNull(),
  approverName: text('approver_name').notNull(),
  approverEmployeeId: integer('approver_employee_id'),
  approverNodeId: integer('approver_node_id'),
  approvalMatrixId: integer('approval_matrix_id'),
  approvalStepId: integer('approval_step_id'),
  status: text('status').notNull(),
  submittedAt: timestamp('submitted_at').notNull(),
  reviewedAt: timestamp('reviewed_at'),
  overtimeMinutes: integer('overtime_minutes').notNull().default(0),
  resolutionSource: text('resolution_source').notNull().default('matrix'),
  routeSnapshot: text('route_snapshot').notNull().default(''),
  decisionNote: text('decision_note').notNull().default(''),
  pointsOverride: integer('points_override'),
  rejectionReason: text('rejection_reason').notNull().default(''),
  pointsOverrideReason: text('points_override_reason').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const activityPhotos = pgTable('hero_activity_photos', {
  id: serial('id').primaryKey(),
  activityId: integer('activity_id')
    .notNull()
    .references(() => activities.id, { onDelete: 'cascade' }),
  fileUrl: text('file_url').notNull(),
  caption: text('caption').notNull().default(''),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
})

export const timesheetEntries = pgTable('hero_timesheet_entries', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  siteId: integer('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  periodLabel: text('period_label').notNull(),
  regularMinutes: integer('regular_minutes').notNull().default(0),
  overtimeMinutes: integer('overtime_minutes').notNull().default(0),
  overtimeAmount: integer('overtime_amount').notNull().default(0),
  status: text('status').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const dailyReports = pgTable('hero_daily_reports', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  reportDate: timestamp('report_date').notNull(),
  customerName: text('customer_name').notNull(),
  totalSections: integer('total_sections').notNull().default(4),
  readySections: integer('ready_sections').notNull().default(0),
  jobsCompleted: integer('jobs_completed').notNull().default(0),
  manpowerPresent: integer('manpower_present').notNull().default(0),
  hseSummary: text('hse_summary').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const pointEvents = pgTable('hero_point_events', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  transactionType: text('transaction_type').notNull().default('reward'),
  sourceType: text('source_type').notNull().default('activity'),
  sourceId: integer('source_id'),
  category: text('category').notNull(),
  label: text('label').notNull(),
  points: integer('points').notNull(),
  balanceAfter: integer('balance_after'),
  metadata: text('metadata').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const penaltyEvents = pgTable('hero_penalty_events', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  siteId: integer('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  activityId: integer('activity_id').references(() => activities.id, {
    onDelete: 'set null',
  }),
  penaltyCode: text('penalty_code').notNull(),
  penaltyType: text('penalty_type').notNull(),
  referenceDate: timestamp('reference_date').notNull().defaultNow(),
  pointsDeducted: integer('points_deducted').notNull().default(0),
  description: text('description').notNull().default(''),
  isDisputed: boolean('is_disputed').notNull().default(false),
  disputeStatus: text('dispute_status').notNull().default('none'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const pointDisputes = pgTable('hero_point_disputes', {
  id: serial('id').primaryKey(),
  penaltyEventId: integer('penalty_event_id')
    .notNull()
    .references(() => penaltyEvents.id, { onDelete: 'cascade' }),
  employeeId: integer('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  evidenceUrls: text('evidence_urls').notNull().default('[]'),
  status: text('status').notNull().default('pending'),
  resolvedByEmployeeId: integer('resolved_by_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  resolutionNotes: text('resolution_notes').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at'),
})

export const streakRecords = pgTable('hero_streak_records', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  streakStartDate: timestamp('streak_start_date').notNull().defaultNow(),
  currentStreakDays: integer('current_streak_days').notNull().default(0),
  longestStreakDays: integer('longest_streak_days').notNull().default(0),
  lastActivityDate: timestamp('last_activity_date'),
  streakBonusActive: boolean('streak_bonus_active').notNull().default(false),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const activityModifiers = pgTable('hero_activity_modifiers', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').references(() => sites.id, { onDelete: 'set null' }),
  eventName: text('event_name').notNull(),
  description: text('description').notNull().default(''),
  multiplier: integer('multiplier').notNull().default(100),
  startDate: timestamp('start_date').notNull().defaultNow(),
  endDate: timestamp('end_date'),
  isActive: boolean('is_active').notNull().default(true),
  createdByEmployeeId: integer('created_by_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const dailyActivityConfigs = pgTable('hero_daily_activity_configs', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id').references(() => sites.id, { onDelete: 'set null' }),
  configKey: text('config_key').notNull().unique(),
  configLabel: text('config_label').notNull(),
  configValue: text('config_value').notNull().default(''),
  valueType: text('value_type').notNull().default('number'),
  description: text('description').notNull().default(''),
  isEditableBySectionHead: boolean('is_editable_by_section_head').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  updatedByEmployeeId: integer('updated_by_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hseObservations = pgTable('hero_hse_observations', {
  id: serial('id').primaryKey(),
  siteId: integer('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  employeeId: integer('employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  category: text('category').notNull(),
  title: text('title').notNull(),
  location: text('location').notNull(),
  severity: text('severity').notNull(),
  status: text('status').notNull(),
  notes: text('notes').notNull(),
  observedAt: timestamp('observed_at').notNull(),
})

export const hseIncidents = pgTable(
  'hero_hse_incidents',
  {
    id: serial('id').primaryKey(),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    employeeId: integer('employee_id').references(() => employees.id, {
      onDelete: 'set null',
    }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    unitNumber: text('unit_number').notNull(),
    impact: text('impact').notNull(),
    location: text('location').notNull().default(''),
    latitude: text('latitude').notNull().default(''),
    longitude: text('longitude').notNull().default(''),
    notes: text('notes').notNull().default(''),
    photoUrl: text('photo_url').notNull().default(''),
    clientRequestId: text('client_request_id'),
    alertStatus: text('alert_status').notNull().default('pending'),
    status: text('status').notNull(),
    reportedAt: timestamp('reported_at').notNull(),
  },
  (table) => ({
    clientRequestUnique: uniqueIndex('hero_hse_incidents_client_request_id_uq').on(
      table.clientRequestId
    ),
  })
)

export const safetyIncidentSummaryYearly = pgTable('hero_safety_incident_summary_yearly', {
  id: serial('id').primaryKey(),
  year: integer('year').notNull(),
  fatality: integer('fatality').notNull().default(0),
  lostDayInjury: integer('lost_day_injury').notNull().default(0),
  restrictedWorkDayInjury: integer('restricted_work_day_injury').notNull().default(0),
  medicalTreatmentCase: integer('medical_treatment_case').notNull().default(0),
  firstAid: integer('first_aid').notNull().default(0),
  propertyDamage: integer('property_damage').notNull().default(0),
  nearMissReport: integer('near_miss_report').notNull().default(0),
  environmental: integer('environmental').notNull().default(0),
  fatigue: integer('fatigue').notNull().default(0),
  totalEvents: integer('total_events').notNull().default(0),
  sourceSheet: text('source_sheet').notNull().default('manual'),
  sourceRowNumber: integer('source_row_number'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const safetyIncidentSummaryMonthly = pgTable('hero_safety_incident_summary_monthly', {
  id: serial('id').primaryKey(),
  month: date('month').notNull(),
  fatality: integer('fatality').notNull().default(0),
  lostDayInjury: integer('lost_day_injury').notNull().default(0),
  restrictedWorkDayInjury: integer('restricted_work_day_injury').notNull().default(0),
  medicalTreatmentCase: integer('medical_treatment_case').notNull().default(0),
  firstAid: integer('first_aid').notNull().default(0),
  propertyDamage: integer('property_damage').notNull().default(0),
  nearMissReport: integer('near_miss_report').notNull().default(0),
  environmental: integer('environmental').notNull().default(0),
  totalEvents: integer('total_events').notNull().default(0),
  sourceSheet: text('source_sheet').notNull().default('manual'),
  sourceRowNumber: integer('source_row_number'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const safetyIncidentReports = pgTable('hero_safety_incident_reports', {
  id: serial('id').primaryKey(),
  workerName: text('worker_name').notNull().default(''),
  department: text('department').notNull().default(''),
  incidentDescription: text('incident_description').notNull(),
  propertyDamage: text('property_damage').notNull().default(''),
  location: text('location').notNull().default(''),
  category: text('category').notNull().default(''),
  incidentDate: date('incident_date'),
  notes: text('notes').notNull().default(''),
  status: text('status').notNull().default('open'),
  sourceSheet: text('source_sheet').notNull().default('manual'),
  sourceRowNumber: integer('source_row_number'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const safetyCertifications = pgTable('hero_safety_certifications', {
  id: serial('id').primaryKey(),
  equipmentName: text('equipment_name').notNull(),
  picDepartment: text('pic_department').notNull().default(''),
  workArea: text('work_area').notNull().default(''),
  equipmentClassification: text('equipment_classification').notNull().default(''),
  certifier: text('certifier').notNull().default(''),
  certificationDate: date('certification_date'),
  nextCertificationDate: date('next_certification_date'),
  status: text('status').notNull().default('UNKNOWN'),
  regulation: text('regulation').notNull().default(''),
  remarks: text('remarks').notNull().default(''),
  workLocation: text('work_location').notNull().default(''),
  sourceSheet: text('source_sheet').notNull().default('manual'),
  sourceRowNumber: integer('source_row_number'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const safetyPerformanceMetrics = pgTable('hero_safety_performance_metrics', {
  id: serial('id').primaryKey(),
  year: integer('year').notNull(),
  periodLabel: text('period_label').notNull(),
  employeeCount: integer('employee_count').notNull().default(0),
  safeManHoursUpToYear: decimal('safe_man_hours_up_to_year', { precision: 14, scale: 2 }).notNull().default('0'),
  fatalityThreshold: decimal('fatality_threshold', { precision: 10, scale: 2 }).notNull().default('0'),
  fatalityActual: decimal('fatality_actual', { precision: 10, scale: 2 }).notNull().default('0'),
  ltiThreshold: decimal('lti_threshold', { precision: 10, scale: 2 }).notNull().default('0'),
  ltiActual: decimal('lti_actual', { precision: 10, scale: 2 }).notNull().default('0'),
  propertyDamageThreshold: decimal('property_damage_threshold', { precision: 10, scale: 2 }).notNull().default('0'),
  propertyDamageActual: decimal('property_damage_actual', { precision: 10, scale: 2 }).notNull().default('0'),
  sourceSheet: text('source_sheet').notNull().default('manual'),
  sourceRowNumber: integer('source_row_number'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const safetyManHours = pgTable('hero_safety_man_hours', {
  id: serial('id').primaryKey(),
  workLocation: text('work_location').notNull(),
  employeeCount: integer('employee_count').notNull().default(0),
  safetyManHours: decimal('safety_man_hours', { precision: 14, scale: 2 }).notNull().default('0'),
  safeTarget: decimal('safe_target', { precision: 14, scale: 2 }).notNull().default('0'),
  averageWeeklyRevenue: decimal('average_weekly_revenue', { precision: 14, scale: 2 }),
  sourceSheet: text('source_sheet').notNull().default('manual'),
  sourceRowNumber: integer('source_row_number'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const safetyMonthlyManHours = pgTable('hero_safety_monthly_man_hours', {
  id: serial('id').primaryKey(),
  workLocation: text('work_location').notNull(),
  employeeCount: integer('employee_count').notNull().default(0),
  month: date('month').notNull(),
  safetyManHours: decimal('safety_man_hours', { precision: 14, scale: 2 }).notNull().default('0'),
  sourceSheet: text('source_sheet').notNull().default('manual'),
  sourceRowNumber: integer('source_row_number'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const safetyWeeklyActivities = pgTable('hero_safety_weekly_activities', {
  id: serial('id').primaryKey(),
  activity: text('activity').notNull(),
  activityDate: date('activity_date'),
  pic: text('pic').notNull().default(''),
  category: text('category').notNull().default(''),
  imageUrl: text('image_url').notNull().default(''),
  evidenceUrl: text('evidence_url').notNull().default(''),
  sourceSheet: text('source_sheet').notNull().default('manual'),
  sourceRowNumber: integer('source_row_number'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const attendanceRecords = pgTable(
  'hero_attendance_records',
  {
    id: serial('id').primaryKey(),
    employeeId: integer('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    siteId: integer('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    eventTime: timestamp('event_time').notNull(),
    status: text('status').notNull(),
    locationNote: text('location_note').notNull(),
    photoUrl: text('photo_url'),
    latitude: text('latitude'),
    longitude: text('longitude'),
    confidenceScore: decimal('confidence_score', { precision: 4, scale: 3 }),
    deviceType: text('device_type'),
    clientRequestId: text('client_request_id'),
  },
  (table) => ({
    clientRequestUnique: uniqueIndex('hero_attendance_records_client_request_id_uq').on(
      table.clientRequestId
    ),
  })
)

export const trainingRecords = pgTable('hero_training_records', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  trainingName: text('training_name').notNull(),
  provider: text('provider').notNull(),
  completedYear: integer('completed_year')
    .notNull()
    .default(sql`extract(year from current_date)::integer`),
  expiresAt: timestamp('expires_at'),
  status: text('status').notNull(),
})

export const wellnessRecords = pgTable('hero_wellness_records', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  metricType: text('metric_type').notNull(),
  metricValue: text('metric_value').notNull(),
  status: text('status').notNull(),
  notes: text('notes').notNull(),
  recordedAt: timestamp('recorded_at').notNull(),
})

export const securityRoles = pgTable('hero_security_roles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  scope: text('scope').notNull().default('site'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const securityPermissions = pgTable('hero_security_permissions', {
  id: serial('id').primaryKey(),
  code: text('code').notNull(),
  label: text('label').notNull(),
  resource: text('resource').notNull(),
  action: text('action').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const securityRolePermissions = pgTable('hero_security_role_permissions', {
  id: serial('id').primaryKey(),
  roleId: integer('role_id')
    .notNull()
    .references(() => securityRoles.id, { onDelete: 'cascade' }),
  permissionId: integer('permission_id')
    .notNull()
    .references(() => securityPermissions.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const emailDeliveryLogs = pgTable('hero_email_delivery_logs', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  deliveryChannel: text('delivery_channel').notNull().default('email'),
  toEmail: text('to_email').notNull(),
  ccEmail: text('cc_email'),
  fromEmail: text('from_email'),
  templateName: text('template_name'),
  templateCode: text('template_code'),
  subject: text('subject').notNull(),
  status: text('status').notNull(),
  errorMessage: text('error_message'),
  htmlContent: text('html_content'),
  textContent: text('text_content'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const emailSmtpSettings = pgTable('hero_email_smtp_settings', {
  id: serial('id').primaryKey(),
  profileName: text('profile_name').notNull().default('Default SMTP'),
  host: text('host').notNull(),
  port: integer('port').notNull().default(587),
  encryption: text('encryption').notNull().default('tls'),
  username: text('username').notNull().default(''),
  passwordSecret: text('password_secret').notNull().default(''),
  fromEmail: text('from_email').notNull().default(''),
  fromName: text('from_name').notNull().default('HERO Operations'),
  replyToEmail: text('reply_to_email').notNull().default(''),
  retryLimit: integer('retry_limit').notNull().default(3),
  timeoutSeconds: integer('timeout_seconds').notNull().default(15),
  queueEnabled: boolean('queue_enabled').notNull().default(true),
  auditEnabled: boolean('audit_enabled').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const emailTemplates = pgTable('hero_email_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  templateCode: text('template_code').notNull().unique(),
  templateType: text('template_type').notNull().default('Notification'),
  deliveryChannel: text('delivery_channel').notNull().default('email'),
  recipientScope: text('recipient_scope').notNull().default('all'),
  ccEmail: text('cc_email').notNull().default(''),
  subject: text('subject').notNull(),
  htmlContent: text('html_content').notNull().default(''),
  textContent: text('text_content').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const notificationChannelSettings = pgTable('hero_notification_channel_settings', {
  id: serial('id').primaryKey(),
  channel: text('channel').notNull().unique(),
  isEnabled: boolean('is_enabled').notNull().default(true),
  realtimeBadge: boolean('realtime_badge').notNull().default(true),
  soundEnabled: boolean('sound_enabled').notNull().default(false),
  autoMarkRead: boolean('auto_mark_read').notNull().default(true),
  vapidPublicKey: text('vapid_public_key').notNull().default(''),
  vapidPrivateKey: text('vapid_private_key').notNull().default(''),
  pushSubject: text('push_subject').notNull().default(''),
  serviceWorkerPath: text('service_worker_path').notNull().default('/sw.js'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const notificationChannelRules = pgTable('hero_notification_channel_rules', {
  id: serial('id').primaryKey(),
  channel: text('channel').notNull().default('bell'),
  label: text('label').notNull(),
  eventType: text('event_type').notNull(),
  targetAudience: text('target_audience').notNull().default(''),
  priority: text('priority').notNull().default('notification'),
  triggerExpression: text('trigger_expression').notNull().default(''),
  templateCode: text('template_code').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const notificationUserPreferences = pgTable('hero_notification_user_preferences', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' })
    .unique(),
  pushEnabled: boolean('push_enabled').notNull().default(true),
  inAppEnabled: boolean('in_app_enabled').notNull().default(true),
  emailEnabled: boolean('email_enabled').notNull().default(true),
  approvalRequestsEnabled: boolean('approval_requests_enabled').notNull().default(true),
  shiftRemindersEnabled: boolean('shift_reminders_enabled').notNull().default(true),
  hseAlertsEnabled: boolean('hse_alerts_enabled').notNull().default(true),
  pointsUpdatesEnabled: boolean('points_updates_enabled').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const notificationPushSubscriptions = pgTable('hero_notification_push_subscriptions', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dhKey: text('p256dh_key').notNull(),
  authKey: text('auth_key').notNull(),
  deviceLabel: text('device_label').notNull().default('Browser'),
  userAgent: text('user_agent').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const auditLogs = pgTable('hero_audit_logs', {
  id: serial('id').primaryKey(),
  actorEmployeeId: integer('actor_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityLabel: text('entity_label').notNull(),
  description: text('description').notNull(),
  severity: text('severity').notNull().default('info'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const navbarThemes = pgTable('hero_navbar_themes', {
  id: serial('id').primaryKey(),
  themeName: text('theme_name').notNull(),
  backgroundStyle: text('background_style').notNull(),
  accentColor: text('accent_color').notNull(),
  headerBackgroundColor: text('header_background_color').notNull().default('#FFFFFF'),
  textColor: text('text_color').notNull(),
  density: text('density').notNull().default('comfortable'),
  logoMode: text('logo_mode').notNull().default('hero'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const navbarMenuItems = pgTable('hero_navbar_menu_items', {
  id: serial('id').primaryKey(),
  menuArea: text('menu_area').notNull().default('main'),
  section: text('section').notNull(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  iconName: text('icon_name').notNull(),
  resource: text('resource').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: boolean('is_visible').notNull().default(true),
  openInNewTab: boolean('open_in_new_tab').notNull().default(false),
  itemType: text('item_type').notNull().default('menu'),
  parentId: integer('parent_id'),
  groupLabel: text('group_label'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const navbarGroupLabelStyles = pgTable('hero_navbar_group_label_styles', {
  id: serial('id').primaryKey(),
  section: text('section').notNull(),
  groupLabel: text('group_label').notNull(),
  textColor: text('text_color').notNull().default('#6B7280'),
  backgroundColor: text('background_color'),
  fontWeight: text('font_weight').notNull().default('semibold'),
  fontSize: text('font_size').notNull().default('10px'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const roleMenuPermissions = pgTable('hero_role_menu_permissions', {
  id: serial('id').primaryKey(),
  roleId: integer('role_id')
    .notNull()
    .references(() => securityRoles.id, { onDelete: 'cascade' }),
  menuItemId: integer('menu_item_id')
    .notNull()
    .references(() => navbarMenuItems.id, { onDelete: 'cascade' }),
  canView: boolean('can_view').notNull().default(false),
  canEdit: boolean('can_edit').notNull().default(false),
  canDelete: boolean('can_delete').notNull().default(false),
  canSelectAll: boolean('can_select_all').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const portalChitraApps = pgTable('hero_portal_chitra_apps', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull().default('General'),
  description: text('description').notNull().default(''),
  url: text('url').notNull(),
  color: text('color').notNull().default('#003461'),
  iconName: text('icon_name').notNull().default('globe'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  showOnMobile: boolean('show_on_mobile').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const portalChitraRoleAccess = pgTable('hero_portal_chitra_role_access', {
  id: serial('id').primaryKey(),
  portalAppId: integer('portal_app_id')
    .notNull()
    .references(() => portalChitraApps.id, { onDelete: 'cascade' }),
  roleId: integer('role_id')
    .notNull()
    .references(() => securityRoles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Master Data Tables
// Department is the parent entity
export const masterDepartments = pgTable('hero_master_departments', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Section belongs to a Department (Department is parent)
export const masterSections = pgTable('hero_master_sections', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  departmentId: integer('department_id').references(() => masterDepartments.id, {
    onDelete: 'set null',
  }),
  description: text('description').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Position (Jabatan) belongs to a Department and can optionally map to a Section
export const masterPositions = pgTable('hero_master_positions', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  departmentId: integer('department_id').references(() => masterDepartments.id, {
    onDelete: 'set null',
  }),
  sectionId: integer('section_id').references(() => masterSections.id, { onDelete: 'set null' }),
  siteLocation: text('site_location').notNull().default(''),
  level: integer('level').notNull().default(1),
  description: text('description').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const recruitmentSectionTemplates = pgTable('hero_recruitment_section_templates', {
  id: serial('id').primaryKey(),
  sectionId: integer('section_id').references(() => masterSections.id, { onDelete: 'cascade' }),
  jobDescription: text('job_description').notNull().default(''),
  requirements: text('requirements').notNull().default(''),
  qualifications: jsonb('qualifications').$type<string[]>().default([]),
  mandatoryFields: jsonb('mandatory_fields').$type<string[]>().default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const masterAttendanceShifts = pgTable('hero_master_attendance_shifts', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  startTime: text('start_time').notNull().default(''),
  endTime: text('end_time').notNull().default(''),
  windowLabel: text('window_label').notNull().default(''),
  helper: text('helper').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Organizational Structure - For Approval Engine
export const orgStructures = pgTable('hero_org_structures', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  jobType: text('job_type').notNull().default('default'), // e.g., "office", "field", "contractor"
  positionId: integer('position_id')
    .notNull()
    .references(() => masterPositions.id, { onDelete: 'cascade' }),
  managerPositionId: integer('manager_position_id').references(() => masterPositions.id, {
    onDelete: 'set null',
  }),
  approvalLevel: integer('approval_level').notNull().default(1), // Level 1, 2, 3, etc.
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const orgChartStructures = pgTable('hero_org_chart_structures', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  scopeType: text('scope_type').notNull().default('custom'),
  scopeValue: text('scope_value').notNull().default(''),
  version: integer('version').notNull().default(1),
  effectiveFrom: timestamp('effective_from').notNull().defaultNow(),
  effectiveTo: timestamp('effective_to'),
  isDefault: boolean('is_default').notNull().default(false),
  description: text('description').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const orgChartNodes = pgTable('hero_org_chart_nodes', {
  id: serial('id').primaryKey(),
  structureId: integer('structure_id')
    .notNull()
    .references(() => orgChartStructures.id, { onDelete: 'cascade' }),
  parentNodeId: integer('parent_node_id').references((): AnyPgColumn => orgChartNodes.id, {
    onDelete: 'set null',
  }),
  positionId: integer('position_id').references(() => masterPositions.id, { onDelete: 'set null' }),
  employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'set null' }),
  nodeCode: text('node_code').notNull().default(''),
  nodeType: text('node_type').notNull().default('position'),
  approvalRole: text('approval_role').notNull().default(''),
  canApprove: boolean('can_approve').notNull().default(false),
  canDelegate: boolean('can_delegate').notNull().default(true),
  isEscalationTarget: boolean('is_escalation_target').notNull().default(false),
  slaHours: integer('sla_hours').notNull().default(24),
  fallbackNodeId: integer('fallback_node_id').references((): AnyPgColumn => orgChartNodes.id, {
    onDelete: 'set null',
  }),
  label: text('label').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const orgNodeAssignments = pgTable('hero_org_node_assignments', {
  id: serial('id').primaryKey(),
  nodeId: integer('node_id')
    .notNull()
    .references(() => orgChartNodes.id, { onDelete: 'cascade' }),
  employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'set null' }),
  assignmentType: text('assignment_type').notNull().default('primary'),
  notes: text('notes').notNull().default(''),
  effectiveFrom: timestamp('effective_from').notNull().defaultNow(),
  effectiveTo: timestamp('effective_to'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const approvalMatrices = pgTable('hero_approval_matrices', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  structureId: integer('structure_id').references(() => orgChartStructures.id, {
    onDelete: 'set null',
  }),
  transactionType: text('transaction_type').notNull().default('activity'),
  siteId: integer('site_id').references(() => sites.id, { onDelete: 'set null' }),
  departmentId: integer('department_id').references(() => masterDepartments.id, {
    onDelete: 'set null',
  }),
  sectionId: integer('section_id').references(() => masterSections.id, { onDelete: 'set null' }),
  requesterPositionId: integer('requester_position_id').references(() => masterPositions.id, {
    onDelete: 'set null',
  }),
  activityType: text('activity_type').notNull().default(''),
  priority: text('priority').notNull().default('any'),
  minOvertimeMinutes: integer('min_overtime_minutes').notNull().default(0),
  maxOvertimeMinutes: integer('max_overtime_minutes'),
  description: text('description').notNull().default(''),
  effectiveFrom: timestamp('effective_from').notNull().defaultNow(),
  effectiveTo: timestamp('effective_to'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const approvalMatrixSteps = pgTable('hero_approval_matrix_steps', {
  id: serial('id').primaryKey(),
  matrixId: integer('matrix_id')
    .notNull()
    .references(() => approvalMatrices.id, { onDelete: 'cascade' }),
  stepOrder: integer('step_order').notNull(),
  label: text('label').notNull().default(''),
  nodeId: integer('node_id').references(() => orgChartNodes.id, { onDelete: 'set null' }),
  fallbackNodeId: integer('fallback_node_id').references(() => orgChartNodes.id, {
    onDelete: 'set null',
  }),
  escalationNodeId: integer('escalation_node_id').references(() => orgChartNodes.id, {
    onDelete: 'set null',
  }),
  approvalMode: text('approval_mode').notNull().default('sequential'),
  slaHours: integer('sla_hours').notNull().default(24),
  canDelegate: boolean('can_delegate').notNull().default(true),
  isRequired: boolean('is_required').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const formTemplates = pgTable('hero_form_templates', {
  id: serial('id').primaryKey(),
  templateKey: text('template_key').notNull().unique(),
  category: text('category').notNull(),
  name: text('name').notNull(),
  workflowMode: text('workflow_mode').notNull().default('org_template'),
  description: text('description').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const formTemplateVersions = pgTable('hero_form_template_versions', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id')
    .notNull()
    .references(() => formTemplates.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull().default(1),
  publishStatus: text('publish_status').notNull().default('draft'),
  workflowSnapshot: text('workflow_snapshot').notNull().default(''),
  schemaSnapshot: text('schema_snapshot').notNull().default(''),
  effectiveFrom: timestamp('effective_from'),
  effectiveTo: timestamp('effective_to'),
  createdByEmployeeId: integer('created_by_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const formTemplateSections = pgTable('hero_form_template_sections', {
  id: serial('id').primaryKey(),
  versionId: integer('version_id')
    .notNull()
    .references(() => formTemplateVersions.id, { onDelete: 'cascade' }),
  sectionKey: text('section_key').notNull(),
  label: text('label').notNull(),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  isCollapsible: boolean('is_collapsible').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const formTemplateFields = pgTable('hero_form_template_fields', {
  id: serial('id').primaryKey(),
  versionId: integer('version_id')
    .notNull()
    .references(() => formTemplateVersions.id, { onDelete: 'cascade' }),
  sectionId: integer('section_id').references(() => formTemplateSections.id, {
    onDelete: 'set null',
  }),
  fieldKey: text('field_key').notNull(),
  fieldType: text('field_type').notNull(),
  label: text('label').notNull(),
  placeholder: text('placeholder').notNull().default(''),
  helpText: text('help_text').notNull().default(''),
  defaultValue: text('default_value').notNull().default(''),
  configJson: text('config_json').notNull().default(''),
  validationJson: text('validation_json').notNull().default(''),
  optionSourceJson: text('option_source_json').notNull().default(''),
  isRequired: boolean('is_required').notNull().default(false),
  isHidden: boolean('is_hidden').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const formFieldOptions = pgTable('hero_form_field_options', {
  id: serial('id').primaryKey(),
  fieldId: integer('field_id')
    .notNull()
    .references(() => formTemplateFields.id, { onDelete: 'cascade' }),
  optionValue: text('option_value').notNull(),
  optionLabel: text('option_label').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const formValidationRules = pgTable('hero_form_validation_rules', {
  id: serial('id').primaryKey(),
  fieldId: integer('field_id')
    .notNull()
    .references(() => formTemplateFields.id, { onDelete: 'cascade' }),
  ruleType: text('rule_type').notNull(),
  operator: text('operator').notNull().default('='),
  ruleValue: text('rule_value').notNull().default(''),
  errorMessage: text('error_message').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const workflowTemplates = pgTable('hero_workflow_templates', {
  id: serial('id').primaryKey(),
  templateKey: text('template_key').notNull().unique(),
  name: text('name').notNull(),
  mode: text('mode').notNull().default('org_template'),
  description: text('description').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const workflowTemplateVersions = pgTable('hero_workflow_template_versions', {
  id: serial('id').primaryKey(),
  workflowTemplateId: integer('workflow_template_id')
    .notNull()
    .references(() => workflowTemplates.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull().default(1),
  publishStatus: text('publish_status').notNull().default('draft'),
  effectiveFrom: timestamp('effective_from'),
  effectiveTo: timestamp('effective_to'),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const workflowConditions = pgTable('hero_workflow_conditions', {
  id: serial('id').primaryKey(),
  workflowVersionId: integer('workflow_version_id')
    .notNull()
    .references(() => workflowTemplateVersions.id, { onDelete: 'cascade' }),
  parentConditionId: integer('parent_condition_id').references(
    (): AnyPgColumn => workflowConditions.id,
    {
      onDelete: 'cascade',
    }
  ),
  fieldKey: text('field_key').notNull(),
  operator: text('operator').notNull().default('='),
  compareValue: text('compare_value').notNull().default(''),
  logicalJoin: text('logical_join').notNull().default('AND'),
  groupLabel: text('group_label').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const workflowBranches = pgTable('hero_workflow_branches', {
  id: serial('id').primaryKey(),
  workflowVersionId: integer('workflow_version_id')
    .notNull()
    .references(() => workflowTemplateVersions.id, { onDelete: 'cascade' }),
  branchKey: text('branch_key').notNull(),
  label: text('label').notNull(),
  outcomeType: text('outcome_type').notNull().default('route'),
  routeMode: text('route_mode').notNull().default('sequential'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const workflowStepRules = pgTable('hero_workflow_step_rules', {
  id: serial('id').primaryKey(),
  workflowVersionId: integer('workflow_version_id')
    .notNull()
    .references(() => workflowTemplateVersions.id, { onDelete: 'cascade' }),
  branchId: integer('branch_id').references(() => workflowBranches.id, {
    onDelete: 'set null',
  }),
  approvalMatrixStepId: integer('approval_matrix_step_id').references(
    () => approvalMatrixSteps.id,
    {
      onDelete: 'set null',
    }
  ),
  stepOrder: integer('step_order').notNull().default(1),
  label: text('label').notNull(),
  approvalMode: text('approval_mode').notNull().default('sequential'),
  assignmentSource: text('assignment_source').notNull().default('matrix'),
  isRequired: boolean('is_required').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const workflowNotificationRules = pgTable('hero_workflow_notification_rules', {
  id: serial('id').primaryKey(),
  workflowVersionId: integer('workflow_version_id')
    .notNull()
    .references(() => workflowTemplateVersions.id, { onDelete: 'cascade' }),
  branchId: integer('branch_id').references(() => workflowBranches.id, {
    onDelete: 'set null',
  }),
  eventType: text('event_type').notNull(),
  channel: text('channel').notNull().default('in_app'),
  recipientMode: text('recipient_mode').notNull().default('approver'),
  ccMode: text('cc_mode').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const workflowReminderRules = pgTable('hero_workflow_reminder_rules', {
  id: serial('id').primaryKey(),
  workflowVersionId: integer('workflow_version_id')
    .notNull()
    .references(() => workflowTemplateVersions.id, { onDelete: 'cascade' }),
  stepRuleId: integer('step_rule_id').references(() => workflowStepRules.id, {
    onDelete: 'set null',
  }),
  reminderType: text('reminder_type').notNull().default('before_due'),
  offsetHours: integer('offset_hours').notNull().default(2),
  channel: text('channel').notNull().default('email'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const formSubmissions = pgTable('hero_form_submissions', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id')
    .notNull()
    .references(() => formTemplates.id, { onDelete: 'restrict' }),
  templateVersionId: integer('template_version_id')
    .notNull()
    .references(() => formTemplateVersions.id, { onDelete: 'restrict' }),
  requesterEmployeeId: integer('requester_employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'restrict' }),
  siteId: integer('site_id').references(() => sites.id, { onDelete: 'set null' }),
  legacyActivityId: integer('legacy_activity_id').references(() => activities.id, {
    onDelete: 'set null',
  }),
  requestNumber: text('request_number').notNull().default(''),
  requestStatus: text('request_status').notNull().default('draft'),
  workflowSnapshot: text('workflow_snapshot').notNull().default(''),
  payloadSnapshot: text('payload_snapshot').notNull().default(''),
  previewSnapshot: text('preview_snapshot').notNull().default(''),
  submittedAt: timestamp('submitted_at'),
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const formSubmissionValues = pgTable('hero_form_submission_values', {
  id: serial('id').primaryKey(),
  submissionId: integer('submission_id')
    .notNull()
    .references(() => formSubmissions.id, { onDelete: 'cascade' }),
  fieldKey: text('field_key').notNull(),
  fieldType: text('field_type').notNull(),
  valueText: text('value_text').notNull().default(''),
  displayValue: text('display_value').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const approvalComments = pgTable('hero_approval_comments', {
  id: serial('id').primaryKey(),
  approvalId: integer('approval_id')
    .notNull()
    .references(() => approvals.id, { onDelete: 'cascade' }),
  actorEmployeeId: integer('actor_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  commentKind: text('comment_kind').notNull().default('comment'),
  message: text('message').notNull(),
  isInternal: boolean('is_internal').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const approvalRequestActors = pgTable('hero_approval_request_actors', {
  id: serial('id').primaryKey(),
  submissionId: integer('submission_id')
    .notNull()
    .references(() => formSubmissions.id, { onDelete: 'cascade' }),
  approvalId: integer('approval_id').references(() => approvals.id, {
    onDelete: 'set null',
  }),
  actorEmployeeId: integer('actor_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  actorRole: text('actor_role').notNull().default('approver'),
  assignmentType: text('assignment_type').notNull().default('primary'),
  status: text('status').notNull().default('pending'),
  dueAt: timestamp('due_at'),
  actedAt: timestamp('acted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const approvalAttachments = pgTable('hero_approval_attachments', {
  id: serial('id').primaryKey(),
  submissionId: integer('submission_id')
    .notNull()
    .references(() => formSubmissions.id, { onDelete: 'cascade' }),
  approvalId: integer('approval_id').references(() => approvals.id, {
    onDelete: 'set null',
  }),
  attachmentKind: text('attachment_kind').notNull().default('file'),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull().default('application/octet-stream'),
  fileUrl: text('file_url').notNull(),
  uploadedByEmployeeId: integer('uploaded_by_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const inboxItems = pgTable('hero_inbox_items', {
  id: serial('id').primaryKey(),
  submissionId: integer('submission_id')
    .notNull()
    .references(() => formSubmissions.id, { onDelete: 'cascade' }),
  approvalId: integer('approval_id').references(() => approvals.id, {
    onDelete: 'set null',
  }),
  assigneeEmployeeId: integer('assignee_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  inboxType: text('inbox_type').notNull().default('approval'),
  status: text('status').notNull().default('pending'),
  dueAt: timestamp('due_at'),
  snoozedUntil: timestamp('snoozed_until'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const notificationEvents = pgTable('hero_notification_events', {
  id: serial('id').primaryKey(),
  submissionId: integer('submission_id').references(() => formSubmissions.id, {
    onDelete: 'cascade',
  }),
  inboxItemId: integer('inbox_item_id').references(() => inboxItems.id, {
    onDelete: 'cascade',
  }),
  approvalId: integer('approval_id').references(() => approvals.id, {
    onDelete: 'set null',
  }),
  channel: text('channel').notNull().default('email'),
  eventType: text('event_type').notNull(),
  recipient: text('recipient').notNull(),
  payloadSnapshot: text('payload_snapshot').notNull().default(''),
  deliveryStatus: text('delivery_status').notNull().default('queued'),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const notificationDeliveries = pgTable('hero_notification_deliveries', {
  id: serial('id').primaryKey(),
  notificationEventId: integer('notification_event_id')
    .notNull()
    .references(() => notificationEvents.id, { onDelete: 'cascade' }),
  deliveryChannel: text('delivery_channel').notNull().default('in_app'),
  recipient: text('recipient').notNull(),
  status: text('status').notNull().default('queued'),
  sentAt: timestamp('sent_at'),
  readAt: timestamp('read_at'),
  clearedAt: timestamp('cleared_at'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const reminderJobs = pgTable('hero_reminder_jobs', {
  id: serial('id').primaryKey(),
  inboxItemId: integer('inbox_item_id')
    .notNull()
    .references(() => inboxItems.id, { onDelete: 'cascade' }),
  reminderType: text('reminder_type').notNull().default('before_due'),
  reminderAt: timestamp('reminder_at').notNull(),
  status: text('status').notNull().default('scheduled'),
  executionLog: text('execution_log').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const requestStatusHistories = pgTable('hero_request_status_histories', {
  id: serial('id').primaryKey(),
  submissionId: integer('submission_id')
    .notNull()
    .references(() => formSubmissions.id, { onDelete: 'cascade' }),
  approvalId: integer('approval_id').references(() => approvals.id, {
    onDelete: 'set null',
  }),
  actorEmployeeId: integer('actor_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  fromStatus: text('from_status').notNull().default(''),
  toStatus: text('to_status').notNull(),
  note: text('note').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const stepDecisionHistories = pgTable('hero_step_decision_histories', {
  id: serial('id').primaryKey(),
  submissionId: integer('submission_id')
    .notNull()
    .references(() => formSubmissions.id, { onDelete: 'cascade' }),
  approvalId: integer('approval_id')
    .notNull()
    .references(() => approvals.id, { onDelete: 'cascade' }),
  actorEmployeeId: integer('actor_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  decision: text('decision').notNull(),
  decisionNote: text('decision_note').notNull().default(''),
  decidedAt: timestamp('decided_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const masterCategoryOptions = pgTable('hero_master_category_options', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(),
  code: text('code').notNull(),
  label: text('label').notNull(),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const levels = pgTable('hero_levels', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  minPoints: integer('min_points').notNull(),
  description: text('description').notNull().default(''),
  colorCode: text('color_code').notNull().default('#000000'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const badges = pgTable('hero_badges', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  iconUrl: text('icon_url').notNull().default(''),
  colorCode: text('color_code').notNull().default('#000000'),
  autoAssignRule: text('auto_assign_rule').notNull().default('none'),
  autoAssignThreshold: integer('auto_assign_threshold').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const employeeBadges = pgTable('hero_employee_badges', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  badgeId: integer('badge_id')
    .notNull()
    .references(() => badges.id, { onDelete: 'cascade' }),
  awardedAt: timestamp('awarded_at').notNull().defaultNow(),
})

export const hrDepartments = pgTable('hero_hr_departments', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hrSections = pgTable(
  'hero_hr_sections',
  {
    id: serial('id').primaryKey(),
    code: text('code').notNull().unique(),
    departmentId: integer('department_id').references(() => hrDepartments.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    departmentNameUnique: uniqueIndex('hero_hr_sections_department_name_uq').on(
      table.departmentId,
      table.name
    ),
  })
)

export const hrSites = pgTable('hero_hr_sites', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hrWorkLocations = pgTable('hero_hr_work_locations', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hrJobLevels = pgTable('hero_hr_job_levels', {
  code: text('code').primaryKey(),
  name: text('name').notNull().unique(),
})

export const hrGenders = pgTable('hero_hr_genders', {
  code: text('code').primaryKey(),
  name: text('name').notNull().unique(),
})

export const hrAgeBands = pgTable('hero_hr_age_bands', {
  code: text('code').primaryKey(),
  name: text('name').notNull().unique(),
})

export const hrServiceBands = pgTable('hero_hr_service_bands', {
  code: text('code').primaryKey(),
  name: text('name').notNull().unique(),
})

export const hrEducations = pgTable('hero_hr_educations', {
  code: text('code').primaryKey(),
  name: text('name').notNull().unique(),
})

export const hrEmployeeStatuses = pgTable('hero_hr_employee_statuses', {
  code: text('code').primaryKey(),
  name: text('name').notNull().unique(),
})

export const hrLocationCategories = pgTable('hero_hr_location_categories', {
  code: text('code').primaryKey(),
  name: text('name').notNull().unique(),
})

export const hrPositions = pgTable(
  'hero_hr_positions',
  {
    id: serial('id').primaryKey(),
    code: text('code').notNull().unique(),
    levelName: text('level_name').notNull(),
    rankName: text('rank_name').notNull(),
    jobLevelCode: text('job_level_code').references(() => hrJobLevels.code, {
      onDelete: 'set null',
    }),
    employeeStatusCode: text('employee_status_code').references(() => hrEmployeeStatuses.code, {
      onDelete: 'set null',
    }),
    isManagerial: boolean('is_managerial').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    signatureUnique: uniqueIndex('hero_hr_positions_signature_uq').on(
      table.levelName,
      table.rankName,
      table.jobLevelCode,
      table.employeeStatusCode
    ),
  })
)

export const hrOrgNodes = pgTable('hero_hr_org_nodes', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  parentNodeId: integer('parent_node_id').references((): AnyPgColumn => hrOrgNodes.id, {
    onDelete: 'set null',
  }),
  nodeType: text('node_type').notNull(),
  name: text('name').notNull(),
  departmentId: integer('department_id').references(() => hrDepartments.id, {
    onDelete: 'set null',
  }),
  sectionId: integer('section_id').references(() => hrSections.id, { onDelete: 'set null' }),
  siteId: integer('site_id').references(() => hrSites.id, { onDelete: 'set null' }),
  workLocationId: integer('work_location_id').references(() => hrWorkLocations.id, {
    onDelete: 'set null',
  }),
  hierarchyLevel: integer('hierarchy_level').notNull().default(0),
  pathText: text('path_text').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hrEmployees = pgTable('hero_hr_employees', {
  id: serial('id').primaryKey(),
  employeeId: text('employee_id').notNull().unique(),
  authUserId: text('auth_user_id').references(() => user.id, { onDelete: 'set null' }),
  fullName: text('full_name').notNull(),
  email: text('email'),
  emailPasswordMigration: text('email_password_migration'),
  departmentId: integer('department_id').references(() => hrDepartments.id, {
    onDelete: 'set null',
  }),
  sectionId: integer('section_id').references(() => hrSections.id, { onDelete: 'set null' }),
  siteId: integer('site_id').references(() => hrSites.id, { onDelete: 'set null' }),
  workLocationId: integer('work_location_id').references(() => hrWorkLocations.id, {
    onDelete: 'set null',
  }),
  positionId: integer('position_id').references(() => hrPositions.id, { onDelete: 'set null' }),
  orgNodeId: integer('org_node_id').references(() => hrOrgNodes.id, { onDelete: 'set null' }),
  joinDate: date('join_date'),
  contractStart: date('contract_start'),
  contractEnd: date('contract_end'),
  birthDate: date('birth_date'),
  genderCode: text('gender_code').references(() => hrGenders.code, { onDelete: 'set null' }),
  ageBandCode: text('age_band_code').references(() => hrAgeBands.code, { onDelete: 'set null' }),
  serviceBandCode: text('service_band_code').references(() => hrServiceBands.code, {
    onDelete: 'set null',
  }),
  educationCode: text('education_code').references(() => hrEducations.code, {
    onDelete: 'set null',
  }),
  demographicEmployeeStatusCode: text('demographic_employee_status_code').references(
    () => hrEmployeeStatuses.code,
    { onDelete: 'set null' }
  ),
  locationCategoryCode: text('location_category_code').references(() => hrLocationCategories.code, {
    onDelete: 'set null',
  }),
  accountStatus: text('account_status').notNull().default('active'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// â”€â”€â”€ Cargo Manifest â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const cargoManifests = pgTable('hero_cargo_manifests', {
  id: serial('id').primaryKey(),
  manifestNumber: text('manifest_number').notNull(),
  date: date('date').notNull(),
  siteId: integer('site_id').references(() => cargoMasterSites.id, { onDelete: 'set null' }),
  sectionId: integer('section_id').references(() => masterSections.id, { onDelete: 'set null' }),
  attention: text('attention').notNull().default(''),
  transportVia: text('transport_via').notNull().default(''),
  shippedVia: text('shipped_via').notNull().default(''),
  finalDestination: text('final_destination').notNull().default(''),
  signatureName: text('signature_name').notNull().default(''),
  signatureDataUrl: text('signature_data_url').notNull().default(''),
  status: text('status').notNull().default('draft'),
  createdByEmployeeId: integer('created_by_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const cargoManifestItems = pgTable('hero_cargo_manifest_items', {
  id: serial('id').primaryKey(),
  manifestId: integer('manifest_id')
    .notNull()
    .references(() => cargoManifests.id, { onDelete: 'cascade' }),
  no: integer('no').notNull().default(1),
  description: text('description').notNull().default(''),
  serialNumber: text('serial_number').notNull().default(''),
  qty: integer('qty').notNull().default(1),
  brand: text('brand').notNull().default(''),
  remark: text('remark').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const cargoMasterLocations = pgTable('hero_cargo_master_locations', {
  id: serial('id').primaryKey(),
  locationName: text('location_name').notNull().unique(),
  address: text('address').notNull().default(''),
  city: text('city').notNull().default(''),
  province: text('province').notNull().default(''),
  country: text('country').notNull().default('Indonesia'),
  postalCode: text('postal_code').notNull().default(''),
  contactPerson: text('contact_person').notNull().default(''),
  contactPhone: text('contact_phone').notNull().default(''),
  notes: text('notes').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const cargoMasterGoods = pgTable('hero_cargo_master_goods', {
  id: serial('id').primaryKey(),
  goodsName: text('goods_name').notNull(),
  category: text('category').notNull().default(''),
  brand: text('brand').notNull().default(''),
  unit: text('unit').notNull().default('pcs'),
  weight: text('weight').notNull().default(''),
  dimensions: text('dimensions').notNull().default(''),
  hsCode: text('hs_code').notNull().default(''),
  description: text('description').notNull().default(''),
  notes: text('notes').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const cargoMasterRecipients = pgTable('hero_cargo_master_recipients', {
  id: serial('id').primaryKey(),
  recipientName: text('recipient_name').notNull().unique(),
  companyName: text('company_name').notNull().default(''),
  contactPerson: text('contact_person').notNull().default(''),
  contactPhone: text('contact_phone').notNull().default(''),
  contactEmail: text('contact_email').notNull().default(''),
  address: text('address').notNull().default(''),
  city: text('city').notNull().default(''),
  province: text('province').notNull().default(''),
  postalCode: text('postal_code').notNull().default(''),
  notes: text('notes').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const cargoMasterSites = pgTable('hero_cargo_master_sites', {
  id: serial('id').primaryKey(),
  siteName: text('site_name').notNull().unique(),
  location: text('location').notNull().default(''),
  notes: text('notes').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const safetyInspections = pgTable('hero_safety_inspections', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  date: timestamp('date').notNull(),
  location: text('location').notNull().default(''),
  category: text('category').notNull().default(''),
  findings: text('findings').notNull().default(''),
  recommendation: text('recommendation').notNull().default(''),
  status: text('status').notNull().default('Pending'),
  assessmentScore: integer('assessment_score'),
  picName: text('pic_name').notNull().default(''),
  reportAttachmentUrl: text('report_attachment_url').notNull().default(''),
  resultAttachmentUrl: text('result_attachment_url').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const checklistTemplates = pgTable('hero_checklist_templates', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  createdByEmployeeId: integer('created_by_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const checklistTemplateRevisions = pgTable(
  'hero_checklist_template_revisions',
  {
    id: serial('id').primaryKey(),
    templateId: integer('template_id')
      .notNull()
      .references(() => checklistTemplates.id, { onDelete: 'cascade' }),
    revisionNumber: integer('revision_number').notNull().default(1),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    createdByEmployeeId: integer('created_by_employee_id').references(() => employees.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    templateRevisionUnique: uniqueIndex('hero_checklist_template_revisions_template_rev_uq').on(
      table.templateId,
      table.revisionNumber,
    ),
  }),
)

export const checklistTemplateRevisionItems = pgTable(
  'hero_checklist_template_revision_items',
  {
    id: serial('id').primaryKey(),
    revisionId: integer('revision_id')
      .notNull()
      .references(() => checklistTemplateRevisions.id, { onDelete: 'cascade' }),
    orderIndex: integer('order_index').notNull().default(0),
    prompt: text('prompt').notNull(),
    inputType: text('input_type').notNull(),
    options: jsonb('options'),
    isRequired: boolean('is_required').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    revisionOrderUnique: uniqueIndex('hero_checklist_template_revision_items_revision_order_uq').on(
      table.revisionId,
      table.orderIndex,
    ),
  }),
)

export const dailyChecklists = pgTable('hero_daily_checklists', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').references(() => checklistTemplates.id, {
    onDelete: 'set null',
  }),
  templateRevisionId: integer('template_revision_id').references(() => checklistTemplateRevisions.id, {
    onDelete: 'set null',
  }),
  titleSnapshot: text('title_snapshot').notNull(),
  descriptionSnapshot: text('description_snapshot').notNull().default(''),
  area: text('area').notNull().default(''),
  responsibleEmployeeId: integer('responsible_employee_id').references(() => employees.id, {
    onDelete: 'set null',
  }),
  responsibleName: text('responsible_name').notNull().default(''),
  status: text('status').notNull().default('in_progress'),
  scorePercent: doublePrecision('score_percent'),
  completedAt: timestamp('completed_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const dailyChecklistAnswers = pgTable(
  'hero_daily_checklist_answers',
  {
    id: serial('id').primaryKey(),
    checklistId: integer('checklist_id')
      .notNull()
      .references(() => dailyChecklists.id, { onDelete: 'cascade' }),
    revisionItemId: integer('revision_item_id')
      .notNull()
      .references(() => checklistTemplateRevisionItems.id, { onDelete: 'cascade' }),
    inputType: text('input_type').notNull(),
    valueText: text('value_text').notNull().default(''),
    valueChoice: text('value_choice').notNull().default(''),
    valueNumber: doublePrecision('value_number'),
    attachments: jsonb('attachments').$type<string[]>().default([]),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    checklistItemUnique: uniqueIndex('hero_daily_checklist_answers_checklist_item_uq').on(
      table.checklistId,
      table.revisionItemId,
    ),
  }),
);

// ============================================================================
// HIRADC & Risk Management
// Hazard Identification, Risk Assessment & Determining Control.
// Mirrors the standard HIRADC worksheet layout (see HIRA_Service_Import_v2).
// ============================================================================

export const hiradcRegisters = pgTable('hero_hiradc_registers', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  documentNo: text('document_no').notNull().default(''),
  department: text('department').notNull().default(''),
  location: text('location').notNull().default(''),
  revision: text('revision').notNull().default('0'),
  effectiveDate: date('effective_date'),
  preparedBy: text('prepared_by').notNull().default(''),
  reviewedBy: text('reviewed_by').notNull().default(''),
  approvedBy: text('approved_by').notNull().default(''),
  status: text('status').notNull().default('draft'),
  notes: text('notes').notNull().default(''),
  sourceBatchId: text('source_batch_id').notNull().default(''),
  createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hiradcEntries = pgTable(
  'hero_hiradc_entries',
  {
    id: serial('id').primaryKey(),
    registerId: integer('register_id').references(() => hiradcRegisters.id, { onDelete: 'cascade' }),
    orderIndex: integer('order_index').notNull().default(0),

    department: text('department').notNull().default(''),
    location: text('location').notNull().default(''),
    activityName: text('activity_name').notNull().default(''),
    routineType: text('routine_type').notNull().default('Rutin'),
    equipment: text('equipment').notNull().default(''),

    hazardCategory: text('hazard_category').notNull().default(''),
    hazardDetails: text('hazard_details').notNull().default(''),
    riskConsequence: text('risk_consequence').notNull().default(''),

    likelihoodBefore: text('likelihood_before').notNull().default(''),
    severityBefore: integer('severity_before'),
    scoreBefore: integer('score_before'),
    riskLevelBefore: text('risk_level_before').notNull().default(''),

    existingControl: text('existing_control').notNull().default(''),
    legalReference: text('legal_reference').notNull().default(''),

    likelihoodAfter: text('likelihood_after').notNull().default(''),
    severityAfter: integer('severity_after'),
    scoreAfter: integer('score_after'),
    riskLevelAfter: text('risk_level_after').notNull().default(''),

    additionalControl: text('additional_control').notNull().default(''),

    sourceBatchId: text('source_batch_id').notNull().default(''),
    sourceRowNumber: integer('source_row_number'),
    rawDepartment: text('raw_department').notNull().default(''),
    rawRoutineType: text('raw_routine_type').notNull().default(''),
    rawLikelihoodBefore: text('raw_likelihood_before').notNull().default(''),
    rawSeverityBefore: text('raw_severity_before').notNull().default(''),
    rawLikelihoodAfter: text('raw_likelihood_after').notNull().default(''),
    rawSeverityAfter: text('raw_severity_after').notNull().default(''),
    rawScoreBefore: text('raw_score_before').notNull().default(''),
    rawScoreAfter: text('raw_score_after').notNull().default(''),

    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    hiradcEntriesRegisterIdx: uniqueIndex('hero_hiradc_entries_register_order_uq').on(
      table.registerId,
      table.orderIndex,
    ),
  }),
)

export const hiradcImports = pgTable('hero_hiradc_imports', {
  id: serial('id').primaryKey(),
  batchId: text('batch_id').notNull().unique(),
  originalFilename: text('original_filename').notNull().default(''),
  totalRows: integer('total_rows').notNull().default(0),
  successCount: integer('success_count').notNull().default(0),
  errorCount: integer('error_count').notNull().default(0),
  registerCount: integer('register_count').notNull().default(0),
  status: text('status').notNull().default('pending'),
  errorLog: text('error_log'),
  uploadedByUserId: text('uploaded_by_user_id').references(() => user.id, { onDelete: 'set null' }),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
})

export const hseInventories = pgTable('hero_hse_inventories', {
  id: serial('id').primaryKey(),
  documentId: text('document_id').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  qty: integer('qty').notNull().default(1),
  location: text('location').notNull(),
  condition: text('condition').notNull().default('Baik'),
  notes: text('notes').notNull().default(''),
  picName: text('pic_name').notNull().default(''),
  photoUrl: text('photo_url').notNull().default(''),
  verifiedStatus: text('verified_status').notNull().default('verified'),
  verifiedAt: timestamp('verified_at').notNull().defaultNow(),
  purchaseDate: timestamp('purchase_date'),
  validityMonths: integer('validity_months'),
  expirationDate: timestamp('expiration_date'),
  reminderDaysBefore: integer('reminder_days_before').notNull().default(30),
  reminderEmailRecipients: text('reminder_email_recipients').notNull().default(''),
  lastReminderSentAt: timestamp('last_reminder_sent_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hseIncidentRecords = pgTable('hero_hse_incident_records', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  severity: text('severity').notNull(),
  description: text('description').notNull(),
  siteId: integer('site_id').references(() => sites.id, { onDelete: 'set null' }),
  investigationStatus: text('investigation_status').notNull().default('Open'),
  incidentDate: timestamp('incident_date').notNull(),
  picEmployeeId: integer('pic_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  picName: text('pic_name').notNull().default(''),
  rootCauseAnalysis: text('root_cause_analysis').notNull().default(''),
  immediateCorrectiveAction: text('immediate_corrective_action').notNull().default(''),
  documentationUrl: text('documentation_url').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hsePtwPermits = pgTable('hero_hse_ptw_permits', {
  id: serial('id').primaryKey(),
  permitNumber: text('permit_number').notNull().unique(),
  projectName: text('project_name').notNull(),
  permitType: text('permit_type').notNull().default('Hot Work'),
  location: text('location').notNull().default(''),
  area: text('area').notNull().default(''),
  startAt: timestamp('start_at'),
  endAt: timestamp('end_at'),
  applicantName: text('applicant_name').notNull().default(''),
  fieldPicName: text('field_pic_name').notNull().default(''),
  authorizedByName: text('authorized_by_name').notNull().default(''),
  status: text('status').notNull().default('Draft'),
  riskLevel: text('risk_level').notNull().default('Medium'),
  description: text('description').notNull().default(''),
  controlSteps: text('control_steps').notNull().default(''),
  ppe: jsonb('ppe').$type<string[]>().notNull().default([]),
  gasTestRequired: boolean('gas_test_required').notNull().default(false),
  isolationRequired: boolean('isolation_required').notNull().default(false),
  hiradcEntryId: integer('hiradc_entry_id').references(() => hiradcEntries.id, { onDelete: 'set null' }),
  attachments: jsonb('attachments').$type<string[]>().notNull().default([]),
  createdByEmployeeId: integer('created_by_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hseCorrectiveActions = pgTable('hero_hse_corrective_actions', {
  id: serial('id').primaryKey(),
  sourceType: text('source_type').notNull(),
  sourceId: text('source_id').notNull().default(''),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  actionPlan: text('action_plan').notNull().default(''),
  assigneeName: text('assignee_name').notNull().default(''),
  dueDate: timestamp('due_date'),
  priority: text('priority').notNull().default('Medium'),
  status: text('status').notNull().default('Open'),
  closeOutNote: text('close_out_note').notNull().default(''),
  evidenceUrls: jsonb('evidence_urls').$type<string[]>().notNull().default([]),
  createdByEmployeeId: integer('created_by_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hcRecruitments = pgTable('hero_hc_recruitments', {
  id: serial('id').primaryKey(),
  jobTitle: text('job_title').notNull(),
  department: text('department').notNull().default(''),
  section: text('section').notNull().default(''),
  location: text('location').notNull().default(''),
  totalRequested: integer('total_requested').notNull().default(1),
  status: text('status').notNull().default('Sourcing'), // Sourcing, Psikotes, Interview, Offering, Medical Checkup, Selesai
  
  // Public Form & Open/Close Settings
  isPublic: boolean('is_public').notNull().default(false),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  jobDescription: text('job_description').notNull().default(''),
  requirements: text('requirements').notNull().default(''),
  qualifications: jsonb('qualifications').$type<string[]>(), // Array of checked qualification strings
  mandatoryFields: jsonb('mandatory_fields').$type<string[]>(), // Array of mandatory field names for public form
  scoringCriteria: jsonb('scoring_criteria').$type<Array<{ id: string; label: string; weight: number; description?: string }>>(),
  knockoutCriteria: jsonb('knockout_criteria').$type<Array<{ id: string; label: string; enabled: boolean; description?: string }>>(),
  emailTemplateId: integer('email_template_id'), // Reference to hcEmailTemplates (optional override)

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hcCertificates = pgTable('hero_hc_certificates', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').references(() => employees.id, { onDelete: 'cascade' }),
  employeeName: text('employee_name').notNull().default(''),
  certificateType: text('certificate_type').notNull(), // SIO or POP
  licenseNumber: text('license_number').notNull(),
  issuedDate: timestamp('issued_date').notNull().defaultNow(),
  expiryDate: timestamp('expiry_date').notNull(),
  documentUrl: text('document_url').notNull().default(''),
  status: text('status').notNull().default('Active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── HC Leave Management ──────────────────────────────────────────────────

export const hcLeaveTypes = pgTable('hero_hc_leave_types', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  defaultDaysPerYear: integer('default_days_per_year').notNull().default(0),
  isPaid: boolean('is_paid').notNull().default(true),
  requiresApproval: boolean('requires_approval').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hcLeaveBalances = pgTable('hero_hc_leave_balances', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull().references(() => hrEmployees.id, { onDelete: 'cascade' }),
  leaveTypeId: integer('leave_type_id').notNull().references(() => hcLeaveTypes.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  totalDays: integer('total_days').notNull().default(0),
  usedDays: integer('used_days').notNull().default(0),
  carryOverDays: integer('carry_over_days').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqueEmployeeTypeYear: uniqueIndex('unique_leave_balance_emp_type_year').on(t.employeeId, t.leaveTypeId, t.year),
}))

export const hcLeaveRequests = pgTable('hero_hc_leave_requests', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull().references(() => hrEmployees.id, { onDelete: 'cascade' }),
  leaveTypeId: integer('leave_type_id').notNull().references(() => hcLeaveTypes.id, { onDelete: 'cascade' }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  totalDays: integer('total_days').notNull().default(1),
  reason: text('reason').notNull().default(''),
  attachmentUrl: text('attachment_url').notNull().default(''),
  status: text('status').notNull().default('pending'), // pending, approved, rejected, cancelled
  approvedBy: text('approved_by').notNull().default(''),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── HC Onboarding ────────────────────────────────────────────────────────

export const hcOnboardingTemplates = pgTable('hero_hc_onboarding_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  departmentId: integer('department_id').references(() => hrDepartments.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hcOnboardingTemplateTasks = pgTable('hero_hc_onboarding_template_tasks', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').notNull().references(() => hcOnboardingTemplates.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  assignedToDepartment: text('assigned_to_department').notNull().default(''), // HR, IT, HSE, etc.
  dueDays: integer('due_days').notNull().default(7), // days after onboarding start
  isRequired: boolean('is_required').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const hcOnboardingRecords = pgTable('hero_hc_onboarding_records', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull().references(() => hrEmployees.id, { onDelete: 'cascade' }),
  templateId: integer('template_id').references(() => hcOnboardingTemplates.id, { onDelete: 'set null' }),
  startDate: date('start_date').notNull(),
  probationEndDate: date('probation_end_date'),
  status: text('status').notNull().default('in_progress'), // in_progress, completed, extended, terminated
  overallProgress: integer('overall_progress').notNull().default(0), // 0-100
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hcOnboardingTasks = pgTable('hero_hc_onboarding_tasks', {
  id: serial('id').primaryKey(),
  recordId: integer('record_id').notNull().references(() => hcOnboardingRecords.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  assignedToDepartment: text('assigned_to_department').notNull().default(''),
  dueDate: date('due_date'),
  isCompleted: boolean('is_completed').notNull().default(false),
  completedAt: timestamp('completed_at'),
  completedBy: text('completed_by').notNull().default(''),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ─── HC Recruitment (enhanced) ────────────────────────────────────────────

export const hcCandidates = pgTable('hero_hc_candidates', {
  id: serial('id').primaryKey(),
  recruitmentId: integer('recruitment_id').references(() => hcRecruitments.id, { onDelete: 'set null' }),
  
  // Personal Info
  fullName: text('full_name').notNull(),
  email: text('email').notNull().default(''),
  phone: text('phone').notNull().default(''),
  dateOfBirth: timestamp('date_of_birth'),
  address: text('address').notNull().default(''),
  gender: text('gender').notNull().default(''),
  
  // Nested Structured Data
  workExperience: jsonb('work_experience').$type<Array<{ company: string; role: string; yearIn: string; yearOut: string; description: string }>>(),
  education: jsonb('education').$type<Array<{ level: string; institution: string; major: string; yearIn: string; yearOut: string }>>(),
  drivingLicenses: jsonb('driving_licenses').$type<string[]>(), // Array of strings e.g. ["SIM A", "SIM C"]
  certificates: jsonb('certificates').$type<Array<{ name: string; year: string; publisher: string }>>(),
  achievements: text('achievements').notNull().default(''),
  
  // Files and Status
  cvUrl: text('cv_url').notNull().default(''),
  source: text('source').notNull().default(''),
  currentStage: text('current_stage').notNull().default('Sourcing'),
  rating: integer('rating'),
  
  // AI Assessment
  aiScore: integer('ai_score'),
  aiSummary: text('ai_summary').notNull().default(''),
  aiDetails: jsonb('ai_details').$type<{ breakdown?: Array<{ criterion: string; score: number; weight: number; reason: string }>; knockout?: Array<{ criterion: string; passed: boolean; reason: string }>; recommendation?: string }>(),
  aiAssessmentDate: timestamp('ai_assessment_date'),

  notes: text('notes').notNull().default(''),
  rejectionReason: text('rejection_reason').notNull().default(''),
  rejectedAtStage: text('rejected_at_stage').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),

  // Onboarding Info
  onboardingToken: text('onboarding_token').unique(),
  nikKtp: text('nik_ktp'),
  npwpNumber: text('npwp_number'),
  bpjsKesehatan: text('bpjs_kesehatan'),
  bpjsKetenagakerjaan: text('bpjs_ketenagakerjaan'),
  bankName: text('bank_name'),
  bankAccountNumber: text('bank_account_number'),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  // Onboarding Documents
  kkUrl: text('kk_url'),
  ktpUrl: text('ktp_url'),
  bankBookUrl: text('bank_book_url'),
  startDate: date('start_date'),
  onboardingCompletedAt: timestamp('onboarding_completed_at'),
})

export const hcCandidateStages = pgTable('hero_hc_candidate_stages', {
  id: serial('id').primaryKey(),
  candidateId: integer('candidate_id').notNull().references(() => hcCandidates.id, { onDelete: 'cascade' }),
  stage: text('stage').notNull(),
  enteredAt: timestamp('entered_at').notNull().defaultNow(),
  exitedAt: timestamp('exited_at'),
  result: text('result').notNull().default(''), // pass, fail, pending
  evaluator: text('evaluator').notNull().default(''),
  notes: text('notes').notNull().default(''),
  score: integer('score'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const hcCandidateInterviews = pgTable('hero_hc_candidate_interviews', {
  id: serial('id').primaryKey(),
  candidateId: integer('candidate_id').notNull().references(() => hcCandidates.id, { onDelete: 'cascade' }),
  scheduledAt: timestamp('scheduled_at').notNull(),
  durationMinutes: integer('duration_minutes').notNull().default(60),
  interviewType: text('interview_type').notNull().default('Online'), // Online, Offline
  locationOrLink: text('location_or_link').notNull().default(''),
  interviewerName: text('interviewer_name').notNull().default(''),
  status: text('status').notNull().default('Scheduled'), // Scheduled, Completed, Cancelled, No-Show
  result: text('result').notNull().default('Pending'), // Pending, Pass, Fail
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hcCandidatePanelEvaluations = pgTable('hero_hc_candidate_panel_evaluations', {
  id: serial('id').primaryKey(),
  candidateId: integer('candidate_id').notNull().references(() => hcCandidates.id, { onDelete: 'cascade' }),
  interviewId: integer('interview_id').references(() => hcCandidateInterviews.id, { onDelete: 'set null' }),
  panelistName: text('panelist_name').notNull(),
  panelistRole: text('panelist_role').notNull().default(''),
  technicalScore: integer('technical_score').notNull().default(0),
  communicationScore: integer('communication_score').notNull().default(0),
  cultureScore: integer('culture_score').notNull().default(0),
  problemSolvingScore: integer('problem_solving_score').notNull().default(0),
  attitudeScore: integer('attitude_score').notNull().default(0),
  overallRecommendation: text('overall_recommendation').notNull().default('Review'),
  strengths: text('strengths').notNull().default(''),
  concerns: text('concerns').notNull().default(''),
  notes: text('notes').notNull().default(''),
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hcCandidateMcu = pgTable('hero_hc_candidate_mcu', {
  id: serial('id').primaryKey(),
  candidateId: integer('candidate_id').notNull().references(() => hcCandidates.id, { onDelete: 'cascade' }),
  klinikName: text('klinik_name').notNull(),
  klinikEmail: text('klinik_email').notNull(),
  paketMcu: text('paket_mcu').notNull(),
  scheduledDate: date('scheduled_date').notNull(),
  status: text('status').notNull().default('Scheduled'), // Scheduled, Fit, Unfit
  resultNotes: text('result_notes').notNull().default(''),
  resultFileUrl: text('result_file_url').notNull().default(''),
  resultDate: date('result_date'),
  resultBy: text('result_by').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── HC Offering ─────────────────────────────────────────────────────────

export const hcCandidateOfferings = pgTable('hero_hc_candidate_offerings', {
  id: serial('id').primaryKey(),
  candidateId: integer('candidate_id').notNull().references(() => hcCandidates.id, { onDelete: 'cascade' }).unique(),
  position: text('position').notNull().default(''),
  directSupervisor: text('direct_supervisor').notNull().default(''),
  salary: text('salary').notNull().default(''),
  contractDurationMonths: integer('contract_duration_months').notNull().default(12),
  startDate: date('start_date'),
  outpatientBenefit: text('outpatient_benefit').notNull().default('Penusahaan memberikan bantuan biaya pengobatan rawat jalan sebesar Rp 3.500.000,-'),
  inpatientBenefit: text('inpatient_benefit').notNull().default('Penusahaan akan memberikan biaya penggatan/Pengobatan sepengetahuan bagi karyawan beserta istri & 3 (tiga) anak yang sah secara hukum, apabila telah ditanggung menjadi tanggungan karyawan tetap'),
  maternityBenefit: text('maternity_benefit').notNull().default('Penusahaan akan memberikan bantuan sebesar Rp 8.000.000,-. Dan apabila dilakukan operasi caesar perusahaan akan mengganti biaya peralatan sebesar Rp 15.000.000, setelah ditanggung menjadi tanggungan karyawan tetap'),
  accidentInsurance: text('accident_insurance').notNull().default('Penusahaan akan menanggung premi asuransi sepengetahuannya'),
  bpjsEmployment: text('bpjs_employment').notNull().default('Wajib berdasarkan Peraturan Pemerintah'),
  bpjsHealth: text('bpjs_health').notNull().default('Wajib berdasarkan Peraturan Pemerintah'),
  thr: text('thr').notNull().default('Penusahaan akan memberikan THR setahun upah, dan apabila Saudara belum mencapai masa kerja 1 (satu) tahun tetapi sudah lebih dari 1 (satu) bulan, maka akan dihitung secara proporsional.'),
  otherTerms: text('other_terms').notNull().default('Ketentuan-ketentuan lain yang tidak secara khusus diatur dalam penawaran diatas (Biaya Perjalanan Dinas, Bantuan dan fasilitas lain dan perusahaan) akan tunduk pada peraturan/perjanjian karyawan yang berlaku. Pokok-pokok Musyawarah serta tetapkan pelaksanaan perusahaan'),
  signatoryName: text('signatory_name').notNull().default(''),
  signatoryTitle: text('signatory_title').notNull().default(''),
  signatureUrl: text('signature_url').notNull().default(''),
  letterNumber: text('letter_number').notNull().default(''),
  pdfUrl: text('pdf_url').notNull().default(''),
  status: text('status').notNull().default('Draft'), // Draft, Sent, Accepted, Rejected
  sentAt: timestamp('sent_at'),
  respondedAt: timestamp('responded_at'),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── HC Offboarding ───────────────────────────────────────────────────────

export const hcOffboardingRequests = pgTable('hero_hc_offboarding_requests', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull().references(() => hrEmployees.id, { onDelete: 'cascade' }),
  requestType: text('request_type').notNull().default('resignation'), // resignation, termination, retirement, end_of_contract
  reason: text('reason').notNull().default(''),
  requestedLastWorkingDay: date('requested_last_working_day').notNull(),
  actualLastWorkingDay: date('actual_last_working_day'),
  status: text('status').notNull().default('pending'), // pending, approved, in_clearance, completed, cancelled
  approvedBy: text('approved_by').notNull().default(''),
  approvedAt: timestamp('approved_at'),
  exitInterviewNotes: text('exit_interview_notes').notNull().default(''),
  exitInterviewDate: date('exit_interview_date'),
  exitInterviewBy: text('exit_interview_by').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hcClearanceItems = pgTable('hero_hc_clearance_items', {
  id: serial('id').primaryKey(),
  offboardingId: integer('offboarding_id').notNull().references(() => hcOffboardingRequests.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  category: text('category').notNull(), // IT, Finance, Warehouse, HR, HSE, Department
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  assignedTo: text('assigned_to').notNull().default(''),
  isCompleted: boolean('is_completed').notNull().default(false),
  completedAt: timestamp('completed_at'),
  completedBy: text('completed_by').notNull().default(''),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ─── HC Letters (archive) ─────────────────────────────────────────────────

export const hcLetters = pgTable('hero_hc_letters', {
  id: serial('id').primaryKey(),
  letterType: text('letter_type').notNull(), // surat_keterangan, surat_tugas, surat_peringatan, surat_kontrak
  letterNumber: text('letter_number').notNull().unique(),
  employeeId: integer('employee_id').references(() => hrEmployees.id, { onDelete: 'set null' }),
  employeeName: text('employee_name').notNull().default(''),
  subject: text('subject').notNull().default(''),
  content: text('content').notNull().default(''), // HTML content
  destination: text('destination').notNull().default(''), // for surat tugas
  purpose: text('purpose').notNull().default(''),
  departureDate: date('departure_date'),
  returnDate: date('return_date'),
  issuedDate: date('issued_date').notNull(),
  issuedPlace: text('issued_place').notNull().default('Balikpapan'),
  signatoryName: text('signatory_name').notNull().default(''),
  signatoryTitle: text('signatory_title').notNull().default(''),
  status: text('status').notNull().default('draft'), // draft, approved, printed, archived
  approvedBy: text('approved_by').notNull().default(''),
  approvedAt: timestamp('approved_at'),
  pdfUrl: text('pdf_url').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hcLetterSequences = pgTable('hero_hc_letter_sequences', {
  id: serial('id').primaryKey(),
  letterType: text('letter_type').notNull(),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  lastSequence: integer('last_sequence').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqueTypeYearMonth: uniqueIndex('unique_letter_seq_type_year_month').on(t.letterType, t.year, t.month),
}))

// ─── HC Performance Management ────────────────────────────────────────────

export const hcPerformanceCycles = pgTable('hero_hc_performance_cycles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  cycleType: text('cycle_type').notNull(), // annual, semi_annual, quarterly
  year: integer('year').notNull(),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  status: text('status').notNull().default('draft'), // draft, active, review, closed
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hcPerformanceReviews = pgTable('hero_hc_performance_reviews', {
  id: serial('id').primaryKey(),
  cycleId: integer('cycle_id').notNull().references(() => hcPerformanceCycles.id, { onDelete: 'cascade' }),
  employeeId: integer('employee_id').notNull().references(() => hrEmployees.id, { onDelete: 'cascade' }),
  reviewerId: integer('reviewer_id').references(() => hrEmployees.id, { onDelete: 'set null' }),
  overallScore: decimal('overall_score', { precision: 5, scale: 2 }),
  overallRating: text('overall_rating').notNull().default(''), // Exceeds, Meets, Below, Unsatisfactory
  strengths: text('strengths').notNull().default(''),
  improvements: text('improvements').notNull().default(''),
  comments: text('comments').notNull().default(''),
  employeeComments: text('employee_comments').notNull().default(''),
  status: text('status').notNull().default('draft'), // draft, submitted, reviewed, acknowledged
  submittedAt: timestamp('submitted_at'),
  reviewedAt: timestamp('reviewed_at'),
  acknowledgedAt: timestamp('acknowledged_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  uniqueCycleEmployee: uniqueIndex('unique_perf_review_cycle_emp').on(t.cycleId, t.employeeId),
}))

export const hcPerformanceKpis = pgTable('hero_hc_performance_kpis', {
  id: serial('id').primaryKey(),
  reviewId: integer('review_id').notNull().references(() => hcPerformanceReviews.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  kpiName: text('kpi_name').notNull(),
  kpiDescription: text('kpi_description').notNull().default(''),
  targetValue: text('target_value').notNull().default(''),
  actualValue: text('actual_value').notNull().default(''),
  weight: integer('weight').notNull().default(0), // percentage, total across review = 100
  score: decimal('score', { precision: 5, scale: 2 }),
  comments: text('comments').notNull().default(''),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── HC Disciplinary Actions ──────────────────────────────────────────────

export const hcViolationCategories = pgTable('hero_hc_violation_categories', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  severity: text('severity').notNull().default('minor'), // minor, moderate, major, critical
  defaultSpLevel: integer('default_sp_level').notNull().default(1), // 1, 2, 3
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hcDisciplinaryActions = pgTable('hero_hc_disciplinary_actions', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').notNull().references(() => hrEmployees.id, { onDelete: 'cascade' }),
  violationCategoryId: integer('violation_category_id').references(() => hcViolationCategories.id, { onDelete: 'set null' }),
  spLevel: integer('sp_level').notNull().default(1), // 1=SP1, 2=SP2, 3=SP3
  letterNumber: text('letter_number').notNull().default(''),
  violationDate: date('violation_date').notNull(),
  violationDescription: text('violation_description').notNull().default(''),
  actionTaken: text('action_taken').notNull().default(''),
  effectiveDate: date('effective_date').notNull(),
  expiryDate: date('expiry_date'), // SP expiry (e.g., SP1 valid 6 months)
  issuedBy: text('issued_by').notNull().default(''),
  notes: text('notes').notNull().default(''),
  attachmentUrl: text('attachment_url').notNull().default(''),
  status: text('status').notNull().default('active'), // active, expired, escalated, revoked
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── HC Contract Review ──────────────────────────────────────────────

export const hcEmployeeContractReviews = pgTable('hero_hc_employee_contract_reviews', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id').references(() => hrEmployees.id, { onDelete: 'cascade' }),
  reviewType: text('review_type').notNull().default('probation'), // 'probation', 'contract'
  contractLength: text('contract_length').notNull().default(''),
  todayDate: date('today_date').notNull(),
  hireDate: date('hire_date').notNull(),
  
  // Performance
  performanceActivities: jsonb('performance_activities').$type<Array<{ activity: string, achievement: string, remark: string }>>().default([]),
  
  // Competency Achievement (Below/Meet/Exceed)
  compDisciplineAch: text('comp_discipline_ach').notNull().default(''),
  compDisciplineRemark: text('comp_discipline_remark').notNull().default(''),
  compSkillAch: text('comp_skill_ach').notNull().default(''),
  compSkillRemark: text('comp_skill_remark').notNull().default(''),
  compResultAch: text('comp_result_ach').notNull().default(''),
  compResultRemark: text('comp_result_remark').notNull().default(''),
  compQualityAch: text('comp_quality_ach').notNull().default(''),
  compQualityRemark: text('comp_quality_remark').notNull().default(''),
  compCustomerAch: text('comp_customer_ach').notNull().default(''),
  compCustomerRemark: text('comp_customer_remark').notNull().default(''),
  compTeamworkAch: text('comp_teamwork_ach').notNull().default(''),
  compTeamworkRemark: text('comp_teamwork_remark').notNull().default(''),
  
  // Recommendation
  recommendation: text('recommendation').notNull().default(''), // confirm_permanent, contract_extended, terminate_probation, contract_ended
  contractExtendedMonths: integer('contract_extended_months'),
  contractEndDate: text('contract_end_date'),
  permanentDate: text('permanent_date'),
  
  // Signatories
  leaderName: text('leader_name').notNull().default(''),
  leaderSignatureDataUrl: text('leader_signature_data_url'),
  employeeNameStr: text('employee_name_str').notNull().default(''),
  superiorName: text('superior_name').notNull().default(''),
  hrName: text('hr_name').notNull().default(''),
  nextSuperiorName: text('next_superior_name').notNull().default(''),

  letterIssuance: text('letter_issuance').notNull().default(''), // permanent_confirmation, contract_extension, unsuccessful_probation, end_of_contract
  
  status: text('status').notNull().default('draft'), // draft, finalized
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hcContractReviewApprovals = pgTable('hero_hc_contract_review_approvals', {
  id: serial('id').primaryKey(),
  reviewId: integer('review_id').notNull().references(() => hcEmployeeContractReviews.id, { onDelete: 'cascade' }),
  stepOrder: integer('step_order').notNull(),
  approvalToken: text('approval_token').notNull().unique(),
  approverEmployeeId: integer('approver_employee_id').references(() => employees.id, { onDelete: 'set null' }),
  approverName: text('approver_name').notNull(),
  approverEmail: text('approver_email').notNull().default(''),
  approverRole: text('approver_role').notNull(),
  status: text('status').notNull().default('pending'),
  signatureDataUrl: text('signature_data_url'),
  remarks: text('remarks').notNull().default(''),
  signedAt: timestamp('signed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const hcContractReviewReminders = pgTable('hero_hc_contract_review_reminders', {
  id: serial('id').primaryKey(),
  employeeId: integer('employee_id'),
  employeeSn: text('employee_sn').notNull(),
  employeeName: text('employee_name').notNull(),
  section: text('section').notNull().default(''),
  siteName: text('site_name').notNull().default(''),
  contractEndDate: date('contract_end_date').notNull(),
  reminderType: text('reminder_type').notNull(),
  recipientEmail: text('recipient_email').notNull().default(''),
  recipientName: text('recipient_name').notNull(),
  recipientRole: text('recipient_role').notNull(),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
  reviewId: integer('review_id').references(() => hcEmployeeContractReviews.id, { onDelete: 'set null' }),
})

export const hcContractReviewSettings = pgTable('hero_hc_contract_review_settings', {
  id: serial('id').primaryKey(),
  settingKey: text('setting_key').notNull().unique(),
  settingValue: jsonb('setting_value').notNull().default({}),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ─── HC Phase 2: Form Builder, Email Settings & Online Tests ───────────────

export const hcEmailTemplates = pgTable('hero_hc_email_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // e.g. "application_received", "interview_invitation", "test_assigned"
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  format: text('format').notNull().default('html'), // html | plain_text
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hcOnlineTestGroups = pgTable('hero_hc_online_test_groups', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const hcOnlineTestGroupItems = pgTable('hero_hc_online_test_group_items', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').notNull().references(() => hcOnlineTestGroups.id, { onDelete: 'cascade' }),
  testId: integer('test_id').notNull().references(() => hcOnlineTests.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const hcOnlineTests = pgTable('hero_hc_online_tests', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  timeLimitMinutes: integer('time_limit_minutes').notNull().default(60),
  passingScore: integer('passing_score').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  isApplicationForm: boolean('is_application_form').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hcOnlineTestQuestions = pgTable('hero_hc_online_test_questions', {
  id: serial('id').primaryKey(),
  testId: integer('test_id').notNull().references(() => hcOnlineTests.id, { onDelete: 'cascade' }),
  questionType: text('question_type').notNull(), // "multiple_choice", "essay"
  questionText: text('question_text').notNull(),
  imageUrl: text('image_url').notNull().default(''),
  options: jsonb('options').$type<Array<{ id: string; text: string }>>(), // For multiple choice
  correctAnswer: text('correct_answer').notNull().default(''), // ID of correct option, or keyword for essay
  points: integer('points').notNull().default(1),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const hcOnlineTestAssignments = pgTable('hero_hc_online_test_assignments', {
  id: serial('id').primaryKey(),
  testId: integer('test_id').notNull().references(() => hcOnlineTests.id, { onDelete: 'cascade' }),
  candidateId: integer('candidate_id').notNull().references(() => hcCandidates.id, { onDelete: 'cascade' }),
  accessKey: text('access_key').notNull().unique(), // Unique UUID or secure random string
  expiresAt: timestamp('expires_at').notNull(),
  scheduledAt: timestamp('scheduled_at'),
  scheduledEndAt: timestamp('scheduled_end_at'),
  status: text('status').notNull().default('Pending'), // Pending, In Progress, Completed, Expired
  score: integer('score'),
  durationSeconds: integer('duration_seconds'),
  tabLeaveCount: integer('tab_leave_count').notNull().default(0),
  refreshCount: integer('refresh_count').notNull().default(0),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const hcOnlineTestAnswers = pgTable('hero_hc_online_test_answers', {
  id: serial('id').primaryKey(),
  assignmentId: integer('assignment_id').notNull().references(() => hcOnlineTestAssignments.id, { onDelete: 'cascade' }),
  questionId: integer('question_id').notNull().references(() => hcOnlineTestQuestions.id, { onDelete: 'cascade' }),
  answerText: text('answer_text').notNull(),
  isCorrect: boolean('is_correct'),
  pointsAwarded: integer('points_awarded').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const hcMcuClinics = pgTable('hero_hc_mcu_clinics', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().default(''),
  phone: text('phone').notNull().default(''),
  address: text('address').notNull().default(''),
  city: text('city').notNull().default(''),
  contactPerson: text('contact_person').notNull().default(''),
  paketOptions: jsonb('paket_options').$type<string[]>(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const hcRecruitmentBatches = pgTable('hero_hc_recruitment_batches', {
  id: serial('id').primaryKey(),
  recruitmentId: integer('recruitment_id').notNull().references(() => hcRecruitments.id, { onDelete: 'cascade' }),
  batchName: text('batch_name').notNull(),
  batchType: text('batch_type').notNull(), // psikotes_1, psikotes_2, interview, mcu
  scheduledAt: timestamp('scheduled_at').notNull(),
  scheduledEndAt: timestamp('scheduled_end_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

