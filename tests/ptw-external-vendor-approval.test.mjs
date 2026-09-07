import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { parseApplicantEntry, formatVendorApplicantEntry, cleanPtwDescription, extractCheckedEquipment, isItemChecked } from '../lib/ptw-helpers.ts'

test('PTW External Vendor Parsing & Formatting Suite', () => {
  // 1. Standard internal employee
  const internal1 = parseApplicantEntry('Budi — Technician')
  assert.equal(internal1.name, 'Budi')
  assert.equal(internal1.isExternalVendor, false)
  assert.equal(internal1.email, '')

  // 2. External Vendor with Company and Gmail
  const vendor1 = parseApplicantEntry('Joko Santoso (Vendor: PT Surya Teknik - joko.santoso@gmail.com)')
  assert.equal(vendor1.name, 'Joko Santoso')
  assert.equal(vendor1.isExternalVendor, true)
  assert.equal(vendor1.email, 'joko.santoso@gmail.com')
  assert.equal(vendor1.company, 'PT Surya Teknik')

  // 3. External Vendor without Company
  const vendor2 = parseApplicantEntry('Ahmad Dani (Vendor: ahmad.dani@gmail.com)')
  assert.equal(vendor2.name, 'Ahmad Dani')
  assert.equal(vendor2.isExternalVendor, true)
  assert.equal(vendor2.email, 'ahmad.dani@gmail.com')

  // 4. Format with angle brackets
  const vendor3 = parseApplicantEntry('Siti Rahma <siti.rahma@gmail.com>')
  assert.equal(vendor3.name, 'Siti Rahma')
  assert.equal(vendor3.isExternalVendor, true)
  assert.equal(vendor3.email, 'siti.rahma@gmail.com')

  // 5. formatVendorApplicantEntry helper
  const formattedWithCompany = formatVendorApplicantEntry('Budi Vendor', 'budi.vendor@gmail.com', 'PT Global Mandiri')
  assert.equal(formattedWithCompany, 'Budi Vendor (Vendor: PT Global Mandiri - budi.vendor@gmail.com)')

  const formattedWithoutCompany = formatVendorApplicantEntry('Budi Vendor', 'budi.vendor@gmail.com')
  assert.equal(formattedWithoutCompany, 'Budi Vendor (Vendor: budi.vendor@gmail.com)')

  // 6. cleanPtwDescription helper
  const rawDescWithHiradc = '[Referensi HIRADC: CS-01]\nMengeluarkan sisa material yang menggumpal di area corong silo bawah.'
  assert.equal(cleanPtwDescription(rawDescWithHiradc), 'Mengeluarkan sisa material yang menggumpal di area corong silo bawah.')
  assert.equal(cleanPtwDescription('Pekerjaan reguler tanpa prefix'), 'Pekerjaan reguler tanpa prefix')
  assert.equal(cleanPtwDescription(''), '')

  // 7. extractCheckedEquipment helper
  const extractedFromSteps = extractCheckedEquipment('1. Peralatan dalam kondisi baik\n2. Penggunaan material yang sesuai', [], 'Cold Permit')
  assert.equal(extractedFromSteps.length, 2)
  assert.equal(isItemChecked('Peralatan dalam kondisi baik', extractedFromSteps), true)
  assert.equal(isItemChecked('Penggunaan material yang sesuai', extractedFromSteps), true)
  assert.equal(isItemChecked('Tanda / baricade telah tersedia?', extractedFromSteps), false)

  // 8. Fallback when APD passed by mistake as checkedEquipment
  const apdPassedByMistake = ['Safety Helmet', 'Safety Shoes']
  const extractedFallback = extractCheckedEquipment('', apdPassedByMistake, 'Cold Permit')
  assert.ok(extractedFallback.length > 0)
  assert.equal(isItemChecked('Peralatan dalam kondisi baik', extractedFallback), true)
})

