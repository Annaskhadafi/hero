import { db } from '../db'
import { approvals, employees } from '../db/schema/hero'
import { repairFormWo } from '../db/schema/form-wo'
import { eq, desc } from 'drizzle-orm'

async function main() {
  console.log('=== Submit 2 WO Forms for Testing ===\n')

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

  const repairPayload = {
    jenisPengajuan: 'repair' as const,
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
  }

  // Insert directly
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const [lastRepair] = await db.select({ id: repairFormWo.id }).from(repairFormWo).orderBy(desc(repairFormWo.id)).limit(1);
  const repairSeq = String((lastRepair?.id ?? 0) + 1).padStart(4, '0');
  const repairNo = `FRMWO/${year}/${month}/${repairSeq}`;

  const [repairWo] = await db.insert(repairFormWo).values({
    ...repairPayload,
    noPengajuan: repairNo,
    statusPengajuan: 'pending',
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: employee.email,
  }).returning({ id: repairFormWo.id, noPengajuan: repairFormWo.noPengajuan });

  console.log(`✅ WO Repair created: ${repairNo} (ID: ${repairWo.id})`);

  // Create approval steps for repair (4 steps)
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
  console.log(`✅ ${repairSteps.length} approval steps created for WO Repair\n`);

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
  ];

  const retreadPayload = {
    jenisPengajuan: 'retread' as const,
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
  };

  const [lastRetread] = await db.select({ id: repairFormWo.id }).from(repairFormWo).orderBy(desc(repairFormWo.id)).limit(1);
  const retreadSeq = String((lastRetread?.id ?? 0) + 1).padStart(4, '0');
  const retreadNo = `FRMWO/${year}/${month}/${retreadSeq}`;

  const [retreadWo] = await db.insert(repairFormWo).values({
    ...retreadPayload,
    noPengajuan: retreadNo,
    statusPengajuan: 'pending',
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: employee.email,
  }).returning({ id: repairFormWo.id, noPengajuan: repairFormWo.noPengajuan });

  console.log(`✅ WO Retread created: ${retreadNo} (ID: ${retreadWo.id})`);

  // Create approval steps for retread (4 steps)
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
  console.log(`✅ ${repairSteps.length} approval steps created for WO Retread\n`);

  // Summary
  console.log('=== SUMMARY ===');
  console.log(`1. ${repairNo} (WO Repair, 3 items, CK Sangatta, Rp 17.200.000)`);
  console.log(`   Status: pending, Approver: ${employee.name}`);
  console.log(`   Steps: QC/Leader → Repair Op SPV → Billing → Inventory Whse SPV`);
  console.log();
  console.log(`2. ${retreadNo} (WO Retread, 2 items, CK Bontang, Rp 4.750.000)`);
  console.log(`   Status: pending, Approver: ${employee.name}`);
  console.log(`   Steps: QC/Leader → Repair Op SPV → Billing → Inventory Whse SPV`);
  console.log();
  console.log('✅ Both WO forms submitted successfully!');
  console.log('📱 Login as Khadafi → Approval Inbox → Review & Approve each step');
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
