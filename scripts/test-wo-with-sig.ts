import { db } from '../db'
import { approvals, employees } from '../db/schema/hero'
import { repairFormWo } from '../db/schema/form-wo'
import { desc, eq, sql } from 'drizzle-orm'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuid } from 'crypto'

// Create a simple 1x1 pixel PNG as placeholder signature
// In real usage, this comes from SignaturePad canvas
const SIGNATURE_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
  0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00, 0x00, 0x00,
  0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
])

// Generate a simple SVG signature and convert to data URL
function generateSignatureDataUrl(name: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60">
    <rect fill="white" width="200" height="60"/>
    <text x="100" y="35" text-anchor="middle" font-family="cursive" font-size="20" fill="#1a1a1a">${name}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

async function main() {
  console.log('=== Submitting 2 WO Forms with Submitter Signature ===\n')

  // Get current employee (Khadafi = id 5)
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, 5))
    .limit(1)

  if (!employee) {
    console.error('Employee not found!')
    process.exit(1)
  }

  console.log(`Pemohon: ${employee.name} (ID: ${employee.id})`)
  console.log(`Email: ${employee.email}\n`)

  // Generate signature data URL
  const sigUrl = generateSignatureDataUrl(employee.name || 'Khadafi')
  console.log('✅ Signature generated (SVG data URL)\n')

  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = String(now.getMonth() + 1).padStart(2, '0')

  // --- 1. WO Repair (3 items) ---
  console.log('--- Submitting WO Repair (3 items) ---')
  const repairItems = [
    {
      id: '1',
      description: 'TR230442016',
      noUnit: 'TRK-001',
      pos: 'Front',
      size: '27.00R49',
      site: 'CK Sangatta',
      customer: 'PT Kaltim Prima Coal',
      category: 'R1',
      price: '3500000',
      noWoCp: '',
      noPo: 'PO-2026-0801',
      tanggalPo: '2026-08-01',
    },
    {
      id: '2',
      description: 'TR230442017',
      noUnit: 'TRK-002',
      pos: 'Rear Left',
      size: '27.00R49',
      site: 'CK Sangatta',
      customer: 'PT Kaltim Prima Coal',
      category: 'R2',
      price: '5200000',
      noWoCp: '',
      noPo: 'PO-2026-0801',
      tanggalPo: '2026-08-01',
    },
    {
      id: '3',
      description: 'TR230442018',
      noUnit: 'TRK-003',
      pos: 'Rear Right',
      size: '29.50R25',
      site: 'CK Sangatta',
      customer: 'PT Kaltim Prima Coal',
      category: 'R3',
      price: '8500000',
      noWoCp: '',
      noPo: 'PO-2026-0801',
      tanggalPo: '2026-08-01',
    },
  ]

  const [lastRepair] = await db.select({ id: repairFormWo.id }).from(repairFormWo).orderBy(desc(repairFormWo.id)).limit(1)
  const repairSeq = String((lastRepair?.id ?? 0) + 1).padStart(4, '0')
  const repairNo = `FRMWO/${year}/${month}/${repairSeq}`

  const [repairWo] = await db.insert(repairFormWo).values({
    jenisPengajuan: 'repair',
    customer: 'PT Kaltim Prima Coal',
    site: 'CK Sangatta',
    pemohon: employee.name,
    tanggal: '2026-08-24',
    catatanPengajuan: 'Perlu repair 3 unit tire untuk operasional bulan Agustus',
    totalAmount: '17200000',
    items: JSON.stringify(repairItems),
    jobType: 'R1',
    tireSn: 'TR230442016',
    size: '27.00R49',
    noPo: 'PO-2026-0801',
    tanggalPo: '2026-08-01',
    deskripsiPekerjaan: 'Repair 3 unit tire',
    submitterSignatureUrl: sigUrl,
    noPengajuan: repairNo,
    statusPengajuan: 'pending',
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: employee.email,
  }).returning({ id: repairFormWo.id, noPengajuan: repairFormWo.noPengajuan });

  console.log(`✅ WO Repair created: ${repairNo} (ID: ${repairWo.id}) with signature`);

  // Create approval steps
  const repairSteps = [
    { stepOrder: 1, label: 'Diketahui Oleh (QC/Leader)' },
    { stepOrder: 2, label: 'Disetujui Oleh (Repair Op SPV)' },
    { stepOrder: 3, label: 'Diperiksa Oleh (Billing Team)' },
    { stepOrder: 4, label: 'Disetujui Oleh (Inventory & Whse SPV)' },
  ];

  for (const step of repairSteps) {
    await db.insert(approvals).values({
      repairFormWoId: repairWo.id,
      level: step.stepOrder,
      approverName: employee.name,
      approverEmployeeId: employee.id,
      approverNodeId: null,
      approvalMatrixId: null,
      approvalStepId: null,
      status: step.stepOrder === 1 ? 'pending' : 'waiting',
      submittedAt: new Date(),
      resolutionSource: 'form_wo_custom',
    });
  }
  console.log(`✅ ${repairSteps.length} approval steps created\n`);

  // --- 2. WO Retread (2 items) ---
  console.log('--- Submitting WO Retread (2 items) ---')
  const retreadItems = [
    {
      id: '1',
      description: 'TR230551001',
      noUnit: 'HLT-010',
      pos: 'Front',
      size: '12.00R24',
      site: 'CK Bontang',
      customer: 'PT Berau Coal',
      category: 'R2',
      price: '2800000',
      noWoCp: '',
      noPo: 'PO-2026-0810',
      tanggalPo: '2026-08-10',
    },
    {
      id: '2',
      description: 'TR230551002',
      noUnit: 'HLT-011',
      pos: 'Rear',
      size: '12.00R24',
      site: 'CK Bontang',
      customer: 'PT Berau Coal',
      category: 'R1',
      price: '1950000',
      noWoCp: '',
      noPo: 'PO-2026-0810',
      tanggalPo: '2026-08-10',
    },
  ]

  const [lastRetread] = await db.select({ id: repairFormWo.id }).from(repairFormWo).orderBy(desc(repairFormWo.id)).limit(1)
  const retreadSeq = String((lastRetread?.id ?? 0) + 1).padStart(4, '0')
  const retreadNo = `FRMWO/${year}/${month}/${retreadSeq}`

  const [retreadWo] = await db.insert(repairFormWo).values({
    jenisPengajuan: 'retread',
    customer: 'PT Berau Coal',
    site: 'CK Bontang',
    pemohon: employee.name,
    tanggal: '2026-08-24',
    catatanPengajuan: 'Retread 2 unit tire untuk operasional',
    totalAmount: '4750000',
    items: JSON.stringify(retreadItems),
    jobType: 'R2',
    tireSn: 'TR230551001',
    size: '12.00R24',
    noPo: 'PO-2026-0810',
    tanggalPo: '2026-08-10',
    deskripsiPekerjaan: 'Retread 2 unit tire',
    submitterSignatureUrl: sigUrl,
    noPengajuan: retreadNo,
    statusPengajuan: 'pending',
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: employee.email,
  }).returning({ id: repairFormWo.id, noPengajuan: repairFormWo.noPengajuan });

  console.log(`✅ WO Retread created: ${retreadNo} (ID: ${retreadWo.id}) with signature`);

  for (const step of repairSteps) {
    await db.insert(approvals).values({
      repairFormWoId: retreadWo.id,
      level: step.stepOrder,
      approverName: employee.name,
      approverEmployeeId: employee.id,
      approverNodeId: null,
      approvalMatrixId: null,
      approvalStepId: null,
      status: step.stepOrder === 1 ? 'pending' : 'waiting',
      submittedAt: new Date(),
      resolutionSource: 'form_wo_custom',
    });
  }
  console.log(`✅ ${repairSteps.length} approval steps created\n`);

  console.log('=== SUMMARY ===');
  console.log(`1. ${repairNo} (WO Repair, 3 items, CK Sangatta, Rp 17.200.000)`);
  console.log(`   Status: pending, Approver: ${employee.name}`);
  console.log(`   ✅ Submitter signature: SUDAH ADA`);
  console.log(`   Steps: QC/Leader → Repair Op SPV → Billing → Inventory Whse SPV`);
  console.log();
  console.log(`2. ${retreadNo} (WO Retread, 2 items, CK Bontang, Rp 4.750.000)`);
  console.log(`   Status: pending, Approver: ${employee.name}`);
  console.log(`   ✅ Submitter signature: SUDAH ADA`);
  console.log(`   Steps: QC/Leader → Repair Op SPV → Billing → Inventory Whse SPV`);
  console.log();
  console.log('✅ Both WO forms submitted with submitter signature!');
  console.log('📱 Login as Khadafi → Approval Inbox → Review & Approve each step');
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
