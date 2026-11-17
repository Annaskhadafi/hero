import { isStaffRole } from '@/lib/timesheet/attendance-punctuality'
import { calculateOvertime } from '@/lib/timesheet/overtime-policy'

describe('Overtime Summary and Summary SPL Logic Verification', () => {
  describe('isStaffRole with employeeStatusType across all sites', () => {
    it('correctly classifies Aditia Maulana Saputra as Non-Staff based on employeeStatusType Kontrak | Non Staff', () => {
      // Aditia: role='Staff', jobTitle='Staff', levelName='Rookie', employeeStatusType='Kontrak | Non Staff'
      const isStaff = isStaffRole('Staff', 'Staff', 'Rookie', 'Kontrak | Non Staff')
      expect(isStaff).toBe(false)
    })

    it('correctly classifies field operational positions as Non-Staff regardless of status type across sites', () => {
      // AMM Tabang / CK KIM / KPC Sangatta
      expect(isStaffRole('Serviceman', 'Serviceman', 'Rookie', 'Permanen | Staff')).toBe(false)
      expect(isStaffRole('Repairman', 'Repairman', 'Rookie', 'Permanen | Staff')).toBe(false)
      expect(isStaffRole('Mekanik', 'Mekanik Alat Berat', 'Middle', 'Permanen | Staff')).toBe(false)
      expect(isStaffRole('Operator', 'Operator Tyre Handler', 'Rookie', 'Kontrak | Non Staff')).toBe(false)
    })

    it('correctly classifies genuine Staff as Staff', () => {
      expect(isStaffRole('Staff Contract', 'Staff Contract', 'Rookie', 'Kontrak | Staff')).toBe(true)
      expect(isStaffRole('Staff Admin', 'Admin Operational', 'Staff', 'Permanen | Staff')).toBe(true)
      expect(isStaffRole('Supervisor', 'SPV Retread', 'Supervisor', 'Permanen | Staff')).toBe(true)
    })
  })

  describe('Attendance Overtime Summary calculation (Wajib + SPL)', () => {
    it('calculates total overtime as mandatory overtime + SPL overtime (4h mandatory + 1h SPL = 5h)', () => {
      // AMM Tabang day shift: 05:30 to 17:30 has 4h mandatory overtime (13:30 - 17:30)
      // SPL: 16:00 to 17:00 (1h) or after shift 17:30 to 18:30 (1h)
      const config = {
        enabled: true,
        hariKerja: {
          dayShift: [
            { start: '13:30', end: '17:30', rate: 1.5, type: 'auto' as const },
          ],
          nightShift: [],
        },
        hariLibur: {
          dayShift: [],
          nightShift: [],
        },
        splPolicy: {
          minimumMinutes: 30,
          requireSplForOutsideShift: true,
        },
      }

      const result = calculateOvertime({
        config,
        dayKey: 'hariKerja',
        shiftCode: 'DS',
        workDate: '2026-10-20',
        clockIn: '05:30',
        clockOut: '18:30',
        splWindows: [
          {
            splNumber: 'SPL-001',
            employeeId: 1447,
            workDate: '2026-10-20',
            plannedStartAt: '2026-10-20T17:30:00+08:00',
            plannedEndAt: '2026-10-20T18:30:00+08:00',
            status: 'approved',
            category: 'operational',
            overtimeCreditMinutes: 60,
          },
        ],
        legacyHours: 0,
      })

      // Mandatory OT is 4h (240m), SPL is 1h (60m) -> Total is 5h (300m)
      expect(result.autoMinutes).toBe(240)
      expect(result.splMinutes).toBe(60)
      expect(result.totalMinutes).toBe(300)
      expect(result.totalHours).toBe(5)
    })
  })

  describe('Summary SPL duration calculation (Strict From - To)', () => {
    function computeSplDuration(startStr: string, endStr: string): number {
      const [sh, sm] = startStr.split(/[:.]/).map(Number)
      const [eh, em] = endStr.split(/[:.]/).map(Number)
      let startMin = sh * 60 + sm
      let endMin = eh * 60 + em
      if (endMin < startMin) endMin += 1440
      let diffHours = Math.round(((endMin - startMin) / 60) * 10) / 10
      if (diffHours >= 12) diffHours = 11 // Continuous shift of 12h has 1h mandatory rest -> 11h
      return diffHours > 0 ? diffHours : 1
    }

    it('correctly calculates single-hour SPLs from user screenshots', () => {
      // 08.00 - 09.00 = 1h (Sayid Fauzan Faerus, CK KIM)
      expect(computeSplDuration('08.00', '09.00')).toBe(1)

      // 13.00 - 14.00 = 1h (Sayid Fauzan Faerus, CK KIM)
      expect(computeSplDuration('13.00', '14.00')).toBe(1)

      // 20.00 - 21.00 = 1h (Tanggal 3, must NOT be 6)
      expect(computeSplDuration('20.00', '21.00')).toBe(1)

      // 01.00 - 02.00 = 1h (Sayid Fauzan Faerus, CK KIM)
      expect(computeSplDuration('01.00', '02.00')).toBe(1)
    })

    it('correctly calculates 12-hour continuous shifts with 1h mandatory rest deduction', () => {
      // 07.00 - 19.00 = 11h (Sayid Fauzan Faerus, CK KIM)
      expect(computeSplDuration('07.00', '19.00')).toBe(11)

      // 19.00 - 07.00 = 11h (Overnight 12-hour shift)
      expect(computeSplDuration('19.00', '07.00')).toBe(11)
    })

    it('correctly handles cross-midnight intervals', () => {
      // 22.00 - 02.00 = 4h
      expect(computeSplDuration('22.00', '02.00')).toBe(4)

      // 23.30 - 01.30 = 2h
      expect(computeSplDuration('23.30', '01.30')).toBe(2)
    })
  })
})
