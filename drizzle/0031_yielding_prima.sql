CREATE TABLE "hero_jsa_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jsa_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"work_step" text NOT NULL,
	"hazard" text NOT NULL,
	"consequence" text NOT NULL,
	"control" text NOT NULL,
	"residual_risk" varchar(50) NOT NULL,
	"pic" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_jsas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jsa_number" varchar(255) NOT NULL,
	"job_description" text NOT NULL,
	"equipment_number" varchar(255) NOT NULL,
	"team_members" text NOT NULL,
	"equipment_used" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"permits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ppe_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_level" varchar(50) NOT NULL,
	"signatures" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_safety_inductions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"company_origin" varchar(255) NOT NULL,
	"phone_number" varchar(50) NOT NULL,
	"purpose" text NOT NULL,
	"signature_url" varchar(2048),
	"agreed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hero_jsa_steps" ADD CONSTRAINT "hero_jsa_steps_jsa_id_hero_jsas_id_fk" FOREIGN KEY ("jsa_id") REFERENCES "public"."hero_jsas"("id") ON DELETE cascade ON UPDATE no action;