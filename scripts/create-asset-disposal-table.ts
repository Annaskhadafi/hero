import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'
import fs from 'fs'
import path from 'path'

const url = getDatabaseUrl()
if (!url) throw new Error('DATABASE_URL diperlukan')

const pool = new Pool({ connectionString: url, ssl: false })

async function main() {
  const client = await pool.connect()
  try {
    console.log('🚀 Creating hero_asset_disposals table and adjusting menus...')

    // 1. Table hero_asset_disposals
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_asset_disposals (
        id SERIAL PRIMARY KEY,
        disposal_number TEXT NOT NULL UNIQUE,
        asset_id INTEGER REFERENCES hero_central_service_assets(id) ON DELETE SET NULL,
        asset_name TEXT NOT NULL,
        asset_number TEXT,
        purchase_year TEXT,
        department_id INTEGER REFERENCES hero_master_departments(id) ON DELETE SET NULL,
        department_name TEXT NOT NULL,
        section_id INTEGER REFERENCES hero_master_sections(id) ON DELETE SET NULL,
        section_name TEXT,
        site_id INTEGER NOT NULL REFERENCES hero_sites(id) ON DELETE RESTRICT,
        site_name TEXT NOT NULL,
        disposal_date DATE NOT NULL,
        notes TEXT NOT NULL,
        attachments TEXT NOT NULL DEFAULT '[]',
        applicant_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        applicant_name TEXT NOT NULL,
        applicant_job_title TEXT,
        created_by_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        current_step_order INTEGER NOT NULL DEFAULT 1,
        total_steps INTEGER NOT NULL DEFAULT 5,
        current_approver_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        current_approver_name TEXT,
        submitted_at TIMESTAMP DEFAULT NOW(),
        approved_at TIMESTAMP,
        rejected_at TIMESTAMP,
        cancelled_at TIMESTAMP,
        rejection_note TEXT,
        cancellation_reason TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS hero_asset_disposals_asset_id_idx ON hero_asset_disposals (asset_id);
      CREATE INDEX IF NOT EXISTS hero_asset_disposals_applicant_idx ON hero_asset_disposals (applicant_employee_id);
      CREATE INDEX IF NOT EXISTS hero_asset_disposals_status_idx ON hero_asset_disposals (status);
      CREATE INDEX IF NOT EXISTS hero_asset_disposals_created_at_idx ON hero_asset_disposals (created_at DESC);
    `)
    console.log('  ✓ Table hero_asset_disposals and indexes created/ensured')

    // 2. Add asset_disposal_id column to hero_approvals if not exists
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'hero_approvals' AND column_name = 'asset_disposal_id'
        ) THEN
          ALTER TABLE hero_approvals ADD COLUMN asset_disposal_id INTEGER REFERENCES hero_asset_disposals(id) ON DELETE CASCADE;
          CREATE INDEX hero_approvals_asset_disposal_id_idx ON hero_approvals(asset_disposal_id);
        END IF;
      END $$;
    `)
    console.log('  ✓ Column asset_disposal_id ensured in hero_approvals')

    // 3. Adjust sort orders in Asset Management section
    await client.query(`
      UPDATE hero_navbar_menu_items
      SET sort_order = 28
      WHERE url = '/dashboard/central-service/sap-assets' OR resource = 'sap_asset_inventory';

      UPDATE hero_navbar_menu_items
      SET sort_order = 27
      WHERE url = '/dashboard/central-service/assets' OR resource = 'central-service-assets';

      UPDATE hero_navbar_menu_items
      SET sort_order = 26
      WHERE url = '/dashboard/assets/budget-controller' OR resource = 'cer_budget_controller';
    `)

    // 4. Register Menu item "Form Asset Disposal" at sort_order 25
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
        'Form Asset Disposal',
        '/dashboard/assets/disposal',
        'trash-2',
        'asset_disposal',
        25,
        true,
        false,
        'menu'
      WHERE NOT EXISTS (
        SELECT 1 FROM hero_navbar_menu_items WHERE url = '/dashboard/assets/disposal' OR resource = 'asset_disposal'
      )
      RETURNING id;
    `)

    let menuItemId: number
    if (resMenu.rows.length > 0) {
      menuItemId = resMenu.rows[0].id
      console.log(`  ✓ Navbar menu item "Form Asset Disposal" created with ID: ${menuItemId}`)
    } else {
      const existing = await client.query(
        `SELECT id FROM hero_navbar_menu_items WHERE resource = 'asset_disposal' OR url = '/dashboard/assets/disposal' LIMIT 1`
      )
      menuItemId = existing.rows[0].id
      await client.query(
        `
        UPDATE hero_navbar_menu_items
        SET title = 'Form Asset Disposal',
            section = 'Asset Management',
            sort_order = 25,
            icon_name = 'trash-2',
            is_visible = true
        WHERE id = $1
      `,
        [menuItemId]
      )
      console.log(`  ✓ Navbar menu item "Form Asset Disposal" updated (ID: ${menuItemId})`)
    }

    // 5. Grant role permissions to Super Admin and active roles for 'asset_disposal'
    await client.query(
      `
      INSERT INTO hero_role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete, can_select_all, data_scope)
      SELECT r.id, $1, true, true, true, true, 'all'
      FROM hero_security_roles r
      WHERE NOT EXISTS (
        SELECT 1 FROM hero_role_menu_permissions rmp WHERE rmp.role_id = r.id AND rmp.menu_item_id = $1
      );
    `,
      [menuItemId]
    )
    console.log('  ✓ Role permissions granted for "asset_disposal"')

    // 6. Update menus.json to keep static menus file in sync
    const menusPath = path.join(process.cwd(), 'menus.json')
    if (fs.existsSync(menusPath)) {
      const menus = JSON.parse(fs.readFileSync(menusPath, 'utf8'))
      const exists = menus.some((m: any) => m.url === '/dashboard/assets/disposal' || m.resource === 'asset_disposal')
      if (!exists) {
        // Insert right after Form Asset Borrow
        const borrowIdx = menus.findIndex((m: any) => m.url === '/dashboard/assets/borrow')
        const newMenuItem = {
          title: 'Form Asset Disposal',
          url: '/dashboard/assets/disposal',
          resource: 'asset_disposal',
        }
        if (borrowIdx !== -1) {
          menus.splice(borrowIdx + 1, 0, newMenuItem)
        } else {
          menus.push(newMenuItem)
        }
        fs.writeFileSync(menusPath, JSON.stringify(menus, null, 2), 'utf8')
        console.log('  ✓ menus.json synced')
      }
    }

    console.log('🎉 Asset Disposal database migration completed successfully!')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
