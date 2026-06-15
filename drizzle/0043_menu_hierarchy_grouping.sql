-- Add hierarchy columns to hero_navbar_menu_items
ALTER TABLE "hero_navbar_menu_items" ADD COLUMN "item_type" text NOT NULL DEFAULT 'menu';
ALTER TABLE "hero_navbar_menu_items" ADD COLUMN "parent_id" integer;
ALTER TABLE "hero_navbar_menu_items" ADD COLUMN "group_label" text;
