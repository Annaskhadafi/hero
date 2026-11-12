import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
if (!url) throw new Error('DATABASE_URL diperlukan')

const pool = new Pool({ connectionString: url, ssl: false })

async function main() {
  const client = await pool.connect()
  try {
    console.log('🚀 Creating hero_asset_borrows table...')

    // 1. Table hero_asset_borrows
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_asset_borrows (
        id SERIAL PRIMARY KEY,
        borrow_number TEXT NOT NULL UNIQUE,
        asset_id INTEGER NOT NULL REFERENCES hero_central_service_assets(id) ON DELETE RESTRICT,
        asset_name TEXT NOT NULL,
        asset_number TEXT,
        serial_number TEXT,
        borrower_employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE RESTRICT,
        borrower_name TEXT NOT NULL,
        holder_employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE RESTRICT,
        holder_name TEXT NOT NULL,
        equipment_notes TEXT,
        purpose TEXT NOT NULL,
        borrow_date TIMESTAMP NOT NULL,
        expected_return_date TIMESTAMP,
        actual_return_date TIMESTAMP,
        return_notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        approval_note TEXT,
        approved_at TIMESTAMP,
        rejected_at TIMESTAMP,
        created_by_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
        applicant_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        submitted_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS hero_asset_borrows_asset_id_idx ON hero_asset_borrows (asset_id);
      CREATE INDEX IF NOT EXISTS hero_asset_borrows_borrower_idx ON hero_asset_borrows (borrower_employee_id);
      CREATE INDEX IF NOT EXISTS hero_asset_borrows_holder_idx ON hero_asset_borrows (holder_employee_id);
      CREATE INDEX IF NOT EXISTS hero_asset_borrows_status_idx ON hero_asset_borrows (status);
      CREATE INDEX IF NOT EXISTS hero_asset_borrows_created_at_idx ON hero_asset_borrows (created_at DESC);
    `)
    console.log('  ✓ Table hero_asset_borrows and indexes created/ensured')

    // 2. Adjust sort orders in Asset Management section
    await client.query(`
      UPDATE hero_navbar_menu_items
      SET sort_order = 27
      WHERE url = '/dashboard/central-service/sap-assets' OR resource = 'sap_asset_inventory';

      UPDATE hero_navbar_menu_items
      SET sort_order = 26
      WHERE url = '/dashboard/central-service/assets' OR resource = 'central-service-assets';

      UPDATE hero_navbar_menu_items
      SET sort_order = 25
      WHERE url = '/dashboard/assets/budget-controller' OR resource = 'cer_budget_controller';
    `)

    // 3. Register Menu item "Form Asset Borrow" at sort_order 24
    const resMenu = await client.query(`
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
        item_type
      )
      SELECT
        'main',
        'Asset Management',
        'Form Asset Borrow',
        '/dashboard/assets/borrow',
        'hand-helping',
        'asset_borrow',
        24,
        true,
        false,
        'menu'
      WHERE NOT EXISTS (
        SELECT 1 FROM hero_navbar_menu_items WHERE url = '/dashboard/assets/borrow' OR resource = 'asset_borrow'
      )
      RETURNING id;
    `)

    let menuItemId: number
    if (resMenu.rows.length > 0) {
      menuItemId = resMenu.rows[0].id
      console.log(`  ✓ Navbar menu item "Form Asset Borrow" created with ID: ${menuItemId}`)
    } else {
      const existing = await client.query(`SELECT id FROM hero_navbar_menu_items WHERE resource = 'asset_borrow' OR url = '/dashboard/assets/borrow' LIMIT 1`)
      menuItemId = existing.rows[0].id
      await client.query(`
        UPDATE hero_navbar_menu_items
        SET title = 'Form Asset Borrow',
            section = 'Asset Management',
            sort_order = 24,
            is_visible = true
        WHERE id = $1
      `, [menuItemId])
      console.log(`  ✓ Navbar menu item "Form Asset Borrow" updated (ID: ${menuItemId})`)
    }

    // 4. Grant role permissions to Super Admin and active roles for 'asset_borrow'
    await client.query(`
      INSERT INTO hero_role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete, can_select_all, data_scope)
      SELECT r.id, $1, true, true, true, true, 'all'
      FROM hero_security_roles r
      WHERE NOT EXISTS (
        SELECT 1 FROM hero_role_menu_permissions rmp WHERE rmp.role_id = r.id AND rmp.menu_item_id = $1
      );
    `, [menuItemId])
    console.log('  ✓ Role permissions granted for "asset_borrow"')

    console.log('🎉 Asset Borrow database migration completed successfully!')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
