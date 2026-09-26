alter table hero_daily_activity_sessions
  add column if not exists deleted_at timestamp;

alter table hero_daily_activity_sessions
  add column if not exists deleted_by_employee_id integer references hero_employees(id) on delete set null;

alter table hero_activities
  add column if not exists deleted_at timestamp;

alter table hero_activities
  add column if not exists deleted_by_employee_id integer references hero_employees(id) on delete set null;
