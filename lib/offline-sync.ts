export const OFFLINE_QUEUE_STORAGE_KEY = "hero:offline-sync-queue";
export const ACTIVITY_DRAFT_STORAGE_KEY = "hero:draft:activity";
export const HSE_OBSERVATION_DRAFT_STORAGE_KEY = "hero:draft:hse-observation";
export const HSE_EMERGENCY_DRAFT_STORAGE_KEY = "hero:draft:hse-emergency";
export const ATTENDANCE_LOG_CACHE_KEY = "hero:cache:attendance-logs";
export const HSE_FEED_CACHE_KEY = "hero:cache:hse-feed";

export type SyncEntityType =
  | "activity"
  | "attendance"
  | "hse_observation"
  | "emergency_incident";

export type SyncItemStatus =
  | "queued"
  | "syncing"
  | "conflict"
  | "failed";

export type QueuedFilePayload = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

export type ActivitySyncPayload = {
  employeeId: number;
  sourceMode: "assigned" | "self_input" | "custom";
  assignmentId: string;
  libraryActivityId: string;
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

export type OfflineQueuePayload =
  | ActivitySyncPayload
  | AttendanceSyncPayload
  | HseObservationSyncPayload
  | EmergencyIncidentSyncPayload;

export type OfflineQueueItem = {
  id: string;
  entityType: SyncEntityType;
  title: string;
  createdAt: string;
  route: string;
  draftKey?: string;
  status: SyncItemStatus;
  errorMessage?: string;
  payload: OfflineQueuePayload;
};

export function getSyncEndpoint(entityType: SyncEntityType) {
  switch (entityType) {
    case "activity":
      return "/api/mobile/sync/activity";
    case "attendance":
      return "/api/mobile/sync/attendance";
    case "hse_observation":
      return "/api/mobile/sync/hse";
    case "emergency_incident":
      return "/api/mobile/sync/emergency";
  }
}

export function formatQueueTimestamp(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function makeOfflineQueueId(prefix: SyncEntityType) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
