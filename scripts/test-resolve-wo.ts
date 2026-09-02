import { createFormWo } from '../app/actions/form-wo';
import { db } from '../db';
import { repairFormWo, approvals } from '../db/schema/hero';
import { desc, eq } from 'drizzle-orm';

async function main() {
  console.log('Testing auto createFormWo end-to-end...');
  const res = await createFormWo({
    jenisPengajuan: 'repair',
    customer: 'ANDALAN BUMI NUSANTARA',
    site: 'Balikpapan',
    size: '27.00R49',
    tireSn: 'TEST-AUTOROOT-001',
    brand: 'Bridgestone',
    jobType: 'R1 (Minor Repair)',
    totalAmount: '1500000',
    noPo: 'PO-AUTO-TEST-001',
    tanggalPo: '2026-09-01',
    catatanPengajuan: 'Uji otomatis integrasi root fix',
    submitterSignatureUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    items: JSON.stringify([{ id: '1', customer: 'ANDALAN BUMI NUSANTARA', site: 'Balikpapan', size: '27.00R49', description: 'TEST-AUTOROOT-001', brand: 'Bridgestone', category: 'R1 (Minor Repair)', price: '1500000', noPo: 'PO-AUTO-TEST-001', tanggalPo: '2026-09-01', noUnit: '1' }])
  });

  console.log('Creation response:', res);

  const [latestWo] = await db.select().from(repairFormWo).orderBy(desc(repairFormWo.id)).limit(1);
  console.log('Latest WO created in DB:', latestWo?.id, latestWo?.noPengajuan);

  const appvs = await db.select().from(approvals).where(eq(approvals.repairFormWoId, latestWo.id));
  console.log('Auto-created Approval Steps count:', appvs.length);
  for (const a of appvs) {
    console.log(`  Step ${a.level}: status=${a.status}, approver=${a.approverName} (empId=${a.approverEmployeeId})`);
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
