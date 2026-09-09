import { db } from '../db'
import {
  getMinePermitSiteOptions,
  getMinePermitSiteConfig,
  saveMinePermitSiteConfig,
  sendSiteMinePermitExpiryReminder,
} from '../lib/mine-permit-reminder'
import { emailDeliveryLogs } from '../db/schema/hero'
import { desc, eq } from 'drizzle-orm'

async function runTest() {
  console.log('=== TEST: Mine Permit Recipient & Empty CC Fix ===')

  // 1. Get options
  const { sites, employees } = await getMinePermitSiteOptions()
  if (sites.length === 0 || employees.length === 0) {
    throw new Error('Sites or employees empty')
  }
  const testSite = sites[0]
  const testEmployee = employees[0]
  console.log(`Testing with Site: ${testSite.name} (ID: ${testSite.id})`)
  console.log(`Testing with Recipient: ${testEmployee.name} (${testEmployee.email}, ID: ${testEmployee.id})`)

  // 2. Save config with 1 selected recipient and EMPTY CC
  console.log('\n--- Step 1: Save with 1 recipient and EMPTY CC ---')
  await saveMinePermitSiteConfig({
    siteId: testSite.id,
    intervalDays: 3,
    reminderDays: 60,
    recipientEmails: [testEmployee.email],
    ccEmails: [],
    additionalCcEmails: '',
    isActive: true,
  })

  // 3. Verify retrieved config
  const loadedConfig = await getMinePermitSiteConfig(testSite.id)
  console.log('Loaded config:', {
    siteId: loadedConfig.siteId,
    recipientEmployeeIds: loadedConfig.recipientEmployeeIds,
    recipientEmails: loadedConfig.recipientEmails,
    ccEmployeeIds: loadedConfig.ccEmployeeIds,
    ccEmails: loadedConfig.ccEmails,
    additionalCcEmails: loadedConfig.additionalCcEmails,
  })

  if (!loadedConfig.recipientEmployeeIds.includes(testEmployee.id)) {
    throw new Error(`Expected recipientEmployeeIds to contain ${testEmployee.id}, got ${JSON.stringify(loadedConfig.recipientEmployeeIds)}`)
  }
  if (!loadedConfig.recipientEmails?.includes(testEmployee.email.toLowerCase())) {
    throw new Error(`Expected recipientEmails to contain ${testEmployee.email}, got ${JSON.stringify(loadedConfig.recipientEmails)}`)
  }
  if (loadedConfig.ccEmployeeIds.length !== 0) {
    throw new Error(`Expected ccEmployeeIds to be empty, got ${JSON.stringify(loadedConfig.ccEmployeeIds)}`)
  }
  if (loadedConfig.ccEmails?.length !== 0) {
    throw new Error(`Expected ccEmails to be empty, got ${JSON.stringify(loadedConfig.ccEmails)}`)
  }
  if (loadedConfig.additionalCcEmails !== '') {
    throw new Error(`Expected additionalCcEmails to be empty string, got "${loadedConfig.additionalCcEmails}"`)
  }
  console.log('✓ Config verified: exactly 1 recipient, 0 CC.')

  // 4. Test trigger email
  console.log('\n--- Step 2: Trigger reminder ---')
  const result = await sendSiteMinePermitExpiryReminder(testSite.id, true)
  console.log('Trigger result:', result)

  if (result.sent) {
    if (result.toCount !== 1) {
      throw new Error(`Expected toCount === 1, got ${result.toCount}`)
    }
    if (result.ccCount !== 0) {
      throw new Error(`Expected ccCount === 0, got ${result.ccCount}`)
    }

    // Check latest delivery log
    const [latestLog] = await db
      .select()
      .from(emailDeliveryLogs)
      .where(eq(emailDeliveryLogs.templateCode, 'hc_employee_mine_permit_reminder'))
      .orderBy(desc(emailDeliveryLogs.id))
      .limit(1)

    console.log('Latest log in DB:', {
      id: latestLog?.id,
      toEmail: latestLog?.toEmail,
      ccEmail: latestLog?.ccEmail,
      status: latestLog?.status,
    })

    if (!latestLog?.toEmail?.includes(testEmployee.email.toLowerCase())) {
      throw new Error(`Expected log toEmail to match ${testEmployee.email}, got "${latestLog?.toEmail}"`)
    }
    if (latestLog?.ccEmail && latestLog.ccEmail.trim() !== '') {
      throw new Error(`Expected log ccEmail to be empty/null, got "${latestLog?.ccEmail}"`)
    }
    console.log('✓ Email delivery log verified: toEmail matches selected employee, ccEmail is empty.')
  } else {
    console.log('Reminder skipped (e.g. no employees expiring in this site within 60 days):', result.reason)
  }

  // 5. Test empty recipient validation
  console.log('\n--- Step 3: Test empty recipient behavior ---')
  await saveMinePermitSiteConfig({
    siteId: testSite.id,
    intervalDays: 1,
    reminderDays: 30,
    recipientEmails: [],
    ccEmails: [],
    additionalCcEmails: '',
    isActive: true,
  })

  const emptyResult = await sendSiteMinePermitExpiryReminder(testSite.id, true)
  console.log('Empty recipients result:', emptyResult)
  if (emptyResult.sent) {
    throw new Error('Should NOT send email when recipient is empty!')
  }
  if (!emptyResult.reason?.includes('Penerima utama (To) belum diatur')) {
    console.log('Skip reason received:', emptyResult.reason)
  }
  console.log('✓ Empty recipients correctly rejected without falling back to site head.')

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY ===')
  process.exit(0)
}

runTest().catch((err) => {
  console.error('TEST FAILED:', err)
  process.exit(1)
})
