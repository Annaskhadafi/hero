import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('lib/repair-master.ts defines exact 14 SLoc site codes and descriptions', async () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'lib/repair-master.ts'), 'utf8')
  
  const expectedSites = [
    { siteCode: '0201', siteName: 'CP BUMA TANJUNG' },
    { siteCode: '0202', siteName: 'CP SBS' },
    { siteCode: '0203', siteName: 'CP Malinau' },
    { siteCode: '0204', siteName: 'CP Banyuwangi' },
    { siteCode: '0205', siteName: 'CP Sorowako' },
    { siteCode: '0206', siteName: 'CP Bengkulu' },
    { siteCode: 'CONS', siteName: 'CP MHU' },
    { siteCode: 'RS01', siteName: 'CP Balikpapan' },
    { siteCode: 'RS02', siteName: 'CP Sangatta' },
    { siteCode: 'RS03', siteName: 'CP BMB' },
    { siteCode: 'RS04', siteName: 'CP BIB' },
    { siteCode: 'RS07', siteName: 'CP KIM' },
    { siteCode: 'RS08', siteName: 'CP Berau' },
    { siteCode: 'RS14', siteName: 'CP SIS TANJUNG' },
  ]

  for (const site of expectedSites) {
    assert.ok(
      content.includes(`siteCode: "${site.siteCode}"`) && content.includes(`siteName: "${site.siteName}"`),
      `Missing or mismatched site in lib/repair-master.ts: ${site.siteCode} -> ${site.siteName}`
    )
  }
})

test('lib/bahasa-material.ts correctly parses Bahasa Material.xlsx', async () => {
  const { parseBahasaMaterialExcel } = await import('../lib/bahasa-material.ts')
  const items = parseBahasaMaterialExcel()

  assert.ok(items.length >= 80, `Expected at least 80 items, got ${items.length}`)

  // Verify critical known items
  const cuttingDisc = items.find((i) => i.materialCode === '361B170005')
  assert.ok(cuttingDisc, 'Item 361B170005 should exist')
  assert.equal(cuttingDisc.materialName, 'CUTTING DISC 50 X 10 MM')
  assert.ok(cuttingDisc.notes.includes('Cutting Disc Putih'))
  assert.equal(cuttingDisc.category, 'Accessories')

  const grinder = items.find((i) => i.materialCode === '370B000001')
  assert.ok(grinder, 'Item 370B000001 should exist')
  assert.equal(grinder.materialName, 'GRINDER 22.000 RPM CP 872 CHICAGO')
  assert.equal(grinder.category, 'Tools')

  const ropeRubber = items.find((i) => i.materialCode === '799E270001')
  assert.ok(ropeRubber, 'Item 799E270001 should exist')
  assert.equal(ropeRubber.materialName, 'ROPE RUBBER')
  assert.equal(ropeRubber.category, 'Material')
})
