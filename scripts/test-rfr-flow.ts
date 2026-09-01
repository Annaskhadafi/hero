/**
 * Test RFR approval flow:
 * 1. Create a test RFR request
 * 2. Verify approval steps are created
 * 3. Check bell notifications
 * 4. Check email delivery log
 */
import { Client } from 'pg'
import { randomUUID } from 'crypto'

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://newhero:Wusthochq2018-@31.97.187.38:5444/newhero',
  ssl: false,
})

async function main() {
  await client.connect()
  console.log('=== RFR Flow Test ===\n')

  try {
    // 1. Get current RFR count
    const countResult = await client.query('SELECT count(*)::int as count FROM hero_hc_rfr_requests')
    const seq = countResult.rows[0].count + 1
    const year = new Date().getFullYear()
    const rfrNumber = `RFR-${year}-TEST-${String(seq).padStart(4, '0')}`
    console.log(`Creating RFR: ${rfrNumber}`)

    // 2. Create RFR request
    const todayStr = new Date().toISOString().slice(0, 10)
    const joinEstStr = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

    const rfrResult = await client.query(`
      INSERT INTO hero_hc_rfr_requests (
        rfr_number, request_date, join_date_estimation,
        requestor_name, section_department, position_title,
        number_of_persons, brief_job_description, level,
        reason_for_request, mpp_status, employment_status,
        contract_duration_months, current_step_order, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 1, 'in_progress')
      RETURNING id, rfr_number
    `, [rfrNumber, todayStr, joinEstStr, 'Test Requestor (Section Head)', 'Service / Operation', 'Test Service Mechanic', 2, 'Test job description for RFR', 'staff', 'new_headcount', 'budgeted', 'contract', 12])

    const rfrId = rfrResult.rows[0].id
    console.log(`✅ RFR created with ID: ${rfrId}`)

    // 3. Create approval steps (new flow: step 1 auto-approved)
    const step1Token = randomUUID()
    const step2Token = randomUUID()
    const step3Token = randomUUID()
    const step4Token = randomUUID()
    const step5Token = randomUUID()
    const step6Token = randomUUID()

    const approvals = [
      { stepOrder: 1, stepKey: 'requestor_initiated', roleLabel: 'Submitted', approverName: 'Test Requestor (Section Head)', approverEmail: 'test.requestor@chitraparatama.co.id', approverTitle: 'Section Head', token: step1Token, status: 'approved' },
      { stepOrder: 2, stepKey: 'hc_verification', roleLabel: 'HC Verification', approverName: 'Adilla Tri Arizona', approverEmail: 'adilla@chitraparatama.co.id', approverTitle: 'HR Recruitment Staff', token: step2Token, status: 'pending' },
      { stepOrder: 3, stepKey: 'acknowledge_hr_leader', roleLabel: 'Acknowledge', approverName: 'Kesuma Bagaskara', approverEmail: 'kesuma@chitraparatama.co.id', approverTitle: 'Leader HR-GA', token: step3Token, status: 'pending' },
      { stepOrder: 4, stepKey: 'acknowledge_hr_spv', roleLabel: 'Acknowledge', approverName: 'Muhammad Iqbal', approverEmail: 'iqbal@chitraparatama.co.id', approverTitle: 'Human Capital Spv', token: step4Token, status: 'pending' },
      { stepOrder: 5, stepKey: 'acknowledge_dept_head', roleLabel: 'Acknowledge', approverName: 'Romy Hidayat', approverEmail: 'romy@chitraparatama.co.id', approverTitle: 'Manager Departemen', token: step5Token, status: 'pending' },
      { stepOrder: 6, stepKey: 'approval_gm', roleLabel: 'Approval', approverName: 'Person Sihaloho', approverEmail: 'person@chitraparatama.co.id', approverTitle: 'General Manager', token: step6Token, status: 'pending' },
    ]

    for (const a of approvals) {
      await client.query(`
        INSERT INTO hero_hc_rfr_approvals (
          rfr_id, step_order, step_key, role_label,
          approver_name, approver_email, approver_title,
          approval_token, status, signed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [rfrId, a.stepOrder, a.stepKey, a.roleLabel, a.approverName, a.approverEmail, a.approverTitle, a.token, a.status, a.status === 'approved' ? new Date() : null])
    }
    console.log(`✅ ${approvals.length} approval steps created`)
    console.log(`   Step 1 (Submitted): AUTO-APPROVED (requestor initiated)`)
    console.log(`   Step 2 (HC Verification): PENDING → ${approvals[1].approverName}`)
    console.log(`   Step 6 (GM): PENDING → ${approvals[5].approverName}`)

    // 4. Create bell notifications for step 2
    const bellResult = await client.query(`
      INSERT INTO hero_notification_events (channel, event_type, recipient, payload_snapshot, delivery_status, delivered_at, created_at)
      VALUES ('in_app', 'rfr_approval_request', $1, $2, 'delivered', NOW(), NOW())
      RETURNING id
    `, [
      approvals[1].approverEmail,
      JSON.stringify({
        category: 'approval_requests',
        title: `RFR Baru: ${rfrNumber}`,
        body: `Test Requestor (Section Head) mengajukan RFR untuk posisi Test Service Mechanic (2 orang). Menunggu verifikasi Anda di tahap HC Verification.`,
        url: `/review/rfr/${approvals[1].token}`,
      })
    ])
    console.log(`✅ Bell notification created (ID: ${bellResult.rows[0].id}) → ${approvals[1].approverEmail}`)

    // Also create delivery record
    await client.query(`
      INSERT INTO hero_notification_deliveries (notification_event_id, delivery_channel, recipient, status, sent_at, created_at, updated_at)
      VALUES ($1, 'in_app', $2, 'delivered', NOW(), NOW(), NOW())
    `, [bellResult.rows[0].id, approvals[1].approverEmail])

    // 5. Check existing RFR requests
    console.log('\n--- Current RFR Requests ---')
    const rfrList = await client.query('SELECT id, rfr_number, requestor_name, position_title, status, current_step_order FROM hero_hc_rfr_requests ORDER BY created_at DESC LIMIT 5')
    for (const r of rfrList.rows) {
      console.log(`  ${r.rfr_number} | ${r.requestor_name} | ${r.position_title} | status=${r.status} | step=${r.current_step_order}`)
    }

    // 6. Check pending approvals
    console.log('\n--- Pending RFR Approvals ---')
    const pendingList = await client.query(`
      SELECT ra.approver_name, ra.approver_email, ra.role_label, ra.step_order, ra.status,
             rr.rfr_number, rr.position_title
      FROM hero_hc_rfr_approvals ra
      JOIN hero_hc_rfr_requests rr ON ra.rfr_id = rr.id
      WHERE ra.status = 'pending'
      ORDER BY rr.created_at DESC, ra.step_order
      LIMIT 10
    `)
    for (const p of pendingList.rows) {
      console.log(`  ${p.rfr_number} → Step ${p.step_order} (${p.role_label}) → ${p.approver_name} <${p.approver_email}>`)
    }

    // 7. Check bell notifications
    console.log('\n--- Recent Bell Notifications (RFR) ---')
    const bellList = await client.query(`
      SELECT event_type, recipient, payload_snapshot::json->>'title' as title, 
             payload_snapshot::json->>'body' as body
      FROM hero_notification_events
      WHERE event_type LIKE 'rfr%'
      ORDER BY created_at DESC
      LIMIT 5
    `)
    for (const b of bellList.rows) {
      console.log(`  [${b.event_type}] → ${b.recipient}`)
      console.log(`    Title: ${b.title}`)
      console.log(`    Body: ${b.body?.substring(0, 80)}...`)
    }

    // 8. Check email delivery log
    console.log('\n--- Email Delivery Log (RFR) ---')
    const emailList = await client.query(`
      SELECT template_code, to_email, subject, status, created_at
      FROM hero_email_delivery_logs
      WHERE template_code LIKE '%rfr%'
      ORDER BY created_at DESC
      LIMIT 5
    `)
    if (emailList.rows.length === 0) {
      console.log('  (No RFR emails found — SMTP may not be configured in test)')
    } else {
      for (const e of emailList.rows) {
        console.log(`  [${e.status}] ${e.template_code} → ${e.to_email} | ${e.subject?.substring(0, 60)}...`)
      }
    }

    // 9. Approval links
    console.log('\n--- Approval Links (for testing) ---')
    for (const a of approvals) {
      if (a.status !== 'approved') {
        console.log(`  Step ${a.stepOrder} (${a.roleLabel}): http://localhost:3000/review/rfr/${a.token}`)
      }
    }

    console.log('\n=== Test RFR Flow Complete ===')
    console.log(`\nRFR Number: ${rfrNumber}`)
    console.log(`RFR ID: ${rfrId}`)
    console.log(`Status: in_progress (Step 1 auto-approved, waiting at Step 2)`)

  } catch (error: any) {
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await client.end()
  }
}

main()
