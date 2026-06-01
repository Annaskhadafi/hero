CREATE TABLE "hero_hc_certificates" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer,
	"employee_name" text DEFAULT '' NOT NULL,
	"certificate_type" text NOT NULL,
	"license_number" text NOT NULL,
	"issued_date" timestamp DEFAULT now() NOT NULL,
	"expiry_date" timestamp NOT NULL,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_hc_recruitments" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_title" text NOT NULL,
	"total_requested" integer DEFAULT 1 NOT NULL,
	"section" text NOT NULL,
	"status" text DEFAULT 'Sourcing' NOT NULL,
	"request_date" timestamp DEFAULT now() NOT NULL,
	"due_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hero_hr_employees" ADD COLUMN "contract_start" date;--> statement-breakpoint
ALTER TABLE "hero_hr_employees" ADD COLUMN "contract_end" date;--> statement-breakpoint
ALTER TABLE "hero_hc_certificates" ADD CONSTRAINT "hero_hc_certificates_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE cascade ON UPDATE no action;