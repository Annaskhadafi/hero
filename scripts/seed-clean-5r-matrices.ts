import { db } from '../db'
import { approvalMatrices, approvalMatrixSteps, sites, employees, orgChartNodes } from '../db/schema/hero'
import { fiveRMasterAreas } from '../db/schema/five-r'
import { eq, sql, inArray } from 'drizzle-orm'

async function main() {
  console.log('1. Cleaning up bloated 5R matrices...')
  await db.execute(sql`
    DELETE FROM hero_approval_matrix_steps 
    WHERE matrix_id IN (
      SELECT id FROM hero_approval_matrices 
      WHERE transaction_type IN ('five_r_report', 'five-r-report', 'quality-report-5r')
    );
  `)
  await db.execute(sql`
    DELETE FROM hero_approval_matrices 
    WHERE transaction_type IN ('five_r_report', 'five-r-report', 'quality-report-5r');
  `)
  console.log('✅ Cleaned up old matrices.')

  // Fetch employees for Step 1 & Step 3
  const [ria] = await db.select().from(employees).where(eq(employees.id, 1181)).limit(1)
  const [bardinia] = await db.select().from(employees).where(eq(employees.id, 944)).limit(1)

  console.log(`Step 1 Approver: ${ria?.name || 'Ria Annisa Putri'} (ID: 1181)`)
  console.log(`Step 3 Approver: ${bardinia?.name || 'Bardinia Susi Ekawaty'} (ID: 944)`)

  // Fetch all active sites
  const activeSites = await db
    .select({
      siteId: sites.id,
      siteName: sites.name,
      headEmployeeId: sites.headEmployeeId,
      headName: employees.name,
      headJobTitle: employees.jobTitle,
    })
    .from(sites)
    .leftJoin(employees, eq(sites.headEmployeeId, employees.id))
    .where(eq(sites.isActive, true))
    .orderBy(sites.name)

  console.log(`\n2. Seeding ${activeSites.length} site-specific 5R matrices...`)

  for (const s of activeSites) {
    // Determine Step 2 approver for this site
    let step2EmpId: number = s.headEmployeeId || 955 // Fallback to Apriyanto if site has no head
    let step2Label = s.headName ? `PJO Site (${s.headName})` : 'PJO Site / Atasan Langsung'

    // Create Matrix
    const [matrix] = await db
      .insert(approvalMatrices)
      .values({
        name: `Laporan Audit 5R - ${s.siteName}`,
        transactionType: 'five_r_report',
        siteId: s.siteId,
        isActive: true,
      })
      .returning()

    // Step 1: Ria Annisa Putri
    await db.insert(approvalMatrixSteps).values({
      matrixId: matrix.id,
      stepOrder: 1,
      label: 'Quality Management Verifier',
      role: 'Quality Verifier',
      conditionType: 'always',
      slaHours: 24,
      nodeId: null,
    })

    // Step 2: PJO Site
    await db.insert(approvalMatrixSteps).values({
      matrixId: matrix.id,
      stepOrder: 2,
      label: step2Label,
      role: 'PJO Site / Atasan Langsung',
      conditionType: 'always',
      slaHours: 48,
      nodeId: null,
    })

    // Step 3: Bardinia Susi Ekawaty
    await db.insert(approvalMatrixSteps).values({
      matrixId: matrix.id,
      stepOrder: 3,
      label: 'Head of CPI Approval',
      role: 'Head of CPI',
      conditionType: 'always',
      slaHours: 48,
      nodeId: null,
    })

    console.log(`  ✓ Matrix created for [${s.siteName}] (ID: ${matrix.id}) -> Step 2: ${s.headName || 'Apriyanto (Fallback)'}`)
  }

  // 3. Create 1 Global Fallback Matrix (siteId: null)
  const [globalMatrix] = await db
    .insert(approvalMatrices)
    .values({
      name: 'Laporan Audit 5R (Global / Default)',
      transactionType: 'five_r_report',
      siteId: null,
      isActive: true,
    })
    .returning()

  await db.insert(approvalMatrixSteps).values([
    {
      matrixId: globalMatrix.id,
      stepOrder: 1,
      label: 'Quality Management Verifier',
      role: 'Quality Verifier',
      conditionType: 'always',
      slaHours: 24,
      nodeId: null,
    },
    {
      matrixId: globalMatrix.id,
      stepOrder: 2,
      label: 'PJO Site / Atasan Langsung',
      role: 'PJO Site / Atasan Langsung',
      conditionType: 'always',
      slaHours: 48,
      nodeId: null,
    },
    {
      matrixId: globalMatrix.id,
      stepOrder: 3,
      label: 'Head of CPI Approval',
      role: 'Head of CPI',
      conditionType: 'always',
      slaHours: 48,
      nodeId: null,
    },
  ])

  console.log(`  ✓ Global Fallback Matrix created (ID: ${globalMatrix.id})`)
  console.log('\n🎉 ALL 5R MATRICES SEEDED SUCCESSFULLY & CLEANLY!')
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
