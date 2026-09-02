import { resolveFiveRApprovalRoute } from '../lib/five-r-approval'

async function main() {
  console.log('Testing 5R Approval Route Resolution:\n')

  // Case 1: Balikpapan Office (Area 12) -> Step 2: Rendra Rachman
  const route1 = await resolveFiveRApprovalRoute({ siteId: 126, areaId: 12 })
  console.log('1. Balikpapan Office (Area 12):')
  route1.steps.forEach((s) => console.log(`   Step ${s.level}: ${s.roleLabel} -> ${s.approverName} (${s.approverEmail})`))

  // Case 2: Balikpapan Workshop Repair (Area 8) -> Step 2: Ary Maulana
  const route2 = await resolveFiveRApprovalRoute({ siteId: 126, areaId: 8 })
  console.log('\n2. Balikpapan Workshop Repair (Area 8):')
  route2.steps.forEach((s) => console.log(`   Step ${s.level}: ${s.roleLabel} -> ${s.approverName} (${s.approverEmail})`))

  // Case 3: Balikpapan Service (Area 10) -> Step 2: Apriyanto
  const route3 = await resolveFiveRApprovalRoute({ siteId: 126, areaId: 10 })
  console.log('\n3. Balikpapan Service (Area 10):')
  route3.steps.forEach((s) => console.log(`   Step ${s.level}: ${s.roleLabel} -> ${s.approverName} (${s.approverEmail})`))

  // Case 4: Balikpapan Supply Chain (Area 11) -> Step 2: Karmiyanto
  const route4 = await resolveFiveRApprovalRoute({ siteId: 126, areaId: 11 })
  console.log('\n4. Balikpapan Supply Chain (Area 11):')
  route4.steps.forEach((s) => console.log(`   Step ${s.level}: ${s.roleLabel} -> ${s.approverName} (${s.approverEmail})`))

  // Case 5: Pupar Service (Area 38) -> Step 2: Junaidi
  const route5 = await resolveFiveRApprovalRoute({ siteId: 125, areaId: 38 })
  console.log('\n5. Pupar Service (Area 38):')
  route5.steps.forEach((s) => console.log(`   Step ${s.level}: ${s.roleLabel} -> ${s.approverName} (${s.approverEmail})`))

  // Case 6: Palembang (Area 20) -> Step 2: Febrial Hariri
  const route6 = await resolveFiveRApprovalRoute({ siteId: 134, areaId: 20 })
  console.log('\n6. Palembang (Area 20):')
  route6.steps.forEach((s) => console.log(`   Step ${s.level}: ${s.roleLabel} -> ${s.approverName} (${s.approverEmail})`))

  // Case 7: Sangatta (Area 23) -> Step 2: Saipudin
  const route7 = await resolveFiveRApprovalRoute({ siteId: 127, areaId: 23 })
  console.log('\n7. Sangatta (Area 23):')
  route7.steps.forEach((s) => console.log(`   Step ${s.level}: ${s.roleLabel} -> ${s.approverName} (${s.approverEmail})`))
}

main().then(() => process.exit(0)).catch(console.error)
