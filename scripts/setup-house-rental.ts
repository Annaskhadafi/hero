import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'

const url = getDatabaseUrl()
if (!url) throw new Error('DATABASE_URL is required')

const pool = new Pool({ connectionString: url, ssl: false })

async function updateUploadPrefixes() {
  console.log('🔄 Checking and updating upload prefixes...')

  // 1. app/api/uploads/[...path]/route.ts
  const routePath = path.join(process.cwd(), 'app/api/uploads/[...path]/route.ts')
  if (fs.existsSync(routePath)) {
    let route = fs.readFileSync(routePath, 'utf8')
    let changed = false
    if (!route.includes('"ga-house-rental"')) {
      route = route.replace('"hrga-kerjasama",', '"hrga-kerjasama",\r\n  "ga-house-rental",')
      if (!route.includes('"ga-house-rental"')) {
        route = route.replace('"hrga-kerjasama",', '"hrga-kerjasama",\n  "ga-house-rental",')
      }
      changed = true
    }
    if (!route.includes('path[0] === "ga-house-rental"')) {
      route = route.replace(
        'path[0] === "hrga-kerjasama"',
        'path[0] === "hrga-kerjasama" ||\r\n    path[0] === "ga-house-rental"'
      )
      if (!route.includes('path[0] === "ga-house-rental"')) {
        route = route.replace(
          'path[0] === "hrga-kerjasama"',
          'path[0] === "hrga-kerjasama" ||\n    path[0] === "ga-house-rental"'
        )
      }
      changed = true
    }
    if (!route.includes('`ga-house-rental/${fileName}`')) {
      route = route.replace(
        '`hrga-kerjasama/${fileName}`,',
        '`hrga-kerjasama/${fileName}`,\r\n      `ga-house-rental/${fileName}`,'
      )
      if (!route.includes('`ga-house-rental/${fileName}`')) {
        route = route.replace(
          '`hrga-kerjasama/${fileName}`,',
          '`hrga-kerjasama/${fileName}`,\n      `ga-house-rental/${fileName}`,'
        )
      }
      changed = true
    }
    if (changed) {
      fs.writeFileSync(routePath, route, 'utf8')
      console.log('  ✓ app/api/uploads/[...path]/route.ts updated')
    }
  }

  // 2. lib/resolve-upload-url.ts
  const resolvePath = path.join(process.cwd(), 'lib/resolve-upload-url.ts')
  if (fs.existsSync(resolvePath)) {
    let resolve = fs.readFileSync(resolvePath, 'utf8')
    if (!resolve.includes('"ga-house-rental/"')) {
      resolve = resolve.replace('"hrga-kerjasama/",', '"hrga-kerjasama/",\r\n      "ga-house-rental/",')
      if (!resolve.includes('"ga-house-rental/"')) {
        resolve = resolve.replace('"hrga-kerjasama/",', '"hrga-kerjasama/",\n      "ga-house-rental/",')
      }
      fs.writeFileSync(resolvePath, resolve, 'utf8')
      console.log('  ✓ lib/resolve-upload-url.ts updated')
    }
  }

  // 3. lib/s3-storage.ts
  const s3Path = path.join(process.cwd(), 'lib/s3-storage.ts')
  if (fs.existsSync(s3Path)) {
    let s3 = fs.readFileSync(s3Path, 'utf8')
    if (!s3.includes('ga-house-rental/')) {
      s3 = s3.replace(
        'cleanPath.startsWith("hrga-kerjasama/") ||',
        'cleanPath.startsWith("hrga-kerjasama/") ||\r\n      cleanPath.startsWith("ga-house-rental/") ||'
      )
      if (!s3.includes('ga-house-rental/')) {
        s3 = s3.replace(
          'cleanPath.startsWith("hrga-kerjasama/") ||',
          'cleanPath.startsWith("hrga-kerjasama/") ||\n      cleanPath.startsWith("ga-house-rental/") ||'
        )
      }
      fs.writeFileSync(s3Path, s3, 'utf8')
      console.log('  ✓ lib/s3-storage.ts updated')
    }
  }

  // 4. lib/client-upload-url.ts
  const clientPath = path.join(process.cwd(), 'lib/client-upload-url.ts')
  if (fs.existsSync(clientPath)) {
    let client = fs.readFileSync(clientPath, 'utf8')
    if (!client.includes('ga-house-rental')) {
      client = client.replace('marital-status)', 'marital-status|ga-house-rental)')
      fs.writeFileSync(clientPath, client, 'utf8')
      console.log('  ✓ lib/client-upload-url.ts updated')
    }
  }
}

