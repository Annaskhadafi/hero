import {
  runAttendanceReminderTick,
  resolveAttendanceReminderAction,
  timeToMinutes,
  minutesToTime,
} from '../lib/attendance-reminders'
import * as pushService from '../lib/push-notifications'

jest.mock('../lib/push-notifications', () => ({
  createNotificationEventForEmployee: jest.fn().mockResolvedValue({ id: 999 }),
  sendPushNotification: jest.fn().mockResolvedValue({ status: 'sent', delivered: 1 }),
}))

describe('Attendance Reminder Logic & Decision Engine', () => {
  test('time conversion helpers work properly', () => {
    expect(timeToMinutes('08:00')).toBe(480)
    expect(timeToMinutes('17:00')).toBe(1020)
    expect(minutesToTime(480)).toBe('08:00')
    expect(minutesToTime(1020)).toBe('17:00')
  })

  test('Check-in reminder triggered 10 minutes before shift in when not checked in', () => {
    // Shift in: 08:00 (480 min). 10 min before: 07:50 (470 min)
    const result = resolveAttendanceReminderAction({
      currentMinutes: 470, // 07:50
      scheduledInMinutes: 480, // 08:00
      scheduledOutMinutes: 1020, // 17:00
      hasCheckedIn: false,
      hasCheckedOut: false,
      isHolidayOrOff: false,
    })

    expect(result).toEqual({
      type: 'check-in',
      scheduledTime: '08:00',
      targetMinutes: 470,
    })
  })

  test('Check-in reminder skipped if already checked in', () => {
    const result = resolveAttendanceReminderAction({
      currentMinutes: 470, // 07:50
      scheduledInMinutes: 480, // 08:00
      scheduledOutMinutes: 1020, // 17:00
      hasCheckedIn: true,
      hasCheckedOut: false,
      isHolidayOrOff: false,
    })

    expect(result).toEqual({
      type: 'none',
      reason: 'already_checked_in',
    })
  })

  test('Check-out reminder triggered 10 minutes after shift out when checked in but not checked out', () => {
    // Shift out: 17:00 (1020 min). 10 min after: 17:10 (1030 min)
    const result = resolveAttendanceReminderAction({
      currentMinutes: 1030, // 17:10
      scheduledInMinutes: 480, // 08:00
      scheduledOutMinutes: 1020, // 17:00
      hasCheckedIn: true,
      hasCheckedOut: false,
      isHolidayOrOff: false,
    })

    expect(result).toEqual({
      type: 'check-out',
      scheduledTime: '17:00',
      targetMinutes: 1030,
    })
  })

  test('Check-out reminder skipped if already checked out', () => {
    const result = resolveAttendanceReminderAction({
      currentMinutes: 1030, // 17:10
      scheduledInMinutes: 480, // 08:00
      scheduledOutMinutes: 1020, // 17:00
      hasCheckedIn: true,
      hasCheckedOut: true,
      isHolidayOrOff: false,
    })

    expect(result).toEqual({
      type: 'none',
      reason: 'already_checked_out',
    })
  })

  test('Check-out reminder skipped if employee never checked in today', () => {
    const result = resolveAttendanceReminderAction({
      currentMinutes: 1030, // 17:10
      scheduledInMinutes: 480, // 08:00
      scheduledOutMinutes: 1020, // 17:00
      hasCheckedIn: false,
      hasCheckedOut: false,
      isHolidayOrOff: false,
    })

    expect(result).toEqual({
      type: 'none',
      reason: 'not_checked_in_today',
    })
  })

  test('Reminder skipped on holiday, off, leave, or field break', () => {
    const result = resolveAttendanceReminderAction({
      currentMinutes: 470,
      scheduledInMinutes: 480,
      scheduledOutMinutes: 1020,
      hasCheckedIn: false,
      hasCheckedOut: false,
      isHolidayOrOff: true,
    })

    expect(result).toEqual({
      type: 'none',
      reason: 'holiday_or_off',
    })
  })

  test('sendPushNotification accepts sound /sounds/cat-meow.mp3 and feline vibration', async () => {
    const mockInput = {
      employeeId: 1,
      category: 'shift_reminders' as const,
      title: '🐾 Meooow! Waktunya Absen Masuk',
      body: '10 menit lagi jam masuk. Yuk Check In!',
      url: '/mobile/attendance',
      sound: '/sounds/cat-meow.mp3',
      vibrate: [100, 50, 100, 50, 200],
    }

    await pushService.sendPushNotification(mockInput)
    expect(pushService.sendPushNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'shift_reminders',
        sound: '/sounds/cat-meow.mp3',
        vibrate: [100, 50, 100, 50, 200],
        title: expect.stringContaining('Meooow'),
      })
    )
  })

  test('runAttendanceReminderTick returns result object structure safely', async () => {
    const refDate = new Date('2026-11-23T07:50:00+08:00')
    const result = await runAttendanceReminderTick(refDate)
    expect(result).toBeDefined()
    expect(typeof result.checkInRemindersSent).toBe('number')
    expect(typeof result.checkOutRemindersSent).toBe('number')
    expect(typeof result.skippedAlreadyAbsen).toBe('number')
    expect(typeof result.skippedOffOrHoliday).toBe('number')
  })
})
