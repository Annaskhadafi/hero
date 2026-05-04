CREATE TABLE "hero_cargo_master_goods" (
	"id" serial PRIMARY KEY NOT NULL,
	"goods_name" text NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"brand" text DEFAULT '' NOT NULL,
	"unit" text DEFAULT 'pcs' NOT NULL,
	"weight" text DEFAULT '' NOT NULL,
	"dimensions" text DEFAULT '' NOT NULL,
	"hs_code" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_cargo_master_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"location_name" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"province" text DEFAULT '' NOT NULL,
	"country" text DEFAULT 'Indonesia' NOT NULL,
	"postal_code" text DEFAULT '' NOT NULL,
	"contact_person" text DEFAULT '' NOT NULL,
	"contact_phone" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hero_cargo_master_locations_location_name_unique" UNIQUE("location_name")
);
