import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Checking and syncing table hero_login_page_settings...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hero_login_page_settings" (
      "id" serial PRIMARY KEY NOT NULL,
      "hero_title" text DEFAULT 'Kerja hebat,
dimulai di sini.' NOT NULL,
      "hero_subtitle" text DEFAULT 'Satu tempat untuk aktivitas, pelaporan,
dan operasional Anda.' NOT NULL,
      "hero_eyebrow" text DEFAULT 'PT CHITRA PARATAMA' NOT NULL,
      "banner_image_url" text DEFAULT '/Hero%20Logo/bg%20hero.png' NOT NULL,
      "banner_overlay_color" text DEFAULT '#0860ee' NOT NULL,
      "logo_url" text DEFAULT '/logo-hero.png?v=hero-cat-20261012' NOT NULL,
      "form_eyebrow" text DEFAULT 'AKUN KARYAWAN' NOT NULL,
      "form_title" text DEFAULT 'Selamat datang kembali' NOT NULL,
      "form_description" text DEFAULT 'Masuk ke HERO dengan akun kerja Anda.' NOT NULL,
      "page_background_type" text DEFAULT 'default' NOT NULL,
      "page_background_color" text DEFAULT '#edf7ff' NOT NULL,
      "page_background_image_url" text,
      "footer_copyright" text DEFAULT 'PT Chitra Paratama' NOT NULL,
      "footer_tagline" text DEFAULT 'Hub for Employee Reporting & Operations' NOT NULL,
      "help_text" text DEFAULT 'Butuh bantuan?' NOT NULL,
      "help_details" text DEFAULT 'Gunakan email atau SN karyawan yang terdaftar. Untuk pemulihan kata sandi, pilih “Lupa kata sandi?”. Jika akun belum tersedia atau dinonaktifkan, hubungi tim HR atau admin HERO.' NOT NULL,
      "features_json" jsonb DEFAULT '[{"icon":"CalendarDays","title":"Presensi","description":"Catat setiap kehadiran Anda."},{"icon":"FileText","title":"Pelaporan","description":"Setiap prestasi dihargai."},{"icon":"Settings","title":"Operasional","description":"Dukung keputusan berbasis data."}]'::jsonb NOT NULL,
      "is_active" boolean DEFAULT true NOT NULL,
      "updated_by" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  console.log("Table hero_login_page_settings verified successfully!");

  await db.execute(sql`
    INSERT INTO "hero_navbar_menu_items" (
      "menu_area", "section", "title", "url", "icon_name", "resource", "sort_order", "is_visible", "open_in_new_tab", "item_type"
    )
    SELECT 'secondary', 'Pengaturan', 'Pengaturan Halaman Login', '/dashboard/settings/login-page', 'pencil', 'settings_login_page', 9, true, false, 'menu'
    WHERE NOT EXISTS (
      SELECT 1 FROM "hero_navbar_menu_items" WHERE "resource" = 'settings_login_page' OR "url" = '/dashboard/settings/login-page'
    );
  `);

  console.log("Menu item for settings_login_page ensured in hero_navbar_menu_items!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
