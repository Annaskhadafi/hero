import {
  getMinePermitSiteOptions,
  getMinePermitSiteConfig,
  saveMinePermitSiteConfig,
  sendSiteMinePermitExpiryReminder,
  getAllMinePermitSiteConfigs,
} from '../lib/mine-permit-reminder'
import { resolveWorkflowTemplateContent } from '../lib/workflow-email'

async function runTest() {
  console.log('--- Starting Mine Permit Reminder Tests ---')

  // 1. Test get options
  const options = await getMinePermitSiteOptions()
  console.log(`[PASS] Fetched options: ${options.sites.length} sites, ${options.employees.length} employees with email.`)

  if (options.sites.length === 0) {
    console.log('[WARN] No sites found in DB. Test finished early.')
    process.exit(0)
  }

  const testSite = options.sites[0]
  console.log(`[INFO] Using test site: ${testSite.name} (id: ${testSite.id})`)

  // 2. Test template resolution
  const templateResolution = await resolveWorkflowTemplateContent({
    templateCode: 'hc_employee_mine_permit_reminder',
    fallbackSubject: 'Fallback Mine Permit Subject',
    fallbackHtml: '<p>Fallback</p>',
    fallbackText: 'Fallback text',
    variables: {
      siteName: testSite.name,
      totalExpiring: '2',
      reminderDays: '30',
      tableContentHtml: '<table><tr><td>Dummy row</td></tr></table>',
      viewLink: 'https://hero.test/dashboard/hc/employee',
    },
  })
  console.log(`[PASS] Template resolved: subject = "${templateResolution.subject}"`)
  if (!templateResolution.subject.includes(testSite.name)) {
    throw new Error('Template subject does not interpolate siteName correctly!')
  }

  // 3. Test save config
  const testRecipientEmails = options.employees.slice(0, 2).map((e) => e.email)
  const saveRes = await saveMinePermitSiteConfig({
    siteId: testSite.id,
    intervalDays: 7,
    reminderDays: 45,
    recipientEmails: testRecipientEmails,
    additionalCcEmails: 'test.cc@example.com',
    isActive: true,
  })
  console.log('[PASS] Config saved:', saveRes)

  // 4. Test read config
  const readConfig = await getMinePermitSiteConfig(testSite.id)
  console.log('[PASS] Config read back:', {
    siteId: readConfig.siteId,
    siteName: readConfig.siteName,
    intervalDays: readConfig.intervalDays,
    reminderDays: readConfig.reminderDays,
    recipientEmails: readConfig.recipientEmails,
    additionalCcEmails: readConfig.additionalCcEmails,
    isActive: readConfig.isActive,
  })

  if (readConfig.intervalDays !== 7 || readConfig.reminderDays !== 45) {
    throw new Error('Saved config values do not match read config values!')
  }

  // 5. Test sendSiteMinePermitExpiryReminder (manual trigger)
  const triggerRes = await sendSiteMinePermitExpiryReminder(testSite.id, true)
  console.log('[PASS] Manual trigger response:', triggerRes)

  console.log('--- All Mine Permit Reminder Tests Passed Successfully! ---')
  process.exit(0)
}

runTest().catch((err) => {
  console.error('[FAIL] Test encountered error:', err)
  process.exit(1)
})
