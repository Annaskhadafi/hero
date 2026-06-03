CREATE TABLE "hero_hc_candidate_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"stage" text NOT NULL,
	"entered_at" timestamp DEFAULT now() NOT NULL,
	"exited_at" timestamp,
	"result" text DEFAULT '' NOT NULL,
	"evaluator" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"recruitment_id" integer,
	"full_name" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"cv_url" text DEFAULT '' NOT NULL,
	"current_stage" text DEFAULT 'Sourcing' NOT NULL,
	"rating" integer,
	"notes" text DEFAULT '' NOT NULL,
	"rejection_reason" text DEFAULT '' NOT NULL,
	"rejected_at_stage" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_clearance_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"offboarding_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"assigned_to" text DEFAULT '' NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"completed_by" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_disciplinary_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"violation_category_id" integer,
	"sp_level" integer DEFAULT 1 NOT NULL,
	"letter_number" text DEFAULT '' NOT NULL,
	"violation_date" date NOT NULL,
	"violation_description" text DEFAULT '' NOT NULL,
	"action_taken" text DEFAULT '' NOT NULL,
	"effective_date" date NOT NULL,
	"expiry_date" date,
	"issued_by" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"attachment_url" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_leave_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"leave_type_id" integer NOT NULL,
	"year" integer NOT NULL,
	"total_days" integer DEFAULT 0 NOT NULL,
	"used_days" integer DEFAULT 0 NOT NULL,
	"carry_over_days" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_leave_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"leave_type_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"total_days" integer DEFAULT 1 NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"attachment_url" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by" text DEFAULT '' NOT NULL,
	"approved_at" timestamp,
	"rejection_reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_leave_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"default_days_per_year" integer DEFAULT 0 NOT NULL,
	"is_paid" boolean DEFAULT true NOT NULL,
	"requires_approval" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hc_leave_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hero_hc_letter_sequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"letter_type" text NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"last_sequence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_letters" (
	"id" serial PRIMARY KEY NOT NULL,
	"letter_type" text NOT NULL,
	"letter_number" text NOT NULL,
	"employee_id" integer,
	"employee_name" text DEFAULT '' NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"destination" text DEFAULT '' NOT NULL,
	"purpose" text DEFAULT '' NOT NULL,
	"departure_date" date,
	"return_date" date,
	"issued_date" date NOT NULL,
	"issued_place" text DEFAULT 'Balikpapan' NOT NULL,
	"signatory_name" text DEFAULT '' NOT NULL,
	"signatory_title" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"approved_by" text DEFAULT '' NOT NULL,
	"approved_at" timestamp,
	"pdf_url" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hc_letters_letter_number_unique" UNIQUE("letter_number")
);
--> statement-breakpoint
CREATE TABLE "hero_hc_offboarding_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"request_type" text DEFAULT 'resignation' NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"requested_last_working_day" date NOT NULL,
	"actual_last_working_day" date,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by" text DEFAULT '' NOT NULL,
	"approved_at" timestamp,
	"exit_interview_notes" text DEFAULT '' NOT NULL,
	"exit_interview_date" date,
	"exit_interview_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_onboarding_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"template_id" integer,
	"start_date" date NOT NULL,
	"probation_end_date" date,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"overall_progress" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_onboarding_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"assigned_to_department" text DEFAULT '' NOT NULL,
	"due_date" date,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"completed_by" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_onboarding_template_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"assigned_to_department" text DEFAULT '' NOT NULL,
	"due_days" integer DEFAULT 7 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_onboarding_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"department_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_performance_cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"cycle_type" text NOT NULL,
	"year" integer NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_performance_kpis" (
	"id" serial PRIMARY KEY NOT NULL,
	"review_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"kpi_name" text NOT NULL,
	"kpi_description" text DEFAULT '' NOT NULL,
	"target_value" text DEFAULT '' NOT NULL,
	"actual_value" text DEFAULT '' NOT NULL,
	"weight" integer DEFAULT 0 NOT NULL,
	"score" numeric(5, 2),
	"comments" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_performance_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"reviewer_id" integer,
	"overall_score" numeric(5, 2),
	"overall_rating" text DEFAULT '' NOT NULL,
	"strengths" text DEFAULT '' NOT NULL,
	"improvements" text DEFAULT '' NOT NULL,
	"comments" text DEFAULT '' NOT NULL,
	"employee_comments" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp,
	"reviewed_at" timestamp,
	"acknowledged_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_violation_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"severity" text DEFAULT 'minor' NOT NULL,
	"default_sp_level" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hc_violation_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "hero_hc_certificates" ADD COLUMN "document_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_candidate_stages" ADD CONSTRAINT "hero_hc_candidate_stages_candidate_id_hero_hc_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."hero_hc_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD CONSTRAINT "hero_hc_candidates_recruitment_id_hero_hc_recruitments_id_fk" FOREIGN KEY ("recruitment_id") REFERENCES "public"."hero_hc_recruitments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_clearance_items" ADD CONSTRAINT "hero_hc_clearance_items_offboarding_id_hero_hc_offboarding_requests_id_fk" FOREIGN KEY ("offboarding_id") REFERENCES "public"."hero_hc_offboarding_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_disciplinary_actions" ADD CONSTRAINT "hero_hc_disciplinary_actions_employee_id_hero_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_disciplinary_actions" ADD CONSTRAINT "hero_hc_disciplinary_actions_violation_category_id_hero_hc_violation_categories_id_fk" FOREIGN KEY ("violation_category_id") REFERENCES "public"."hero_hc_violation_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_leave_balances" ADD CONSTRAINT "hero_hc_leave_balances_employee_id_hero_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_leave_balances" ADD CONSTRAINT "hero_hc_leave_balances_leave_type_id_hero_hc_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."hero_hc_leave_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_leave_requests" ADD CONSTRAINT "hero_hc_leave_requests_employee_id_hero_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_leave_requests" ADD CONSTRAINT "hero_hc_leave_requests_leave_type_id_hero_hc_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."hero_hc_leave_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_letters" ADD CONSTRAINT "hero_hc_letters_employee_id_hero_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_hr_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_offboarding_requests" ADD CONSTRAINT "hero_hc_offboarding_requests_employee_id_hero_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_onboarding_records" ADD CONSTRAINT "hero_hc_onboarding_records_employee_id_hero_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_onboarding_records" ADD CONSTRAINT "hero_hc_onboarding_records_template_id_hero_hc_onboarding_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."hero_hc_onboarding_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_onboarding_tasks" ADD CONSTRAINT "hero_hc_onboarding_tasks_record_id_hero_hc_onboarding_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."hero_hc_onboarding_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_onboarding_template_tasks" ADD CONSTRAINT "hero_hc_onboarding_template_tasks_template_id_hero_hc_onboarding_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."hero_hc_onboarding_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_onboarding_templates" ADD CONSTRAINT "hero_hc_onboarding_templates_department_id_hero_hr_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."hero_hr_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_performance_kpis" ADD CONSTRAINT "hero_hc_performance_kpis_review_id_hero_hc_performance_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."hero_hc_performance_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_performance_reviews" ADD CONSTRAINT "hero_hc_performance_reviews_cycle_id_hero_hc_performance_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."hero_hc_performance_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_performance_reviews" ADD CONSTRAINT "hero_hc_performance_reviews_employee_id_hero_hr_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_hr_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_performance_reviews" ADD CONSTRAINT "hero_hc_performance_reviews_reviewer_id_hero_hr_employees_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."hero_hr_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_leave_balance_emp_type_year" ON "hero_hc_leave_balances" USING btree ("employee_id","leave_type_id","year");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_letter_seq_type_year_month" ON "hero_hc_letter_sequences" USING btree ("letter_type","year","month");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_perf_review_cycle_emp" ON "hero_hc_performance_reviews" USING btree ("cycle_id","employee_id");