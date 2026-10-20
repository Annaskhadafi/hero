/**
 * Create CER (Capital Expenditure Request) tables directly via SQL.
 * Safe and non-destructive.
 * Run: npx tsx scripts/create-cer-tables.ts
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
    console.log('🚀 Creating CER tables...')

    // 1. hero_cer_capex_budgets
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_cer_capex_budgets (
        id SERIAL PRIMARY KEY,
        fiscal_year INTEGER NOT NULL,
        site_id INTEGER REFERENCES hero_sites(id) ON DELETE SET NULL,
        department_id INTEGER REFERENCES hero_master_departments(id) ON DELETE SET NULL,
        asset_category TEXT NOT NULL DEFAULT 'IT Device',
        budget_code TEXT NOT NULL,
        budget_name TEXT NOT NULL,
        allocated_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        used_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        remaining_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        notes TEXT NOT NULL DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_by_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS cer_capex_budget_code_idx ON hero_cer_capex_budgets (budget_code);
      CREATE INDEX IF NOT EXISTS cer_capex_year_site_dept_cat_idx ON hero_cer_capex_budgets (fiscal_year, site_id, department_id, asset_category);
    `)
    console.log('  ✓ hero_cer_capex_budgets')

    // 2. hero_cer_capex_budget_transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_cer_capex_budget_transactions (
        id SERIAL PRIMARY KEY,
        budget_id INTEGER NOT NULL REFERENCES hero_cer_capex_budgets(id) ON DELETE CASCADE,
        cer_request_id INTEGER,
        transaction_type TEXT NOT NULL,
        amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        previous_remaining NUMERIC(15, 2) NOT NULL DEFAULT 0,
        new_remaining NUMERIC(15, 2) NOT NULL DEFAULT 0,
        description TEXT NOT NULL DEFAULT '',
        created_by_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS cer_budget_tx_budget_id_idx ON hero_cer_capex_budget_transactions (budget_id);
      CREATE INDEX IF NOT EXISTS cer_budget_tx_request_id_idx ON hero_cer_capex_budget_transactions (cer_request_id);
    `)
    console.log('  ✓ hero_cer_capex_budget_transactions')

    // 3. hero_cer_requests
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_cer_requests (
        id SERIAL PRIMARY KEY,
        cer_number TEXT NOT NULL,
        subject TEXT NOT NULL,
        applicant_employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE RESTRICT,
        date_required DATE,
        level TEXT NOT NULL DEFAULT 'Non Managerial',
        purchase_type TEXT NOT NULL DEFAULT 'Tambahan / Baru',
        budget_source TEXT NOT NULL DEFAULT 'Anggaran',
        department_id INTEGER REFERENCES hero_master_departments(id) ON DELETE SET NULL,
        section_id INTEGER REFERENCES hero_master_sections(id) ON DELETE SET NULL,
        site_id INTEGER REFERENCES hero_sites(id) ON DELETE SET NULL,
        asset_category TEXT NOT NULL DEFAULT 'IT Device',
        purchase_purpose TEXT NOT NULL DEFAULT '',
        vendor_name TEXT NOT NULL DEFAULT '',
        total_estimated_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
        capex_budget_id INTEGER REFERENCES hero_cer_capex_budgets(id) ON DELETE SET NULL,
        attachment_checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
        status TEXT NOT NULL DEFAULT 'draft',
        current_step_order INTEGER NOT NULL DEFAULT 1,
        current_approver_title TEXT,
        current_approver_name TEXT,
        current_approver_employee_id INTEGER,
        last_reverted_by_employee_id INTEGER,
        last_revert_step_order INTEGER,
        last_revert_note TEXT,
        is_unbudgeted BOOLEAN NOT NULL DEFAULT false,
        is_over_budget BOOLEAN NOT NULL DEFAULT false,
        pdf_url TEXT,
        approved_at TIMESTAMP,
        received_at TIMESTAMP,
        receiver_notes TEXT,
        delivery_note_url TEXT,
        goods_photo_url TEXT,
        created_by_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS cer_number_idx ON hero_cer_requests (cer_number);
      CREATE INDEX IF NOT EXISTS cer_applicant_idx ON hero_cer_requests (applicant_employee_id);
      CREATE INDEX IF NOT EXISTS cer_status_idx ON hero_cer_requests (status);
      CREATE INDEX IF NOT EXISTS cer_site_dept_idx ON hero_cer_requests (site_id, department_id);
    `)
    console.log('  ✓ hero_cer_requests')

    // 4. hero_cer_items
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_cer_items (
        id SERIAL PRIMARY KEY,
        cer_request_id INTEGER NOT NULL REFERENCES hero_cer_requests(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        qty INTEGER NOT NULL DEFAULT 1,
        price_per_unit NUMERIC(15, 2) NOT NULL DEFAULT 0,
        total_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
        allocation TEXT NOT NULL DEFAULT '',
        holder_name TEXT NOT NULL DEFAULT '',
        estimated_lifespan TEXT NOT NULL DEFAULT '',
        asset_id INTEGER REFERENCES hero_central_service_assets(id) ON DELETE SET NULL,
        serial_number TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS cer_items_request_idx ON hero_cer_items (cer_request_id);
    `)
    console.log('  ✓ hero_cer_items')

    // 5. hero_cer_attachments
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_cer_attachments (
        id SERIAL PRIMARY KEY,
        cer_request_id INTEGER NOT NULL REFERENCES hero_cer_requests(id) ON DELETE CASCADE,
        file_type TEXT NOT NULL DEFAULT 'attachment',
        file_name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS cer_attachments_request_idx ON hero_cer_attachments (cer_request_id);
    `)
    console.log('  ✓ hero_cer_attachments')

    // 6. hero_cer_basts
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_cer_basts (
        id SERIAL PRIMARY KEY,
        cer_request_id INTEGER NOT NULL REFERENCES hero_cer_requests(id) ON DELETE CASCADE,
        bast_number TEXT NOT NULL,
        handover_date DATE NOT NULL,
        ga_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        ga_employee_name TEXT NOT NULL DEFAULT '',
        user_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        user_employee_name TEXT NOT NULL DEFAULT '',
        ga_signature_url TEXT,
        ga_signed_at TIMESTAMP,
        user_signature_url TEXT,
        user_signed_at TIMESTAMP,
        pdf_url TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS cer_bast_number_idx ON hero_cer_basts (bast_number);
      CREATE INDEX IF NOT EXISTS cer_bast_request_idx ON hero_cer_basts (cer_request_id);
    `)
    console.log('  ✓ hero_cer_basts')

    // 7. hero_cer_notification_configs
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_cer_notification_configs (
        id SERIAL PRIMARY KEY,
        procurement_email TEXT NOT NULL DEFAULT 'procurement@chitraparatama.com',
        procurement_site_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
        evo_dwi_email TEXT NOT NULL DEFAULT 'evo.dwi@chitraparatama.com',
        ga_adila_email TEXT NOT NULL DEFAULT 'adila@chitraparatama.com',
        ga_bagas_email TEXT NOT NULL DEFAULT 'bagas@chitraparatama.com',
        it_bima_email TEXT NOT NULL DEFAULT 'bima@chitraparatama.com',
        budget_validator_email TEXT NOT NULL DEFAULT 'budget.controller@chitraparatama.com',
        is_active BOOLEAN NOT NULL DEFAULT true,
        updated_by_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)
    console.log('  ✓ hero_cer_notification_configs')

    // 8. Seed default notification config if empty
    await client.query(`
      INSERT INTO hero_cer_notification_configs (
        procurement_email,
        evo_dwi_email,
        ga_adila_email,
        ga_bagas_email,
        it_bima_email,
        budget_validator_email
      )
      SELECT
        'procurement@chitraparatama.com',
        'evo.dwi@chitraparatama.com',
        'adila@chitraparatama.com',
        'bagas@chitraparatama.com',
        'bima@chitraparatama.com',
        'budget.controller@chitraparatama.com'
      WHERE NOT EXISTS (SELECT 1 FROM hero_cer_notification_configs);
    `)
    console.log('  ✓ default notification config row ensured')

    // 9. Register Menu item "Pengadaan Aset (CER)" under "Assets" (or "Central Service")
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
        'Pengadaan Aset (CER)',
        '/dashboard/assets/cer',
        'shopping-cart',
        'cer_request',
        15,
        true,
        false,
        'menu',
        'Asset Management'
      WHERE NOT EXISTS (
        SELECT 1 FROM hero_navbar_menu_items WHERE url = '/dashboard/assets/cer'
      );
    `)
    console.log('  ✓ Navbar menu item "Pengadaan Aset (CER)" ensured')

    console.log('🎉 All CER tables and seeds created successfully!')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Error creating CER tables:', err)
  process.exit(1)
})
