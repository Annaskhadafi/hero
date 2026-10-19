CREATE TABLE "hero_apd_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"summary_number" text NOT NULL,
	"section_id" integer NOT NULL,
	"target_site" text DEFAULT 'GABUNGAN' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"generated_by_employee_id" integer NOT NULL,
	"submitter_signature_url" text,
	"generated_at" timestamp,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_apd_summaries_summary_number_unique" UNIQUE("summary_number")
);
--> statement-breakpoint
CREATE TABLE "hero_apd_summary_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"summary_id" integer NOT NULL,
	"level" integer NOT NULL,
	"approver_employee_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"signature_url" text,
	"decision_note" text DEFAULT '' NOT NULL,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_apd_summary_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"summary_id" integer NOT NULL,
	"apd_request_id" integer NOT NULL,
	"master_apd_id" integer,
	"employee_id" integer NOT NULL,
	"employee_name" text NOT NULL,
	"employee_sn" text DEFAULT '' NOT NULL,
	"site_name" text DEFAULT '' NOT NULL,
	"item_name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"request_type" text DEFAULT 'baru' NOT NULL,
	"remarks" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_master_apd" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'APD' NOT NULL,
	"unit" text DEFAULT 'Pcs' NOT NULL,
	"has_size" boolean DEFAULT false NOT NULL,
	"size_options" jsonb DEFAULT '[]'::jsonb,
	"min_stock" integer DEFAULT 0 NOT NULL,
	"is_qty_only" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_master_apd_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hero_atk_request_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"master_atk_id" integer,
	"custom_item_name" text DEFAULT '' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit" text DEFAULT 'Pcs' NOT NULL,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_atk_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_number" text NOT NULL,
	"employee_id" integer NOT NULL,
	"site_id" integer NOT NULL,
	"department_id" integer,
	"request_type" text DEFAULT 'personal' NOT NULL,
	"target_recipient_name" text DEFAULT '' NOT NULL,
	"request_date" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'pending_approval' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"requester_signature_url" text,
	"processed_by_employee_id" integer,
	"reviewer_note" text DEFAULT '' NOT NULL,
	"reviewed_at" timestamp,
	"recipient_signature_url" text,
	"recipient_name" text DEFAULT '' NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_atk_requests_request_number_unique" UNIQUE("request_number")
);
--> statement-breakpoint
CREATE TABLE "hero_master_atk" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'Umum' NOT NULL,
	"unit" text DEFAULT 'Pcs' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"min_stock" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_master_atk_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hero_central_service_refueling_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"site_name" text DEFAULT '' NOT NULL,
	"driver_name" text DEFAULT '' NOT NULL,
	"driver_sn" text,
	"refuel_date" text DEFAULT '' NOT NULL,
	"unit_number" text DEFAULT '' NOT NULL,
	"odometer_km" integer DEFAULT 0 NOT NULL,
	"fuel_expenditure_type" text DEFAULT 'Di bebankan ke PT Chitra Paratama (Internal)' NOT NULL,
	"fuel_amount_liters" numeric(10, 2) DEFAULT '0' NOT NULL,
	"fuelman_name" text DEFAULT '' NOT NULL,
	"odometer_photo_url" text,
	"flowmeter_photo_url" text,
	"remarks" text DEFAULT '' NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_compensation_benefit" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"compensation_type" text NOT NULL,
	"nominal" integer DEFAULT 0 NOT NULL,
	"remarks" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_five_r_approval_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"level" integer NOT NULL,
	"role_label" text NOT NULL,
	"approver_employee_id" integer,
	"approver_name" text NOT NULL,
	"action" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"acted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_five_r_findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"row_order" integer DEFAULT 1 NOT NULL,
	"category_5r" text DEFAULT 'Rapi' NOT NULL,
	"area" text DEFAULT '' NOT NULL,
	"finding_description" text DEFAULT '' NOT NULL,
	"finding_photo_url" text DEFAULT '' NOT NULL,
	"action_description" text DEFAULT '' NOT NULL,
	"action_photo_url" text DEFAULT '' NOT NULL,
	"no_finding_photo_url" text DEFAULT '' NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_five_r_master_area_pic_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"master_area_id" integer NOT NULL,
	"previous_pic_employee_id" integer,
	"previous_pic_name" text,
	"new_pic_employee_id" integer,
	"new_pic_name" text,
	"action_type" text DEFAULT 'assigned' NOT NULL,
	"changed_by_employee_id" integer,
	"changed_by_name" text DEFAULT 'Admin' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_five_r_master_areas" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"area_scale" text DEFAULT 'medium' NOT NULL,
	"site_id" integer NOT NULL,
	"pic_employee_id" integer,
	"description" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_five_r_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_number" text NOT NULL,
	"master_area_id" integer,
	"pic_area_name" text DEFAULT '' NOT NULL,
	"site_id" integer,
	"auditor_id" integer,
	"auditor_name" text NOT NULL,
	"auditor_email" text DEFAULT '' NOT NULL,
	"audit_period" text NOT NULL,
	"audit_date" date NOT NULL,
	"report_type" text NOT NULL,
	"previous_report_id" integer,
	"score_rapi" integer DEFAULT 100 NOT NULL,
	"score_ringkas" integer DEFAULT 100 NOT NULL,
	"score_resik" integer DEFAULT 100 NOT NULL,
	"score_rawat" integer DEFAULT 100 NOT NULL,
	"score_rajin" integer DEFAULT 100 NOT NULL,
	"total_score" numeric(5, 2) DEFAULT '100.00' NOT NULL,
	"status" text DEFAULT 'pending_approval' NOT NULL,
	"current_approval_level" integer DEFAULT 1 NOT NULL,
	"reverted_from_level" integer,
	"approval_notes" text DEFAULT '' NOT NULL,
	"auditor_signature_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_five_r_reports_report_number_unique" UNIQUE("report_number")
);
--> statement-breakpoint
CREATE TABLE "hero_helpdesk_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"ai_enabled" boolean DEFAULT true NOT NULL,
	"ai_model" text DEFAULT 'openai/gpt-4o-mini' NOT NULL,
	"ai_system_prompt" text,
	"ai_greeting_message" text,
	"auto_escalate_keywords" jsonb DEFAULT '["kecelakaan","darurat","urgent","bahaya","kebakaran","tumpahan","breakdown"]'::jsonb NOT NULL,
	"max_bot_turns_before_escalate" integer DEFAULT 5 NOT NULL,
	"updated_by_employee_id" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_ticket_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"color" text DEFAULT '#3b82f6' NOT NULL,
	"icon" text DEFAULT 'HelpCircle' NOT NULL,
	"default_sla_hours" integer DEFAULT 24 NOT NULL,
	"is_ai_enabled" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_ticket_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hero_ticket_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"sender_type" text NOT NULL,
	"sender_customer_user_id" text,
	"sender_employee_id" integer,
	"message" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_internal_note" boolean DEFAULT false NOT NULL,
	"ai_tokens" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_ticket_routing_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"site_id" integer,
	"assigned_employee_id" integer,
	"notify_employee_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_number" text NOT NULL,
	"customer_id" integer NOT NULL,
	"site_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"customer_user_id" text NOT NULL,
	"title" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'bot_active' NOT NULL,
	"assigned_employee_id" integer,
	"claimed_at" timestamp,
	"ai_summary" text,
	"escalation_reason" text,
	"resolution_notes" text,
	"resolved_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "hero_genius_sop_approval_systems" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"document_number" varchar(100),
	"document_type" varchar(50) DEFAULT 'SOP',
	"department_code" varchar(50),
	"sop_document_id" integer,
	"transaction_type" varchar(100) DEFAULT 'activity' NOT NULL,
	"approval_mode" varchar(50) DEFAULT 'sequential' NOT NULL,
	"approval_steps" jsonb DEFAULT '[]'::jsonb,
	"site_approvals" jsonb DEFAULT '[]'::jsonb,
	"summary" text,
	"raw_sop_content" text,
	"ai_confidence_score" real DEFAULT 0.95,
	"compliance_audit_score" integer DEFAULT 95,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"published_matrix_id" integer,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_apd_summary_notification_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_emails" text DEFAULT '' NOT NULL,
	"cc_emails" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_attendance_notification_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"cc_emails" text DEFAULT '' NOT NULL,
	"head_section_mvc_email" text DEFAULT '' NOT NULL,
	"head_section_repair_email" text DEFAULT '' NOT NULL,
	"head_section_te_email" text DEFAULT '' NOT NULL,
	"head_section_others_email" text DEFAULT '' NOT NULL,
	"head_section_accessories_email" text DEFAULT '' NOT NULL,
	"sla_reminders_enabled" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_daily_activity_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"step_order" integer NOT NULL,
	"step_label" text DEFAULT '' NOT NULL,
	"approval_token" text NOT NULL,
	"approver_employee_id" integer,
	"approver_name" text DEFAULT '' NOT NULL,
	"approver_email" text DEFAULT '' NOT NULL,
	"approver_role" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"signature_data_url" text,
	"remarks" text DEFAULT '' NOT NULL,
	"signed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_daily_activity_approvals_approval_token_unique" UNIQUE("approval_token")
);
--> statement-breakpoint
CREATE TABLE "hero_daily_activity_session_item_team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_daily_activity_session_team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_employee_location_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"from_site_id" integer,
	"to_site_id" integer NOT NULL,
	"reason" text DEFAULT 'Pemindahan Lokasi' NOT NULL,
	"transfer_date" timestamp DEFAULT now() NOT NULL,
	"action_by_user_id" text,
	"action_by_name" text DEFAULT 'Admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_form_wo_approval_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"trakindo_approver_id" integer,
	"non_trakindo_approver_id" integer,
	"repair_approver_id" integer,
	"billing_approver_id" integer,
	"inventory_approver_id" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_contract_review_test_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"review_id" integer,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"access_token" text NOT NULL,
	"score" integer,
	"total_questions" integer DEFAULT 0 NOT NULL,
	"correct_answers" integer DEFAULT 0 NOT NULL,
	"has_passing_grade" boolean DEFAULT true NOT NULL,
	"passing_grade" integer DEFAULT 75 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"answers_payload" jsonb DEFAULT '{}'::jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hc_contract_review_test_attempts_access_token_unique" UNIQUE("access_token")
);
--> statement-breakpoint
CREATE TABLE "hero_hc_contract_review_test_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer,
	"section_name" text DEFAULT '' NOT NULL,
	"target_section_ids" jsonb DEFAULT '[]'::jsonb,
	"target_section_names" jsonb DEFAULT '[]'::jsonb,
	"review_type" text DEFAULT 'all' NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"has_passing_grade" boolean DEFAULT true NOT NULL,
	"passing_grade" integer DEFAULT 75 NOT NULL,
	"max_remedial_attempts" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_contract_review_test_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_id" integer NOT NULL,
	"question_text" text NOT NULL,
	"question_image_url" text DEFAULT '' NOT NULL,
	"option_a" text NOT NULL,
	"option_a_image_url" text DEFAULT '' NOT NULL,
	"option_b" text NOT NULL,
	"option_b_image_url" text DEFAULT '' NOT NULL,
	"option_c" text DEFAULT '' NOT NULL,
	"option_c_image_url" text DEFAULT '' NOT NULL,
	"option_d" text DEFAULT '' NOT NULL,
	"option_d_image_url" text DEFAULT '' NOT NULL,
	"correct_option" text DEFAULT 'A' NOT NULL,
	"explanation" text DEFAULT '' NOT NULL,
	"points" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_flight_route_change_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"step_order" integer NOT NULL,
	"step_key" text NOT NULL,
	"role_label" text NOT NULL,
	"approver_title" text DEFAULT '' NOT NULL,
	"approver_employee_id" integer,
	"approver_name" text DEFAULT '' NOT NULL,
	"approver_email" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"signature_data_url" text,
	"remarks" text DEFAULT '' NOT NULL,
	"signed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_flight_route_change_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"flight_date" date NOT NULL,
	"flight_route" text NOT NULL,
	"remark" text DEFAULT 'Offsite/ FB' NOT NULL,
	"sort_order" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_flight_route_change_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_number" text NOT NULL,
	"employee_id" integer,
	"employee_sn" text DEFAULT '' NOT NULL,
	"requestor_name" text NOT NULL,
	"job_title" text DEFAULT '' NOT NULL,
	"section_name" text DEFAULT '' NOT NULL,
	"department_name" text DEFAULT '' NOT NULL,
	"site_id" integer,
	"site_name" text DEFAULT '' NOT NULL,
	"origin_location" text DEFAULT 'Jambi' NOT NULL,
	"request_date" date NOT NULL,
	"poh_location" text DEFAULT 'Balikpapan' NOT NULL,
	"clause_accepted" boolean DEFAULT true NOT NULL,
	"current_step_order" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"rejection_reason" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hc_flight_route_change_requests_request_number_unique" UNIQUE("request_number")
);
--> statement-breakpoint
CREATE TABLE "hero_hc_turnover_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"movement_type" text NOT NULL,
	"employee_id" integer,
	"employee_sn" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"position" text DEFAULT '' NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"section" text DEFAULT '' NOT NULL,
	"point_of_hire" text DEFAULT '' NOT NULL,
	"movement_date" date NOT NULL,
	"remark" text NOT NULL,
	"recruitment_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_turnover_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"initial_headcount" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hc_turnover_settings_year_unique" UNIQUE("year")
);
--> statement-breakpoint
CREATE TABLE "hero_marital_status_notification_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_emails" text DEFAULT '' NOT NULL,
	"cc_emails" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_material_tools_notification_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_emails" text DEFAULT '' NOT NULL,
	"cc_emails" text DEFAULT 'muhammad.akbar@chitraparatama.co.id' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_mine_permit_reminder_sends" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"permit_expiry_date" date NOT NULL,
	"send_count" integer DEFAULT 0 NOT NULL,
	"last_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_overtime_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"overtime_command_letter_id" integer NOT NULL,
	"step_order" integer NOT NULL,
	"step_label" text DEFAULT '' NOT NULL,
	"approval_token" text NOT NULL,
	"approver_employee_id" integer,
	"approver_name" text DEFAULT '' NOT NULL,
	"approver_email" text DEFAULT '' NOT NULL,
	"approver_role" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"signature_data_url" text,
	"remarks" text DEFAULT '' NOT NULL,
	"signed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_overtime_approvals_approval_token_unique" UNIQUE("approval_token")
);
--> statement-breakpoint
CREATE TABLE "hero_ptw_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"ptw_permit_id" integer NOT NULL,
	"step_order" integer NOT NULL,
	"step_label" text DEFAULT '' NOT NULL,
	"approval_token" text NOT NULL,
	"approver_employee_id" integer,
	"approver_name" text DEFAULT '' NOT NULL,
	"approver_email" text DEFAULT '' NOT NULL,
	"approver_role" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"signature_data_url" text,
	"remarks" text DEFAULT '' NOT NULL,
	"signed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_ptw_approvals_approval_token_unique" UNIQUE("approval_token")
);
--> statement-breakpoint
CREATE TABLE "hero_reward_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'merchandise' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"points_required" integer NOT NULL,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"tier_eligibility" text DEFAULT 'all' NOT NULL,
	"eligible_site_ids" jsonb DEFAULT '[]'::jsonb,
	"eligible_department_ids" jsonb DEFAULT '[]'::jsonb,
	"eligible_section_ids" jsonb DEFAULT '[]'::jsonb,
	"is_year_end_bazaar" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_reward_items_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hero_reward_redemptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"redemption_number" text NOT NULL,
	"employee_id" integer NOT NULL,
	"reward_item_id" integer NOT NULL,
	"site_id" integer,
	"points_spent" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"request_note" text DEFAULT '' NOT NULL,
	"approved_by_employee_id" integer,
	"approval_notes" text DEFAULT '' NOT NULL,
	"delivery_status" text DEFAULT 'pending' NOT NULL,
	"tracking_or_receipt_info" text DEFAULT '' NOT NULL,
	"is_year_end_claim" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_reward_redemptions_redemption_number_unique" UNIQUE("redemption_number")
);
--> statement-breakpoint
CREATE TABLE "hero_safety_site_monthly_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"month" date NOT NULL,
	"nearmiss" integer DEFAULT 0 NOT NULL,
	"property_damage" integer DEFAULT 0 NOT NULL,
	"first_aid" integer DEFAULT 0 NOT NULL,
	"medical_treatment" integer DEFAULT 0 NOT NULL,
	"environmental" integer DEFAULT 0 NOT NULL,
	"major_injury" integer DEFAULT 0 NOT NULL,
	"fatality" integer DEFAULT 0 NOT NULL,
	"safety_man_hours" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_manpower" integer DEFAULT 0 NOT NULL,
	"sick_employees_count" integer DEFAULT 0 NOT NULL,
	"lost_days_count" integer DEFAULT 0 NOT NULL,
	"sick_letters_count" integer DEFAULT 0 NOT NULL,
	"occupational_diseases_count" integer DEFAULT 0 NOT NULL,
	"incident_notes" text DEFAULT 'Nihil' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_sop_win_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"step_order" integer NOT NULL,
	"step_label" text DEFAULT '' NOT NULL,
	"approval_token" text NOT NULL,
	"approver_employee_id" integer,
	"approver_name" text DEFAULT '' NOT NULL,
	"approver_email" text DEFAULT '' NOT NULL,
	"approver_role" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"signature_data_url" text,
	"remarks" text DEFAULT '' NOT NULL,
	"signed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_sop_win_approvals_approval_token_unique" UNIQUE("approval_token")
);
--> statement-breakpoint
CREATE TABLE "hero_sop_win_department_workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"department_code" text NOT NULL,
	"department_name" text NOT NULL,
	"steps" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_sop_win_department_workflows_department_code_unique" UNIQUE("department_code")
);
--> statement-breakpoint
CREATE TABLE "hero_sop_win_request_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"step_order" integer NOT NULL,
	"step_label" text DEFAULT '' NOT NULL,
	"approval_token" text NOT NULL,
	"approver_employee_id" integer,
	"approver_name" text DEFAULT '' NOT NULL,
	"approver_email" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"signature_data_url" text,
	"remarks" text DEFAULT '' NOT NULL,
	"signed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_sop_win_request_approvals_approval_token_unique" UNIQUE("approval_token")
);
--> statement-breakpoint
CREATE TABLE "hero_sop_win_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_number" text NOT NULL,
	"requester_employee_id" integer,
	"requester_name" text NOT NULL,
	"requester_department" text DEFAULT '' NOT NULL,
	"requested_doc_type" text DEFAULT 'SOP' NOT NULL,
	"procedure_name" text DEFAULT '' NOT NULL,
	"own_department" text DEFAULT '' NOT NULL,
	"is_process_owner" boolean DEFAULT false NOT NULL,
	"request_date" date DEFAULT now() NOT NULL,
	"is_external" boolean DEFAULT false NOT NULL,
	"external_company" text DEFAULT '' NOT NULL,
	"external_name" text DEFAULT '' NOT NULL,
	"request_reason" text DEFAULT '' NOT NULL,
	"requested_doc_count" integer DEFAULT 1 NOT NULL,
	"requested_doc_title_and_number" text DEFAULT '' NOT NULL,
	"file_attachment_url" text,
	"request_type" text DEFAULT 'softcopy' NOT NULL,
	"expiry_days" integer DEFAULT 3 NOT NULL,
	"access_expires_at" timestamp,
	"can_download" boolean DEFAULT true NOT NULL,
	"access_token" text NOT NULL,
	"status" text DEFAULT 'pending_ria' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_sop_win_requests_request_number_unique" UNIQUE("request_number"),
	CONSTRAINT "hero_sop_win_requests_access_token_unique" UNIQUE("access_token")
);
--> statement-breakpoint
CREATE TABLE "hero_training_request_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"step_order" integer NOT NULL,
	"approval_token" text NOT NULL,
	"role_label" text NOT NULL,
	"approver_employee_id" integer,
	"approver_name" text NOT NULL,
	"approver_email" text DEFAULT '' NOT NULL,
	"approver_title" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"signature_data_url" text,
	"remarks" text DEFAULT '' NOT NULL,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_training_request_approvals_approval_token_unique" UNIQUE("approval_token")
);
--> statement-breakpoint
CREATE TABLE "hero_training_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_number" text NOT NULL,
	"document_code" text DEFAULT 'F.HR.STD.011.00' NOT NULL,
	"revision" text DEFAULT '00' NOT NULL,
	"requester_employee_id" integer,
	"requester_name" text NOT NULL,
	"requester_email" text DEFAULT '' NOT NULL,
	"requester_department" text DEFAULT '' NOT NULL,
	"requester_position" text DEFAULT '' NOT NULL,
	"participants_type" text DEFAULT 'employees' NOT NULL,
	"participant_employee_ids" jsonb DEFAULT '[]',
	"participant_names" text DEFAULT '' NOT NULL,
	"participant_details" jsonb DEFAULT '[]',
	"job_level" text DEFAULT '' NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"work_location" text DEFAULT '' NOT NULL,
	"training_title" text NOT NULL,
	"training_type" text DEFAULT 'Training' NOT NULL,
	"training_category" text DEFAULT 'External' NOT NULL,
	"training_date" text DEFAULT '' NOT NULL,
	"training_venue" text DEFAULT '' NOT NULL,
	"cost_amount" text DEFAULT '0' NOT NULL,
	"cost_currency" text DEFAULT 'IDR' NOT NULL,
	"cost_notes" text DEFAULT '' NOT NULL,
	"provider_name" text DEFAULT '' NOT NULL,
	"provider_contact" text DEFAULT '' NOT NULL,
	"objectives" jsonb DEFAULT '[]',
	"past_trainings" jsonb DEFAULT '[]',
	"attachment_url" text,
	"attachment_name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"current_step_order" integer DEFAULT 1 NOT NULL,
	"total_steps" integer DEFAULT 5 NOT NULL,
	"is_synced_to_records" boolean DEFAULT false NOT NULL,
	"synced_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_training_requests_request_number_unique" UNIQUE("request_number")
);
--> statement-breakpoint
CREATE TABLE "hero_hse_osm_findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"finding_number" text NOT NULL,
	"finding_date" text NOT NULL,
	"finding_time" text NOT NULL,
	"classification_id" integer,
	"classification_name" text NOT NULL,
	"description" text NOT NULL,
	"photo_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_level" text DEFAULT 'MEDIUM' NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"action_required" text DEFAULT '',
	"action_taken" text DEFAULT '',
	"action_photo_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"action_submitted_at" timestamp,
	"action_submitted_by" text,
	"verified_at" timestamp,
	"verified_by" text,
	"rejection_reason" text DEFAULT '',
	"due_date" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "hero_hse_osm_findings_finding_number_unique" UNIQUE("finding_number")
);
--> statement-breakpoint
CREATE TABLE "hero_hse_osm_master_classifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hse_osm_master_classifications_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hero_hse_osm_master_focus_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hse_osm_master_focus_items_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hero_hse_osm_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_number" text NOT NULL,
	"site_id" integer,
	"inspection_date" text NOT NULL,
	"inspection_time" text NOT NULL,
	"location_area" text NOT NULL,
	"location_detail" text DEFAULT '',
	"latitude" text DEFAULT '',
	"longitude" text DEFAULT '',
	"gps_accuracy" text DEFAULT '',
	"focus_item_id" integer,
	"focus_item_name" text NOT NULL,
	"lead_employee_id" integer,
	"lead_employee_name" text NOT NULL,
	"lead_badge_number" text NOT NULL,
	"lead_department" text NOT NULL,
	"lead_company" text DEFAULT 'PT Chitra Paratama' NOT NULL,
	"lead_role" text DEFAULT '',
	"notes" text DEFAULT '',
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "hero_hse_osm_sessions_session_number_unique" UNIQUE("session_number")
);
--> statement-breakpoint
CREATE TABLE "hero_hse_osm_team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"employee_id" integer,
	"badge_number" text NOT NULL,
	"name" text NOT NULL,
	"department" text NOT NULL,
	"company" text DEFAULT 'PT Chitra Paratama' NOT NULL,
	"is_team_leader" boolean DEFAULT false NOT NULL,
	"is_external" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_tire_repair_inspections" (
	"id" serial PRIMARY KEY NOT NULL,
	"serial_number" varchar(100) NOT NULL,
	"customer" varchar(150) DEFAULT 'PT Kaltim Prima Coal' NOT NULL,
	"customer_site" varchar(150) DEFAULT 'Sangatta KPC' NOT NULL,
	"inspect_location" varchar(150) NOT NULL,
	"date_inspect" timestamp DEFAULT now() NOT NULL,
	"date_received" timestamp DEFAULT now() NOT NULL,
	"report_by" varchar(150) NOT NULL,
	"repair_duration" varchar(10) DEFAULT 'R1' NOT NULL,
	"max_days" integer DEFAULT 4 NOT NULL,
	"repair_completed_date" timestamp,
	"cargo_manifest_no" varchar(100),
	"rtd_1" varchar(50),
	"rtd_2" varchar(50),
	"remarks" text,
	"tire_size" varchar(100) NOT NULL,
	"is_custom_tire_size" boolean DEFAULT false NOT NULL,
	"brand" varchar(100),
	"type_construction" varchar(50) DEFAULT 'RADIAL' NOT NULL,
	"pattern" varchar(100),
	"status" varchar(50) DEFAULT 'Repair' NOT NULL,
	"removal_reason" varchar(255),
	"scrap_reason" varchar(255),
	"deffectex_repair" varchar(255),
	"vehicle" varchar(100),
	"wheel_position" varchar(100),
	"hours" varchar(50),
	"hours_since_last_repair" varchar(50),
	"pit_location" varchar(150),
	"marking" varchar(255),
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_tire_repair_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"inspection_id" integer NOT NULL,
	"photo_area" varchar(255) NOT NULL,
	"photo_url" text NOT NULL,
	"photo_type" varchar(50) DEFAULT 'INSPECTION' NOT NULL,
	"inspect_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_user_pinned_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"pinned_titles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maestro_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_type" text DEFAULT 'internal' NOT NULL,
	"actor_user_id" text,
	"actor_employee_id" integer,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"customer_id" integer,
	"site_id" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maestro_customer_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"account_id" text NOT NULL,
	"password_hash" text,
	"access_token" text,
	"refresh_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maestro_customer_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maestro_customer_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"customer_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maestro_customer_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "maestro_customer_sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"site_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maestro_customer_user_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"customer_id" integer NOT NULL,
	"location_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maestro_customer_user_sites" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"customer_id" integer NOT NULL,
	"site_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maestro_customer_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"image" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maestro_customer_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maestro_page_registry" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"path" text NOT NULL,
	"label" text NOT NULL,
	"module" text NOT NULL,
	"permission_code" text NOT NULL,
	"menu_group" text DEFAULT 'MAESTRO' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"requires_site_scope" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "maestro_page_registry_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "maestro_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"module" text NOT NULL,
	"action" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "maestro_permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "maestro_role_permissions" (
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maestro_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "maestro_roles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "maestro_user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maestro_visibility_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"can_view_employee_names" boolean DEFAULT false NOT NULL,
	"can_view_attendance_detail" boolean DEFAULT false NOT NULL,
	"can_view_activity_photos" boolean DEFAULT false NOT NULL,
	"can_view_safety_details" boolean DEFAULT true NOT NULL,
	"can_view_financial_amounts" boolean DEFAULT false NOT NULL,
	"can_download_documents" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "maestro_visibility_policies_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "hero_marital_status_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_number" text NOT NULL,
	"employee_id" integer NOT NULL,
	"submitted_by_employee_id" integer,
	"site_id" integer,
	"request_date" timestamp DEFAULT now() NOT NULL,
	"current_marital_status" text NOT NULL,
	"target_marital_status" text NOT NULL,
	"reason" text NOT NULL,
	"marriage_date" timestamp,
	"spouse_name" text,
	"residence_status" text,
	"dependents_count" integer DEFAULT 0 NOT NULL,
	"attachment_url" text,
	"attachment_name" text,
	"status" text DEFAULT 'pending_approval' NOT NULL,
	"signature_url" text,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_marital_status_requests_request_number_unique" UNIQUE("request_number")
);
--> statement-breakpoint
CREATE TABLE "hero_vehicle_service_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" integer NOT NULL,
	"service_date" date NOT NULL,
	"service_type" text DEFAULT 'Routine Service' NOT NULL,
	"odometer" integer DEFAULT 0,
	"workshop_name" text DEFAULT '' NOT NULL,
	"cost" numeric(14, 2) DEFAULT '0',
	"description" text DEFAULT '' NOT NULL,
	"invoice_url" text,
	"performed_by_employee_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_code" text NOT NULL,
	"vehicle_type" text NOT NULL,
	"category" text NOT NULL,
	"plate_number" text NOT NULL,
	"manufacture_year" integer NOT NULL,
	"vin_number" text DEFAULT '' NOT NULL,
	"engine_number" text DEFAULT '' NOT NULL,
	"color" text DEFAULT 'Putih' NOT NULL,
	"ownership" text DEFAULT 'owned' NOT NULL,
	"rental_vendor" text,
	"rental_cost_monthly" numeric(14, 2),
	"rental_start_date" date,
	"rental_end_date" date,
	"stnk_expiry_date" date,
	"tax_expiry_date" date,
	"kir_expiry_date" date,
	"last_service_date" date,
	"last_service_odometer" integer DEFAULT 0,
	"next_service_date" date,
	"next_service_odometer" integer DEFAULT 0,
	"holder_name" text DEFAULT '' NOT NULL,
	"holder_employee_id" integer,
	"site_id" integer,
	"location_name" text DEFAULT 'Balikpapan' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"photo_url" text,
	"stnk_document_url" text,
	"tax_document_url" text,
	"kir_document_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_vehicles_vehicle_code_unique" UNIQUE("vehicle_code"),
	CONSTRAINT "hero_vehicles_plate_number_unique" UNIQUE("plate_number")
);
--> statement-breakpoint
CREATE TABLE "hero_tire_repair_jobcard_injuries" (
	"id" serial PRIMARY KEY NOT NULL,
	"jobcard_id" integer NOT NULL,
	"injury_name" varchar(150) NOT NULL,
	"injury_date" timestamp DEFAULT now() NOT NULL,
	"dimensi_luka_l" varchar(50),
	"dimensi_luka_w" varchar(50),
	"dimensi_luka_p" varchar(50),
	"dimensi_luka_t" varchar(50),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_tire_repair_jobcard_processes" (
	"id" serial PRIMARY KEY NOT NULL,
	"injury_id" integer NOT NULL,
	"process_name" varchar(100) NOT NULL,
	"material_used" varchar(255),
	"qty" varchar(100),
	"hours" varchar(100),
	"by_whom" varchar(255),
	"hardness" varchar(100),
	"sn_heat_pad" varchar(100),
	"sign_qc" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_tire_repair_jobcards" (
	"id" serial PRIMARY KEY NOT NULL,
	"jobcard_no" varchar(100) NOT NULL,
	"wo_no" varchar(100),
	"wo_date" timestamp,
	"inspection_id" integer,
	"plant" varchar(150) DEFAULT 'Workshop Sangatta' NOT NULL,
	"customer_name" varchar(255) DEFAULT 'PT Kaltim Prima Coal' NOT NULL,
	"customer_id" varchar(100),
	"received_date" timestamp DEFAULT now() NOT NULL,
	"serial_number" varchar(100) NOT NULL,
	"tire_size" varchar(100) NOT NULL,
	"brand" varchar(100),
	"pattern" varchar(100),
	"tire_construction" varchar(50) DEFAULT 'RADIAL' NOT NULL,
	"status" varchar(50) DEFAULT 'In Progress' NOT NULL,
	"off_repair_date" timestamp,
	"sign_qc" varchar(255),
	"by_head_section" varchar(255),
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_tire_repair_jobcards_jobcard_no_unique" UNIQUE("jobcard_no")
);
--> statement-breakpoint
ALTER TABLE "hero_form_submissions" DROP CONSTRAINT "hero_form_submissions_requester_employee_id_hero_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "hero_form_submissions" ALTER COLUMN "requester_employee_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_apd_requests" ADD COLUMN "target_section_id" integer;--> statement-breakpoint
ALTER TABLE "hero_apd_requests" ADD COLUMN "requested_for" text DEFAULT 'self' NOT NULL;--> statement-breakpoint
ALTER TABLE "repair_form_wo" ADD COLUMN "submitter_signature_url" text;--> statement-breakpoint
ALTER TABLE "hero_activities" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "hero_activities" ADD COLUMN "deleted_by_employee_id" integer;--> statement-breakpoint
ALTER TABLE "hero_apd_notification_config" ADD COLUMN "service_cc_email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_apd_notification_config" ADD COLUMN "repair_cc_email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_apd_notification_config" ADD COLUMN "te_cc_email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_apd_notification_config" ADD COLUMN "service_reminder_email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_apd_notification_config" ADD COLUMN "repair_reminder_email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_apd_notification_config" ADD COLUMN "te_reminder_email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "repair_form_wo_id" integer;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "apd_summary_id" integer;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "five_r_report_id" integer;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "tire_jobcard_id" integer;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "marital_status_request_id" integer;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "approver_email" text;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "activity_type" text;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "request_number" text;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "activity_code" text;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "activity_title" text;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "form_name" text;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "created_by" integer;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_enrollments" ADD COLUMN "cooldown_until" timestamp;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_session_items" ADD COLUMN "tire_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_sessions" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_sessions" ADD COLUMN "deleted_by_employee_id" integer;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "spouse_name" text;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "marriage_date" date;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "residence_status" text;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "direct_manager_ids" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "signature_data_url" text;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "signature_registered_at" timestamp;--> statement-breakpoint
ALTER TABLE "hero_form_submission_values" ADD COLUMN "numeric_value" integer;--> statement-breakpoint
ALTER TABLE "hero_form_submission_values" ADD COLUMN "json_value" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_form_submissions" ADD COLUMN "respondent_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_form_submissions" ADD COLUMN "respondent_email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_form_submissions" ADD COLUMN "respondent_phone" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_form_submissions" ADD COLUMN "respondent_metadata_json" text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_form_submissions" ADD COLUMN "started_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_form_submissions" ADD COLUMN "duration_seconds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_form_submissions" ADD COLUMN "ip_address" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_form_submissions" ADD COLUMN "user_agent" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_form_submissions" ADD COLUMN "is_public_submission" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_form_template_fields" ADD COLUMN "logic_rules_json" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_form_templates" ADD COLUMN "slug" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_form_templates" ADD COLUMN "theme_config_json" text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_form_templates" ADD COLUMN "settings_json" text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_form_templates" ADD COLUMN "view_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_form_templates" ADD COLUMN "start_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_form_templates" ADD COLUMN "completion_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_disciplinary_actions" ADD COLUMN "issuer_department" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_disciplinary_actions" ADD COLUMN "issuer_signature" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_disciplinary_actions" ADD COLUMN "use_letterhead" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_employee_contract_reviews" ADD COLUMN "leader_title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_employee_contract_reviews" ADD COLUMN "superior_title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_employee_contract_reviews" ADD COLUMN "hr_title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_employee_contract_reviews" ADD COLUMN "next_superior_title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_employee_contract_reviews" ADD COLUMN "attachments" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "hero_hc_employee_contract_reviews" ADD COLUMN "test_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_employee_contract_reviews" ADD COLUMN "test_config_id" integer;--> statement-breakpoint
ALTER TABLE "hero_hc_employee_contract_reviews" ADD COLUMN "test_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_employee_contract_reviews" ADD COLUMN "test_final_score" integer;--> statement-breakpoint
ALTER TABLE "hero_hc_employee_contract_reviews" ADD COLUMN "test_attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_employee_contract_reviews" ADD COLUMN "test_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "hero_hc_employee_contract_reviews" ADD COLUMN "allow_approver_customization" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hse_ptw_permits" ADD COLUMN "sub_types" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hse_ptw_permits" ADD COLUMN "additional_notes" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_mine_permit_reminder_config" ADD COLUMN "site_id" integer;--> statement-breakpoint
ALTER TABLE "hero_mine_permit_reminder_config" ADD COLUMN "interval_days" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_mine_permit_reminder_config" ADD COLUMN "recipient_employee_ids" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_mine_permit_reminder_config" ADD COLUMN "cc_employee_ids" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_mine_permit_reminder_config" ADD COLUMN "additional_cc_emails" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_mine_permit_reminder_config" ADD COLUMN "last_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "hero_mine_permit_reminder_config" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "hero_sites" ADD COLUMN "allow_outside_attendance" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_sites" ADD COLUMN "timezone" text DEFAULT 'WITA' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_training_records" ADD COLUMN "completed_date" text;--> statement-breakpoint
ALTER TABLE "hero_training_records" ADD COLUMN "completed_month" text;--> statement-breakpoint
ALTER TABLE "hero_service360_quotations" ADD COLUMN "include_roster" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_timesheet_scheduling_configs" ADD COLUMN "timezone" text DEFAULT 'WITA' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_apd_summaries" ADD CONSTRAINT "hero_apd_summaries_section_id_hero_master_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."hero_master_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_apd_summaries" ADD CONSTRAINT "hero_apd_summaries_generated_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("generated_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_apd_summary_approvals" ADD CONSTRAINT "hero_apd_summary_approvals_summary_id_hero_apd_summaries_id_fk" FOREIGN KEY ("summary_id") REFERENCES "public"."hero_apd_summaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_apd_summary_approvals" ADD CONSTRAINT "hero_apd_summary_approvals_approver_employee_id_hero_employees_id_fk" FOREIGN KEY ("approver_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_apd_summary_items" ADD CONSTRAINT "hero_apd_summary_items_summary_id_hero_apd_summaries_id_fk" FOREIGN KEY ("summary_id") REFERENCES "public"."hero_apd_summaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_apd_summary_items" ADD CONSTRAINT "hero_apd_summary_items_apd_request_id_hero_apd_requests_id_fk" FOREIGN KEY ("apd_request_id") REFERENCES "public"."hero_apd_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_apd_summary_items" ADD CONSTRAINT "hero_apd_summary_items_master_apd_id_hero_master_apd_id_fk" FOREIGN KEY ("master_apd_id") REFERENCES "public"."hero_master_apd"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_apd_summary_items" ADD CONSTRAINT "hero_apd_summary_items_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_atk_request_items" ADD CONSTRAINT "hero_atk_request_items_request_id_hero_atk_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."hero_atk_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_atk_request_items" ADD CONSTRAINT "hero_atk_request_items_master_atk_id_hero_master_atk_id_fk" FOREIGN KEY ("master_atk_id") REFERENCES "public"."hero_master_atk"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_atk_requests" ADD CONSTRAINT "hero_atk_requests_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_atk_requests" ADD CONSTRAINT "hero_atk_requests_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_atk_requests" ADD CONSTRAINT "hero_atk_requests_department_id_hero_master_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."hero_master_departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_atk_requests" ADD CONSTRAINT "hero_atk_requests_processed_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("processed_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_central_service_refueling_logs" ADD CONSTRAINT "hero_central_service_refueling_logs_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_compensation_benefit" ADD CONSTRAINT "hero_compensation_benefit_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_five_r_approval_logs" ADD CONSTRAINT "hero_five_r_approval_logs_report_id_hero_five_r_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."hero_five_r_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_five_r_approval_logs" ADD CONSTRAINT "hero_five_r_approval_logs_approver_employee_id_hero_employees_id_fk" FOREIGN KEY ("approver_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_five_r_findings" ADD CONSTRAINT "hero_five_r_findings_report_id_hero_five_r_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."hero_five_r_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_five_r_master_area_pic_history" ADD CONSTRAINT "hero_five_r_master_area_pic_history_master_area_id_hero_five_r_master_areas_id_fk" FOREIGN KEY ("master_area_id") REFERENCES "public"."hero_five_r_master_areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_five_r_master_area_pic_history" ADD CONSTRAINT "hero_five_r_master_area_pic_history_previous_pic_employee_id_hero_employees_id_fk" FOREIGN KEY ("previous_pic_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_five_r_master_area_pic_history" ADD CONSTRAINT "hero_five_r_master_area_pic_history_new_pic_employee_id_hero_employees_id_fk" FOREIGN KEY ("new_pic_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_five_r_master_area_pic_history" ADD CONSTRAINT "hero_five_r_master_area_pic_history_changed_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("changed_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_five_r_master_areas" ADD CONSTRAINT "hero_five_r_master_areas_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_five_r_master_areas" ADD CONSTRAINT "hero_five_r_master_areas_pic_employee_id_hero_employees_id_fk" FOREIGN KEY ("pic_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_five_r_reports" ADD CONSTRAINT "hero_five_r_reports_master_area_id_hero_five_r_master_areas_id_fk" FOREIGN KEY ("master_area_id") REFERENCES "public"."hero_five_r_master_areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_five_r_reports" ADD CONSTRAINT "hero_five_r_reports_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_five_r_reports" ADD CONSTRAINT "hero_five_r_reports_auditor_id_hero_employees_id_fk" FOREIGN KEY ("auditor_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_helpdesk_settings" ADD CONSTRAINT "hero_helpdesk_settings_updated_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("updated_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_ticket_messages" ADD CONSTRAINT "hero_ticket_messages_ticket_id_hero_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."hero_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_ticket_messages" ADD CONSTRAINT "hero_ticket_messages_sender_customer_user_id_maestro_customer_users_id_fk" FOREIGN KEY ("sender_customer_user_id") REFERENCES "public"."maestro_customer_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_ticket_messages" ADD CONSTRAINT "hero_ticket_messages_sender_employee_id_hero_employees_id_fk" FOREIGN KEY ("sender_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_ticket_routing_rules" ADD CONSTRAINT "hero_ticket_routing_rules_category_id_hero_ticket_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."hero_ticket_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_ticket_routing_rules" ADD CONSTRAINT "hero_ticket_routing_rules_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_ticket_routing_rules" ADD CONSTRAINT "hero_ticket_routing_rules_assigned_employee_id_hero_employees_id_fk" FOREIGN KEY ("assigned_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_tickets" ADD CONSTRAINT "hero_tickets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_tickets" ADD CONSTRAINT "hero_tickets_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_tickets" ADD CONSTRAINT "hero_tickets_category_id_hero_ticket_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."hero_ticket_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_tickets" ADD CONSTRAINT "hero_tickets_customer_user_id_maestro_customer_users_id_fk" FOREIGN KEY ("customer_user_id") REFERENCES "public"."maestro_customer_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_tickets" ADD CONSTRAINT "hero_tickets_assigned_employee_id_hero_employees_id_fk" FOREIGN KEY ("assigned_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_genius_sop_approval_systems" ADD CONSTRAINT "hero_genius_sop_approval_systems_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_approvals" ADD CONSTRAINT "hero_daily_activity_approvals_session_id_hero_daily_activity_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hero_daily_activity_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_approvals" ADD CONSTRAINT "hero_daily_activity_approvals_approver_employee_id_hero_employees_id_fk" FOREIGN KEY ("approver_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_session_item_team_members" ADD CONSTRAINT "hero_daily_activity_session_item_team_members_item_id_hero_daily_activity_session_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."hero_daily_activity_session_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_session_item_team_members" ADD CONSTRAINT "hero_daily_activity_session_item_team_members_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_session_team_members" ADD CONSTRAINT "hero_daily_activity_session_team_members_session_id_hero_daily_activity_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hero_daily_activity_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_session_team_members" ADD CONSTRAINT "hero_daily_activity_session_team_members_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_employee_location_transfers" ADD CONSTRAINT "hero_employee_location_transfers_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_employee_location_transfers" ADD CONSTRAINT "hero_employee_location_transfers_from_site_id_hero_sites_id_fk" FOREIGN KEY ("from_site_id") REFERENCES "public"."hero_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_employee_location_transfers" ADD CONSTRAINT "hero_employee_location_transfers_to_site_id_hero_sites_id_fk" FOREIGN KEY ("to_site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_form_wo_approval_settings" ADD CONSTRAINT "hero_form_wo_approval_settings_trakindo_approver_id_hero_employees_id_fk" FOREIGN KEY ("trakindo_approver_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_form_wo_approval_settings" ADD CONSTRAINT "hero_form_wo_approval_settings_non_trakindo_approver_id_hero_employees_id_fk" FOREIGN KEY ("non_trakindo_approver_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_form_wo_approval_settings" ADD CONSTRAINT "hero_form_wo_approval_settings_repair_approver_id_hero_employees_id_fk" FOREIGN KEY ("repair_approver_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_form_wo_approval_settings" ADD CONSTRAINT "hero_form_wo_approval_settings_billing_approver_id_hero_employees_id_fk" FOREIGN KEY ("billing_approver_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_form_wo_approval_settings" ADD CONSTRAINT "hero_form_wo_approval_settings_inventory_approver_id_hero_employees_id_fk" FOREIGN KEY ("inventory_approver_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_contract_review_test_attempts" ADD CONSTRAINT "hero_hc_contract_review_test_attempts_config_id_hero_hc_contract_review_test_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."hero_hc_contract_review_test_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_contract_review_test_attempts" ADD CONSTRAINT "hero_hc_contract_review_test_attempts_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_contract_review_test_attempts" ADD CONSTRAINT "hero_hc_contract_review_test_attempts_review_id_hero_hc_employee_contract_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."hero_hc_employee_contract_reviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_contract_review_test_configs" ADD CONSTRAINT "hero_hc_contract_review_test_configs_section_id_hero_master_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."hero_master_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_contract_review_test_questions" ADD CONSTRAINT "hero_hc_contract_review_test_questions_config_id_hero_hc_contract_review_test_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."hero_hc_contract_review_test_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_flight_route_change_approvals" ADD CONSTRAINT "hero_hc_flight_route_change_approvals_request_id_hero_hc_flight_route_change_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."hero_hc_flight_route_change_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_flight_route_change_approvals" ADD CONSTRAINT "hero_hc_flight_route_change_approvals_approver_employee_id_hero_employees_id_fk" FOREIGN KEY ("approver_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_flight_route_change_items" ADD CONSTRAINT "hero_hc_flight_route_change_items_request_id_hero_hc_flight_route_change_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."hero_hc_flight_route_change_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_flight_route_change_requests" ADD CONSTRAINT "hero_hc_flight_route_change_requests_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_flight_route_change_requests" ADD CONSTRAINT "hero_hc_flight_route_change_requests_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_turnover_movements" ADD CONSTRAINT "hero_hc_turnover_movements_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_mine_permit_reminder_sends" ADD CONSTRAINT "hero_mine_permit_reminder_sends_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_mine_permit_reminder_sends" ADD CONSTRAINT "hero_mine_permit_reminder_sends_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_overtime_approvals" ADD CONSTRAINT "hero_overtime_approvals_overtime_command_letter_id_hero_overtime_command_letters_id_fk" FOREIGN KEY ("overtime_command_letter_id") REFERENCES "public"."hero_overtime_command_letters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_overtime_approvals" ADD CONSTRAINT "hero_overtime_approvals_approver_employee_id_hero_employees_id_fk" FOREIGN KEY ("approver_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_ptw_approvals" ADD CONSTRAINT "hero_ptw_approvals_ptw_permit_id_hero_hse_ptw_permits_id_fk" FOREIGN KEY ("ptw_permit_id") REFERENCES "public"."hero_hse_ptw_permits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_ptw_approvals" ADD CONSTRAINT "hero_ptw_approvals_approver_employee_id_hero_employees_id_fk" FOREIGN KEY ("approver_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_reward_redemptions" ADD CONSTRAINT "hero_reward_redemptions_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_reward_redemptions" ADD CONSTRAINT "hero_reward_redemptions_reward_item_id_hero_reward_items_id_fk" FOREIGN KEY ("reward_item_id") REFERENCES "public"."hero_reward_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_reward_redemptions" ADD CONSTRAINT "hero_reward_redemptions_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_reward_redemptions" ADD CONSTRAINT "hero_reward_redemptions_approved_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("approved_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_safety_site_monthly_summary" ADD CONSTRAINT "hero_safety_site_monthly_summary_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_sop_win_approvals" ADD CONSTRAINT "hero_sop_win_approvals_document_id_hero_sop_win_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."hero_sop_win_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_sop_win_approvals" ADD CONSTRAINT "hero_sop_win_approvals_approver_employee_id_hero_employees_id_fk" FOREIGN KEY ("approver_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_sop_win_request_approvals" ADD CONSTRAINT "hero_sop_win_request_approvals_request_id_hero_sop_win_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."hero_sop_win_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_sop_win_request_approvals" ADD CONSTRAINT "hero_sop_win_request_approvals_approver_employee_id_hero_employees_id_fk" FOREIGN KEY ("approver_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_sop_win_requests" ADD CONSTRAINT "hero_sop_win_requests_requester_employee_id_hero_employees_id_fk" FOREIGN KEY ("requester_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_training_request_approvals" ADD CONSTRAINT "hero_training_request_approvals_request_id_hero_training_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."hero_training_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_training_request_approvals" ADD CONSTRAINT "hero_training_request_approvals_approver_employee_id_hero_employees_id_fk" FOREIGN KEY ("approver_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_training_requests" ADD CONSTRAINT "hero_training_requests_requester_employee_id_hero_employees_id_fk" FOREIGN KEY ("requester_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hse_osm_findings" ADD CONSTRAINT "hero_hse_osm_findings_session_id_hero_hse_osm_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hero_hse_osm_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hse_osm_findings" ADD CONSTRAINT "hero_hse_osm_findings_classification_id_hero_hse_osm_master_classifications_id_fk" FOREIGN KEY ("classification_id") REFERENCES "public"."hero_hse_osm_master_classifications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hse_osm_sessions" ADD CONSTRAINT "hero_hse_osm_sessions_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hse_osm_sessions" ADD CONSTRAINT "hero_hse_osm_sessions_focus_item_id_hero_hse_osm_master_focus_items_id_fk" FOREIGN KEY ("focus_item_id") REFERENCES "public"."hero_hse_osm_master_focus_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hse_osm_sessions" ADD CONSTRAINT "hero_hse_osm_sessions_lead_employee_id_hero_employees_id_fk" FOREIGN KEY ("lead_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hse_osm_team_members" ADD CONSTRAINT "hero_hse_osm_team_members_session_id_hero_hse_osm_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hero_hse_osm_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hse_osm_team_members" ADD CONSTRAINT "hero_hse_osm_team_members_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_tire_repair_inspections" ADD CONSTRAINT "hero_tire_repair_inspections_created_by_hero_employees_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_tire_repair_photos" ADD CONSTRAINT "hero_tire_repair_photos_inspection_id_hero_tire_repair_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."hero_tire_repair_inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_audit_logs" ADD CONSTRAINT "maestro_audit_logs_actor_user_id_maestro_customer_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."maestro_customer_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_audit_logs" ADD CONSTRAINT "maestro_audit_logs_actor_employee_id_hero_employees_id_fk" FOREIGN KEY ("actor_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_audit_logs" ADD CONSTRAINT "maestro_audit_logs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_audit_logs" ADD CONSTRAINT "maestro_audit_logs_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_customer_accounts" ADD CONSTRAINT "maestro_customer_accounts_user_id_maestro_customer_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."maestro_customer_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_customer_locations" ADD CONSTRAINT "maestro_customer_locations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_customer_locations" ADD CONSTRAINT "maestro_customer_locations_location_id_hero_sites_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_customer_memberships" ADD CONSTRAINT "maestro_customer_memberships_user_id_maestro_customer_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."maestro_customer_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_customer_memberships" ADD CONSTRAINT "maestro_customer_memberships_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_customer_sessions" ADD CONSTRAINT "maestro_customer_sessions_user_id_maestro_customer_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."maestro_customer_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_customer_sites" ADD CONSTRAINT "maestro_customer_sites_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_customer_sites" ADD CONSTRAINT "maestro_customer_sites_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_customer_user_locations" ADD CONSTRAINT "maestro_customer_user_locations_user_id_maestro_customer_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."maestro_customer_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_customer_user_locations" ADD CONSTRAINT "maestro_customer_user_locations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_customer_user_locations" ADD CONSTRAINT "maestro_customer_user_locations_location_id_hero_sites_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_customer_user_sites" ADD CONSTRAINT "maestro_customer_user_sites_user_id_maestro_customer_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."maestro_customer_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_customer_user_sites" ADD CONSTRAINT "maestro_customer_user_sites_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_customer_user_sites" ADD CONSTRAINT "maestro_customer_user_sites_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_role_permissions" ADD CONSTRAINT "maestro_role_permissions_role_id_maestro_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."maestro_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_role_permissions" ADD CONSTRAINT "maestro_role_permissions_permission_id_maestro_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."maestro_permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_user_roles" ADD CONSTRAINT "maestro_user_roles_user_id_maestro_customer_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."maestro_customer_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_user_roles" ADD CONSTRAINT "maestro_user_roles_role_id_maestro_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."maestro_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maestro_visibility_policies" ADD CONSTRAINT "maestro_visibility_policies_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_marital_status_requests" ADD CONSTRAINT "hero_marital_status_requests_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_marital_status_requests" ADD CONSTRAINT "hero_marital_status_requests_submitted_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("submitted_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_marital_status_requests" ADD CONSTRAINT "hero_marital_status_requests_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_vehicle_service_logs" ADD CONSTRAINT "hero_vehicle_service_logs_vehicle_id_hero_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."hero_vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_vehicle_service_logs" ADD CONSTRAINT "hero_vehicle_service_logs_performed_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("performed_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_vehicles" ADD CONSTRAINT "hero_vehicles_holder_employee_id_hero_employees_id_fk" FOREIGN KEY ("holder_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_vehicles" ADD CONSTRAINT "hero_vehicles_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_tire_repair_jobcard_injuries" ADD CONSTRAINT "hero_tire_repair_jobcard_injuries_jobcard_id_hero_tire_repair_jobcards_id_fk" FOREIGN KEY ("jobcard_id") REFERENCES "public"."hero_tire_repair_jobcards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_tire_repair_jobcard_processes" ADD CONSTRAINT "hero_tire_repair_jobcard_processes_injury_id_hero_tire_repair_jobcard_injuries_id_fk" FOREIGN KEY ("injury_id") REFERENCES "public"."hero_tire_repair_jobcard_injuries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_tire_repair_jobcards" ADD CONSTRAINT "hero_tire_repair_jobcards_inspection_id_hero_tire_repair_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."hero_tire_repair_inspections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_tire_repair_jobcards" ADD CONSTRAINT "hero_tire_repair_jobcards_created_by_hero_employees_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cs_refuel_site_name_idx" ON "hero_central_service_refueling_logs" USING btree ("site_name");--> statement-breakpoint
CREATE INDEX "cs_refuel_date_idx" ON "hero_central_service_refueling_logs" USING btree ("refuel_date");--> statement-breakpoint
CREATE INDEX "cs_refuel_unit_idx" ON "hero_central_service_refueling_logs" USING btree ("unit_number");--> statement-breakpoint
CREATE INDEX "cs_refuel_driver_idx" ON "hero_central_service_refueling_logs" USING btree ("driver_name");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_tickets_ticket_number_uq" ON "hero_tickets" USING btree ("ticket_number");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_daily_activity_approvals_session_step_uq" ON "hero_daily_activity_approvals" USING btree ("session_id","step_order");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_daily_activity_approvals_token_uq" ON "hero_daily_activity_approvals" USING btree ("approval_token");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_daily_activity_session_item_team_members_item_emp_uq" ON "hero_daily_activity_session_item_team_members" USING btree ("item_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_daily_activity_session_team_members_session_emp_uq" ON "hero_daily_activity_session_team_members" USING btree ("session_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_hc_flight_route_change_approvals_step_uq" ON "hero_hc_flight_route_change_approvals" USING btree ("request_id","step_order");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_mine_permit_reminder_sends_employee_expiry_uidx" ON "hero_mine_permit_reminder_sends" USING btree ("employee_id","permit_expiry_date");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_overtime_approvals_spl_step_uq" ON "hero_overtime_approvals" USING btree ("overtime_command_letter_id","step_order");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_overtime_approvals_token_uq" ON "hero_overtime_approvals" USING btree ("approval_token");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_ptw_approvals_ptw_step_uq" ON "hero_ptw_approvals" USING btree ("ptw_permit_id","step_order");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_ptw_approvals_token_uq" ON "hero_ptw_approvals" USING btree ("approval_token");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_safety_site_monthly_summary_site_month_idx" ON "hero_safety_site_monthly_summary" USING btree ("site_id","month");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_sop_win_approvals_step_uq" ON "hero_sop_win_approvals" USING btree ("document_id","step_order");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_sop_win_approvals_token_uq" ON "hero_sop_win_approvals" USING btree ("approval_token");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_sop_win_req_approvals_step_uq" ON "hero_sop_win_request_approvals" USING btree ("request_id","step_order");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_sop_win_req_approvals_token_uq" ON "hero_sop_win_request_approvals" USING btree ("approval_token");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_user_pinned_services_email_idx" ON "hero_user_pinned_services" USING btree ("user_email");--> statement-breakpoint
CREATE UNIQUE INDEX "maestro_customer_locations_customer_location_uq" ON "maestro_customer_locations" USING btree ("customer_id","location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "maestro_customer_memberships_user_customer_uq" ON "maestro_customer_memberships" USING btree ("user_id","customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "maestro_customer_sessions_token_uq" ON "maestro_customer_sessions" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "maestro_customer_sites_customer_site_uq" ON "maestro_customer_sites" USING btree ("customer_id","site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "maestro_customer_user_locations_user_customer_location_uq" ON "maestro_customer_user_locations" USING btree ("user_id","customer_id","location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "maestro_customer_user_sites_user_customer_site_uq" ON "maestro_customer_user_sites" USING btree ("user_id","customer_id","site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "maestro_customer_users_email_uq" ON "maestro_customer_users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "maestro_role_permissions_role_permission_uq" ON "maestro_role_permissions" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "maestro_user_roles_user_role_uq" ON "maestro_user_roles" USING btree ("user_id","role_id");--> statement-breakpoint
ALTER TABLE "hero_apd_requests" ADD CONSTRAINT "hero_apd_requests_target_section_id_hero_master_sections_id_fk" FOREIGN KEY ("target_section_id") REFERENCES "public"."hero_master_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_activities" ADD CONSTRAINT "hero_activities_deleted_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("deleted_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_sessions" ADD CONSTRAINT "hero_daily_activity_sessions_deleted_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("deleted_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_form_submissions" ADD CONSTRAINT "hero_form_submissions_requester_employee_id_hero_employees_id_fk" FOREIGN KEY ("requester_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_mine_permit_reminder_config" ADD CONSTRAINT "hero_mine_permit_reminder_config_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hero_role_menu_permissions_role_menu_uq" ON "hero_role_menu_permissions" USING btree ("role_id","menu_item_id");--> statement-breakpoint
ALTER TABLE "hero_hc_candidate_panel_evaluations" DROP COLUMN "problem_solving_score_legacy";