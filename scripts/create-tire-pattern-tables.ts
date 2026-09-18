/**
 * Buat tabel tire_pattern_* langsung via SQL
 * Run: tsx scripts/create-tire-pattern-tables.ts
 */
import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
if (!url) throw new Error('DATABASE_URL diperlukan')

const pool = new Pool({ connectionString: url, ssl: false })

async function main() {
  const client = await pool.connect()
  try {
    console.log('🛞 Creating tire pattern tables...')

    // ── hero_central_service_refueling_logs ──────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_central_service_refueling_logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        site_name TEXT NOT NULL DEFAULT '',
        driver_name TEXT NOT NULL DEFAULT '',
        driver_sn TEXT,
        refuel_date TEXT NOT NULL DEFAULT '',
        unit_number TEXT NOT NULL DEFAULT '',
        odometer_km INTEGER NOT NULL DEFAULT 0,
        fuel_expenditure_type TEXT NOT NULL DEFAULT 'Operational Site (Rutin)',
        fuel_amount_liters NUMERIC(10, 2) NOT NULL DEFAULT 0,
        fuelman_name TEXT NOT NULL DEFAULT '',
        odometer_photo_url TEXT,
        flowmeter_photo_url TEXT,
        remarks TEXT NOT NULL DEFAULT '',
        created_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS cs_refuel_site_name_idx ON hero_central_service_refueling_logs (site_name);
      CREATE INDEX IF NOT EXISTS cs_refuel_date_idx ON hero_central_service_refueling_logs (refuel_date);
      CREATE INDEX IF NOT EXISTS cs_refuel_unit_idx ON hero_central_service_refueling_logs (unit_number);
      CREATE INDEX IF NOT EXISTS cs_refuel_driver_idx ON hero_central_service_refueling_logs (driver_name);

      -- Insert Re-Fueling LV menu item if not exists
      INSERT INTO hero_navbar_menu_items (menu_area, section, title, url, icon_name, resource, sort_order, is_visible, open_in_new_tab, item_type, group_label)
      SELECT 'main', 'Central Service', 'Re-Fueling LV', '/dashboard/central-service/refueling', 'truck', 'central_service_refueling', 2, true, false, 'menu', 'Management'
      WHERE NOT EXISTS (
        SELECT 1 FROM hero_navbar_menu_items WHERE url = '/dashboard/central-service/refueling'
      );
    `)
    console.log('  ✓ hero_central_service_refueling_logs & menu item')

    // ── tire_size_presets ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS tire_size_presets (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL,
        label VARCHAR(100) NOT NULL,
        section_width INTEGER NOT NULL,
        aspect_ratio INTEGER NOT NULL DEFAULT 100,
        rim_diameter INTEGER NOT NULL,
        rim_diameter_mm INTEGER NOT NULL,
        circumference_mm INTEGER NOT NULL,
        tread_width_mm INTEGER NOT NULL,
        category VARCHAR(50) DEFAULT 'truck',
        notes TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    console.log('  ✓ tire_size_presets')

    // ── tire_patterns ─────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS tire_patterns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        tire_size VARCHAR(50) NOT NULL,
        pattern_type VARCHAR(100) NOT NULL,
        groove_angle INTEGER DEFAULT 45,
        groove_width_mm INTEGER DEFAULT 8,
        groove_depth_mm INTEGER DEFAULT 12,
        pattern_density INTEGER DEFAULT 50,
        repeat_unit_mm INTEGER,
        pattern_svg TEXT,
        pattern_config JSONB,
        reference_image_url VARCHAR(1000),
        thumbnail_url VARCHAR(1000),
        analysis_result JSONB,
        analysis_model VARCHAR(100),
        analysis_source VARCHAR(50),
        tire_section_width_mm INTEGER,
        tire_aspect_ratio INTEGER,
        tire_rim_diameter_mm INTEGER,
        tire_circumference_mm INTEGER,
        tire_tread_width_mm INTEGER,
        status VARCHAR(30) NOT NULL DEFAULT 'draft',
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    console.log('  ✓ tire_patterns')

    // ── tire_pattern_analyses ─────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS tire_pattern_analyses (
        id SERIAL PRIMARY KEY,
        pattern_id INTEGER,
        image_url VARCHAR(1000),
        image_base64_hash VARCHAR(100),
        model_used VARCHAR(100) NOT NULL,
        prompt TEXT,
        raw_response TEXT,
        parsed_result JSONB,
        confidence INTEGER,
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    console.log('  ✓ tire_pattern_analyses')

    await client.query('COMMIT')
    console.log('\n✅ Semua tabel berhasil dibuat!')

    // Seed presets
    console.log('\n📦 Seeding tire size presets...')
    const presets = [
      { code: '1200-24', label: '1200-24', w: 305, ar: 100, rim: 24, cat: 'truck' },
      { code: '1100-22', label: '1100-22', w: 279, ar: 100, rim: 22, cat: 'truck' },
      { code: '1100-20', label: '1100-20', w: 279, ar: 100, rim: 20, cat: 'truck' },
      { code: '1000-22', label: '1000-22', w: 254, ar: 100, rim: 22, cat: 'truck' },
      { code: '1000-20', label: '1000-20 ★ (Paling Umum)', w: 254, ar: 100, rim: 20, cat: 'truck' },
      { code: '900-22', label: '900-22', w: 229, ar: 100, rim: 22, cat: 'truck' },
      { code: '900-20', label: '900-20', w: 229, ar: 100, rim: 20, cat: 'truck' },
      { code: '825-20', label: '825-20', w: 209, ar: 100, rim: 20, cat: 'truck' },
      { code: '825-16', label: '825-16', w: 209, ar: 100, rim: 16, cat: 'truck' },
      { code: '750-20', label: '750-20', w: 190, ar: 100, rim: 20, cat: 'truck' },
      { code: '750-16', label: '750-16', w: 190, ar: 100, rim: 16, cat: 'truck' },
      { code: '700-16', label: '700-16', w: 178, ar: 100, rim: 16, cat: 'truck' },
      { code: '650-16', label: '650-16', w: 165, ar: 100, rim: 16, cat: 'truck' },
      { code: '600-16', label: '600-16', w: 152, ar: 100, rim: 16, cat: 'truck' },
      { code: '1400-24', label: '1400-24 (OTR)', w: 356, ar: 100, rim: 24, cat: 'otr' },
      { code: '1800-25', label: '1800-25 (OTR)', w: 457, ar: 100, rim: 25, cat: 'otr' },
      { code: '2100-25', label: '2100-25 (OTR)', w: 533, ar: 100, rim: 25, cat: 'otr' },
      { code: '2400-25', label: '2400-25 (OTR Besar)', w: 610, ar: 100, rim: 25, cat: 'otr' },
    ]

    for (let i = 0; i < presets.length; i++) {
      const p = presets[i]
      const rimMm = Math.round(p.rim * 25.4)
      const sectionH = (p.w * p.ar) / 100
      const outerD = rimMm + 2 * sectionH
      const circ = Math.round(Math.PI * outerD)
      const tread = Math.round(p.w * 0.78)

      await client.query(
        `INSERT INTO tire_size_presets (code, label, section_width, aspect_ratio, rim_diameter, rim_diameter_mm, circumference_mm, tread_width_mm, category, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT DO NOTHING`,
        [p.code, p.label, p.w, p.ar, p.rim, rimMm, circ, tread, p.cat, i],
      )
      console.log(`  ✓ ${p.code} — ${circ}mm keliling, ${tread}mm tapak`)
    }

    console.log('\n✅ Selesai! Database siap digunakan.')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
