export const timesheetSummary = {
  period: "-",
  site: "-",
  regularHours: 0,
  overtimeHours: 0,
  overtimeCost: "Rp 0",
  pendingReview: 0,
  approvedEmployees: 0,
};

type TimesheetCrewMember = {
  name: string;
  role: string;
  regularHours: string;
  overtimeHours: string;
  overtimeType: string;
  estimatedPay: string;
  status: string;
};

type OvertimeRule = {
  label: string;
  multiplier: string;
  note: string;
};

type ExportQueueItem = {
  id: string;
  label: string;
  format: string;
  status: string;
  updatedAt: string;
};

export const timesheetCrew: TimesheetCrewMember[] = [];

export const overtimeRules: OvertimeRule[] = [];

export const exportQueue: ExportQueueItem[] = [];
