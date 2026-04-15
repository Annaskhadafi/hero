export const dailyReportSummary = {
  site: "Bengalon Pit North",
  customer: "PT Kaltim Prima Energi",
  date: "13 April 2026",
  contract: "CP-CS-2026-014",
  manpowerPresent: 18,
  manpowerLeave: 2,
  jobsCompleted: 12,
  hseStatus: "Zero incident",
};

export const dailyReportSections = [
  {
    title: "Ringkasan manpower",
    description: "18 hadir, 1 izin, 1 sakit, 0 alpha",
    status: "Ready",
  },
  {
    title: "Summary pekerjaan",
    description: "12 aktivitas approved dari Tire Service, Inspection, HSE Patrol",
    status: "Ready",
  },
  {
    title: "Foto dokumentasi",
    description: "6 foto terpilih dari aktivitas prioritas hari ini",
    status: "Ready",
  },
  {
    title: "Tanda tangan digital",
    description: "PJO site siap, customer signature masih pending",
    status: "Waiting",
  },
] as const;

export const reportActivities = [
  {
    unit: "HD785-17",
    service: "Tire Service",
    technician: "Arman Saputra",
    time: "08:05 - 13:55",
    status: "Emergency",
  },
  {
    unit: "DT-23 s/d DT-28",
    service: "Tire Inspection",
    technician: "Fikri Maulana",
    time: "09:10 - 11:42",
    status: "Normal",
  },
  {
    unit: "Pit North Area",
    service: "HSE Patrol",
    technician: "Soni Darmawan",
    time: "11:05 - 14:10",
    status: "Safety",
  },
  {
    unit: "Site manpower",
    service: "Daily Recap",
    technician: "Mira Andini",
    time: "12:30 - 14:03",
    status: "Normal",
  },
];

export const reportExports = [
  {
    id: "RPT-BPN-2026-04-13",
    format: "PDF",
    destination: "Customer email + arsip S3",
    status: "Ready to generate",
  },
  {
    id: "RPTX-BPN-2026-04-13",
    format: "Excel",
    destination: "Internal operations recap",
    status: "Ready to generate",
  },
];
