import 'dotenv/config'
import { Pool } from 'pg'
import { getDatabaseUrl } from '../lib/database-url'
import { DEFAULT_VISION_MODEL_SETTINGS, SETTINGS_KEY_VISION_TIRE_MODEL } from '../lib/vision-model-settings'

const url = getDatabaseUrl()
if (!url) throw new Error('DATABASE_URL diperlukan')

const pool = new Pool({ connectionString: url, ssl: false })

async function main() {
  const client = await pool.connect()
  try {
    console.log('📌 Mendaftarkan Menu Deteksi Kerusakan Ban & Setting Vision Model...')

    // 1. Fetch live endpoints from Raray Vision API and seed into settings
    const { fetchRemoteVisionEndpoints } = await import('../lib/vision-model-settings')
    const remote = await fetchRemoteVisionEndpoints()
    
    let presets = DEFAULT_VISION_MODEL_SETTINGS.customEndpoints
    if (remote.success && remote.endpoints.length > 0) {
      presets = remote.endpoints.map(ep => ({
        id: `rv-${ep.id}-${ep.slug}`,
        name: ep.name || ep.slug,
        endpoint: ep.slug,
        description: ep.description || (ep.model_name ? `Model: ${ep.model_name} (${ep.model_version || 'v1'})` : undefined),
        isDefault: ep.slug === DEFAULT_VISION_MODEL_SETTINGS.primaryEndpoint,
      }))
      console.log(`🌐 Live sinkronisasi: ${presets.length} endpoint berhasil diambil dari Raray Vision.`)
    }

    const finalSettings = {
      ...DEFAULT_VISION_MODEL_SETTINGS,
      customEndpoints: presets,
    }

    await client.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [SETTINGS_KEY_VISION_TIRE_MODEL, JSON.stringify(finalSettings)]
    )
    console.log('✅ Vision Model Settings berhasil disinkronkan ke tabel settings.')

    // 2. Insert into hero_navbar_menu_items
    await client.query(`
      INSERT INTO hero_navbar_menu_items (menu_area, section, title, url, icon_name, resource, sort_order, is_visible, open_in_new_tab, item_type)
      VALUES 
        ('main', 'Genius AI', 'Deteksi Kerusakan Ban (AI)', '/dashboard/hero-genius/tire-damage', 'disc', 'hero-genius', 4, TRUE, FALSE, 'menu'),
        ('secondary', 'Pengaturan', 'Pengaturan Model Vision AI', '/dashboard/settings/vision-model', 'cpu', 'settings_vision_model', 8, TRUE, FALSE, 'menu')
      ON CONFLICT DO NOTHING;
    `)
    console.log('✅ Menu items terdaftar di hero_navbar_menu_items.')

    // 3. Update existing records if url exists to ensure visibility
    await client.query(`
      UPDATE hero_navbar_menu_items
      SET is_visible = TRUE
      WHERE url IN ('/dashboard/hero-genius/tire-damage', '/dashboard/settings/vision-model');
    `)

    // 4. Grant role permissions to roles that have access to hero-genius or super admin
    await client.query(`
      INSERT INTO hero_role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete, can_select_all, data_scope)
      SELECT r.id, m.id, TRUE, TRUE, FALSE, TRUE, 'global'
      FROM hero_security_roles r
      CROSS JOIN hero_navbar_menu_items m
      WHERE m.url = '/dashboard/hero-genius/tire-damage'
      ON CONFLICT DO NOTHING;
    `)

    await client.query(`
      INSERT INTO hero_role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete, can_select_all, data_scope)
      SELECT r.id, m.id, TRUE, TRUE, FALSE, TRUE, 'global'
      FROM hero_security_roles r
      CROSS JOIN hero_navbar_menu_items m
      WHERE m.url = '/dashboard/settings/vision-model' AND (
        LOWER(r.name) LIKE '%admin%' OR LOWER(r.name) LIKE '%super%' OR LOWER(r.name) = 'hc manager'
      )
      ON CONFLICT DO NOTHING;
    `)
    console.log('✅ Hak akses role berhasil disinkronkan.')

    console.log('🚀 Pendaftaran menu dan settings selesai 100%!')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
