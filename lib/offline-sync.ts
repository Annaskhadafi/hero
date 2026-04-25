import { z } from "zod";

export const ACTIVITY_DRAFT_STORAGE_KEY = "hero:draft:activity";
export const HSE_OBSERVATION_DRAFT_STORAGE_KEY = "hero:draft:hse-observation";
export const HSE_EMERGENCY_DRAFT_STORAGE_KEY = "hero:draft:hse-emergency";

export const OFFLINE_SYNC_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const queuedImageFileSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.string().trim().startsWith("image/", "File harus berupa gambar."),
  size: z.number().int().positive().max(OFFLINE_SYNC_MAX_IMAGE_BYTES, "Ukuran foto maksimal 5MB."),
  dataUrl: z.string().trim().regex(/^data:image\/.+;base64,.+$/, "Payload foto offline tidak valid."),
});

const trimmedCoordinate = z
  .string()
  .trim()
  .refine((value) => value.length > 0 && Number.isFinite(Number(value)), "Koordinat GPS tidak valid.");

const trimmedOptionalText = (max: number) => z.string().trim().max(max).optional().default("");

export type QueuedFilePayload = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

export type RouteSessionSyncItem = {
  routeItemId: number | null;
  overtimeCommandLetterItemId?: number | null;
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
  clientRequestId?: string;
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

const optionalClientRequestId = z.string().trim().max(120).optional().default("");

export const attendanceSyncPayloadSchema = z.object({
  clientRequestId: optionalClientRequestId,
  type: z.enum(["checked-in", "checked-out"]),
  latitude: trimmedCoordinate,
  longitude: trimmedCoordinate,
  locationName: z.string().trim().min(2).max(160),
  shiftCode: z.string().trim().min(1).max(40),
  workMode: z.string().trim().min(2).max(80),
  attendanceContext: z.string().trim().min(2).max(120),
  overtimeMinutes: z
    .string()
    .trim()
    .refine((value) => value.length > 0 && Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 1440, "Lembur harus berupa angka 0-1440 menit."),
  operationalNote: z.string().trim().max(160).optional().default(""),
  photo: queuedImageFileSchema,
});

export type HseObservationSyncPayload = {
  title: string;
  category: string;
  severity: string;
  notes: string;
  location: string;
  latitude: string;
  longitude: string;
};

export const hseObservationSyncPayloadSchema = z.object({
  title: z.string().trim().min(3).max(160),
  category: z.string().trim().min(2).max(80),
  severity: z.string().trim().min(2).max(40),
  notes: z.string().trim().min(3).max(1200),
  location: z.string().trim().min(2).max(160),
  latitude: trimmedCoordinate,
  longitude: trimmedCoordinate,
});

export type EmergencyIncidentSyncPayload = {
  clientRequestId?: string;
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

export const emergencyIncidentSyncPayloadSchema = z.object({
  clientRequestId: optionalClientRequestId,
  title: z.string().trim().min(3).max(160),
  type: z.string().trim().min(2).max(80),
  impact: z.string().trim().min(2).max(80),
  status: z.string().trim().min(2).max(40),
  unitNumber: trimmedOptionalText(80),
  location: z.string().trim().min(2).max(160),
  notes: z.string().trim().min(3).max(1200),
  latitude: trimmedCoordinate,
  longitude: trimmedCoordinate,
  photo: queuedImageFileSchema.nullable(),
});

export const activitySyncPayloadSchema = z.object({
  employeeId: z.number().int().positive(),
  sourceMode: z.enum(["assigned", "self_input", "custom"]),
  assignmentId: trimmedOptionalText(80),
  libraryActivityId: trimmedOptionalText(80),
  selectedLibraryActivityIds: z.array(z.string().trim().min(1).max(80)).optional(),
  selfInputActivities: z
    .array(
      z.object({
        libraryActivityId: z.string().trim().min(1).max(80),
        equipmentNo: trimmedOptionalText(80),
        startTime: z.string().trim().min(1).max(80),
        endTime: z.string().trim().min(1).max(80),
        materialUsed: trimmedOptionalText(500),
        notes: trimmedOptionalText(1200),
      }),
    )
    .optional(),
  routeTemplateId: trimmedOptionalText(80),
  overtimeCommandLetterId: trimmedOptionalText(80),
  routeShiftCode: trimmedOptionalText(24),
  routeSummaryRemark: trimmedOptionalText(1200),
  routeSessionItems: z.array(
    z.object({
      routeItemId: z.number().int().positive().nullable(),
      overtimeCommandLetterItemId: z.number().int().positive().nullable().optional(),
      libraryActivityId: z.number().int().positive().nullable(),
      snapshotLabel: z.string().trim().min(1).max(160),
      snapshotGroupName: trimmedOptionalText(160),
      snapshotPayload: z.record(z.string(), z.unknown()),
      unitNumber: trimmedOptionalText(80),
      remark: trimmedOptionalText(1200),
      startedAt: z.string().trim().min(1).max(80),
      endedAt: z.string().trim().min(1).max(80),
      isChecked: z.boolean(),
      actualPoints: z.number().int().min(0).max(5000),
      sortOrder: z.number().int().min(0).max(9999),
    }),
  ),
  customActivityName: trimmedOptionalText(160),
  customActivityDescription: trimmedOptionalText(1200),
  equipmentNo: trimmedOptionalText(80),
  startTime: z.string().trim().min(1).max(80),
  endTime: z.string().trim().min(1).max(80),
  materialUsed: trimmedOptionalText(500),
  notes: trimmedOptionalText(1200),
  manualLocation: trimmedOptionalText(160),
  locationName: trimmedOptionalText(160),
  gpsLat: trimmedCoordinate,
  gpsLng: trimmedCoordinate,
  gpsValid: z.boolean(),
  boundaryStatus: z.enum(["inside", "outside", "unconfigured", "unknown"]),
  boundaryMessage: trimmedOptionalText(240),
  photo: queuedImageFileSchema.nullable(),
});

export function parseOfflineSyncPayload<T>(schema: z.ZodType<T>, payload: unknown): T {
  return schema.parse(payload);
}
