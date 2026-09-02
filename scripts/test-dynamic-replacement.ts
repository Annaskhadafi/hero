import { resolveApprovalRouteForActivity } from '@/lib/approval-engine'
import { approvalMatrices, approvalMatrixSteps, orgChartNodes, employees } from '@/db/schema/hero'
import { db } from '@/db'
import { eq, and } from 'drizzle-orm'

async function main() {
  console.log('=== TEST DYNAMIC WORKFLOW BUILDER PERSON REPLACEMENT ===\n')

  // Find the matrix for Balikpapan Repair / Retread
  const [matrix] = await db
    .select()
    .from(approvalMatrices)
    .where(
      and(
        eq(approvalMatrices.siteId, 126),
        eq(approvalMatrices.sectionId, 29),
        eq(approvalMatrices.transactionType, 'apd-request')
      )
    )
    .limit(1)

  console.log(`Found Matrix [${matrix.id}] "${matrix.name}"`)

  const [step] = await db
    .select()
    .from(approvalMatrixSteps)
    .where(eq(approvalMatrixSteps.matrixId, matrix.id))
    .limit(1)

  const originalNodeId = step.nodeId!
  const [origNode] = await db.select().from(orgChartNodes).where(eq(orgChartNodes.id, originalNodeId)).limit(1)
  console.log(`Original Approver: Node ${origNode.id}, EmpId: ${origNode.employeeId}`)

  // 1. Resolve before change
  const beforeRoute = await resolveApprovalRouteForActivity({
    employeeId: 996, // Ary Maulana
    siteId: 126,
    sectionId: 29,
    activityType: 'apd-request',
    transactionType: 'apd-request-apd',
    priority: 'any',
    overtimeMinutes: 0,
  })
  console.log(`Before Change: Approver = "${beforeRoute.steps[0]?.approverName}", Job = "${beforeRoute.steps[0]?.label}"`)

  // 2. Change person in Workflow Builder (e.g. change to Indra Prasetia Siregar, ID: 1184)
  console.log('\n--> Simulating admin changing approver to Indra Prasetia Siregar (ID: 1184) in Workflow Builder...')
  await db
    .update(orgChartNodes)
    .set({ employeeId: 1184, approvalRole: 'Repairman', updatedAt: new Date() })
    .where(eq(orgChartNodes.id, originalNodeId))

  // 3. Resolve after change
  const afterRoute = await resolveApprovalRouteForActivity({
    employeeId: 996,
    siteId: 126,
    sectionId: 29,
    activityType: 'apd-request',
    transactionType: 'apd-request-apd',
    priority: 'any',
    overtimeMinutes: 0,
  })
  console.log(`After Change:  Approver = "${afterRoute.steps[0]?.approverName}", Job = "${afterRoute.steps[0]?.label}"`)

  // 4. Restore original approver (Arjun Zahiri, ID: 1039)
  console.log('\n--> Restoring original approver (Arjun Zahiri, ID: 1039)...')
  await db
    .update(orgChartNodes)
    .set({ employeeId: 1039, approvalRole: 'Repairman', updatedAt: new Date() })
    .where(eq(orgChartNodes.id, originalNodeId))

  const restoredRoute = await resolveApprovalRouteForActivity({
    employeeId: 996,
    siteId: 126,
    sectionId: 29,
    activityType: 'apd-request',
    transactionType: 'apd-request-apd',
    priority: 'any',
    overtimeMinutes: 0,
  })
  console.log(`Restored:      Approver = "${restoredRoute.steps[0]?.approverName}", Job = "${restoredRoute.steps[0]?.label}"`)

  process.exit(0)
}

main().catch(console.error)
