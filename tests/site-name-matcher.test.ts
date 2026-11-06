import { matchesSiteName, toYearMonthString, normalizeSiteName } from '@/lib/safety-dashboard/site-name-matcher'

describe('site-name-matcher', () => {
  test('toYearMonthString converts various date formats', () => {
    expect(toYearMonthString('2026-08-01')).toBe('2026-08')
    expect(toYearMonthString('2026-08-15T00:00:00.000Z')).toBe('2026-08')
    expect(toYearMonthString(new Date(2026, 7, 10))).toBe('2026-08')
    expect(toYearMonthString('2026-08')).toBe('2026-08')
    expect(toYearMonthString(null)).toBe('')
  })

  test('normalizeSiteName cleans punctuation and noise prefixes', () => {
    expect(normalizeSiteName('PT. BUMA Tanjung')).toBe('buma tanjung')
    expect(normalizeSiteName('Site BUMA - Tanjung')).toBe('buma tanjung')
    expect(normalizeSiteName('PT SMJ - Berau')).toBe('smj berau')
  })

  test('matchesSiteName matches exact, normalized, tokenized and location variations', () => {
    expect(matchesSiteName('BUMA Tanjung', 'BUMA Tanjung')).toBe(true)
    expect(matchesSiteName('Site BUMA Tanjung', 'BUMA Tanjung')).toBe(true)
    expect(matchesSiteName('BUMA - Tanjung', 'BUMA Tanjung')).toBe(true)
    expect(matchesSiteName('PT. BUMA Tanjung Adaro', 'BUMA Tanjung')).toBe(true)
    expect(matchesSiteName('BUMA Tanjung', 'BUMA TANJUNG')).toBe(true)
    expect(matchesSiteName('Tanjung', 'BUMA Tanjung', 'Tanjung')).toBe(true)
    expect(matchesSiteName('SMJ Berau', 'PT SMJ - Berau')).toBe(true)
  })
})
