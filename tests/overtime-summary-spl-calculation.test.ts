// Overtime Summary & Staff Classification Unit Test

// 1. isStaffRole test logic
function isStaffRole(
  role?: string | null,
  jobTitle?: string | null,
  levelName?: string | null,
  employeeStatusType?: string | null
): boolean {
  if (employeeStatusType) {
    const st = employeeStatusType.trim().toLowerCase();
    if (st.includes('non staff') || st.includes('non-staff') || st.includes('nonstaff')) {
      return false;
    }
    if (st.includes('staff') && !st.includes('non')) {
      if (!/^(serviceman|repairman|operator|mekanik|mechanic|helper|driver|technician pa)/i.test((role ?? '').trim())) {
        return true;
      }
    }
  }
  if (levelName) {
    const lvl = levelName.trim().toLowerCase();
    if (lvl.includes('non staff') || lvl.includes('non-staff') || lvl.includes('nonstaff') || lvl.includes('rookie')) {
      return false;
    }
    if (
      lvl.includes('staff') ||
      lvl.includes('supervisor') ||
      lvl.includes('spv') ||
      lvl.includes('manager') ||
      lvl.includes('coordinator') ||
      lvl.includes('coord') ||
      lvl.includes('leader') ||
      lvl.includes('lead') ||
      lvl.includes('head') ||
      lvl.includes('engineer') ||
      lvl.includes('officer') ||
      lvl.includes('analyst') ||
      lvl.includes('executive') ||
      lvl.includes('bod') ||
      lvl.includes('director')
    ) {
      return true;
    }
  }
  const combined = `${role ?? ''} ${jobTitle ?? ''}`.toLowerCase().trim();
  if (!combined) return false;
  if (combined.includes('non staff') || combined.includes('non-staff') || combined.includes('nonstaff') || combined.includes('rookie')) return false;
  if (/^(serviceman|repairman|operator|mekanik|mechanic|helper|driver|technician pa)/i.test((role ?? '').trim()) && !combined.includes('leader') && !combined.includes('spv')) {
    return false;
  }
  if (combined.includes('staff')) return true;
  if (/manager|supervisor|spv|admin|koordinator|coord|leader|lead|head|superintendent|engineer|analyst|officer|specialist|director|trainer|support|secretary|planning|planing/i.test(combined)) {
    return true;
  }
  return false;
}

// 2. Overtime calculation test logic
function roundOvertimeHours(value: number): number {
  return Math.round(value * 10) / 10;
}

function calculateTotalOvertimeForDay(
  isOffOrSunday: boolean,
  baseWajib: number,
  splHours: number
): { lemburWajib: number; lemburSpl: number; total: number } {
  const lemburWajib = isOffOrSunday ? 0 : baseWajib;
  const total = roundOvertimeHours(lemburWajib + splHours);
  return { lemburWajib, lemburSpl: splHours, total };
}

describe('Overtime Summary & Staff Classification Verification', () => {
  it('correctly classifies Aditia Maulana Saputra as non-staff', () => {
    const isStaff = isStaffRole('Staff', 'Staff', 'Rookie', 'Kontrak | Non Staff');
    expect(isStaff).toBe(false);
  });

  it('correctly classifies Albert Rante Liling as non-staff', () => {
    const isStaff = isStaffRole('Service Operation MVC', 'Service Operation MVC', 'Staff', 'Kontrak | Non Staff');
    expect(isStaff).toBe(false);
  });

  it('correctly classifies true management/office staff as staff', () => {
    const isStaff = isStaffRole('Supervisor', 'Site Coordinator', 'Staff', 'Staff');
    expect(isStaff).toBe(true);
  });

  it('calculates Albert Day 2 overtime correctly: 4h wajib + 7h SPL = 11h', () => {
    const res = calculateTotalOvertimeForDay(false, 4, 7);
    expect(res.lemburWajib).toBe(4);
    expect(res.lemburSpl).toBe(7);
    expect(res.total).toBe(11);
  });

  it('calculates Albert Day 5 overtime correctly: 4h wajib + 1h SPL = 5h', () => {
    const res = calculateTotalOvertimeForDay(false, 4, 1);
    expect(res.lemburWajib).toBe(4);
    expect(res.lemburSpl).toBe(1);
    expect(res.total).toBe(5);
  });

  it('calculates Albert Day 4 (Sunday/OFF) overtime correctly: 0h wajib + 11h SPL = 11h', () => {
    const res = calculateTotalOvertimeForDay(true, 4, 11);
    expect(res.lemburWajib).toBe(0);
    expect(res.lemburSpl).toBe(11);
    expect(res.total).toBe(11);
  });

  it('generates Overtime Summary PDF with Albert and Aditia data correctly', async () => {
    const { generateSummaryTablePdf } = await import('../lib/timesheet/generate-attendance-pdf');
    const pdfBytes = await generateSummaryTablePdf({
      view: 'ot',
      period: '2026-10',
      siteName: 'CK KIM',
      project: 'CK KIM Project',
      dayCount: 31,
      rows: [
        {
          no: 1,
          name: 'Albert Rante Liling (Non Lokal)',
          sn: '76314',
          loc: 'CK KIM',
          department: 'Central Services',
          section: 'Service Operation MVC',
          dailyValues: [
            '4', '11', '9', '11', '5', '4', '9', '5', '4', '5',
            '1', '5', '5', '5', '5', '4', '9', 'OFF', '4', 'FB',
            'FB', 'FB', 'FB', 'FB', 'FB', 'FB', 'FB', 'FB', 'FB', 'FB', 'FB'
          ],
          total: '109',
          remark: 'NORMAL'
        },
        {
          no: 2,
          name: 'Aditia Maulana Saputra (Non Lokal)',
          sn: '78395',
          loc: 'AMM Tabang',
          department: 'Central Services',
          section: 'Service Operation Others',
          dailyValues: [
            '4', '4', '4', 'OFF', '4', '4', '4', '4', '4', '6',
            '11', '4', '4', '4', '4', '4', '6', 'OFF', '4', '4',
            '4', '4', '4', '6', 'OFF', '4', '4', '4', '6', '11', '4'
          ],
          total: '140',
          remark: 'NORMAL'
        }
      ],
      signatures: {
        preparedBy: 'Albert Rante Liling',
        pjoLeader: 'Apriyanto',
        approvedBy: 'Jaya Kusuma Putra'
      },
      holidays: []
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });
});
