import { sql } from 'drizzle-orm'
import { db } from '@/db'

let schedulingInfrastructurePromise: Promise<void> | null = null
let tablesEnsured = false

export async function ensureSchedulingTimesheetTables() {
  if (tablesEnsured) return
  if (schedulingInfrastructurePromise) return schedulingInfrastructurePromise

  schedulingInfrastructurePromise = db
    .transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext('hero_timesheet_scheduling_infrastructure'));`
      )
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
    `)
      await tx.execute(sql`
      create unique index if not exists hero_indonesia_holidays_date_source_uidx
      on hero_indonesia_holidays(date, source);
    `)
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
        overtime_config jsonb,
        saved_by_user_id text references "user"(id) on delete set null,
        created_at timestamp not null default now(),
        updated_at timestamp not null default now()
      );
    `)
      await tx.execute(sql`
      create unique index if not exists hero_timesheet_scheduling_configs_site_uidx
      on hero_timesheet_scheduling_configs(site_id);
    `)
      await tx.execute(
        sql`alter table hero_timesheet_scheduling_configs add column if not exists overtime_config jsonb;`
      )
      await tx.execute(
        sql`alter table hero_timesheet_scheduling_configs add column if not exists pdf_config jsonb;`
      )
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
    `)
      await tx.execute(sql`
      create unique index if not exists hero_timesheet_scheduling_statuses_site_period_uidx
      on hero_timesheet_scheduling_statuses(site_id, period);
    `)
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
    `)
      await tx.execute(sql`
      create unique index if not exists hero_timesheet_scheduling_plans_site_period_uidx
      on hero_timesheet_scheduling_plans(site_id, period);
    `)
      await tx.execute(sql`
      create table if not exists hero_timesheet_scheduling_plans_v2 (
        id serial primary key,
        site_id integer not null references hero_sites(id) on delete cascade,
        period text not null,
        status text not null default 'draft',
        draft_schedule jsonb not null default '[]'::jsonb,
        active_schedule jsonb not null default '[]'::jsonb,
        created_by_user_id text references "user"(id) on delete set null,
        updated_by_user_id text references "user"(id) on delete set null,
        activated_at timestamp,
        created_at timestamp not null default now(),
        updated_at timestamp not null default now()
      );
    `)
      await tx.execute(sql`
      create unique index if not exists hero_timesheet_scheduling_plans_v2_site_period_uidx
      on hero_timesheet_scheduling_plans_v2(site_id, period);
    `)
      await tx.execute(sql`
      create table if not exists hero_timesheet_field_break_plans (
        id serial primary key,
        site_id integer not null references hero_sites(id) on delete cascade,
        period text not null,
        employee_id integer not null references hero_employees(id) on delete cascade,
        employee_name text not null,
        section_name text not null default '',
        roster_section text not null default '',
        on_site_date date,
        day_count integer,
        field_break_date date,
        field_break_end_date date,
        source text not null default 'manual',
        is_locked boolean not null default false,
        notes text not null default '',
        saved_by_user_id text references "user"(id) on delete set null,
        created_at timestamp not null default now(),
        updated_at timestamp not null default now()
      );
    `)
      await tx.execute(sql`
      alter table hero_timesheet_field_break_plans alter column on_site_date drop not null;
    `)
      await tx.execute(sql`
      alter table hero_timesheet_field_break_plans alter column day_count drop not null;
    `)
      await tx.execute(sql`
      alter table hero_timesheet_field_break_plans alter column field_break_date drop not null;
    `)
      await tx.execute(
        sql`alter table hero_timesheet_field_break_plans add column if not exists field_break_end_date date;`
      )
      await tx.execute(
        sql`alter table hero_timesheet_field_break_plans add column if not exists source text not null default 'manual';`
      )
      await tx.execute(
        sql`alter table hero_timesheet_field_break_plans add column if not exists is_locked boolean not null default false;`
      )
      await tx.execute(
        sql`alter table hero_timesheet_field_break_plans add column if not exists notes text not null default '';`
      )
      await tx.execute(sql`
      create unique index if not exists hero_timesheet_field_break_plans_employee_period_uidx
      on hero_timesheet_field_break_plans(site_id, period, employee_id);
    `)
      await tx.execute(sql`
      create table if not exists hero_timesheet_payroll_snapshots (
        id serial primary key,
        site_id integer not null references hero_sites(id) on delete cascade,
        period text not null,
        status text not null default 'draft',
        employee_count integer not null default 0,
        total_msa integer not null default 0,
        total_meals integer not null default 0,
        total_tlk integer not null default 0,
        total_overtime_hours numeric(10,2) not null default 0,
        metadata jsonb not null default '{}'::jsonb,
        saved_by_user_id text references "user"(id) on delete set null,
        generated_at timestamp not null default now(),
        created_at timestamp not null default now(),
        updated_at timestamp not null default now()
      );
    `)
      await tx.execute(sql`
      create unique index if not exists hero_timesheet_payroll_snapshots_site_period_uidx
      on hero_timesheet_payroll_snapshots(site_id, period);
    `)
      await tx.execute(sql`
      create table if not exists hero_timesheet_payroll_snapshot_items (
        id serial primary key,
        snapshot_id integer not null references hero_timesheet_payroll_snapshots(id) on delete cascade,
        employee_id integer not null references hero_employees(id) on delete cascade,
        day integer not null,
        schedule_code text not null default '',
        attendance_status text not null default 'empty',
        clock_in text not null default '',
        clock_out text not null default '',
        msa_amount integer not null default 0,
        meals_amount integer not null default 0,
        tlk_amount integer not null default 0,
        overtime_hours numeric(8,2) not null default 0,
        source text not null default 'attendance',
        notes text not null default '',
        created_at timestamp not null default now()
      );
    `)
      await tx.execute(sql`
      create unique index if not exists hero_timesheet_payroll_snapshot_items_snapshot_employee_day_uidx
      on hero_timesheet_payroll_snapshot_items(snapshot_id, employee_id, day);
    `)
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
        import_preview_id integer,
        validation_flags jsonb not null default '[]'::jsonb,
        work_minutes integer,
        saved_by_user_id text references "user"(id) on delete set null,
        created_at timestamp not null default now(),
        updated_at timestamp not null default now()
      );
    `)
      await tx.execute(sql`
      create unique index if not exists hero_timesheet_attendance_real_overrides_employee_day_uidx
      on hero_timesheet_attendance_real_overrides(site_id, period, employee_id, day);
    `)
      await tx.execute(sql`
      create table if not exists hero_timesheet_attendance_import_templates (
        id serial primary key,
        site_id integer not null references hero_sites(id) on delete cascade,
        template_name text not null,
        source_type text not null default 'fingerprint',
        sheet_name text not null default '',
        header_row integer,
        column_mapping jsonb not null default '{}'::jsonb,
        match_rules jsonb not null default '{}'::jsonb,
        template_kind text not null default 'auto',
        header_signature text not null default '',
        last_used_at timestamp,
        usage_count integer not null default 0,
        confidence integer not null default 0,
        created_at timestamp not null default now(),
        updated_at timestamp not null default now()
      );
    `)
      await tx.execute(sql`
      alter table hero_timesheet_attendance_import_templates add column if not exists template_kind text not null default 'auto';
    `)
      await tx.execute(sql`
      alter table hero_timesheet_attendance_import_templates add column if not exists header_signature text not null default '';
    `)
      await tx.execute(sql`
      alter table hero_timesheet_attendance_import_templates add column if not exists last_used_at timestamp;
    `)
      await tx.execute(sql`
      alter table hero_timesheet_attendance_import_templates add column if not exists usage_count integer not null default 0;
    `)
      await tx.execute(sql`
      alter table hero_timesheet_attendance_import_templates add column if not exists confidence integer not null default 0;
    `)
      await tx.execute(sql`
      create unique index if not exists hero_timesheet_attendance_import_templates_site_name_uidx
      on hero_timesheet_attendance_import_templates(site_id, template_name);
    `)
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
        template_id integer references hero_timesheet_attendance_import_templates(id) on delete set null,
        template_kind text not null default 'auto',
        sheet_name text not null default '',
        detection_summary jsonb not null default '{}'::jsonb,
        validation_summary jsonb not null default '{}'::jsonb,
        uploaded_by_user_id text references "user"(id) on delete set null,
        created_at timestamp not null default now(),
        applied_at timestamp,
        deleted_at timestamp,
        rolled_back_at timestamp
      );
    `)
      await tx.execute(
        sql`alter table hero_timesheet_attendance_import_previews add column if not exists template_id integer references hero_timesheet_attendance_import_templates(id) on delete set null;`
      )
      await tx.execute(
        sql`alter table hero_timesheet_attendance_import_previews add column if not exists template_kind text not null default 'auto';`
      )
      await tx.execute(
        sql`alter table hero_timesheet_attendance_import_previews add column if not exists sheet_name text not null default '';`
      )
      await tx.execute(
        sql`alter table hero_timesheet_attendance_import_previews add column if not exists detection_summary jsonb not null default '{}'::jsonb;`
      )
      await tx.execute(
        sql`alter table hero_timesheet_attendance_import_previews add column if not exists validation_summary jsonb not null default '{}'::jsonb;`
      )
      await tx.execute(
        sql`alter table hero_timesheet_attendance_import_previews add column if not exists deleted_at timestamp;`
      )
      await tx.execute(
        sql`alter table hero_timesheet_attendance_import_previews add column if not exists rolled_back_at timestamp;`
      )
      await tx.execute(
        sql`create index if not exists hero_timesheet_attendance_import_previews_site_period_created_idx on hero_timesheet_attendance_import_previews(site_id, period, created_at);`
      )
      await tx.execute(sql`
      create table if not exists hero_timesheet_attendance_employee_aliases (
        id serial primary key,
        site_id integer not null references hero_sites(id) on delete cascade,
        employee_id integer not null references hero_employees(id) on delete cascade,
        alias_name text not null default '',
        alias_sn text not null default '',
        source text not null default 'attendance-import',
        created_at timestamp not null default now(),
        updated_at timestamp not null default now()
      );
    `)
      await tx.execute(
        sql`create unique index if not exists hero_timesheet_attendance_employee_aliases_site_alias_uidx on hero_timesheet_attendance_employee_aliases(site_id, alias_name, alias_sn);`
      )
      await tx.execute(
        sql`create index if not exists hero_timesheet_attendance_employee_aliases_employee_idx on hero_timesheet_attendance_employee_aliases(employee_id);`
      )
      await tx.execute(
        sql`alter table hero_timesheet_attendance_real_overrides add column if not exists import_preview_id integer references hero_timesheet_attendance_import_previews(id) on delete set null;`
      )
      await tx.execute(
        sql`alter table hero_timesheet_attendance_real_overrides add column if not exists validation_flags jsonb not null default '[]'::jsonb;`
      )
      await tx.execute(
        sql`alter table hero_timesheet_attendance_real_overrides add column if not exists work_minutes integer;`
      )
      await tx.execute(
        sql`create index if not exists hero_timesheet_attendance_real_overrides_import_preview_idx on hero_timesheet_attendance_real_overrides(import_preview_id);`
      )
      await tx.execute(sql`
      create table if not exists hero_attendance_permission_requests (
        id serial primary key,
        site_id integer not null references hero_sites(id) on delete cascade,
        employee_id integer not null references hero_employees(id) on delete cascade,
        permission_type text not null,
        start_date date not null,
        end_date date not null,
        sick_category text not null default '',
        late_reason text not null default '',
        return_time text not null default '',
        reason text not null default '',
        attachment_url text not null default '',
        status text not null default 'pending',
        approver_user_id text references "user"(id) on delete set null,
        approver_note text not null default '',
        approved_at timestamp,
        rejected_at timestamp,
        created_at timestamp not null default now(),
        updated_at timestamp not null default now()
      );
    `)
      await tx.execute(
        sql`alter table hero_attendance_permission_requests add column if not exists approval_submission_id integer references hero_form_submissions(id) on delete set null;`
      )
      await tx.execute(
        sql`create unique index if not exists hero_attendance_permission_requests_employee_date_uidx on hero_attendance_permission_requests(employee_id, start_date, permission_type);`
      )
      await tx.execute(
        sql`create index if not exists hero_attendance_permission_requests_status_idx on hero_attendance_permission_requests(status, created_at);`
      )
      tablesEnsured = true
    })
    .catch((error) => {
      schedulingInfrastructurePromise = null
      throw error
    })

  return schedulingInfrastructurePromise
}
