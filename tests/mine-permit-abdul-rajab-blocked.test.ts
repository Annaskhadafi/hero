import {
  isBlockedMinePermitEmail,
  BLOCKED_MINE_PERMIT_EMAILS,
} from '../lib/mine-permit-utils'
import {
  getMinePermitSiteOptions,
  getMinePermitSiteConfig,
  saveMinePermitSiteConfig,
} from '../lib/mine-permit-reminder'

describe('Mine Permit Abdul Rajab hardcoded block', () => {
  it('identifies abdul.rajab@chitraparatama.co.id as blocked regardless of case/whitespace', () => {
    expect(BLOCKED_MINE_PERMIT_EMAILS).toContain('abdul.rajab@chitraparatama.co.id')
    expect(isBlockedMinePermitEmail('abdul.rajab@chitraparatama.co.id')).toBe(true)
    expect(isBlockedMinePermitEmail(' Abdul.Rajab@chitraparatama.co.id ')).toBe(true)
    expect(isBlockedMinePermitEmail('ABDUL.RAJAB@CHITRAPARATAMA.CO.ID')).toBe(true)
    expect(isBlockedMinePermitEmail('abdul.ajis@chitraparatama.co.id')).toBe(false)
    expect(isBlockedMinePermitEmail(null)).toBe(false)
    expect(isBlockedMinePermitEmail(undefined)).toBe(false)
  })

  it('excludes abdul.rajab from getMinePermitSiteOptions employees', async () => {
    let options
    try {
      options = await getMinePermitSiteOptions()
    } catch (e) {
      console.warn('DB not reachable, skipping live options test', e)
      return
    }

    const hasAbdulRajab = options.employees.some(
      (emp) => emp.email?.toLowerCase().trim() === 'abdul.rajab@chitraparatama.co.id'
    )
    expect(hasAbdulRajab).toBe(false)
  })

  it('strips abdul.rajab if passed into saveMinePermitSiteConfig', async () => {
    let options
    try {
      options = await getMinePermitSiteOptions()
    } catch (e) {
      console.warn('DB not reachable, skipping live options test', e)
      return
    }

    if (!options?.sites?.length) return
    const testSite = options.sites[0]

    // Attempt to save abdul.rajab as recipient and CC
    await saveMinePermitSiteConfig({
      siteId: testSite.id,
      intervalDays: 7,
      reminderDays: 30,
      recipientEmails: ['abdul.rajab@chitraparatama.co.id'],
      ccEmails: ['abdul.rajab@chitraparatama.co.id'],
      additionalCcEmails: 'abdul.rajab@chitraparatama.co.id, other@chitraparatama.co.id',
      isActive: true,
    })

    const cfg = await getMinePermitSiteConfig(testSite.id)
    expect(cfg.recipientEmails).not.toContain('abdul.rajab@chitraparatama.co.id')
    expect(cfg.ccEmails).not.toContain('abdul.rajab@chitraparatama.co.id')
    expect(cfg.additionalCcEmails).not.toContain('abdul.rajab@chitraparatama.co.id')
    expect(cfg.additionalCcEmails).toBe('other@chitraparatama.co.id')
  })
})
