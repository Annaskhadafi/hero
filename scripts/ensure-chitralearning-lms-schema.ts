import { sql } from "drizzle-orm";

import { db } from "@/db";

async function main() {
  await db.execute(sql`
    create table if not exists hero_chitralearning_courses (
      id serial primary key,
      title text not null,
      slug text not null unique,
      description text not null default '',
      category text not null default 'Internal',
      status text not null default 'draft',
      cover_image_url text not null default '',
      passing_score integer not null default 80,
      estimated_minutes integer not null default 0,
      due_days integer not null default 14,
      certificate_enabled boolean not null default true,
      created_by_employee_id integer references hero_employees(id) on delete set null,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `);

  await db.execute(sql`
    alter table hero_chitralearning_courses
      add column if not exists due_days integer not null default 14;
  `);

  await db.execute(sql`
    create table if not exists hero_chitralearning_lessons (
      id serial primary key,
      course_id integer not null references hero_chitralearning_courses(id) on delete cascade,
      lesson_type text not null default 'video',
      title text not null,
      description text not null default '',
      video_url text not null default '',
      file_url text not null default '',
      duration_minutes integer not null default 0,
      sort_order integer not null default 1,
      is_required boolean not null default true,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `);

  await db.execute(sql`
    create table if not exists hero_chitralearning_quiz_questions (
      id serial primary key,
      course_id integer not null references hero_chitralearning_courses(id) on delete cascade,
      lesson_id integer references hero_chitralearning_lessons(id) on delete set null,
      test_phase text not null default 'posttest',
      question_text text not null,
      question_image_url text not null default '',
      option_a text not null,
      option_a_image_url text not null default '',
      option_b text not null,
      option_b_image_url text not null default '',
      option_c text not null default '',
      option_c_image_url text not null default '',
      option_d text not null default '',
      option_d_image_url text not null default '',
      correct_option text not null default 'A',
      points integer not null default 1,
      sort_order integer not null default 1,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `);

  await db.execute(sql`
    alter table hero_chitralearning_quiz_questions
      add column if not exists test_phase text not null default 'posttest',
      add column if not exists question_image_url text not null default '',
      add column if not exists option_a_image_url text not null default '',
      add column if not exists option_b_image_url text not null default '',
      add column if not exists option_c_image_url text not null default '',
      add column if not exists option_d_image_url text not null default '';
  `);

  await db.execute(sql`
    create table if not exists hero_chitralearning_course_access (
      id serial primary key,
      course_id integer not null references hero_chitralearning_courses(id) on delete cascade,
      access_type text not null default 'all',
      access_value text not null default '*',
      description text not null default '',
      is_active boolean not null default true,
      created_at timestamp not null default now()
    );
  `);

  await db.execute(sql`
    create table if not exists hero_chitralearning_enrollments (
      id serial primary key,
      course_id integer not null references hero_chitralearning_courses(id) on delete cascade,
      employee_id integer not null references hero_employees(id) on delete cascade,
      assigned_by_employee_id integer references hero_employees(id) on delete set null,
      status text not null default 'assigned',
      progress integer not null default 0,
      score integer,
      pretest_score integer,
      pretest_status text not null default 'not_started',
      posttest_score integer,
      posttest_status text not null default 'not_started',
      due_at timestamp,
      last_lesson_id integer references hero_chitralearning_lessons(id) on delete set null,
      last_position_seconds integer not null default 0,
      started_at timestamp,
      completed_at timestamp,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `);

  await db.execute(sql`
    alter table hero_chitralearning_enrollments
      add column if not exists pretest_score integer,
      add column if not exists pretest_status text not null default 'not_started',
      add column if not exists posttest_score integer,
      add column if not exists posttest_status text not null default 'not_started',
      add column if not exists due_at timestamp,
      add column if not exists last_lesson_id integer references hero_chitralearning_lessons(id) on delete set null,
      add column if not exists last_position_seconds integer not null default 0;
  `);

  await db.execute(sql`
    create unique index if not exists hero_chitralearning_enrollments_employee_course_uq
      on hero_chitralearning_enrollments(employee_id, course_id);
  `);

  await db.execute(sql`
    create table if not exists hero_chitralearning_certificates (
      id serial primary key,
      course_id integer not null references hero_chitralearning_courses(id) on delete cascade,
      employee_id integer not null references hero_employees(id) on delete cascade,
      enrollment_id integer references hero_chitralearning_enrollments(id) on delete set null,
      training_record_id integer references hero_training_records(id) on delete set null,
      certificate_number text not null,
      status text not null default 'issued',
      issued_at timestamp not null default now(),
      expires_at timestamp,
      metadata jsonb not null default '{}'::jsonb
    );
  `);

  await db.execute(sql`
    create unique index if not exists hero_chitralearning_certificates_number_uq
      on hero_chitralearning_certificates(certificate_number);
  `);

  await db.execute(sql`
    create unique index if not exists hero_chitralearning_certificates_employee_course_uq
      on hero_chitralearning_certificates(employee_id, course_id);
  `);

  await db.execute(sql`
    create table if not exists hero_chitralearning_campaigns (
      id serial primary key,
      title text not null,
      description text not null default '',
      course_id integer references hero_chitralearning_courses(id) on delete set null,
      campaign_type text not null default 'posttest',
      target_type text not null default 'all',
      target_value text not null default '*',
      due_at timestamp,
      recurrence text not null default 'manual',
      status text not null default 'draft',
      passing_score integer not null default 80,
      assignment_prompt text not null default '',
      created_by_employee_id integer references hero_employees(id) on delete set null,
      published_at timestamp,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `);

  await db.execute(sql`
    create table if not exists hero_chitralearning_campaign_participants (
      id serial primary key,
      campaign_id integer not null references hero_chitralearning_campaigns(id) on delete cascade,
      employee_id integer not null references hero_employees(id) on delete cascade,
      enrollment_id integer references hero_chitralearning_enrollments(id) on delete set null,
      status text not null default 'assigned',
      score integer,
      submitted_at timestamp,
      completed_at timestamp,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `);

  await db.execute(sql`
    create unique index if not exists hero_chitralearning_campaign_employee_uq
      on hero_chitralearning_campaign_participants(campaign_id, employee_id);
  `);

  await db.execute(sql`
    create table if not exists hero_chitralearning_assignment_responses (
      id serial primary key,
      campaign_id integer not null references hero_chitralearning_campaigns(id) on delete cascade,
      employee_id integer not null references hero_employees(id) on delete cascade,
      response_text text not null default '',
      file_url text not null default '',
      status text not null default 'submitted',
      submitted_at timestamp not null default now(),
      reviewed_at timestamp,
      reviewed_by_employee_id integer references hero_employees(id) on delete set null,
      score integer,
      feedback text not null default ''
    );
  `);

  await db.execute(sql`
    create table if not exists hero_chitralearning_audit_logs (
      id serial primary key,
      actor_employee_id integer references hero_employees(id) on delete set null,
      action text not null,
      course_id integer references hero_chitralearning_courses(id) on delete set null,
      employee_id integer references hero_employees(id) on delete set null,
      before_value jsonb not null default '{}'::jsonb,
      after_value jsonb not null default '{}'::jsonb,
      note text not null default '',
      created_at timestamp not null default now()
    );
  `);

  console.log("[ChitraLearning LMS] Internal LMS schema ensured.");
}

main().catch((error) => {
  console.error("[ChitraLearning LMS] Failed to ensure schema", error);
  process.exitCode = 1;
});
