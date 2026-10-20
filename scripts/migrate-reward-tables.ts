import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Checking and creating reward tables...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_reward_items (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'merchandise',
      image_url TEXT NOT NULL DEFAULT '',
      points_required INTEGER NOT NULL,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      tier_eligibility TEXT NOT NULL DEFAULT 'all',
      is_year_end_bazaar BOOLEAN NOT NULL DEFAULT false,
      is_active BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("hero_reward_items created or verified.");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_reward_redemptions (
      id SERIAL PRIMARY KEY,
      redemption_number TEXT NOT NULL UNIQUE,
      employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE CASCADE,
      reward_item_id INTEGER NOT NULL REFERENCES hero_reward_items(id) ON DELETE RESTRICT,
      site_id INTEGER REFERENCES hero_sites(id) ON DELETE SET NULL,
      points_spent INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      request_note TEXT NOT NULL DEFAULT '',
      approved_by_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
      approval_notes TEXT NOT NULL DEFAULT '',
      delivery_status TEXT NOT NULL DEFAULT 'pending',
      tracking_or_receipt_info TEXT NOT NULL DEFAULT '',
      is_year_end_claim BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log("hero_reward_redemptions created or verified.");

  // Seed sample initial items if none exist
  const existing = await db.execute(sql`SELECT count(*) FROM hero_reward_items`);
  const count = Number(existing.rows[0]?.count ?? 0);
  if (count === 0) {
    console.log("Seeding sample reward store items...");
    await db.execute(sql`
      INSERT INTO hero_reward_items (code, name, description, category, image_url, points_required, stock_quantity, tier_eligibility, is_year_end_bazaar, sort_order)
      VALUES
        ('RWD-TUMBLER-01', 'HERO Premium Insulated Tumbler', 'Tumbler tahan dingin 24 jam dengan ukiran logo One Chitra HERO.', 'merchandise', '', 150, 50, 'all', false, 1),
        ('RWD-CAP-01', 'Topi Lapangan Tactical Chitra', 'Topi tactical tahan panas & air standar operasional site tambang.', 'merchandise', '', 100, 40, 'all', false, 2),
        ('RWD-VOUCHER-50K', 'E-Wallet Voucher Rp 50.000', 'Voucher saldo digital GoPay / OVO / ShopeePay.', 'voucher', '', 250, 100, 'all', false, 3),
        ('RWD-JACKET-TOP', 'Exclusive Site Project Bomber Jacket', 'Jaket bomber eksklusif limited edition untuk Top Performer.', 'apparel', '', 600, 15, 'top_10', false, 4),
        ('RWD-SMARTWATCH', 'Garmin / Smartwatch Tough Edition', 'Jam tangan rugged GPS monitor detak jantung & aktivitas outdoor.', 'electronics', '', 1500, 5, 'top_site', false, 5),
        ('RWD-YEAREND-MUG', 'Mug Keramik Spesial Akhir Tahun', 'Mug keramik perayaan tutup tahun operasional Chitra Paratama.', 'merchandise', '', 50, 200, 'year_end_only', true, 6),
        ('RWD-YEAREND-PARCEL', 'Paket Sembako & Hampers Akhir Tahun', 'Paket sembako spesial apresiasi kerja keras untuk keluarga di rumah.', 'special', '', 200, 80, 'year_end_only', true, 7);
    `);
    console.log("Sample items seeded.");
  }

  console.log("Migration complete!");
  process.exit(0);
}

main().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});
