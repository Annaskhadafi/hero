import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'
import fs from 'fs'

const url = getDatabaseUrl()
if (!url) throw new Error('DATABASE_URL diperlukan')

const pool = new Pool({ connectionString: url, ssl: false })

async function updateHeroAdminFile() {
  const file = 'lib/hero-admin.ts'
  let c = fs.readFileSync(file, 'utf8')
  if (!c.includes('hc_kerjasama')) {
    const target = `    resource: 'hc_mcu_wellness',\n    sortOrder: 12,\n    isVisible: true,\n    openInNewTab: false,\n  },`
    const replacement = `    resource: 'hc_mcu_wellness',\n    sortOrder: 12,\n    isVisible: true,\n    openInNewTab: false,\n  },\n  {\n    menuArea: 'main',\n    section: 'HRGA',\n    groupLabel: 'Layanan & Personalia',\n    title: 'Kerjasama',\n    url: '/dashboard/hc/kerjasama',\n    iconName: 'handshake',\n    resource: 'hc_kerjasama',\n    sortOrder: 12.5,\n    isVisible: true,\n    openInNewTab: false,\n  },`
    c = c.replace(target, replacement)
    fs.writeFileSync(file, c, 'utf8')
    console.log('✅ Updated lib/hero-admin.ts with hc_kerjasama')
  }
}

async function insertDbMenu() {
  const client = await pool.connect()
  try {
    const existing = await client.query(
      `SELECT id FROM hero_navbar_menu_items WHERE resource = 'hc_kerjasama' OR url = '/dashboard/hc/kerjasama'`
    )

    let menuItemId: number
    if (existing.rows.length === 0) {
      const res = await client.query(`
        INSERT INTO hero_navbar_menu_items 
        (menu_area, section, title, url, icon_name, resource, sort_order, is_visible, open_in_new_tab, group_label)
        VALUES ('main', 'HRGA', 'Kerjasama', '/dashboard/hc/kerjasama', 'handshake', 'hc_kerjasama', 12, true, false, 'Layanan & Personalia')
        RETURNING id
      `)
      menuItemId = res.rows[0].id
      console.log('✅ Inserted navbar menu item hc_kerjasama (ID:', menuItemId, ')')
    } else {
      menuItemId = existing.rows[0].id
      console.log('ℹ️ Navbar menu item hc_kerjasama already exists (ID:', menuItemId, ')')
    }

    // Grant permission to all existing security roles so users can access immediately
    const rolesRes = await client.query(`SELECT id FROM hero_security_roles`)
    for (const role of rolesRes.rows) {
      await client.query(`
        INSERT INTO hero_role_menu_permissions (role_id, menu_item_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [role.id, menuItemId])
    }
    console.log(`✅ Granted permissions for ${rolesRes.rows.length} roles`)
  } finally {
    client.release()
  }
}

async function main() {
  try {
    await updateHeroAdminFile()
    await insertDbMenu()
    console.log('🎉 Sukses registrasi menu Kerjasama!')
  } catch (e) {
    console.error('Error registering menu:', e)
  } finally {
    await pool.end()
  }
}

main()
