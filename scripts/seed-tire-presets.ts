/**
 * Seed preset ukuran ban untuk Tire Pattern Designer.
 * Run: tsx scripts/seed-tire-presets.ts
 */
import 'dotenv/config'
import { db } from '../db'
import { tireSizePresets } from '../db/schema/tire-pattern'

// ─── Kalkulasi dimensi ban ───────────────────────────────────────────────────
function calcTireDimensions(sectionWidthMm: number, aspectRatio: number, rimDiameterInch: number) {
  const rimDiameterMm = rimDiameterInch * 25.4
  const sectionHeightMm = (sectionWidthMm * aspectRatio) / 100
  const outerDiameterMm = rimDiameterMm + 2 * sectionHeightMm
  const circumferenceMm = Math.round(Math.PI * outerDiameterMm)
  const treadWidthMm = Math.round(sectionWidthMm * 0.78) // ~78% section width
  return { rimDiameterMm: Math.round(rimDiameterMm), circumferenceMm, treadWidthMm }
}

// ─── Data Preset ─────────────────────────────────────────────────────────────
// Format code: "W-D" (section_width_mm - rim_diameter_inch)
// Untuk ban bias truck: aspect ratio default 100 (W=H)
const presets = [
  // ── Truck/Bus Bias ─────────────────────────────────────────────────────────
  { code: '1200-24', label: '1200-24', width: 305, ar: 100, rim: 24, cat: 'truck' },
  { code: '1100-22', label: '1100-22', width: 279, ar: 100, rim: 22, cat: 'truck' },
  { code: '1100-20', label: '1100-20', width: 279, ar: 100, rim: 20, cat: 'truck' },
  { code: '1000-22', label: '1000-22', width: 254, ar: 100, rim: 22, cat: 'truck' },
  { code: '1000-20', label: '1000-20 ★ (Paling Umum)', width: 254, ar: 100, rim: 20, cat: 'truck' },
  { code: '900-22', label: '900-22', width: 229, ar: 100, rim: 22, cat: 'truck' },
  { code: '900-20', label: '900-20', width: 229, ar: 100, rim: 20, cat: 'truck' },
  { code: '825-20', label: '825-20', width: 209, ar: 100, rim: 20, cat: 'truck' },
  { code: '825-16', label: '825-16', width: 209, ar: 100, rim: 16, cat: 'truck' },
  { code: '750-20', label: '750-20', width: 190, ar: 100, rim: 20, cat: 'truck' },
  { code: '750-16', label: '750-16', width: 190, ar: 100, rim: 16, cat: 'truck' },
  { code: '700-16', label: '700-16', width: 178, ar: 100, rim: 16, cat: 'truck' },
  { code: '650-16', label: '650-16', width: 165, ar: 100, rim: 16, cat: 'truck' },
  { code: '600-16', label: '600-16', width: 152, ar: 100, rim: 16, cat: 'truck' },
  // ── OTR / Alat Berat ──────────────────────────────────────────────────────
  { code: '1400-24', label: '1400-24 (OTR)', width: 356, ar: 100, rim: 24, cat: 'otr' },
  { code: '1800-25', label: '1800-25 (OTR)', width: 457, ar: 100, rim: 25, cat: 'otr' },
  { code: '2100-25', label: '2100-25 (OTR)', width: 533, ar: 100, rim: 25, cat: 'otr' },
  { code: '2400-25', label: '2400-25 (OTR Besar)', width: 610, ar: 100, rim: 25, cat: 'otr' },
]

async function main() {
  console.log('🛞 Seeding tire size presets...')

  const values = presets.map((p, i) => {
    const { rimDiameterMm, circumferenceMm, treadWidthMm } = calcTireDimensions(p.width, p.ar, p.rim)
    return {
      code: p.code,
      label: p.label,
      sectionWidth: p.width,
      aspectRatio: p.ar,
      rimDiameter: p.rim,
      rimDiameterMm,
      circumferenceMm,
      treadWidthMm,
      category: p.cat,
      sortOrder: i,
      isActive: true,
    }
  })

  // Upsert (insert or skip if already exists)
  for (const val of values) {
    try {
      await db
        .insert(tireSizePresets)
        .values(val)
        .onConflictDoNothing()
      console.log(`  ✓ ${val.code} — circumference: ${val.circumferenceMm}mm, tread: ${val.treadWidthMm}mm`)
    } catch (e) {
      console.error(`  ✗ Failed ${val.code}:`, e)
    }
  }

  console.log(`\n✅ Done: ${values.length} presets seeded.`)
  process.exit(0)
}

main().catch((e) => {
  console.error('Fatal error:', e)
  process.exit(1)
})
