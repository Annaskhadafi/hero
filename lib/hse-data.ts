export const hseSummary = {
  site: "-",
  shift: "-",
  zeroIncidentDays: 0,
  openObservations: 0,
  patrolCompleted: 0,
  apdCompliance: "0%",
};

type SafetyObservation = {
  id: string;
  title: string;
  category: string;
  location: string;
  reporter: string;
  severity: string;
  status: string;
  note: string;
};

type PatrolChecklistItem = {
  label: string;
  status: string;
  note: string;
};

type IncidentFeedItem = {
  id: string;
  type: string;
  unit: string;
  time: string;
  impact: string;
  status: string;
};

type ApdStatusItem = {
  team: string;
  compliance: string;
  note: string;
};

export const safetyObservations: SafetyObservation[] = [];

export const patrolChecklist: PatrolChecklistItem[] = [];

export const incidentFeed: IncidentFeedItem[] = [];

export const apdStatus: ApdStatusItem[] = [];
