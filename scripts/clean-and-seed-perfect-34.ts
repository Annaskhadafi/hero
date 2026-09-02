import { db } from '../db'
import { fiveRMasterAreas } from '../db/schema/five-r'
import { approvalMatrices, approvalMatrixSteps, orgChartNodes, orgChartStructures, employees, sites } from '../db/schema/hero'
import { eq, sql, desc, inArray } from 'drizzle-orm'

function resolveApproverForArea(area: { id: number; name: string; siteId: number | null }): { empId: number; name: string; role: string } {
  const n = (area.name || '').toLowerCase()
  const siteId = area.siteId ? area.siteId.toString() : ''

  // 1. Balikpapan Hub (Site 126)
  if (n.includes('balikpapan') || siteId === '126') {
    if (n.includes('repair') || n.includes('retread') || n.includes('accessories')) {
      return { empId: 996, name: 'Ary Maulana', role: 'SPV Repair & Retread Operation' }
    }
    if (n.includes('service')) {
      return { empId: 955, name: 'Apriyanto', role: 'Head of Service MVC' }
    }
    if (n.includes('supply chain') || n.includes('warehouse')) {
      return { empId: 946, name: 'Karmiyanto', role: 'Leader Supply Chain' }
    }
    if (n.includes('office') || n.includes('facility') || n.includes('admin')) {
      return { empId: 970, name: 'Muhammad Iqbal', role: 'HR-GA Supervisor' }
    }
    if (n.includes('safety') || n.includes('hse')) {
      return { empId: 1375, name: 'Ade Saharu', role: 'HSE Officer' }
    }
    return { empId: 970, name: 'Muhammad Iqbal', role: 'HR-GA Supervisor' }
  }

  // 2. Jakarta & Pupar (Site 125)
  if (n.includes('jakarta') || n.includes('pupar') || siteId === '125') {
    if (n.includes('service')) {
      return { empId: 15, name: 'Junaidi', role: 'Serviceman Leader' }
    }
    if (n.includes('supply chain') || n.includes('warehouse')) {
      return { empId: 946, name: 'Karmiyanto', role: 'Leader Supply Chain' }
    }
    return { empId: 966, name: 'Rendra Rachman', role: 'Human Capital Manager' }
  }

  // 3. Sumatera (Palembang & Pekanbaru)
  if (n.includes('palembang') || n.includes('pekanbaru') || siteId === '134' || siteId === '136') {
    return { empId: 96, name: 'Febrial Hariri', role: 'Leader Technical Sumatera' }
  }

  // 4. Berau
  if (n.includes('berau') || siteId === '146' || siteId === '137') {
    return { empId: 255, name: 'Muhammad Refaldi', role: 'PJO Berau' }
  }

  // 5. Sangatta
  if (n.includes('sangatta') || siteId === '127') {
    return { empId: 1164, name: 'Saipudin', role: 'HSE Leader / PJO Sangatta' }
  }

  // 6. CK MHU
  if (n.includes('mhu') || siteId === '128') {
    return { empId: 1308, name: 'Irfan Rivai Remba', role: 'HSE / PJO CK MHU' }
  }

  // 7. CK BMB (Sitarum)
  if (n.includes('bmb') || siteId === '131') {
    return { empId: 1285, name: 'Danny Hangga Irawan', role: 'HSE / PJO CK BMB' }
  }

  // 8. CK BIB
  if (n.includes('bib') || siteId === '133') {
    return { empId: 1374, name: 'Fathurrahman Sufi', role: 'HSE Officer / PJO BIB' }
  }

  // 9. AMM MIFA
  if (n.includes('mifa') || siteId === '138') {
    return { empId: 454, name: 'Adit Prasetyo', role: 'PJO AMM MIFA' }
  }

  // 10. Sorowako Vale
  if (n.includes('sorowako') || n.includes('vale') || siteId === '140') {
    return { empId: 1307, name: 'Muhammad Wahyu Ichsan', role: 'HSE / PJO Sorowako' }
  }

  // 11. Timika – Revy (Technical Engineering / Site Support)
  if (n.includes('timika') || n.includes('revy')) {
    return { empId: 1094, name: 'Muhammad Abian Husain', role: 'Technical Leader' }
  }

  // 12. BUMA Tanjung & Sub-sites (Tabuhan, Jambi KIM)
  if (n.includes('tanjung') || n.includes('tommy') || n.includes('tabuhan') || n.includes('jambi') || siteId === '210' || siteId === '130') {
    if (n.includes('tommy')) {
      return { empId: 97, name: 'Tommy Indra Aldiny Rambe', role: 'Technical Leader' }
    }
    return { empId: 1212, name: 'Dowy Pratama Sita', role: 'PJO BUMA Tanjung' }
  }

  // 12. AMM Tabang
  if (siteId === '144' || n.includes('tabang')) {
    return { empId: 1057, name: 'Singgih Wiyono', role: 'PJO AMM Tabang' }
  }

  // 13. Makassar & Sebamban
  if (n.includes('makassar') || n.includes('sebamban') || siteId === '139' || siteId === '132') {
    return { empId: 955, name: 'Apriyanto', role: 'Head of Service MVC' }
  }

  return { empId: 955, name: 'Apriyanto', role: 'Head of Service MVC' }
}

