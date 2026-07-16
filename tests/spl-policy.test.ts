import {
  DEFAULT_SPL_POLICY,
  classifySplCategory,
  normalizeSplPolicy,
  sixOneOffCreditMinutes,
  validateSplRequestWindow,
} from '@/lib/spl-policy'

describe('SPL policy', () => {
  it('keeps site defaults editable and bounded', () => {
    expect(normalizeSplPolicy({ dayShiftBreak: { start: '12:30', end: '13:30' } }).dayShiftBreak).toEqual({ start: '12:30', end: '13:30' })
    expect(normalizeSplPolicy({ minimumMinutes: 0 }).minimumMinutes).toBe(60)
  })

  it('enforces one hour and H+2', () => {
    const base = {
      workDate: new Date('2026-07-10T00:00:00+08:00'),
      plannedStartAt: new Date('2026-07-10T12:00:00+08:00'),
      plannedEndAt: new Date('2026-07-10T13:00:00+08:00'),
      policy: DEFAULT_SPL_POLICY,
    }
    expect(validateSplRequestWindow({ ...base, now: new Date('2026-07-12T23:00:00+08:00') })).toBeNull()
    expect(validateSplRequestWindow({ ...base, now: new Date('2026-07-13T00:00:00+08:00') })).toContain('H+2')
    expect(validateSplRequestWindow({ ...base, plannedEndAt: new Date('2026-07-10T12:59:00+08:00'), now: new Date('2026-07-10T10:00:00+08:00') })).toContain('minimal 60')
  })

  it('classifies OFF and DS/NS break automatically', () => {
    expect(classifySplCategory({ scheduleCode: 'OFF', shiftCode: 'DS', plannedStartAt: new Date('2026-07-10T08:00:00+08:00'), plannedEndAt: new Date('2026-07-10T09:00:00+08:00'), policy: DEFAULT_SPL_POLICY })).toBe('off_day')
    expect(classifySplCategory({ scheduleCode: 'DS', shiftCode: 'DS', plannedStartAt: new Date('2026-07-10T12:00:00+08:00'), plannedEndAt: new Date('2026-07-10T13:00:00+08:00'), policy: DEFAULT_SPL_POLICY })).toBe('break')
    expect(classifySplCategory({ scheduleCode: 'NS', shiftCode: 'NS', plannedStartAt: new Date('2026-07-11T00:00:00+08:00'), plannedEndAt: new Date('2026-07-11T01:00:00+08:00'), policy: DEFAULT_SPL_POLICY })).toBe('break')
  })

  it('credits 6 or 11 hours for roster 6:1 OFF', () => {
    expect(sixOneOffCreditMinutes(12)).toBe(360)
    expect(sixOneOffCreditMinutes(13)).toBe(660)
  })
})
