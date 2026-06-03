import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { masterCategoryOptions } from "@/db/schema/hero";

export const MASTER_CATEGORY_TYPES = [
  {
    type: "activity_category",
    label: "Kamus Aktivitas",
    description: "Kategori aktivitas pada Activity Hub dan library pekerjaan.",
  },
  {
    type: "point_event_category",
    label: "Point Event",
    description: "Kategori transaksi poin, reward, penalty, dan adjustment.",
  },
  {
    type: "hse_observation_category",
    label: "HSE Observation",
    description: "Kategori temuan observasi HSE.",
  },
  {
    type: "hse_incident_type",
    label: "HSE Incident Type",
    description: "Jenis incident HSE.",
  },
  {
    type: "hse_severity",
    label: "HSE Severity",
    description: "Level risiko untuk HSE.",
  },
  {
    type: "hse_observation_status",
    label: "HSE Observation Status",
    description: "Status lifecycle observasi HSE.",
  },
  {
    type: "hse_incident_status",
    label: "HSE Incident Status",
    description: "Status lifecycle incident HSE.",
  },
  {
    type: "attendance_event_type",
    label: "Attendance Event",
    description: "Jenis event attendance.",
  },
  {
    type: "attendance_status",
    label: "Attendance Status",
    description: "Status validasi attendance.",
  },
  {
    type: "training_status",
    label: "Training Status",
    description: "Status training dan sertifikasi.",
  },
  {
    type: "wellness_metric_type",
    label: "Wellness Metric",
    description: "Jenis metrik wellness/fit-to-work.",
  },
  {
    type: "wellness_status",
    label: "Wellness Status",
    description: "Status wellness karyawan.",
  },
  {
    type: "timesheet_status",
    label: "Timesheet Status",
    description: "Status entry timesheet.",
  },
  {
    type: "daily_report_status",
    label: "Daily Report Status",
    description: "Status report harian.",
  },
] as const;

export type MasterCategoryType = (typeof MASTER_CATEGORY_TYPES)[number]["type"];

