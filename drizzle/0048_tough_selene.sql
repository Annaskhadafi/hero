CREATE TYPE "public"."approval_approver_resolution" AS ENUM('role', 'user', 'direct_supervisor', 'department_head', 'section_head', 'site_head', 'form_field', 'org_node');--> statement-breakpoint
CREATE TYPE "public"."approval_approver_type" AS ENUM('role', 'user');--> statement-breakpoint
CREATE TYPE "public"."approval_assignment_status" AS ENUM('pending', 'approved', 'rejected', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."approval_decision_action" AS ENUM('approve', 'reject', 'comment', 'escalate', 'cancel');--> statement-breakpoint
CREATE TYPE "public"."approval_definition_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."approval_org_structure_type" AS ENUM('enterprise', 'work', 'project');--> statement-breakpoint
CREATE TYPE "public"."approval_request_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."approval_revert_target" AS ENUM('requester', 'previous_step', 'specific_step');--> statement-breakpoint
CREATE TYPE "public"."approval_step_type" AS ENUM('approval', 'user_input', 'notification', 'delay');--> statement-breakpoint
CREATE TYPE "public"."calendar_event_type" AS ENUM('marketing', 'reminder');--> statement-breakpoint
CREATE TYPE "public"."cost_settlement_category" AS ENUM('gasoline', 'toll', 'parking', 'meals', 'maintenance', 'others', 'rapid_test', 'ferry', 'portal', 'washing', 'escort');--> statement-breakpoint
CREATE TYPE "public"."cost_settlement_status" AS ENUM('draft', 'submitted', 'approved', 'rejected', 'posted');--> statement-breakpoint
CREATE TYPE "public"."cost_settlement_type" AS ENUM('trip', 'delivery');--> statement-breakpoint
CREATE TYPE "public"."contact_category" AS ENUM('internal', 'customer');--> statement-breakpoint
CREATE TYPE "public"."email_recipient_role" AS ENUM('admin', 'manager', 'staff', 'customer', 'all');--> statement-breakpoint
CREATE TYPE "public"."email_template_type" AS ENUM('magic_link', 'notification', 'welcome', 'password_reset', 'order_confirmation', 'delivery_update', 'custom');--> statement-breakpoint
CREATE TYPE "public"."notification_delivery_channel" AS ENUM('email', 'push');--> statement-breakpoint
CREATE TYPE "public"."survey_form_kind" AS ENUM('form', 'survey');--> statement-breakpoint
CREATE TYPE "public"."survey_form_status" AS ENUM('draft', 'published', 'closed');--> statement-breakpoint
CREATE TYPE "public"."price_list_type" AS ENUM('tier', 'customer', 'promotional');--> statement-breakpoint
CREATE TYPE "public"."stock_opname_status" AS ENUM('open', 'closed', 'cancelled');--> statement-breakpoint
CREATE TABLE "ai_inventory_predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_code" varchar(100) NOT NULL,
	"product_name" text,
	"prediction_type" varchar(50) NOT NULL,
	"recommended_stock" integer NOT NULL,
	"rationale" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"actual_sales" integer,
	"accuracy_percentage" real,
	"batch_id" varchar(100),
	"current_stock" integer
);
--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"setting_key" varchar(100) NOT NULL,
	"setting_value" text NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" varchar(100),
	CONSTRAINT "ai_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "restock_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_code" varchar(100) NOT NULL,
	"product_name" text,
	"current_stock" integer NOT NULL,
	"recommended_stock" integer NOT NULL,
	"urgency_level" varchar(20) NOT NULL,
	"prediction_id" integer,
	"is_acknowledged" integer DEFAULT 0 NOT NULL,
	"acknowledged_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_apd_request_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"item_type" text NOT NULL,
	"request_type" text NOT NULL,
	"photo_url" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_apd_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_number" text NOT NULL,
	"employee_id" integer NOT NULL,
	"site_id" integer NOT NULL,
	"request_date" timestamp DEFAULT now() NOT NULL,
	"request_category" text DEFAULT 'APD' NOT NULL,
	"status" text DEFAULT 'pending_approval' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"signature_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_apd_requests_request_number_unique" UNIQUE("request_number")
);
--> statement-breakpoint
CREATE TABLE "approval_assignments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"request_id" varchar(36) NOT NULL,
	"step_id" integer NOT NULL,
	"step_order" integer NOT NULL,
	"assignee_user_id" text NOT NULL,
	"status" "approval_assignment_status" DEFAULT 'pending' NOT NULL,
	"acted_at" timestamp,
	"comment" text,
	"input_data" jsonb DEFAULT '{}'::jsonb,
	"resolution_method" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" varchar(36) NOT NULL,
	"action" "approval_decision_action" NOT NULL,
	"actor_user_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_definition_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"definition_id" varchar(36) NOT NULL,
	"step_order" integer NOT NULL,
	"step_name" varchar(200) NOT NULL,
	"step_type" "approval_step_type" DEFAULT 'approval' NOT NULL,
	"approver_type" "approval_approver_type" DEFAULT 'role' NOT NULL,
	"approver_role" varchar(100),
	"approver_user_id" text,
	"approver_resolution" "approval_approver_resolution" DEFAULT 'role' NOT NULL,
	"approver_form_field_key" varchar(100),
	"approver_org_node_id" integer,
	"min_approvals" integer DEFAULT 1 NOT NULL,
	"condition_json" jsonb DEFAULT '{}'::jsonb,
	"is_required" boolean DEFAULT true NOT NULL,
	"revert_target" "approval_revert_target" DEFAULT 'requester' NOT NULL,
	"revert_to_step_order" integer,
	"field_permissions_json" jsonb DEFAULT '{}'::jsonb,
	"delay_duration_hours" integer,
	"delay_until_field_key" varchar(100),
	"skip_condition_json" jsonb DEFAULT '{}'::jsonb,
	"auto_action_on_expiry" varchar(30) DEFAULT 'none',
	"notify_on_assign" boolean DEFAULT true NOT NULL,
	"notify_on_complete" boolean DEFAULT false NOT NULL,
	"cc_emails" text,
	"sla_days" integer,
	"node_position_x" integer DEFAULT 0,
	"node_position_y" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approval_steps_unique_order" UNIQUE("definition_id","step_order")
);
--> statement-breakpoint
CREATE TABLE "approval_definitions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"form_key" varchar(100) NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "approval_definition_status" DEFAULT 'draft' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approval_definitions_form_version_unique" UNIQUE("form_key","version")
);
--> statement-breakpoint
CREATE TABLE "approval_form_registry" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"form_key" varchar(100) NOT NULL,
	"form_name" varchar(200) NOT NULL,
	"module_path" varchar(255) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approval_form_registry_form_key_unique" UNIQUE("form_key")
);
--> statement-breakpoint
CREATE TABLE "approval_matrix_imports" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_type" varchar(20) NOT NULL,
	"imported_by" text,
	"status" varchar(30) DEFAULT 'success' NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_org_structure_nodes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"structure_id" varchar(36) NOT NULL,
	"parent_node_id" varchar(36),
	"user_id" text,
	"node_name" varchar(200) NOT NULL,
	"department" varchar(120),
	"job_title" varchar(120),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_org_structures" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" "approval_org_structure_type" DEFAULT 'enterprise' NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"definition_id" varchar(36) NOT NULL,
	"form_key" varchar(100) NOT NULL,
	"entity_id" varchar(100) NOT NULL,
	"requester_id" text NOT NULL,
	"status" "approval_request_status" DEFAULT 'pending' NOT NULL,
	"current_step_order" integer DEFAULT 1 NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"due_at" timestamp,
	"completed_at" timestamp,
	"condition_snapshot" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_workflow_presets" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"preset_key" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"category" varchar(50) DEFAULT 'general' NOT NULL,
	"steps_json" jsonb NOT NULL,
	"is_system_preset" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "approval_workflow_presets_preset_key_unique" UNIQUE("preset_key")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"action" varchar(100) NOT NULL,
	"table_name" varchar(100),
	"record_id" varchar(100),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"delivery_item_id" integer,
	"sales_order_item_id" integer,
	"evoucher_id" integer,
	"invoice_type" text,
	"no" text,
	"year" integer,
	"month" text,
	"plant" text,
	"customer" text,
	"po_no" text,
	"date_po" timestamp,
	"material_number" text,
	"material_description" text,
	"qty" numeric(15, 2) DEFAULT '0',
	"curr" text,
	"price_per_pcs_idr" numeric(15, 2) DEFAULT '0',
	"total_price_idr" numeric(15, 2) DEFAULT '0',
	"ppn" numeric(15, 2) DEFAULT '0',
	"price" numeric(15, 2) DEFAULT '0',
	"include_ppn" numeric(15, 2) DEFAULT '0',
	"no_inv_sap" text,
	"date_invoice" timestamp,
	"cust_id" text,
	"sales_name" text,
	"ddp_address" text,
	"payment_type" text,
	"nomor_do_sap" text,
	"actual_no_do" text,
	"tgl_do_faktur" timestamp,
	"remaks" text,
	"date_send_invoice" timestamp,
	"receiver_date" timestamp,
	"recv_date_approved" timestamp,
	"e_faktur" text,
	"mode_delivery" text,
	"no_resi" text,
	"status_delivery" text,
	"scan_inv_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bundling_histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scenario_name" text NOT NULL,
	"items_data" jsonb NOT NULL,
	"competitor_price" numeric DEFAULT '0' NOT NULL,
	"target_margin_percentage" numeric NOT NULL,
	"recommended_qty_primary" numeric DEFAULT '0' NOT NULL,
	"final_margin_amount" numeric NOT NULL,
	"final_margin_percentage" numeric NOT NULL,
	"status" text,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"company" varchar(255),
	"job_title" varchar(255),
	"phone" varchar(255),
	"email" varchar(255),
	"address" text,
	"business_category" varchar(255),
	"image_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"all_day" boolean DEFAULT false NOT NULL,
	"type" "calendar_event_type" DEFAULT 'marketing' NOT NULL,
	"color" varchar(20) DEFAULT '#3b82f6',
	"related_customer_id" integer,
	"email_reminder_at" timestamp with time zone,
	"email_reminder_sent" boolean DEFAULT false NOT NULL,
	"email_reminder_to" varchar(255),
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_contract_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"contract_id" integer NOT NULL,
	"material_no" text NOT NULL,
	"qty_contract" integer DEFAULT 0 NOT NULL,
	"contract_price" numeric(20, 2) DEFAULT '0' NOT NULL,
	"forecast_qty_per_month" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"customer_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"contract_number" text,
	"customer_category_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_customer_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"category_code" text NOT NULL,
	"category_name" text NOT NULL,
	"incentive_amount" numeric(20, 2) NOT NULL,
	"is_contractual" boolean DEFAULT false NOT NULL,
	"customer_match" text,
	"active_status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"material_no" text,
	"material_group" text,
	"customer_category_code" text,
	"incentive_amount" numeric(20, 2) NOT NULL,
	"is_percentage" boolean DEFAULT false NOT NULL,
	"active_status" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"start_date" date NOT NULL,
	"end_date" date,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_central_service_asset_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" integer NOT NULL,
	"file_name" text DEFAULT '' NOT NULL,
	"file_url" text NOT NULL,
	"mime_type" text DEFAULT 'application/octet-stream' NOT NULL,
	"file_size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_central_service_asset_histories" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" integer NOT NULL,
	"action" text DEFAULT 'update' NOT NULL,
	"field_name" text DEFAULT '' NOT NULL,
	"field_label" text DEFAULT '' NOT NULL,
	"previous_value" text,
	"new_value" text,
	"change_remark" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_central_service_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_section" text DEFAULT '' NOT NULL,
	"section" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"asset_number" text,
	"serial_number" text,
	"purchase_date" timestamp,
	"delivery_to_site_date" timestamp,
	"last_calibration_date" timestamp,
	"calibration_cycle_months" integer,
	"calibration_due_date" timestamp,
	"certificate_date" timestamp,
	"certificate_cycle_months" integer,
	"certificate_due_date" timestamp,
	"condition" text DEFAULT '' NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_central_service_forecast_actuals" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_id" integer NOT NULL,
	"forecast_item_id" integer,
	"update_date" timestamp DEFAULT now() NOT NULL,
	"invoice_number" text NOT NULL,
	"customer" text,
	"category" text NOT NULL,
	"job_code" text DEFAULT '' NOT NULL,
	"amount_idr" numeric DEFAULT '0' NOT NULL,
	"amount_usd" numeric DEFAULT '0' NOT NULL,
	"remark" text DEFAULT '' NOT NULL,
	"item_status" text DEFAULT '-' NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_central_service_forecast_histories" (
	"id" serial PRIMARY KEY NOT NULL,
	"forecast_item_id" integer NOT NULL,
	"previous_status" text NOT NULL,
	"new_status" text NOT NULL,
	"action_remark" text DEFAULT '' NOT NULL,
	"action_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_central_service_forecast_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_id" integer NOT NULL,
	"customer" text NOT NULL,
	"pic_sales" text DEFAULT '' NOT NULL,
	"os_invoice_prev_month" numeric DEFAULT '0' NOT NULL,
	"os_remark" text DEFAULT '' NOT NULL,
	"repair_forecast" numeric DEFAULT '0' NOT NULL,
	"retread_forecast" numeric DEFAULT '0' NOT NULL,
	"service_forecast" numeric DEFAULT '0' NOT NULL,
	"total_forecast_idr" numeric DEFAULT '0' NOT NULL,
	"repair_remark" text DEFAULT '' NOT NULL,
	"retread_remark" text DEFAULT '' NOT NULL,
	"service_remark" text DEFAULT '' NOT NULL,
	"remaining_repair" numeric DEFAULT '0' NOT NULL,
	"remaining_retread" numeric DEFAULT '0' NOT NULL,
	"remaining_service" numeric DEFAULT '0' NOT NULL,
	"remaining_total_idr" numeric DEFAULT '0' NOT NULL,
	"is_product_accessories" boolean DEFAULT false NOT NULL,
	"accessories_amount_idr" numeric DEFAULT '0' NOT NULL,
	"accessories_amount_usd" numeric DEFAULT '0' NOT NULL,
	"remaining_accessories_idr" numeric DEFAULT '0' NOT NULL,
	"remaining_accessories_usd" numeric DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"remark" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_central_service_forecast_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"month_year" text NOT NULL,
	"exchange_rate_idr_to_usd" numeric DEFAULT '15000' NOT NULL,
	"status" text DEFAULT 'Draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_central_service_forecast_periods_month_year_unique" UNIQUE("month_year")
);
--> statement-breakpoint
CREATE TABLE "hero_central_service_manpower_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_name" text NOT NULL,
	"position" text NOT NULL,
	"requested_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"sender_id" varchar NOT NULL,
	"content" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reactions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"mentioned_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reply_to_message_id" integer,
	"mention_type" varchar(20),
	"mention_id" varchar(100),
	"mention_label" varchar(255),
	"is_system_message" boolean DEFAULT false,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"edited_at" timestamp,
	"pinned_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_room_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_read_at" timestamp,
	"last_seen_at" timestamp,
	"typing_at" timestamp,
	"last_unread_reminder_at" timestamp,
	"unread_reminder_count" integer DEFAULT 0 NOT NULL,
	"is_muted" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"type" varchar(20) DEFAULT 'dm' NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_user_stickers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar(120) NOT NULL,
	"url" text NOT NULL,
	"content_type" varchar(120),
	"size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitor_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_consultant_id" text,
	"info_date" timestamp NOT NULL,
	"competitor_name" text NOT NULL,
	"customer_name" text NOT NULL,
	"industry_category" text NOT NULL,
	"location" text NOT NULL,
	"activity_type" text NOT NULL,
	"market_response" text NOT NULL,
	"business_impact" text NOT NULL,
	"description" text,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitor_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"info_date" timestamp NOT NULL,
	"business_consultant_id" text,
	"consultant_name" text,
	"customer_name" text NOT NULL,
	"product_size" text NOT NULL,
	"category" text NOT NULL,
	"brand" text NOT NULL,
	"supplier" text NOT NULL,
	"currency" text NOT NULL,
	"price" text NOT NULL,
	"remark" text,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lost_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_consultant_id" text,
	"product_type" text NOT NULL,
	"offering_date" timestamp NOT NULL,
	"customer_name" text NOT NULL,
	"product_detail" text NOT NULL,
	"total_offering" text NOT NULL,
	"reason" text NOT NULL,
	"remark" text,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cosmetic_tires" (
	"id" serial PRIMARY KEY NOT NULL,
	"tyre_size" varchar(150),
	"pattern" varchar(150),
	"serial_number" varchar(150),
	"month" varchar(50),
	"city" varchar(150),
	"year" varchar(50),
	"material_number" varchar(150),
	"description" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_settlement_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"settlement_id" integer NOT NULL,
	"cost_category" "cost_settlement_category" NOT NULL,
	"description" varchar(255) NOT NULL,
	"amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"receipt_date" date,
	"vendor_name" varchar(255),
	"delivery_item_id" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_settlement_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"settlement_item_id" integer NOT NULL,
	"file_url" varchar(255) NOT NULL,
	"original_file_name" varchar(255) NOT NULL,
	"file_size" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"uploaded_by" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_settlement_signatories" (
	"id" serial PRIMARY KEY NOT NULL,
	"settlement_id" integer NOT NULL,
	"signatory_name" varchar(255) NOT NULL,
	"signatory_position" varchar(255) NOT NULL,
	"signatory_role" varchar(100) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_settlements" (
	"id" serial PRIMARY KEY NOT NULL,
	"settlement_number" varchar(50) NOT NULL,
	"settlement_type" "cost_settlement_type" NOT NULL,
	"fleet_trip_id" integer,
	"delivery_id" integer,
	"driver_name" varchar(255),
	"vehicle_number" varchar(50),
	"advance_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_actual_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"variance_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"status" "cost_settlement_status" DEFAULT 'draft' NOT NULL,
	"approval_request_id" varchar(36),
	"settlement_date" date NOT NULL,
	"remarks" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "cost_settlements_settlement_number_unique" UNIQUE("settlement_number")
);
--> statement-breakpoint
CREATE TABLE "cover_letter_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"cover_letter_id" integer,
	"po_no" text,
	"no_inv_sap" text,
	"date_invoice" timestamp,
	"date_po" timestamp,
	"amount_before_tax" numeric(15, 2),
	"amount_include_tax" numeric(15, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cover_letters" (
	"id" serial PRIMARY KEY NOT NULL,
	"ref_number" text,
	"letter_date" timestamp,
	"cust_id" text,
	"customer_name" text,
	"signer_name" text,
	"signer_title" text,
	"location" text DEFAULT 'balikpapan',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"address" text NOT NULL,
	"label" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_code" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_name" varchar(255),
	"email" varchar(255),
	"birthday" date,
	"address_1" text,
	"address_2" text,
	"address_3" text,
	"address_4" text,
	"address_5" text,
	"business_category" varchar(255),
	"business_category_source" varchar(100),
	"business_category_enriched_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_customer_code_unique" UNIQUE("customer_code")
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"delivery_number" varchar(50),
	"do_sap" varchar(100),
	"sales_order_id" integer NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"delivery_date" timestamp,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"delivery_type" varchar(20) DEFAULT 'full' NOT NULL,
	"driver_name" varchar(255),
	"vehicle_number" varchar(50),
	"vehicle_type" varchar(50),
	"contact_name" varchar(255),
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"contact_person" varchar(255),
	"is_external" boolean DEFAULT false NOT NULL,
	"vendor_name" varchar(255),
	"awb_number" varchar(100),
	"shipping_cost" numeric(15, 2) DEFAULT '0',
	"trip_destination" varchar(255),
	"cost_gasoline" numeric(15, 2) DEFAULT '0',
	"cost_gasoline_dexlite" numeric(15, 2) DEFAULT '0',
	"cost_gasoline_bio" numeric(15, 2) DEFAULT '0',
	"cost_toll" numeric(15, 2) DEFAULT '0',
	"cost_parking" numeric(15, 2) DEFAULT '0',
	"cost_meals" numeric(15, 2) DEFAULT '0',
	"cost_maintenance" numeric(15, 2) DEFAULT '0',
	"cost_others" numeric(15, 2) DEFAULT '0',
	"cost_rapid_test" numeric(15, 2) DEFAULT '0',
	"cost_ferry" numeric(15, 2) DEFAULT '0',
	"cost_portal" numeric(15, 2) DEFAULT '0',
	"cost_washing" numeric(15, 2) DEFAULT '0',
	"cost_escort" numeric(15, 2) DEFAULT '0',
	"warehouse_id" integer,
	"warehouse_to_id" integer,
	"shipping_address" text,
	"notes" text,
	"return_do_date" timestamp,
	"invoice_number" varchar(100),
	"invoice_date" timestamp,
	"do_status" varchar(50) DEFAULT 'Pending',
	"remark" text,
	"scan_do_document" varchar(255),
	"fleet_trip_id" integer,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "deliveries_delivery_number_unique" UNIQUE("delivery_number")
);
--> statement-breakpoint
CREATE TABLE "delivery_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"delivery_id" integer NOT NULL,
	"sales_order_item_id" integer,
	"product_id" integer NOT NULL,
	"ordered_quantity" integer DEFAULT 0 NOT NULL,
	"delivered_quantity" integer DEFAULT 0 NOT NULL,
	"serial_numbers" text[]
);
--> statement-breakpoint
CREATE TABLE "delivery_cost_credits" (
	"id" serial PRIMARY KEY NOT NULL,
	"credit_date" date NOT NULL,
	"amount" numeric(20, 2) DEFAULT '0' NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_cost_request_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer,
	"delivery_id" integer,
	"no_pol" text,
	"driver_name" text,
	"trip_destination" text,
	"fuel_cost" numeric(20, 2) DEFAULT '0',
	"fuel_cost_dexlite" numeric(20, 2) DEFAULT '0',
	"fuel_cost_bio" numeric(20, 2) DEFAULT '0',
	"meal_allowance" numeric(20, 2) DEFAULT '0',
	"medical_test" numeric(20, 2) DEFAULT '0',
	"toll_road" numeric(20, 2) DEFAULT '0',
	"ferry_cost" numeric(20, 2) DEFAULT '0',
	"portal_cost" numeric(20, 2) DEFAULT '0',
	"wash_grease_cost" numeric(20, 2) DEFAULT '0',
	"escort_cost" numeric(20, 2) DEFAULT '0',
	"total_cost" numeric(20, 2) DEFAULT '0',
	"realization_status" text DEFAULT 'Done',
	"realization_remarks" text,
	"realization_details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_cost_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_date" date NOT NULL,
	"acc_no" text,
	"bank_name" text,
	"account_name" text,
	"remarks" text,
	"request_by" text,
	"known_by_1" text,
	"known_by_2" text,
	"approved_by" text,
	"received_by" text,
	"total_request" numeric(20, 2),
	"total_transfer" numeric(20, 2),
	"total_balance" numeric(20, 2),
	"status" text DEFAULT 'Pengajuan' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"company_name" varchar(255),
	"position" varchar(255),
	"category" "contact_category" DEFAULT 'customer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_contacts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "email_group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "group_contact_unique" UNIQUE("group_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE "email_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"template_id" varchar(36),
	"template_code" varchar(120),
	"template_name" varchar(255),
	"to_email" text NOT NULL,
	"cc_email" text,
	"from_email" varchar(255),
	"delivery_channel" varchar(20) DEFAULT 'email' NOT NULL,
	"subject" varchar(500) NOT NULL,
	"html_content" text,
	"text_content" text,
	"action_url" text,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_notification_rule_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"rule_id" varchar(36) NOT NULL,
	"form_key" varchar(100) NOT NULL,
	"entity_id" varchar(100) NOT NULL,
	"matched" boolean DEFAULT false NOT NULL,
	"sent" boolean DEFAULT false NOT NULL,
	"to_email" text,
	"cc_email" text,
	"subject" varchar(500),
	"html_content" text,
	"text_content" text,
	"status" varchar(50) DEFAULT 'skipped' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_notification_rule_states" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"rule_id" varchar(36) NOT NULL,
	"entity_id" varchar(100) NOT NULL,
	"last_matched" boolean DEFAULT false NOT NULL,
	"last_evaluated_at" timestamp,
	"last_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_notification_rule_states_unique" UNIQUE("rule_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE "email_notification_rules" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"form_key" varchar(100) NOT NULL,
	"combinator" varchar(3) DEFAULT 'AND' NOT NULL,
	"conditions" jsonb DEFAULT '[]'::jsonb,
	"to_emails" jsonb DEFAULT '[]'::jsonb,
	"cc_emails" jsonb DEFAULT '[]'::jsonb,
	"options" jsonb DEFAULT '{}'::jsonb,
	"template_id" varchar(36) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(120),
	"type" "email_template_type" NOT NULL,
	"subject" varchar(500) NOT NULL,
	"html_content" text NOT NULL,
	"text_content" text,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"recipient_roles" jsonb DEFAULT '[]'::jsonb,
	"recipient_user_ids" jsonb DEFAULT '[]'::jsonb,
	"cc_emails" jsonb DEFAULT '[]'::jsonb,
	"delivery_channels" jsonb DEFAULT '["email"]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_templates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "smtp_settings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"host" varchar(255) DEFAULT 'smtp.gmail.com' NOT NULL,
	"port" varchar(10) DEFAULT '587' NOT NULL,
	"secure" boolean DEFAULT false NOT NULL,
	"username" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"from_email" varchar(255) NOT NULL,
	"from_name" varchar(255) DEFAULT 'One Chitra' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evhs_gi_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"gi_record_id" integer NOT NULL,
	"material_number" varchar(100) NOT NULL,
	"qty" numeric(12, 2) NOT NULL,
	"price" numeric(15, 2),
	"status" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "evhs_gi_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_no" varchar(100),
	"wo_no" varchar(100),
	"source" varchar(20) DEFAULT 'upload' NOT NULL,
	"filename" text,
	"period_date" date,
	"warehouse_id" integer,
	"is_matched" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evhs_master_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"material_number_cp" varchar(100) NOT NULL,
	"material_number_ck" varchar(100),
	"warehouse_id" integer NOT NULL,
	"price" numeric(15, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evhs_mrko" (
	"id" serial PRIMARY KEY NOT NULL,
	"mrko_number" varchar(100),
	"release_date" timestamp,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evhs_receipt_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"receipt_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"confirmed_qty" integer NOT NULL,
	"serial_numbers" text[]
);
--> statement-breakpoint
CREATE TABLE "evhs_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"transfer_id" integer NOT NULL,
	"received_date" timestamp DEFAULT now() NOT NULL,
	"do_chitra_no" varchar(100),
	"confirmed_by" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evhs_voucher_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"voucher_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"material_number_ck" varchar(100),
	"unit_price" numeric(15, 2),
	"qty" integer NOT NULL,
	"stock_balance" integer,
	"serial_number" varchar(100),
	"pos" varchar(50),
	"unit_id" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "evhs_vouchers" (
	"id" serial PRIMARY KEY NOT NULL,
	"vhs_no" varchar(100) NOT NULL,
	"wo_no" varchar(100),
	"date" date NOT NULL,
	"warehouse_id" integer NOT NULL,
	"remark" text,
	"issued_by" varchar,
	"approved_by_name" varchar(255),
	"received_by_name" varchar(255),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"mrko_status" varchar(20) DEFAULT 'OPEN',
	"mrko_no" varchar(100),
	"sap_invoice_no" varchar(100),
	"settled_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "evhs_vouchers_vhs_no_unique" UNIQUE("vhs_no")
);
--> statement-breakpoint
CREATE TABLE "hero_ewh_daily_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"site_id" integer NOT NULL,
	"work_date" timestamp NOT NULL,
	"period" text NOT NULL,
	"shift_code" text DEFAULT 'DS' NOT NULL,
	"clock_in" text,
	"clock_out" text,
	"availability_minutes" integer DEFAULT 1440 NOT NULL,
	"clock_duration_minutes" integer DEFAULT 0 NOT NULL,
	"break_minutes" integer DEFAULT 60 NOT NULL,
	"effective_minutes" integer DEFAULT 0 NOT NULL,
	"idle_minutes" integer DEFAULT 1440 NOT NULL,
	"ewh_percent" text DEFAULT '0.00' NOT NULL,
	"activity_session_count" integer DEFAULT 0 NOT NULL,
	"checked_item_count" integer DEFAULT 0 NOT NULL,
	"total_item_count" integer DEFAULT 0 NOT NULL,
	"overtime_minutes" integer DEFAULT 0 NOT NULL,
	"is_finalized" boolean DEFAULT false NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_ewh_shift_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"shift_code" text DEFAULT 'ALL' NOT NULL,
	"break_minutes" integer DEFAULT 60 NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_employee_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_ewh_team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_ewh_teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"site_id" integer NOT NULL,
	"section" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_unit_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"unit_code" text NOT NULL,
	"unit_name" text NOT NULL,
	"unit_type" text DEFAULT 'other' NOT NULL,
	"unit_model" text DEFAULT '' NOT NULL,
	"unit_year" integer,
	"license_plate" text DEFAULT '' NOT NULL,
	"capacity" text DEFAULT '' NOT NULL,
	"capacity_unit" text DEFAULT 'ton' NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"photo_url" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_unit_utility_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"unit_number" text NOT NULL,
	"unit_id" integer,
	"site_id" integer NOT NULL,
	"work_date" timestamp NOT NULL,
	"period" text NOT NULL,
	"total_usage_minutes" integer DEFAULT 0 NOT NULL,
	"utility_percent" text DEFAULT '0.00' NOT NULL,
	"operator_count" integer DEFAULT 0 NOT NULL,
	"activity_entry_count" integer DEFAULT 0 NOT NULL,
	"breakdown_minutes" integer DEFAULT 0 NOT NULL,
	"standby_minutes" integer DEFAULT 0 NOT NULL,
	"operator_snapshot" jsonb DEFAULT '[]' NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fleet_trips" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_number" varchar(50) NOT NULL,
	"driver_id" integer,
	"vehicle_id" integer,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"date" timestamp NOT NULL,
	"notes" text,
	"trip_destination" varchar(255),
	"cost_gasoline" numeric(15, 2) DEFAULT '0',
	"cost_gasoline_dexlite" numeric(15, 2) DEFAULT '0',
	"cost_gasoline_bio" numeric(15, 2) DEFAULT '0',
	"cost_toll" numeric(15, 2) DEFAULT '0',
	"cost_parking" numeric(15, 2) DEFAULT '0',
	"cost_meals" numeric(15, 2) DEFAULT '0',
	"cost_maintenance" numeric(15, 2) DEFAULT '0',
	"cost_others" numeric(15, 2) DEFAULT '0',
	"cost_rapid_test" numeric(15, 2) DEFAULT '0',
	"cost_ferry" numeric(15, 2) DEFAULT '0',
	"cost_portal" numeric(15, 2) DEFAULT '0',
	"cost_washing" numeric(15, 2) DEFAULT '0',
	"cost_escort" numeric(15, 2) DEFAULT '0',
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fleet_trips_trip_number_unique" UNIQUE("trip_number")
);
--> statement-breakpoint
CREATE TABLE "fleet_drivers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fleet_drivers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "fleet_vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"police_number" varchar(50) NOT NULL,
	"type" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fleet_vehicles_police_number_unique" UNIQUE("police_number")
);
--> statement-breakpoint
CREATE TABLE "forecasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"period" text NOT NULL,
	"target_name" text NOT NULL,
	"target_type" text NOT NULL,
	"amount" double precision DEFAULT 0 NOT NULL,
	"is_yearly" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repair_form_wo" (
	"id" serial PRIMARY KEY NOT NULL,
	"id_wo" varchar(100),
	"tire_sn" varchar(100),
	"customer" varchar(255),
	"site" varchar(255),
	"store_loc" varchar(100),
	"brand" varchar(100),
	"pattern" varchar(100),
	"size" varchar(100),
	"injury" text,
	"job_type" varchar(100),
	"remark" text,
	"inspect_date" varchar(50),
	"inspector" varchar(255),
	"received_date" varchar(50),
	"receiver" varchar(255),
	"jenis_pengajuan" varchar(50) DEFAULT 'repair' NOT NULL,
	"deskripsi_pekerjaan" text,
	"no_pengajuan" varchar(100),
	"tanggal_pengajuan" timestamp DEFAULT now() NOT NULL,
	"pemohon" varchar(255),
	"catatan_pengajuan" text,
	"status_pengajuan" varchar(50) DEFAULT 'pending' NOT NULL,
	"no_wo_terbit" varchar(100),
	"tanggal_wo_terbit" timestamp,
	"hari" varchar(50),
	"tanggal" varchar(50),
	"total_amount" varchar(100),
	"items" text,
	"no_po" varchar(255),
	"tanggal_po" varchar(50),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "repair_form_wo_no_pengajuan_unique" UNIQUE("no_pengajuan")
);
--> statement-breakpoint
CREATE TABLE "repair_master_cai" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer" varchar(255) DEFAULT 'OTHER CUSTOMER' NOT NULL,
	"size" varchar(100) NOT NULL,
	"brand" varchar(100),
	"cai" varchar(100) NOT NULL,
	"type" varchar(50) DEFAULT 'Tire Repair' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repair_wip_po" (
	"id_wo" varchar(100) PRIMARY KEY NOT NULL,
	"no_po" varchar(255) NOT NULL,
	"po_date" varchar(50),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_forms" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	"kind" "survey_form_kind" DEFAULT 'form' NOT NULL,
	"status" "survey_form_status" DEFAULT 'draft' NOT NULL,
	"schema" jsonb NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"thank_you_title" varchar(160) DEFAULT 'Terima kasih' NOT NULL,
	"thank_you_message" text DEFAULT 'Jawaban Anda sudah kami terima.' NOT NULL,
	"created_by" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "survey_forms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "survey_responses" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"form_id" varchar(36) NOT NULL,
	"respondent_name" varchar(160),
	"respondent_email" varchar(160),
	"answers" jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "good_receive_manual" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier" text NOT NULL,
	"po_number" text NOT NULL,
	"receive_date" date NOT NULL,
	"delivery_type" text NOT NULL,
	"reference_document" text,
	"vendor_do_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "good_receive_manual_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"header_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "helpdesk_knowledge_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "helpdesk_knowledge_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(140) NOT NULL,
	"title" varchar(255) NOT NULL,
	"page_path" varchar(255),
	"summary" text,
	"content" text NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "helpdesk_knowledge_sources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "helpdesk_training_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer,
	"trained_by" text,
	"trained_at" timestamp DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "hero_genius_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(120),
	"message_id" varchar(120),
	"query" text NOT NULL,
	"answer" text NOT NULL,
	"rating" varchar(20) NOT NULL,
	"feedback_text" text,
	"correction" text,
	"user_id" text,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_genius_learned_facts" (
	"id" serial PRIMARY KEY NOT NULL,
	"fact" text NOT NULL,
	"category" varchar(100) DEFAULT 'General' NOT NULL,
	"source" varchar(255) DEFAULT 'Self-Growth Input',
	"tags" jsonb DEFAULT '[]'::jsonb,
	"confidence_score" real DEFAULT 1,
	"is_active" boolean DEFAULT true NOT NULL,
	"learned_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_genius_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(120),
	"role" varchar(30) NOT NULL,
	"content" text NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb,
	"latency_ms" integer,
	"feedback_rating" varchar(20),
	"feedback_text" text,
	"feedback_correction" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_genius_sessions" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"user_id" text,
	"title" varchar(255) DEFAULT 'Percakapan Baru' NOT NULL,
	"summary" text,
	"message_count" integer DEFAULT 0 NOT NULL,
	"last_active_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "hero_genius_web_crawl_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"site_name" varchar(150),
	"markdown" text NOT NULL,
	"char_count" integer DEFAULT 0 NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"total_chunks" integer DEFAULT 0 NOT NULL,
	"is_ai_enhanced" boolean DEFAULT false NOT NULL,
	"model_used" varchar(100),
	"ingested_to_knowledge_base" boolean DEFAULT false NOT NULL,
	"ingested_document_id" varchar(120),
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_apd_notification_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_emails" text DEFAULT '' NOT NULL,
	"cc_emails" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_broadcast_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_broadcast_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "hero_broadcast_interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"broadcast_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"views_count" integer DEFAULT 0 NOT NULL,
	"liked" boolean,
	"dismissed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_broadcasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"image_url" text,
	"link_url" text,
	"media_type" text DEFAULT 'image' NOT NULL,
	"target_type" text NOT NULL,
	"target_id" integer,
	"target_value" text,
	"max_popups" integer DEFAULT 5 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"category_id" integer
);
--> statement-breakpoint
CREATE TABLE "hero_chitralearning_assignment_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"response_text" text DEFAULT '' NOT NULL,
	"file_url" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by_employee_id" integer,
	"score" integer,
	"feedback" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_chitralearning_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_employee_id" integer,
	"action" text NOT NULL,
	"course_id" integer,
	"employee_id" integer,
	"before_value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"after_value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_chitralearning_campaign_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"enrollment_id" integer,
	"status" text DEFAULT 'assigned' NOT NULL,
	"score" integer,
	"submitted_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_chitralearning_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"course_id" integer,
	"campaign_type" text DEFAULT 'posttest' NOT NULL,
	"target_type" text DEFAULT 'all' NOT NULL,
	"target_value" text DEFAULT '*' NOT NULL,
	"due_at" timestamp,
	"recurrence" text DEFAULT 'manual' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"passing_score" integer DEFAULT 80 NOT NULL,
	"assignment_prompt" text DEFAULT '' NOT NULL,
	"max_retakes" integer DEFAULT -1 NOT NULL,
	"duration_minutes" integer DEFAULT 0 NOT NULL,
	"period_type" text DEFAULT 'custom' NOT NULL,
	"period_value" text DEFAULT '' NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"created_by_employee_id" integer,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_chitralearning_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"color" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "hero_chitralearning_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "hero_chitralearning_certificate_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"background_image_url" text DEFAULT '' NOT NULL,
	"canvas_data" jsonb DEFAULT '{}',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_chitralearning_certificate_templates_course_id_unique" UNIQUE("course_id")
);
--> statement-breakpoint
CREATE TABLE "hero_chitralearning_certificates" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"enrollment_id" integer,
	"training_record_id" integer,
	"certificate_number" text NOT NULL,
	"status" text DEFAULT 'issued' NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"file_url" text,
	"qr_code_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_chitralearning_course_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"access_type" text DEFAULT 'all' NOT NULL,
	"access_value" text DEFAULT '*' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_chitralearning_courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category_id" integer,
	"category" text DEFAULT 'Internal' NOT NULL,
	"level" text DEFAULT 'beginner' NOT NULL,
	"objectives" jsonb DEFAULT '[]',
	"status" text DEFAULT 'draft' NOT NULL,
	"cover_image_url" text DEFAULT '' NOT NULL,
	"video_preview_url" text DEFAULT '' NOT NULL,
	"passing_score" integer DEFAULT 80 NOT NULL,
	"estimated_minutes" integer DEFAULT 0 NOT NULL,
	"due_days" integer DEFAULT 14 NOT NULL,
	"certificate_enabled" boolean DEFAULT true NOT NULL,
	"grading_type" text DEFAULT 'posttest_only' NOT NULL,
	"pretest_weight" integer DEFAULT 0 NOT NULL,
	"posttest_weight" integer DEFAULT 100 NOT NULL,
	"max_retakes" integer DEFAULT -1 NOT NULL,
	"enrollment_type" text DEFAULT 'umum' NOT NULL,
	"target_section" text DEFAULT '' NOT NULL,
	"created_by_employee_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_chitralearning_courses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "hero_chitralearning_enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"assigned_by_employee_id" integer,
	"enrollment_type" text DEFAULT 'self' NOT NULL,
	"approval_status" text DEFAULT 'approved' NOT NULL,
	"approved_by_employee_id" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"status" text DEFAULT 'assigned' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"score" integer,
	"pretest_score" integer,
	"pretest_status" text DEFAULT 'not_started' NOT NULL,
	"posttest_score" integer,
	"posttest_status" text DEFAULT 'not_started' NOT NULL,
	"final_score" integer,
	"is_passed" boolean DEFAULT false NOT NULL,
	"due_at" timestamp,
	"last_lesson_id" integer,
	"last_position_seconds" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_chitralearning_lessons" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"section_title" text DEFAULT '' NOT NULL,
	"section_order" integer DEFAULT 0 NOT NULL,
	"lesson_type" text DEFAULT 'video' NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"video_url" text DEFAULT '' NOT NULL,
	"file_url" text DEFAULT '' NOT NULL,
	"duration_minutes" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 1 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"quiz_settings" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_chitralearning_online_assignment_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"question_type" text DEFAULT 'single_choice' NOT NULL,
	"question_metadata" jsonb,
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
	"points" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_chitralearning_path_courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"path_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"sort_order" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_chitralearning_paths" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"cover_image_url" text,
	"created_by_employee_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_chitralearning_paths_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "hero_chitralearning_quiz_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"lesson_id" integer,
	"test_phase" text DEFAULT 'posttest' NOT NULL,
	"question_type" text DEFAULT 'single_choice' NOT NULL,
	"question_metadata" jsonb,
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
	"points" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_cs_forecast_daily_report_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_emails" text DEFAULT '' NOT NULL,
	"cc_emails" text DEFAULT '' NOT NULL,
	"send_times" text DEFAULT '08:00' NOT NULL,
	"timezone" text DEFAULT 'UTC+8' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"last_sent_key" text DEFAULT '' NOT NULL,
	"last_sent_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_employee_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"item_category" text DEFAULT 'APD' NOT NULL,
	"item_name" text NOT NULL,
	"size" text,
	"attachment_url" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"next_replacement_due" timestamp,
	"last_request_id" integer,
	"remarks" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_employee_mcu" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"clinic_id" integer,
	"clinic_name" text DEFAULT '' NOT NULL,
	"clinic_email" text DEFAULT '' NOT NULL,
	"paket_mcu" text DEFAULT '' NOT NULL,
	"scheduled_date" date,
	"mcu_date" date,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"result_file_url" text DEFAULT '' NOT NULL,
	"result_file_name" text DEFAULT '' NOT NULL,
	"result_date" date,
	"examined_by" text DEFAULT '' NOT NULL,
	"uploaded_by" text DEFAULT '' NOT NULL,
	"uploaded_at" timestamp,
	"ai_kesimpulan" text DEFAULT '' NOT NULL,
	"ai_saran" text DEFAULT '' NOT NULL,
	"ai_kategori" text DEFAULT '' NOT NULL,
	"ai_raw_json" jsonb,
	"ai_model" text DEFAULT '' NOT NULL,
	"ai_run_at" timestamp,
	"next_mcu_due" date,
	"reminder_sent_at" timestamp,
	"reminder_threshold_days" integer DEFAULT 30 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_employee_mcu_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"mcu_id" integer NOT NULL,
	"category" text NOT NULL,
	"metric_key" text NOT NULL,
	"metric_value" text DEFAULT '' NOT NULL,
	"metric_unit" text DEFAULT '' NOT NULL,
	"flag" text DEFAULT 'normal' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_form_wo_notification_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"tier1_approver_emails" text DEFAULT '' NOT NULL,
	"tier2_approver_emails" text DEFAULT '' NOT NULL,
	"tier3_approver_emails" text DEFAULT '' NOT NULL,
	"cc_emails" text DEFAULT '' NOT NULL,
	"tier3_threshold_amount" text DEFAULT '20000000' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_candidate_interviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"interview_type" text DEFAULT 'Online' NOT NULL,
	"location_or_link" text DEFAULT '' NOT NULL,
	"interviewer_name" text DEFAULT '' NOT NULL,
	"interviewer_emails" jsonb,
	"stage_name" text DEFAULT 'Interview 1' NOT NULL,
	"stage_order" integer DEFAULT 1 NOT NULL,
	"access_token" text,
	"status" text DEFAULT 'Scheduled' NOT NULL,
	"result" text DEFAULT 'Pending' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hc_candidate_interviews_access_token_unique" UNIQUE("access_token")
);
--> statement-breakpoint
CREATE TABLE "hero_hc_candidate_mcu" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"klinik_name" text NOT NULL,
	"klinik_email" text NOT NULL,
	"paket_mcu" text NOT NULL,
	"scheduled_date" date NOT NULL,
	"status" text DEFAULT 'Scheduled' NOT NULL,
	"result_notes" text DEFAULT '' NOT NULL,
	"result_file_url" text DEFAULT '' NOT NULL,
	"result_date" date,
	"result_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_candidate_offerings" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"position" text DEFAULT '' NOT NULL,
	"direct_supervisor" text DEFAULT '' NOT NULL,
	"salary" text DEFAULT '' NOT NULL,
	"contract_duration_months" integer DEFAULT 12 NOT NULL,
	"start_date" date,
	"outpatient_benefit" text DEFAULT 'Penusahaan memberikan bantuan biaya pengobatan rawat jalan sebesar Rp 3.500.000,-' NOT NULL,
	"inpatient_benefit" text DEFAULT 'Penusahaan akan memberikan biaya penggatan/Pengobatan sepengetahuan bagi karyawan beserta istri & 3 (tiga) anak yang sah secara hukum, apabila telah ditanggung menjadi tanggungan karyawan tetap' NOT NULL,
	"maternity_benefit" text DEFAULT 'Penusahaan akan memberikan bantuan sebesar Rp 8.000.000,-. Dan apabila dilakukan operasi caesar perusahaan akan mengganti biaya peralatan sebesar Rp 15.000.000, setelah ditanggung menjadi tanggungan karyawan tetap' NOT NULL,
	"accident_insurance" text DEFAULT 'Penusahaan akan menanggung premi asuransi sepengetahuannya' NOT NULL,
	"bpjs_employment" text DEFAULT 'Wajib berdasarkan Peraturan Pemerintah' NOT NULL,
	"bpjs_health" text DEFAULT 'Wajib berdasarkan Peraturan Pemerintah' NOT NULL,
	"thr" text DEFAULT 'Penusahaan akan memberikan THR setahun upah, dan apabila Saudara belum mencapai masa kerja 1 (satu) tahun tetapi sudah lebih dari 1 (satu) bulan, maka akan dihitung secara proporsional.' NOT NULL,
	"other_terms" text DEFAULT 'Ketentuan-ketentuan lain yang tidak secara khusus diatur dalam penawaran diatas (Biaya Perjalanan Dinas, Bantuan dan fasilitas lain dan perusahaan) akan tunduk pada peraturan/perjanjian karyawan yang berlaku. Pokok-pokok Musyawarah serta tetapkan pelaksanaan perusahaan' NOT NULL,
	"signatory_name" text DEFAULT '' NOT NULL,
	"signatory_title" text DEFAULT '' NOT NULL,
	"signature_url" text DEFAULT '' NOT NULL,
	"letter_number" text DEFAULT '' NOT NULL,
	"pdf_url" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'Draft' NOT NULL,
	"sent_at" timestamp,
	"responded_at" timestamp,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hc_candidate_offerings_candidate_id_unique" UNIQUE("candidate_id")
);
--> statement-breakpoint
CREATE TABLE "hero_hc_candidate_panel_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"interview_id" integer,
	"panelist_name" text NOT NULL,
	"panelist_role" text DEFAULT '' NOT NULL,
	"panelist_email" text DEFAULT '' NOT NULL,
	"stage_name" text DEFAULT 'Interview 1' NOT NULL,
	"daya_tangkap_score" integer DEFAULT 0 NOT NULL,
	"daya_tangkap_comment" text DEFAULT '' NOT NULL,
	"problem_solving_score" integer DEFAULT 0 NOT NULL,
	"problem_solving_comment" text DEFAULT '' NOT NULL,
	"motivational_fit_score" integer DEFAULT 0 NOT NULL,
	"motivational_fit_comment" text DEFAULT '' NOT NULL,
	"adaptability_score" integer DEFAULT 0 NOT NULL,
	"adaptability_comment" text DEFAULT '' NOT NULL,
	"interpersonal_skills_score" integer DEFAULT 0 NOT NULL,
	"interpersonal_skills_comment" text DEFAULT '' NOT NULL,
	"communication_skill_score" integer DEFAULT 0 NOT NULL,
	"communication_skill_comment" text DEFAULT '' NOT NULL,
	"fundamental_understanding_score" integer DEFAULT 0 NOT NULL,
	"fundamental_understanding_comment" text DEFAULT '' NOT NULL,
	"experience_related_score" integer DEFAULT 0 NOT NULL,
	"experience_related_comment" text DEFAULT '' NOT NULL,
	"technical_skill_score" integer DEFAULT 0 NOT NULL,
	"technical_skill_comment" text DEFAULT '' NOT NULL,
	"managerial_skills_score" integer DEFAULT 0 NOT NULL,
	"managerial_skills_comment" text DEFAULT '' NOT NULL,
	"leadership_score" integer DEFAULT 0 NOT NULL,
	"leadership_comment" text DEFAULT '' NOT NULL,
	"team_work_score" integer DEFAULT 0 NOT NULL,
	"team_work_comment" text DEFAULT '' NOT NULL,
	"technical_score" integer DEFAULT 0 NOT NULL,
	"communication_score" integer DEFAULT 0 NOT NULL,
	"culture_score" integer DEFAULT 0 NOT NULL,
	"problem_solving_score_legacy" integer DEFAULT 0 NOT NULL,
	"attitude_score" integer DEFAULT 0 NOT NULL,
	"overall_recommendation" text DEFAULT 'RECOMMENDED' NOT NULL,
	"job_match_comment" text DEFAULT '' NOT NULL,
	"recommendation_other_position" text DEFAULT '' NOT NULL,
	"strengths" text DEFAULT '' NOT NULL,
	"concerns" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_contract_review_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"review_id" integer NOT NULL,
	"step_order" integer NOT NULL,
	"approval_token" text NOT NULL,
	"approver_employee_id" integer,
	"approver_name" text NOT NULL,
	"approver_email" text DEFAULT '' NOT NULL,
	"approver_role" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"signature_data_url" text,
	"remarks" text DEFAULT '' NOT NULL,
	"signed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hc_contract_review_approvals_approval_token_unique" UNIQUE("approval_token")
);
--> statement-breakpoint
CREATE TABLE "hero_hc_contract_review_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer,
	"employee_sn" text NOT NULL,
	"employee_name" text NOT NULL,
	"section" text DEFAULT '' NOT NULL,
	"site_name" text DEFAULT '' NOT NULL,
	"contract_end_date" date NOT NULL,
	"reminder_type" text NOT NULL,
	"recipient_email" text DEFAULT '' NOT NULL,
	"recipient_name" text NOT NULL,
	"recipient_role" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"review_id" integer
);
--> statement-breakpoint
CREATE TABLE "hero_hc_contract_review_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"setting_key" text NOT NULL,
	"setting_value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hc_contract_review_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "hero_hc_email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"format" text DEFAULT 'html' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_employee_contract_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer,
	"review_type" text DEFAULT 'probation' NOT NULL,
	"contract_length" text DEFAULT '' NOT NULL,
	"today_date" date NOT NULL,
	"hire_date" date NOT NULL,
	"performance_activities" jsonb DEFAULT '[]'::jsonb,
	"comp_discipline_ach" text DEFAULT '' NOT NULL,
	"comp_discipline_remark" text DEFAULT '' NOT NULL,
	"comp_skill_ach" text DEFAULT '' NOT NULL,
	"comp_skill_remark" text DEFAULT '' NOT NULL,
	"comp_result_ach" text DEFAULT '' NOT NULL,
	"comp_result_remark" text DEFAULT '' NOT NULL,
	"comp_quality_ach" text DEFAULT '' NOT NULL,
	"comp_quality_remark" text DEFAULT '' NOT NULL,
	"comp_customer_ach" text DEFAULT '' NOT NULL,
	"comp_customer_remark" text DEFAULT '' NOT NULL,
	"comp_teamwork_ach" text DEFAULT '' NOT NULL,
	"comp_teamwork_remark" text DEFAULT '' NOT NULL,
	"recommendation" text DEFAULT '' NOT NULL,
	"contract_extended_months" integer,
	"contract_end_date" text,
	"permanent_date" text,
	"leader_name" text DEFAULT '' NOT NULL,
	"leader_signature_data_url" text,
	"employee_name_str" text DEFAULT '' NOT NULL,
	"superior_name" text DEFAULT '' NOT NULL,
	"hr_name" text DEFAULT '' NOT NULL,
	"next_superior_name" text DEFAULT '' NOT NULL,
	"letter_issuance" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_interview_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"default_interviewer_emails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_interviewer_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_duration_minutes" integer DEFAULT 60 NOT NULL,
	"default_location_or_link" text DEFAULT '' NOT NULL,
	"default_interview_type" text DEFAULT 'Online' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_leader_performance" (
	"id" serial PRIMARY KEY NOT NULL,
	"leader_id" integer,
	"reviewer_id" integer,
	"leader_sn" text NOT NULL,
	"reviewer_sn" text,
	"period" text NOT NULL,
	"survey_score" integer NOT NULL,
	"response_time_score" integer NOT NULL,
	"leadership_score" integer NOT NULL,
	"overall_score" numeric(3, 2) NOT NULL,
	"feedback" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_mcu_clinics" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"contact_person" text DEFAULT '' NOT NULL,
	"paket_options" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_notification_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_emails" text DEFAULT '' NOT NULL,
	"cc_emails" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_online_test_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"answer_text" text NOT NULL,
	"is_correct" boolean,
	"points_awarded" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_online_test_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_id" integer NOT NULL,
	"candidate_id" integer NOT NULL,
	"access_key" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"scheduled_at" timestamp,
	"scheduled_end_at" timestamp,
	"status" text DEFAULT 'Pending' NOT NULL,
	"score" integer,
	"duration_seconds" integer,
	"tab_leave_count" integer DEFAULT 0 NOT NULL,
	"refresh_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hc_online_test_assignments_access_key_unique" UNIQUE("access_key")
);
--> statement-breakpoint
CREATE TABLE "hero_hc_online_test_group_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"test_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_online_test_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hc_online_test_groups_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "hero_hc_online_test_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_id" integer NOT NULL,
	"question_type" text NOT NULL,
	"question_text" text NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"options" jsonb,
	"correct_answer" text DEFAULT '' NOT NULL,
	"points" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_online_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"time_limit_minutes" integer DEFAULT 60 NOT NULL,
	"passing_score" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_application_form" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_recruitment_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"recruitment_id" integer NOT NULL,
	"batch_name" text NOT NULL,
	"batch_type" text NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"scheduled_end_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_rfr_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"rfr_id" integer NOT NULL,
	"step_order" integer NOT NULL,
	"step_key" text NOT NULL,
	"role_label" text NOT NULL,
	"approver_name" text NOT NULL,
	"approver_email" text DEFAULT '' NOT NULL,
	"approver_title" text DEFAULT '' NOT NULL,
	"approver_employee_id" integer,
	"approval_token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"signature_data_url" text,
	"remarks" text DEFAULT '' NOT NULL,
	"signed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hc_rfr_approvals_approval_token_unique" UNIQUE("approval_token")
);
--> statement-breakpoint
CREATE TABLE "hero_hc_rfr_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"rfr_number" text NOT NULL,
	"request_date" date NOT NULL,
	"join_date_estimation" date NOT NULL,
	"requestor_name" text NOT NULL,
	"requestor_employee_id" integer,
	"section_department" text NOT NULL,
	"received_by_hr" text DEFAULT '' NOT NULL,
	"position_title" text NOT NULL,
	"number_of_persons" integer DEFAULT 1 NOT NULL,
	"brief_job_description" text DEFAULT '' NOT NULL,
	"level" text DEFAULT 'non_staff' NOT NULL,
	"reason_for_request" text DEFAULT 'new_headcount' NOT NULL,
	"mpp_status" text DEFAULT 'budgeted' NOT NULL,
	"reasons_if_non_budgeted" text DEFAULT '' NOT NULL,
	"employment_status" text DEFAULT 'contract' NOT NULL,
	"contract_duration_months" integer,
	"attachment_mpp" boolean DEFAULT false NOT NULL,
	"attachment_jd" boolean DEFAULT true NOT NULL,
	"uploaded_attachment_urls" jsonb DEFAULT '[]'::jsonb,
	"sex_preference" text DEFAULT 'any' NOT NULL,
	"age_preference" text DEFAULT 'any' NOT NULL,
	"education_degree" text DEFAULT 'any' NOT NULL,
	"education_background" jsonb DEFAULT '[]'::jsonb,
	"years_of_experience" text DEFAULT 'any' NOT NULL,
	"field_of_job_experience" text DEFAULT '' NOT NULL,
	"functional_competencies" jsonb DEFAULT '[]'::jsonb,
	"current_step_order" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"rejection_reason" text DEFAULT '' NOT NULL,
	"generated_recruitment_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hc_rfr_requests_rfr_number_unique" UNIQUE("rfr_number")
);
--> statement-breakpoint
CREATE TABLE "hero_hc_rfr_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"setting_key" text NOT NULL,
	"setting_value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hc_rfr_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "hero_hse_corrective_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"action_plan" text DEFAULT '' NOT NULL,
	"assignee_name" text DEFAULT '' NOT NULL,
	"due_date" timestamp,
	"priority" text DEFAULT 'Medium' NOT NULL,
	"status" text DEFAULT 'Open' NOT NULL,
	"close_out_note" text DEFAULT '' NOT NULL,
	"evidence_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_employee_id" integer,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hse_ptw_permits" (
	"id" serial PRIMARY KEY NOT NULL,
	"permit_number" text NOT NULL,
	"project_name" text NOT NULL,
	"permit_type" text DEFAULT 'Hot Work' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"area" text DEFAULT '' NOT NULL,
	"start_at" timestamp,
	"end_at" timestamp,
	"applicant_name" text DEFAULT '' NOT NULL,
	"field_pic_name" text DEFAULT '' NOT NULL,
	"authorized_by_name" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'Draft' NOT NULL,
	"risk_level" text DEFAULT 'Medium' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"control_steps" text DEFAULT '' NOT NULL,
	"ppe" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gas_test_required" boolean DEFAULT false NOT NULL,
	"isolation_required" boolean DEFAULT false NOT NULL,
	"hiradc_entry_id" integer,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_employee_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_hse_ptw_permits_permit_number_unique" UNIQUE("permit_number")
);
--> statement-breakpoint
CREATE TABLE "hero_hse_safety_notification_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_emails" text DEFAULT '' NOT NULL,
	"cc_emails" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_master_job_titles" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_master_job_titles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hero_master_level_staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_master_level_staff_name_unique" UNIQUE("name"),
	CONSTRAINT "hero_master_level_staff_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hero_mine_permit_reminder_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"additional_recipients" text DEFAULT '' NOT NULL,
	"excluded_manager_ids" text DEFAULT '[]' NOT NULL,
	"reminder_days" integer DEFAULT 30 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_navbar_group_label_styles" (
	"id" serial PRIMARY KEY NOT NULL,
	"section" text NOT NULL,
	"group_label" text NOT NULL,
	"text_color" text DEFAULT '#6B7280' NOT NULL,
	"background_color" text,
	"font_weight" text DEFAULT 'semibold' NOT NULL,
	"font_size" text DEFAULT '10px' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_overtime_command_letter_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"overtime_command_letter_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"category" text DEFAULT 'after_mandatory_ot' NOT NULL,
	"shift_code" text DEFAULT 'DS' NOT NULL,
	"roster_type" text DEFAULT '5:2' NOT NULL,
	"schedule_code" text DEFAULT '' NOT NULL,
	"work_streak_days" integer DEFAULT 0 NOT NULL,
	"overtime_credit_minutes" integer,
	"replacement_off_date" timestamp,
	"work_period" text DEFAULT '' NOT NULL,
	"payroll_period" text DEFAULT '' NOT NULL,
	"evidence_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_recruitment_section_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer,
	"job_description" text DEFAULT '' NOT NULL,
	"requirements" text DEFAULT '' NOT NULL,
	"qualifications" jsonb DEFAULT '[]'::jsonb,
	"mandatory_fields" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_road_condition_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"site_name" text NOT NULL,
	"customer_name" text NOT NULL,
	"inspector_name" text NOT NULL,
	"report_date" date NOT NULL,
	"average_score" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"model_used" text DEFAULT '' NOT NULL,
	"report_data" jsonb NOT NULL,
	"created_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_sio_certifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"cert_type" text NOT NULL,
	"cert_number" text,
	"cert_name" text NOT NULL,
	"issuing_body" text,
	"cert_date" date,
	"expiry_date" date,
	"status" text NOT NULL,
	"notes" text,
	"last_sync_from" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_sio_reminder_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"additional_recipients" text DEFAULT '' NOT NULL,
	"excluded_manager_ids" text DEFAULT '[]' NOT NULL,
	"reminder_days" integer DEFAULT 30 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_sop_win_departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"head_employee_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_sop_win_departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hero_sop_win_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_number" text NOT NULL,
	"title" text NOT NULL,
	"document_type" text NOT NULL,
	"department_code" text NOT NULL,
	"owner_employee_id" integer,
	"current_revision" text DEFAULT '00' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"pdf_file_url" text NOT NULL,
	"docx_file_url" text,
	"rag_document_id" text,
	"rag_chunks_count" integer DEFAULT 0 NOT NULL,
	"rag_status" text DEFAULT 'pending' NOT NULL,
	"rag_error_message" text,
	"rag_processed_at" timestamp,
	"summary" text DEFAULT '' NOT NULL,
	"effective_date" timestamp,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_sop_win_rag_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"revision_id" integer,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text DEFAULT 'pdf' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_sop_win_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"revision_number" text NOT NULL,
	"effective_date" timestamp DEFAULT now() NOT NULL,
	"change_description" text DEFAULT '' NOT NULL,
	"pdf_file_url" text NOT NULL,
	"docx_file_url" text,
	"rag_document_id" text,
	"rag_chunks_count" integer DEFAULT 0 NOT NULL,
	"rag_status" text DEFAULT 'pending' NOT NULL,
	"rag_error_message" text,
	"revised_by_employee_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "history_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"sorg" text,
	"bill_ty" text,
	"rev_type" text,
	"customer" text,
	"customer_name" text,
	"salesman" text,
	"item" text,
	"sloc" text,
	"plant" text,
	"material_no" text,
	"material_description" text,
	"size_dimen" text,
	"material_group" text,
	"mat_grp_desc" text,
	"mat_grp1" text,
	"mat_grp1_desc" text,
	"mat_grp2" text,
	"mat_grp2_desc" text,
	"mat_grp3" text,
	"mat_grp3_desc" text,
	"mat_grp4" text,
	"mat_grp4_desc" text,
	"mat_grp5" text,
	"mat_grp5_desc" text,
	"qty" double precision,
	"uom" text,
	"curr" text,
	"base_price" double precision,
	"intdept_price" double precision,
	"adjustment_price" double precision,
	"revenue_in_doc_curr" double precision,
	"revenue_in_loc_curr" double precision,
	"billing_no" text,
	"billing_date" text,
	"inco1" text,
	"inco2" text,
	"c" text,
	"cancelled" text,
	"delivery_no" text,
	"sales_order" text,
	"work_order" text,
	"po_no" text,
	"po_date" text,
	"po_type" text,
	"cost_of_sales" double precision,
	"profit_margin" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hr_counseling_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"attachment_url" text,
	"attachment_file_name" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hr_counseling_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"hr_id" integer NOT NULL,
	"category" text NOT NULL,
	"ticket_number" text,
	"status" text DEFAULT 'open' NOT NULL,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"customer_name" varchar(255),
	"email" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'sent' NOT NULL,
	"error_message" text,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cover_letter_signers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_revenue_sap" (
	"sales_rev_id" integer PRIMARY KEY NOT NULL,
	"sorg" text,
	"bill_ty" text,
	"rev_type" text,
	"customer" text,
	"customer_name" text,
	"salesman" text,
	"item" integer,
	"sloc" text,
	"plant" text,
	"material_no" text,
	"material_description" text,
	"size_dimen" text,
	"material_group" text,
	"mat_grp_desc" text,
	"mat_grp1" text,
	"mat_grp1_desc" text,
	"mat_grp2" text,
	"mat_grp2_desc" text,
	"mat_grp3" text,
	"mat_grp3_desc" text,
	"mat_grp4" text,
	"mat_grp4_desc" text,
	"mat_grp5" text,
	"mat_grp5_desc" text,
	"qty" integer,
	"uom" text,
	"curr" text,
	"base_price" double precision,
	"intdept_price" double precision,
	"adjustment_price" double precision,
	"revenue_in_doc_curr" double precision,
	"revenue_in_loc_curr" double precision,
	"billing_no" text,
	"billing_date" date,
	"inco1" text,
	"inco2" text,
	"c" text,
	"cancelled" text,
	"delivery_no" text,
	"sales_order" text,
	"work_order" text,
	"po_no" text,
	"po_date" date,
	"po_type" text,
	"cost_of_sales" double precision,
	"profit_margin" double precision,
	"extracted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "instagram_image_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"prompt" text NOT NULL,
	"enhanced_prompt" text,
	"format" text NOT NULL,
	"content_type" text NOT NULL,
	"visual_style" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"mime_type" text DEFAULT 'image/png' NOT NULL,
	"size_bytes" integer,
	"image_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_vendor_lead_time_materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"material_no" text NOT NULL,
	"material_desc" text,
	"lead_time_days" integer NOT NULL,
	"is_preferred" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_vendor_lead_times" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_name" text NOT NULL,
	"default_lead_time_days" integer,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "logistics_master_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_location" varchar(160) NOT NULL,
	"to_location" varchar(200) NOT NULL,
	"cost" numeric(16, 2) DEFAULT '0' NOT NULL,
	"truck_type" varchar(120),
	"status_tb" text,
	"ring_24" integer,
	"ring_25" integer,
	"ring_29" integer,
	"ring_33" integer,
	"ring_35" integer,
	"ring_49" integer,
	"ring_51" integer,
	"ring_57" integer,
	"ring_63" integer,
	"product_type" varchar(80),
	"notes" text,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"description" text,
	"segment_criteria" text,
	"cc_emails" text,
	"channel_type" varchar(50) DEFAULT 'email' NOT NULL,
	"attachments" text,
	"target_config" text,
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"total_recipients" integer DEFAULT 0,
	"success_count" integer DEFAULT 0,
	"failure_count" integer DEFAULT 0,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "me2l_purch_docs_sap" (
	"purch_doc_id" integer PRIMARY KEY NOT NULL,
	"item" integer,
	"purch_group" text,
	"doc_date" date,
	"order_qty" double precision,
	"net_price" double precision,
	"price_unit" integer,
	"delivered_qty" double precision,
	"delivered_val" double precision,
	"invoiced_qty" double precision,
	"invoiced_val" double precision,
	"net_order_value" double precision,
	"purch_org" text,
	"extracted_at" timestamp,
	"plant" text,
	"purchasing_doc" text,
	"vendor_name" text,
	"material" text,
	"tracking_no" text,
	"po_history" text,
	"currency" text,
	"doc_type" text,
	"doc_cat" text,
	"storage_loc" text,
	"order_unit" text,
	"release_state" text,
	"short_text" text,
	"material_group" text,
	"gr_processed_date" timestamp,
	"gr_warehouse_id" integer
);
--> statement-breakpoint
CREATE TABLE "ocr_extractions" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"pages_processed" integer DEFAULT 0 NOT NULL,
	"model" varchar(100) NOT NULL,
	"raw_text" text NOT NULL,
	"structured_json" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ocr_po_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_url" varchar(500) NOT NULL,
	"file_name" varchar(255),
	"file_type" varchar(50),
	"extracted_data" jsonb,
	"mapped_data" jsonb,
	"sales_order_id" integer,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"uploaded_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource" varchar(50) NOT NULL,
	"action" varchar(50) NOT NULL,
	"description" text,
	CONSTRAINT "resource_action_unique" UNIQUE("resource","action")
);
--> statement-breakpoint
CREATE TABLE "portal_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"icon" varchar(100) DEFAULT 'Globe' NOT NULL,
	"color" varchar(50) DEFAULT '#3b82f6' NOT NULL,
	"url" text NOT NULL,
	"new_tab" boolean DEFAULT true NOT NULL,
	"category" varchar(100) DEFAULT 'General' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"price_list_item_id" integer NOT NULL,
	"field_changed" varchar(50) NOT NULL,
	"old_value" text,
	"new_value" text,
	"reason" text,
	"changed_by_id" text,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_list_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"price_list_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"unit_price" numeric(16, 2) DEFAULT '0' NOT NULL,
	"min_qty" integer DEFAULT 1 NOT NULL,
	"max_qty" integer,
	"discount_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"margin_floor" numeric(5, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" "price_list_type" DEFAULT 'tier' NOT NULL,
	"customer_id" integer,
	"currency" varchar(10) DEFAULT 'IDR' NOT NULL,
	"valid_from" timestamp DEFAULT now() NOT NULL,
	"valid_until" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_bundle_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_product_id" integer NOT NULL,
	"child_product_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(100) NOT NULL,
	"material_number" varchar(100) NOT NULL,
	"material_number_ck" varchar(100),
	"material_number_ptro" varchar(100),
	"old_material_no" text,
	"material_description" text,
	"brand" varchar(100),
	"cost_sap" text,
	"plant" varchar(100),
	"sloc" varchar(100),
	"sloc_description" text,
	"type_warehouse" varchar(50),
	"image_url" text,
	"is_bundle" boolean DEFAULT false NOT NULL,
	"is_consignment" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unq_material_sloc" UNIQUE("material_number","sloc")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "quarterly_exchange_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"quarter" integer NOT NULL,
	"average_rate" numeric(14, 2) DEFAULT '0' NOT NULL,
	"rate_month_1" numeric(14, 2) DEFAULT '0' NOT NULL,
	"rate_month_2" numeric(14, 2) DEFAULT '0' NOT NULL,
	"rate_month_3" numeric(14, 2) DEFAULT '0' NOT NULL,
	"remarks" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"quotation_id" integer NOT NULL,
	"kind" varchar(30) DEFAULT 'supporting' NOT NULL,
	"title" varchar(255) NOT NULL,
	"file_url" varchar(255) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(150),
	"file_size" integer DEFAULT 0 NOT NULL,
	"description" text,
	"include_in_pdf" boolean DEFAULT true NOT NULL,
	"uploaded_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"quotation_id" integer NOT NULL,
	"product_id" integer,
	"quantity" integer NOT NULL,
	"description" text,
	"long_description" text,
	"unit_price" numeric(12, 2) NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(12, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"quotation_id" integer NOT NULL,
	"revision_number" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"change_summary" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"quotation_number" varchar(50),
	"customer_id" integer NOT NULL,
	"quotation_date" timestamp DEFAULT now() NOT NULL,
	"valid_until" timestamp,
	"subject" varchar(500),
	"created_by" varchar NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"payment_terms" text,
	"terms_conditions" text,
	"notes" text,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(12, 2) DEFAULT '0' NOT NULL,
	"shipping" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sales_order_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp,
	"approved_by" varchar,
	"rejected_at" timestamp,
	"rejected_by" varchar,
	"rejection_reason" text,
	"sales_person_id" text,
	"attn" varchar(200),
	"address" text,
	"closing_status" varchar(50),
	"tags" text,
	"currency" varchar(10) DEFAULT 'IDR',
	"reference_number" varchar(100),
	"admin_note" text,
	"client_note" text,
	"discount_type" varchar(20) DEFAULT 'fixed',
	"current_revision" integer DEFAULT 1 NOT NULL,
	"last_revision_at" timestamp,
	"expired_at" timestamp,
	"customer_po_number" varchar(100),
	"customer_po_document" varchar(255),
	"customer_po_uploaded_at" timestamp,
	"customer_po_uploaded_by" varchar,
	"po_validation_status" varchar(30),
	"po_validation_checked_at" timestamp,
	"po_validation_ocr_session_id" integer,
	"po_validation_summary" jsonb,
	"auto_converted_at" timestamp,
	"auto_converted_by" varchar,
	CONSTRAINT "quotations_quotation_number_unique" UNIQUE("quotation_number")
);
--> statement-breakpoint
CREATE TABLE "repair_master_price" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" varchar(50) DEFAULT 'Repair' NOT NULL,
	"customer" varchar(255) DEFAULT 'OTHER CUSTOMER' NOT NULL,
	"site" varchar(255),
	"size" varchar(100) NOT NULL,
	"damage_type" varchar(50) DEFAULT 'R1' NOT NULL,
	"price" numeric(15, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfid_scans" (
	"id" serial PRIMARY KEY NOT NULL,
	"tag_id" varchar(100) NOT NULL,
	"serial_number" varchar(100),
	"epc" varchar(100),
	"rssi" varchar(20),
	"linked" boolean DEFAULT false NOT NULL,
	"plant" varchar(50),
	"category" varchar(100),
	"material_number" varchar(100),
	"material_description" text,
	"sloc" varchar(50),
	"sloc_description" text,
	"act_stock" integer,
	"created_by" varchar(100),
	"product_id" integer,
	"warehouse_id" integer,
	"scan_type" varchar(10),
	"user_id" varchar,
	"scanned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rmi_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"quarter" integer NOT NULL,
	"natural_rubber" numeric(14, 4) DEFAULT '0' NOT NULL,
	"synthetic_rubber" numeric(14, 4) DEFAULT '0' NOT NULL,
	"carbon_black" numeric(14, 4) DEFAULT '0' NOT NULL,
	"steel_cord" numeric(14, 4) DEFAULT '0' NOT NULL,
	"freight" numeric(14, 4) DEFAULT '0' NOT NULL,
	"fx_index" numeric(14, 4) DEFAULT '0' NOT NULL,
	"rmi_value" numeric(14, 4) DEFAULT '0' NOT NULL,
	"source" varchar(255),
	"remarks" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rmi_weights" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar(255) DEFAULT 'Default' NOT NULL,
	"natural_rubber_weight" numeric(5, 4) DEFAULT '0.35' NOT NULL,
	"synthetic_rubber_weight" numeric(5, 4) DEFAULT '0.20' NOT NULL,
	"carbon_black_weight" numeric(5, 4) DEFAULT '0.20' NOT NULL,
	"steel_cord_weight" numeric(5, 4) DEFAULT '0.15' NOT NULL,
	"freight_weight" numeric(5, 4) DEFAULT '0.05' NOT NULL,
	"fx_weight" numeric(5, 4) DEFAULT '0.05' NOT NULL,
	"base_period_natural_rubber" numeric(14, 4) DEFAULT '2.05' NOT NULL,
	"base_period_synthetic_rubber" numeric(14, 4) DEFAULT '13200.0' NOT NULL,
	"base_period_carbon_black" numeric(14, 4) DEFAULT '1.45' NOT NULL,
	"base_period_steel_cord" numeric(14, 4) DEFAULT '1.10' NOT NULL,
	"base_period_freight" numeric(14, 4) DEFAULT '2800.0' NOT NULL,
	"base_period_exchange_rate" numeric(14, 4) DEFAULT '16500.0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sales_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"uploaded_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sales_order_id" integer NOT NULL,
	"product_id" integer,
	"source_quotation_item_id" integer,
	"description" text,
	"long_description" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(12, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" varchar(50),
	"customer_po" varchar(100),
	"trip_destination" varchar(255),
	"customer_id" integer NOT NULL,
	"sales_person_id" text,
	"warehouse_id" integer,
	"sales_date" timestamp DEFAULT now() NOT NULL,
	"po_receive" timestamp,
	"category_po" varchar(50),
	"category_product" varchar(50),
	"po_document" varchar(255),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"terms_conditions" text,
	"notes" text,
	"discount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"shipping" numeric(12, 2) DEFAULT '0' NOT NULL,
	"source_type" varchar(30),
	"quotation_id" integer,
	"quotation_number" varchar(50),
	"quotation_revision" integer,
	"quotation_subject" varchar(500),
	"quotation_reference_number" varchar(100),
	"quotation_valid_until" timestamp,
	"quotation_currency" varchar(10),
	"quotation_discount_type" varchar(20),
	"quotation_tax" numeric(12, 2),
	"quotation_admin_note" text,
	"quotation_client_note" text,
	"customer_attn" varchar(200),
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sales_orders_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "sap_sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"sync_type" varchar(50),
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"status" varchar(50),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(50) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slow_moving_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"material_key" varchar(150) NOT NULL,
	"material_number" varchar(150) NOT NULL,
	"description" text,
	"initial_stock" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "slow_moving_products_material_key_unique" UNIQUE("material_key")
);
--> statement-breakpoint
CREATE TABLE "stock_booking_consumptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_booking_id" integer NOT NULL,
	"delivery_id" integer NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_booking_consumptions_booking_delivery_unique" UNIQUE("stock_booking_id","delivery_id")
);
--> statement-breakpoint
CREATE TABLE "stock_customer_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_level_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"remark" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_customer_bookings_stock_level_customer_unique" UNIQUE("stock_level_id","customer_id")
);
--> statement-breakpoint
CREATE TABLE "stock_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"warehouse_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"valuation_value" numeric(20, 2) DEFAULT '0' NOT NULL,
	"draft_booked_stock" integer DEFAULT 0 NOT NULL,
	"booked_stock" integer DEFAULT 0 NOT NULL,
	"total_stock" integer DEFAULT 0 NOT NULL,
	"min_stock" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_levels_warehouse_product_unique" UNIQUE("warehouse_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"source" varchar(50) DEFAULT 'OTHER' NOT NULL,
	"reference_number" varchar(100),
	"recorded_by" text,
	"customer_id" integer,
	"from_warehouse_id" integer,
	"to_warehouse_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_opname_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"system_qty" integer DEFAULT 0 NOT NULL,
	"counted_qty" integer,
	"variance" integer,
	"notes" text,
	"counted_by_id" text,
	"counted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_opname_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"warehouse_id" integer NOT NULL,
	"status" "stock_opname_status" DEFAULT 'open' NOT NULL,
	"source_type" varchar(20) DEFAULT 'sap' NOT NULL,
	"notes" text,
	"selected_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notify_roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notify_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"opname_date" timestamp NOT NULL,
	"opname_time" varchar(10) NOT NULL,
	"location" varchar(200) NOT NULL,
	"document_url" varchar(500),
	"document_title" varchar(200),
	"document_file_name" varchar(200),
	"document_file_type" varchar(100),
	"document_file_size" integer,
	"document_uploaded_at" timestamp,
	"document_uploaded_by" text,
	"created_by_id" text,
	"closed_by_id" text,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_opname_signatures" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"position" varchar(200) NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_transfer_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"transfer_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference_number" varchar(50),
	"delivery_id" integer,
	"from_warehouse_id" integer NOT NULL,
	"to_warehouse_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"received_status" varchar(20) DEFAULT 'Scheduled' NOT NULL,
	"posting_document_no" varchar(100),
	"batch_no" varchar(100),
	"notes" text,
	"transfer_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_transfers_reference_number_unique" UNIQUE("reference_number")
);
--> statement-breakpoint
CREATE TABLE "tire_performance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(20) NOT NULL,
	"performance_date" varchar(100) NOT NULL,
	"end_user" varchar(150) NOT NULL,
	"mine_site" varchar(150) NOT NULL,
	"manufacture" varchar(150) NOT NULL,
	"specification" text NOT NULL,
	"avg_hours" numeric(14, 2) DEFAULT '0' NOT NULL,
	"record_count" integer DEFAULT 0 NOT NULL,
	"remarks" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notification_reads" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"email_log_id" text NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_notification_reads_user_log_unique" UNIQUE("user_id","email_log_id")
);
--> statement-breakpoint
CREATE TABLE "user_warehouse_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"warehouse_id" integer NOT NULL,
	"access_level" varchar(10) DEFAULT 'edit' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_warehouse_access_user_warehouse_unique" UNIQUE("user_id","warehouse_id")
);
--> statement-breakpoint
CREATE TABLE "vendor_quotation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_quotation_id" integer NOT NULL,
	"item_name" text NOT NULL,
	"qty" numeric(12, 4) DEFAULT '0' NOT NULL,
	"unit" varchar(50),
	"unit_price" numeric(18, 2) DEFAULT '0' NOT NULL,
	"total_price" numeric(18, 2) DEFAULT '0' NOT NULL,
	"remark" text
);
--> statement-breakpoint
CREATE TABLE "vendor_quotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"epr_entry_id" varchar(100),
	"file_url" text NOT NULL,
	"file_name" varchar(500),
	"vendor_name" varchar(500),
	"quote_number" varchar(200),
	"quote_date" varchar(100),
	"remark" text,
	"ocr_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"extracted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" serial PRIMARY KEY NOT NULL,
	"sloc" varchar(50) NOT NULL,
	"description" text,
	"type" varchar(50),
	"customer_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "warehouses_sloc_unique" UNIQUE("sloc")
);
--> statement-breakpoint
CREATE TABLE "zmc9_stock_sap" (
	"stock_id" integer PRIMARY KEY NOT NULL,
	"plant_code" text,
	"plant_name" text,
	"material_no" text,
	"old_material_no" text,
	"material_desc" text,
	"stor_loc" text,
	"stor_loc_desc" text,
	"total_stock" numeric(20, 3),
	"base_unit_of_measure" text,
	"value_stock" numeric(20, 3),
	"currency" text,
	"extracted_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "zvendor_po_report_sap" (
	"po_report_id" integer PRIMARY KEY NOT NULL,
	"company_code" text,
	"vendor_code" text,
	"vendor_name" text,
	"po_no" text,
	"order" text,
	"item" integer,
	"po_date" date,
	"material" text,
	"short_text" text,
	"po_quantity" integer,
	"oun" text,
	"net_value" numeric(20, 2),
	"currency" text,
	"gr_date" date,
	"gr_quantity" integer,
	"gr_currency" text,
	"total_gr_value_idr" numeric(20, 2),
	"total_gr_value_usd" numeric(20, 2),
	"plant" text,
	"plant_group" text,
	"invoice_po_date" date,
	"total_invoice_value" numeric(20, 2),
	"outstanding_value" numeric(20, 2),
	"outstanding_quantity" integer,
	"cost_center" text,
	"asset_number" text,
	"material_type" text,
	"a" text,
	"good_received_non_valuated" text,
	"extracted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "iw39_pmo_report_sap" (
	"pmo_report_id" integer PRIMARY KEY NOT NULL,
	"order_type" text,
	"wo_number_sap" text,
	"wo_create_on" date,
	"customer_id" text,
	"customer_name" text,
	"basic_start" date,
	"basic_finish" date,
	"po_number" text,
	"po_date" date,
	"work_description" text,
	"system_status" text,
	"actual_total_cost" numeric(20, 2),
	"actual_total_revenue" numeric(20, 2),
	"extracted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hero_inspection_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_id" uuid NOT NULL,
	"section" varchar(100) NOT NULL,
	"question" text NOT NULL,
	"answer" boolean NOT NULL,
	"score" integer NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_inspection_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_id" uuid NOT NULL,
	"section" varchar(100) NOT NULL,
	"image_url" varchar(1000) NOT NULL,
	"caption" text,
	"ai_caption" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_name" varchar(255) NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"inspection_date" timestamp NOT NULL,
	"inspector_id" integer NOT NULL,
	"shift" varchar(50) NOT NULL,
	"unit_name" varchar(255) NOT NULL,
	"notes" text,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"summary" text,
	"findings" text,
	"recommendations" text,
	"loading_score" double precision,
	"haul_road_score" double precision,
	"dumping_score" double precision,
	"total_score" double precision,
	"attendees" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_jsa_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setting_key" varchar(255) NOT NULL,
	"setting_value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_jsa_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "hero_service360_customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_service360_employee_levels" (
	"employee_id" integer PRIMARY KEY NOT NULL,
	"level" text DEFAULT '1' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_service360_form_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"field" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_service360_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"site_id" integer,
	"job_title" text,
	"name" text NOT NULL,
	"price" numeric(15, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_service360_quotation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"quotation_id" integer NOT NULL,
	"item_id" integer,
	"month_period" text,
	"level" text,
	"custom_description" text,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"price" numeric(15, 2) DEFAULT '0' NOT NULL,
	"subtotal" numeric(15, 2) DEFAULT '0' NOT NULL,
	"is_backup" boolean DEFAULT false NOT NULL,
	"backup_start_date" date,
	"backup_end_date" date,
	"backup_month_period" text,
	"backup_level" text,
	"backup_description" text,
	"backup_price" numeric(15, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_service360_quotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"quotation_number" text NOT NULL,
	"customer_id" integer NOT NULL,
	"quotation_date" date NOT NULL,
	"attn" text,
	"cc" text,
	"from_name" text,
	"from_signature_url" text,
	"subject" text,
	"po_number" text,
	"po_file_url" text,
	"project_name" text,
	"po_period" text,
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"sub_total" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'Draft' NOT NULL,
	"show_level" boolean DEFAULT true NOT NULL,
	"show_qty" boolean DEFAULT false NOT NULL,
	"notes" text,
	"show_intro" boolean DEFAULT true NOT NULL,
	"custom_intro" text,
	"hide_backup_price" boolean DEFAULT false NOT NULL,
	"hide_backup_date" boolean DEFAULT false NOT NULL,
	"hide_month_column" boolean DEFAULT false NOT NULL,
	"discount_type" text,
	"discount_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"show_days" boolean DEFAULT true NOT NULL,
	"include_bast" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_service360_quotations_quotation_number_unique" UNIQUE("quotation_number")
);
--> statement-breakpoint
CREATE TABLE "hero_service360_rate_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_location" text NOT NULL,
	"section" text NOT NULL,
	"level" text NOT NULL,
	"price" numeric(15, 2) DEFAULT '0' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_attendance_permission_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"approval_submission_id" integer,
	"permission_type" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"sick_category" text DEFAULT '' NOT NULL,
	"late_reason" text DEFAULT '' NOT NULL,
	"return_time" text DEFAULT '' NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"attachment_url" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approver_user_id" text,
	"approver_note" text DEFAULT '' NOT NULL,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_timesheet_payroll_snapshot_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"day" integer NOT NULL,
	"schedule_code" text DEFAULT '' NOT NULL,
	"attendance_status" text DEFAULT 'empty' NOT NULL,
	"clock_in" text DEFAULT '' NOT NULL,
	"clock_out" text DEFAULT '' NOT NULL,
	"msa_amount" integer DEFAULT 0 NOT NULL,
	"meals_amount" integer DEFAULT 0 NOT NULL,
	"tlk_amount" integer DEFAULT 0 NOT NULL,
	"overtime_hours" numeric(8, 2) DEFAULT '0' NOT NULL,
	"source" text DEFAULT 'attendance' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_timesheet_payroll_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"period" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"employee_count" integer DEFAULT 0 NOT NULL,
	"total_msa" integer DEFAULT 0 NOT NULL,
	"total_meals" integer DEFAULT 0 NOT NULL,
	"total_tlk" integer DEFAULT 0 NOT NULL,
	"total_overtime_hours" numeric(10, 2) DEFAULT '0' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"saved_by_user_id" text,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_timesheet_scheduling_plans_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" integer NOT NULL,
	"period" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"draft_schedule" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active_schedule" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"activated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tire_pattern_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"pattern_id" integer,
	"image_url" varchar(1000),
	"image_base64_hash" varchar(100),
	"model_used" varchar(100) NOT NULL,
	"prompt" text,
	"raw_response" text,
	"parsed_result" jsonb,
	"confidence" integer,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tire_patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"tire_size" varchar(50) NOT NULL,
	"pattern_type" varchar(100) NOT NULL,
	"groove_angle" integer DEFAULT 45,
	"groove_width_mm" integer DEFAULT 8,
	"groove_depth_mm" integer DEFAULT 12,
	"pattern_density" integer DEFAULT 50,
	"repeat_unit_mm" integer,
	"pattern_svg" text,
	"pattern_config" jsonb,
	"reference_image_url" varchar(1000),
	"thumbnail_url" varchar(1000),
	"analysis_result" jsonb,
	"analysis_model" varchar(100),
	"analysis_source" varchar(50),
	"tire_section_width_mm" integer,
	"tire_aspect_ratio" integer,
	"tire_rim_diameter_mm" integer,
	"tire_circumference_mm" integer,
	"tire_tread_width_mm" integer,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tire_size_presets" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"label" varchar(100) NOT NULL,
	"section_width" integer NOT NULL,
	"aspect_ratio" integer DEFAULT 100 NOT NULL,
	"rim_diameter" integer NOT NULL,
	"rim_diameter_mm" integer NOT NULL,
	"circumference_mm" integer NOT NULL,
	"tread_width_mm" integer NOT NULL,
	"category" varchar(50) DEFAULT 'truck',
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_warehouse_repair_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_no" text NOT NULL,
	"transaction_date" date NOT NULL,
	"item_id" integer NOT NULL,
	"from_sloc" text NOT NULL,
	"from_sloc_desc" text NOT NULL,
	"to_sloc" text NOT NULL,
	"to_sloc_desc" text NOT NULL,
	"quantity" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hero_cargo_manifests" DROP CONSTRAINT "hero_cargo_manifests_manifest_number_unique";--> statement-breakpoint
ALTER TABLE "hero_hc_disciplinary_actions" DROP CONSTRAINT "hero_hc_disciplinary_actions_employee_id_hero_hr_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "hero_hc_leave_balances" DROP CONSTRAINT "hero_hc_leave_balances_employee_id_hero_hr_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "hero_hc_leave_requests" DROP CONSTRAINT "hero_hc_leave_requests_employee_id_hero_hr_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "hero_hc_letters" DROP CONSTRAINT "hero_hc_letters_employee_id_hero_hr_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "hero_hc_offboarding_requests" DROP CONSTRAINT "hero_hc_offboarding_requests_employee_id_hero_hr_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "hero_hc_onboarding_records" DROP CONSTRAINT "hero_hc_onboarding_records_employee_id_hero_hr_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "hero_hc_performance_reviews" DROP CONSTRAINT "hero_hc_performance_reviews_employee_id_hero_hr_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "hero_hc_performance_reviews" DROP CONSTRAINT "hero_hc_performance_reviews_reviewer_id_hero_hr_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "hero_approvals" ALTER COLUMN "activity_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_recruitments" ALTER COLUMN "section" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "hero_activities" ADD COLUMN "tire_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_activities" ADD COLUMN "is_team_activity" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_activities" ADD COLUMN "team_name_list" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_activity_libraries" ADD COLUMN "site_ids" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "hero_activity_libraries" ADD COLUMN "department_ids" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "hero_activity_libraries" ADD COLUMN "section_ids" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "hero_activity_libraries" ADD COLUMN "requires_tire_count" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "submission_id" integer;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "apd_request_id" integer;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD COLUMN "signature_url" text;--> statement-breakpoint
ALTER TABLE "hero_attendance_records" ADD COLUMN "source" text DEFAULT 'face-v1';--> statement-breakpoint
ALTER TABLE "hero_daily_activity_sessions" ADD COLUMN "activity_id" integer;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "join_date" date;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "contract_duration_start" date;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "contract_duration_end" date;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "permanent_date" date;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "point_of_hire" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "birth_date" date;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "exp_mine_permit" date;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "manpower" text DEFAULT 'Lokal' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "gender" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "marital_status" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "religion" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "education" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "face_raray_id" text;--> statement-breakpoint
ALTER TABLE "hero_employees" ADD COLUMN "face_raray_registered_at" timestamp;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "date_of_birth" timestamp;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "address" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "gender" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "work_experience" jsonb;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "education" jsonb;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "driving_licenses" jsonb;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "certificates" jsonb;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "achievements" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "ai_score" integer;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "ai_summary" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "ai_details" jsonb;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "ai_assessment_date" timestamp;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "onboarding_token" text;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "nik_ktp" text;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "npwp_number" text;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "bpjs_kesehatan" text;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "bpjs_ketenagakerjaan" text;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "bank_name" text;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "bank_account_number" text;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "emergency_contact_name" text;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "emergency_contact_phone" text;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "kk_url" text;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "ktp_url" text;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "bank_book_url" text;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD COLUMN "onboarding_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "hero_hc_leave_requests" ADD COLUMN "approval_submission_id" integer;--> statement-breakpoint
ALTER TABLE "hero_hc_offboarding_requests" ADD COLUMN "approval_submission_id" integer;--> statement-breakpoint
ALTER TABLE "hero_hc_recruitments" ADD COLUMN "department" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_recruitments" ADD COLUMN "location" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_recruitments" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_recruitments" ADD COLUMN "start_date" timestamp;--> statement-breakpoint
ALTER TABLE "hero_hc_recruitments" ADD COLUMN "end_date" timestamp;--> statement-breakpoint
ALTER TABLE "hero_hc_recruitments" ADD COLUMN "job_description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_recruitments" ADD COLUMN "requirements" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_hc_recruitments" ADD COLUMN "qualifications" jsonb;--> statement-breakpoint
ALTER TABLE "hero_hc_recruitments" ADD COLUMN "mandatory_fields" jsonb;--> statement-breakpoint
ALTER TABLE "hero_hc_recruitments" ADD COLUMN "scoring_criteria" jsonb;--> statement-breakpoint
ALTER TABLE "hero_hc_recruitments" ADD COLUMN "knockout_criteria" jsonb;--> statement-breakpoint
ALTER TABLE "hero_hc_recruitments" ADD COLUMN "email_template_id" integer;--> statement-breakpoint
ALTER TABLE "hero_hc_recruitments" ADD COLUMN "rfr_id" integer;--> statement-breakpoint
ALTER TABLE "hero_master_departments" ADD COLUMN "head_employee_id" integer;--> statement-breakpoint
ALTER TABLE "hero_master_sections" ADD COLUMN "head_employee_id" integer;--> statement-breakpoint
ALTER TABLE "hero_master_sections" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "hero_navbar_menu_items" ADD COLUMN "item_type" text DEFAULT 'menu' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_navbar_menu_items" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "hero_navbar_menu_items" ADD COLUMN "group_label" text;--> statement-breakpoint
ALTER TABLE "hero_navbar_menu_items" ADD COLUMN "is_iframe" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_overtime_command_letters" ADD COLUMN "origin" text DEFAULT 'leader_command' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_overtime_command_letters" ADD COLUMN "request_kind" text DEFAULT 'base' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_overtime_command_letters" ADD COLUMN "parent_spl_id" integer;--> statement-breakpoint
ALTER TABLE "hero_role_menu_permissions" ADD COLUMN "data_scope" text DEFAULT 'own' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_sites" ADD COLUMN "head_employee_id" integer;--> statement-breakpoint
ALTER TABLE "hero_sites" ADD COLUMN "site_type" text DEFAULT 'Site' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_timesheet_attendance_real_overrides" ADD COLUMN "overtime_hours" double precision;--> statement-breakpoint
ALTER TABLE "hero_timesheet_field_break_plans" ADD COLUMN "field_break_end_date" date;--> statement-breakpoint
ALTER TABLE "hero_timesheet_field_break_plans" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_timesheet_field_break_plans" ADD COLUMN "is_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_timesheet_field_break_plans" ADD COLUMN "notes" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_timesheet_scheduling_configs" ADD COLUMN "overtime_config" jsonb;--> statement-breakpoint
ALTER TABLE "hero_timesheet_scheduling_configs" ADD COLUMN "pdf_config" jsonb;--> statement-breakpoint
ALTER TABLE "hero_warehouse_repair_inbound" ADD COLUMN "target_sloc" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_warehouse_repair_inbound" ADD COLUMN "target_sloc_desc" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_warehouse_repair_items" ADD COLUMN "material_desc" text;--> statement-breakpoint
ALTER TABLE "hero_warehouse_repair_items" ADD COLUMN "storage_location" text;--> statement-breakpoint
ALTER TABLE "hero_warehouse_repair_items" ADD COLUMN "storage_location_desc" text;--> statement-breakpoint
ALTER TABLE "hero_warehouse_repair_outbound" ADD COLUMN "outbound_type" text DEFAULT 'Pemakaian Internal' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_warehouse_repair_outbound" ADD COLUMN "destination_sloc" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_warehouse_repair_outbound" ADD COLUMN "destination_sloc_desc" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "restock_notifications" ADD CONSTRAINT "restock_notifications_prediction_id_ai_inventory_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."ai_inventory_predictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_apd_request_items" ADD CONSTRAINT "hero_apd_request_items_request_id_hero_apd_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."hero_apd_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_apd_requests" ADD CONSTRAINT "hero_apd_requests_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_apd_requests" ADD CONSTRAINT "hero_apd_requests_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_assignments" ADD CONSTRAINT "approval_assignments_request_id_approval_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."approval_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_assignments" ADD CONSTRAINT "approval_assignments_step_id_approval_definition_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."approval_definition_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_assignments" ADD CONSTRAINT "approval_assignments_assignee_user_id_user_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_audit_logs" ADD CONSTRAINT "approval_audit_logs_request_id_approval_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."approval_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_audit_logs" ADD CONSTRAINT "approval_audit_logs_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_definition_steps" ADD CONSTRAINT "approval_definition_steps_definition_id_approval_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."approval_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_definition_steps" ADD CONSTRAINT "approval_definition_steps_approver_user_id_user_id_fk" FOREIGN KEY ("approver_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_definitions" ADD CONSTRAINT "approval_definitions_form_key_approval_form_registry_form_key_fk" FOREIGN KEY ("form_key") REFERENCES "public"."approval_form_registry"("form_key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_definitions" ADD CONSTRAINT "approval_definitions_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_form_registry" ADD CONSTRAINT "approval_form_registry_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_matrix_imports" ADD CONSTRAINT "approval_matrix_imports_imported_by_user_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_org_structure_nodes" ADD CONSTRAINT "approval_org_structure_nodes_structure_id_approval_org_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."approval_org_structures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_org_structure_nodes" ADD CONSTRAINT "approval_org_structure_nodes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_org_structures" ADD CONSTRAINT "approval_org_structures_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_definition_id_approval_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."approval_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_workflow_presets" ADD CONSTRAINT "approval_workflow_presets_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_delivery_item_id_delivery_items_id_fk" FOREIGN KEY ("delivery_item_id") REFERENCES "public"."delivery_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_sales_order_item_id_sales_order_items_id_fk" FOREIGN KEY ("sales_order_item_id") REFERENCES "public"."sales_order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundling_histories" ADD CONSTRAINT "bundling_histories_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_related_customer_id_customers_id_fk" FOREIGN KEY ("related_customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_contract_details" ADD CONSTRAINT "campaign_contract_details_contract_id_campaign_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."campaign_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_contracts" ADD CONSTRAINT "campaign_contracts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_customer_categories" ADD CONSTRAINT "campaign_customer_categories_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_products" ADD CONSTRAINT "campaign_products_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_central_service_asset_attachments" ADD CONSTRAINT "hero_central_service_asset_attachments_asset_id_hero_central_service_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."hero_central_service_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_central_service_asset_histories" ADD CONSTRAINT "hero_central_service_asset_histories_asset_id_hero_central_service_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."hero_central_service_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_central_service_forecast_actuals" ADD CONSTRAINT "hero_central_service_forecast_actuals_period_id_hero_central_service_forecast_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."hero_central_service_forecast_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_central_service_forecast_actuals" ADD CONSTRAINT "hero_central_service_forecast_actuals_forecast_item_id_hero_central_service_forecast_items_id_fk" FOREIGN KEY ("forecast_item_id") REFERENCES "public"."hero_central_service_forecast_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_central_service_forecast_actuals" ADD CONSTRAINT "hero_central_service_forecast_actuals_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_central_service_forecast_histories" ADD CONSTRAINT "hero_central_service_forecast_histories_forecast_item_id_hero_central_service_forecast_items_id_fk" FOREIGN KEY ("forecast_item_id") REFERENCES "public"."hero_central_service_forecast_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_central_service_forecast_histories" ADD CONSTRAINT "hero_central_service_forecast_histories_action_by_id_user_id_fk" FOREIGN KEY ("action_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_central_service_forecast_items" ADD CONSTRAINT "hero_central_service_forecast_items_period_id_hero_central_service_forecast_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."hero_central_service_forecast_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_room_id_chat_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_room_members" ADD CONSTRAINT "chat_room_members_room_id_chat_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_room_members" ADD CONSTRAINT "chat_room_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_user_stickers" ADD CONSTRAINT "chat_user_stickers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_activities" ADD CONSTRAINT "competitor_activities_business_consultant_id_user_id_fk" FOREIGN KEY ("business_consultant_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_activities" ADD CONSTRAINT "competitor_activities_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_prices" ADD CONSTRAINT "competitor_prices_business_consultant_id_user_id_fk" FOREIGN KEY ("business_consultant_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_prices" ADD CONSTRAINT "competitor_prices_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_sales" ADD CONSTRAINT "lost_sales_business_consultant_id_user_id_fk" FOREIGN KEY ("business_consultant_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_sales" ADD CONSTRAINT "lost_sales_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cosmetic_tires" ADD CONSTRAINT "cosmetic_tires_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_settlement_items" ADD CONSTRAINT "cost_settlement_items_settlement_id_cost_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."cost_settlements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_settlement_items" ADD CONSTRAINT "cost_settlement_items_delivery_item_id_delivery_items_id_fk" FOREIGN KEY ("delivery_item_id") REFERENCES "public"."delivery_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_settlement_receipts" ADD CONSTRAINT "cost_settlement_receipts_settlement_item_id_cost_settlement_items_id_fk" FOREIGN KEY ("settlement_item_id") REFERENCES "public"."cost_settlement_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_settlement_receipts" ADD CONSTRAINT "cost_settlement_receipts_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_settlement_signatories" ADD CONSTRAINT "cost_settlement_signatories_settlement_id_cost_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."cost_settlements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_settlements" ADD CONSTRAINT "cost_settlements_fleet_trip_id_fleet_trips_id_fk" FOREIGN KEY ("fleet_trip_id") REFERENCES "public"."fleet_trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_settlements" ADD CONSTRAINT "cost_settlements_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_settlements" ADD CONSTRAINT "cost_settlements_approval_request_id_approval_requests_id_fk" FOREIGN KEY ("approval_request_id") REFERENCES "public"."approval_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_settlements" ADD CONSTRAINT "cost_settlements_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_letter_items" ADD CONSTRAINT "cover_letter_items_cover_letter_id_cover_letters_id_fk" FOREIGN KEY ("cover_letter_id") REFERENCES "public"."cover_letters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_sales_order_id_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_warehouse_to_id_warehouses_id_fk" FOREIGN KEY ("warehouse_to_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_items" ADD CONSTRAINT "delivery_items_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_items" ADD CONSTRAINT "delivery_items_sales_order_item_id_sales_order_items_id_fk" FOREIGN KEY ("sales_order_item_id") REFERENCES "public"."sales_order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_items" ADD CONSTRAINT "delivery_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_group_members" ADD CONSTRAINT "email_group_members_group_id_email_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."email_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_group_members" ADD CONSTRAINT "email_group_members_contact_id_email_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."email_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_groups" ADD CONSTRAINT "email_groups_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_notification_rule_logs" ADD CONSTRAINT "email_notification_rule_logs_rule_id_email_notification_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."email_notification_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_notification_rule_states" ADD CONSTRAINT "email_notification_rule_states_rule_id_email_notification_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."email_notification_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_notification_rules" ADD CONSTRAINT "email_notification_rules_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evhs_gi_items" ADD CONSTRAINT "evhs_gi_items_gi_record_id_evhs_gi_records_id_fk" FOREIGN KEY ("gi_record_id") REFERENCES "public"."evhs_gi_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evhs_gi_records" ADD CONSTRAINT "evhs_gi_records_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evhs_master_prices" ADD CONSTRAINT "evhs_master_prices_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evhs_receipt_items" ADD CONSTRAINT "evhs_receipt_items_receipt_id_evhs_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."evhs_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evhs_receipt_items" ADD CONSTRAINT "evhs_receipt_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evhs_receipts" ADD CONSTRAINT "evhs_receipts_transfer_id_stock_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evhs_receipts" ADD CONSTRAINT "evhs_receipts_confirmed_by_user_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evhs_voucher_items" ADD CONSTRAINT "evhs_voucher_items_voucher_id_evhs_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."evhs_vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evhs_voucher_items" ADD CONSTRAINT "evhs_voucher_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evhs_vouchers" ADD CONSTRAINT "evhs_vouchers_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evhs_vouchers" ADD CONSTRAINT "evhs_vouchers_issued_by_user_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_ewh_daily_snapshots" ADD CONSTRAINT "hero_ewh_daily_snapshots_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_ewh_daily_snapshots" ADD CONSTRAINT "hero_ewh_daily_snapshots_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_ewh_shift_config" ADD CONSTRAINT "hero_ewh_shift_config_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_ewh_shift_config" ADD CONSTRAINT "hero_ewh_shift_config_created_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("created_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_ewh_team_members" ADD CONSTRAINT "hero_ewh_team_members_team_id_hero_ewh_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."hero_ewh_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_ewh_team_members" ADD CONSTRAINT "hero_ewh_team_members_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_ewh_teams" ADD CONSTRAINT "hero_ewh_teams_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_unit_master" ADD CONSTRAINT "hero_unit_master_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_unit_utility_daily" ADD CONSTRAINT "hero_unit_utility_daily_unit_id_hero_unit_master_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."hero_unit_master"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_unit_utility_daily" ADD CONSTRAINT "hero_unit_utility_daily_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_trips" ADD CONSTRAINT "fleet_trips_driver_id_fleet_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."fleet_drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_trips" ADD CONSTRAINT "fleet_trips_vehicle_id_fleet_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."fleet_vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_trips" ADD CONSTRAINT "fleet_trips_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_forms" ADD CONSTRAINT "survey_forms_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_form_id_survey_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."survey_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "good_receive_manual_items" ADD CONSTRAINT "good_receive_manual_items_header_id_good_receive_manual_id_fk" FOREIGN KEY ("header_id") REFERENCES "public"."good_receive_manual"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "good_receive_manual_items" ADD CONSTRAINT "good_receive_manual_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "good_receive_manual_items" ADD CONSTRAINT "good_receive_manual_items_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk_knowledge_chunks" ADD CONSTRAINT "helpdesk_knowledge_chunks_source_id_helpdesk_knowledge_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."helpdesk_knowledge_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk_knowledge_sources" ADD CONSTRAINT "helpdesk_knowledge_sources_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk_training_logs" ADD CONSTRAINT "helpdesk_training_logs_source_id_helpdesk_knowledge_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."helpdesk_knowledge_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "helpdesk_training_logs" ADD CONSTRAINT "helpdesk_training_logs_trained_by_user_id_fk" FOREIGN KEY ("trained_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_genius_feedback" ADD CONSTRAINT "hero_genius_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_genius_learned_facts" ADD CONSTRAINT "hero_genius_learned_facts_learned_by_user_id_fk" FOREIGN KEY ("learned_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_genius_messages" ADD CONSTRAINT "hero_genius_messages_session_id_hero_genius_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hero_genius_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_genius_sessions" ADD CONSTRAINT "hero_genius_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_genius_web_crawl_history" ADD CONSTRAINT "hero_genius_web_crawl_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_broadcast_interactions" ADD CONSTRAINT "hero_broadcast_interactions_broadcast_id_hero_broadcasts_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."hero_broadcasts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_broadcasts" ADD CONSTRAINT "hero_broadcasts_category_id_hero_broadcast_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."hero_broadcast_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_assignment_responses" ADD CONSTRAINT "hero_chitralearning_assignment_responses_campaign_id_hero_chitralearning_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."hero_chitralearning_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_assignment_responses" ADD CONSTRAINT "hero_chitralearning_assignment_responses_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_assignment_responses" ADD CONSTRAINT "hero_chitralearning_assignment_responses_reviewed_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("reviewed_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_audit_logs" ADD CONSTRAINT "hero_chitralearning_audit_logs_actor_employee_id_hero_employees_id_fk" FOREIGN KEY ("actor_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_audit_logs" ADD CONSTRAINT "hero_chitralearning_audit_logs_course_id_hero_chitralearning_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."hero_chitralearning_courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_audit_logs" ADD CONSTRAINT "hero_chitralearning_audit_logs_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_campaign_participants" ADD CONSTRAINT "hero_chitralearning_campaign_participants_campaign_id_hero_chitralearning_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."hero_chitralearning_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_campaign_participants" ADD CONSTRAINT "hero_chitralearning_campaign_participants_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_campaign_participants" ADD CONSTRAINT "hero_chitralearning_campaign_participants_enrollment_id_hero_chitralearning_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."hero_chitralearning_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_campaigns" ADD CONSTRAINT "hero_chitralearning_campaigns_course_id_hero_chitralearning_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."hero_chitralearning_courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_campaigns" ADD CONSTRAINT "hero_chitralearning_campaigns_created_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("created_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_certificate_templates" ADD CONSTRAINT "hero_chitralearning_certificate_templates_course_id_hero_chitralearning_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."hero_chitralearning_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_certificates" ADD CONSTRAINT "hero_chitralearning_certificates_course_id_hero_chitralearning_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."hero_chitralearning_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_certificates" ADD CONSTRAINT "hero_chitralearning_certificates_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_certificates" ADD CONSTRAINT "hero_chitralearning_certificates_enrollment_id_hero_chitralearning_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."hero_chitralearning_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_certificates" ADD CONSTRAINT "hero_chitralearning_certificates_training_record_id_hero_training_records_id_fk" FOREIGN KEY ("training_record_id") REFERENCES "public"."hero_training_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_course_access" ADD CONSTRAINT "hero_chitralearning_course_access_course_id_hero_chitralearning_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."hero_chitralearning_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_courses" ADD CONSTRAINT "hero_chitralearning_courses_category_id_hero_chitralearning_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."hero_chitralearning_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_courses" ADD CONSTRAINT "hero_chitralearning_courses_created_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("created_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_enrollments" ADD CONSTRAINT "hero_chitralearning_enrollments_course_id_hero_chitralearning_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."hero_chitralearning_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_enrollments" ADD CONSTRAINT "hero_chitralearning_enrollments_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_enrollments" ADD CONSTRAINT "hero_chitralearning_enrollments_assigned_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("assigned_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_enrollments" ADD CONSTRAINT "hero_chitralearning_enrollments_approved_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("approved_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_enrollments" ADD CONSTRAINT "hero_chitralearning_enrollments_last_lesson_id_hero_chitralearning_lessons_id_fk" FOREIGN KEY ("last_lesson_id") REFERENCES "public"."hero_chitralearning_lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_lessons" ADD CONSTRAINT "hero_chitralearning_lessons_course_id_hero_chitralearning_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."hero_chitralearning_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_online_assignment_questions" ADD CONSTRAINT "hero_chitralearning_online_assignment_questions_campaign_id_hero_chitralearning_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."hero_chitralearning_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_path_courses" ADD CONSTRAINT "hero_chitralearning_path_courses_path_id_hero_chitralearning_paths_id_fk" FOREIGN KEY ("path_id") REFERENCES "public"."hero_chitralearning_paths"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_path_courses" ADD CONSTRAINT "hero_chitralearning_path_courses_course_id_hero_chitralearning_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."hero_chitralearning_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_paths" ADD CONSTRAINT "hero_chitralearning_paths_created_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("created_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_quiz_questions" ADD CONSTRAINT "hero_chitralearning_quiz_questions_course_id_hero_chitralearning_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."hero_chitralearning_courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_chitralearning_quiz_questions" ADD CONSTRAINT "hero_chitralearning_quiz_questions_lesson_id_hero_chitralearning_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."hero_chitralearning_lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_employee_assets" ADD CONSTRAINT "hero_employee_assets_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_employee_assets" ADD CONSTRAINT "hero_employee_assets_last_request_id_hero_apd_requests_id_fk" FOREIGN KEY ("last_request_id") REFERENCES "public"."hero_apd_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_employee_mcu" ADD CONSTRAINT "hero_employee_mcu_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_employee_mcu" ADD CONSTRAINT "hero_employee_mcu_clinic_id_hero_hc_mcu_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."hero_hc_mcu_clinics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_employee_mcu_metrics" ADD CONSTRAINT "hero_employee_mcu_metrics_mcu_id_hero_employee_mcu_id_fk" FOREIGN KEY ("mcu_id") REFERENCES "public"."hero_employee_mcu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_candidate_interviews" ADD CONSTRAINT "hero_hc_candidate_interviews_candidate_id_hero_hc_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."hero_hc_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_candidate_mcu" ADD CONSTRAINT "hero_hc_candidate_mcu_candidate_id_hero_hc_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."hero_hc_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_candidate_offerings" ADD CONSTRAINT "hero_hc_candidate_offerings_candidate_id_hero_hc_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."hero_hc_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_candidate_panel_evaluations" ADD CONSTRAINT "hero_hc_candidate_panel_evaluations_candidate_id_hero_hc_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."hero_hc_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_candidate_panel_evaluations" ADD CONSTRAINT "hero_hc_candidate_panel_evaluations_interview_id_hero_hc_candidate_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."hero_hc_candidate_interviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_contract_review_approvals" ADD CONSTRAINT "hero_hc_contract_review_approvals_review_id_hero_hc_employee_contract_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."hero_hc_employee_contract_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_contract_review_approvals" ADD CONSTRAINT "hero_hc_contract_review_approvals_approver_employee_id_hero_employees_id_fk" FOREIGN KEY ("approver_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_contract_review_reminders" ADD CONSTRAINT "hero_hc_contract_review_reminders_review_id_hero_hc_employee_contract_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."hero_hc_employee_contract_reviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_employee_contract_reviews" ADD CONSTRAINT "hero_hc_employee_contract_reviews_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_leader_performance" ADD CONSTRAINT "hero_hc_leader_performance_leader_id_hero_employees_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_leader_performance" ADD CONSTRAINT "hero_hc_leader_performance_reviewer_id_hero_employees_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_online_test_answers" ADD CONSTRAINT "hero_hc_online_test_answers_assignment_id_hero_hc_online_test_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."hero_hc_online_test_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_online_test_answers" ADD CONSTRAINT "hero_hc_online_test_answers_question_id_hero_hc_online_test_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."hero_hc_online_test_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_online_test_assignments" ADD CONSTRAINT "hero_hc_online_test_assignments_test_id_hero_hc_online_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."hero_hc_online_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_online_test_assignments" ADD CONSTRAINT "hero_hc_online_test_assignments_candidate_id_hero_hc_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."hero_hc_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_online_test_group_items" ADD CONSTRAINT "hero_hc_online_test_group_items_group_id_hero_hc_online_test_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."hero_hc_online_test_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_online_test_group_items" ADD CONSTRAINT "hero_hc_online_test_group_items_test_id_hero_hc_online_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."hero_hc_online_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_online_test_questions" ADD CONSTRAINT "hero_hc_online_test_questions_test_id_hero_hc_online_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."hero_hc_online_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_recruitment_batches" ADD CONSTRAINT "hero_hc_recruitment_batches_recruitment_id_hero_hc_recruitments_id_fk" FOREIGN KEY ("recruitment_id") REFERENCES "public"."hero_hc_recruitments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_rfr_approvals" ADD CONSTRAINT "hero_hc_rfr_approvals_rfr_id_hero_hc_rfr_requests_id_fk" FOREIGN KEY ("rfr_id") REFERENCES "public"."hero_hc_rfr_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_rfr_approvals" ADD CONSTRAINT "hero_hc_rfr_approvals_approver_employee_id_hero_employees_id_fk" FOREIGN KEY ("approver_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_rfr_requests" ADD CONSTRAINT "hero_hc_rfr_requests_requestor_employee_id_hero_employees_id_fk" FOREIGN KEY ("requestor_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hse_corrective_actions" ADD CONSTRAINT "hero_hse_corrective_actions_created_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("created_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hse_ptw_permits" ADD CONSTRAINT "hero_hse_ptw_permits_hiradc_entry_id_hero_hiradc_entries_id_fk" FOREIGN KEY ("hiradc_entry_id") REFERENCES "public"."hero_hiradc_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hse_ptw_permits" ADD CONSTRAINT "hero_hse_ptw_permits_created_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("created_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_overtime_command_letter_participants" ADD CONSTRAINT "hero_overtime_command_letter_participants_overtime_command_letter_id_hero_overtime_command_letters_id_fk" FOREIGN KEY ("overtime_command_letter_id") REFERENCES "public"."hero_overtime_command_letters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_overtime_command_letter_participants" ADD CONSTRAINT "hero_overtime_command_letter_participants_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_recruitment_section_templates" ADD CONSTRAINT "hero_recruitment_section_templates_section_id_hero_master_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."hero_master_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_road_condition_reports" ADD CONSTRAINT "hero_road_condition_reports_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_sio_certifications" ADD CONSTRAINT "hero_sio_certifications_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_sop_win_departments" ADD CONSTRAINT "hero_sop_win_departments_head_employee_id_hero_employees_id_fk" FOREIGN KEY ("head_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_sop_win_documents" ADD CONSTRAINT "hero_sop_win_documents_owner_employee_id_hero_employees_id_fk" FOREIGN KEY ("owner_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_sop_win_documents" ADD CONSTRAINT "hero_sop_win_documents_created_by_id_hero_employees_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_sop_win_rag_queue" ADD CONSTRAINT "hero_sop_win_rag_queue_document_id_hero_sop_win_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."hero_sop_win_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_sop_win_rag_queue" ADD CONSTRAINT "hero_sop_win_rag_queue_revision_id_hero_sop_win_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."hero_sop_win_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_sop_win_revisions" ADD CONSTRAINT "hero_sop_win_revisions_document_id_hero_sop_win_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."hero_sop_win_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_sop_win_revisions" ADD CONSTRAINT "hero_sop_win_revisions_revised_by_employee_id_hero_employees_id_fk" FOREIGN KEY ("revised_by_employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_counseling_messages" ADD CONSTRAINT "hero_hr_counseling_messages_session_id_hero_hr_counseling_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."hero_hr_counseling_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_counseling_messages" ADD CONSTRAINT "hero_hr_counseling_messages_sender_id_hero_employees_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_counseling_sessions" ADD CONSTRAINT "hero_hr_counseling_sessions_user_id_hero_employees_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hr_counseling_sessions" ADD CONSTRAINT "hero_hr_counseling_sessions_hr_id_hero_employees_id_fk" FOREIGN KEY ("hr_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_id_marketing_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instagram_image_history" ADD CONSTRAINT "instagram_image_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_vendor_lead_time_materials" ADD CONSTRAINT "inventory_vendor_lead_time_materials_vendor_id_inventory_vendor_lead_times_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."inventory_vendor_lead_times"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logistics_master_prices" ADD CONSTRAINT "logistics_master_prices_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocr_po_sessions" ADD CONSTRAINT "ocr_po_sessions_uploaded_by_id_user_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_price_list_item_id_price_list_items_id_fk" FOREIGN KEY ("price_list_item_id") REFERENCES "public"."price_list_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_changed_by_id_user_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundle_items" ADD CONSTRAINT "product_bundle_items_parent_product_id_products_id_fk" FOREIGN KEY ("parent_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundle_items" ADD CONSTRAINT "product_bundle_items_child_product_id_products_id_fk" FOREIGN KEY ("child_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quarterly_exchange_rates" ADD CONSTRAINT "quarterly_exchange_rates_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_attachments" ADD CONSTRAINT "quotation_attachments_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_attachments" ADD CONSTRAINT "quotation_attachments_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_revisions" ADD CONSTRAINT "quotation_revisions_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_revisions" ADD CONSTRAINT "quotation_revisions_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_sales_order_id_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_rejected_by_user_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_sales_person_id_user_id_fk" FOREIGN KEY ("sales_person_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_po_uploaded_by_user_id_fk" FOREIGN KEY ("customer_po_uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_auto_converted_by_user_id_fk" FOREIGN KEY ("auto_converted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfid_scans" ADD CONSTRAINT "rfid_scans_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfid_scans" ADD CONSTRAINT "rfid_scans_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfid_scans" ADD CONSTRAINT "rfid_scans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rmi_records" ADD CONSTRAINT "rmi_records_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_documents" ADD CONSTRAINT "sales_documents_uploaded_by_id_user_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_sales_order_id_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_sales_person_id_user_id_fk" FOREIGN KEY ("sales_person_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slow_moving_products" ADD CONSTRAINT "slow_moving_products_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_booking_consumptions" ADD CONSTRAINT "stock_booking_consumptions_stock_booking_id_stock_customer_bookings_id_fk" FOREIGN KEY ("stock_booking_id") REFERENCES "public"."stock_customer_bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_booking_consumptions" ADD CONSTRAINT "stock_booking_consumptions_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_customer_bookings" ADD CONSTRAINT "stock_customer_bookings_stock_level_id_stock_levels_id_fk" FOREIGN KEY ("stock_level_id") REFERENCES "public"."stock_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_customer_bookings" ADD CONSTRAINT "stock_customer_bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_session_id_stock_opname_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."stock_opname_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_counted_by_id_user_id_fk" FOREIGN KEY ("counted_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_sessions" ADD CONSTRAINT "stock_opname_sessions_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_sessions" ADD CONSTRAINT "stock_opname_sessions_document_uploaded_by_user_id_fk" FOREIGN KEY ("document_uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_sessions" ADD CONSTRAINT "stock_opname_sessions_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_sessions" ADD CONSTRAINT "stock_opname_sessions_closed_by_id_user_id_fk" FOREIGN KEY ("closed_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transfer_id_stock_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_from_warehouse_id_warehouses_id_fk" FOREIGN KEY ("from_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_to_warehouse_id_warehouses_id_fk" FOREIGN KEY ("to_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tire_performance_records" ADD CONSTRAINT "tire_performance_records_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_reads" ADD CONSTRAINT "user_notification_reads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_reads" ADD CONSTRAINT "user_notification_reads_email_log_id_email_logs_id_fk" FOREIGN KEY ("email_log_id") REFERENCES "public"."email_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_warehouse_access" ADD CONSTRAINT "user_warehouse_access_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_warehouse_access" ADD CONSTRAINT "user_warehouse_access_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_quotation_items" ADD CONSTRAINT "vendor_quotation_items_vendor_quotation_id_vendor_quotations_id_fk" FOREIGN KEY ("vendor_quotation_id") REFERENCES "public"."vendor_quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_quotations" ADD CONSTRAINT "vendor_quotations_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_inspection_checklists" ADD CONSTRAINT "hero_inspection_checklists_inspection_id_hero_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."hero_inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_inspection_photos" ADD CONSTRAINT "hero_inspection_photos_inspection_id_hero_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."hero_inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_inspections" ADD CONSTRAINT "hero_inspections_inspector_id_hero_employees_id_fk" FOREIGN KEY ("inspector_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_service360_employee_levels" ADD CONSTRAINT "hero_service360_employee_levels_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_service360_form_history" ADD CONSTRAINT "hero_service360_form_history_customer_id_hero_service360_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."hero_service360_customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_service360_items" ADD CONSTRAINT "hero_service360_items_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_service360_quotation_items" ADD CONSTRAINT "hero_service360_quotation_items_quotation_id_hero_service360_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."hero_service360_quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_service360_quotation_items" ADD CONSTRAINT "hero_service360_quotation_items_item_id_hero_service360_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."hero_service360_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_service360_quotations" ADD CONSTRAINT "hero_service360_quotations_customer_id_hero_service360_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."hero_service360_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_attendance_permission_requests" ADD CONSTRAINT "hero_attendance_permission_requests_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_attendance_permission_requests" ADD CONSTRAINT "hero_attendance_permission_requests_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_attendance_permission_requests" ADD CONSTRAINT "hero_attendance_permission_requests_approval_submission_id_hero_form_submissions_id_fk" FOREIGN KEY ("approval_submission_id") REFERENCES "public"."hero_form_submissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_attendance_permission_requests" ADD CONSTRAINT "hero_attendance_permission_requests_approver_user_id_user_id_fk" FOREIGN KEY ("approver_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_payroll_snapshot_items" ADD CONSTRAINT "hero_timesheet_payroll_snapshot_items_snapshot_id_hero_timesheet_payroll_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."hero_timesheet_payroll_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_payroll_snapshot_items" ADD CONSTRAINT "hero_timesheet_payroll_snapshot_items_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_payroll_snapshots" ADD CONSTRAINT "hero_timesheet_payroll_snapshots_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_payroll_snapshots" ADD CONSTRAINT "hero_timesheet_payroll_snapshots_saved_by_user_id_user_id_fk" FOREIGN KEY ("saved_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_scheduling_plans_v2" ADD CONSTRAINT "hero_timesheet_scheduling_plans_v2_site_id_hero_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hero_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_scheduling_plans_v2" ADD CONSTRAINT "hero_timesheet_scheduling_plans_v2_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_timesheet_scheduling_plans_v2" ADD CONSTRAINT "hero_timesheet_scheduling_plans_v2_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_warehouse_repair_transfers" ADD CONSTRAINT "hero_warehouse_repair_transfers_item_id_hero_warehouse_repair_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."hero_warehouse_repair_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_predictions_product_code_idx" ON "ai_inventory_predictions" USING btree ("product_code");--> statement-breakpoint
CREATE INDEX "ai_predictions_type_idx" ON "ai_inventory_predictions" USING btree ("prediction_type");--> statement-breakpoint
CREATE INDEX "ai_predictions_created_at_idx" ON "ai_inventory_predictions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_predictions_batch_id_idx" ON "ai_inventory_predictions" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "ai_predictions_accuracy_idx" ON "ai_inventory_predictions" USING btree ("accuracy_percentage");--> statement-breakpoint
CREATE INDEX "notifications_product_code_idx" ON "restock_notifications" USING btree ("product_code");--> statement-breakpoint
CREATE INDEX "notifications_urgency_idx" ON "restock_notifications" USING btree ("urgency_level");--> statement-breakpoint
CREATE INDEX "notifications_acknowledged_idx" ON "restock_notifications" USING btree ("is_acknowledged");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "restock_notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "approval_assignments_assignee_idx" ON "approval_assignments" USING btree ("assignee_user_id","status");--> statement-breakpoint
CREATE INDEX "approval_assignments_request_idx" ON "approval_assignments" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "approval_audit_request_idx" ON "approval_audit_logs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "approval_steps_definition_idx" ON "approval_definition_steps" USING btree ("definition_id");--> statement-breakpoint
CREATE INDEX "approval_definitions_form_key_idx" ON "approval_definitions" USING btree ("form_key");--> statement-breakpoint
CREATE INDEX "approval_definitions_status_idx" ON "approval_definitions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "approval_form_registry_active_idx" ON "approval_form_registry" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "approval_org_structure_nodes_structure_idx" ON "approval_org_structure_nodes" USING btree ("structure_id");--> statement-breakpoint
CREATE INDEX "approval_org_structure_nodes_parent_idx" ON "approval_org_structure_nodes" USING btree ("parent_node_id");--> statement-breakpoint
CREATE INDEX "approval_org_structures_type_idx" ON "approval_org_structures" USING btree ("type");--> statement-breakpoint
CREATE INDEX "approval_org_structures_active_idx" ON "approval_org_structures" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "approval_requests_status_idx" ON "approval_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "approval_requests_requester_idx" ON "approval_requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "approval_requests_form_entity_idx" ON "approval_requests" USING btree ("form_key","entity_id");--> statement-breakpoint
CREATE INDEX "cs_asset_attachment_asset_idx" ON "hero_central_service_asset_attachments" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "cs_asset_history_asset_idx" ON "hero_central_service_asset_histories" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "cs_forecast_actuals_period_idx" ON "hero_central_service_forecast_actuals" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "cs_forecast_actuals_item_idx" ON "hero_central_service_forecast_actuals" USING btree ("forecast_item_id");--> statement-breakpoint
CREATE INDEX "cs_forecast_history_item_idx" ON "hero_central_service_forecast_histories" USING btree ("forecast_item_id");--> statement-breakpoint
CREATE INDEX "cs_forecast_items_period_idx" ON "hero_central_service_forecast_items" USING btree ("period_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cs_mp_target_site_pos_idx" ON "hero_central_service_manpower_targets" USING btree ("site_name","position");--> statement-breakpoint
CREATE INDEX "cost_settlement_items_settlement_idx" ON "cost_settlement_items" USING btree ("settlement_id");--> statement-breakpoint
CREATE INDEX "cost_settlement_items_category_idx" ON "cost_settlement_items" USING btree ("cost_category");--> statement-breakpoint
CREATE INDEX "cost_settlement_receipts_item_idx" ON "cost_settlement_receipts" USING btree ("settlement_item_id");--> statement-breakpoint
CREATE INDEX "cost_settlement_signatories_settlement_idx" ON "cost_settlement_signatories" USING btree ("settlement_id");--> statement-breakpoint
CREATE INDEX "cost_settlements_type_idx" ON "cost_settlements" USING btree ("settlement_type");--> statement-breakpoint
CREATE INDEX "cost_settlements_status_idx" ON "cost_settlements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cost_settlements_settlement_date_idx" ON "cost_settlements" USING btree ("settlement_date");--> statement-breakpoint
CREATE INDEX "cost_settlements_trip_idx" ON "cost_settlements" USING btree ("fleet_trip_id");--> statement-breakpoint
CREATE INDEX "cost_settlements_delivery_idx" ON "cost_settlements" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "email_notification_rule_states_rule_id_idx" ON "email_notification_rule_states" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "email_notification_rules_form_key_idx" ON "email_notification_rules" USING btree ("form_key");--> statement-breakpoint
CREATE INDEX "email_notification_rules_active_idx" ON "email_notification_rules" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_ewh_daily_snapshots_employee_date_uq" ON "hero_ewh_daily_snapshots" USING btree ("employee_id","work_date");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_ewh_shift_config_site_shift_uq" ON "hero_ewh_shift_config" USING btree ("site_id","shift_code");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_unit_master_site_code_uq" ON "hero_unit_master" USING btree ("site_id","unit_code");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_unit_utility_daily_unit_date_uq" ON "hero_unit_utility_daily" USING btree ("unit_number","site_id","work_date");--> statement-breakpoint
CREATE INDEX "survey_forms_slug_idx" ON "survey_forms" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "survey_forms_status_idx" ON "survey_forms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "survey_responses_form_id_idx" ON "survey_responses" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "survey_responses_email_idx" ON "survey_responses" USING btree ("respondent_email");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_chitralearning_campaign_employee_uq" ON "hero_chitralearning_campaign_participants" USING btree ("campaign_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_chitralearning_certificates_number_uq" ON "hero_chitralearning_certificates" USING btree ("certificate_number");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_chitralearning_certificates_employee_course_uq" ON "hero_chitralearning_certificates" USING btree ("employee_id","course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_chitralearning_enrollments_employee_course_uq" ON "hero_chitralearning_enrollments" USING btree ("employee_id","course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_overtime_command_letter_participants_document_employee_uidx" ON "hero_overtime_command_letter_participants" USING btree ("overtime_command_letter_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_sio_certifications_employee_cert_uq" ON "hero_sio_certifications" USING btree ("employee_id","cert_type","cert_name");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_vendor_lead_time_materials_vendor_material_uidx" ON "inventory_vendor_lead_time_materials" USING btree ("vendor_id","material_no");--> statement-breakpoint
CREATE INDEX "inventory_vendor_lead_time_materials_vendor_id_idx" ON "inventory_vendor_lead_time_materials" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "inventory_vendor_lead_time_materials_material_no_idx" ON "inventory_vendor_lead_time_materials" USING btree ("material_no");--> statement-breakpoint
CREATE INDEX "inventory_vendor_lead_time_materials_preferred_idx" ON "inventory_vendor_lead_time_materials" USING btree ("is_preferred");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_vendor_lead_times_vendor_name_uidx" ON "inventory_vendor_lead_times" USING btree ("vendor_name");--> statement-breakpoint
CREATE INDEX "inventory_vendor_lead_times_is_active_idx" ON "inventory_vendor_lead_times" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "doc_date_idx" ON "me2l_purch_docs_sap" USING btree ("doc_date");--> statement-breakpoint
CREATE INDEX "ocr_extractions_file_idx" ON "ocr_extractions" USING btree ("file_name");--> statement-breakpoint
CREATE INDEX "ocr_extractions_created_idx" ON "ocr_extractions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quotation_revisions_quotation_revision_idx" ON "quotation_revisions" USING btree ("quotation_id","revision_number");--> statement-breakpoint
CREATE INDEX "user_notification_reads_user_idx" ON "user_notification_reads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_notification_reads_log_idx" ON "user_notification_reads" USING btree ("email_log_id");--> statement-breakpoint
CREATE INDEX "vendor_quotation_items_quotation_idx" ON "vendor_quotation_items" USING btree ("vendor_quotation_id");--> statement-breakpoint
CREATE INDEX "vendor_quotations_vendor_idx" ON "vendor_quotations" USING btree ("vendor_name");--> statement-breakpoint
CREATE INDEX "vendor_quotations_quote_number_idx" ON "vendor_quotations" USING btree ("quote_number");--> statement-breakpoint
CREATE INDEX "vendor_quotations_ocr_status_idx" ON "vendor_quotations" USING btree ("ocr_status");--> statement-breakpoint
CREATE INDEX "vendor_quotations_created_at_idx" ON "vendor_quotations" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_service360_form_history_unique_idx" ON "hero_service360_form_history" USING btree ("customer_id","field","value");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_service360_rate_settings_location_section_level_idx" ON "hero_service360_rate_settings" USING btree ("work_location","section","level");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_attendance_permission_requests_employee_date_uidx" ON "hero_attendance_permission_requests" USING btree ("employee_id","start_date","permission_type");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_timesheet_payroll_snapshot_items_snapshot_employee_day_uidx" ON "hero_timesheet_payroll_snapshot_items" USING btree ("snapshot_id","employee_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_timesheet_payroll_snapshots_site_period_uidx" ON "hero_timesheet_payroll_snapshots" USING btree ("site_id","period");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_timesheet_scheduling_plans_v2_site_period_uidx" ON "hero_timesheet_scheduling_plans_v2" USING btree ("site_id","period");--> statement-breakpoint
CREATE UNIQUE INDEX "hero_wr_transfer_no_idx" ON "hero_warehouse_repair_transfers" USING btree ("transaction_no");--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD CONSTRAINT "hero_approvals_submission_id_hero_form_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."hero_form_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_approvals" ADD CONSTRAINT "hero_approvals_apd_request_id_hero_apd_requests_id_fk" FOREIGN KEY ("apd_request_id") REFERENCES "public"."hero_apd_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_daily_activity_sessions" ADD CONSTRAINT "hero_daily_activity_sessions_activity_id_hero_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."hero_activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_disciplinary_actions" ADD CONSTRAINT "hero_hc_disciplinary_actions_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_leave_balances" ADD CONSTRAINT "hero_hc_leave_balances_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_leave_requests" ADD CONSTRAINT "hero_hc_leave_requests_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_leave_requests" ADD CONSTRAINT "hero_hc_leave_requests_approval_submission_id_hero_form_submissions_id_fk" FOREIGN KEY ("approval_submission_id") REFERENCES "public"."hero_form_submissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_letters" ADD CONSTRAINT "hero_hc_letters_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_offboarding_requests" ADD CONSTRAINT "hero_hc_offboarding_requests_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_offboarding_requests" ADD CONSTRAINT "hero_hc_offboarding_requests_approval_submission_id_hero_form_submissions_id_fk" FOREIGN KEY ("approval_submission_id") REFERENCES "public"."hero_form_submissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_onboarding_records" ADD CONSTRAINT "hero_hc_onboarding_records_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_performance_reviews" ADD CONSTRAINT "hero_hc_performance_reviews_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_performance_reviews" ADD CONSTRAINT "hero_hc_performance_reviews_reviewer_id_hero_employees_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."hero_employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_master_sections" ADD CONSTRAINT "hero_master_sections_parent_id_hero_master_sections_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."hero_master_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_overtime_command_letters" ADD CONSTRAINT "hero_overtime_command_letters_parent_spl_id_hero_overtime_command_letters_id_fk" FOREIGN KEY ("parent_spl_id") REFERENCES "public"."hero_overtime_command_letters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_hc_recruitments" DROP COLUMN "request_date";--> statement-breakpoint
ALTER TABLE "hero_hc_recruitments" DROP COLUMN "due_date";--> statement-breakpoint
ALTER TABLE "hero_hc_candidates" ADD CONSTRAINT "hero_hc_candidates_onboarding_token_unique" UNIQUE("onboarding_token");