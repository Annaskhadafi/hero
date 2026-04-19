"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Camera,
  ImagePlus,
  MapPin,
  Navigation,
  Save,
  SendHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { validateSiteBoundary } from "@/lib/location";
import {
  ACTIVITY_DRAFT_STORAGE_KEY,
  type ActivitySyncPayload,
  type QueuedFilePayload,
} from "@/lib/offline-sync";

type AssignmentOption = {
  id: number;
  activityName: string | null;
  customJobName: string;
  priority?: string | null;
  assignedByName?: string | null;
};

type LibraryOption = {
  id: number;
  activityCode: string;
  activityName: string;
  basePoints: number;
};

type MobileDailyActivityFormProps = {
  employeeId: number;
  assignments: AssignmentOption[];
  availableLibrary: LibraryOption[];
  defaultStartTime: string;
  defaultEndTime: string;
  site: {
    name?: string | null;
    geoLatitude?: string | null;
    geoLongitude?: string | null;
    geoRadiusMeters?: number | null;
  } | null;
};

type GeoState = {
  latitude: string;
  longitude: string;
  accuracy: string;
  locationName: string;
  message: string;
};

const initialGeo: GeoState = {
  latitude: "",
  longitude: "",
  accuracy: "",
  locationName: "",
  message: "GPS standby",
};

async function fileToPayload(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Gagal membaca file foto."));
    reader.readAsDataURL(file);
  });

  const payload: QueuedFilePayload = {
    name: file.name,
    type: file.type,
    size: file.size,
    dataUrl,
  };

  return payload;
}

