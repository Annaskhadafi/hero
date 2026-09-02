import { db } from '../db'
import { fiveRMasterAreas } from '../db/schema/five-r'
import { approvalMatrices, approvalMatrixSteps, orgChartNodes, orgChartStructures, sites, employees } from '../db/schema/hero'
import { eq, inArray, desc } from 'drizzle-orm'

function resolveFiveRAreaApprover(area: { id: number; name: string; siteId: number | null }): number {
  const name = (area.name || '').toLowerCase()
  const siteId = area.siteId ? area.siteId.toString() : ''

  if (name.includes('balikpapan') || siteId === '126') {
    if (name.includes('repair') || name.includes('retread') || name.includes('accessories')) {
      return 996 // Ary Maulana (SPV Repair & Retread Operation)
    }
    if (name.includes('service')) {
      return 955 // Apriyanto (Head of Service MVC)
    }
    if (name.includes('supply chain') || name.includes('warehouse')) {
      return 946 // Karmiyanto (Leader Supply Chain)
    }
    if (name.includes('office') || name.includes('facility') || name.includes('admin')) {
      return 970 // Muhammad Iqbal (HR-GA Supervisor)
    }
    if (name.includes('safety') || name.includes('hse')) {
      return 1375 // Ade Saharu (HSE Officer)
    }
    return 970 // Muhammad Iqbal (HR-GA Supervisor)
  }

  if (name.includes('jakarta') || name.includes('pupar') || siteId === '125') {
    if (name.includes('service')) {
      return 15 // Junaidi (Serviceman Leader)
    }
    if (name.includes('supply chain') || name.includes('warehouse')) {
      return 946 // Karmiyanto (Leader Supply Chain)
    }
    return 966 // Rendra Rachman (Human Capital Manager - Head Office)
  }

  if (name.includes('palembang') || name.includes('pekanbaru') || siteId === '134' || siteId === '136') {
    return 96 // Febrial Hariri (Leader Technical Sumatera)
  }

  if (name.includes('berau') || siteId === '146' || siteId === '137') {
    return 255 // Muhammad Refaldi (PJO Berau)
  }

  if (name.includes('sangatta') || siteId === '127') {
    return 1164 // Saipudin (HSE Leader / PJO)
  }

  if (name.includes('mhu') || siteId === '128') {
    return 1308 // Irfan Rivai Remba (HSE / PJO)
  }

  if (name.includes('bmb') || siteId === '131') {
    return 1285 // Danny Hangga Irawan (HSE / PJO)
  }

  if (name.includes('bib') || siteId === '133') {
    return 1374 // Fathurrahman Sufi (HSE Officer / PJO)
  }

  if (name.includes('mifa') || siteId === '138') {
    return 454 // Adit Prasetyo (PJO)
  }

  if (name.includes('sorowako') || name.includes('vale') || siteId === '140') {
    return 1307 // Muhammad Wahyu Ichsan (HSE / PJO)
  }

  if (name.includes('tommy') || name.includes('tanjung') || siteId === '210' || siteId === '130') {
    if (name.includes('tommy')) return 97 // Tommy Indra Aldiny Rambe
    return 1212 // Dowy Pratama Sita (PJO)
  }

  if (siteId === '144') {
    return 1057 // Singgih Wiyono (PJO Tabang)
  }

  return 955 // Default fallback
}

async function main() {
  console.log('--- RE-SEEDING 34 5R MATRICES BASED ON MASTER AREA & AREA LEADERS ---')

  const [activeStructure] = await db
    .select({ id: orgChartStructures.id })
    .from(orgChartStructures)
    .where(eq(orgChartStructures.scopeValue, 'five-r-report'))
    .orderBy(desc(orgChartStructures.id))
    .limit(1)

  const structureId = activeStructure?.id ?? 96

  const existingMatrices = await db
    .select({ id: approvalMatrices.id })
    .from(approvalMatrices)
    .where(
      inArray(approvalMatrices.transactionType, [
        'five_r_report',
        'five-r-report',
        'quality-report-5r',
      ])
    )

  if (existingMatrices.length > 0) {
    const ids = existingMatrices.map((m) => m.id)
    await db.delete(approvalMatrixSteps).where(inArray(approvalMatrixSteps.matrixId, ids))
    await db.delete(approvalMatrices).where(inArray(approvalMatrices.id, ids))
    console.log(`Deleted ${existingMatrices.length} old 5R matrices.`)
  }

  const areas = await db
    .select({
      id: fiveRMasterAreas.id,
      name: fiveRMasterAreas.name,
      siteId: fiveRMasterAreas.siteId,
    })
    .from(fiveRMasterAreas)
    .where(eq(fiveRMasterAreas.isActive, true))

  async function getNode(employeeId: number) {
    const [existing] = await db
      .select({ id: orgChartNodes.id })
      .from(orgChartNodes)
      .where(eq(orgChartNodes.employeeId, employeeId))
      .limit(1)

    if (existing) return existing.id

    const [emp] = await db.select({ name: employees.name }).from(employees).where(eq(employees.id, employeeId)).limit(1)

    const [created] = await db
      .insert(orgChartNodes)
      .values({
        structureId,
        employeeId,
        label: emp?.name || 'Approver Node',
        title: 'Approver Node',
        department: 'Operations',
      })
      .returning()

    return created.id
  }

  const riaNode = await getNode(1181)
  const cpiNode = await getNode(944)

  for (const area of areas) {
    const step2EmpId = resolveFiveRAreaApprover(area)
    const step2Node = await getNode(step2EmpId)

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

    // Step 1: PJO / Pembina Area / Atasan Langsung
    await db.insert(approvalMatrixSteps).values({
      matrixId: matrix.id,
      stepOrder: 1,
      label: 'PJO Site / Atasan Langsung',
      nodeId: step2Node,
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

    console.log(`✅ Seeded matrix for "${area.name}" -> Step 2 Approver ID: ${step2EmpId}`)
  }

  console.log(`\n🎉 All ${areas.length} Master Areas successfully seeded with exact PJO & Atasan Langsung!`)
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
