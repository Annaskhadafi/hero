"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  Clock3,
  History,
  MapPin,
  Upload,
  UserCheck,
  Wifi,
} from "lucide-react";

import { type AttendanceSyncPayload, type QueuedFilePayload } from "@/lib/offline-sync";
import { cn } from "@/lib/utils";

type AttendanceEmployee = {
  id: number;
  name: string;
  email: string;
  jobTitle: string | null;
  workLocation: string | null;
  siteId: number;
  siteName?: string | null;
};

type AttendanceLog = {
  id: number;
  eventType: string;
  eventTime: Date;
  status: string;
  locationNote: string;
  photoUrl?: string | null;
  latitude?: string | null;
  longitude?: string | null;
};

type AttendanceShiftOption = {
  value: string;
  label: string;
  window: string;
  helper: string;
};

type AttendancePageData = {
  success: boolean;
  employee: AttendanceEmployee | null;
  logs: AttendanceLog[];
  shiftOptions: AttendanceShiftOption[];
};

type GeoState = {
  latitude: string;
  longitude: string;
  altitude: string;
  accuracy: string;
  locationName: string;
  locationDetail: string;
  ready: boolean;
  message: string;
};

const initialGeo: GeoState = {
  latitude: "",
  longitude: "",
  altitude: "",
  accuracy: "",
  locationName: "",
  locationDetail: "",
  ready: false,
  message: "GPS waiting",
};

type ReverseGeocodeResult = {
  display_name?: string;
  name?: string;
  address?: {
    road?: string;
    neighbourhood?: string;
    village?: string;
    town?: string;
    city?: string;
    county?: string;
    state?: string;
    province?: string;
  };
};