export type MasterCategoryOption = {
  id: number;
  type: MasterCategoryType | string;
  code: string;
  label: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type MasterCategoryOptionMap = Record<string, MasterCategoryOption[]>;

const MASTER_CATEGORY_SEEDS: Array<{
  type: MasterCategoryType;
  code: string;
  label: string;
  description?: string;
  sortOrder: number;
}> = [
  { type: "activity_category", code: "Technical", label: "Technical", sortOrder: 10 },
  { type: "activity_category", code: "HSE", label: "HSE", sortOrder: 20 },
  { type: "activity_category", code: "Administrative", label: "Administrative", sortOrder: 30 },
  { type: "activity_category", code: "Wellness", label: "Wellness", sortOrder: 40 },
  { type: "activity_category", code: "Standby", label: "Standby", sortOrder: 50 },
  { type: "activity_category", code: "Operations", label: "Operations", sortOrder: 60 },
  { type: "activity_category", code: "Reporting", label: "Reporting", sortOrder: 70 },
  { type: "activity_category", code: "HC", label: "HC", sortOrder: 80 },
  { type: "activity_category", code: "Finance / SCM", label: "Finance / SCM", sortOrder: 90 },

  { type: "point_event_category", code: "Manual Adjustment", label: "Manual Adjustment", sortOrder: 10 },
  { type: "point_event_category", code: "Daily Activity", label: "Daily Activity", sortOrder: 20 },
  { type: "point_event_category", code: "Daily Activity Approval", label: "Daily Activity Approval", sortOrder: 30 },
  { type: "point_event_category", code: "Activity Input", label: "Activity Input", sortOrder: 40 },
  { type: "point_event_category", code: "Dispute Adjustment", label: "Dispute Adjustment", sortOrder: 50 },
  { type: "point_event_category", code: "Bonus", label: "Bonus", sortOrder: 60 },
  { type: "point_event_category", code: "Penalty", label: "Penalty", sortOrder: 70 },

  { type: "hse_observation_category", code: "Unsafe condition", label: "Unsafe condition", sortOrder: 10 },
  { type: "hse_observation_category", code: "Unsafe act", label: "Unsafe act", sortOrder: 20 },
  { type: "hse_observation_category", code: "Housekeeping", label: "Housekeeping", sortOrder: 30 },
  { type: "hse_observation_category", code: "PPE", label: "PPE", sortOrder: 40 },
  { type: "hse_observation_category", code: "Observation", label: "Observation", sortOrder: 50 },

  { type: "hse_incident_type", code: "Near miss", label: "Near miss", sortOrder: 10 },
  { type: "hse_incident_type", code: "Property damage", label: "Property damage", sortOrder: 20 },
  { type: "hse_incident_type", code: "First aid", label: "First aid", sortOrder: 30 },
  { type: "hse_incident_type", code: "Recordable incident", label: "Recordable incident", sortOrder: 40 },
  { type: "hse_incident_type", code: "Incident", label: "Incident", sortOrder: 50 },

  { type: "hse_severity", code: "Low", label: "Low", sortOrder: 10 },
  { type: "hse_severity", code: "Medium", label: "Medium", sortOrder: 20 },
  { type: "hse_severity", code: "High", label: "High", sortOrder: 30 },
  { type: "hse_severity", code: "Critical", label: "Critical", sortOrder: 40 },

  { type: "hse_observation_status", code: "open", label: "Open", sortOrder: 10 },
  { type: "hse_observation_status", code: "action_taken", label: "Action Taken", sortOrder: 20 },
  { type: "hse_observation_status", code: "closed", label: "Closed", sortOrder: 30 },
  { type: "hse_incident_status", code: "open", label: "Open", sortOrder: 10 },
  { type: "hse_incident_status", code: "investigating", label: "Investigating", sortOrder: 20 },
  { type: "hse_incident_status", code: "closed", label: "Closed", sortOrder: 30 },

  { type: "attendance_event_type", code: "checked-in", label: "Clock In", sortOrder: 10 },
  { type: "attendance_event_type", code: "checked-out", label: "Clock Out", sortOrder: 20 },
  { type: "attendance_status", code: "verified", label: "Verified", sortOrder: 10 },
  { type: "attendance_status", code: "needs_review", label: "Needs Review", sortOrder: 20 },
  { type: "attendance_status", code: "overtime", label: "Overtime", sortOrder: 30 },

  { type: "training_status", code: "active", label: "Active", sortOrder: 10 },
  { type: "training_status", code: "expiring_soon", label: "Expiring Soon", sortOrder: 20 },
  { type: "training_status", code: "urgent", label: "Urgent", sortOrder: 30 },

  { type: "wellness_metric_type", code: "Fit for Work", label: "Fit for Work", sortOrder: 10 },
  { type: "wellness_metric_type", code: "MCU", label: "MCU", sortOrder: 20 },
  { type: "wellness_metric_type", code: "BMI", label: "BMI", sortOrder: 30 },
  { type: "wellness_metric_type", code: "Follow Up", label: "Follow Up", sortOrder: 40 },
  { type: "wellness_status", code: "healthy", label: "Healthy", sortOrder: 10 },
  { type: "wellness_status", code: "follow_up", label: "Follow Up", sortOrder: 20 },
  { type: "wellness_status", code: "attention", label: "Attention", sortOrder: 30 },

  { type: "timesheet_status", code: "pending", label: "Pending", sortOrder: 10 },
  { type: "timesheet_status", code: "ready_for_payroll", label: "Ready for Payroll", sortOrder: 20 },
  { type: "timesheet_status", code: "needs_correction", label: "Needs Correction", sortOrder: 30 },

  { type: "daily_report_status", code: "draft", label: "Draft", sortOrder: 10 },
  { type: "daily_report_status", code: "ready", label: "Ready", sortOrder: 20 },
  { type: "daily_report_status", code: "sent", label: "Sent", sortOrder: 30 },
];

let masterCategoryPromise: Promise<void> | null = null;

export async function ensureMasterCategoryTables() {
  if (masterCategoryPromise) {
    return masterCategoryPromise;
  }

  masterCategoryPromise = (async () => {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('hero_master_categories'));`);
      await tx.execute(sql`
        create table if not exists hero_master_category_options (
          id serial primary key,
          type text not null,
          code text not null,
          label text not null,
          description text not null default '',
          sort_order integer not null default 0,
          is_active boolean not null default true,
          created_at timestamp not null default now(),
          updated_at timestamp not null default now()
        );
      `);
      await tx.execute(sql`
        create unique index if not exists hero_master_category_options_type_code_unique
        on hero_master_category_options(type, code);
      `);

      for (const seed of MASTER_CATEGORY_SEEDS) {
        await tx
          .insert(masterCategoryOptions)
          .values({
            type: seed.type,
            code: seed.code,
            label: seed.label,
            description: seed.description ?? "",
            sortOrder: seed.sortOrder,
            isActive: true,
          })
          .onConflictDoNothing();
      }
    });
  })().catch((error) => {
    masterCategoryPromise = null;
    throw error;
  });

  return masterCategoryPromise;
}

export async function getMasterCategoryOptions() {
  await ensureMasterCategoryTables();

  return db
    .select()
    .from(masterCategoryOptions)
    .orderBy(asc(masterCategoryOptions.type), asc(masterCategoryOptions.sortOrder), asc(masterCategoryOptions.label));
}

export async function getActiveMasterCategoryOptionMap(): Promise<MasterCategoryOptionMap> {
  const rows = await getMasterCategoryOptions();

  return rows.reduce<MasterCategoryOptionMap>((accumulator, row) => {
    if (!row.isActive) {
      return accumulator;
    }

    const options = accumulator[row.type] ?? [];
    options.push(row);
    accumulator[row.type] = options;
    return accumulator;
  }, {});
}

export async function getActiveMasterCategoryCodes(type: MasterCategoryType) {
  const rows = await getMasterCategoryOptions();
  return rows.filter((row) => row.type === type && row.isActive).map((row) => row.code);
}
