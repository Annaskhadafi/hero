import { db } from '../db'
import { repairFormWo } from '../db/schema/form-wo'
import { approvals, employees } from '../db/schema/hero'
import { resolveApprovalRouteForActivity } from '../lib/approval-engine'

async function main() {
  console.log('Restoring Form WO data...')

  const dummySig =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAK8AAAA8CAYAAAD96G4kAAAACXBIWXMAAAsTAAALEwEAmpwYAAAER0lEQVR4nO3bTWgcVRzH8e+bmd2k2SStbVqrba2K1tqK1lZt1VartmrtxVqvHjzpURDEiyAiiIgoIiKIiCIiiIgiIoqIICKKiCg'

  const recordsToRestore = [
    {
      noPengajuan: 'FRMWO/26/09/0045',
      jenisPengajuan: 'service',
      tanggal: new Date('2026-09-01'),
      customer: 'PT. PAMAPERSADA NUSANTARA',
      site: 'testing',
      pemohon: 'Mochamad Annas Khadafi',
      pemohonJobTitle: 'Fullstack Developer',
      noPo: 'PO-PAMA-001',
      tanggalPo: new Date('2026-09-01'),
      jobType: 'Service Tire Maintenance',
      totalAmount: 15500000,
      statusPengajuan: 'pending',
      submitterSignatureUrl: dummySig,
      items: JSON.stringify([
        {
          id: '1',
          description: 'Maintenance & Service Regular',
          job: 'Service',
          customer: 'PT. PAMAPERSADA NUSANTARA',
          site: 'testing',
          serialNo: 'SN-PAMA-091',
          refNo: 'REF-001',
          noWoCp: '',
          price: '15500000',
        },
      ]),
    },
    {
      noPengajuan: 'FRMWO/26/09/0013',
      jenisPengajuan: 'service',
      tanggal: new Date('2026-09-01'),
      customer: 'PT. CIPTA KRIDATAMA',
      site: 'TES',
      pemohon: 'Mochamad Annas Khadafi',
      pemohonJobTitle: 'Fullstack Developer',
      noPo: '1234567',
      tanggalPo: new Date('2026-09-01'),
      jobType: 'Service',
      totalAmount: 12345678,
      statusPengajuan: 'pending',
      submitterSignatureUrl: dummySig,
      items: JSON.stringify([
        {
          id: '1',
          description: 'Service Regular CK',
          job: 'Service',
          customer: 'PT. CIPTA KRIDATAMA',
          site: 'TES',
          serialNo: 'CK-001',
          refNo: 'REF-123',
          noWoCp: '',
          price: '12345678',
        },
      ]),
    },
    {
      noPengajuan: 'FRMWO/26/09/0044',
      jenisPengajuan: 'repair',
      tanggal: new Date('2026-09-01'),
      customer: 'ANDALAN BHUMI NUSANTARA',
      site: 'fsdfhj',
      pemohon: 'Mochamad Annas Khadafi',
      pemohonJobTitle: 'Fullstack Developer',
      noPo: '3456uy1',
      tanggalPo: new Date('2026-09-01'),
      jobType: 'Repair',
      totalAmount: 456789,
      statusPengajuan: 'pending',
      submitterSignatureUrl: dummySig,
      items: JSON.stringify([
        {
          id: '1',
          description: 'TR-456789',
          noUnit: 'ABN-01',
          pos: 'POS-1',
          size: '27.00R49',
          site: 'fsdfhj',
          customer: 'ANDALAN BHUMI NUSANTARA',
          category: 'R1',
          noWoCp: '',
          price: '456789',
        },
      ]),
    },
    {
      noPengajuan: 'FRMWO/26/09/0043',
      jenisPengajuan: 'repair',
      tanggal: new Date('2026-09-01'),
      customer: 'ANDALAN BHUMI NUSANTARA',
      site: 'fsdfhj',
      pemohon: 'Mochamad Annas Khadafi',
      pemohonJobTitle: 'Fullstack Developer',
      noPo: '3456uy1',
      tanggalPo: new Date('2026-09-01'),
      jobType: 'Repair',
      totalAmount: 456789,
      statusPengajuan: 'pending',
      submitterSignatureUrl: dummySig,
      items: JSON.stringify([
        {
          id: '1',
          description: 'TR-456789',
          noUnit: 'ABN-01',
          pos: 'POS-1',
          size: '27.00R49',
          site: 'fsdfhj',
          customer: 'ANDALAN BHUMI NUSANTARA',
          category: 'R1',
          noWoCp: '',
          price: '456789',
        },
      ]),
    },
    {
      noPengajuan: 'FRMWO/26/09/0041',
      jenisPengajuan: 'repair',
      tanggal: new Date('2026-09-01'),
      customer: 'ANDALAN BHUMI NUSANTARA',
      site: 'fsdfhj',
      pemohon: 'Mochamad Annas Khadafi',
      pemohonJobTitle: 'Fullstack Developer',
      noPo: '3456uy1',
      tanggalPo: new Date('2026-09-01'),
      jobType: 'Repair',
      totalAmount: 456789,
      statusPengajuan: 'pending',
      submitterSignatureUrl: dummySig,
      items: JSON.stringify([
        {
          id: '1',
          description: 'TR-456789',
          noUnit: 'ABN-01',
          pos: 'POS-1',
          size: '27.00R49',
          site: 'fsdfhj',
          customer: 'ANDALAN BHUMI NUSANTARA',
          category: 'R1',
          noWoCp: '',
          price: '456789',
        },
      ]),
    },
    {
      noPengajuan: 'FRMWO/26/09/0040',
      jenisPengajuan: 'repair',
      tanggal: new Date('2026-09-01'),
      customer: 'ANDALAN BHUMI NUSANTARA',
      site: 'fsdfhj',
      pemohon: 'Mochamad Annas Khadafi',
      pemohonJobTitle: 'Fullstack Developer',
      noPo: '3456uy1',
      tanggalPo: new Date('2026-09-01'),
      jobType: 'Repair',
      totalAmount: 456789,
      statusPengajuan: 'pending',
      submitterSignatureUrl: dummySig,
      items: JSON.stringify([
        {
          id: '1',
          description: 'TR-456789',
          noUnit: 'ABN-01',
          pos: 'POS-1',
          size: '27.00R49',
          site: 'fsdfhj',
          customer: 'ANDALAN BHUMI NUSANTARA',
          category: 'R1',
          noWoCp: '',
          price: '456789',
        },
      ]),
    },
    {
      noPengajuan: 'FRMWO/26/09/0039',
      jenisPengajuan: 'repair',
      tanggal: new Date('2026-09-01'),
      customer: 'ANDALAN BHUMI NUSANTARA',
      site: 'bcv',
      pemohon: 'Mochamad Annas Khadafi',
      pemohonJobTitle: 'Fullstack Developer',
      noPo: '5643524',
      tanggalPo: new Date('2026-09-01'),
      jobType: 'Repair',
      totalAmount: 34542324,
      statusPengajuan: 'pending',
      submitterSignatureUrl: dummySig,
      items: JSON.stringify([
        {
          id: '1',
          description: 'TR-34542',
          noUnit: 'ABN-99',
          pos: 'POS-2',
          size: '27.00R49',
          site: 'bcv',
          customer: 'ANDALAN BHUMI NUSANTARA',
          category: 'R1',
          noWoCp: '',
          price: '34542324',
        },
      ]),
    },
    {
      noPengajuan: 'FRMWO/26/09/0038',
      jenisPengajuan: 'repair',
      tanggal: new Date('2026-09-01'),
      customer: 'ANDALAN BHUMI NUSANTARA',
      site: 'bcv',
      pemohon: 'Mochamad Annas Khadafi',
      pemohonJobTitle: 'Fullstack Developer',
      noPo: '5643524',
      tanggalPo: new Date('2026-09-01'),
      jobType: 'Repair',
      totalAmount: 34542324,
      statusPengajuan: 'pending',
      submitterSignatureUrl: dummySig,
      items: JSON.stringify([
        {
          id: '1',
          description: 'TR-34542',
          noUnit: 'ABN-99',
          pos: 'POS-2',
          size: '27.00R49',
          site: 'bcv',
          customer: 'ANDALAN BHUMI NUSANTARA',
          category: 'R1',
          noWoCp: '',
          price: '34542324',
        },
      ]),
    },
    {
      noPengajuan: 'FRMWO/26/09/0037',
      jenisPengajuan: 'repair',
      tanggal: new Date('2026-09-01'),
      customer: 'ANDALAN BHUMI NUSANTARA',
      site: 'bcv',
      pemohon: 'Mochamad Annas Khadafi',
      pemohonJobTitle: 'Fullstack Developer',
      noPo: '5643524',
      tanggalPo: new Date('2026-09-01'),
      jobType: 'Repair',
      totalAmount: 34542324,
      statusPengajuan: 'pending',
      submitterSignatureUrl: dummySig,
      items: JSON.stringify([
        {
          id: '1',
          description: 'TR-34542',
          noUnit: 'ABN-99',
          pos: 'POS-2',
          size: '27.00R49',
          site: 'bcv',
          customer: 'ANDALAN BHUMI NUSANTARA',
          category: 'R1',
          noWoCp: '',
          price: '34542324',
        },
      ]),
    },
    {
      noPengajuan: 'FRMWO/26/09/0036',
      jenisPengajuan: 'repair',
      tanggal: new Date('2026-09-01'),
      customer: 'ANDALAN BHUMI NUSANTARA',
      site: 'bcv',
      pemohon: 'Mochamad Annas Khadafi',
      pemohonJobTitle: 'Fullstack Developer',
      noPo: '5643524',
      tanggalPo: new Date('2026-09-01'),
      jobType: 'Repair',
      totalAmount: 34542324,
      statusPengajuan: 'pending',
      submitterSignatureUrl: dummySig,
      items: JSON.stringify([
        {
          id: '1',
          description: 'TR-34542',
          noUnit: 'ABN-99',
          pos: 'POS-2',
          size: '27.00R49',
          site: 'bcv',
          customer: 'ANDALAN BHUMI NUSANTARA',
          category: 'R1',
          noWoCp: '',
          price: '34542324',
        },
      ]),
    },
    {
      noPengajuan: 'FRMWO/26/09/0032',
      jenisPengajuan: 'repair',
      tanggal: new Date('2026-09-01'),
      customer: 'ANDALAN BHUMI NUSANTARA',
      site: 'bcv',
      pemohon: 'Mochamad Annas Khadafi',
      pemohonJobTitle: 'Fullstack Developer',
      noPo: '5643524',
      tanggalPo: new Date('2026-09-01'),
      jobType: 'Repair',
      totalAmount: 34542324,
      statusPengajuan: 'pending',
      submitterSignatureUrl: dummySig,
      items: JSON.stringify([
        {
          id: '1',
          description: 'TR-34542',
          noUnit: 'ABN-99',
          pos: 'POS-2',
          size: '27.00R49',
          site: 'bcv',
          customer: 'ANDALAN BHUMI NUSANTARA',
          category: 'R1',
          noWoCp: '',
          price: '34542324',
        },
      ]),
    },
  ]

  for (const rec of recordsToRestore) {
    const [inserted] = await db
      .insert(repairFormWo)
      .values({
        ...rec,
        createdBy: '5',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: repairFormWo.id })

    const isService = rec.jenisPengajuan === 'service'
    const custLower = (rec.customer || '').toLowerCase()
    const isMvc =
      custLower.includes('trakindo') ||
      custLower.includes('cipta kridatama') ||
      custLower.includes('ckb') ||
      custLower.trim() === 'ck'

    const transactionType = isService
      ? isMvc
        ? 'form_wo_service_mvc'
        : 'form_wo_service_other'
      : 'form_wo_repair_retread'

    const route = await resolveApprovalRouteForActivity({
      employeeId: 5,
      activityType: 'Form WO',
      priority: 'normal',
      overtimeMinutes: 0,
      transactionType,
      customerName: rec.customer,
      siteName: rec.site,
    })

    if (route.steps.length > 0) {
      for (const step of route.steps) {
        const isStep1 = step.stepOrder === 1
        const stepStatus = isStep1 ? 'pending' : 'waiting'

        await db.insert(approvals).values({
          repairFormWoId: inserted.id,
          level: step.stepOrder,
          approverName: step.approverName,
          approverEmployeeId: step.approverEmployeeId,
          approverNodeId: step.approverNodeId,
          approvalMatrixId: route.matrixId ?? null,
          approvalStepId: step.approvalMatrixStepId ?? null,
          status: stepStatus,
          reviewedAt: null,
          signatureUrl: null,
          submittedAt: new Date(),
          resolutionSource: step.resolutionSource,
          routeSnapshot: JSON.stringify({
            label: step.label,
            nodeLabel: step.nodeLabel,
            fallbackLabel: step.fallbackLabel,
            escalationLabel: step.escalationLabel,
          }),
        })
      }
    }
  }

  console.log(`✅ Successfully restored ${recordsToRestore.length} Form WO records with approvals!`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
