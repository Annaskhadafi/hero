export const dailyReportSummary = {
  site: "-",
  customer: "-",
  date: "-",
  contract: "-",
  manpowerPresent: 0,
  manpowerLeave: 0,
  jobsCompleted: 0,
  hseStatus: "-",
};

type DailyReportSection = {
  title: string;
  description: string;
  status: string;
};

type ReportActivity = {
  unit: string;
  service: string;
  technician: string;
  time: string;
  status: string;
};

type ReportExport = {
  id: string;
  format: string;
  destination: string;
  status: string;
};

export const dailyReportSections: DailyReportSection[] = [];

export const reportActivities: ReportActivity[] = [];

export const reportExports: ReportExport[] = [];
