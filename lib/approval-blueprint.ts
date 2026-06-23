import { and, asc, desc, eq, inArray, isNotNull, lt, lte, sql, isNull } from 'drizzle-orm'
import { db } from '@/db'
import {
  activities,
  approvalAttachments,
  approvalComments,
  approvalMatrices,
  approvalMatrixSteps,
  approvalRequestActors,
  approvals,
  employees,
  formFieldOptions,
  formSubmissionValues,
  formSubmissions,
  formTemplateFields,
  formTemplateSections,
  formTemplateVersions,
  formTemplates,
  formValidationRules,
  inboxItems,
  notificationDeliveries,
  notificationEvents,
  reminderJobs,
  requestStatusHistories,
  sites,
  stepDecisionHistories,
  workflowBranches,
  workflowConditions,
  workflowNotificationRules,
  workflowReminderRules,
  workflowStepRules,
  workflowTemplateVersions,
  workflowTemplates,
} from '@/db/schema/hero'
import { parseApprovalNoteEntries } from '@/lib/approval-notes'
import { sendPushNotification, type PushDispatchInput } from '@/lib/push-notifications'
import {
  buildWorkflowEmailContent,
  getAppUrl,
  sendWorkflowEmail,
} from '@/lib/workflow-email'

const DAILY_ACTIVITY_TEMPLATE_KEY = 'daily-activity'
const DAILY_ACTIVITY_WORKFLOW_KEY = 'daily-activity-org'

type ActivitySupplementalPayload = {
  workDate?: string
  shift?: string
  riskCategory?: string
  referenceCode?: string
  manpowerInvolved?: string
  checklistCompletion?: string[]
  department?: string
  section?: string
  photoAttachmentUrl?: string
  documentAttachmentUrl?: string
  signatureName?: string
  latitude?: string
  longitude?: string
  additionalWatchers?: string[]
}

function normalizeStatus(value: string) {
  return value.trim().toLowerCase().replaceAll(' ', '_')
}

function parseJsonObject<T extends object>(value: string, fallback: T) {
  const trimmed = value.trim()
  if (!trimmed) {
    return fallback
  }

  try {
    const parsed = JSON.parse(trimmed) as T
    return { ...fallback, ...parsed }
  } catch {
    return fallback
  }
}

function getRequestStatus(activityStatus: string) {
  const normalized = normalizeStatus(activityStatus)

  if (normalized === 'approved') {
    return 'approved'
  }

  if (normalized === 'rejected') {
    return 'rejected'
  }

  if (normalized === 'needs_correction') {
    return 'needs_revision'
  }

  if (normalized.startsWith('pending')) {
    return 'in_review'
  }

  if (normalized === 'cancelled') {
    return 'cancelled'
  }

  return 'submitted'
}

function getApprovalModeGroupStatus(statuses: string[], mode: string) {
  const normalizedMode = normalizeStatus(mode)
  const normalizedStatuses = statuses.map((status) => normalizeStatus(status))

  if (normalizedStatuses.some((status) => status === 'rejected')) {
    return 'rejected'
  }

  if (normalizedStatuses.some((status) => status === 'needs_correction')) {
    return 'needs_revision'
  }

  if (normalizedMode === 'parallel_any' || normalizedMode === 'any_one') {
    if (normalizedStatuses.some((status) => status === 'approved')) {
      return 'approved'
    }

    if (normalizedStatuses.some((status) => status === 'pending')) {
      return 'pending'
    }
  }

  if (normalizedStatuses.every((status) => status === 'approved' || status === 'skipped')) {
    return 'approved'
  }

  if (normalizedStatuses.some((status) => status === 'pending')) {
    return 'pending'
  }

  return normalizedStatuses[normalizedStatuses.length - 1] ?? 'waiting'
}

function buildRequestNumber(activityId: number, submittedAt: Date) {
  const stamp = [
    submittedAt.getFullYear(),
    `${submittedAt.getMonth() + 1}`.padStart(2, '0'),
    `${submittedAt.getDate()}`.padStart(2, '0'),
  ].join('')

  return `DA-${stamp}-${`${activityId}`.padStart(4, '0')}`
}

function getDueAt(submittedAt: Date, slaHours: number) {
  return new Date(submittedAt.getTime() + slaHours * 60 * 60 * 1000)
}

function slugifyKey(value: string, fallback: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized || fallback
}

function parseOptionLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [rawValue, rawLabel] = line.includes('|') ? line.split('|', 2) : [line, line]
      return {
        optionValue: rawValue.trim(),
        optionLabel: (rawLabel ?? rawValue).trim(),
        sortOrder: index + 1,
      }
    })
}

function normalizeConditionValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => `${item}`.trim()).filter(Boolean)
  }

  return `${value ?? ''}`.trim()
}

function compareConditionValue(input: unknown, operator: string, expected: string) {
  const normalizedOperator = normalizeStatus(operator)
  const normalizedInput = normalizeConditionValue(input)
  const normalizedExpected = expected.trim()
  const inputText = Array.isArray(normalizedInput) ? normalizedInput.join(',') : normalizedInput
  const inputNumber = Number.parseFloat(inputText)
  const expectedNumber = Number.parseFloat(normalizedExpected)

  switch (normalizedOperator) {
    case '=':
    case 'eq':
      return inputText.toLowerCase() === normalizedExpected.toLowerCase()
    case '!=':
    case 'not_eq':
      return inputText.toLowerCase() !== normalizedExpected.toLowerCase()
    case '>':
      return (
        Number.isFinite(inputNumber) &&
        Number.isFinite(expectedNumber) &&
        inputNumber > expectedNumber
      )
    case '>=':
      return (
        Number.isFinite(inputNumber) &&
        Number.isFinite(expectedNumber) &&
        inputNumber >= expectedNumber
      )
    case '<':
      return (
        Number.isFinite(inputNumber) &&
        Number.isFinite(expectedNumber) &&
        inputNumber < expectedNumber
      )
    case '<=':
      return (
        Number.isFinite(inputNumber) &&
        Number.isFinite(expectedNumber) &&
        inputNumber <= expectedNumber
      )
    case 'contains':
      return inputText.toLowerCase().includes(normalizedExpected.toLowerCase())
    case 'in': {
      const expectedValues = normalizedExpected
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
      return expectedValues.includes(inputText.toLowerCase())
    }
    case 'is_empty':
    case 'is empty':
      return inputText.length === 0
    case 'is_not_empty':
    case 'is not empty':
      return inputText.length > 0
    case 'attachment_exists':
      return inputText.length > 0
    default:
      return inputText.toLowerCase() === normalizedExpected.toLowerCase()
  }
}

function getTemplateCatalogSeed() {
  return [
    {
      templateKey: DAILY_ACTIVITY_TEMPLATE_KEY,
      category: 'Operations',
      name: 'Daily Activity',
      workflowMode: 'org_template',
      description:
        'Form aktivitas harian dengan workflow approval berbasis struktur organisasi atau matrix khusus.',
    },
    {
      templateKey: 'overtime-request',
      category: 'Operations',
      name: 'Overtime Request',
      workflowMode: 'org_template',
      description: 'Request lembur terpisah untuk kebutuhan payroll dan monitoring SLA approval.',
    },
    {
      templateKey: 'attendance-permission',
      category: 'HC',
      name: 'Attendance Permission',
      workflowMode: 'manual_workflow',
      description: 'Pengajuan izin attendance dengan workflow approval lintas atasan/HC.',
    },
    {
      templateKey: 'leave-permission',
      category: 'HC',
      name: 'Leave / Permission',
      workflowMode: 'manual_workflow',
      description: 'Permohonan cuti, izin, dan approval lintas atasan/HC.',
    },
    {
      templateKey: 'offboarding-request',
      category: 'HC',
      name: 'Offboarding Request',
      workflowMode: 'manual_workflow',
      description: 'Permintaan offboarding dan clearance dengan workflow approval lintas HC.',
    },
    {
      templateKey: 'daily-report',
      category: 'Reporting',
      name: 'Daily Report',
      workflowMode: 'org_template',
      description: 'Rekap operasional harian site dengan approval berjenjang.',
    },
    {
      templateKey: 'hse-observation',
      category: 'HSE',
      name: 'HSE Observation',
      workflowMode: 'org_template',
      description: 'Pencatatan observasi HSE dengan attachment dan eskalasi.',
    },
    {
      templateKey: 'procurement-request',
      category: 'Finance / SCM',
      name: 'Procurement Request',
      workflowMode: 'manual_workflow',
      description: 'Permintaan pembelian dengan rule nominal dan approval lintas fungsi.',
    },
  ] as const
}

function getDailyActivityFieldSeed() {
  return {
    sections: [
      {
        sectionKey: 'work_context',
        label: 'Work Context',
        description: 'Identitas aktivitas dan konteks organisasi.',
      },
      {
        sectionKey: 'time_window',
        label: 'Time Window',
        description: 'Jam kerja, overtime, dan kalkulasi durasi.',
      },
      {
        sectionKey: 'evidence',
        label: 'Evidence & Control',
        description: 'Attachment, signature, checklist, dan remark.',
      },
    ],
    fields: [
      {
        sectionKey: 'work_context',
        fieldKey: 'title',
        fieldType: 'text',
        label: 'Judul pekerjaan',
        required: true,
        placeholder: 'Contoh: Inspeksi unit operasional',
      },
      {
        sectionKey: 'work_context',
        fieldKey: 'activityCode',
        fieldType: 'select',
        label: 'Kode aktivitas',
        required: true,
        placeholder: '',
      },
      {
        sectionKey: 'work_context',
        fieldKey: 'activityType',
        fieldType: 'select',
        label: 'Activity Type',
        required: true,
        placeholder: '',
      },
      {
        sectionKey: 'work_context',
        fieldKey: 'workDate',
        fieldType: 'date',
        label: 'Tanggal kerja',
        required: true,
        placeholder: '',
      },
      {
        sectionKey: 'work_context',
        fieldKey: 'shift',
        fieldType: 'radio',
        label: 'Shift',
        required: true,
        placeholder: '',
      },
      {
        sectionKey: 'work_context',
        fieldKey: 'siteName',
        fieldType: 'org_unit_picker',
        label: 'Site',
        required: true,
        placeholder: '',
      },
      {
        sectionKey: 'work_context',
        fieldKey: 'department',
        fieldType: 'org_unit_picker',
        label: 'Department',
        required: true,
        placeholder: '',
      },
      {
        sectionKey: 'work_context',
        fieldKey: 'section',
        fieldType: 'org_unit_picker',
        label: 'Section',
        required: false,
        placeholder: '',
      },
      {
        sectionKey: 'work_context',
        fieldKey: 'unitNumber',
        fieldType: 'text',
        label: 'Unit / Area',
        required: true,
        placeholder: 'Contoh: Unit-001',
      },
      {
        sectionKey: 'work_context',
        fieldKey: 'referenceCode',
        fieldType: 'text',
        label: 'Reference WO / Ticket',
        required: false,
        placeholder: 'Opsional',
      },
      {
        sectionKey: 'work_context',
        fieldKey: 'employeeId',
        fieldType: 'people_picker',
        label: 'Requester',
        required: true,
        placeholder: '',
      },
      {
        sectionKey: 'work_context',
        fieldKey: 'additionalWatchers',
        fieldType: 'multi_select',
        label: 'Watcher / CC',
        required: false,
        placeholder: '',
      },
      {
        sectionKey: 'time_window',
        fieldKey: 'startTime',
        fieldType: 'datetime',
        label: 'Waktu mulai',
        required: true,
        placeholder: '',
      },
      {
        sectionKey: 'time_window',
        fieldKey: 'endTime',
        fieldType: 'datetime',
        label: 'Waktu selesai',
        required: true,
        placeholder: '',
      },
      {
        sectionKey: 'time_window',
        fieldKey: 'priority',
        fieldType: 'select',
        label: 'Prioritas',
        required: true,
        placeholder: '',
      },
      {
        sectionKey: 'time_window',
        fieldKey: 'overtimeMinutes',
        fieldType: 'number',
        label: 'Kandidat lembur (menit)',
        required: true,
        placeholder: '0',
      },
      {
        sectionKey: 'time_window',
        fieldKey: 'manpowerInvolved',
        fieldType: 'number',
        label: 'Manpower involved',
        required: false,
        placeholder: '0',
      },
      {
        sectionKey: 'time_window',
        fieldKey: 'riskCategory',
        fieldType: 'radio',
        label: 'Kategori risiko',
        required: false,
        placeholder: '',
      },
      {
        sectionKey: 'time_window',
        fieldKey: 'calculatedDuration',
        fieldType: 'calculated_field',
        label: 'Durasi kerja (preview)',
        required: false,
        placeholder: '',
      },
      {
        sectionKey: 'evidence',
        fieldKey: 'titleDetails',
        fieldType: 'textarea',
        label: 'Deskripsi kerja',
        required: true,
        placeholder: 'Catatan detail pekerjaan',
      },
      {
        sectionKey: 'evidence',
        fieldKey: 'checklistCompletion',
        fieldType: 'checkbox',
        label: 'Checklist completion',
        required: false,
        placeholder: '',
      },
      {
        sectionKey: 'evidence',
        fieldKey: 'photoAttachmentUrl',
        fieldType: 'image_upload',
        label: 'Attachment foto',
        required: false,
        placeholder: 'Tempel URL image',
      },
      {
        sectionKey: 'evidence',
        fieldKey: 'documentAttachmentUrl',
        fieldType: 'file_upload',
        label: 'Attachment dokumen',
        required: false,
        placeholder: 'Tempel URL dokumen',
      },
      {
        sectionKey: 'evidence',
        fieldKey: 'signatureName',
        fieldType: 'signature',
        label: 'Signature requester',
        required: false,
        placeholder: 'Ketik nama sebagai e-sign',
      },
      {
        sectionKey: 'evidence',
        fieldKey: 'remarks',
        fieldType: 'textarea',
        label: 'Remark',
        required: true,
        placeholder: 'Catatan singkat',
      },
      {
        sectionKey: 'evidence',
        fieldKey: 'latitude',
        fieldType: 'text',
        label: 'Latitude',
        required: false,
        placeholder: 'Opsional',
      },
      {
        sectionKey: 'evidence',
        fieldKey: 'longitude',
        fieldType: 'text',
        label: 'Longitude',
        required: false,
        placeholder: 'Opsional',
      },
    ],
  } as const
}

