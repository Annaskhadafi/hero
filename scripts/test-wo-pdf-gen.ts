import { generateFormWoPdf } from '../lib/form-wo-pdf'
import fs from 'fs'

async function run() {
  console.log('Testing generateFormWoPdf...')
  const pdfBuffer = await generateFormWoPdf({
    noPengajuan: 'FRMWO/26/08/0021',
    jenisPengajuan: 'repair',
    noWoTerbit: 'WO-CP-2026-9901',
    noPo: 'PO-KPC-8899',
    tanggalPo: '2026-08-26',
    hari: 'Rabu',
    tanggal: '2026-08-26',
    customer: 'PT Kaltim Prima Coal',
    site: 'Site Sangatta',
    pemohon: 'Mochamad Annas Khadafi',
    totalAmount: '17200000',
    items: [
      { description: 'TIRE 53/80R63', noUnit: 'DT-101', pos: 'POS 1', size: '53/80R63', category: 'R1', price: 12000000 },
      { description: 'TIRE 27.00R49', noUnit: 'DT-102', pos: 'POS 2', size: '27.00R49', category: 'R2', price: 5200000 },
    ],
    steps: [
      { level: 1, approverName: 'Mochamad Annas Khadafi', jobTitle: 'Admin CP Site', status: 'approved', reviewedAt: new Date() },
      { level: 2, approverName: 'Hendra Setiawan', jobTitle: 'QC / Leader', status: 'approved', reviewedAt: new Date() },
      { level: 3, approverName: 'Budi Santoso', jobTitle: 'Repair / Retread Operation SPV', status: 'approved', reviewedAt: new Date() },
      { level: 4, approverName: 'Team Billing', jobTitle: 'Team Billing', status: 'approved', reviewedAt: new Date() },
      { level: 5, approverName: 'Agus Pratama', jobTitle: 'Inventory & Warehouse Management SPV', status: 'approved', reviewedAt: new Date() },
    ],
  })

  console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes')
  fs.writeFileSync('scripts/test-output-form-wo.pdf', pdfBuffer)
  console.log('Saved to scripts/test-output-form-wo.pdf')
}

run().catch(console.error)