async function main() {
  console.log('--- CLEANING ALL OLD 5R MATRICES ---')
  await db.execute(sql`
    DELETE FROM hero_approval_matrix_steps 
    WHERE matrix_id IN (
      SELECT id FROM hero_approval_matrices 
      WHERE transaction_type IN ('five_r_report', 'five-r-report', 'quality-report-5r')
         OR name ILIKE '%Audit 5R%'
    )
  `)
  await db.execute(sql`
    DELETE FROM hero_approval_matrices 
    WHERE transaction_type IN ('five_r_report', 'five-r-report', 'quality-report-5r')
       OR name ILIKE '%Audit 5R%'
  `)

  console.log('Deleted all old 5R matrices.')

  let [activeStructure] = await db
    .select({ id: orgChartStructures.id })
    .from(orgChartStructures)
    .where(eq(orgChartStructures.scopeValue, 'five-r-report'))
    .orderBy(desc(orgChartStructures.id))
    .limit(1)

  if (!activeStructure) {
    const [st] = await db
      .insert(orgChartStructures)
      .values({
        name: 'Struktur Approval Laporan 5R',
        structureType: 'approval_flow',
        scopeType: 'process',
        scopeValue: 'five-r-report',
        version: 1,
        isActive: true,
      })
      .returning()
    activeStructure = st
  }

  const structureId = activeStructure.id

  async function getNode(employeeId: number, roleName: string) {
    const [existing] = await db
      .select({ id: orgChartNodes.id })
      .from(orgChartNodes)
      .where(
        sql`${orgChartNodes.structureId} = ${structureId} AND ${orgChartNodes.employeeId} = ${employeeId}`
      )
      .limit(1)

    if (existing) return existing.id

    const [emp] = await db
      .select({ name: employees.name })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1)

    const [newNode] = await db
      .insert(orgChartNodes)
      .values({
        structureId,
        employeeId,
        nodeCode: `5R-${employeeId}`,
        nodeType: 'employee',
        approvalRole: roleName,
        canApprove: true,
        canDelegate: true,
        slaHours: 24,
        label: `${roleName} - ${emp?.name ?? 'Employee'}`,
        sortOrder: 1,
        isActive: true,
      })
      .returning()

    return newNode.id
  }

  const cpiNode = await getNode(944, 'Head of CPI Approval')

  const areas = await db
    .select({
      id: fiveRMasterAreas.id,
      name: fiveRMasterAreas.name,
      siteId: fiveRMasterAreas.siteId,
    })
    .from(fiveRMasterAreas)
    .orderBy(fiveRMasterAreas.id)

  console.log(`Seeding exact 2-step approval for ${areas.length} Master Areas...`)

  for (const area of areas) {
    const approver = resolveApproverForArea(area)
    const step1Node = await getNode(approver.empId, approver.role)

    const [matrix] = await db
      .insert(approvalMatrices)
      .values({
        name: `Laporan Audit 5R - ${area.name}`,
        transactionType: 'five_r_report',
        activityType: '',
        structureId,
        siteId: area.siteId,
        sectionId: null,
        description: `Matrix approval otomatis untuk Master Area ${area.name} (Area ID: ${area.id})`,
        isActive: true,
        priority: 'high',
      })
      .returning()

    // Step 1: PJO / Atasan Langsung
    await db.insert(approvalMatrixSteps).values({
      matrixId: matrix.id,
      stepOrder: 1,
      label: 'PJO Site / Atasan Langsung',
      nodeId: step1Node,
      slaHours: 48,
    })

    // Step 2: Head of CPI Approval
    await db.insert(approvalMatrixSteps).values({
      matrixId: matrix.id,
      stepOrder: 2,
      label: 'Head of CPI Approval',
      nodeId: cpiNode,
      slaHours: 24,
    })

    console.log(`✅ [Area ${area.id}] ${area.name} -> Step 1: ${approver.name} (${approver.role})`)
  }

  console.log('\n🎉 ALL 34 MATRICES SEEDED CLEANLY!')
}

main().then(() => process.exit(0)).catch(console.error)
