import { buildSafetyCharts, buildSafetyKpis } from '@/lib/safety-dashboard/aggregations'

describe('safety dashboard aggregations', () => {
  it('builds KPI totals from monthly incidents, certifications, weekly activities, and manhours', () => {
    const currentYear = new Date().getFullYear()
    const currentMonth = `${new Date().getMonth() + 1}`.padStart(2, '0')

    const kpis = buildSafetyKpis({
      monthlySummaries: [
        {
          month: `${currentYear}-01-31`,
          fatality: 1,
          lostDayInjury: 2,
          restrictedWorkDayInjury: 0,
          medicalTreatmentCase: 3,
          firstAid: 4,
          propertyDamage: 5,
          nearMissReport: 6,
          environmental: 0,
          totalEvents: 21,
        },
      ],
      certifications: [{ status: 'EXPIRED' }, { status: 'AKTIF' }],
      weeklyActivities: [{ activityDate: `${currentYear}-${currentMonth}-01` }, { activityDate: '2024-01-01' }],
      manHours: [{ workLocation: 'Balikpapan', safetyManHours: '1000' }, { workLocation: 'KPC', safetyManHours: '2500' }],
    })

    expect(kpis.totalIncidentYtd).toBe(21)
    expect(kpis.certificationExpired).toBe(1)
    expect(kpis.weeklyActivitiesThisMonth).toBe(1)
    expect(kpis.safeManHours).toBe(3500)
  })

  it('builds chart rows for incidents and certification statuses', () => {
    const charts = buildSafetyCharts({
      monthlySummaries: [
        {
          month: '2026-01-31',
          fatality: 0,
          lostDayInjury: 1,
          restrictedWorkDayInjury: 0,
          medicalTreatmentCase: 2,
          firstAid: 3,
          propertyDamage: 4,
          nearMissReport: 5,
          environmental: 0,
          totalEvents: 15,
        },
      ],
      certifications: [{ status: 'EXPIRED' }, { status: 'EXPIRED' }, { status: 'AKTIF' }],
      weeklyActivities: [{ activityDate: '2026-01-01', category: 'Audit' }],
      manHours: [{ workLocation: 'Balikpapan', safetyManHours: '1000', safeTarget: '3000' }],
      monthlyManHours: [{ workLocation: 'Balikpapan', month: '2026-01-01', safetyManHours: '100' }],
      performanceMetrics: [
        {
          periodLabel: 'Balikpapan',
          fatalityThreshold: '0',
          fatalityActual: '0',
          ltiThreshold: '0',
          ltiActual: '0',
          propertyDamageThreshold: '3',
          propertyDamageActual: '1',
        },
      ],
    })

    expect(charts.incidentTrend[0]).toMatchObject({ LTI: 1, MTC: 2, Total: 15 })
    expect(charts.certificationStatus).toEqual(expect.arrayContaining([{ name: 'EXPIRED', value: 2 }]))
    expect(charts.manHoursByLocation[0]).toMatchObject({ location: 'Balikpapan', manHours: 1000, target: 3000 })
  })
})
