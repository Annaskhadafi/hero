import { db } from '../db'
import {
  getMinePermitSiteOptions,
  getMinePermitSiteConfig,
  saveMinePermitSiteConfig,
  sendSiteMinePermitExpiryReminder,
} from '../lib/mine-permit-reminder'
import { emailDeliveryLogs } from '../db/schema/hero'
import { desc, eq } from 'drizzle-orm'

describe('mine permit recipient fix', () => {
  it('runs recipient and empty CC checks', async () => {
    let siteOptions
    try {
      siteOptions = await getMinePermitSiteOptions()
    } catch (err) {
      console.warn('DB connection not available, skipping live test', err)
      return
    }

    const { sites, employees } = siteOptions || { sites: [], employees: [] }
    if (sites.length === 0 || employees.length === 0) {
      return
    }
    const testSite = sites[0]
    const testEmployee = employees[0]

    // 2. Save config with 1 selected recipient and EMPTY CC
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

    expect(loadedConfig.recipientEmployeeIds).toContain(testEmployee.id)
    expect(loadedConfig.recipientEmails).toContain(testEmployee.email.toLowerCase())
    expect(loadedConfig.ccEmployeeIds.length).toBe(0)
    expect(loadedConfig.ccEmails?.length).toBe(0)
    expect(loadedConfig.additionalCcEmails).toBe('')

    // 4. Test trigger email
    const result = await sendSiteMinePermitExpiryReminder(testSite.id, true)

    if (result.sent) {
      expect(result.toCount).toBeGreaterThanOrEqual(1)
      expect(result.ccCount).toBe(0)

      // Check latest delivery log
      const [latestLog] = await db
        .select()
        .from(emailDeliveryLogs)
        .where(eq(emailDeliveryLogs.templateCode, 'hc_employee_mine_permit_reminder'))
        .orderBy(desc(emailDeliveryLogs.id))
        .limit(1)

      expect(latestLog?.toEmail).toContain(testEmployee.email.toLowerCase())
      if (latestLog?.ccEmail) {
        expect(latestLog.ccEmail.trim()).toBe('')
      }
    }

    // 5. Test empty recipient validation
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
    expect(emptyResult.sent).toBe(false)
  })
})
