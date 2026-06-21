ALTER TABLE "hero_master_sections" ADD COLUMN "parent_id" integer REFERENCES "hero_master_sections"("id") ON DELETE SET NULL;
