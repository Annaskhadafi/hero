CREATE TABLE IF NOT EXISTS "hero_navbar_group_label_styles" (
  "id" serial PRIMARY KEY,
  "section" text NOT NULL,
  "group_label" text NOT NULL,
  "text_color" text NOT NULL DEFAULT '#6B7280',
  "background_color" text,
  "font_weight" text NOT NULL DEFAULT 'semibold',
  "font_size" text NOT NULL DEFAULT '10px',
  "created_at" timestamp NOT NULL DEFAULT now()
);
