import { normalizeSafetyNumber, normalizeSafetyStatus, parseSafetyDate } from '@/lib/safety-dashboard/parsing'

describe('safety dashboard parsing', () => {
  it('parses workbook numbers with Indonesian and Excel separators', () => {
    expect(normalizeSafetyNumber('1,34')).toBe(1.34)
    expect(normalizeSafetyNumber('2,982,657.00')).toBe(2982657)
    expect(normalizeSafetyNumber('3,760')).toBe(3760)
    expect(normalizeSafetyNumber(null)).toBeNull()
  })

  it('parses workbook dates', () => {
    expect(parseSafetyDate('01-08-2025')?.toLocaleDateString('en-CA')).toBe('2025-01-08')
    expect(parseSafetyDate('15-Sep-25')?.toLocaleDateString('en-CA')).toBe('2025-09-15')
    expect(parseSafetyDate('2026-01-01')?.toLocaleDateString('en-CA')).toBe('2026-01-01')
  })

  it('normalizes certification status', () => {
    expect(normalizeSafetyStatus('aktif')).toBe('AKTIF')
    expect(normalizeSafetyStatus('expired')).toBe('EXPIRED')
    expect(normalizeSafetyStatus('')).toBe('UNKNOWN')
  })
})
