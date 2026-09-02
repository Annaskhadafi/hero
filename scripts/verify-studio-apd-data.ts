import { getWorkflowStudioConsoleData } from '@/lib/approval-blueprint'

async function main() {
  console.log('=== VERIFYING WORKFLOW STUDIO APD DATA ===\n')

  const data = await getWorkflowStudioConsoleData()
  const apdItem = data.inventory.find((w) => w.id === 'apd-request-apd' || w.templateKey === 'apd-request-apd')

  if (!apdItem) {
    console.error('APD workflow item not found in inventory!')
    process.exit(1)
  }

  console.log(`APD Workflow: "${apdItem.name}"`)
  console.log(`  Source: ${apdItem.sourceType}`)
  console.log(`  Duplicate/Active count: ${apdItem.duplicateActiveCount}`)
  console.log(`  Site Approvals count: ${apdItem.siteApprovals?.length ?? 0}`)

  const approvals = apdItem.siteApprovals ?? []
  const withSection = approvals.filter((a) => a.sectionId != null)
  console.log(`  Site Approvals with explicit sectionId: ${withSection.length} / ${approvals.length}`)

  // Sample inspection
  console.log('\nSample matrices:')
  for (const a of approvals.slice(0, 8)) {
    console.log(`  Site ID ${a.siteId}, Section ID ${a.sectionId}, Custom Roles:`, a.customRoles)
  }

  process.exit(0)
}

main().catch(console.error)
