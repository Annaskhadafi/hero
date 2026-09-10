import {
  getMinePermitSiteOptions,
  getMinePermitSiteConfig,
  saveMinePermitSiteConfig,
  sendSiteMinePermitExpiryReminder,
  getAllMinePermitSiteConfigs,
} from '../lib/mine-permit-reminder'
import { resolveWorkflowTemplateContent } from '../lib/workflow-email'

describe('mine permit reminder', () => {
  it('runs mine permit reminder tests', async () => {
    let options
    try {
      options = await getMinePermitSiteOptions()
    } catch (err) {
      console.warn('DB connection not available, skipping live test', err)
      return
    }

    if (!options || options.sites.length === 0) {
      return
    }

    const testSite = options.sites[0]

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
    expect(templateResolution.subject).toContain(testSite.name)

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
    expect(saveRes).toBeDefined()

    // 4. Test read config
    const readConfig = await getMinePermitSiteConfig(testSite.id)
    expect(readConfig.intervalDays).toBe(7)
    expect(readConfig.reminderDays).toBe(45)

    // 5. Test sendSiteMinePermitExpiryReminder (manual trigger)
    const triggerRes = await sendSiteMinePermitExpiryReminder(testSite.id, true)
    expect(triggerRes).toBeDefined()
  }, 30000)
})