async function ensureApprovalBlueprintTables() {
  await db.execute(sql`
    create table if not exists hero_form_templates (
      id serial primary key,
      template_key text not null,
      category text not null,
      name text not null,
      workflow_mode text not null default 'org_template',
      description text not null default '',
      is_active boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create unique index if not exists hero_form_templates_template_key_unique
    on hero_form_templates (template_key);
  `)

  await db.execute(sql`
    alter table hero_form_templates
    add column if not exists workflow_mode text not null default 'org_template';
  `)

  await db.execute(sql`
    create table if not exists hero_form_template_versions (
      id serial primary key,
      template_id integer not null references hero_form_templates(id) on delete cascade,
      version_number integer not null default 1,
      publish_status text not null default 'draft',
      workflow_snapshot text not null default '',
      schema_snapshot text not null default '',
      effective_from timestamp,
      effective_to timestamp,
      created_by_employee_id integer references hero_employees(id) on delete set null,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_form_template_sections (
      id serial primary key,
      version_id integer not null references hero_form_template_versions(id) on delete cascade,
      section_key text not null,
      label text not null,
      description text not null default '',
      sort_order integer not null default 0,
      is_collapsible boolean not null default false,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_form_template_fields (
      id serial primary key,
      version_id integer not null references hero_form_template_versions(id) on delete cascade,
      section_id integer references hero_form_template_sections(id) on delete set null,
      field_key text not null,
      field_type text not null,
      label text not null,
      placeholder text not null default '',
      help_text text not null default '',
      default_value text not null default '',
      config_json text not null default '',
      validation_json text not null default '',
      option_source_json text not null default '',
      is_required boolean not null default false,
      is_hidden boolean not null default false,
      sort_order integer not null default 0,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_form_field_options (
      id serial primary key,
      field_id integer not null references hero_form_template_fields(id) on delete cascade,
      option_value text not null,
      option_label text not null,
      sort_order integer not null default 0,
      is_default boolean not null default false,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_form_validation_rules (
      id serial primary key,
      field_id integer not null references hero_form_template_fields(id) on delete cascade,
      rule_type text not null,
      operator text not null default '=',
      rule_value text not null default '',
      error_message text not null default '',
      sort_order integer not null default 0,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_workflow_templates (
      id serial primary key,
      template_key text not null,
      name text not null,
      mode text not null default 'org_template',
      description text not null default '',
      is_active boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create unique index if not exists hero_workflow_templates_template_key_unique
    on hero_workflow_templates (template_key);
  `)

  await db.execute(sql`
    create table if not exists hero_workflow_template_versions (
      id serial primary key,
      workflow_template_id integer not null references hero_workflow_templates(id) on delete cascade,
      version_number integer not null default 1,
      publish_status text not null default 'draft',
      effective_from timestamp,
      effective_to timestamp,
      notes text not null default '',
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_workflow_conditions (
      id serial primary key,
      workflow_version_id integer not null references hero_workflow_template_versions(id) on delete cascade,
      parent_condition_id integer references hero_workflow_conditions(id) on delete cascade,
      field_key text not null,
      operator text not null default '=',
      compare_value text not null default '',
      logical_join text not null default 'AND',
      group_label text not null default '',
      sort_order integer not null default 0,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_workflow_branches (
      id serial primary key,
      workflow_version_id integer not null references hero_workflow_template_versions(id) on delete cascade,
      branch_key text not null,
      label text not null,
      outcome_type text not null default 'route',
      route_mode text not null default 'sequential',
      sort_order integer not null default 0,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_workflow_step_rules (
      id serial primary key,
      workflow_version_id integer not null references hero_workflow_template_versions(id) on delete cascade,
      branch_id integer references hero_workflow_branches(id) on delete set null,
      approval_matrix_step_id integer references hero_approval_matrix_steps(id) on delete set null,
      step_order integer not null default 1,
      label text not null,
      approval_mode text not null default 'sequential',
      assignment_source text not null default 'matrix',
      is_required boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_workflow_notification_rules (
      id serial primary key,
      workflow_version_id integer not null references hero_workflow_template_versions(id) on delete cascade,
      branch_id integer references hero_workflow_branches(id) on delete set null,
      event_type text not null,
      channel text not null default 'in_app',
      recipient_mode text not null default 'approver',
      cc_mode text not null default '',
      is_active boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_workflow_reminder_rules (
      id serial primary key,
      workflow_version_id integer not null references hero_workflow_template_versions(id) on delete cascade,
      step_rule_id integer references hero_workflow_step_rules(id) on delete set null,
      reminder_type text not null default 'before_due',
      offset_hours integer not null default 2,
      channel text not null default 'email',
      is_active boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_form_submissions (
      id serial primary key,
      template_id integer not null references hero_form_templates(id) on delete restrict,
      template_version_id integer not null references hero_form_template_versions(id) on delete restrict,
      requester_employee_id integer not null references hero_employees(id) on delete restrict,
      site_id integer references hero_sites(id) on delete set null,
      legacy_activity_id integer references hero_activities(id) on delete set null,
      request_number text not null default '',
      request_status text not null default 'draft',
      workflow_snapshot text not null default '',
      payload_snapshot text not null default '',
      preview_snapshot text not null default '',
      submitted_at timestamp,
      completed_at timestamp,
      cancelled_at timestamp,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_form_submission_values (
      id serial primary key,
      submission_id integer not null references hero_form_submissions(id) on delete cascade,
      field_key text not null,
      field_type text not null,
      value_text text not null default '',
      display_value text not null default '',
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_approval_comments (
      id serial primary key,
      approval_id integer not null references hero_approvals(id) on delete cascade,
      actor_employee_id integer references hero_employees(id) on delete set null,
      comment_kind text not null default 'comment',
      message text not null,
      is_internal boolean not null default false,
      created_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_approval_request_actors (
      id serial primary key,
      submission_id integer not null references hero_form_submissions(id) on delete cascade,
      approval_id integer references hero_approvals(id) on delete set null,
      actor_employee_id integer references hero_employees(id) on delete set null,
      actor_role text not null default 'approver',
      assignment_type text not null default 'primary',
      status text not null default 'pending',
      due_at timestamp,
      acted_at timestamp,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_approval_attachments (
      id serial primary key,
      submission_id integer not null references hero_form_submissions(id) on delete cascade,
      approval_id integer references hero_approvals(id) on delete set null,
      attachment_kind text not null default 'file',
      file_name text not null,
      mime_type text not null default 'application/octet-stream',
      file_url text not null,
      uploaded_by_employee_id integer references hero_employees(id) on delete set null,
      created_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    alter table hero_approval_attachments
    add column if not exists mime_type text not null default 'application/octet-stream';
  `)

  await db.execute(sql`
    create table if not exists hero_inbox_items (
      id serial primary key,
      submission_id integer not null references hero_form_submissions(id) on delete cascade,
      approval_id integer references hero_approvals(id) on delete set null,
      assignee_employee_id integer references hero_employees(id) on delete set null,
      inbox_type text not null default 'approval',
      status text not null default 'pending',
      due_at timestamp,
      snoozed_until timestamp,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_notification_events (
      id serial primary key,
      submission_id integer references hero_form_submissions(id) on delete cascade,
      inbox_item_id integer references hero_inbox_items(id) on delete cascade,
      approval_id integer references hero_approvals(id) on delete set null,
      channel text not null default 'email',
      event_type text not null,
      recipient text not null,
      payload_snapshot text not null default '',
      delivery_status text not null default 'queued',
      delivered_at timestamp,
      created_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_notification_deliveries (
      id serial primary key,
      notification_event_id integer not null references hero_notification_events(id) on delete cascade,
      delivery_channel text not null default 'in_app',
      recipient text not null,
      status text not null default 'queued',
      sent_at timestamp,
      error_message text,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_reminder_jobs (
      id serial primary key,
      inbox_item_id integer not null references hero_inbox_items(id) on delete cascade,
      reminder_type text not null default 'before_due',
      reminder_at timestamp not null,
      status text not null default 'scheduled',
      execution_log text not null default '',
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_request_status_histories (
      id serial primary key,
      submission_id integer not null references hero_form_submissions(id) on delete cascade,
      approval_id integer references hero_approvals(id) on delete set null,
      actor_employee_id integer references hero_employees(id) on delete set null,
      from_status text not null default '',
      to_status text not null,
      note text not null default '',
      created_at timestamp not null default now()
    );
  `)

  await db.execute(sql`
    create table if not exists hero_step_decision_histories (
      id serial primary key,
      submission_id integer not null references hero_form_submissions(id) on delete cascade,
      approval_id integer not null references hero_approvals(id) on delete cascade,
      actor_employee_id integer references hero_employees(id) on delete set null,
      decision text not null,
      decision_note text not null default '',
      decided_at timestamp not null default now(),
      created_at timestamp not null default now()
    );
  `)
}

