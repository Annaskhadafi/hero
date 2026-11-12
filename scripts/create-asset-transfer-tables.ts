import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
if (!url) throw new Error('DATABASE_URL diperlukan')

const pool = new Pool({ connectionString: url, ssl: false })

async function main() {
  const client = await pool.connect()
  try {
    console.log('🚀 Creating hero_asset_transfers tables...')

    // 1. hero_asset_transfers
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_asset_transfers (
        id SERIAL PRIMARY KEY,
        transfer_number TEXT NOT NULL UNIQUE,
        asset_id INTEGER NOT NULL REFERENCES hero_central_service_assets(id) ON DELETE RESTRICT,
        asset_name TEXT NOT NULL,
        asset_number TEXT,
        serial_number TEXT,
        equipment_checklist TEXT[] NOT NULL DEFAULT '{}',
        equipment_other_note TEXT,
        asset_photos TEXT NOT NULL DEFAULT '[]',
        current_holder_employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE RESTRICT,
        current_holder_name TEXT NOT NULL,
        current_location_site_id INTEGER NOT NULL REFERENCES hero_sites(id) ON DELETE RESTRICT,
        current_location_name TEXT NOT NULL,
        new_holder_employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE RESTRICT,
        new_holder_name TEXT NOT NULL,
        target_location_site_id INTEGER NOT NULL REFERENCES hero_sites(id) ON DELETE RESTRICT,
        target_location_name TEXT NOT NULL,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        current_step_order INTEGER NOT NULL DEFAULT 1,
        current_approver_title TEXT,
        current_approver_name TEXT,
        current_approver_employee_id INTEGER,
        approval_matrix_id INTEGER,
        created_by_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
        applicant_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        submitted_at TIMESTAMP DEFAULT NOW(),
        transferred_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS hero_asset_transfers_asset_id_idx ON hero_asset_transfers (asset_id);
      CREATE INDEX IF NOT EXISTS hero_asset_transfers_status_idx ON hero_asset_transfers (status);
      CREATE INDEX IF NOT EXISTS hero_asset_transfers_created_at_idx ON hero_asset_transfers (created_at DESC);
    `)
    console.log('  ✓ Table hero_asset_transfers created/ensured')

    // 2. Add asset_transfer_id to hero_approvals if not exists
    await client.query(`
      ALTER TABLE hero_approvals ADD COLUMN IF NOT EXISTS asset_transfer_id INTEGER;
    `)
    console.log('  ✓ Column asset_transfer_id in hero_approvals ensured')

    // 3. Register Menu item in hero_navbar_menu_items
    await client.query(`
      INSERT INTO hero_navbar_menu_items (
        menu_area,
        section,
        title,
        url,
        icon_name,
        resource,
        sort_order,
        is_visible,
        open_in_new_tab,
        item_type,
        group_label
      )
      SELECT
        'main',
        'Central Service',
        'Transfer Aset',
        '/dashboard/assets/transfer',
        'arrow-right-left',
        'asset_transfer',
        2,
        true,
        false,
        'menu',
        'Assets'
      WHERE NOT EXISTS (
        SELECT 1 FROM hero_navbar_menu_items WHERE url = '/dashboard/assets/transfer'
      );
    `)
    console.log('  ✓ Navbar menu item "Transfer Aset" ensured')

    console.log('🎉 Asset Transfer database migration completed successfully!')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
