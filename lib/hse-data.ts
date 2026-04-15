export const hseSummary = {
  site: "Bengalon Pit North",
  shift: "Day Shift • 13 April 2026",
  zeroIncidentDays: 29,
  openObservations: 5,
  patrolCompleted: 3,
  apdCompliance: "94%",
};

export const safetyObservations = [
  {
    id: "OBS-201",
    title: "Blind spot haul road pit north",
    category: "Unsafe Condition",
    location: "Ramp B7",
    reporter: "Soni Darmawan",
    severity: "Medium",
    status: "Open",
    note: "Butuh rambu tambahan dan pembersihan debu pada tikungan tajam.",
  },
  {
    id: "OBS-202",
    title: "Vendor tanpa sarung tangan kerja",
    category: "Unsafe Act",
    location: "Tyre bay 2",
    reporter: "Arman Saputra",
    severity: "Low",
    status: "Action Taken",
    note: "Sudah ditegur dan APD lengkap dipakai ulang sebelum lanjut kerja.",
  },
] as const;

export const patrolChecklist = [
  {
    label: "Area pit north",
    status: "Done",
    note: "Foto dan GPS lengkap",
  },
  {
    label: "Workshop tyre bay",
    status: "Done",
    note: "Temuan APD minor sudah ditutup",
  },
  {
    label: "Fuel station",
    status: "In Progress",
    note: "Menunggu dokumentasi malam shift",
  },
  {
    label: "Parking heavy equipment",
    status: "Scheduled",
    note: "Patrol berikutnya pukul 16:30",
  },
] as const;

export const incidentFeed = [
  {
    id: "INC-031",
    type: "Near miss",
    unit: "HD785-17",
    time: "09:12",
    impact: "No injury",
    status: "Investigating",
  },
  {
    id: "INC-030",
    type: "Property damage",
    unit: "Tyre bay 2",
    time: "Kemarin 16:45",
    impact: "Minor equipment contact",
    status: "Closed",
  },
] as const;

export const apdStatus = [
  {
    team: "Technician",
    compliance: "96%",
    note: "Mayoritas lengkap, hanya 1 teguran gloves",
  },
  {
    team: "HSE",
    compliance: "100%",
    note: "Semua inspeksi dengan APD lengkap",
  },
  {
    team: "Vendor",
    compliance: "88%",
    note: "Perlu pengawasan ketat area tyre bay",
  },
] as const;
