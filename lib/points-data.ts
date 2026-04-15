export const pointsProfile = {
  name: "Arman Saputra",
  role: "Technician • Bengalon Pit North",
  currentLevel: "Skilled",
  totalPoints: 1245,
  nextLevel: "Pro",
  nextLevelTarget: 1500,
  pointsToNextLevel: 255,
  streakDays: 11,
  badgesEarned: 4,
  monthlyRank: 2,
};

export const pointsSources = [
  {
    label: "Hadir tepat waktu",
    points: "+10",
    note: "Selfie attendance + GPS valid",
    category: "Kehadiran",
  },
  {
    label: "Submit aktivitas sebelum 17.00",
    points: "+5",
    note: "Bonus disiplin input harian",
    category: "Disiplin",
  },
  {
    label: "Pekerjaan emergency selesai",
    points: "+20",
    note: "JOB-201 tire service HD785-17",
    category: "Volume Kerja",
  },
  {
    label: "Toolbox meeting siang",
    points: "+5",
    note: "Partisipasi HSE harian",
    category: "HSE",
  },
] as const;

export const badgeCollection = [
  {
    name: "On-Time Streak",
    description: "Hadir tepat waktu 10 hari berturut-turut",
    status: "Unlocked",
  },
  {
    name: "Emergency Handler",
    description: "Menyelesaikan 5 pekerjaan breakdown dalam 1 bulan",
    status: "Unlocked",
  },
  {
    name: "Safety First",
    description: "Zero incident 30 hari",
    status: "In Progress",
  },
  {
    name: "Training Hunter",
    description: "Selesaikan 2 training tersertifikasi",
    status: "Locked",
  },
] as const;

export const siteLeaderboard = [
  {
    rank: 1,
    name: "Rian Kurniawan",
    role: "Foreman",
    points: 1480,
    trend: "Up",
  },
  {
    rank: 2,
    name: "Arman Saputra",
    role: "Technician",
    points: 1245,
    trend: "Up",
  },
  {
    rank: 3,
    name: "Soni Darmawan",
    role: "HSE Officer",
    points: 1170,
    trend: "Stable",
  },
  {
    rank: 4,
    name: "Mira Andini",
    role: "Admin Site",
    points: 1040,
    trend: "Down",
  },
] as const;

export const rewardTracker = [
  {
    title: "Reward bulanan site",
    target: "Top 3 poin per site",
    progress: "Rank 2 saat ini",
    status: "On Track",
  },
  {
    title: "Prioritas training",
    target: "Capai level Pro",
    progress: "255 poin lagi",
    status: "In Progress",
  },
  {
    title: "Rekomendasi promosi",
    target: "Konsisten top performer 3 bulan",
    progress: "1 dari 3 bulan terpenuhi",
    status: "In Progress",
  },
] as const;
