INSERT INTO "hero_hr_positions" (
  "code",
  "level_name",
  "rank_name",
  "job_level_code",
  "employee_status_code",
  "is_managerial",
  "is_active"
)
VALUES
  ('POS_NON_STAFF_LEADER', 'Non Staff', 'Leader', NULL, NULL, false, true),
  ('POS_STAFF_LEADER', 'Staff', 'Leader', NULL, NULL, false, true)
ON CONFLICT ("code") DO UPDATE SET
  "level_name" = EXCLUDED."level_name",
  "rank_name" = EXCLUDED."rank_name",
  "is_active" = true,
  "updated_at" = now();
