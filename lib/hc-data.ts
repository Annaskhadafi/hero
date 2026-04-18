export const hcSummary = {
  site: "-",
  activeHeadcount: 0,
  presentToday: 0,
  pendingAttendanceReview: 0,
  expiringCertificates: 0,
  fitForWorkRate: "0%",
};

type AttendanceFeedItem = {
  name: string;
  type: string;
  time: string;
  status: string;
  detail: string;
};

type TrainingStatusItem = {
  employee: string;
  training: string;
  expiry: string;
  status: string;
};

type WellnessStatusItem = {
  employee: string;
  metric: string;
  note: string;
  status: string;
};

export const attendanceFeed: AttendanceFeedItem[] = [];

export const trainingStatus: TrainingStatusItem[] = [];

export const wellnessStatus: WellnessStatusItem[] = [];
