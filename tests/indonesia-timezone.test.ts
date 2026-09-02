import {
  INDONESIA_TIMEZONES,
  inferTimezoneFromLocation,
  normalizeIndonesiaTimezone,
  resolveTimezoneIana,
  resolveTimezoneCode,
  getTimezoneDateParts,
  getTimezoneDayBoundaries,
  formatTimeHHMMInTimezone,
  derivePeriodAndDayInTimezone,
} from '@/lib/indonesia-timezone'
import {
  calculateAttendancePunctuality,
  inferShiftCodeForEvent,
  normalizeSiteAttendanceClockConfig,
} from '@/lib/timesheet/attendance-punctuality'

describe('Indonesia Timezone Module', () => {
  it('has valid metadata for WIB, WITA, and WIT', () => {
    expect(INDONESIA_TIMEZONES.WIB.code).toBe('WIB')
    expect(INDONESIA_TIMEZONES.WIB.offsetHours).toBe(7)
    expect(INDONESIA_TIMEZONES.WIB.iana).toBe('Asia/Jakarta')

    expect(INDONESIA_TIMEZONES.WITA.code).toBe('WITA')
    expect(INDONESIA_TIMEZONES.WITA.offsetHours).toBe(8)
    expect(INDONESIA_TIMEZONES.WITA.iana).toBe('Asia/Makassar')

    expect(INDONESIA_TIMEZONES.WIT.code).toBe('WIT')
    expect(INDONESIA_TIMEZONES.WIT.offsetHours).toBe(9)
    expect(INDONESIA_TIMEZONES.WIT.iana).toBe('Asia/Jayapura')
  })

  it('infers timezones automatically from provinces, regencies, and site locations', () => {
    // WIB Regions
    expect(inferTimezoneFromLocation('DKI Jakarta')).toBe('WIB')
    expect(inferTimezoneFromLocation('Jawa Barat, Bandung')).toBe('WIB')
    expect(inferTimezoneFromLocation('Sumatera Utara, Medan')).toBe('WIB')
    expect(inferTimezoneFromLocation('Kalimantan Barat, Pontianak')).toBe('WIB')
    expect(inferTimezoneFromLocation('Kalimantan Tengah, Palangkaraya')).toBe('WIB')
    expect(inferTimezoneFromLocation('Bangka Belitung')).toBe('WIB')
    expect(inferTimezoneFromLocation('Riau, Pekanbaru')).toBe('WIB')

    // WITA Regions
    expect(inferTimezoneFromLocation('Kalimantan Timur, Balikpapan')).toBe('WITA')
    expect(inferTimezoneFromLocation('Kalimantan Selatan, Banjarmasin')).toBe('WITA')
    expect(inferTimezoneFromLocation('Kalimantan Utara, Tarakan')).toBe('WITA')
    expect(inferTimezoneFromLocation('Sulawesi Selatan, Makassar')).toBe('WITA')
    expect(inferTimezoneFromLocation('Sulawesi Tengah, Morowali Site')).toBe('WITA')
    expect(inferTimezoneFromLocation('Bali, Denpasar')).toBe('WITA')
    expect(inferTimezoneFromLocation('Nusa Tenggara Barat, Sumbawa')).toBe('WITA')
    expect(inferTimezoneFromLocation('Nusa Tenggara Timur, Kupang')).toBe('WITA')

    // WIT Regions
    expect(inferTimezoneFromLocation('Papua, Jayapura')).toBe('WIT')
    expect(inferTimezoneFromLocation('Papua Barat, Manokwari')).toBe('WIT')
    expect(inferTimezoneFromLocation('Maluku, Ambon')).toBe('WIT')
    expect(inferTimezoneFromLocation('Maluku Utara, Halmahera')).toBe('WIT')
    expect(inferTimezoneFromLocation('Papua Pegunungan, Wamena')).toBe('WIT')

    // Fallback
    expect(inferTimezoneFromLocation('Unknown Location')).toBe('WITA')
  })

  it('formats time and extracts date parts correctly per timezone', () => {
    // 08:00 WIB = 01:00 UTC
    const wibEightAm = new Date('2026-04-15T01:00:00.000Z')
    expect(formatTimeHHMMInTimezone(wibEightAm, 'WIB')).toBe('08:00')
    expect(formatTimeHHMMInTimezone(wibEightAm, 'WITA')).toBe('09:00')
    expect(formatTimeHHMMInTimezone(wibEightAm, 'WIT')).toBe('10:00')

    // 08:00 WITA = 00:00 UTC
    const witaEightAm = new Date('2026-04-15T00:00:00.000Z')
    expect(formatTimeHHMMInTimezone(witaEightAm, 'WIB')).toBe('07:00')
    expect(formatTimeHHMMInTimezone(witaEightAm, 'WITA')).toBe('08:00')
    expect(formatTimeHHMMInTimezone(witaEightAm, 'WIT')).toBe('09:00')

    // 08:00 WIT = 23:00 UTC prev day
    const witEightAm = new Date('2026-04-14T23:00:00.000Z')
    expect(formatTimeHHMMInTimezone(witEightAm, 'WIB')).toBe('06:00')
    expect(formatTimeHHMMInTimezone(witEightAm, 'WITA')).toBe('07:00')
    expect(formatTimeHHMMInTimezone(witEightAm, 'WIT')).toBe('08:00')
  })

  it('computes day boundaries accurately for database queries in all three timezones', () => {
    const sampleDate = new Date('2026-06-10T12:00:00.000Z')

    const wibBoundaries = getTimezoneDayBoundaries(sampleDate, 'WIB')
    expect(wibBoundaries.startOfDay.toISOString()).toBe('2026-06-09T17:00:00.000Z')
    expect(wibBoundaries.startOfNextDay.toISOString()).toBe('2026-06-10T17:00:00.000Z')

    const witaBoundaries = getTimezoneDayBoundaries(sampleDate, 'WITA')
    expect(witaBoundaries.startOfDay.toISOString()).toBe('2026-06-09T16:00:00.000Z')
    expect(witaBoundaries.startOfNextDay.toISOString()).toBe('2026-06-10T16:00:00.000Z')

    const witBoundaries = getTimezoneDayBoundaries(sampleDate, 'WIT')
    expect(witBoundaries.startOfDay.toISOString()).toBe('2026-06-09T15:00:00.000Z')
    expect(witBoundaries.startOfNextDay.toISOString()).toBe('2026-06-10T15:00:00.000Z')
  })

  it('calculates attendance punctuality adhering to the configured site timezone', () => {
    // 08:00:00 WIB (01:00:00Z)
    const punchAt0800WIB = new Date('2026-05-20T01:00:00.000Z')

    // Evaluated for WIB site -> On Time (0 late minutes)
    const wibResult = calculateAttendancePunctuality({
      eventTime: punchAt0800WIB,
      shiftCode: 'DS',
      scheduledClockIn: '08:00',
      timeZone: 'WIB',
    })
    expect(wibResult.isLate).toBe(false)
    expect(wibResult.lateMinutes).toBe(0)
    expect(wibResult.note).toContain('Tepat waktu')

    // Evaluated for WITA site (01:00:00Z is 09:00 WITA) -> 60 minutes late
    const witaResult = calculateAttendancePunctuality({
      eventTime: punchAt0800WIB,
      shiftCode: 'DS',
      scheduledClockIn: '08:00',
      timeZone: 'WITA',
    })
    expect(witaResult.isLate).toBe(true)
    expect(witaResult.lateMinutes).toBe(60)

    // Evaluated for WIT site (01:00:00Z is 10:00 WIT) -> 120 minutes late
    const witResult = calculateAttendancePunctuality({
      eventTime: punchAt0800WIB,
      shiftCode: 'DS',
      scheduledClockIn: '08:00',
      timeZone: 'WIT',
    })
    expect(witResult.isLate).toBe(true)
    expect(witResult.lateMinutes).toBe(120)
  })

  it('dynamically adapts clock-in and punctuality when a site switches from WITA to WIB', () => {
    // Punch happened at 08:00 WIB (01:00:00Z)
    const rawPunchUTC = new Date('2026-05-20T01:00:00.000Z')

    // 1. When site was configured as WITA:
    const beforeSwitchFormat = formatTimeHHMMInTimezone(rawPunchUTC, 'WITA')
    const beforeSwitchPunctuality = calculateAttendancePunctuality({
      eventTime: rawPunchUTC,
      shiftCode: 'DS',
      scheduledClockIn: '08:00',
      timeZone: 'WITA',
    })
    expect(beforeSwitchFormat).toBe('09:00')
    expect(beforeSwitchPunctuality.isLate).toBe(true)
    expect(beforeSwitchPunctuality.lateMinutes).toBe(60)

    // 2. When admin switches site to WIB:
    const afterSwitchFormat = formatTimeHHMMInTimezone(rawPunchUTC, 'WIB')
    const afterSwitchPunctuality = calculateAttendancePunctuality({
      eventTime: rawPunchUTC,
      shiftCode: 'DS',
      scheduledClockIn: '08:00',
      timeZone: 'WIB',
    })
    expect(afterSwitchFormat).toBe('08:00')
    expect(afterSwitchPunctuality.isLate).toBe(false)
    expect(afterSwitchPunctuality.lateMinutes).toBe(0)
  })
})
