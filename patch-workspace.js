const fs = require('fs');
const file = 'd:/[01] PROJECT/HERO/components/scheduling-timesheet-workspace.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix target 1
const re1 = /const hol = holidaysByDay\.get\(day\)\s+\? siteConfig\.lokasiKhususRateStaff\s+: siteConfig\.lokasiKhususRateNonStaff\s+}\s+}\s+continue\s+}/;

const replacement1 = `const hol = holidaysByDay.get(day)

                                              const isRosterOff2 = code === 'OFF' || code === 'Libur'
                                              const isNationalHoliday2 = Boolean(hol)
                                              const isWorkDay2 = !isRosterOff2
                                              const isAbsent2 =
                                                cell.status === 'leave' ||
                                                cell.status === 'sick' ||
                                                cell.status === 'absent'
                                              const isEmptyWorkDay2 =
                                                isWorkDay2 &&
                                                !isNationalHoliday2 &&
                                                code !== 'ST' &&
                                                cell.status === 'empty'
                                              const noAllowance2 = isAbsent2 || isEmptyWorkDay2 || code === 'FB'

                                              if (attendanceView === 'lokasi') {
                                                if (siteConfig.lokasiKhususEnabled) {
                                                  const isFbPeriodLokasi =
                                                    fieldBreakDaysByEmployee
                                                      .get(row.employee.id)
                                                      ?.has(day) ?? false
                                                  if (!isFbPeriodLokasi && !noAllowance2) {
                                                    const isStaffSummary = isStaffRole(
                                                      row.employee.role
                                                    )
                                                    total += isStaffSummary
                                                      ? siteConfig.lokasiKhususRateStaff
                                                      : siteConfig.lokasiKhususRateNonStaff
                                                  }
                                                }
                                                continue
                                              }`;
if (re1.test(content)) {
    content = content.replace(re1, replacement1);
    console.log('Fixed block 1');
} else {
    console.log('Target 1 not found');
}

// Fix target 2
const re2 = /if \(attendanceView === 'msa'\) {\s+total \+=\s+siteConfig\.msaType === 'none'/;
const replacement2 = `if (attendanceView === 'msa') {
                                                const profile = employeeProfiles[row.employee.id] ?? { isLokal: false }
                                                total +=
                                                  siteConfig.msaType === 'none' || profile.isLokal`;

if (re2.test(content)) {
    content = content.replace(re2, replacement2);
    console.log('Fixed block 2');
} else {
    console.log('Target 2 not found');
}

fs.writeFileSync(file, content);