function formatClock(value: Date) {
  return value.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDate(value: Date) {
  return value.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatLogTime(value: Date) {
  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEventLabel(value: string) {
  return value === "checked-out" ? "Check-Out" : "Check-In";
}

function getStatusLabel(value: string) {
  if (value === "pending") return "Pending review";
  if (value === "verified") return "Verified";
  if (value === "needs_review") return "Needs review";
  return value;
}

function firstLocationLine(value: string) {
  return value.split("|")[0]?.trim() || "Location logged";
}

function buildCoordinateLabel(geo: GeoState) {
  if (!geo.latitude || !geo.longitude) return "Waiting GPS lock";

  const latitude = Number(geo.latitude);
  const longitude = Number(geo.longitude);
  const latitudeHemisphere = latitude < 0 ? "S" : "N";
  const longitudeHemisphere = longitude < 0 ? "W" : "E";

  return `${Math.abs(latitude).toFixed(4)} ${latitudeHemisphere}, ${Math.abs(longitude).toFixed(4)} ${longitudeHemisphere}`;
}

function buildMapPinStyle(geo: GeoState) {
  if (!geo.latitude || !geo.longitude) {
    return { left: "52%", top: "48%" };
  }

  const lat = Math.abs(Number(geo.latitude));
  const lng = Math.abs(Number(geo.longitude));

  return {
    left: `${28 + (lng % 1) * 44}%`,
    top: `${24 + (lat % 1) * 48}%`,
  };
}

function getGeoLookupKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

function getReverseGeocodeLabel(data: ReverseGeocodeResult) {
  const address = data.address;
  const primary =
    data.name ||
    address?.road ||
    address?.neighbourhood ||
    address?.village ||
    address?.town ||
    address?.city ||
    address?.county;
  const secondary = address?.state || address?.province;

  if (primary && secondary && primary !== secondary) {
    return `${primary}, ${secondary}`;
  }

  return primary || data.display_name?.split(",").slice(0, 2).join(", ").trim() || "";
}

async function resolveLocationName(latitude: number, longitude: number) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 6000);

  try {
    const params = new URLSearchParams({
      format: "jsonv2",
      lat: String(latitude),
      lon: String(longitude),
      zoom: "18",
      addressdetails: "1",
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { "Accept-Language": "id,en" },
      signal: controller.signal,
    });

    if (!response.ok) return "";

    const data = (await response.json()) as ReverseGeocodeResult;
    return getReverseGeocodeLabel(data);
  } catch {
    return "";
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fileToPayload(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Gagal membaca file attendance."));
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

export function MobileAttendanceClient({ data }: { data: AttendancePageData }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastGeoLookupRef = useRef("");
  const [now, setNow] = useState<Date | null>(null);
  const [geo, setGeo] = useState<GeoState>(initialGeo);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraPermissionOpen, setCameraPermissionOpen] = useState(false);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturePreview, setCapturePreview] = useState("");
  const [selectedShift, setSelectedShift] = useState(data.shiftOptions[0]?.value ?? "");
  const [workMode, setWorkMode] = useState("On Site");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [attendanceLogs, setAttendanceLogs] = useState(data.logs);
  const [isPending, startTransition] = useTransition();

  const latestLog = attendanceLogs[0];
  const nextType = latestLog?.eventType === "checked-in" ? "checked-out" : "checked-in";
  const actionLabel = nextType === "checked-in" ? "Confirm Check-In" : "Confirm Check-Out";
  const selectedShiftOption =
    data.shiftOptions.find((shift) => shift.value === selectedShift) ?? data.shiftOptions[0];
  const siteName = data.employee?.siteName || data.employee?.workLocation || "Site belum tersedia";
  const locationName = geo.locationName || (geo.ready ? siteName : "Menunggu GPS lock");
  const employeeLabel = data.employee
    ? `${data.employee.name} | ${data.employee.jobTitle || "Field Operator"}`
    : "Employee context missing";
  const miniMapPinStyle = useMemo(() => buildMapPinStyle(geo), [geo]);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setAttendanceLogs(data.logs);
  }, [data.logs]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeo((current) => ({ ...current, message: "GPS not supported" }));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const lookupKey = getGeoLookupKey(latitude, longitude);

        setGeo((current) => ({
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
          altitude:
            typeof position.coords.altitude === "number"
              ? `${Math.round(position.coords.altitude)}m ASL`
              : "",
          accuracy: `${Math.round(position.coords.accuracy)}m accuracy`,
          locationName: current.locationName,
          locationDetail: current.locationDetail,
          ready: true,
          message: "GPS secure",
        }));

        if (lastGeoLookupRef.current !== lookupKey) {
          lastGeoLookupRef.current = lookupKey;
          void resolveLocationName(latitude, longitude).then((name) => {
            if (!name) return;
            setGeo((current) => {
              if (getGeoLookupKey(Number(current.latitude), Number(current.longitude)) !== lookupKey) {
                return current;
              }

              return {
                ...current,
                locationName: name,
                locationDetail: `${name} | ${current.accuracy}`,
              };
            });
          });
        }
      },
      (error) => {
        setGeo((current) => ({
          ...current,
          ready: false,
          message: error.message || "GPS permission needed",
        }));
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraReady(false);
      setCameraError("Camera not supported. Upload selfie instead.");
      return;
    }

    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 960 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
      setCameraError("");
      setCameraPermissionOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Camera permission needed.";
      setCameraReady(false);
      setCameraError(message);
      setCameraPermissionOpen(true);
    }
  }

  useEffect(() => {
    let cancelled = false;

    void startCamera().then(() => {
      if (cancelled) {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!capturedFile) {
      setCapturePreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(capturedFile);
    setCapturePreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [capturedFile]);

  async function captureFrame() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      throw new Error("Camera belum siap. Upload/capture foto dulu.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Browser tidak bisa membuat capture canvas.");
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.88);
    });

    if (!blob) {
      throw new Error("Photo capture failed.");
    }

    const file = new File([blob], `mobile-attendance-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    setCapturedFile(file);
    return file;
  }

  async function handleCaptureClick() {
    setSubmitError("");
    setSubmitMessage("");

    try {
      await captureFrame();
      setSubmitMessage("Face capture ready.");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Photo capture failed.");
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    setCapturedFile(file);
    setSubmitError("");
    setSubmitMessage("Selfie upload ready.");
  }

  async function handleSubmit() {
    setSubmitError("");
    setSubmitMessage("");

    if (!data.employee) {
      setSubmitError("Employee belum tersedia untuk akun ini.");
      return;
    }

    if (!selectedShiftOption) {
      setSubmitError("Shift attendance belum tersedia. Set Master Data dulu.");
      return;
    }

    let file = capturedFile;
    if (!file && cameraReady) {
      try {
        file = await captureFrame();
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Capture foto dulu.");
        return;
      }
    }

    if (!file) {
      setSubmitError("Foto wajah wajib ada. Capture atau upload selfie.");
      return;
    }

    const payload: AttendanceSyncPayload = {
      type: nextType,
      latitude: geo.latitude,
      longitude: geo.longitude,
      locationName,
      shiftCode: selectedShiftOption.value,
      workMode,
      attendanceContext: "Regular mobile attendance",
      overtimeMinutes: "0",
      operationalNote: geo.ready ? `${geo.message}; ${geo.accuracy}` : `GPS fallback: ${geo.message}`,
      photo: await fileToPayload(file),
    };
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/mobile/sync/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        success: boolean;
        error?: string;
        message?: string;
        record?: AttendanceLog;
      };

      if (!response.ok || !result.success) {
        setSubmitError(result.error || result.message || "Attendance recording failed.");
        return;
      }

      setCapturedFile(null);
      const record = result.record;
      if (record) {
        const normalizedRecord: AttendanceLog = {
          ...record,
          id: record.id,
          eventType: record.eventType,
          eventTime: new Date(record.eventTime),
          status: record.status,
          locationNote: record.locationNote,
          photoUrl: record.photoUrl ?? null,
          latitude: record.latitude ?? null,
          longitude: record.longitude ?? null,
        };

        setAttendanceLogs((current) => [
          normalizedRecord,
          ...current.filter((log) => log.id !== record.id),
        ]);
      }
      setSubmitMessage(`${getEventLabel(nextType)} recorded. Website attendance record akan refresh.`);
      startTransition(() => router.refresh());
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Attendance recording failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!data.employee) {
    return (
      <div className="rounded-[0.75rem] bg-white p-5 shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
        <p className="text-[10px] font-black uppercase text-[#486275]">Attendance blocked</p>
        <h1 className="mt-2 text-2xl font-black text-[#003461]">Employee belum tersambung</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#486275]">
          Akun login belum punya employee record. Hubungkan email user dengan employee di Security / User Management.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="space-y-1">
        <h1 className="font-display text-2xl font-black uppercase text-[#003461]">
          Identity Verification
        </h1>
        <p className="text-[11px] font-bold text-[#486275]">
          Secure entry protocol required for facility access
        </p>
      </section>

      <section className="flex items-center justify-between rounded-[0.65rem] bg-[#e6f6ff] px-4 py-2 text-[10px] font-black uppercase text-[#213f56] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.04)]">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[#004b87]" />
            System online
          </span>
        <span className="flex items-center gap-1.5">
          <Wifi className="size-3" />
          {geo.ready ? geo.accuracy : "Awaiting GPS"}
        </span>
      </section>

      <section className="relative min-h-[258px] overflow-hidden rounded-[0.75rem] bg-[#303436] shadow-[0_14px_32px_rgba(8,32,51,0.16)]">
        {capturePreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capturePreview} alt="Captured attendance selfie" className="absolute inset-0 h-full w-full object-cover opacity-75" />
        ) : (
          <video
            ref={videoRef}
            className={cn(
              "absolute inset-0 h-full w-full scale-x-[-1] object-cover opacity-75",
              !cameraReady && "hidden",
            )}
            playsInline
            muted
          />
        )}

        {!cameraReady && !capturePreview ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-[#b9c8d1]">
            <Camera className="size-11" />
            <p className="max-w-56 text-xs font-black uppercase leading-5">
              {cameraError || "Starting secure camera"}
            </p>
            {cameraError ? (
              <button
                type="button"
                onClick={() => setCameraPermissionOpen(true)}
                className="rounded-full bg-[#e6f6ff] px-4 py-2 text-[10px] font-black uppercase text-[#003461]"
              >
                Atur izin camera
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,transparent_34%,rgba(0,0,0,0.22)_35%,rgba(0,0,0,0.36)_100%)]" />
        <div className="absolute left-1/2 top-1/2 size-44 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-[#003f78]/70" />
        <div className="absolute left-1/2 top-1/2 h-0.5 w-52 -translate-x-1/2 -translate-y-1/2 bg-[#7e3200]/70 shadow-[0_0_12px_rgba(255,182,146,0.55)]" />
        <div className="absolute left-7 top-10 size-9 border-l-2 border-t-2 border-[#004b87]" />
        <div className="absolute right-7 top-10 size-9 border-r-2 border-t-2 border-[#004b87]" />
        <div className="absolute bottom-10 left-7 size-9 border-b-2 border-l-2 border-[#004b87]" />
        <div className="absolute bottom-10 right-7 size-9 border-b-2 border-r-2 border-[#004b87]" />

        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#cfe6f2]/88 px-3 py-1.5 text-[#003461] shadow-[0_8px_18px_rgba(0,52,97,0.14)] backdrop-blur-xl">
          <UserCheck className="size-3.5" />
          <span className="w-28 text-center text-[9px] font-black leading-3">
            Position your face within the frame
          </span>
        </div>
      </section>

      <section className="grid grid-cols-[1fr_auto] gap-3">
        <button
          type="button"
          onClick={handleCaptureClick}
          className="flex min-h-12 items-center justify-center gap-2 rounded-[0.7rem] bg-white px-4 text-xs font-black uppercase text-[#003461] shadow-[0_10px_22px_rgba(8,32,51,0.08)] active:scale-[0.98]"
        >
          <Camera className="size-4" />
          Capture
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex size-12 items-center justify-center rounded-[0.7rem] bg-[#e6f6ff] text-[#003461] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.06)] active:scale-[0.98]"
          aria-label="Upload selfie"
        >
          <Upload className="size-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handleFileChange}
        />
      </section>

      <section className="overflow-hidden rounded-[0.75rem] bg-white p-4 shadow-[0_14px_30px_rgba(8,32,51,0.08)]">
        <div className="mb-4 flex items-center justify-between">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase text-[#003461]">
            <MapPin className="size-3.5" />
            Location Data
          </p>
          <span className="rounded-full bg-[#e6f6ff] px-2 py-1 text-[9px] font-black uppercase text-[#004b87]">
            {geo.ready ? "Secure" : "Pending"}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <span className="text-[10px] font-black uppercase text-[#486275]">Site</span>
            <span className="text-right text-sm font-black text-[#071e27]">{siteName}</span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <span className="text-[10px] font-black uppercase text-[#486275]">Nama Lokasi</span>
            <span className="max-w-[220px] text-right text-xs font-bold text-[#071e27]">
              {locationName}
            </span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <span className="text-[10px] font-black uppercase text-[#486275]">Coordinates</span>
            <span className="text-right text-xs font-bold text-[#071e27]">{buildCoordinateLabel(geo)}</span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <span className="text-[10px] font-black uppercase text-[#486275]">Shift / Roster</span>
            <span className="text-right text-xs font-bold text-[#071e27]">
              {selectedShiftOption ? `${selectedShiftOption.label} · ${selectedShiftOption.window}` : "No active shift"}
            </span>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[0.65rem] bg-[#60707b]">
          <div className="relative h-[74px] opacity-95">
            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(207,230,242,0.38)_0_34%,rgba(230,246,255,0.75)_34%_54%,rgba(122,163,185,0.28)_54%_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,52,97,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(0,52,97,0.08)_1px,transparent_1px)] bg-[size:18px_18px]" />
            <span
              className="absolute flex size-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#003f78] shadow-[0_0_0_5px_rgba(0,52,97,0.2)]"
              style={miniMapPinStyle}
            >
              <span className="size-1.5 rounded-full bg-white" />
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-[0.75rem] bg-[#e6f6ff] p-4 shadow-[inset_0_0_0_1px_rgba(0,52,97,0.04)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase text-[#486275]">Current Attempt</p>
            <p className="mt-1 font-display text-2xl font-black text-[#003461]">
              {now ? formatClock(now) : "--.--.--"}
              <span className="ml-1 text-sm text-[#486275]">WITA</span>
            </p>
            <p className="mt-1 text-[11px] font-bold text-[#486275]">
              {now ? formatDate(now) : "Sinkronisasi waktu"}
            </p>
          </div>
          <span className="flex size-12 items-center justify-center rounded-full bg-white text-[#003461] shadow-[0_8px_18px_rgba(8,32,51,0.08)]">
            <Clock3 className="size-5" />
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase text-[#486275]">Shift</span>
            <select
              value={selectedShift}
              onChange={(event) => setSelectedShift(event.target.value)}
              className="h-11 w-full rounded-[0.65rem] border-0 bg-white px-3 text-xs font-black text-[#071e27] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.06)]"
            >
              {data.shiftOptions.map((shift) => (
                <option key={shift.value} value={shift.value}>
                  {shift.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase text-[#486275]">Mode</span>
            <select
              value={workMode}
              onChange={(event) => setWorkMode(event.target.value)}
              className="h-11 w-full rounded-[0.65rem] border-0 bg-white px-3 text-xs font-black text-[#071e27] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.06)]"
            >
              <option>On Site</option>
              <option>Remote Site</option>
              <option>Emergency Call</option>
              <option>Overtime</option>
            </select>
          </label>
        </div>
      </section>

      {submitError || submitMessage ? (
        <div
          className={cn(
            "rounded-[0.65rem] px-4 py-3 text-xs font-bold",
            submitError ? "bg-[#f4ddce] text-[#5a2200]" : "bg-[#dff2e8] text-[#0f5132]",
          )}
        >
          {submitError || submitMessage}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || isPending}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[0.65rem] bg-gradient-to-br from-[#003461] to-[#004b87] text-xs font-black uppercase text-white shadow-[0_14px_30px_rgba(0,52,97,0.22)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
      >
        <UserCheck className="size-4" />
        {isSubmitting || isPending ? "Recording..." : actionLabel}
      </button>

      <p className="text-center text-[10px] font-semibold text-[#486275]">
        Biometric data encrypted and stored securely per protocol.
      </p>

      <section className="space-y-3 pb-2">
        <p className="flex items-center gap-2 text-[10px] font-black uppercase text-[#486275]">
          <History className="size-3.5" />
          Today Attendance Record
        </p>
        {attendanceLogs.length > 0 ? (
          attendanceLogs.slice(0, 4).map((log) => (
            <article key={log.id} className="rounded-[0.75rem] bg-white p-3 shadow-[0_10px_24px_rgba(8,32,51,0.07)]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-[#071e27]">{getEventLabel(log.eventType)}</p>
                  <p className="truncate text-[11px] font-semibold text-[#486275]">{firstLocationLine(log.locationNote)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-[#003461]">{formatLogTime(log.eventTime)}</p>
                  <p className="text-[10px] font-bold text-[#486275]">{getStatusLabel(log.status)}</p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[0.75rem] bg-white p-4 text-center text-xs font-bold text-[#486275] shadow-[0_10px_24px_rgba(8,32,51,0.07)]">
            Belum ada attendance record hari ini.
          </div>
        )}
      </section>

      {cameraPermissionOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-[#071e27]/55 px-4 pb-5 backdrop-blur-sm">
          <div className="w-full rounded-[0.75rem] bg-white p-4 shadow-[0_20px_50px_rgba(8,32,51,0.25)]">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f4ddce] text-[#5a2200]">
                <AlertTriangle className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black uppercase text-[#003461]">Photo access denied</p>
                <p className="mt-1 text-xs font-bold leading-5 text-[#486275]">
                  Browser block camera. Tap icon gembok / Site settings, ubah Camera ke Allow, lalu coba lagi.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => void startCamera()}
                className="min-h-12 rounded-[0.65rem] bg-gradient-to-br from-[#003461] to-[#004b87] px-3 text-[11px] font-black uppercase text-white"
              >
                Coba allow lagi
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-12 rounded-[0.65rem] bg-[#e6f6ff] px-3 text-[11px] font-black uppercase text-[#003461]"
              >
                Upload selfie
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCameraPermissionOpen(false)}
              className="mt-3 min-h-11 w-full rounded-[0.65rem] bg-[#f3faff] px-3 text-[11px] font-black uppercase text-[#486275]"
            >
              Tutup
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