async function ensureDailyActivityTemplateVersion(templateId: number) {
  const [existingVersion] = await db
    .select()
    .from(formTemplateVersions)
    .where(eq(formTemplateVersions.templateId, templateId))
    .orderBy(desc(formTemplateVersions.versionNumber))
    .limit(1)

  if (existingVersion) {
    return existingVersion
  }

  const [createdVersion] = await db
    .insert(formTemplateVersions)
    .values({
      templateId,
      versionNumber: 1,
      publishStatus: 'published',
      schemaSnapshot: JSON.stringify({ templateKey: DAILY_ACTIVITY_TEMPLATE_KEY }),
      workflowSnapshot: JSON.stringify({ workflowKey: DAILY_ACTIVITY_WORKFLOW_KEY }),
    })
    .returning()

  return createdVersion
}

async function ensureWorkflowTemplateVersion(workflowTemplateId: number) {
  const [existingVersion] = await db
    .select()
    .from(workflowTemplateVersions)
    .where(eq(workflowTemplateVersions.workflowTemplateId, workflowTemplateId))
    .orderBy(desc(workflowTemplateVersions.versionNumber))
    .limit(1)

  if (existingVersion) {
    return existingVersion
  }

  const [createdVersion] = await db
    .insert(workflowTemplateVersions)
    .values({
      workflowTemplateId,
      versionNumber: 1,
      publishStatus: 'published',
      notes: 'Initial published workflow version',
    })
    .returning()

  return createdVersion
}

async function ensureDailyActivityTemplateFields(versionId: number) {
  const [fieldCount] = await db
    .select({ id: formTemplateFields.id })
    .from(formTemplateFields)
    .where(eq(formTemplateFields.versionId, versionId))
    .limit(1)

  if (fieldCount) {
    return
  }

  const seed = getDailyActivityFieldSeed()
  const insertedSections = await db
    .insert(formTemplateSections)
    .values(
      seed.sections.map((section, index) => ({
        versionId,
        sectionKey: section.sectionKey,
        label: section.label,
        description: section.description,
        sortOrder: index + 1,
        isCollapsible: false,
      }))
    )
    .returning()

  const sectionByKey = new Map(insertedSections.map((section) => [section.sectionKey, section]))
  const insertedFields = await db
    .insert(formTemplateFields)
    .values(
      seed.fields.map((field, index) => ({
        versionId,
        sectionId: sectionByKey.get(field.sectionKey)?.id ?? null,
        fieldKey: field.fieldKey,
        fieldType: field.fieldType,
        label: field.label,
        placeholder: field.placeholder,
        helpText: '',
        defaultValue: '',
        configJson: JSON.stringify({ sectionKey: field.sectionKey }),
        validationJson: JSON.stringify({ required: field.required }),
        optionSourceJson: '',
        isRequired: field.required,
        isHidden: false,
        sortOrder: index + 1,
      }))
    )
    .returning()

  const fieldByKey = new Map(insertedFields.map((field) => [field.fieldKey, field]))

  const optionSeed: Array<{
    fieldKey: string
    value: string
    label: string
    sortOrder: number
    isDefault?: boolean
  }> = [
    { fieldKey: 'activityCode', value: 'TS', label: 'TS', sortOrder: 1, isDefault: true },
    { fieldKey: 'activityCode', value: 'TR', label: 'TR', sortOrder: 2 },
    { fieldKey: 'activityCode', value: 'TE', label: 'TE', sortOrder: 3 },
    { fieldKey: 'activityCode', value: 'TI', label: 'TI', sortOrder: 4 },
    { fieldKey: 'activityCode', value: 'HS', label: 'HS', sortOrder: 5 },
    { fieldKey: 'activityCode', value: 'SB', label: 'SB', sortOrder: 6 },
    { fieldKey: 'activityCode', value: 'AD', label: 'AD', sortOrder: 7 },
    { fieldKey: 'activityType', value: 'Tire Service', label: 'Tire Service', sortOrder: 1 },
    { fieldKey: 'activityType', value: 'Tire Repair', label: 'Tire Repair', sortOrder: 2 },
    {
      fieldKey: 'activityType',
      value: 'Technical Engineering',
      label: 'Technical Engineering',
      sortOrder: 3,
    },
    { fieldKey: 'activityType', value: 'Tire Inspection', label: 'Tire Inspection', sortOrder: 4 },
    { fieldKey: 'activityType', value: 'HSE Activity', label: 'HSE Activity', sortOrder: 5 },
    { fieldKey: 'activityType', value: 'Daily Recap', label: 'Daily Recap', sortOrder: 6 },
    { fieldKey: 'priority', value: 'Normal', label: 'Normal', sortOrder: 1, isDefault: true },
    { fieldKey: 'priority', value: 'Safety', label: 'Safety', sortOrder: 2 },
    { fieldKey: 'priority', value: 'Emergency', label: 'Emergency', sortOrder: 3 },
    { fieldKey: 'shift', value: 'Shift Pagi', label: 'Shift Pagi', sortOrder: 1, isDefault: true },
    { fieldKey: 'shift', value: 'Shift Sore', label: 'Shift Sore', sortOrder: 2 },
    { fieldKey: 'shift', value: 'Shift Malam', label: 'Shift Malam', sortOrder: 3 },
    { fieldKey: 'riskCategory', value: 'Low', label: 'Low', sortOrder: 1 },
    { fieldKey: 'riskCategory', value: 'Medium', label: 'Medium', sortOrder: 2 },
    { fieldKey: 'riskCategory', value: 'High', label: 'High', sortOrder: 3 },
    {
      fieldKey: 'checklistCompletion',
      value: 'Work area safe',
      label: 'Work area safe',
      sortOrder: 1,
    },
    { fieldKey: 'checklistCompletion', value: 'PPE complete', label: 'PPE complete', sortOrder: 2 },
    {
      fieldKey: 'checklistCompletion',
      value: 'Photo attached',
      label: 'Photo attached',
      sortOrder: 3,
    },
  ]

  if (optionSeed.length > 0) {
    await db.insert(formFieldOptions).values(
      optionSeed.flatMap((option) => {
        const field = fieldByKey.get(option.fieldKey)
        if (!field) {
          return []
        }

        return [
          {
            fieldId: field.id,
            optionValue: option.value,
            optionLabel: option.label,
            sortOrder: option.sortOrder,
            isDefault: option.isDefault ?? false,
          },
        ]
      })
    )
  }

  const validationSeed: Array<{
    fieldKey: string
    ruleType: string
    operator: string
    value: string
    message: string
    sortOrder: number
  }> = [
    {
      fieldKey: 'title',
      ruleType: 'length',
      operator: '>=',
      value: '5',
      message: 'Judul pekerjaan minimal 5 karakter.',
      sortOrder: 1,
    },
    {
      fieldKey: 'unitNumber',
      ruleType: 'required',
      operator: 'is_not_empty',
      value: '',
      message: 'Unit / area wajib diisi.',
      sortOrder: 1,
    },
    {
      fieldKey: 'overtimeMinutes',
      ruleType: 'number_range',
      operator: '<=',
      value: '720',
      message: 'Overtime maksimal 720 menit.',
      sortOrder: 1,
    },
    {
      fieldKey: 'photoAttachmentUrl',
      ruleType: 'file_type',
      operator: 'contains',
      value: 'http',
      message: 'Attachment foto gunakan URL yang valid.',
      sortOrder: 1,
    },
  ]

  await db.insert(formValidationRules).values(
    validationSeed.flatMap((rule) => {
      const field = fieldByKey.get(rule.fieldKey)
      if (!field) {
        return []
      }

      return [
        {
          fieldId: field.id,
          ruleType: rule.ruleType,
          operator: rule.operator,
          ruleValue: rule.value,
          errorMessage: rule.message,
          sortOrder: rule.sortOrder,
        },
      ]
    })
  )
}

async function ensureDailyActivityWorkflowSeed() {
  const [workflowTemplate] =
    (await db
      .insert(workflowTemplates)
      .values({
        templateKey: DAILY_ACTIVITY_WORKFLOW_KEY,
        name: 'Daily Activity Org Workflow',
        mode: 'org_template',
        description: 'Workflow approval daily activity berbasis org structure dan approval matrix.',
      })
      .onConflictDoNothing()
      .returning()) ?? []

  const [resolvedWorkflowTemplate] =
    workflowTemplate != null
      ? [workflowTemplate]
      : await db
          .select()
          .from(workflowTemplates)
          .where(eq(workflowTemplates.templateKey, DAILY_ACTIVITY_WORKFLOW_KEY))
          .limit(1)

  if (!resolvedWorkflowTemplate) {
    return null
  }

  const workflowVersion = await ensureWorkflowTemplateVersion(resolvedWorkflowTemplate.id)

  const [conditionExists] = await db
    .select({ id: workflowConditions.id })
    .from(workflowConditions)
    .where(eq(workflowConditions.workflowVersionId, workflowVersion.id))
    .limit(1)

  if (!conditionExists) {
    await db.insert(workflowConditions).values([
      {
        workflowVersionId: workflowVersion.id,
        fieldKey: 'site',
        operator: '=',
        compareValue: '',
        logicalJoin: 'AND',
        groupLabel: 'Default Site Scope',
        sortOrder: 1,
      },
      {
        workflowVersionId: workflowVersion.id,
        fieldKey: 'priority',
        operator: 'in',
        compareValue: 'Normal,Safety,Emergency',
        logicalJoin: 'AND',
        groupLabel: 'Priority Coverage',
        sortOrder: 2,
      },
      {
        workflowVersionId: workflowVersion.id,
        fieldKey: 'overtimeMinutes',
        operator: '<=',
        compareValue: '720',
        logicalJoin: 'AND',
        groupLabel: 'Overtime Threshold',
        sortOrder: 3,
      },
    ])
  }

  const [branchExists] = await db
    .select({ id: workflowBranches.id })
    .from(workflowBranches)
    .where(eq(workflowBranches.workflowVersionId, workflowVersion.id))
    .limit(1)

  if (!branchExists) {
    await db.insert(workflowBranches).values([
      {
        workflowVersionId: workflowVersion.id,
        branchKey: 'default-sequential',
        label: 'Default Sequential',
        outcomeType: 'route',
        routeMode: 'sequential',
        sortOrder: 1,
      },
      {
        workflowVersionId: workflowVersion.id,
        branchKey: 'priority-emergency',
        label: 'Emergency Escalation',
        outcomeType: 'route',
        routeMode: 'parallel_any',
        sortOrder: 2,
      },
    ])
  }

  const [stepRuleExists] = await db
    .select({ id: workflowStepRules.id })
    .from(workflowStepRules)
    .where(eq(workflowStepRules.workflowVersionId, workflowVersion.id))
    .limit(1)

  if (!stepRuleExists) {
    const matrixSteps = await db
      .select({
        id: approvalMatrixSteps.id,
        stepOrder: approvalMatrixSteps.stepOrder,
        label: approvalMatrixSteps.label,
        approvalMode: approvalMatrixSteps.approvalMode,
      })
      .from(approvalMatrixSteps)
      .orderBy(asc(approvalMatrixSteps.stepOrder), asc(approvalMatrixSteps.id))

    const [defaultBranch, emergencyBranch] = await db
      .select()
      .from(workflowBranches)
      .where(eq(workflowBranches.workflowVersionId, workflowVersion.id))
      .orderBy(asc(workflowBranches.sortOrder))

    if (matrixSteps.length > 0 && defaultBranch) {
      await db.insert(workflowStepRules).values(
        matrixSteps.map((step) => ({
          workflowVersionId: workflowVersion.id,
          branchId:
            normalizeStatus(step.approvalMode) === 'parallel_any'
              ? (emergencyBranch?.id ?? defaultBranch.id)
              : defaultBranch.id,
          approvalMatrixStepId: step.id,
          stepOrder: step.stepOrder,
          label: step.label,
          approvalMode: step.approvalMode,
          assignmentSource: 'matrix',
          isRequired: true,
        }))
      )
    }
  }

  const [notificationRuleExists] = await db
    .select({ id: workflowNotificationRules.id })
    .from(workflowNotificationRules)
    .where(eq(workflowNotificationRules.workflowVersionId, workflowVersion.id))
    .limit(1)

  if (!notificationRuleExists) {
    await db.insert(workflowNotificationRules).values([
      {
        workflowVersionId: workflowVersion.id,
        eventType: 'submitted',
        channel: 'in_app',
        recipientMode: 'requester',
        ccMode: 'workflow_admin',
        isActive: true,
      },
      {
        workflowVersionId: workflowVersion.id,
        eventType: 'step_assigned',
        channel: 'email',
        recipientMode: 'approver',
        ccMode: 'watcher',
        isActive: true,
      },
      {
        workflowVersionId: workflowVersion.id,
        eventType: 'step_decision',
        channel: 'in_app',
        recipientMode: 'requester',
        ccMode: 'workflow_admin',
        isActive: true,
      },
    ])
  }

  const [reminderRuleExists] = await db
    .select({ id: workflowReminderRules.id })
    .from(workflowReminderRules)
    .where(eq(workflowReminderRules.workflowVersionId, workflowVersion.id))
    .limit(1)

  if (!reminderRuleExists) {
    const stepRules = await db
      .select()
      .from(workflowStepRules)
      .where(eq(workflowStepRules.workflowVersionId, workflowVersion.id))
      .orderBy(asc(workflowStepRules.stepOrder))

    if (stepRules.length > 0) {
      await db.insert(workflowReminderRules).values(
        stepRules.flatMap((stepRule) => [
          {
            workflowVersionId: workflowVersion.id,
            stepRuleId: stepRule.id,
            reminderType: 'before_due',
            offsetHours: 2,
            channel: 'email',
            isActive: true,
          },
          {
            workflowVersionId: workflowVersion.id,
            stepRuleId: stepRule.id,
            reminderType: 'overdue',
            offsetHours: 0,
            channel: 'in_app',
            isActive: true,
          },
        ])
      )
    }
  }

  return workflowVersion
}