async function main() {
  const client = await pool.connect()
  try {
    await updateUploadPrefixes()

    console.log('🏠 Creating hero_ga_house_rentals table...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS hero_ga_house_rentals (
        id SERIAL PRIMARY KEY,
        rental_code TEXT NOT NULL UNIQUE,
        work_location TEXT NOT NULL,
        site_id INTEGER REFERENCES hero_sites(id) ON DELETE SET NULL,
        description TEXT NOT NULL,
        property_type TEXT NOT NULL DEFAULT 'Mess Karyawan',
        owner_name TEXT NOT NULL,
        owner_phone TEXT DEFAULT '',
        owner_bank TEXT DEFAULT '',
        contract_start DATE NOT NULL,
        contract_end DATE NOT NULL,
        cost_rent NUMERIC(15,2) NOT NULL DEFAULT 0,
        payment_cycle TEXT DEFAULT 'yearly',
        status TEXT NOT NULL DEFAULT 'active',
        extension_notes TEXT DEFAULT '',
        address TEXT DEFAULT '',
        capacity INTEGER DEFAULT 0,
        contract_document_url TEXT,
        contract_document_name TEXT,
        property_photo_url TEXT,
        assigned_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
        assigned_employee_name TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_ga_house_rental_code ON hero_ga_house_rentals(rental_code);
      CREATE INDEX IF NOT EXISTS idx_ga_house_rental_loc ON hero_ga_house_rentals(work_location);
      CREATE INDEX IF NOT EXISTS idx_ga_house_rental_status ON hero_ga_house_rentals(status);
      CREATE INDEX IF NOT EXISTS idx_ga_house_rental_end ON hero_ga_house_rentals(contract_end);
    `)
    console.log('  ✓ hero_ga_house_rentals table created')

    // Find employee IDs for M. Asprin & Person Sihaloho if available
    const asprinRes = await client.query(`SELECT id, name FROM hero_employees WHERE name ILIKE '%Asprin%' LIMIT 1;`)
    const asprinId = asprinRes.rows[0]?.id || null
    const asprinName = asprinRes.rows[0]?.name || 'M. Asprin'

    const personRes = await client.query(`SELECT id, name FROM hero_employees WHERE name ILIKE '%Sihaloho%' LIMIT 1;`)
    const personId = personRes.rows[0]?.id || null
    const personName = personRes.rows[0]?.name || 'Person Sihaloho'

    // Match sites if any
    const siteMap: Record<string, number | null> = {}
    const sitesRes = await client.query(`SELECT id, name FROM hero_sites;`)
    for (const s of sitesRes.rows) {
      siteMap[s.name.toLowerCase()] = s.id
    }

    const getSiteId = (loc: string) => {
      const lower = loc.toLowerCase()
      for (const [sName, sId] of Object.entries(siteMap)) {
        if (lower.includes(sName) || sName.includes(lower)) return sId
      }
      return null
    }

    // Seed Data from Excel image
    console.log('🌱 Seeding initial House Rental records from Excel...')
    const seedData = [
      {
        rentalCode: 'HR-001',
        workLocation: 'CK MHU',
        siteId: getSiteId('CK MHU'),
        description: 'Mess Karyawan (2)',
        propertyType: 'Mess Karyawan',
        ownerName: 'Triyanto',
        contractStart: '2025-07-01',
        contractEnd: '2026-06-30',
        costRent: 33000000,
        paymentCycle: 'yearly',
        status: 'active',
        extensionNotes: 'Perpanjangan bulanan Rp 4.000.000 / bulan',
        capacity: 8,
        assignedEmployeeId: null,
        assignedEmployeeName: '',
      },
      {
        rentalCode: 'HR-002',
        workLocation: 'CK MHU',
        siteId: getSiteId('CK MHU'),
        description: 'Sewa Rumah M. Asprin',
        propertyType: 'Rumah Karyawan',
        ownerName: 'Tekat Pribadi',
        contractStart: '2026-07-09',
        contractEnd: '2027-01-08',
        costRent: 7800000,
        paymentCycle: '6_months',
        status: 'active',
        extensionNotes: 'Lanjut Kontrak 6 bulan',
        capacity: 4,
        assignedEmployeeId: asprinId,
        assignedEmployeeName: asprinName,
      },
      {
        rentalCode: 'HR-003',
        workLocation: 'PT Vale Sorowako',
        siteId: getSiteId('Vale'),
        description: 'Mess Karyawan',
        propertyType: 'Mess Karyawan',
        ownerName: 'Suherman Suaib',
        contractStart: '2026-01-01',
        contractEnd: '2026-12-31',
        costRent: 60000000,
        paymentCycle: 'yearly',
        status: 'active',
        extensionNotes: '',
        capacity: 10,
        assignedEmployeeId: null,
        assignedEmployeeName: '',
      },
      {
        rentalCode: 'HR-004',
        workLocation: 'CK BMB',
        siteId: getSiteId('BMB'),
        description: 'Mess Karyawan (1)',
        propertyType: 'Mess Karyawan',
        ownerName: 'Endang Budi Hastuti',
        contractStart: '2026-05-14',
        contractEnd: '2027-05-13',
        costRent: 42000000,
        paymentCycle: 'yearly',
        status: 'active',
        extensionNotes: '',
        capacity: 8,
        assignedEmployeeId: null,
        assignedEmployeeName: '',
      },
      {
        rentalCode: 'HR-005',
        workLocation: 'CK BMB',
        siteId: getSiteId('BMB'),
        description: 'Mess Karyawan (2)',
        propertyType: 'Mess Karyawan',
        ownerName: 'Heri Santoso',
        contractStart: '2026-02-01',
        contractEnd: '2027-01-31',
        costRent: 12000000,
        paymentCycle: 'yearly',
        status: 'active',
        extensionNotes: '',
        capacity: 6,
        assignedEmployeeId: null,
        assignedEmployeeName: '',
      },
      {
        rentalCode: 'HR-006',
        workLocation: 'Balikpapan',
        siteId: getSiteId('Balikpapan'),
        description: 'Sewa Rumah Person Sihaloho',
        propertyType: 'Rumah Karyawan',
        ownerName: 'Ellyana',
        contractStart: '2024-09-01',
        contractEnd: '2026-08-31',
        costRent: 100000000,
        paymentCycle: 'custom',
        status: 'terminated',
        extensionNotes: 'Tidak lanjut sewa',
        capacity: 4,
        assignedEmployeeId: personId,
        assignedEmployeeName: personName,
      },
      {
        rentalCode: 'HR-007',
        workLocation: 'Sangata',
        siteId: getSiteId('Sangatta'),
        description: 'Sewa Lahan & Bangunan',
        propertyType: 'Sewa Lahan & Bangunan',
        ownerName: 'Munru',
        contractStart: '2025-04-01',
        contractEnd: '2029-03-31',
        costRent: 185000000,
        paymentCycle: 'yearly',
        status: 'active',
        extensionNotes: 'per tahun',
        capacity: 0,
        assignedEmployeeId: null,
        assignedEmployeeName: '',
      },
      {
        rentalCode: 'HR-008',
        workLocation: 'BUMA Adaro',
        siteId: getSiteId('Adaro'),
        description: 'Mess Karyawan',
        propertyType: 'Mess Karyawan',
        ownerName: 'Misdarwati',
        contractStart: '2026-06-25',
        contractEnd: '2027-06-25',
        costRent: 34000000,
        paymentCycle: 'yearly',
        status: 'active',
        extensionNotes: '',
        capacity: 8,
        assignedEmployeeId: null,
        assignedEmployeeName: '',
      },
    ]

    for (const item of seedData) {
      await client.query(
        `
        INSERT INTO hero_ga_house_rentals (
          rental_code, work_location, site_id, description, property_type,
          owner_name, contract_start, contract_end, cost_rent, payment_cycle,
          status, extension_notes, capacity, assigned_employee_id, assigned_employee_name,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          NOW()
        )
        ON CONFLICT (rental_code) DO UPDATE SET
          work_location = EXCLUDED.work_location,
          site_id = EXCLUDED.site_id,
          description = EXCLUDED.description,
          property_type = EXCLUDED.property_type,
          owner_name = EXCLUDED.owner_name,
          contract_start = EXCLUDED.contract_start,
          contract_end = EXCLUDED.contract_end,
          cost_rent = EXCLUDED.cost_rent,
          payment_cycle = EXCLUDED.payment_cycle,
          status = EXCLUDED.status,
          extension_notes = EXCLUDED.extension_notes,
          capacity = EXCLUDED.capacity,
          assigned_employee_id = EXCLUDED.assigned_employee_id,
          assigned_employee_name = EXCLUDED.assigned_employee_name,
          updated_at = NOW();
      `,
        [
          item.rentalCode,
          item.workLocation,
          item.siteId,
          item.description,
          item.propertyType,
          item.ownerName,
          item.contractStart,
          item.contractEnd,
          item.costRent,
          item.paymentCycle,
          item.status,
          item.extensionNotes,
          item.capacity,
          item.assignedEmployeeId,
          item.assignedEmployeeName,
        ]
      )
    }
    console.log('  ✓ Seeded 8 house rental records')

    // Register navbar menu item
    console.log('📌 Registering navbar menu item...')
    await client.query(`
      INSERT INTO hero_navbar_menu_items (
        menu_area, section, title, url, icon_name, resource, sort_order, is_visible, open_in_new_tab, item_type, group_label
      )
      SELECT 'main', 'HRGA', 'House Rental', '/dashboard/ga/house-rental', 'home', 'ga_house_rental', 15.5, true, false, 'menu', 'General Affairs (GA)'
      WHERE NOT EXISTS (
        SELECT 1 FROM hero_navbar_menu_items WHERE url = '/dashboard/ga/house-rental' OR resource = 'ga_house_rental'
      );

      UPDATE hero_navbar_menu_items
      SET title = 'House Rental',
          section = 'HRGA',
          group_label = 'General Affairs (GA)',
          icon_name = 'home',
          sort_order = 15.5,
          is_visible = true
      WHERE url = '/dashboard/ga/house-rental' OR resource = 'ga_house_rental';
    `)
    console.log('  ✓ Navbar menu item registered')

    // Register permissions
    console.log('🔐 Registering permissions and role mappings...')
    const perms = [
      { resource: 'ga_house_rental', action: 'view', description: 'Melihat data sewa rumah & mess karyawan' },
      { resource: 'ga_house_rental', action: 'create', description: 'Menambahkan data sewa rumah & mess baru' },
      { resource: 'ga_house_rental', action: 'edit', description: 'Mengubah data dan status sewa rumah & mess' },
      { resource: 'ga_house_rental', action: 'delete', description: 'Menghapus data sewa rumah & mess' },
    ]

    for (const p of perms) {
      await client.query(
        `
        INSERT INTO permissions (resource, action, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (resource, action) DO UPDATE
        SET description = EXCLUDED.description;
      `,
        [p.resource, p.action, p.description]
      )
    }

    // Assign to roles
    const menuRow = await client.query(`SELECT id FROM hero_navbar_menu_items WHERE resource = 'ga_house_rental' LIMIT 1;`)
    const menuItemId = menuRow.rows[0]?.id

    if (menuItemId) {
      const rolesRes = await client.query(`SELECT id, name FROM hero_security_roles;`)
      for (const r of rolesRes.rows) {
        await client.query(
          `
          INSERT INTO hero_role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete, can_select_all, data_scope)
          VALUES ($1, $2, true, true, true, true, 'global')
          ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
            can_view = true,
            can_edit = true,
            can_delete = true,
            can_select_all = true;
        `,
          [r.id, menuItemId]
        )
      }
    }

    console.log('🎉 House Rental setup completed successfully!')
  } catch (err) {
    console.error('❌ Error during setup:', err)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

main()
