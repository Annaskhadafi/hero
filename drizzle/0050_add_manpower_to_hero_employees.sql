-- Add manpower column to hero_employees for Lokal/Non Lokal classification
ALTER TABLE "hero_employees" ADD COLUMN "manpower" text NOT NULL DEFAULT 'Lokal';
