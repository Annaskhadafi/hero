export const approvalSummary = {
  waitingLevel1: 0,
  waitingLevel2: 0,
  escalated: 0,
  approvedToday: 0,
};

type ApprovalQueueItem = {
  id: string;
  employee: string;
  role: string;
  site: string;
  level: string;
  type: string;
  unit: string;
  submittedAt: string;
  workedHours: string;
  overtime: string;
  status: string;
  risk: string;
  notes: string;
  photos: number;
  checklist: string[];
};

export const approvalQueue: ApprovalQueueItem[] = [];
