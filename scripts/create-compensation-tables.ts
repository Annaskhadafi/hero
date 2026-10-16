import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/hero_db',
  ssl: false,
})

async function main() {
  const client = await pool.connect()
  try {
    console.log('💰 Creating Compensation & Benefit tables...')

    // 1. hero_compensation_benefit
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_compensation_benefit (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE CASCADE,
        compensation_type TEXT NOT NULL,
        nominal INTEGER NOT NULL DEFAULT 0,
        remarks TEXT NOT NULL DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS hero_cb_employee_idx ON hero_compensation_benefit (employee_id);
      CREATE INDEX IF NOT EXISTS hero_cb_type_idx ON hero_compensation_benefit (compensation_type);
      CREATE INDEX IF NOT EXISTS hero_cb_active_idx ON hero_compensation_benefit (is_active);
    `)
    console.log('  ✓ hero_compensation_benefit created')

    // 2. Navbar Menu — Compensation & Benefit
    await client.query(`
      INSERT INTO hero_navbar_menu_items (menu_area, section, title, url, icon_name, resource, sort_order, is_visible, open_in_new_tab, item_type, group_label)
      SELECT 'main', 'HRGA', 'Compensation & Benefit', '/dashboard/hc/compensation', 'Banknote', 'hc_compensation_benefit', 5, true, false, 'menu', 'Data & Akses Karyawan'
      WHERE NOT EXISTS (
        SELECT 1 FROM hero_navbar_menu_items WHERE url = '/dashboard/hc/compensation'
      );
      UPDATE hero_navbar_menu_items
      SET group_label = 'Data & Akses Karyawan', sort_order = 5, section = 'HRGA'
      WHERE url = '/dashboard/hc/compensation';
    `)
    console.log('  ✓ hero_navbar_menu_items registered & updated to Data & Akses Karyawan')

    // 3. Register permissions (if table exists)
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
          INSERT INTO permissions (resource, action, description)
          VALUES
            ('hc_compensation_benefit', 'view', 'Lihat daftar Compensation & Benefit'),
            ('hc_compensation_benefit', 'create', 'Tambah data Compensation & Benefit'),
            ('hc_compensation_benefit', 'edit', 'Edit data Compensation & Benefit'),
            ('hc_compensation_benefit', 'delete', 'Hapus data Compensation & Benefit')
          ON CONFLICT (resource, action) DO NOTHING;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hero_role_menu_permissions') THEN
          INSERT INTO hero_role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete, can_select_all, data_scope)
          SELECT 
            r.id,
            m.id,
            true,
            CASE WHEN r.name IN ('Super Admin', 'HC Manager', 'Site Admin') THEN true ELSE false END,
            CASE WHEN r.name IN ('Super Admin', 'HC Manager') THEN true ELSE false END,
            CASE WHEN r.name IN ('Super Admin', 'HC Manager') THEN true ELSE false END,
            'global'
          FROM hero_security_roles r
          CROSS JOIN hero_navbar_menu_items m
          WHERE m.resource = 'hc_compensation_benefit'
            AND NOT EXISTS (
              SELECT 1 FROM hero_role_menu_permissions p
              WHERE p.role_id = r.id AND p.menu_item_id = m.id
            );

          UPDATE hero_role_menu_permissions
          SET can_view = true
          WHERE menu_item_id IN (SELECT id FROM hero_navbar_menu_items WHERE resource = 'hc_compensation_benefit');
        END IF;
      END $$;
    `)
    console.log('  ✓ permissions & hero_role_menu_permissions registered')

    console.log('🎉 Compensation & Benefit database setup completed!')
  } catch (err) {
    console.error('Migration failed:', err)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
