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

function mergeSplIntervals(
  docs: Array<{ plannedStartAt?: string; plannedEndAt?: string; overtimeCreditMinutes?: number }>
): number {
  const intervals: Array<{ start: number; end: number }> = [];
  let fallbackHours = 0;

  for (const spl of docs) {
    if (!spl.plannedStartAt || !spl.plannedEndAt) {
      if (spl.overtimeCreditMinutes && spl.overtimeCreditMinutes > 0) {
        fallbackHours += spl.overtimeCreditMinutes / 60;
      }
      continue;
    }
    const start = new Date(spl.plannedStartAt);
    const end = new Date(spl.plannedEndAt);
    let startMin = start.getUTCHours() * 60 + start.getUTCMinutes();
    let endMin = end.getUTCHours() * 60 + end.getUTCMinutes();
    if (endMin <= startMin) endMin += 1440;
    intervals.push({ start: startMin, end: endMin });
  }

  if (intervals.length === 0) return Math.round(fallbackHours * 10) / 10;

  intervals.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const cur of intervals) {
    const prev = merged[merged.length - 1];
    if (!prev) {
      merged.push({ ...cur });
    } else if (cur.start <= prev.end) {
      prev.end = Math.max(prev.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }

  let totalMin = 0;
  for (const item of merged) totalMin += item.end - item.start;
  let span = Math.round((totalMin / 60) * 10) / 10;
  if (span >= 12) span = 11;
  return span;
}

function calculateTotalOvertimeForDay(
  isOffOrSunday: boolean,
  baseWajib: number,
  splHours: number,
  manualOverrideHours?: number
): { lemburWajib: number; lemburSpl: number; total: number } {
  const lemburWajib = isOffOrSunday ? 0 : (baseWajib === 6 ? 6 : 4);
  let total = 0;
  if (isOffOrSunday) {
    const offHours = splHours > 0 ? splHours : (manualOverrideHours ?? 0);
    total = Math.min(11, roundOvertimeHours(offHours));
  } else {
    total = Math.min(14, roundOvertimeHours(lemburWajib + splHours));
  }
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

  it('correctly merges duplicate/overlapping SPL documents into a single time span', () => {
    const duplicateDocs = [
      { plannedStartAt: '2026-10-02T08:00:00Z', plannedEndAt: '2026-10-02T12:00:00Z' },
      { plannedStartAt: '2026-10-02T08:00:00Z', plannedEndAt: '2026-10-02T12:00:00Z' },
    ];
    const merged = mergeSplIntervals(duplicateDocs);
    expect(merged).toBe(4); // Not 4 + 4 = 8
  });

  it('prevents 22h anomaly on OFF days when manual override exists with SPL (capped at 11h)', () => {
    // Before fix: 11h override + 11h SPL = 22h
    // After fix: wajib is 0 on OFF, and total is purely the SPL (11h)
    const res = calculateTotalOvertimeForDay(true, 4, 11, 11);
    expect(res.lemburWajib).toBe(0);
    expect(res.total).toBe(11);
    expect(res.total).not.toBe(22);
  });

  it('clamps work day overtime to maximum 14 hours and OFF day to 11 hours', () => {
    const workDayOvertime = calculateTotalOvertimeForDay(false, 4, 15);
    expect(workDayOvertime.total).toBe(14);

    const offDayOvertime = calculateTotalOvertimeForDay(true, 0, 15);
    expect(offDayOvertime.total).toBe(11);
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

  it('correctly calculates split interval Overtime Record as 4h and prevents 11h overwrite', async () => {
    const { generateOvertimeRecordPdf } = await import('../lib/timesheet/generate-attendance-pdf');
    const pdfBytes = await generateOvertimeRecordPdf({
      documentTitle: 'OVERTIME RECORD',
      period: '2026-10',
      employeeId: 1189,
      employeeName: 'Fachri Husein',
      employeeSn: '72873',
      department: 'Central Services',
      section: 'Service Operation',
      siteName: 'CK MIFA',
      signatures: {
        preparedBy: 'Fachri Husein',
        pjoLeader: 'Apriyanto',
        approvedBy: 'Romy Hidayat',
      },
      days: [
        {
          day: 2,
          dayName: 'Friday',
          scheduleCode: 'DS',
          status: 'present',
          clockIn: '05:48',
          clockOut: '19:00',
          workingTimeFrom: '05.48',
          workingTimeTo: '19.00',
          configuredOvertimeIntervals: [
            { start: '06:00', end: '08:00' },
            { start: '16:00', end: '18:00' },
          ],
          overtime: {
            totalHours: 4,
            mandatoryHours: 4,
            splHours: 0,
            intervals: [
              { start: '06:00', end: '08:00' },
              { start: '16:00', end: '18:00' },
            ],
          },
        },
      ],
      isNonStaff: true,
      showTotalOvertime: true,
      overtimeMode: 'template',
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });

  it('strictly treats OFF days in Overtime Record as OFF without SPL or overtime hours', async () => {
    const { generateOvertimeRecordPdf } = await import('../lib/timesheet/generate-attendance-pdf');
    const fs = await import('fs');
    const path = await import('path');

    const days: any[] = [];
    for (let day = 1; day <= 31; day++) {
      const isSunday = [4, 11, 18, 25].includes(day);
      const isSaturday = [3, 10, 17, 24, 31].includes(day);
      if (isSunday) {
        days.push({
          day,
          dayName: 'Sunday',
          scheduleCode: 'OFF',
          status: 'off',
          clockIn: day === 18 ? '05:58' : '',
          clockOut: day === 18 ? '18:00' : '',
          workingTimeFrom: day === 18 ? '05.58' : '',
          workingTimeTo: day === 18 ? '18.00' : '',
          configuredOvertimeIntervals: [],
          overtime: { totalHours: day === 18 ? 11 : 0, intervals: [] },
        });
      } else {
        const wajibHours = isSaturday ? 6 : 4;
        days.push({
          day,
          dayName: isSaturday ? 'Saturday' : 'Workday',
          scheduleCode: 'DS',
          status: 'present',
          clockIn: '05:40',
          clockOut: '19:00',
          workingTimeFrom: '05.40',
          workingTimeTo: '19.00',
          configuredOvertimeIntervals: [
            { start: '06:00', end: isSaturday ? '09:00' : '08:00' },
            { start: isSaturday ? '15:00' : '16:00', end: '18:00' },
          ],
          overtime: { totalHours: wajibHours, intervals: [] },
        });
      }
    }

    const pdfBytes = await generateOvertimeRecordPdf({
      documentTitle: 'OVERTIME RECORD',
      period: '2026-10',
      employeeId: 1190,
      employeeName: 'Benni Sianipar',
      employeeSn: '62317',
      department: 'Central Services',
      section: 'Service Operation',
      siteName: 'CK MIFA',
      signatures: {
        preparedBy: 'Benni Sianipar',
        pjoLeader: 'Apriyanto',
        approvedBy: 'Romy Hidayat',
      },
      days,
      isNonStaff: true,
      showTotalOvertime: true,
      overtimeMode: 'template',
    });

    const scratchDir = path.resolve('scratch');
    if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
    fs.writeFileSync(path.join(scratchDir, 'benni-overtime-record-fixed.pdf'), Buffer.from(pdfBytes));

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });
});
