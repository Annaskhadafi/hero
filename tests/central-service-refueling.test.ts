import {
  submitRefuelingLog,
  getRefuelingLogs,
  getRefuelingSummaryKPI,
  importRefuelingGFormRecords,
  deleteRefuelingLog,
} from '@/app/actions/central-service-refueling'

describe('Central Service Re-Fueling Actions', () => {
  let createdLogId: number | null = null

  it('should submit a new refueling log record to database', async () => {
    const res = await submitRefuelingLog({
      siteName: 'CK MHU',
      driverName: 'Test Driver',
      refuelDate: '2026-09-17',
      unitNumber: 'CP-06',
      odometerKm: 45138,
      fuelExpenditureType: 'Di bebankan ke PT Chitra Paratama (Internal)',
      fuelAmountLiters: '25.50',
      fuelmanName: 'Wahid',
      remarks: 'UAT testing submission',
    })

    expect(res.success).toBe(true)
    expect(res.data).toBeDefined()
    if (res.data) {
      createdLogId = res.data.id
      expect(res.data.siteName).toBe('CK MHU')
      expect(res.data.unitNumber).toBe('CP-06')
      expect(Number(res.data.fuelAmountLiters)).toBe(25.5)
    }
  })

  it('should query refueling logs with site filter', async () => {
    const res = await getRefuelingLogs({
      siteName: 'CK MHU',
      search: 'Test Driver',
    })

    expect(res.success).toBe(true)
    expect(Array.isArray(res.data)).toBe(true)
    const match = res.data.find((r) => r.driverName === 'Test Driver')
    expect(match).toBeDefined()
  })

  it('should calculate KPI summary metrics', async () => {
    const kpi = await getRefuelingSummaryKPI({
      siteName: 'CK MHU',
    })

    expect(kpi.totalRecords).toBeGreaterThanOrEqual(1)
    expect(kpi.totalLiters).toBeGreaterThanOrEqual(25.5)
  })

  it('should batch import Google Form historical records', async () => {
    const batchData = [
      {
        siteName: 'CK BMB',
        driverName: 'Imported Driver 1',
        refuelDate: '2026-09-15',
        unitNumber: 'CP-02',
        odometerKm: 100645,
        fuelAmountLiters: 25,
        fuelmanName: 'Alian',
        fuelExpenditureType: 'Di bebankan ke PT Chitra Paratama (Internal)',
        remarks: 'Historical import 1',
      },
      {
        siteName: 'CK BMB',
        driverName: 'Imported Driver 2',
        refuelDate: '2026-09-16',
        unitNumber: 'CP-05',
        odometerKm: 101204,
        fuelAmountLiters: 30,
        fuelmanName: 'Dendi',
        fuelExpenditureType: 'Di bebankan ke Customer (External)',
        remarks: 'Historical import 2',
      },
    ]

    const res = await importRefuelingGFormRecords(batchData)
    expect(res.success).toBe(true)
    expect(res.insertedCount).toBe(2)
  })

  it('should clean up the test record', async () => {
    if (createdLogId) {
      const del = await deleteRefuelingLog(createdLogId)
      expect(del.success).toBe(true)
    }

    const imported = await getRefuelingLogs({ search: 'Imported Driver' })
    if (imported.success && imported.data) {
      for (const r of imported.data) {
        await deleteRefuelingLog(r.id)
      }
    }
  })
})
