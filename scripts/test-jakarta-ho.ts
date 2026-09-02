import { resolveFiveRApprovalRoute } from '../lib/five-r-approval'

async function main() {
  const route = await resolveFiveRApprovalRoute({ siteId: 125, areaId: 17 })
  console.log('Jakarta Head Office (Area 17):')
  route.steps.forEach((s) => console.log(`   Step ${s.level}: ${s.roleLabel} -> ${s.approverName} (${s.approverEmail})`))
}

main().then(() => process.exit(0)).catch(console.error)
