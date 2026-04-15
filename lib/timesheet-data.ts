export const timesheetSummary = {
  period: "April 2026 • Week 2",
  site: "Bengalon Pit North",
  regularHours: 824,
  overtimeHours: 126.5,
  overtimeCost: "Rp 28.450.000",
  pendingReview: 9,
  approvedEmployees: 31,
};

export const timesheetCrew = [
  {
    name: "Arman Saputra",
    role: "Technician",
    regularHours: "44 jam",
    overtimeHours: "8.5 jam",
    overtimeType: "Hari kerja",
    estimatedPay: "Rp 1.245.000",
    status: "Ready for payroll",
  },
  {
    name: "Fikri Maulana",
    role: "Technician",
    regularHours: "42 jam",
    overtimeHours: "2 jam",
    overtimeType: "Hari kerja",
    estimatedPay: "Rp 280.000",
    status: "Pending approval",
  },
  {
    name: "Soni Darmawan",
    role: "HSE Officer",
    regularHours: "45 jam",
    overtimeHours: "0 jam",
    overtimeType: "-",
    estimatedPay: "Rp 0",
    status: "Ready for payroll",
  },
  {
    name: "Mira Andini",
    role: "Admin Site",
    regularHours: "40 jam",
    overtimeHours: "1.5 jam",
    overtimeType: "Hari kerja",
    estimatedPay: "Rp 210.000",
    status: "Need correction",
  },
];

export const overtimeRules = [
  {
    label: "Hari kerja",
    multiplier: "1.5x / jam",
    note: "Melebihi jam kerja normal setelah approval level 1",
  },
  {
    label: "Hari libur",
    multiplier: "2x / jam",
    note: "Berlaku untuk jadwal non-reguler atau roster khusus",
  },
  {
    label: "Libur nasional",
    multiplier: "3x / jam",
    note: "Dipakai pada tanggal merah nasional yang aktif di sistem",
  },
];

export const exportQueue = [
  {
    id: "PAY-APR-BPN-01",
    label: "Payroll support bengalon week 2",
    format: "Excel",
    status: "Ready",
    updatedAt: "14:25",
  },
  {
    id: "TS-APR-BPN-02",
    label: "Supervisor timesheet recap",
    format: "PDF",
    status: "Waiting final approval",
    updatedAt: "13:40",
  },
  {
    id: "OT-APR-BPN-03",
    label: "Overtime detail by employee",
    format: "Excel",
    status: "Need correction",
    updatedAt: "12:55",
  },
];
