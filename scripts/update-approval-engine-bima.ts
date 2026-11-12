import fs from 'fs'
import path from 'path'

const filePath = path.join(process.cwd(), 'lib', 'approval-engine.ts')
let content = fs.readFileSync(filePath, 'utf8')

const oldCode = `    let itApprover: { id: number | null; name: string } = {
      id: 962, // Aditya Jarangmula Ngindra (IT Supervisor)
      name: 'Aditya Jarangmula Ngindra (Supervisor IT)',
    }
    try {
      const [cfg] = await db.select().from(cerNotificationConfigs).limit(1)
      if (cfg?.itBimaEmail) {
        const [emp] = await db
          .select({ id: employees.id, name: employees.name })
          .from(employees)
          .where(eq(employees.email, cfg.itBimaEmail))
        if (emp) {
          itApprover = { id: emp.id, name: emp.name }
        }
      }
    } catch {
      // fallback to default
    }
    steps.push({
      stepOrder: stepOrder++,
      label: 'Technical Validation IT',
      approverName: itApprover.name,
      approverEmployeeId: itApprover.id,
      approverNodeId: null,
      approvalMatrixStepId: null,
      approvalMode: 'single',
      resolutionSource: 'matrix',
      canDelegate: false,
      slaHours: 24,
    })`

const newCode = `    let itApprover: { id: number | null; name: string } = {
      id: 1016, // Arif Maulana Ghafar (BIMA Supervisor)
      name: 'Arif Maulana Ghafar (BIMA Supervisor)',
    }
    try {
      const [bima] = await db
        .select({ id: employees.id, name: employees.name, jobTitle: employees.jobTitle })
        .from(employees)
        .where(or(ilike(employees.name, '%Arif Maulana%'), eq(employees.employeeSn, '50330')))
        .limit(1)
      if (bima) {
        itApprover = { id: bima.id, name: \`\${bima.name} (BIMA Supervisor)\` }
      }
    } catch {
      // fallback to default
    }
    steps.push({
      stepOrder: stepOrder++,
      label: 'Acknowledge by BIMA Supervisor',
      approverName: itApprover.name,
      approverEmployeeId: itApprover.id,
      approverNodeId: null,
      approvalMatrixStepId: null,
      approvalMode: 'single',
      resolutionSource: 'matrix',
      canDelegate: false,
      slaHours: 24,
    })`

// Normalize CRLF to LF for matching
const normContent = content.replace(/\r\n/g, '\n')
const normOld = oldCode.replace(/\r\n/g, '\n')

if (normContent.includes(normOld)) {
  const updated = normContent.replace(normOld, newCode.replace(/\r\n/g, '\n'))
  fs.writeFileSync(filePath, updated, 'utf8')
  console.log('✓ Updated BIMA Supervisor in lib/approval-engine.ts')
} else {
  console.log('Target string not found in lib/approval-engine.ts')
}