function inferDefaultShift(startTime: Date) {
  const hour = startTime.getHours()
  if (hour >= 6 && hour < 15) {
    return 'Shift Pagi'
  }

  if (hour >= 15 && hour < 23) {
    return 'Shift Sore'
  }

  return 'Shift Malam'
}

export async function ensureApprovalBlueprintSeedData() {
  await ensureApprovalBlueprintTables()

  const [site] = await db.select().from(sites).limit(1)
  if (!site) {
    return
  }

  await db
    .insert(formTemplates)
    .values([...getTemplateCatalogSeed()])
    .onConflictDoNothing()

  const [dailyTemplate] = await db
    .select()
    .from(formTemplates)
    .where(eq(formTemplates.templateKey, DAILY_ACTIVITY_TEMPLATE_KEY))
    .limit(1)

  if (!dailyTemplate) {
    return
  }

  const dailyVersion = await ensureDailyActivityTemplateVersion(dailyTemplate.id)
  await ensureDailyActivityTemplateFields(dailyVersion.id)
  await ensureDailyActivityWorkflowSeed()

  // Optimize: Only sync activities that haven't been synced yet
  const activityRows = await db
    .select({ id: activities.id })
    .from(activities)
    .leftJoin(formSubmissions, eq(activities.id, formSubmissions.legacyActivityId))
    .where(isNull(formSubmissions.id))
    
  for (const activity of activityRows) {
    await syncActivityWorkflowArtifacts(activity.id, undefined, { skipPush: true })
  }
}

