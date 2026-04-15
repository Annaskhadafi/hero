export const activityHubViews = [
  {
    label: "My Day",
    description: "View teknisi untuk check-in, update progres, dan submit shift.",
    href: "/dashboard/activity-hub/my-day",
  },
  {
    label: "Team Board",
    description: "View foreman untuk pantau tim, approval, dan job site hari ini.",
    href: "/dashboard/activity-hub/team-board",
  },
] as const;

export const myDaySummary = {
  site: "Bengalon Pit North",
  shift: "Day Shift • 07:00 - 17:00",
  weather: "Cerah berdebu",
  signal: "4G terbatas",
  jobsAssigned: 4,
  jobsCompleted: 2,
  pointsToday: 35,
  currentLevel: "Skilled",
  syncAt: "14:12 WITA",
};

export const myDayJobs = [
  {
    id: "JOB-201",
    status: "In Progress",
    title: "Pemasangan ban OTR unit HD785",
    unit: "HD785-17",
    type: "Tire Service",
    window: "08:00 - 10:30",
    lead: "Foreman Rian",
    note: "Prioritas tinggi, foto sebelum dan sesudah wajib.",
  },
  {
    id: "JOB-202",
    status: "Queued",
    title: "Inspeksi rutin tekanan ban dump truck",
    unit: "DT-23 sampai DT-28",
    type: "Tire Inspection",
    window: "10:30 - 12:00",
    lead: "Foreman Rian",
    note: "Input tekanan aktual per unit dan tandai abnormal.",
  },
  {
    id: "JOB-203",
    status: "Waiting Submit",
    title: "Analisa kerusakan rim excavator",
    unit: "EX1200-04",
    type: "Technical Engineering",
    window: "13:00 - 15:00",
    lead: "Engineer Site",
    note: "Lampirkan rekomendasi tindak lanjut.",
  },
];

export const myDayTimeline = [
  {
    time: "06:48",
    title: "Check-in area site",
    detail: "GPS valid • selfie attendance berhasil",
  },
  {
    time: "08:05",
    title: "Mulai JOB-201",
    detail: "Unit HD785-17 • status Emergency",
  },
  {
    time: "10:18",
    title: "Upload 2 foto dokumentasi",
    detail: "Foto berhasil dikompresi dan tersimpan",
  },
  {
    time: "13:22",
    title: "Toolbox meeting siang",
    detail: "Topik: APD & area blind spot haul road",
  },
] as const;

export const teamBoardSummary = {
  activeWorkers: 18,
  checkedIn: 16,
  pendingApproval: 6,
  emergencyJobs: 2,
  overtimeCandidates: 4,
};

export const teamMembers = [
  {
    name: "Arman Saputra",
    role: "Technician",
    currentJob: "Pemasangan ban OTR HD785-17",
    status: "Working",
    progress: 72,
    lastUpdate: "8 menit lalu",
  },
  {
    name: "Fikri Maulana",
    role: "Technician",
    currentJob: "Inspeksi dump truck DT-23",
    status: "Traveling",
    progress: 20,
    lastUpdate: "16 menit lalu",
  },
  {
    name: "Soni Darmawan",
    role: "HSE Officer",
    currentJob: "Safety patrol area pit north",
    status: "On Site",
    progress: 55,
    lastUpdate: "4 menit lalu",
  },
  {
    name: "Mira Andini",
    role: "Admin Site",
    currentJob: "Rekap manpower & absensi",
    status: "Needs Review",
    progress: 88,
    lastUpdate: "12 menit lalu",
  },
];

export const pendingApprovals = [
  {
    id: "APR-901",
    employee: "Arman Saputra",
    item: "JOB-201 • Tire Service HD785-17",
    submittedAt: "13:55",
    overtime: "1.5 jam",
    risk: "Emergency",
  },
  {
    id: "APR-902",
    employee: "Mira Andini",
    item: "Rekap manpower morning shift",
    submittedAt: "14:03",
    overtime: "0 jam",
    risk: "Normal",
  },
  {
    id: "APR-903",
    employee: "Soni Darmawan",
    item: "HSE patrol pit north + 3 foto",
    submittedAt: "14:10",
    overtime: "0 jam",
    risk: "Safety",
  },
];
