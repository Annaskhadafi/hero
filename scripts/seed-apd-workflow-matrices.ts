import { db } from '@/db'
import {
  approvalMatrices,
  approvalMatrixSteps,
  orgChartStructures,
  orgChartNodes,
  employees,
  sites,
} from '@/db/schema/hero'
import { eq, and, or, inArray } from 'drizzle-orm'

async function main() {
  console.log('=== SEEDING APD WORKFLOW MATRICES WITH EXPLICIT SECTIONS (124 MATRICES) ===\n')

  // 1. Ensure Structure "Struktur Approval Request APD" exists
  const existingStructures = await db
    .select()
    .from(orgChartStructures)
    .where(eq(orgChartStructures.name, 'Struktur Approval Request APD'))
    .limit(1)

  let structure = existingStructures[0]
  if (!structure) {
    const [newStructure] = await db
      .insert(orgChartStructures)
      .values({
        name: 'Struktur Approval Request APD',
        description: 'Struktur hierarki approval untuk formulir Permintaan APD (PJO, HSE, Admin CP per Section)',
        effectiveFrom: new Date('2026-01-01'),
        isActive: true,
      })
      .returning()
    structure = newStructure
    console.log(`Created new structure ID: ${structure.id}`)
  } else {
    console.log(`Using existing structure ID: ${structure.id}`)
  }

  // 2. Approver DB Lookups
  const allEmployees = await db.select().from(employees).where(eq(employees.isActive, true))
  const empMap = new Map(allEmployees.map((e) => [e.id, e]))

  function getEmp(id: number) {
    const e = empMap.get(id)
    if (!e) throw new Error(`Employee ID ${id} not found in database!`)
    return e
  }

  // Admin CP Approvers:
  const asar = getEmp(1099)   // Muhammad As'ar Fauzan (Serviceman)
  const arjun = getEmp(1039)  // Arjun Zahiri Mursith (Repairman)
  const abian = getEmp(1094)  // Muhammad Abian Husain (Technical Engineer)

  // 13 Admin CP Sites:
  const adminCpSiteIds = [126, 142, 135, 132, 213, 212, 141, 148, 143, 147, 211, 146, 137]

  // 5 HSE Sites & Approvers:
  const hseConfigs = [
    { siteId: 133, empId: 1374 }, // CK BIB -> Fathurrahman Sufi (HSE Officer)
    { siteId: 131, empId: 1285 }, // CK BMB -> Danny Hangga Irawan (HSE Officer)
    { siteId: 129, empId: 1380 }, // CK KIM -> Rizky Rahmadani (HSE Officer)
    { siteId: 128, empId: 1308 }, // CK MHU -> Irfan Rivai Remba (HSE)
    { siteId: 140, empId: 1307 }, // Vale -> Muhammad Wahyu Ichsan (HSE Officer)
  ]

  // 13 PJO Sites & Approvers:
  const pjoConfigs = [
    { siteId: 138, empId: 454 },  // AMM Mifa Holing -> Adit Prasetyo (Technical Engineer)
    { siteId: 144, empId: 1057 }, // AMM Tabang -> Singgih Wiyono (Technical Engineer)
    { siteId: 210, empId: 1212 }, // BUMA Tanjung -> Dowy Pratama Sita (Technical Engineer)
    { siteId: 150, empId: 1250 }, // CDE - Bengkulu -> Rakha Dwi Saputra (Repairman)
    { siteId: 145, empId: 1189 }, // CK MIFA -> Fachri Husein (Serviceman)
    { siteId: 125, empId: 1375 }, // Jakarta -> Ade Saharu (HSE Officer)
    { siteId: 151, empId: 955 },  // Makassar -> Apriyanto (Head of Service MVC)
    { siteId: 134, empId: 96 },   // Palembang -> Febrial Hariri (Leader Technical Sumatera)
    { siteId: 136, empId: 96 },   // Pekanbaru -> Febrial Hariri (Leader Technical Sumatera)
    { siteId: 149, empId: 1180 }, // PPA BIB -> Muchamat Nurkolis Majid (Technical Engineer)
    { siteId: 127, empId: 1164 }, // Sangatta -> Saipudin (HSE Leader)
    { siteId: 139, empId: 955 },  // Sebamban -> Apriyanto (Head of Service MVC)
    { siteId: 130, empId: 97 },   // Tj. Adaro -> Tommy Indra Aldiny Rambe (Technical Leader)
  ]

  // Fetch site names
  const allSites = await db.select().from(sites)
  const siteMap = new Map(allSites.map((s) => [s.id, s.name]))

  // Clean old apd-request matrices to ensure fresh setup
  console.log('Cleaning existing APD request matrices...')
  const existingApdMatrices = await db
    .select({ id: approvalMatrices.id })
    .from(approvalMatrices)
    .where(
      or(
        eq(approvalMatrices.transactionType, 'apd-request'),
        eq(approvalMatrices.transactionType, 'apd-request-apd')
      )
    )

  if (existingApdMatrices.length > 0) {
    const ids = existingApdMatrices.map((m) => m.id)
    await db.delete(approvalMatrixSteps).where(inArray(approvalMatrixSteps.matrixId, ids))
    await db.delete(approvalMatrices).where(inArray(approvalMatrices.id, ids))
    console.log(`Deleted ${ids.length} old APD matrices.`)
  }

  const now = new Date()
  let createdCount = 0

  async function createMatrixAndStep(params: {
    name: string
    siteId: number
    sectionId: number
    approver: typeof asar
  }) {
    const { name, siteId, sectionId, approver } = params
    const [matrix] = await db
      .insert(approvalMatrices)
      .values({
        name,
        structureId: structure.id,
        transactionType: 'apd-request-apd',
        siteId,
        departmentId: 2, // Central Services
        sectionId,
        activityType: '',
        priority: 'any',
        description: `Approval matrix Request APD untuk ${name}`,
        effectiveFrom: new Date('2026-01-01'),
        isActive: true,
        updatedAt: now,
      })
      .returning()

    // Create or reuse node
    const [node] = await db
      .insert(orgChartNodes)
      .values({
        structureId: structure.id,
        label: `${approver.name} (${approver.jobTitle || 'Approver'})`,
        approvalRole: approver.jobTitle || 'Approver',
        employeeId: approver.id,
        canDelegate: true,
        isEscalationTarget: false,
        slaHours: 24,
        positionX: 0,
        positionY: 0,
        updatedAt: now,
      })
      .returning()

    await db.insert(approvalMatrixSteps).values({
      matrixId: matrix.id,
      nodeId: node.id,
      stepOrder: 1,
      label: approver.jobTitle || 'Approver',
      approvalMode: 'sequential',
      canDelegate: true,
      slaHours: 24,
      updatedAt: now,
    })

    createdCount++
  }

  // 4 Central Services sections:
  // 33: Service Operation MVC
  // 34: Service Operation Others
  // 29: Repair / Retread Operation
  // 37: Technical Operation (TE)
  const CS_SECTIONS = [
    { id: 33, name: 'Service Operation MVC' },
    { id: 34, name: 'Service Operation Others' },
    { id: 29, name: 'Repair / Retread Operation' },
    { id: 37, name: 'Technical Operation' },
  ]

  // --- SEED 1: 13 ADMIN CP SITES ---
  console.log('\nSeeding 13 Admin CP Sites with 4 Central Services sections...')
  for (const siteId of adminCpSiteIds) {
    const siteName = siteMap.get(siteId) || `Site ${siteId}`
    // MVC (33) -> As'ar Fauzan
    await createMatrixAndStep({
      name: `Request APD - ${siteName} - Service Operation MVC`,
      siteId,
      sectionId: 33,
      approver: asar,
    })
    // Others (34) -> As'ar Fauzan
    await createMatrixAndStep({
      name: `Request APD - ${siteName} - Service Operation Others`,
      siteId,
      sectionId: 34,
      approver: asar,
    })
    // Repair / Retread (29) -> Arjun Zahiri Mursith
    await createMatrixAndStep({
      name: `Request APD - ${siteName} - Repair / Retread Operation`,
      siteId,
      sectionId: 29,
      approver: arjun,
    })
    // TE / Technical Operation (37) -> Muhammad Abian Husain
    await createMatrixAndStep({
      name: `Request APD - ${siteName} - Technical Operation`,
      siteId,
      sectionId: 37,
      approver: abian,
    })
  }

  // --- SEED 2: 5 HSE SITES ---
  console.log('Seeding 5 HSE Sites with 4 Central Services sections...')
  for (const item of hseConfigs) {
    const siteName = siteMap.get(item.siteId) || `Site ${item.siteId}`
    const approver = getEmp(item.empId)
    for (const sec of CS_SECTIONS) {
      await createMatrixAndStep({
        name: `Request APD - ${siteName} - ${sec.name}`,
        siteId: item.siteId,
        sectionId: sec.id,
        approver,
      })
    }
  }

  // --- SEED 3: 13 PJO SITES ---
  console.log('Seeding 13 PJO Sites with 4 Central Services sections...')
  for (const item of pjoConfigs) {
    const siteName = siteMap.get(item.siteId) || `Site ${item.siteId}`
    const approver = getEmp(item.empId)
    for (const sec of CS_SECTIONS) {
      await createMatrixAndStep({
        name: `Request APD - ${siteName} - ${sec.name}`,
        siteId: item.siteId,
        sectionId: sec.id,
        approver,
      })
    }
  }

  console.log(`\nSuccessfully created ${createdCount} APD approval matrices with explicit sections!`)
  process.exit(0)
}

main().catch(console.error)
