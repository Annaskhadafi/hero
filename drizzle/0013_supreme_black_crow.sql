ALTER TABLE "hero_attendance_records" ADD COLUMN IF NOT EXISTS "client_request_id" text;--> statement-breakpoint
ALTER TABLE "hero_hse_incidents" ADD COLUMN IF NOT EXISTS "client_request_id" text;--> statement-breakpoint
ALTER TABLE "hero_notification_deliveries" ADD COLUMN IF NOT EXISTS "read_at" timestamp;--> statement-breakpoint
ALTER TABLE "hero_notification_deliveries" ADD COLUMN IF NOT EXISTS "cleared_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hero_attendance_records_client_request_id_uq" ON "hero_attendance_records" USING btree ("client_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hero_hse_incidents_client_request_id_uq" ON "hero_hse_incidents" USING btree ("client_request_id");
