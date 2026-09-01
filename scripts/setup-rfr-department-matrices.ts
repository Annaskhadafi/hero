import { db } from '@/db'
import {
  approvalMatrices,
  approvalMatrixSteps,
  orgChartNodes,
  orgChartStructures,
  employees,
  masterDepartments,
} from '@/db/schema/hero'
import { eq, and, asc, ilike } from 'drizzle-orm'
import { randomUUID } from 'crypto'

async function main() {
  console.log('=== Setup RFR Department Matrices ===\n')

  // 1. Find the named approvers
  const allEmployees = await db
    .select({ id: employees.id, name: employees.name, email: employees.email })
    .from(employees)
    .where(eq(employees.isActive, true))

  function findEmployee(namePart: string) {
    return allEmployees.find(
      (e) => e.name.toLowerCase().includes(namePart.toLowerCase())
    )
  }

  const hrRecruitment = findEmployee('Adila Tri Arizona') ?? findEmployee('Adilla Tri Arizona')
  const leaderHR = findEmployee('Kesuma Bagas') ?? findEmployee('Kesuma Bagaskara')
  const hrSpv = findEmployee('Iqbal') ?? findEmployee('Muhammad Iqbal')
  const gm = findEmployee('Person Sihaloho')

  console.log('Approvers found:')
  console.log('  HR Recruitment Staff:', hrRecruitment?.id, hrRecruitment?.name)
  console.log('  Leader HR-GA:', leaderHR?.id, leaderHR?.name)
  console.log('  Human Capital Spv:', hrSpv?.id, hrSpv?.name)
  console.log('  General Manager:', gm?.id, gm?.name)

  if (!hrRecruitment || !leaderHR || !hrSpv || !gm) {
    console.error('ERROR: Some approvers not found! Aborting.')
    process.exit(1)
  }

  // 2. Get all active departments
  const departments = await db
    .select({
      id: masterDepartments.id,
      name: masterDepartments.name,
      headEmployeeId: masterDepartments.headEmployeeId,
    })
    .from(masterDepartments)
    .where(eq(masterDepartments.isActive, true))

  console.log(`\nDepartments found: ${departments.length}`)
  for (const dept of departments) {
    console.log(`  - ${dept.name} (ID: ${dept.id}, Head: ${dept.headEmployeeId ?? 'N/A'})`)
  }

  // 3. Delete existing RFR matrices (all of them, we'll recreate)
  const existingMatrices = await db
    .select({ id: approvalMatrices.id })
    .from(approvalMatrices)
    .where(eq(approvalMatrices.transactionType, 'rfr_approval'))

  for (const m of existingMatrices) {
    await db.delete(approvalMatrixSteps).where(eq(approvalMatrixSteps.matrixId, m.id))
  }
  await db
    .delete(approvalMatrices)
    .where(eq(approvalMatrices.transactionType, 'rfr_approval'))

  console.log(`\nDeleted ${existingMatrices.length} existing RFR matrices`)

  // 4. Create matrix for each department
  const now = new Date()

  // Approval steps template (excluding requestor step - that's auto-approved at submit time)
  const stepTemplate = [
    { stepOrder: 1, label: 'HC Verification (HR Recruitment Staff)', approverId: hrRecruitment.id },
    { stepOrder: 2, label: 'Leader HR-GA', approverId: leaderHR.id },
    { stepOrder: 3, label: 'Human Capital Spv', approverId: hrSpv.id },
  ]

  let createdCount = 0

  for (const dept of departments) {
    // Get department head for Manager Departemen step
    let deptHeadId = dept.headEmployeeId

    // If no head configured in masterDepartments, try to find from employees
    if (!deptHeadId) {
      const headResult = await db
        .select({ id: employees.id })
        .from(employees)
        .where(
          and(
            eq(employees.isActive, true),
            ilike(employees.department, `%${dept.name}%`),
            ilike(employees.jobTitle, '%manager%')
          )
        )
        .limit(1)
      deptHeadId = headResult[0]?.id ?? null
    }

    const matrixName = `RFR - ${dept.name}`

    // Create matrix
    const [matrix] = await db
      .insert(approvalMatrices)
      .values({
        name: matrixName,
        transactionType: 'rfr_approval',
        departmentId: dept.id,
        activityType: '',
        priority: 'any',
        description: `Approval workflow RFR untuk departemen ${dept.name}`,
        effectiveFrom: now,
        isActive: true,
        updatedAt: now,
      })
      .returning({ id: approvalMatrices.id })

    if (!matrix) {
      console.error(`  Failed to create matrix for ${dept.name}`)
      continue
    }

    // Create org chart structure for this matrix
    const [structure] = await db
      .insert(orgChartStructures)
      .values({
        name: `Workflow Studio - ${matrixName}`,
        scopeType: 'workflow',
        scopeValue: 'rfr-approval',
        description: `Approval workflow RFR untuk ${dept.name}`,
        isDefault: false,
        isActive: true,
        effectiveFrom: now,
        updatedAt: now,
      })
      .returning({ id: orgChartStructures.id })

    // Create steps
    const allSteps = [
      ...stepTemplate,
      // Manager Departemen (dynamic per department)
      { stepOrder: 4, label: 'Manager Departemen', approverId: deptHeadId ?? 0 },
      // GM is always the same
      { stepOrder: 5, label: 'General Manager', approverId: gm.id },
    ]

    for (const step of allSteps) {
      // Create org chart node for this step
      const [node] = await db
        .insert(orgChartNodes)
        .values({
          structureId: structure!.id,
          label: step.label,
          nodeCode: `RFR-${dept.id}-Step${step.stepOrder}`,
          employeeId: step.approverId || null,
          canApprove: true,
          canDelegate: true,
          sortOrder: step.stepOrder,
          isActive: true,
          updatedAt: now,
        })
        .returning({ id: orgChartNodes.id })

      if (node) {
        await db.insert(approvalMatrixSteps).values({
          matrixId: matrix.id,
          stepOrder: step.stepOrder,
          label: step.label,
          nodeId: node.id,
          approvalMode: 'sequential',
          slaHours: 24,
          canDelegate: true,
          isRequired: true,
          updatedAt: now,
        })
      }
    }

    const headName = deptHeadId
      ? allEmployees.find((e) => e.id === deptHeadId)?.name ?? `ID:${deptHeadId}`
      : 'N/A'

    console.log(
      `  ✅ ${dept.name}: HC=${hrRecruitment.name}, Leader=${leaderHR.name}, SPV=${hrSpv.name}, Mgr=${headName}, GM=${gm.name}`
    )
    createdCount++
  }

  console.log(`\n=== Done! Created ${createdCount} RFR matrices ===`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