export async function syncActivityWorkflowArtifacts(
  activityId: number,
  supplementalPayload?: ActivitySupplementalPayload,
  options?: { skipPush?: boolean }
) {
  const [activity] = await db
    .select({
      id: activities.id,
      siteId: activities.siteId,
      employeeId: activities.employeeId,
      activityCode: activities.activityCode,
      activityType: activities.activityType,
      title: activities.title,
      unitNumber: activities.unitNumber,
      startTime: activities.startTime,
      endTime: activities.endTime,
      status: activities.status,
      priority: activities.priority,
      remarks: activities.remarks,
      createdAt: activities.createdAt,
      requesterName: employees.name,
      requesterEmail: employees.email,
      requesterDepartment: employees.department,
      requesterSection: employees.section,
      requesterJobTitle: employees.jobTitle,
      siteName: sites.name,
    })
    .from(activities)
    .innerJoin(employees, eq(activities.employeeId, employees.id))
    .innerJoin(sites, eq(activities.siteId, sites.id))
    .where(eq(activities.id, activityId))
    .limit(1)

  if (!activity) {
    return null
  }

  const [template] = await db
    .select()
    .from(formTemplates)
    .where(eq(formTemplates.templateKey, DAILY_ACTIVITY_TEMPLATE_KEY))
    .limit(1)

  if (!template) {
    return null
  }

  const [templateVersion] = await db
    .select()
    .from(formTemplateVersions)
    .where(eq(formTemplateVersions.templateId, template.id))
    .orderBy(desc(formTemplateVersions.versionNumber))
    .limit(1)

  if (!templateVersion) {
    return null
  }

  const approvalRows = await db
    .select({
      id: approvals.id,
      level: approvals.level,
      approverName: approvals.approverName,
      approverEmployeeId: approvals.approverEmployeeId,
      approvalStepId: approvals.approvalStepId,
      status: approvals.status,
      submittedAt: approvals.submittedAt,
      reviewedAt: approvals.reviewedAt,
      overtimeMinutes: approvals.overtimeMinutes,
      resolutionSource: approvals.resolutionSource,
      routeSnapshot: approvals.routeSnapshot,
      decisionNote: approvals.decisionNote,
    })
    .from(approvals)
    .where(eq(approvals.activityId, activityId))
    .orderBy(asc(approvals.level), asc(approvals.id))

  const [existingSubmission] = await db
    .select()
    .from(formSubmissions)
    .where(eq(formSubmissions.legacyActivityId, activityId))
    .limit(1)

  const existingPayload = parseJsonObject<ActivitySupplementalPayload>(
    existingSubmission?.payloadSnapshot ?? '',
    {}
  )
  const mergedPayload = {
    ...existingPayload,
    ...supplementalPayload,
  }
  const totalOvertimeMinutes = approvalRows[0]?.overtimeMinutes ?? 0

  const payloadSnapshot = {
    employeeId: `${activity.employeeId}`,
    title: activity.title,
    titleDetails: activity.title,
    activityCode: activity.activityCode,
    activityType: activity.activityType,
    workDate: activity.startTime.toISOString().slice(0, 10),
    shift: mergedPayload.shift ?? inferDefaultShift(activity.startTime),
    siteName: activity.siteName,
    department: mergedPayload.department ?? activity.requesterDepartment,
    section: mergedPayload.section ?? activity.requesterSection,
    unitNumber: activity.unitNumber,
    startTime: activity.startTime.toISOString(),
    endTime: activity.endTime.toISOString(),
    priority: activity.priority,
    overtimeMinutes: `${totalOvertimeMinutes}`,
    remarks: activity.remarks,
    riskCategory: mergedPayload.riskCategory ?? '',
    referenceCode: mergedPayload.referenceCode ?? '',
    manpowerInvolved: mergedPayload.manpowerInvolved ?? '',
    checklistCompletion: mergedPayload.checklistCompletion ?? [],
    photoAttachmentUrl: mergedPayload.photoAttachmentUrl ?? '',
    documentAttachmentUrl: mergedPayload.documentAttachmentUrl ?? '',
    signatureName: mergedPayload.signatureName ?? activity.requesterName,
    latitude: mergedPayload.latitude ?? '',
    longitude: mergedPayload.longitude ?? '',
    additionalWatchers: mergedPayload.additionalWatchers ?? [],
  }

  const previewSnapshot = {
    ...payloadSnapshot,
    calculatedDuration: `${Math.max(
      0,
      Math.round((activity.endTime.getTime() - activity.startTime.getTime()) / 60000)
    )} menit`,
    overtimeMinutes: `${totalOvertimeMinutes}`,
  }

  const requestStatus = getRequestStatus(activity.status)
  const pushDispatchQueue: PushDispatchInput[] = []
  const emailDispatchQueue: Array<{
    notificationEventId: number
    recipient: string
    updateEventStatus: boolean
    request: Parameters<typeof sendWorkflowEmail>[0]
  }> = []
  const routeSnapshot = approvalRows.find((row) => row.routeSnapshot.trim())?.routeSnapshot ?? ''

  const [submission] = existingSubmission
    ? await db
        .update(formSubmissions)
        .set({
          templateId: template.id,
          templateVersionId: templateVersion.id,
          requesterEmployeeId: activity.employeeId,
          siteId: activity.siteId,
          requestNumber:
            existingSubmission.requestNumber || buildRequestNumber(activityId, activity.createdAt),
          requestStatus,
          workflowSnapshot: routeSnapshot,
          payloadSnapshot: JSON.stringify(payloadSnapshot),
          previewSnapshot: JSON.stringify(previewSnapshot),
          submittedAt: activity.createdAt,
          completedAt:
            requestStatus === 'approved' || requestStatus === 'rejected' ? new Date() : null,
          cancelledAt: requestStatus === 'cancelled' ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(formSubmissions.id, existingSubmission.id))
        .returning()
    : await db
        .insert(formSubmissions)
        .values({
          templateId: template.id,
          templateVersionId: templateVersion.id,
          requesterEmployeeId: activity.employeeId,
          siteId: activity.siteId,
          legacyActivityId: activityId,
          requestNumber: buildRequestNumber(activityId, activity.createdAt),
          requestStatus,
          workflowSnapshot: routeSnapshot,
          payloadSnapshot: JSON.stringify(payloadSnapshot),
          previewSnapshot: JSON.stringify(previewSnapshot),
          submittedAt: activity.createdAt,
        })
        .returning()

  if (!submission) {
    return null
  }

  await db.transaction(async (tx) => {
    await tx
      .update(approvals)
      .set({
        submissionId: submission.id,
      })
      .where(eq(approvals.activityId, activityId))

    const approvalIds = approvalRows.map((row) => row.id)
    const existingInboxNotificationEventIds = (
      await tx
        .select({ id: notificationEvents.id })
        .from(notificationEvents)
        .where(
          and(
            eq(notificationEvents.submissionId, submission.id),
            isNotNull(notificationEvents.inboxItemId)
          )
        )
    ).map((row) => row.id)
    const existingInboxIds = (
      await tx
        .select({ id: inboxItems.id })
        .from(inboxItems)
        .where(eq(inboxItems.submissionId, submission.id))
    ).map((row) => row.id)

    await tx
      .delete(formSubmissionValues)
      .where(eq(formSubmissionValues.submissionId, submission.id))
    await tx
      .delete(approvalRequestActors)
      .where(eq(approvalRequestActors.submissionId, submission.id))
    if (approvalIds.length > 0) {
      await tx.delete(approvalComments).where(inArray(approvalComments.approvalId, approvalIds))
    }
    await tx.delete(inboxItems).where(eq(inboxItems.submissionId, submission.id))
    if (existingInboxNotificationEventIds.length > 0) {
      await tx
        .delete(notificationDeliveries)
        .where(inArray(notificationDeliveries.notificationEventId, existingInboxNotificationEventIds))
    }
    if (existingInboxNotificationEventIds.length > 0) {
      await tx.delete(notificationEvents).where(inArray(notificationEvents.id, existingInboxNotificationEventIds))
    }
    if (existingInboxIds.length > 0) {
      await tx.delete(reminderJobs).where(inArray(reminderJobs.inboxItemId, existingInboxIds))
    }
    await tx
      .delete(requestStatusHistories)
      .where(eq(requestStatusHistories.submissionId, submission.id))
    await tx
      .delete(stepDecisionHistories)
      .where(eq(stepDecisionHistories.submissionId, submission.id))
    await tx.delete(approvalAttachments).where(eq(approvalAttachments.submissionId, submission.id))

    const fields = await tx
      .select({
        id: formTemplateFields.id,
        fieldKey: formTemplateFields.fieldKey,
        fieldType: formTemplateFields.fieldType,
      })
      .from(formTemplateFields)
      .where(eq(formTemplateFields.versionId, templateVersion.id))
      .orderBy(asc(formTemplateFields.sortOrder))

    const valueMap = new Map<string, string>(
      Object.entries(payloadSnapshot).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(', ') : `${value ?? ''}`,
      ])
    )

    if (fields.length > 0) {
      await tx.insert(formSubmissionValues).values(
        fields.map((field) => ({
          submissionId: submission.id,
          fieldKey: field.fieldKey,
          fieldType: field.fieldType,
          valueText: valueMap.get(field.fieldKey) ?? '',
          displayValue: valueMap.get(field.fieldKey) ?? '',
        }))
      )
    }

    const historyRows = [
      {
        submissionId: submission.id,
        approvalId: null,
        actorEmployeeId: activity.employeeId,
        fromStatus: '',
        toStatus: 'submitted',
        note: 'Request dibuat oleh requester.',
      },
      ...approvalRows
        .filter((row) => row.reviewedAt != null)
        .map((row) => ({
          submissionId: submission.id,
          approvalId: row.id,
          actorEmployeeId: row.approverEmployeeId,
          fromStatus: 'pending',
          toStatus: normalizeStatus(row.status),
          note: `Step ${row.level} diputuskan oleh ${row.approverName}.`,
        })),
      {
        submissionId: submission.id,
        approvalId: null,
        actorEmployeeId: activity.employeeId,
        fromStatus: 'submitted',
        toStatus: requestStatus,
        note: `Request saat ini berada pada status ${requestStatus}.`,
      },
    ]

    await tx.insert(requestStatusHistories).values(historyRows)

    const attachmentsToInsert = [
      payloadSnapshot.photoAttachmentUrl
        ? {
            submissionId: submission.id,
            approvalId: approvalRows[0]?.id ?? null,
            attachmentKind: 'image',
            fileName: 'activity-photo',
            mimeType: 'image/jpeg',
            fileUrl: payloadSnapshot.photoAttachmentUrl,
            uploadedByEmployeeId: activity.employeeId,
          }
        : null,
      payloadSnapshot.documentAttachmentUrl
        ? {
            submissionId: submission.id,
            approvalId: approvalRows[0]?.id ?? null,
            attachmentKind: 'file',
            fileName: 'activity-document',
            mimeType: 'application/pdf',
            fileUrl: payloadSnapshot.documentAttachmentUrl,
            uploadedByEmployeeId: activity.employeeId,
          }
        : null,
      !payloadSnapshot.photoAttachmentUrl && activity.remarks.toLowerCase().includes('foto')
        ? {
            submissionId: submission.id,
            approvalId: approvalRows[0]?.id ?? null,
            attachmentKind: 'image',
            fileName: 'seeded-activity-photo',
            mimeType: 'image/jpeg',
            fileUrl: '/ChitraParatama_Stationery_Letterhead_jkt.jpg',
            uploadedByEmployeeId: activity.employeeId,
          }
        : null,
    ].filter((value): value is NonNullable<typeof value> => value != null)

    if (attachmentsToInsert.length > 0) {
      await tx.insert(approvalAttachments).values(attachmentsToInsert)
    }

    const groupedByLevel = new Map<number, typeof approvalRows>()
    for (const approval of approvalRows) {
      const existing = groupedByLevel.get(approval.level) ?? []
      existing.push(approval)
      groupedByLevel.set(approval.level, existing)
    }

    for (const group of groupedByLevel.values()) {
      for (const approval of group) {
        const routeSnapshotValue = approval.routeSnapshot.trim()
        const parsedRoute = routeSnapshotValue
          ? (JSON.parse(routeSnapshotValue) as {
              steps?: Array<{
                stepOrder: number
                approvalMatrixStepId: number | null
                slaHours: number
                approvalMode?: string
              }>
            })
          : null
        const matchedStep =
          parsedRoute?.steps?.find(
            (step) =>
              step.stepOrder === approval.level &&
              (approval.approvalStepId == null ||
                step.approvalMatrixStepId === approval.approvalStepId)
          ) ?? null
        const approvalMode = matchedStep?.approvalMode ?? 'sequential'
        const dueAt = getDueAt(approval.submittedAt, matchedStep?.slaHours ?? 24)

        await tx.insert(approvalRequestActors).values({
          submissionId: submission.id,
          approvalId: approval.id,
          actorEmployeeId: approval.approverEmployeeId,
          actorRole: approval.approverName,
          assignmentType: normalizeStatus(approval.resolutionSource).includes('delegate')
            ? 'delegate'
            : 'primary',
          status: normalizeStatus(approval.status),
          dueAt,
          actedAt: approval.reviewedAt ?? null,
        })

        const noteEntries = parseApprovalNoteEntries(approval.decisionNote, approval.approverName)
        if (noteEntries.length > 0) {
          await tx.insert(approvalComments).values(
            noteEntries.map((entry) => ({
              approvalId: approval.id,
              actorEmployeeId: approval.approverEmployeeId,
              commentKind: entry.kind,
              message: entry.message,
              isInternal: false,
              createdAt: entry.at
                ? new Date(entry.at)
                : (approval.reviewedAt ?? approval.submittedAt),
            }))
          )
        }

        if (approval.reviewedAt) {
          await tx.insert(stepDecisionHistories).values({
            submissionId: submission.id,
            approvalId: approval.id,
            actorEmployeeId: approval.approverEmployeeId,
            decision: normalizeStatus(approval.status),
            decisionNote: noteEntries.map((entry) => entry.message).join(' | '),
            decidedAt: approval.reviewedAt,
          })
        }

        if (normalizeStatus(approval.status) === 'pending') {
          const [approverRecipientProfile] =
            approval.approverEmployeeId == null
              ? []
              : await tx
                  .select({
                    email: employees.email,
                    name: employees.name,
                  })
                  .from(employees)
                  .where(eq(employees.id, approval.approverEmployeeId))
                  .limit(1)
          const [createdInboxItem] = await tx
            .insert(inboxItems)
            .values({
              submissionId: submission.id,
              approvalId: approval.id,
              assigneeEmployeeId: approval.approverEmployeeId,
              inboxType:
                normalizeStatus(approval.resolutionSource) === 'delegate'
                  ? 'delegation'
                  : normalizeStatus(approval.resolutionSource) === 'escalation'
                    ? 'escalation'
                    : 'approval',
              status: 'pending',
              dueAt,
            })
            .returning()

          const recipient =
            approverRecipientProfile?.email ||
            approverRecipientProfile?.name ||
            approval.approverName
          const [assignedEvent] = await tx
            .insert(notificationEvents)
            .values({
              submissionId: submission.id,
              inboxItemId: createdInboxItem.id,
              approvalId: approval.id,
              channel: 'in_app',
              eventType: 'step_assigned',
              recipient,
              payloadSnapshot: JSON.stringify({
                requestNumber: submission.requestNumber,
                activityTitle: activity.title,
                dueAt: dueAt.toISOString(),
                approvalMode,
              }),
              deliveryStatus: 'delivered',
              deliveredAt: new Date(),
            })
            .returning()

          await tx.insert(notificationDeliveries).values([
            {
              notificationEventId: assignedEvent.id,
              deliveryChannel: 'in_app',
              recipient,
              status: 'delivered',
              sentAt: new Date(),
            },
            {
              notificationEventId: assignedEvent.id,
              deliveryChannel: 'email',
              recipient,
              status: 'queued',
              sentAt: null,
            },
          ])

          if (approverRecipientProfile?.email) {
            const approvalEmail = buildWorkflowEmailContent({
              title: `Approval request ${submission.requestNumber}`,
              greeting: `Halo ${approverRecipientProfile.name || approval.approverName},`,
              intro: `${activity.title} menunggu review Anda di inbox approval HERO.`,
              details: [
                `Request: ${submission.requestNumber}`,
                `Aktivitas: ${activity.title}`,
                `Mode approval: ${approvalMode}`,
                `Due: ${dueAt.toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}`,
              ],
              ctaLabel: 'Buka Inbox Approval',
              ctaUrl: getAppUrl('/dashboard/approval'),
            })

            emailDispatchQueue.push({
              notificationEventId: assignedEvent.id,
              recipient: approverRecipientProfile.email,
              updateEventStatus: false,
              request: {
                to: approverRecipientProfile.email,
                templateCode: 'approval_assignment',
                templateName: 'Approval Assignment',
                variables: {
                  requestId: submission.requestNumber,
                  requestNumber: submission.requestNumber,
                  activityTitle: activity.title,
                  dueAt,
                  approvalMode,
                },
                fallbackSubject: `Approval request ${submission.requestNumber}`,
                fallbackHtml: approvalEmail.html,
                fallbackText: approvalEmail.text,
              },
            })
          }

          if (approval.approverEmployeeId) {
            pushDispatchQueue.push({
              employeeId: approval.approverEmployeeId,
              category: 'approval_requests',
              title: `Approval request ${submission.requestNumber}`,
              body: `${activity.title} menunggu review sebelum ${dueAt.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}.`,
              url: '/mobile/notifications',
              tag: `approval-${createdInboxItem.id}`,
              notificationEventId: assignedEvent.id,
              metadata: {
                inboxItemId: createdInboxItem.id,
                requestNumber: submission.requestNumber,
              },
            })
          }

          await tx.insert(reminderJobs).values([
            {
              inboxItemId: createdInboxItem.id,
              reminderType: 'before_due',
              reminderAt: new Date(dueAt.getTime() - 2 * 60 * 60 * 1000),
              status: 'scheduled',
              executionLog: 'Auto-generated from SLA rule',
            },
            {
              inboxItemId: createdInboxItem.id,
              reminderType: 'overdue',
              reminderAt: dueAt,
              status: 'scheduled',
              executionLog: 'Auto-generated from SLA rule',
            },
          ])
        } else {
          const [existingDecisionEvent] = await tx
            .select({ id: notificationEvents.id })
            .from(notificationEvents)
            .where(
              and(
                eq(notificationEvents.submissionId, submission.id),
                eq(notificationEvents.approvalId, approval.id),
                eq(notificationEvents.eventType, 'step_decision')
              )
            )
            .limit(1)

          if (!existingDecisionEvent) {
            const [decisionEvent] = await tx
              .insert(notificationEvents)
              .values({
                submissionId: submission.id,
                approvalId: approval.id,
                channel: 'in_app',
                eventType: 'step_decision',
                recipient: activity.requesterEmail || activity.requesterName,
                payloadSnapshot: JSON.stringify({
                  requestNumber: submission.requestNumber,
                  activityTitle: activity.title,
                  decision: normalizeStatus(approval.status),
                }),
                deliveryStatus: 'delivered',
                deliveredAt: approval.reviewedAt ?? new Date(),
              })
              .returning()

            await tx.insert(notificationDeliveries).values([
              {
                notificationEventId: decisionEvent.id,
                deliveryChannel: 'in_app',
                recipient: activity.requesterEmail || activity.requesterName,
                status: 'delivered',
                sentAt: approval.reviewedAt ?? new Date(),
              },
              {
                notificationEventId: decisionEvent.id,
                deliveryChannel: 'email',
                recipient: activity.requesterEmail,
                status: 'queued',
                sentAt: null,
              },
            ])

            if (activity.requesterEmail) {
              const decisionLabel = normalizeStatus(approval.status) === 'approved' ? 'disetujui' : 'ditolak'
              const decisionEmail = buildWorkflowEmailContent({
                title: `Request ${submission.requestNumber} ${decisionLabel}`,
                greeting: `Halo ${activity.requesterName},`,
                intro: `${activity.title} telah ${decisionLabel} oleh approver.`,
                details: [
                  `Request: ${submission.requestNumber}`,
                  `Aktivitas: ${activity.title}`,
                  `Status: ${approval.status}`,
                ],
                ctaLabel: 'Buka Approval Center',
                ctaUrl: getAppUrl('/dashboard/approval'),
              })

              emailDispatchQueue.push({
                notificationEventId: decisionEvent.id,
                recipient: activity.requesterEmail,
                updateEventStatus: false,
                request: {
                  to: activity.requesterEmail,
                  fallbackSubject: `Request ${submission.requestNumber} ${decisionLabel}`,
                  fallbackHtml: decisionEmail.html,
                  fallbackText: decisionEmail.text,
                },
              })
            }
          }
        }
      }

      const groupMode = normalizeStatus(
        group[0]?.routeSnapshot
          ? ((
              JSON.parse(group[0].routeSnapshot) as {
                steps?: Array<{
                  stepOrder: number
                  approvalMode?: string
                  approvalMatrixStepId: number | null
                }>
              }
            ).steps?.find(
              (step) =>
                step.stepOrder === group[0].level &&
                (group[0].approvalStepId == null ||
                  step.approvalMatrixStepId === group[0].approvalStepId)
            )?.approvalMode ?? 'sequential')
          : 'sequential'
      )

      const groupStatus = getApprovalModeGroupStatus(
        group.map((item) => item.status),
        groupMode
      )

      const groupEventType =
        groupMode === 'parallel_any' || groupMode === 'any_one'
          ? 'parallel_any_status'
          : 'approval_group_status'
      const groupApprovalId = group[0]?.id ?? null
      const [existingGroupEvent] = groupApprovalId
        ? await tx
            .select({ id: notificationEvents.id })
            .from(notificationEvents)
            .where(
              and(
                eq(notificationEvents.submissionId, submission.id),
                eq(notificationEvents.approvalId, groupApprovalId),
                eq(notificationEvents.eventType, groupEventType)
              )
            )
            .limit(1)
        : []

      if (!existingGroupEvent) {
        const [groupEvent] = await tx
          .insert(notificationEvents)
          .values({
            submissionId: submission.id,
            approvalId: groupApprovalId,
            channel: 'in_app',
            eventType: groupEventType,
            recipient: activity.requesterEmail || activity.requesterName,
            payloadSnapshot: JSON.stringify({
              stepLevel: group[0]?.level ?? 0,
              mode: groupMode,
              groupStatus,
            }),
            deliveryStatus: 'delivered',
            deliveredAt: new Date(),
          })
          .returning()

        await tx.insert(notificationDeliveries).values({
          notificationEventId: groupEvent.id,
          deliveryChannel: 'in_app',
          recipient: activity.requesterEmail || activity.requesterName,
          status: 'delivered',
          sentAt: new Date(),
        })
      }
    }
  })

  if (pushDispatchQueue.length > 0 && !options?.skipPush) {
    await Promise.allSettled(pushDispatchQueue.map((job) => sendPushNotification(job)))
  }

  if (emailDispatchQueue.length > 0) {
    await Promise.all(
      emailDispatchQueue.map(async (job) => {
        try {
          const result = await sendWorkflowEmail(job.request)
          const sentAt = result.status === 'sent' ? new Date() : null
          const deliveryStatus = result.status === 'sent' ? 'sent' : 'skipped'
          const errorMessage = result.status === 'sent' ? null : result.reason

          await db
            .update(notificationDeliveries)
            .set({
              status: deliveryStatus,
              sentAt,
              errorMessage,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(notificationDeliveries.notificationEventId, job.notificationEventId),
                eq(notificationDeliveries.deliveryChannel, 'email'),
                eq(notificationDeliveries.recipient, job.recipient)
              )
            )

          if (job.updateEventStatus) {
            await db
              .update(notificationEvents)
              .set({
                deliveryStatus: result.status === 'sent' ? 'delivered' : 'skipped',
                deliveredAt: sentAt,
              })
              .where(eq(notificationEvents.id, job.notificationEventId))
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send approval email.'

          await db
            .update(notificationDeliveries)
            .set({
              status: 'failed',
              sentAt: null,
              errorMessage,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(notificationDeliveries.notificationEventId, job.notificationEventId),
                eq(notificationDeliveries.deliveryChannel, 'email'),
                eq(notificationDeliveries.recipient, job.recipient)
              )
            )

          if (job.updateEventStatus) {
            await db
              .update(notificationEvents)
              .set({
                deliveryStatus: 'failed',
                deliveredAt: null,
              })
              .where(eq(notificationEvents.id, job.notificationEventId))
          }
        }
      })
    )
  }

  return submission
}

