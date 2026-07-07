-- Add site_type column to hero_sites for site classification (Site, HO, Branch, Warehouse)
ALTER TABLE "hero_sites" ADD COLUMN "site_type" text NOT NULL DEFAULT 'Site';
