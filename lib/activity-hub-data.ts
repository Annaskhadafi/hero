export const activityHubViews = [
  {
    label: "Input Aktivitas Harian",
    description: "View teknisi untuk cek route, update progres, dan input aktivitas harian.",
    href: "/dashboard/activity-hub/my-day",
  },
  {
    label: "Monitoring Tim & SPL",
    description: "View foreman untuk pantau tim dan SPL; keputusan resmi tetap di Approval Inbox.",
    href: "/dashboard/activity-hub/team-board",
  },
] as const;

export const myDaySummary = {
  site: "-",
  shift: "-",
  weather: "-",
  signal: "-",
  jobsAssigned: 0,
  jobsCompleted: 0,
  pointsToday: 0,
  currentLevel: "-",
  syncAt: "-",
};

type MyDayJob = {
  id: string;
  status: string;
  title: string;
  unit: string;
  type: string;
  window: string;
  lead: string;
  note: string;
};

type MyDayTimelineItem = {
  time: string;
  title: string;
  detail: string;
};

type TeamMember = {
  name: string;
  role: string;
  currentJob: string;
  status: string;
  progress: number;
  lastUpdate: string;
};

type PendingApproval = {
  id: string;
  employee: string;
  item: string;
  submittedAt: string;
  overtime: string;
  risk: string;
};

export const myDayJobs: MyDayJob[] = [];

export const myDayTimeline: MyDayTimelineItem[] = [];

export const teamBoardSummary = {
  activeWorkers: 0,
  checkedIn: 0,
  pendingApproval: 0,
  emergencyJobs: 0,
  overtimeCandidates: 0,
};

export const teamMembers: TeamMember[] = [];

export const pendingApprovals: PendingApproval[] = [];
