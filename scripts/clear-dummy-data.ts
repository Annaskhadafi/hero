import { sql } from "drizzle-orm";
import { db } from "@/db";

async function main() {
  await db.execute(sql.raw(`
do $$
begin
  drop table if exists _hero_dummy_employees;
  drop table if exists _hero_dummy_sites;
  drop table if exists _hero_dummy_submissions;
  drop table if exists _hero_dummy_activities;
  drop table if exists _hero_dummy_approvals;
  drop table if exists _hero_dummy_org_structures;
  drop table if exists _hero_dummy_org_nodes;
  drop table if exists _hero_dummy_matrices;

  create temp table _hero_dummy_employees on commit drop as
  select id
  from hero_employees
  where email like '%@hero.local'
     or name in (
       'Dedi Pranata',
       'Rian Kurniawan',
       'Arman Saputra',
       'Soni Darmawan',
       'Mira Andini',
       'Fikri Maulana'
     );

  create temp table _hero_dummy_sites on commit drop as
  select id
  from hero_sites
  where name = 'Bengalon Pit North'
     or contract_number = 'CP-CS-2026-014';

  create temp table _hero_dummy_submissions on commit drop as
  select fs.id
  from hero_form_submissions fs
  where fs.requester_employee_id in (select id from _hero_dummy_employees)
     or fs.site_id in (select id from _hero_dummy_sites)
     or fs.payload_snapshot like '%Draft inspeksi area stockpile%'
     or fs.payload_snapshot like '%Cancelled daily recap draft%';

  create temp table _hero_dummy_activities on commit drop as
  select id
  from hero_activities
  where employee_id in (select id from _hero_dummy_employees)
     or site_id in (select id from _hero_dummy_sites);

  create temp table _hero_dummy_approvals on commit drop as
  select id
  from hero_approvals
  where activity_id in (select id from _hero_dummy_activities);

  create temp table _hero_dummy_org_structures on commit drop as
  select id
  from hero_org_chart_structures
  where scope_value = 'Bengalon Pit North'
     or name like 'Struktur Approval Bengalon Pit North%';

  create temp table _hero_dummy_org_nodes on commit drop as
  select id
  from hero_org_chart_nodes
  where structure_id in (select id from _hero_dummy_org_structures)
     or employee_id in (select id from _hero_dummy_employees);

  create temp table _hero_dummy_matrices on commit drop as
  select id
  from hero_approval_matrices
  where name in (
       'Technician Activity Standard',
       'Foreman Self Submission',
       'HSE Officer Submission',
       'Admin Site Daily Recap'
     )
     or site_id in (select id from _hero_dummy_sites)
     or structure_id in (select id from _hero_dummy_org_structures);

  delete from hero_notification_deliveries
  where notification_event_id in (
    select id
    from hero_notification_events
    where submission_id in (select id from _hero_dummy_submissions)
       or approval_id in (select id from _hero_dummy_approvals)
       or inbox_item_id in (
         select id from hero_inbox_items where submission_id in (select id from _hero_dummy_submissions)
       )
  );

  delete from hero_reminder_jobs
  where inbox_item_id in (
    select id from hero_inbox_items where submission_id in (select id from _hero_dummy_submissions)
  );

  delete from hero_form_submission_values where submission_id in (select id from _hero_dummy_submissions);
  delete from hero_approval_request_actors where submission_id in (select id from _hero_dummy_submissions);
  delete from hero_inbox_items where submission_id in (select id from _hero_dummy_submissions);
  delete from hero_notification_events where submission_id in (select id from _hero_dummy_submissions);
  delete from hero_request_status_histories where submission_id in (select id from _hero_dummy_submissions);
  delete from hero_step_decision_histories where submission_id in (select id from _hero_dummy_submissions);
  delete from hero_approval_attachments where submission_id in (select id from _hero_dummy_submissions);
  delete from hero_form_submissions where id in (select id from _hero_dummy_submissions);

  delete from hero_approval_comments where approval_id in (select id from _hero_dummy_approvals);
  delete from hero_step_decision_histories where approval_id in (select id from _hero_dummy_approvals);
  delete from hero_approval_attachments where approval_id in (select id from _hero_dummy_approvals);
  delete from hero_approvals where id in (select id from _hero_dummy_approvals);

  delete from hero_activities where id in (select id from _hero_dummy_activities);
  delete from hero_attendance_records
  where employee_id in (select id from _hero_dummy_employees)
     or site_id in (select id from _hero_dummy_sites);
  delete from hero_timesheet_entries
  where employee_id in (select id from _hero_dummy_employees)
     or site_id in (select id from _hero_dummy_sites);
  delete from hero_daily_reports where site_id in (select id from _hero_dummy_sites);
  delete from hero_point_events where employee_id in (select id from _hero_dummy_employees);
  delete from hero_hse_observations
  where employee_id in (select id from _hero_dummy_employees)
     or site_id in (select id from _hero_dummy_sites);
  delete from hero_hse_incidents where site_id in (select id from _hero_dummy_sites);
  delete from hero_training_records where employee_id in (select id from _hero_dummy_employees);
  delete from hero_wellness_records where employee_id in (select id from _hero_dummy_employees);

  delete from hero_approval_matrix_steps where matrix_id in (select id from _hero_dummy_matrices);
  delete from hero_approval_matrices where id in (select id from _hero_dummy_matrices);

  update hero_employees
  set direct_manager_id = null
  where direct_manager_id in (select id from _hero_dummy_employees);

  update hero_employees
  set org_node_id = null
  where org_node_id in (select id from _hero_dummy_org_nodes);

  delete from hero_org_node_assignments
  where employee_id in (select id from _hero_dummy_employees)
     or node_id in (select id from _hero_dummy_org_nodes);

  update hero_org_chart_nodes
  set parent_node_id = null, fallback_node_id = null
  where parent_node_id in (select id from _hero_dummy_org_nodes)
     or fallback_node_id in (select id from _hero_dummy_org_nodes);

  delete from hero_org_chart_nodes where id in (select id from _hero_dummy_org_nodes);
  delete from hero_org_chart_structures where id in (select id from _hero_dummy_org_structures);

  delete from hero_email_delivery_logs
  where employee_id in (select id from _hero_dummy_employees)
     or to_email like '%.example'
     or to_email like '%@hero.local'
     or coalesce(cc_email, '') like '%@hero.local'
     or subject like '%Bengalon%'
     or subject like '%HD785-17%';

  delete from hero_audit_logs
  where actor_employee_id in (select id from _hero_dummy_employees)
     or action in ('NAVBAR_THEME_UPDATED', 'ROLE_REVIEWED', 'SECURITY_ALERT')
     or entity_label in ('Admin navigation', 'Site Admin', 'Unusual login monitor');

  delete from hero_employees where id in (select id from _hero_dummy_employees);
  delete from hero_master_positions
  where code in ('PJO_SITE', 'FOREMAN', 'TECHNICIAN', 'HSE_OFFICER', 'ADMIN_SITE')
     or site_location = 'Bengalon Pit North';
  delete from hero_master_sections where code in ('FIELD_OPS', 'TYRE_OPS', 'GOV', 'PEOPLE_OPS', 'SITE_LEAD');
  delete from hero_master_departments where code in ('OPS', 'HSE', 'HC', 'MGT');
  delete from hero_sites where id in (select id from _hero_dummy_sites);
end $$;
`));

  console.log("Dummy data cleanup completed.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Dummy data cleanup failed.", error);
    process.exit(1);
  });
