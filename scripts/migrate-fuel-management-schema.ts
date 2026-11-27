import { db } from '../db'
import { sql } from 'drizzle-orm'

async function migrate() {
  try {
    console.log('[MIGRATE] Creating Fuel Management tables...')
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_fuel_tanks (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        site_id INTEGER REFERENCES hero_sites(id) ON DELETE SET NULL,
        location_name TEXT NOT NULL DEFAULT 'Balikpapan',
        capacity_liters NUMERIC(12, 2) NOT NULL DEFAULT 10000.00,
        current_stock_liters NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        min_stock_alert_liters NUMERIC(12, 2) NOT NULL DEFAULT 1000.00,
        fuel_type TEXT NOT NULL DEFAULT 'Solar / Biosolar (B35)',
        status TEXT NOT NULL DEFAULT 'active',
        description TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hero_fuel_transactions (
        id SERIAL PRIMARY KEY,
        transaction_number TEXT NOT NULL UNIQUE,
        transaction_type TEXT NOT NULL,
        tank_id INTEGER NOT NULL REFERENCES hero_fuel_tanks(id) ON DELETE RESTRICT,
        quantity_liters NUMERIC(12, 2) NOT NULL,
        stock_before_liters NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        stock_after_liters NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        supplier_name TEXT,
        delivery_order_number TEXT,
        attachment_url TEXT,
        equipment_id INTEGER REFERENCES hero_vehicles(id) ON DELETE SET NULL,
        equipment_unit_code TEXT,
        previous_hm_km NUMERIC(12, 2),
        current_hm_km NUMERIC(12, 2),
        operator_name TEXT,
        notes TEXT,
        transaction_date TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        created_by_user_id TEXT,
        created_by_name TEXT NOT NULL DEFAULT 'Petugas Lapangan',
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_hero_fuel_tx_tank ON hero_fuel_transactions(tank_id);
      CREATE INDEX IF NOT EXISTS idx_hero_fuel_tx_type ON hero_fuel_transactions(transaction_type);
      CREATE INDEX IF NOT EXISTS idx_hero_fuel_tx_date ON hero_fuel_transactions(transaction_date);
      CREATE INDEX IF NOT EXISTS idx_hero_fuel_tx_unit ON hero_fuel_transactions(equipment_unit_code);

      CREATE TABLE IF NOT EXISTS hero_fuel_audit_logs (
        id SERIAL PRIMARY KEY,
        transaction_id INTEGER REFERENCES hero_fuel_transactions(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        old_data TEXT,
        new_data TEXT,
        reason TEXT,
        performed_by_user_id TEXT,
        performed_by_name TEXT NOT NULL DEFAULT 'System',
        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
      );
    `)
    console.log('[MIGRATE] Tables created successfully.')

    // Seed default Fuel Tanks
    await db.execute(sql`
      INSERT INTO hero_fuel_tanks (code, name, location_name, capacity_liters, current_stock_liters, min_stock_alert_liters, fuel_type, status, description)
      VALUES 
        ('TANK-BPN-01', 'Tangki Utama Solar Balikpapan', 'Balikpapan', 15000.00, 11500.00, 2000.00, 'Solar / Biosolar (B35)', 'active', 'Tangki penyimpanan BBM utama workshop Balikpapan'),
        ('TANK-WS-02', 'Tangki Workshop & Service Bay', 'Balikpapan', 8000.00, 5200.00, 1500.00, 'Solar / Biosolar (B35)', 'active', 'Penyaluran BBM unit service dan genset workshop'),
        ('TANK-KIM-01', 'Tangki Mobile Genset Site KIM', 'CK KIM', 5000.00, 3400.00, 1000.00, 'Biosolar (B35)', 'active', 'Suplai genset dan LV operasional site KIM'),
        ('TANK-BIB-01', 'Tangki Cadangan Site BIB', 'CK BIB', 10000.00, 7800.00, 1500.00, 'Biosolar (B35)', 'active', 'Stok cadangan operasional pit site BIB')
      ON CONFLICT (code) DO NOTHING;
    `)
    console.log('[MIGRATE] Seeded default fuel tanks.')

    // Seed sample transactions if none exist
    const txCountRes: any = await db.execute(sql`SELECT COUNT(*)::int as count FROM hero_fuel_transactions`)
    const currentTxCount = Number(txCountRes?.rows?.[0]?.count || 0)
    if (currentTxCount === 0) {
      await db.execute(sql`
        INSERT INTO hero_fuel_transactions 
          (transaction_number, transaction_type, tank_id, quantity_liters, stock_before_liters, stock_after_liters, supplier_name, delivery_order_number, notes, created_by_name)
        VALUES 
          ('FIN-202611-0001', 'fuel_in', 1, 5000.00, 6500.00, 11500.00, 'PT Pertamina Patra Niaga', 'DO-PTM-2026-9812', 'Penerimaan rutin BBM Biosolar dari tanker Pertamina', 'Mochamad Annas Khadafi');

        INSERT INTO hero_fuel_transactions 
          (transaction_number, transaction_type, tank_id, quantity_liters, stock_before_liters, stock_after_liters, equipment_unit_code, previous_hm_km, current_hm_km, operator_name, notes, created_by_name)
        VALUES 
          ('FOUT-202611-0001', 'fuel_out', 1, 85.00, 11585.00, 11500.00, 'DT-01', 45120.00, 45210.00, 'Rudi Hermawan', 'Pengisian BBM rutin Dump Truck operasional', 'Geovan frixs'),
          ('FOUT-202611-0002', 'fuel_out', 2, 60.00, 5260.00, 5200.00, 'LV-03', 78480.00, 78540.00, 'Agus Santoso', 'Refueling Light Vehicle patroli site', 'Yoga Saputra');
      `)
      console.log('[MIGRATE] Seeded sample fuel transactions.')
    }

    // Update Troubleshoot ticket TKT-0002
    await db.execute(sql`
      UPDATE hero_service_desk_tickets
      SET 
        status = 'selesai',
        updated_at = NOW()
      WHERE ticket_number = 'TKT-0002';
    `)
    console.log('[MIGRATE] Ticket TKT-0002 updated to selesai.')

  } catch (error) {
    console.error('[MIGRATE ERROR]:', error)
    process.exit(1)
  }
  process.exit(0)
}

migrate()
