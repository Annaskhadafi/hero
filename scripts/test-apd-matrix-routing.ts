import { resolveApprovalRouteForActivity } from '@/lib/approval-engine'
import { employees } from '@/db/schema/hero'
import { db } from '@/db'
import { eq } from 'drizzle-orm'

async function main() {
  console.log('=== TEST APD ROUTE RESOLUTION ===\n')

  // Sample tests:
  // 1. Employee in Balikpapan (Admin CP), Service MVC
  // Let's find employees matching test profiles:
  const allEmps = await db.select().from(employees).where(eq(employees.isActive, true))

  const testCases = [
    { label: 'Admin CP - Balikpapan (Site 126), MVC (Sec 33)', siteId: 126, sectionId: 33, expectedApprover: "Muhammad As'ar Fauzan", expectedJob: 'Serviceman' },
    { label: 'Admin CP - Balikpapan (Site 126), Repair/Retread (Sec 29)', siteId: 126, sectionId: 29, expectedApprover: 'Arjun Zahiri Mursith', expectedJob: 'Repairman' },
    { label: 'Admin CP - Gresik (Site 132), TE (Sec 37)', siteId: 132, sectionId: 37, expectedApprover: 'Muhammad Abian Husain', expectedJob: 'Technical Engineer' },
    { label: 'HSE - CK BIB (Site 133, Sec 33)', siteId: 133, sectionId: 33, expectedApprover: 'Fathurrahman Sufi', expectedJob: 'HSE Officer' },
    { label: 'HSE - CK MHU (Site 128, Sec 29)', siteId: 128, sectionId: 29, expectedApprover: 'Irfan Rivai Remba', expectedJob: 'HSE' },
    { label: 'HSE - Vale (Site 140, Sec 37)', siteId: 140, sectionId: 37, expectedApprover: 'Muhammad Wahyu Ichsan', expectedJob: 'HSE Officer' },
    { label: 'PJO - AMM Tabang (Site 144, Sec 33)', siteId: 144, sectionId: 33, expectedApprover: 'Singgih Wiyono', expectedJob: 'Technical Engineer' },
    { label: 'PJO - Makassar (Site 151, Sec 29)', siteId: 151, sectionId: 29, expectedApprover: 'Apriyanto', expectedJob: 'Head of Service MVC' },
    { label: 'PJO - Tj. Adaro (Site 130, Sec 37)', siteId: 130, sectionId: 37, expectedApprover: 'Tommy Indra Aldiny Rambe', expectedJob: 'Technical Leader' },
  ]

  for (const tc of testCases) {
    // Find an employee with this siteId
    const emp = allEmps.find((e) => e.siteId === tc.siteId) || allEmps[0]
    const route = await resolveApprovalRouteForActivity({
      employeeId: emp.id,
      siteId: tc.siteId,
      sectionId: tc.sectionId,
      activityType: 'apd-request',
      transactionType: 'apd-request-apd',
      priority: 'any',
      overtimeMinutes: 0,
      at: new Date(),
    })

    console.log(`Test: [${tc.label}]`)
    console.log(`  Matrix Name: "${route.matrixName}" | Steps count: ${route.steps.length}`)
    for (const s of route.steps) {
      console.log(`  -> Approver: ${s.approverName} | Job/Label: "${s.label}" | EmpID: ${s.approverEmployeeId}`)
    }
    console.log('')
  }

  process.exit(0)
}

main().catch(console.error)
