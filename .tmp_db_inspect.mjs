import { Client } from 'pg';

const client = new Client({ connectionString: process.env.DATABASE_URL });

const queries = [
  [
    'constraints_target',
    `select conrelid::regclass as table_name, conname, contype, pg_get_constraintdef(oid) as definition
     from pg_constraint
     where conrelid::regclass::text in (
       'hero_overtime_request_leader_permissions',
       'hero_form_templates',
       'hero_workflow_templates',
       'hero_master_attendance_shifts',
       'hero_email_templates',
       'hero_notification_channel_settings',
       'hero_activity_libraries',
       'hero_daily_activity_configs',
       'hero_notification_user_preferences',
       'hero_notification_push_subscriptions',
       'hero_portal_chitra_apps',
       'hero_activity_route_templates',
       'hero_overtime_command_letters',
       'hero_daily_activity_sessions'
     )
     order by table_name, contype, conname;`,
  ],
  [
    'indexes_target',
    `select schemaname, tablename, indexname, indexdef
     from pg_indexes
     where tablename in (
       'hero_overtime_request_leader_permissions',
       'hero_form_templates',
       'hero_workflow_templates',
       'hero_master_attendance_shifts',
       'hero_email_templates',
       'hero_notification_channel_settings',
       'hero_activity_libraries',
       'hero_daily_activity_configs',
       'hero_notification_user_preferences',
       'hero_notification_push_subscriptions',
       'hero_portal_chitra_apps',
       'hero_activity_route_templates',
       'hero_overtime_command_letters',
       'hero_daily_activity_sessions'
     )
     order by tablename, indexname;`,
  ],
  [
    'dup_overtime_leader',
    `select site_id, leader_employee_id, count(*)
     from hero_overtime_request_leader_permissions
     group by 1,2
     having count(*) > 1;`,
  ],
];

try {
  await client.connect();

  for (const [label, sql] of queries) {
    const res = await client.query(sql);
    console.log(`\n## ${label}`);
    console.log(JSON.stringify(res.rows, null, 2));
  }
} finally {
  await client.end();
}
