export const hcSummary = {
  site: "Bengalon Pit North",
  activeHeadcount: 36,
  presentToday: 34,
  pendingAttendanceReview: 3,
  expiringCertificates: 4,
  fitForWorkRate: "92%",
};

export const attendanceFeed = [
  {
    name: "Arman Saputra",
    type: "Clock-in",
    time: "06:48",
    status: "Verified",
    detail: "Selfie attendance + GPS dalam radius site",
  },
  {
    name: "Mira Andini",
    type: "Clock-in",
    time: "06:59",
    status: "Needs Review",
    detail: "Lokasi valid, wajah tertutup masker sebagian",
  },
  {
    name: "Dedi Pranata",
    type: "Clock-out",
    time: "17:18",
    status: "Overtime",
    detail: "Otomatis ditandai kandidat lembur 1.5 jam",
  },
] as const;

export const trainingStatus = [
  {
    employee: "Soni Darmawan",
    training: "HSE Patrol Refresher",
    expiry: "30 hari lagi",
    status: "Expiring Soon",
  },
  {
    employee: "Arman Saputra",
    training: "Tire Management Level 2",
    expiry: "Aktif sampai Jan 2027",
    status: "Active",
  },
  {
    employee: "Fikri Maulana",
    training: "Rigging Awareness",
    expiry: "7 hari lagi",
    status: "Urgent",
  },
] as const;

export const wellnessStatus = [
  {
    employee: "Arman Saputra",
    metric: "BMI 23.1",
    note: "Dalam range sehat bulan ini",
    status: "Healthy",
  },
  {
    employee: "Mira Andini",
    metric: "MCU due in 18 days",
    note: "Perlu reminder H-14 dan H-7",
    status: "Follow Up",
  },
  {
    employee: "Dedi Pranata",
    metric: "Fit for work pending",
    note: "Butuh update kondisi setelah lembur panjang",
    status: "Attention",
  },
] as const;
