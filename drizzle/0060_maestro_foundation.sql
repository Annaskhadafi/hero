CREATE TABLE IF NOT EXISTS "maestro_customer_users" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "maestro_customer_users_email_uq" ON "maestro_customer_users" ("email");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maestro_customer_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "token" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "maestro_customer_users"("id") ON DELETE CASCADE,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "ip_address" text,
  "user_agent" text
);
CREATE UNIQUE INDEX IF NOT EXISTS "maestro_customer_sessions_token_uq" ON "maestro_customer_sessions" ("token");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maestro_customer_accounts" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "maestro_customer_users"("id") ON DELETE CASCADE,
  "provider_id" text NOT NULL,
  "account_id" text NOT NULL,
  "password_hash" text,
  "access_token" text,
  "refresh_token" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "maestro_customer_accounts_provider_account_uq" ON "maestro_customer_accounts" ("provider_id", "account_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maestro_customer_verifications" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maestro_customer_memberships" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "maestro_customer_users"("id") ON DELETE CASCADE,
  "customer_id" integer NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "maestro_customer_memberships_user_customer_uq" ON "maestro_customer_memberships" ("user_id", "customer_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maestro_customer_sites" (
  "id" serial PRIMARY KEY NOT NULL,
  "customer_id" integer NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "site_id" integer NOT NULL REFERENCES "hero_sites"("id") ON DELETE CASCADE,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "maestro_customer_sites_customer_site_uq" ON "maestro_customer_sites" ("customer_id", "site_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maestro_customer_user_sites" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "maestro_customer_users"("id") ON DELETE CASCADE,
  "customer_id" integer NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "site_id" integer NOT NULL REFERENCES "hero_sites"("id") ON DELETE CASCADE,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "maestro_customer_user_sites_user_customer_site_uq" ON "maestro_customer_user_sites" ("user_id", "customer_id", "site_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maestro_roles" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "is_system" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "maestro_roles_code_uq" ON "maestro_roles" ("code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maestro_permissions" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" text NOT NULL,
  "label" text NOT NULL,
  "module" text NOT NULL,
  "action" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "maestro_permissions_code_uq" ON "maestro_permissions" ("code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maestro_role_permissions" (
  "role_id" integer NOT NULL REFERENCES "maestro_roles"("id") ON DELETE CASCADE,
  "permission_id" integer NOT NULL REFERENCES "maestro_permissions"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "maestro_role_permissions_role_permission_uq" ON "maestro_role_permissions" ("role_id", "permission_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maestro_user_roles" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "maestro_customer_users"("id") ON DELETE CASCADE,
  "role_id" integer NOT NULL REFERENCES "maestro_roles"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "maestro_user_roles_user_role_uq" ON "maestro_user_roles" ("user_id", "role_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maestro_page_registry" (
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
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "maestro_page_registry_code_uq" ON "maestro_page_registry" ("code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maestro_visibility_policies" (
  "id" serial PRIMARY KEY NOT NULL,
  "customer_id" integer NOT NULL UNIQUE REFERENCES "customers"("id") ON DELETE CASCADE,
  "can_view_employee_names" boolean DEFAULT false NOT NULL,
  "can_view_attendance_detail" boolean DEFAULT false NOT NULL,
  "can_view_activity_photos" boolean DEFAULT false NOT NULL,
  "can_view_safety_details" boolean DEFAULT true NOT NULL,
  "can_view_financial_amounts" boolean DEFAULT false NOT NULL,
  "can_download_documents" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maestro_audit_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "actor_type" text DEFAULT 'internal' NOT NULL,
  "actor_user_id" text REFERENCES "maestro_customer_users"("id") ON DELETE SET NULL,
  "actor_employee_id" integer REFERENCES "hero_employees"("id") ON DELETE SET NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text,
  "customer_id" integer REFERENCES "customers"("id") ON DELETE SET NULL,
  "site_id" integer REFERENCES "hero_sites"("id") ON DELETE SET NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