export async function saveActivityDraftSubmission(input: {
  employeeId: number
  activityCode: string
  activityType: string
  title: string
  unitNumber: string
  startTime: string
  endTime: string
  priority: string
  overtimeMinutes: number
  remarks: string
  supplementalPayload?: ActivitySupplementalPayload
}) {
  const [template] = await db
    .select()
    .from(formTemplates)
    .where(eq(formTemplates.templateKey, DAILY_ACTIVITY_TEMPLATE_KEY))
    .limit(1)

  if (!template) {
    return null
  }

  const [version] = await db
    .select()
    .from(formTemplateVersions)
    .where(eq(formTemplateVersions.templateId, template.id))
    .orderBy(desc(formTemplateVersions.versionNumber))
    .limit(1)

  if (!version) {
    return null
  }

  const [employee] = await db
    .select({
      id: employees.id,
      siteId: employees.siteId,
      name: employees.name,
    })
    .from(employees)
    .where(eq(employees.id, input.employeeId))
    .limit(1)

  if (!employee) {
    return null
  }

  const snapshot = {
    employeeId: `${input.employeeId}`,
    activityCode: input.activityCode,
    activityType: input.activityType,
    title: input.title,
    unitNumber: input.unitNumber,
    startTime: input.startTime,
    endTime: input.endTime,
    priority: input.priority,
    overtimeMinutes: `${input.overtimeMinutes}`,
    remarks: input.remarks,
    ...input.supplementalPayload,
  }

  const [draft] = await db
    .insert(formSubmissions)
    .values({
      templateId: template.id,
      templateVersionId: version.id,
      requesterEmployeeId: employee.id,
      siteId: employee.siteId,
      requestNumber: `DRAFT-${Date.now()}`,
      requestStatus: 'draft',
      workflowSnapshot: JSON.stringify({ workflowKey: DAILY_ACTIVITY_WORKFLOW_KEY }),
      payloadSnapshot: JSON.stringify(snapshot),
      previewSnapshot: JSON.stringify(snapshot),
    })
    .returning()

  return draft
}