test('PTW External Vendor Workflow & UI Contract Verification', () => {
  const root = process.cwd()

  const actionsFile = path.join(root, 'app/dashboard/hse/izin-kerja-ptw/actions.ts')
  const clientFile = path.join(root, 'app/dashboard/hse/izin-kerja-ptw/client.tsx')
  const approvalFormFile = path.join(root, 'components/ptw-approval-form.tsx')
  const emailWorkflowFile = path.join(root, 'lib/activity-overtime-workflow-email.ts')
  const publicReviewPage = path.join(root, 'app/review/ptw/[token]/page.tsx')
  const publicReviewClient = path.join(root, 'app/review/ptw/[token]/public-approval.tsx')

  // 1. Verify files exist
  assert.ok(fs.existsSync(actionsFile), 'PTW actions file must exist')
  assert.ok(fs.existsSync(clientFile), 'PTW client file must exist')
  assert.ok(fs.existsSync(approvalFormFile), 'PTW approval form component must exist')
  assert.ok(fs.existsSync(emailWorkflowFile), 'PTW email workflow file must exist')
  assert.ok(fs.existsSync(publicReviewPage), 'PTW public review page must exist')
  assert.ok(fs.existsSync(publicReviewClient), 'PTW public review client must exist')

  // 2. Verify actions handles vendor applicant parsing
  const actionsContent = fs.readFileSync(actionsFile, 'utf8')
  assert.ok(actionsContent.includes('parseApplicantEntry'), 'actions.ts must use parseApplicantEntry')
  assert.ok(actionsContent.includes('isExternalVendor'), 'actions.ts must check isExternalVendor')

  // 3. Verify client.tsx includes + Vendor Luar button and dialog, and DESKRIPSI PEKERJAAN in PDF
  const clientContent = fs.readFileSync(clientFile, 'utf8')
  assert.ok(clientContent.includes('+ Vendor Luar'), 'client.tsx must have + Vendor Luar button')
  assert.ok(clientContent.includes('vendorModalOpen'), 'client.tsx must manage vendorModalOpen')
  assert.ok(clientContent.includes('formatVendorApplicantEntry'), 'client.tsx must use formatVendorApplicantEntry')
  assert.ok(clientContent.includes('DESKRIPSI PEKERJAAN :'), 'client.tsx PDF must have DESKRIPSI PEKERJAAN')

  // 4. Verify ptw-approval-form.tsx includes + Vendor Luar button and DESKRIPSI PEKERJAAN in PDF
  const formContent = fs.readFileSync(approvalFormFile, 'utf8')
  assert.ok(formContent.includes('+ Vendor Luar'), 'ptw-approval-form.tsx must have + Vendor Luar button')
  assert.ok(formContent.includes('vendorModalOpen'), 'ptw-approval-form.tsx must manage vendorModalOpen')
  assert.ok(formContent.includes('DESKRIPSI PEKERJAAN :'), 'ptw-approval-form.tsx PDF must have DESKRIPSI PEKERJAAN')

  // 5. Verify email workflow sends direct public review link with token
  const emailContent = fs.readFileSync(emailWorkflowFile, 'utf8')
  assert.ok(emailContent.includes('/review/ptw/'), 'activity-overtime-workflow-email.ts must format /review/ptw/ approval link')

  // 7. Verify attachments handling
  assert.ok(actionsContent.includes('attachments: (permit.attachments as any) || []'), 'getPtwApprovalData must include attachments')
  assert.ok(actionsContent.includes('updates.attachments = params.attachments'), 'savePtwApprovalForm must persist attachments')
  assert.ok(formContent.includes('attachments.map'), 'ptw-approval-form.tsx must render attachments list')

  // 8. Verify resolveEmployeeOrVendor & Step 1 pending initialization
  assert.ok(actionsContent.includes('resolveEmployeeOrVendor'), 'actions.ts must implement resolveEmployeeOrVendor')
  assert.ok(actionsContent.includes("status: step.stepOrder === 1 ? 'pending' : 'waiting'"), 'Step 1 must always start as pending')
})


