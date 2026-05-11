import { sql } from "drizzle-orm";
import { db } from "@/db";

let schedulingInfrastructurePromise: Promise<void> | null = null;

export async function ensureSchedulingTimesheetTables() {
  if (schedulingInfrastructurePromise) return schedulingInfrastructurePromise;

  schedulingInfrastructurePromise = db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('hero_timesheet_scheduling_infrastructure'));`);
    await tx.execute(sql`
      create table if not exists hero_indonesia_holidays (
        id serial primary key,
        date date not null,
        name text not null,
        local_name text not null,
        country_code text not null default 'ID',
        source text not null default 'api-hari-libur',
        source_id text,
        types jsonb not null default '[]'::jsonb,
        nationwide boolean not null default true,
        raw_payload jsonb,
        synced_at timestamp not null default now(),
        created_at timestamp not null default now(),
        updated_at timestamp not null default now()
      );
    `);
    await tx.execute(sql`
      create unique index if not exists hero_indonesia_holidays_date_source_uidx
      on hero_indonesia_holidays(date, source);
    `);
    await tx.execute(sql`
      create table if not exists hero_timesheet_scheduling_configs (
        id serial primary key,
        site_id integer not null references hero_sites(id) on delete cascade,
        schedule_type text not null default 'office',
        roster_type text not null default '5:2',
        msa_type text not null default 'staff-nonstaff',
        meals_type text not null default 'field-break',
        overtime_type text not null default 'five-hour',
        field_break_config jsonb,
        allowance_variables jsonb not null default '[]'::jsonb,
        overtime_variables jsonb not null default '[]'::jsonb,
        saved_by_user_id text references "user"(id) on delete set null,
        created_at timestamp not null default now(),
        updated_at timestamp not null default now()
      );
    `);
    await tx.execute(sql`
      create unique index if not exists hero_timesheet_scheduling_configs_site_uidx
      on hero_timesheet_scheduling_configs(site_id);
    `);
    await tx.execute(sql`
      create table if not exists hero_timesheet_scheduling_statuses (
        id serial primary key,
        site_id integer not null references hero_sites(id) on delete cascade,
        period text not null,
        schedule_status text not null default 'draft',
        attendance_status text not null default 'draft',
        import_status text not null default 'none',
        conflict_count integer not null default 0,
        last_generated_at timestamp,
        last_saved_at timestamp,
        last_imported_at timestamp,
        finalized_at timestamp,
        saved_by_user_id text references "user"(id) on delete set null,
        metadata jsonb,
        created_at timestamp not null default now(),
        updated_at timestamp not null default now()
      );
    `);
    await tx.execute(sql`
      create unique index if not exists hero_timesheet_scheduling_statuses_site_period_uidx
      on hero_timesheet_scheduling_statuses(site_id, period);
    `);
    await tx.execute(sql`
      create table if not exists hero_timesheet_scheduling_plans (
        id serial primary key,
        site_id integer not null references hero_sites(id) on delete cascade,
        period text not null,
        site_schedule_type text not null default 'office',
        draft_schedule jsonb not null default '[]'::jsonb,
        fixed_schedule jsonb not null default '[]'::jsonb,
        employee_profiles jsonb not null default '[]'::jsonb,
        field_break_config jsonb,
        saved_by_user_id text references "user"(id) on delete set null,
        created_at timestamp not null default now(),
        updated_at timestamp not null default now()
      );
    `);
    await tx.execute(sql`
      create unique index if not exists hero_timesheet_scheduling_plans_site_period_uidx
      on hero_timesheet_scheduling_plans(site_id, period);
    `);
    await tx.execute(sql`
      create table if not exists hero_timesheet_field_break_plans (
        id serial primary key,
        site_id integer not null references hero_sites(id) on delete cascade,
        period text not null,
        employee_id integer not null references hero_employees(id) on delete cascade,
        employee_name text not null,
        section_name text not null default '',
        roster_section text not null default '',
        on_site_date date not null,
        day_count integer not null default 90,
        field_break_date date not null,
        saved_by_user_id text references "user"(id) on delete set null,
        created_at timestamp not null default now(),
        updated_at timestamp not null default now()
      );
    `);
    await tx.execute(sql`
      create unique index if not exists hero_timesheet_field_break_plans_employee_period_uidx
      on hero_timesheet_field_break_plans(site_id, period, employee_id);
    `);
    await tx.execute(sql`
      create table if not exists hero_timesheet_attendance_real_overrides (
        id serial primary key,
        site_id integer not null references hero_sites(id) on delete cascade,
        period text not null,
        employee_id integer not null references hero_employees(id) on delete cascade,
        day integer not null,
        status text not null default 'empty',
        clock_in text not null default '',
        clock_out text not null default '',
        note text not null default '',
        source text not null default 'manual',
        saved_by_user_id text references "user"(id) on delete set null,
        created_at timestamp not null default now(),
        updated_at timestamp not null default now()
      );
    `);
    await tx.execute(sql`
      create unique index if not exists hero_timesheet_attendance_real_overrides_employee_day_uidx
      on hero_timesheet_attendance_real_overrides(site_id, period, employee_id, day);
    `);
    await tx.execute(sql`
      create table if not exists hero_timesheet_attendance_import_previews (
        id serial primary key,
        site_id integer not null references hero_sites(id) on delete cascade,
        period text not null,
        filename text not null,
        status text not null default 'preview',
        matched_count integer not null default 0,
        unmatched_count integer not null default 0,
        cell_count integer not null default 0,
        conflict_count integer not null default 0,
        preview_rows jsonb not null default '[]'::jsonb,
        conflicts jsonb not null default '[]'::jsonb,
        uploaded_by_user_id text references "user"(id) on delete set null,
        created_at timestamp not null default now(),
        applied_at timestamp
      );
    `);
  }).catch((error) => {
    schedulingInfrastructurePromise = null;
    throw error;
  });

  return schedulingInfrastructurePromise;
}