export async function cancelFormSubmissionDraft(submissionId: number) {
  const [submission] = await db
    .update(formSubmissions)
    .set({
      requestStatus: 'cancelled',
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(formSubmissions.id, submissionId))
    .returning()

  return submission ?? null
}

export async function createFormTemplateSection(input: {
  versionId: number
  label: string
  description?: string
  isCollapsible?: boolean
}) {
  const sectionKey = slugifyKey(input.label, `section_${Date.now()}`)
  const [latestSection] = await db
    .select({ sortOrder: formTemplateSections.sortOrder })
    .from(formTemplateSections)
    .where(eq(formTemplateSections.versionId, input.versionId))
    .orderBy(desc(formTemplateSections.sortOrder))
    .limit(1)

  const [section] = await db
    .insert(formTemplateSections)
    .values({
      versionId: input.versionId,
      sectionKey,
      label: input.label,
      description: input.description ?? '',
      sortOrder: (latestSection?.sortOrder ?? 0) + 1,
      isCollapsible: input.isCollapsible ?? false,
    })
    .returning()

  return section
}

export async function createFormTemplateField(input: {
  versionId: number
  sectionId: number | null
  label: string
  fieldKey?: string
  fieldType: string
  placeholder?: string
  helpText?: string
  defaultValue?: string
  isRequired?: boolean
  optionLines?: string
  validationRuleType?: string
  validationOperator?: string
  validationValue?: string
  validationMessage?: string
  allowedMimeTypes?: string
  maxSizeMb?: number
}) {
  const fieldKey = slugifyKey(input.fieldKey || input.label, `field_${Date.now()}`)
  const [latestField] = await db
    .select({ sortOrder: formTemplateFields.sortOrder })
    .from(formTemplateFields)
    .where(eq(formTemplateFields.versionId, input.versionId))
    .orderBy(desc(formTemplateFields.sortOrder))
    .limit(1)
  const isAttachmentField = input.fieldType === 'file_upload' || input.fieldType === 'image_upload'
  const configJson = isAttachmentField
    ? JSON.stringify({
        attachmentRule: {
          allowedMimeTypes: input.allowedMimeTypes ?? '',
          maxSizeMb: input.maxSizeMb ?? 10,
        },
      })
    : ''
  const validationJson = JSON.stringify({
    required: input.isRequired ?? false,
    attachmentRequired: isAttachmentField ? (input.isRequired ?? false) : undefined,
  })

  const [field] = await db
    .insert(formTemplateFields)
    .values({
      versionId: input.versionId,
      sectionId: input.sectionId,
      fieldKey,
      fieldType: input.fieldType,
      label: input.label,
      placeholder: input.placeholder ?? '',
      helpText: input.helpText ?? '',
      defaultValue: input.defaultValue ?? '',
      configJson,
      validationJson,
      optionSourceJson: '',
      isRequired: input.isRequired ?? false,
      isHidden: false,
      sortOrder: (latestField?.sortOrder ?? 0) + 1,
    })
    .returning()

  const options = parseOptionLines(input.optionLines ?? '')
  if (options.length > 0) {
    await db.insert(formFieldOptions).values(
      options.map((option) => ({
        fieldId: field.id,
        optionValue: option.optionValue,
        optionLabel: option.optionLabel,
        sortOrder: option.sortOrder,
        isDefault: option.sortOrder === 1,
      }))
    )
  }

  const validationRows = [
    input.validationRuleType
      ? {
          fieldId: field.id,
          ruleType: input.validationRuleType,
          operator: input.validationOperator || '=',
          ruleValue: input.validationValue ?? '',
          errorMessage: input.validationMessage || `${input.label} tidak memenuhi validasi.`,
          sortOrder: 1,
        }
      : null,
    isAttachmentField
      ? {
          fieldId: field.id,
          ruleType: 'attachment_rule',
          operator: input.isRequired ? 'is_not_empty' : 'contains',
          ruleValue: input.allowedMimeTypes || (input.fieldType === 'image_upload' ? 'image/' : ''),
          errorMessage:
            input.validationMessage || `${input.label} harus memenuhi aturan attachment.`,
          sortOrder: 2,
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row != null)

  if (validationRows.length > 0) {
    await db.insert(formValidationRules).values(validationRows)
  }

  return field
}

export async function saveFormTemplateLayout(input: {
  versionId: number
  sections: Array<{ id: number; sortOrder: number }>
  fields: Array<{ id: number; sectionId: number | null; sortOrder: number }>
}) {
  await db.transaction(async (tx) => {
    for (const section of input.sections) {
      await tx
        .update(formTemplateSections)
        .set({ sortOrder: section.sortOrder, updatedAt: new Date() })
        .where(
          and(
            eq(formTemplateSections.id, section.id),
            eq(formTemplateSections.versionId, input.versionId)
          )
        )
    }

    for (const field of input.fields) {
      await tx
        .update(formTemplateFields)
        .set({
          sectionId: field.sectionId,
          sortOrder: field.sortOrder,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(formTemplateFields.id, field.id),
            eq(formTemplateFields.versionId, input.versionId)
          )
        )
    }
  })
}

export async function publishFormTemplateVersion(versionId: number) {
  const [version] = await db
    .select()
    .from(formTemplateVersions)
    .where(eq(formTemplateVersions.id, versionId))
    .limit(1)

  if (!version) {
    return null
  }

  await db
    .update(formTemplateVersions)
    .set({ publishStatus: 'archived', effectiveTo: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(formTemplateVersions.templateId, version.templateId),
        eq(formTemplateVersions.publishStatus, 'published')
      )
    )

  const [published] = await db
    .update(formTemplateVersions)
    .set({
      publishStatus: 'published',
      effectiveFrom: new Date(),
      effectiveTo: null,
      updatedAt: new Date(),
    })
    .where(eq(formTemplateVersions.id, versionId))
    .returning()

  return published ?? null
}

export async function cloneFormTemplateVersion(versionId: number) {
  const [sourceVersion] = await db
    .select()
    .from(formTemplateVersions)
    .where(eq(formTemplateVersions.id, versionId))
    .limit(1)

  if (!sourceVersion) {
    return null
  }

  const [latestVersion] = await db
    .select({ versionNumber: formTemplateVersions.versionNumber })
    .from(formTemplateVersions)
    .where(eq(formTemplateVersions.templateId, sourceVersion.templateId))
    .orderBy(desc(formTemplateVersions.versionNumber))
    .limit(1)

  return db.transaction(async (tx) => {
    const [createdVersion] = await tx
      .insert(formTemplateVersions)
      .values({
        templateId: sourceVersion.templateId,
        versionNumber: (latestVersion?.versionNumber ?? sourceVersion.versionNumber) + 1,
        publishStatus: 'draft',
        workflowSnapshot: sourceVersion.workflowSnapshot,
        schemaSnapshot: sourceVersion.schemaSnapshot,
        effectiveFrom: null,
        effectiveTo: null,
        createdByEmployeeId: sourceVersion.createdByEmployeeId,
      })
      .returning()

    const sourceSections = await tx
      .select()
      .from(formTemplateSections)
      .where(eq(formTemplateSections.versionId, sourceVersion.id))
      .orderBy(asc(formTemplateSections.sortOrder))
    const sourceFields = await tx
      .select()
      .from(formTemplateFields)
      .where(eq(formTemplateFields.versionId, sourceVersion.id))
      .orderBy(asc(formTemplateFields.sortOrder))
    const sourceFieldIds = sourceFields.map((field) => field.id)
    const [sourceOptions, sourceValidations] =
      sourceFieldIds.length === 0
        ? [[], []]
        : await Promise.all([
            tx
              .select()
              .from(formFieldOptions)
              .where(inArray(formFieldOptions.fieldId, sourceFieldIds)),
            tx
              .select()
              .from(formValidationRules)
              .where(inArray(formValidationRules.fieldId, sourceFieldIds)),
          ])

    const sectionIdMap = new Map<number, number>()
    for (const section of sourceSections) {
      const [createdSection] = await tx
        .insert(formTemplateSections)
        .values({
          versionId: createdVersion.id,
          sectionKey: section.sectionKey,
          label: section.label,
          description: section.description,
          sortOrder: section.sortOrder,
          isCollapsible: section.isCollapsible,
        })
        .returning()
      sectionIdMap.set(section.id, createdSection.id)
    }

    const fieldIdMap = new Map<number, number>()
    for (const field of sourceFields) {
      const [createdField] = await tx
        .insert(formTemplateFields)
        .values({
          versionId: createdVersion.id,
          sectionId: field.sectionId == null ? null : (sectionIdMap.get(field.sectionId) ?? null),
          fieldKey: field.fieldKey,
          fieldType: field.fieldType,
          label: field.label,
          placeholder: field.placeholder,
          helpText: field.helpText,
          defaultValue: field.defaultValue,
          configJson: field.configJson,
          validationJson: field.validationJson,
          optionSourceJson: field.optionSourceJson,
          isRequired: field.isRequired,
          isHidden: field.isHidden,
          sortOrder: field.sortOrder,
        })
        .returning()
      fieldIdMap.set(field.id, createdField.id)
    }

    const clonedOptions = sourceOptions.flatMap((option) => {
      const fieldId = fieldIdMap.get(option.fieldId)
      return fieldId == null
        ? []
        : [
            {
              fieldId,
              optionValue: option.optionValue,
              optionLabel: option.optionLabel,
              sortOrder: option.sortOrder,
              isDefault: option.isDefault,
            },
          ]
    })
    const clonedValidations = sourceValidations.flatMap((rule) => {
      const fieldId = fieldIdMap.get(rule.fieldId)
      return fieldId == null
        ? []
        : [
            {
              fieldId,
              ruleType: rule.ruleType,
              operator: rule.operator,
              ruleValue: rule.ruleValue,
              errorMessage: rule.errorMessage,
              sortOrder: rule.sortOrder,
            },
          ]
    })

    if (clonedOptions.length > 0) {
      await tx.insert(formFieldOptions).values(clonedOptions)
    }

    if (clonedValidations.length > 0) {
      await tx.insert(formValidationRules).values(clonedValidations)
    }

    return createdVersion
  })
}

export async function createWorkflowCondition(input: {
  workflowVersionId: number
  parentConditionId?: number | null
  fieldKey: string
  operator: string
  compareValue?: string
  logicalJoin?: string
  groupLabel?: string
}) {
  const [latestCondition] = await db
    .select({ sortOrder: workflowConditions.sortOrder })
    .from(workflowConditions)
    .where(eq(workflowConditions.workflowVersionId, input.workflowVersionId))
    .orderBy(desc(workflowConditions.sortOrder))
    .limit(1)

  const [condition] = await db
    .insert(workflowConditions)
    .values({
      workflowVersionId: input.workflowVersionId,
      parentConditionId: input.parentConditionId ?? null,
      fieldKey: input.fieldKey,
      operator: input.operator,
      compareValue: input.compareValue ?? '',
      logicalJoin: input.logicalJoin ?? 'AND',
      groupLabel: input.groupLabel ?? 'Custom Condition Group',
      sortOrder: (latestCondition?.sortOrder ?? 0) + 1,
    })
    .returning()

  return condition
}

export function evaluateWorkflowConditionGroups(
  values: Record<string, unknown>,
  conditions: Array<{
    id: number
    parentConditionId: number | null
    fieldKey: string
    operator: string
    compareValue: string
    logicalJoin: string
    groupLabel: string
  }>
) {
  const groups = conditions.reduce<Record<string, typeof conditions>>((accumulator, condition) => {
    const key = condition.groupLabel || 'Default Group'
    accumulator[key] = accumulator[key] ?? []
    accumulator[key].push(condition)
    return accumulator
  }, {})

  return Object.entries(groups).map(([groupLabel, groupConditions]) => {
    const outcomes = groupConditions.map((condition) => ({
      condition,
      passed: compareConditionValue(
        values[condition.fieldKey],
        condition.operator,
        condition.compareValue
      ),
    }))
    const joins = groupConditions.map((condition) => normalizeStatus(condition.logicalJoin))
    const passed =
      joins.includes('OR'.toLowerCase()) || joins.includes('or')
        ? outcomes.some((outcome) => outcome.passed)
        : outcomes.every((outcome) => outcome.passed)

    return {
      groupLabel,
      passed,
      outcomes,
    }
  })
}

export async function runApprovalAutomationTick(referenceDate = new Date()) {
  const executedReminderJobs = await db
    .select({
      id: reminderJobs.id,
      inboxItemId: reminderJobs.inboxItemId,
      reminderType: reminderJobs.reminderType,
      reminderAt: reminderJobs.reminderAt,
      inboxStatus: inboxItems.status,
      submissionId: inboxItems.submissionId,
      approvalId: inboxItems.approvalId,
      assigneeEmployeeId: inboxItems.assigneeEmployeeId,
      assigneeName: employees.name,
      assigneeEmail: employees.email,
      requestNumber: formSubmissions.requestNumber,
      requestStatus: formSubmissions.requestStatus,
    })
    .from(reminderJobs)
    .innerJoin(inboxItems, eq(reminderJobs.inboxItemId, inboxItems.id))
    .innerJoin(formSubmissions, eq(inboxItems.submissionId, formSubmissions.id))
    .leftJoin(employees, eq(inboxItems.assigneeEmployeeId, employees.id))
    .where(and(eq(reminderJobs.status, 'scheduled'), lte(reminderJobs.reminderAt, referenceDate)))

  let remindersExecuted = 0
  let expiredRequests = 0
  const pushDispatchQueue: PushDispatchInput[] = []
  const emailDispatchQueue: Array<{
    notificationEventId: number
    recipient: string
    updateEventStatus: boolean
    request: Parameters<typeof sendWorkflowEmail>[0]
  }> = []

  await db.transaction(async (tx) => {
    for (const job of executedReminderJobs) {
      if (job.inboxStatus !== 'pending' || job.requestStatus === 'expired') {
        await tx
          .update(reminderJobs)
          .set({
            status: 'skipped',
            executionLog: 'Skipped because inbox/request is no longer pending.',
            updatedAt: referenceDate,
          })
          .where(eq(reminderJobs.id, job.id))
        continue
      }

      const recipient = job.assigneeEmail?.trim().toLowerCase()
      if (!recipient) {
        await tx
          .update(reminderJobs)
          .set({
            status: 'skipped',
            executionLog: 'Skipped because assignee email is missing.',
            updatedAt: referenceDate,
          })
          .where(eq(reminderJobs.id, job.id))
        continue
      }

      const reminderTitle =
        job.reminderType === 'overdue'
          ? `Approval overdue ${job.requestNumber}`
          : `Approval reminder ${job.requestNumber}`
      const reminderBody =
        job.reminderType === 'overdue'
          ? 'Approval melewati SLA. Buka inbox untuk tindak lanjut.'
          : 'Approval mendekati SLA. Review sebelum jatuh tempo.'

      const [bellEvent] = await tx
        .insert(notificationEvents)
        .values({
          submissionId: job.submissionId,
          inboxItemId: job.inboxItemId,
          approvalId: job.approvalId,
          channel: 'in_app',
          eventType: `reminder_${job.reminderType}`,
          recipient,
          payloadSnapshot: JSON.stringify({
            title: reminderTitle,
            body: reminderBody,
            url: '/mobile/notifications',
            requestNumber: job.requestNumber,
            reminderAt: job.reminderAt.toISOString(),
            reminderType: job.reminderType,
          }),
          deliveryStatus: 'delivered',
          deliveredAt: referenceDate,
        })
        .returning()

      await tx.insert(notificationDeliveries).values({
        notificationEventId: bellEvent.id,
        deliveryChannel: 'in_app',
        recipient,
        status: 'delivered',
        sentAt: referenceDate,
      })

      if (job.reminderType !== 'overdue') {
        const [emailEvent] = await tx
          .insert(notificationEvents)
          .values({
            submissionId: job.submissionId,
            inboxItemId: job.inboxItemId,
            approvalId: job.approvalId,
            channel: 'email',
            eventType: `reminder_${job.reminderType}`,
            recipient,
            payloadSnapshot: JSON.stringify({
              title: reminderTitle,
              body: reminderBody,
              url: '/dashboard/approval',
              requestNumber: job.requestNumber,
              reminderAt: job.reminderAt.toISOString(),
              reminderType: job.reminderType,
            }),
            deliveryStatus: 'queued',
          })
          .returning()

        await tx.insert(notificationDeliveries).values({
          notificationEventId: emailEvent.id,
          deliveryChannel: 'email',
          recipient,
          status: 'queued',
        })

        const reminderEmail = buildWorkflowEmailContent({
          title: `Reminder approval ${job.requestNumber}`,
          greeting: `Halo ${job.assigneeName || 'Approver'},`,
          intro: 'Approval ini mendekati SLA dan perlu segera direview.',
          details: [
            `Request: ${job.requestNumber}`,
            `Reminder: ${job.reminderType}`,
            `Jatuh tempo: ${job.reminderAt.toLocaleString('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}`,
          ],
          ctaLabel: 'Buka Inbox Approval',
          ctaUrl: getAppUrl('/dashboard/approval'),
        })

        emailDispatchQueue.push({
          notificationEventId: emailEvent.id,
          recipient,
          updateEventStatus: true,
          request: {
            to: recipient,
            templateCode: 'approval_sla_reminder',
            templateName: 'Approval SLA Reminder',
            variables: {
              requestId: job.requestNumber,
              requestNumber: job.requestNumber,
              reminderType: job.reminderType,
              reminderAt: job.reminderAt,
            },
            fallbackSubject: `Reminder approval ${job.requestNumber}`,
            fallbackHtml: reminderEmail.html,
            fallbackText: reminderEmail.text,
          },
        })
      }

      if (job.assigneeEmployeeId) {
        pushDispatchQueue.push({
          employeeId: job.assigneeEmployeeId,
          category: 'approval_requests',
          title: reminderTitle,
          body: reminderBody,
          url: '/mobile/notifications',
          tag: `approval-reminder-${job.id}`,
          notificationEventId: bellEvent.id,
          metadata: {
            requestNumber: job.requestNumber,
            reminderType: job.reminderType,
          },
        })
      }

      await tx
        .update(reminderJobs)
        .set({
          status: 'executed',
          executionLog: `Executed by automation tick at ${referenceDate.toISOString()}.`,
          updatedAt: referenceDate,
        })
        .where(eq(reminderJobs.id, job.id))

      remindersExecuted += 1
    }

    const expiryCutoff = new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    const staleDrafts = await tx
      .select()
      .from(formSubmissions)
      .where(
        and(eq(formSubmissions.requestStatus, 'draft'), lt(formSubmissions.createdAt, expiryCutoff))
      )

    for (const draft of staleDrafts) {
      await tx
        .update(formSubmissions)
        .set({
          requestStatus: 'expired',
          cancelledAt: referenceDate,
          updatedAt: referenceDate,
        })
        .where(eq(formSubmissions.id, draft.id))

      await tx.insert(requestStatusHistories).values({
        submissionId: draft.id,
        approvalId: null,
        actorEmployeeId: draft.requesterEmployeeId,
        fromStatus: 'draft',
        toStatus: 'expired',
        note: 'Draft otomatis expired karena melewati batas lifecycle 7 hari.',
        createdAt: referenceDate,
      })

      expiredRequests += 1
    }
  })

  if (pushDispatchQueue.length > 0) {
    await Promise.all(pushDispatchQueue.map((job) => sendPushNotification(job)))
  }

  if (emailDispatchQueue.length > 0) {
    await Promise.all(
      emailDispatchQueue.map(async (job) => {
        try {
          const result = await sendWorkflowEmail(job.request)
          const sentAt = result.status === 'sent' ? new Date() : null

          await db
            .update(notificationDeliveries)
            .set({
              status: result.status === 'sent' ? 'sent' : 'skipped',
              sentAt,
              errorMessage: result.status === 'sent' ? null : result.reason,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(notificationDeliveries.notificationEventId, job.notificationEventId),
                eq(notificationDeliveries.deliveryChannel, 'email'),
                eq(notificationDeliveries.recipient, job.recipient)
              )
            )

          if (job.updateEventStatus) {
            await db
              .update(notificationEvents)
              .set({
                deliveryStatus: result.status === 'sent' ? 'delivered' : 'skipped',
                deliveredAt: sentAt,
              })
              .where(eq(notificationEvents.id, job.notificationEventId))
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send reminder email.'

          await db
            .update(notificationDeliveries)
            .set({
              status: 'failed',
              sentAt: null,
              errorMessage,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(notificationDeliveries.notificationEventId, job.notificationEventId),
                eq(notificationDeliveries.deliveryChannel, 'email'),
                eq(notificationDeliveries.recipient, job.recipient)
              )
            )

          if (job.updateEventStatus) {
            await db
              .update(notificationEvents)
              .set({
                deliveryStatus: 'failed',
                deliveredAt: null,
              })
              .where(eq(notificationEvents.id, job.notificationEventId))
          }
        }
      })
    )
  }

  return {
    remindersExecuted,
    expiredRequests,
  }
}

export async function getDailyActivityTemplateFormData() {
  const [template] = await db
    .select()
    .from(formTemplates)
    .where(eq(formTemplates.templateKey, DAILY_ACTIVITY_TEMPLATE_KEY))
    .limit(1)

  if (!template) {
    return null
  }

  const [version] = await db
    .select()
    .from(formTemplateVersions)
    .where(eq(formTemplateVersions.templateId, template.id))
    .orderBy(desc(formTemplateVersions.versionNumber))
    .limit(1)

  if (!version) {
    return null
  }

  const [sections, fields, options, validations, employeeRows, siteRows] = await Promise.all([
    db
      .select()
      .from(formTemplateSections)
      .where(eq(formTemplateSections.versionId, version.id))
      .orderBy(asc(formTemplateSections.sortOrder)),
    db
      .select()
      .from(formTemplateFields)
      .where(eq(formTemplateFields.versionId, version.id))
      .orderBy(asc(formTemplateFields.sortOrder)),
    db.select().from(formFieldOptions),
    db.select().from(formValidationRules),
    db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        department: employees.department,
        section: employees.section,
        siteId: employees.siteId,
      })
      .from(employees)
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.name)),
    db.select({ id: sites.id, name: sites.name }).from(sites).orderBy(asc(sites.name)),
  ])

  return {
    template,
    version,
    sections: sections.map((section) => ({
      ...section,
      fields: fields
        .filter((field) => field.sectionId === section.id)
        .map((field) => ({
          ...field,
          options: options.filter((option) => option.fieldId === field.id),
          validations: validations.filter((rule) => rule.fieldId === field.id),
        })),
    })),
    employees: employeeRows,
    sites: siteRows,
  }
}

