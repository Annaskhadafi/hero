import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'
import { seedMasterAtk } from './seed-master-atk'

const url = getDatabaseUrl()
if (!url) throw new Error('DATABASE_URL diperlukan')

const pool = new Pool({ connectionString: url, ssl: false })

async function main() {
  const client = await pool.connect()
  try {
    console.log('📦 Creating GA - ATK tables...')

    // 1. hero_master_atk
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_master_atk (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Umum',
        unit TEXT NOT NULL DEFAULT 'Pcs',
        description TEXT NOT NULL DEFAULT '',
        min_stock INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS hero_master_atk_code_idx ON hero_master_atk (code);
      CREATE INDEX IF NOT EXISTS hero_master_atk_category_idx ON hero_master_atk (category);
      CREATE INDEX IF NOT EXISTS hero_master_atk_active_idx ON hero_master_atk (is_active);
    `)
    console.log('  ✓ hero_master_atk created')

    // 2. hero_atk_requests
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_atk_requests (
        id SERIAL PRIMARY KEY,
        request_number TEXT NOT NULL UNIQUE,
        employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE CASCADE,
        site_id INTEGER NOT NULL REFERENCES hero_sites(id) ON DELETE CASCADE,
        department_id INTEGER REFERENCES hero_master_departments(id) ON DELETE SET NULL,
        request_type TEXT NOT NULL DEFAULT 'personal',
        target_recipient_name TEXT NOT NULL DEFAULT '',
        request_date TIMESTAMP NOT NULL DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'pending_approval',
        notes TEXT NOT NULL DEFAULT '',
        requester_signature_url TEXT,
        processed_by_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        reviewer_note TEXT NOT NULL DEFAULT '',
        reviewed_at TIMESTAMP,
        recipient_signature_url TEXT,
        recipient_name TEXT NOT NULL DEFAULT '',
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS hero_atk_req_number_idx ON hero_atk_requests (request_number);
      CREATE INDEX IF NOT EXISTS hero_atk_req_emp_idx ON hero_atk_requests (employee_id);
      CREATE INDEX IF NOT EXISTS hero_atk_req_site_idx ON hero_atk_requests (site_id);
      CREATE INDEX IF NOT EXISTS hero_atk_req_status_idx ON hero_atk_requests (status);
      CREATE INDEX IF NOT EXISTS hero_atk_req_date_idx ON hero_atk_requests (request_date);
    `)
    console.log('  ✓ hero_atk_requests created')

    // 3. hero_atk_request_items
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_atk_request_items (
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL REFERENCES hero_atk_requests(id) ON DELETE CASCADE,
        master_atk_id INTEGER REFERENCES hero_master_atk(id) ON DELETE SET NULL,
        custom_item_name TEXT NOT NULL DEFAULT '',
        quantity INTEGER NOT NULL DEFAULT 1,
        unit TEXT NOT NULL DEFAULT 'Pcs',
        notes TEXT NOT NULL DEFAULT ''
      );
      CREATE INDEX IF NOT EXISTS hero_atk_req_items_req_idx ON hero_atk_request_items (request_id);
      CREATE INDEX IF NOT EXISTS hero_atk_req_items_item_idx ON hero_atk_request_items (master_atk_id);
    `)
    console.log('  ✓ hero_atk_request_items created')

    // 4. Navbar Menu items for GA - ATK
    await client.query(`
      INSERT INTO hero_navbar_menu_items (menu_area, section, title, url, icon_name, resource, sort_order, is_visible, open_in_new_tab, item_type, group_label)
      SELECT 'main', 'HRGA', 'Pengajuan ATK', '/dashboard/ga/atk', 'files', 'ga-atk', 35, true, false, 'menu', 'General Affairs (GA)'
      WHERE NOT EXISTS (
        SELECT 1 FROM hero_navbar_menu_items WHERE url = '/dashboard/ga/atk'
      );

      INSERT INTO hero_navbar_menu_items (menu_area, section, title, url, icon_name, resource, sort_order, is_visible, open_in_new_tab, item_type, group_label)
      SELECT 'main', 'HRGA', 'Master Data ATK', '/dashboard/ga/atk/master', 'folder', 'ga-atk', 36, true, false, 'menu', 'General Affairs (GA)'
      WHERE NOT EXISTS (
        SELECT 1 FROM hero_navbar_menu_items WHERE url = '/dashboard/ga/atk/master'
      );
    `)
    console.log('  ✓ hero_navbar_menu_items registered')

    // 5. Register permissions in permissions table if exists
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permissions') THEN
          INSERT INTO permissions (resource, action, description)
          VALUES
            ('ga-atk', 'view', 'View ATK requests and dashboard'),
            ('ga-atk', 'create', 'Create new ATK request'),
            ('ga-atk', 'edit', 'Edit ATK request or master data'),
            ('ga-atk', 'approve', 'Approve/reject and fulfill ATK requests'),
            ('ga-atk', 'delete', 'Delete ATK request or master item')
          ON CONFLICT (resource, action) DO NOTHING;
        END IF;
      END $$;
    `)
    console.log('  ✓ permissions registered')

    client.release()

    // 6. Seed master ATK catalog
    await seedMasterAtk()

    console.log('🎉 GA - ATK database setup & seed completed!')
  } catch (err) {
    client.release()
    throw err
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