function readDraft<T>(key: string) {
  if (typeof window === "undefined") return null as T | null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeDraft<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function clearDraft(key: string) {
  window.localStorage.removeItem(key);
}

export function MobileDailyActivityForm({
  employeeId,
  assignments,
  availableLibrary,
  defaultStartTime,
  defaultEndTime,
  site,
}: MobileDailyActivityFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queuedDraftKey = searchParams.get("draft")?.trim() || "";

  const [sourceMode, setSourceMode] = useState<"assigned" | "self_input" | "custom">("self_input");
  const [assignmentId, setAssignmentId] = useState("");
  const [libraryActivityId, setLibraryActivityId] = useState(availableLibrary[0]?.id ? `${availableLibrary[0].id}` : "");
  const [customActivityName, setCustomActivityName] = useState("");
  const [customActivityDescription, setCustomActivityDescription] = useState("");
  const [equipmentNo, setEquipmentNo] = useState("");
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);
  const [materialUsed, setMaterialUsed] = useState("");
  const [notes, setNotes] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [restoredPhotoPayload, setRestoredPhotoPayload] = useState<QueuedFilePayload | null>(null);
  const [photoCaptureMode, setPhotoCaptureMode] = useState<"camera" | "gallery">("gallery");
  const [geo, setGeo] = useState<GeoState>(initialGeo);
  const [submitState, setSubmitState] = useState<{
    kind: "idle" | "success" | "error";
    message: string;
  }>({ kind: "idle", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const draft = queuedDraftKey
      ? readDraft<ActivitySyncPayload>(queuedDraftKey)
      : readDraft<ActivitySyncPayload>(ACTIVITY_DRAFT_STORAGE_KEY);

    if (!draft) {
      return;
    }

    setSourceMode(draft.sourceMode);
    setAssignmentId(draft.assignmentId);
    setLibraryActivityId(draft.libraryActivityId);
    setCustomActivityName(draft.customActivityName);
    setCustomActivityDescription(draft.customActivityDescription);
    setEquipmentNo(draft.equipmentNo);
    setStartTime(draft.startTime || defaultStartTime);
    setEndTime(draft.endTime || defaultEndTime);
    setMaterialUsed(draft.materialUsed);
    setNotes(draft.notes);
    setManualLocation(draft.manualLocation);
    setPhotoName(draft.photo?.name ?? "");
    setRestoredPhotoPayload(draft.photo ?? null);
  }, [defaultEndTime, defaultStartTime, queuedDraftKey]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeo((current) => ({ ...current, message: "GPS tidak didukung browser." }));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGeo({
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
          accuracy: `${Math.round(position.coords.accuracy)}m`,
          locationName: "",
          message: "GPS lock aktif",
        });
      },
      (error) => {
        setGeo((current) => ({
          ...current,
          message: error.message || "GPS butuh izin browser.",
        }));
      },
      { enableHighAccuracy: true, maximumAge: 8000, timeout: 12000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const boundary = validateSiteBoundary(
    site,
    geo.latitude ? Number(geo.latitude) : null,
    geo.longitude ? Number(geo.longitude) : null,
  );

  const payload: ActivitySyncPayload = {
    employeeId,
    sourceMode,
    assignmentId,
    libraryActivityId,
    customActivityName,
    customActivityDescription,
    equipmentNo,
    startTime,
    endTime,
    materialUsed,
    notes,
    manualLocation,
    locationName:
      geo.locationName ||
      (geo.latitude && geo.longitude ? `${geo.latitude}, ${geo.longitude}` : "") ||
      manualLocation ||
      site?.name ||
      "",
    gpsLat: geo.latitude,
    gpsLng: geo.longitude,
    gpsValid: boundary.gpsValid,
    boundaryStatus: boundary.status,
    boundaryMessage: boundary.message,
    photo: null,
  };

  useEffect(() => {
    writeDraft(ACTIVITY_DRAFT_STORAGE_KEY, payload);
  }, [payload]);

  function validatePayload() {
    if (sourceMode === "assigned" && !assignmentId) {
      return "Pilih assignment dulu.";
    }

    if (sourceMode === "self_input" && !libraryActivityId) {
      return "Pilih activity library dulu.";
    }

    if (sourceMode === "custom" && !customActivityName.trim()) {
      return "Nama custom activity wajib diisi.";
    }

    if (!startTime || !endTime) {
      return "Waktu mulai dan selesai wajib diisi.";
    }

    if (new Date(endTime) <= new Date(startTime)) {
      return "Waktu selesai harus setelah waktu mulai.";
    }

    if (!geo.latitude && !manualLocation.trim()) {
      return "Aktifkan GPS atau isi lokasi manual sebagai fallback.";
    }

    return "";
  }

  async function sendPayload(submitPayload: ActivitySyncPayload) {
    const response = await fetch("/api/mobile/sync/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submitPayload),
    });

    const result = (await response.json()) as {
      success: boolean;
      message?: string;
      conflict?: boolean;
    };

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Submit activity gagal.");
    }

    return result;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState({ kind: "idle", message: "" });

    const validationError = validatePayload();
    if (validationError) {
      setSubmitState({ kind: "error", message: validationError });
      return;
    }

    setIsSubmitting(true);
    try {
      const submitPayload: ActivitySyncPayload = {
        ...payload,
        photo: photoFile ? await fileToPayload(photoFile) : restoredPhotoPayload,
      };

      await sendPayload(submitPayload);
      clearDraft(ACTIVITY_DRAFT_STORAGE_KEY);
      if (queuedDraftKey) {
        clearDraft(queuedDraftKey);
      }

      setSubmitState({
        kind: "success",
        message: "Activity berhasil dikirim ke Daily Activity System.",
      });

      window.setTimeout(() => {
        router.push("/mobile/activity");
        router.refresh();
      }, 900);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Submit activity gagal.";
      setSubmitState({ kind: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {submitState.kind !== "idle" ? (
        <div
          className={
            submitState.kind === "success"
              ? "rounded-[1.1rem] bg-[#dff4e8] px-4 py-3 text-xs font-semibold text-[#14532d]"
              : "rounded-[1.1rem] bg-[#f4ddce] px-4 py-3 text-xs font-semibold text-[#5a2200]"
          }
        >
          {submitState.message}
        </div>
      ) : null}

      <section className="space-y-4 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
        <Label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Source mode</span>
          <select
            value={sourceMode}
            onChange={(event) => setSourceMode(event.target.value as typeof sourceMode)}
            className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
          >
            <option value="assigned">Assigned activity</option>
            <option value="self_input">Self-input activity</option>
            <option value="custom">Custom activity</option>
          </select>
        </Label>

        {sourceMode === "assigned" ? (
          <Label className="block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Assignment</span>
            <select
              value={assignmentId}
              onChange={(event) => setAssignmentId(event.target.value)}
              className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
            >
              <option value="">Pilih assignment</option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {(assignment.activityName ?? assignment.customJobName) || `Assignment #${assignment.id}`}
                </option>
              ))}
            </select>
          </Label>
        ) : null}

        {sourceMode === "self_input" ? (
          <Label className="block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Library activity</span>
            <select
              value={libraryActivityId}
              onChange={(event) => setLibraryActivityId(event.target.value)}
              className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
            >
              <option value="">Pilih activity library</option>
              {availableLibrary.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.activityCode} - {item.activityName} ({item.basePoints} pts)
                </option>
              ))}
            </select>
          </Label>
        ) : null}

        {sourceMode === "custom" ? (
          <>
            <Label className="block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Custom activity</span>
              <Input
                value={customActivityName}
                onChange={(event) => setCustomActivityName(event.target.value)}
                placeholder="Nama aktivitas custom"
                className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
              />
            </Label>
            <Label className="block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Description</span>
              <Textarea
                value={customActivityDescription}
                onChange={(event) => setCustomActivityDescription(event.target.value)}
                rows={4}
                placeholder="Jelaskan aktivitas custom."
                className="rounded-2xl border-0 bg-[#e9f6fd] px-4 py-3 text-sm font-semibold text-[#082033]"
              />
            </Label>
          </>
        ) : null}
      </section>

      <section className="space-y-4 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Label className="block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Start time</span>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
            />
          </Label>
          <Label className="block space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">End time</span>
            <Input
              type="datetime-local"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
            />
          </Label>
        </div>

        <Label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Equipment / unit no.</span>
          <Input
            value={equipmentNo}
            onChange={(event) => setEquipmentNo(event.target.value)}
            placeholder="Contoh: DT-451 / BAY-03"
            className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
          />
        </Label>

        <Label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Material used</span>
          <Input
            value={materialUsed}
            onChange={(event) => setMaterialUsed(event.target.value)}
            placeholder="Material / tools dipakai"
            className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
          />
        </Label>

        <Label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Notes / hasil kerja</span>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={5}
            placeholder="Ringkas pekerjaan, hasil, kendala, bukti penting."
            className="rounded-2xl border-0 bg-[#e9f6fd] px-4 py-3 text-sm font-semibold text-[#082033]"
          />
        </Label>
      </section>

      <section className="space-y-4 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">
              <Navigation className="size-3.5 text-[#003f78]" />
              GPS Auto-Capture
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#486275]">
              {boundary.message}
            </p>
          </div>
          <span
            className={
              boundary.gpsValid
                ? "rounded-full bg-[#dff4e8] px-3 py-1 text-[10px] font-black uppercase text-[#14532d]"
                : "rounded-full bg-[#fff1cf] px-3 py-1 text-[10px] font-black uppercase text-[#8a5a00]"
            }
          >
            {boundary.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-[#486275]">
          <div className="rounded-[1rem] bg-[#f6fbff] px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">Coordinates</p>
            <p className="mt-1 text-sm text-[#082033]">
              {geo.latitude && geo.longitude ? `${geo.latitude}, ${geo.longitude}` : "Waiting GPS"}
            </p>
          </div>
          <div className="rounded-[1rem] bg-[#f6fbff] px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">Accuracy</p>
            <p className="mt-1 text-sm text-[#082033]">{geo.accuracy || geo.message}</p>
          </div>
        </div>

        <Label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Fallback manual location</span>
          <Input
            value={manualLocation}
            onChange={(event) => setManualLocation(event.target.value)}
            placeholder="Isi lokasi manual bila GPS/akses lokasi gagal"
            className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
          />
        </Label>
      </section>

      <section className="space-y-3 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">
          <Camera className="size-3.5 text-[#003f78]" />
          Photo camera / galeri
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-2xl border-0 bg-[#e9f6fd] text-[#003f78]"
            onClick={() => {
              setPhotoCaptureMode("camera");
              document.getElementById("mobile-activity-photo")?.click();
            }}
          >
            <Camera className="size-4" />
            Kamera
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-2xl border-0 bg-[#e9f6fd] text-[#003f78]"
            onClick={() => {
              setPhotoCaptureMode("gallery");
              document.getElementById("mobile-activity-photo")?.click();
            }}
          >
            <ImagePlus className="size-4" />
            Galeri
          </Button>
        </div>

        <input
          id="mobile-activity-photo"
          type="file"
          accept="image/*"
          capture={photoCaptureMode === "camera" ? "environment" : undefined}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setPhotoFile(file);
            setPhotoName(file?.name ?? "");
            setRestoredPhotoPayload(null);
          }}
        />

        {photoName ? (
          <p className="text-xs font-semibold text-[#486275]">{photoName}</p>
        ) : (
          <p className="text-xs font-semibold text-[#486275]">
            Upload opsional. Cocok untuk bukti kerja dan context lapangan.
          </p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-14 rounded-2xl border-0 bg-[#eaf4fb] text-[#003f78]"
          onClick={() => {
            writeDraft(ACTIVITY_DRAFT_STORAGE_KEY, payload);
            setSubmitState({
              kind: "success",
              message: "Draft activity disimpan ke local storage.",
            });
          }}
        >
          <Save className="size-4" />
          Save Draft
        </Button>
        <Button
          type="submit"
          className="h-14 rounded-2xl bg-[#003f78] text-white shadow-[0_14px_30px_rgba(0,63,120,0.22)]"
          disabled={isSubmitting}
        >
          <SendHorizontal className="size-4" />
          {isSubmitting ? "Submitting..." : "Submit Activity"}
        </Button>
      </div>

    </form>
  );
}