export async function getFormStudioConsoleData() {
  const [templates, versions, sections, fields, options, validations, submissions] =
    await Promise.all([
      db.select().from(formTemplates).orderBy(asc(formTemplates.category), asc(formTemplates.name)),
      db.select().from(formTemplateVersions).orderBy(desc(formTemplateVersions.versionNumber)),
      db.select().from(formTemplateSections).orderBy(asc(formTemplateSections.sortOrder)),
      db.select().from(formTemplateFields).orderBy(asc(formTemplateFields.sortOrder)),
      db.select().from(formFieldOptions).orderBy(asc(formFieldOptions.sortOrder)),
      db.select().from(formValidationRules).orderBy(asc(formValidationRules.sortOrder)),
      db.select().from(formSubmissions).orderBy(desc(formSubmissions.createdAt)),
    ])

  return {
    metrics: {
      templates: templates.length,
      versions: versions.length,
      sections: sections.length,
      fields: fields.length,
      submissions: submissions.length,
    },
    templates: templates.map((template) => {
      const templateVersions = versions
        .filter((version) => version.templateId === template.id)
        .sort((left, right) => right.versionNumber - left.versionNumber)
      const latestVersion = templateVersions[0] ?? null
      const versionSections = sections.filter((section) => section.versionId === latestVersion?.id)
      const versionFields = fields.filter((field) => field.versionId === latestVersion?.id)

      return {
        ...template,
        latestVersion,
        sections: versionSections.map((section) => ({
          ...section,
          fields: versionFields
            .filter((field) => field.sectionId === section.id)
            .map((field) => ({
              ...field,
              options: options.filter((option) => option.fieldId === field.id),
              validations: validations.filter((rule) => rule.fieldId === field.id),
            })),
        })),
        versionCount: templateVersions.length,
        draftCount: submissions.filter(
          (submission) =>
            submission.templateId === template.id && submission.requestStatus === 'draft'
        ).length,
      }
    }),
  }
}

export async function getWorkflowStudioConsoleData() {
  const [
    workflowRows,
    versions,
    conditions,
    branches,
    stepRules,
    notificationRules,
    reminderRules,
  ] = await Promise.all([
    db.select().from(workflowTemplates).orderBy(asc(workflowTemplates.name)),
    db
      .select()
      .from(workflowTemplateVersions)
      .orderBy(desc(workflowTemplateVersions.versionNumber)),
    db.select().from(workflowConditions).orderBy(asc(workflowConditions.sortOrder)),
    db.select().from(workflowBranches).orderBy(asc(workflowBranches.sortOrder)),
    db.select().from(workflowStepRules).orderBy(asc(workflowStepRules.stepOrder)),
    db.select().from(workflowNotificationRules).orderBy(asc(workflowNotificationRules.eventType)),
    db.select().from(workflowReminderRules).orderBy(asc(workflowReminderRules.reminderType)),
  ])

  return {
    metrics: {
      workflows: workflowRows.length,
      versions: versions.length,
      conditions: conditions.length,
      branches: branches.length,
      notificationRules: notificationRules.length,
      reminderRules: reminderRules.length,
    },
    workflows: workflowRows.map((workflow) => {
      const workflowVersions = versions.filter(
        (version) => version.workflowTemplateId === workflow.id
      )
      const latestVersion =
        workflowVersions.sort((left, right) => right.versionNumber - left.versionNumber)[0] ?? null
      const workflowConditionsRows = conditions.filter(
        (condition) => condition.workflowVersionId === latestVersion?.id
      )
      const workflowBranchesRows = branches.filter(
        (branch) => branch.workflowVersionId === latestVersion?.id
      )
      const workflowStepRows = stepRules.filter(
        (stepRule) => stepRule.workflowVersionId === latestVersion?.id
      )
      const workflowNotificationRows = notificationRules.filter(
        (rule) => rule.workflowVersionId === latestVersion?.id
      )
      const workflowReminderRows = reminderRules.filter(
        (rule) => rule.workflowVersionId === latestVersion?.id
      )

      return {
        ...workflow,
        latestVersion,
        conditions: workflowConditionsRows,
        branches: workflowBranchesRows,
        stepRules: workflowStepRows,
        notificationRules: workflowNotificationRows,
        reminderRules: workflowReminderRows,
      }
    }),
  }
}

export async function getNotificationCenterData() {
  const [events, deliveries, reminders, submissions, inboxRows] = await Promise.all([
    db.select().from(notificationEvents).orderBy(desc(notificationEvents.createdAt)),
    db.select().from(notificationDeliveries).orderBy(desc(notificationDeliveries.createdAt)),
    db.select().from(reminderJobs).orderBy(desc(reminderJobs.reminderAt)),
    db.select().from(formSubmissions).orderBy(desc(formSubmissions.createdAt)),
    db.select().from(inboxItems).orderBy(desc(inboxItems.createdAt)),
  ])

  return {
    metrics: {
      inApp: deliveries.filter((delivery) => delivery.deliveryChannel === 'in_app').length,
      email: deliveries.filter((delivery) => delivery.deliveryChannel === 'email').length,
      dueSoon: reminders.filter((reminder) => reminder.reminderType === 'before_due').length,
      overdue: reminders.filter((reminder) => reminder.reminderType === 'overdue').length,
      delegationQueue: inboxRows.filter((item) => item.inboxType === 'delegation').length,
      escalationQueue: inboxRows.filter((item) => item.inboxType === 'escalation').length,
    },
    events,
    deliveries,
    reminders,
    submissions,
    inboxRows,
  }
}
