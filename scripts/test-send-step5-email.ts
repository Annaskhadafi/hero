import { sendFormWoApprovalRequestEmail, sendFormWoReadyForWoNumberEmail } from '../lib/form-wo-email'

async function run() {
  const targetEmail = 'andirivlni@gmail.com'
  console.log(`Sending Step 5 approval request email to ${targetEmail}...`)

  const res1 = await sendFormWoApprovalRequestEmail({
    approverEmail: targetEmail,
    approverName: 'Mochamad Annas Khadafi',
    pemohon: 'Mochamad Annas Khadafi (Admin CP Site)',
    noPengajuan: 'FRMWO/26/08/0024',
    customer: 'ANDALAN BHUMI NUSANTARA',
    site: 'Site Sangatta',
    jobType: 'Major Repair R1',
    tireSn: 'SN-ABN-2026-0091',
    brand: 'Bridgestone',
    size: '53/80R63',
    totalAmount: 'Rp 17.200.000',
    catatanPengajuan: 'Mohon persetujuan final (Step 5 - Inventory & Warehouse Management SPV).',
    tier: 3,
  })

  console.log('Step 5 Approval Request email result:', res1)

  console.log(`\nSending Step 5 Completion -> Team Billing (Isi No. WO) notification email to ${targetEmail}...`)
  const res2 = await sendFormWoReadyForWoNumberEmail({
    billingEmail: targetEmail,
    noPengajuan: 'FRMWO/26/08/0024',
    pemohon: 'Mochamad Annas Khadafi (Admin CP Site)',
    customer: 'ANDALAN BHUMI NUSANTARA',
    site: 'Site Sangatta',
    jobType: 'Major Repair R1',
    totalAmount: 'Rp 17.200.000',
    inputWoLink: 'https://hero.chitraparatama.com/dashboard/repair-retread/form-wo',
  })

  console.log('Ready for WO Number email result:', res2)
}

run().catch(console.error)
