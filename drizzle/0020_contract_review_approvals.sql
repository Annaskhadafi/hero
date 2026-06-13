create table if not exists "hero_hc_contract_review_approvals" (
  "id" serial primary key not null,
  "review_id" integer not null references "public"."hero_hc_employee_contract_reviews"("id") on delete cascade,
  "step_order" integer not null,
  "approval_token" text not null unique,
  "approver_employee_id" integer references "public"."hero_employees"("id") on delete set null,
  "approver_name" text not null,
  "approver_email" text default '' not null,
  "approver_role" text not null,
  "status" text default 'pending' not null,
  "signature_data_url" text,
  "remarks" text default '' not null,
  "signed_at" timestamp,
  "created_at" timestamp default now() not null
);
--> statement-breakpoint
create table if not exists "hero_hc_contract_review_reminders" (
  "id" serial primary key not null,
  "employee_id" integer,
  "employee_sn" text not null,
  "employee_name" text not null,
  "section" text default '' not null,
  "site_name" text default '' not null,
  "contract_end_date" date not null,
  "reminder_type" text not null,
  "recipient_email" text default '' not null,
  "recipient_name" text not null,
  "recipient_role" text not null,
  "sent_at" timestamp default now() not null,
  "review_id" integer references "public"."hero_hc_employee_contract_reviews"("id") on delete set null
);
--> statement-breakpoint
create table if not exists "hero_hc_contract_review_settings" (
  "id" serial primary key not null,
  "setting_key" text not null unique,
  "setting_value" jsonb default '{}'::jsonb not null,
  "updated_at" timestamp default now() not null
);
--> statement-breakpoint
ALTER TABLE "hero_hc_employee_contract_reviews" ADD COLUMN "leader_signature_data_url" text;
--> statement-breakpoint
ALTER TABLE "hero_hc_employee_contract_reviews" ADD COLUMN "contract_end_date" text;
--> statement-breakpoint
ALTER TABLE "hero_hc_employee_contract_reviews" ADD COLUMN "permanent_date" text;
