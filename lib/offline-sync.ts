export const ACTIVITY_DRAFT_STORAGE_KEY = "hero:draft:activity";
export const HSE_OBSERVATION_DRAFT_STORAGE_KEY = "hero:draft:hse-observation";
export const HSE_EMERGENCY_DRAFT_STORAGE_KEY = "hero:draft:hse-emergency";

export type QueuedFilePayload = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

export type RouteSessionSyncItem = {
  routeItemId: number;
  libraryActivityId: number | null;
  snapshotLabel: string;
  snapshotGroupName: string;
  snapshotPayload: Record<string, unknown>;
  unitNumber: string;
  remark: string;
  startedAt: string;
  endedAt: string;
  isChecked: boolean;
  actualPoints: number;
  sortOrder: number;
};

export type ActivitySyncPayload = {
  employeeId: number;
  sourceMode: "assigned" | "self_input" | "custom";
  assignmentId: string;
  libraryActivityId: string;
  selectedLibraryActivityIds?: string[];
  selfInputActivities?: Array<{
    libraryActivityId: string;
    equipmentNo: string;
    startTime: string;
    endTime: string;
    materialUsed: string;
    notes: string;
  }>;
  routeTemplateId: string;
  overtimeCommandLetterId: string;
  routeShiftCode: string;
  routeSummaryRemark: string;
  routeSessionItems: RouteSessionSyncItem[];
  customActivityName: string;
  customActivityDescription: string;
  equipmentNo: string;
  startTime: string;
  endTime: string;
  materialUsed: string;
  notes: string;
  manualLocation: string;
  locationName: string;
  gpsLat: string;
  gpsLng: string;
  gpsValid: boolean;
  boundaryStatus: "inside" | "outside" | "unconfigured" | "unknown";
  boundaryMessage: string;
  photo: QueuedFilePayload | null;
};

export type AttendanceSyncPayload = {
  type: "checked-in" | "checked-out";
  latitude: string;
  longitude: string;
  locationName: string;
  shiftCode: string;
  workMode: string;
  attendanceContext: string;
  overtimeMinutes: string;
  operationalNote: string;
  photo: QueuedFilePayload;
};

export type HseObservationSyncPayload = {
  title: string;
  category: string;
  severity: string;
  notes: string;
  location: string;
  latitude: string;
  longitude: string;
};

export type EmergencyIncidentSyncPayload = {
  title: string;
  type: string;
  impact: string;
  status: string;
  unitNumber: string;
  location: string;
  notes: string;
  latitude: string;
  longitude: string;
  photo: QueuedFilePayload | null;
};
