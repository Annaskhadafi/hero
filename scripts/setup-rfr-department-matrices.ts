import { db } from '@/db'
import {
  approvalMatrices,
  approvalMatrixSteps,
  orgChartNodes,
  orgChartStructures,
  employees,
  masterDepartments,
} from '@/db/schema/hero'
import { eq, and, ilike } from 'drizzle-orm'

async function main() {
  console.log('=== Setup RFR Department Matrices ===\n')

  // 1. Find the named approvers
  const allEmployees = await db
    .select({ id: employees.id, name: employees.name, email: employees.email, jobTitle: employees.jobTitle, department: employees.department })
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

  // 3. Delete existing RFR matrices
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

  console.log(`Deleted ${existingMatrices.length} existing RFR matrices`)

  // 4. Create matrix for each department
  const now = new Date()

  const stepTemplate = [
    { stepOrder: 1, label: 'HC Verification', approverId: hrRecruitment.id },
    { stepOrder: 2, label: 'Leader HR-GA', approverId: leaderHR.id },
    { stepOrder: 3, label: 'Human Capital Spv', approverId: hrSpv.id },
  ]

  let createdCount = 0

  for (const dept of departments) {
    let deptHeadId = dept.headEmployeeId

    // Intelligent fallback resolution per department
    if (!deptHeadId) {
      const deptUpper = dept.name.toUpperCase()
      if (deptUpper.includes('FINANCE') || deptUpper.includes('BI & MARKETING')) {
        deptHeadId = findEmployee('Febrian Dani')?.id ?? null
      } else if (deptUpper.includes('OPERATION') || deptUpper.includes('SALES')) {
        deptHeadId = findEmployee('Yean Alan Fabian')?.id ?? null
      } else if (deptUpper.includes('TECHNICAL') || deptUpper.includes('CENTRAL')) {
        deptHeadId = findEmployee('Romy Hidayat')?.id ?? null
      } else if (deptUpper.includes('QHSE') || deptUpper.includes('CPI')) {
        deptHeadId = findEmployee('Bardinia Susi')?.id ?? null
      } else if (deptUpper.includes('HUMAN CAPITAL')) {
        deptHeadId = findEmployee('Rendra Rachman')?.id ?? null
      } else if (deptUpper.includes('LEGAL')) {
        deptHeadId = findEmployee('Paulus Stupa')?.id ?? null
      } else if (deptUpper.includes('SUPPLY CHAIN')) {
        deptHeadId = findEmployee('Bekti Widyasmoro')?.id ?? null
      } else if (deptUpper.includes('SUPPORT FACILITIES')) {
        deptHeadId = findEmployee('Susanto')?.id ?? null
      } else if (deptUpper.includes('OFFICE STRATEGIC')) {
        deptHeadId = findEmployee('Asep Firdaus')?.id ?? null
      } else if (deptUpper.includes('BOD') || deptUpper.includes('EXECUTIVE')) {
        deptHeadId = findEmployee('Hidayat Rahman')?.id ?? null
      } else if (deptUpper.includes('GENERAL MANAGER')) {
        deptHeadId = gm.id
      }
    }

    // Default to Romy Hidayat if still unassigned
    if (!deptHeadId) {
      deptHeadId = findEmployee('Romy Hidayat')?.id ?? null
    }

    const matrixName = `RFR - ${dept.name}`

    // Create matrix in approvalMatrices
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

    // Create org chart structure for Workflow Studio
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

    // Build all steps
    const allSteps = [
      ...stepTemplate,
      { stepOrder: 4, label: 'Manager Departemen', approverId: deptHeadId ?? 0 },
      { stepOrder: 5, label: 'General Manager', approverId: gm.id },
    ]

    for (const step of allSteps) {
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

  console.log(`\n=== Done! Successfully synced ${createdCount} RFR matrices in Approval Workflow Builder ===`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
