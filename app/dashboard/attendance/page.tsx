"use client";

import React, { useRef, useState, useEffect } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  Clock3,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Navigation,
  ShieldCheck,
  TimerReset,
  UserRound,
} from "lucide-react";
import { getAttendancePageData, submitAttendance } from "@/app/actions/attendance";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

type AttendanceEmployee = {
  id: number;
  name: string;
  email: string;
  jobTitle: string;
  workLocation: string;
  siteName: string;
};

type AttendanceLog = {
  id: number;
  eventType: string;
  eventTime: Date | string;
  locationNote: string;
  latitude: string | null;
  longitude: string | null;
};

type AttendanceShiftOption = {
  value: string;
  label: string;
  window: string;
  helper: string;
};

type ReverseGeocodeResult = {
  label: string;
  detail: string | null;
};

type NominatimReverseResponse = {
  address?: {
    village?: string;
    town?: string;
    city?: string;
    municipality?: string;
    county?: string;
    state_district?: string;
    state?: string;
    suburb?: string;
    hamlet?: string;
    road?: string;
  };
  display_name?: string;
};

const workModeOptions = [
  "On Site",
  "Area Customer",
  "Transit / Travel",
  "Remote Support",
  "Shift Replacement",
] as const;

const attendanceContextOptions = [
  {
    value: "regular",
    label: "Regular",
    helper: "Jam kerja sesuai roster.",
  },
  {
    value: "overtime",
    label: "Overtime",
    helper: "There is extra work outside the shift.",
  },
  {
    value: "handover",
    label: "Handover Shift",
    helper: "Masuk/keluar untuk serah terima pekerjaan.",
  },
  {
    value: "callout",
    label: "Emergency Call Out",
    helper: "Attendance karena panggilan mendadak.",
  },
] as const;

function formatCoordinate(value: number | string) {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(5) : String(value);
}

function getCoordinateKey(latitude: number | string, longitude: number | string) {
  return `${formatCoordinate(latitude)},${formatCoordinate(longitude)}`;
}

function getCoordinateLabel(latitude: number | string, longitude: number | string) {
  return `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`;
}

function normalizeTextLine(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
}

function splitAttendanceNote(value: string | null | undefined) {
  const parts = value?.split("|").map((part) => part.trim()).filter(Boolean) ?? [];

  return {
    locationNote: parts[0] ?? null,
    details: parts.slice(1),
  };
}

function formatOvertimeLabel(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "Tidak ada";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${remainingMinutes}m`;
}

function extractAreaLabel(result: NominatimReverseResponse) {
  const address = result.address ?? {};
  const primary =
    address.suburb ||
    address.hamlet ||
    address.village ||
    address.town ||
    address.city ||
    address.municipality ||
    address.county ||
    address.state_district ||
    address.state ||
    result.display_name ||
    "";

  const secondaryCandidates = [
    address.city,
    address.town,
    address.county,
    address.state_district,
    address.state,
  ].filter(Boolean) as string[];

  const secondary = secondaryCandidates.find(
    (candidate) => normalizeTextLine(candidate) !== normalizeTextLine(primary),
  );

  return {
    label: primary || "Lokasi terdeteksi",
    detail: secondary ?? null,
  };
}

function getGeolocationErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const geolocationError = error as { code?: number; message?: string };

    if (geolocationError.code === 1) {
      return "Akses lokasi ditolak. Izinkan lokasi di browser agar GPS bisa aktif.";
    }

    if (geolocationError.code === 2) {
      return "Lokasi belum bisa dibaca. Pastikan GPS atau network location aktif.";
    }

    if (geolocationError.code === 3) {
      return "Permintaan lokasi timeout. Coba tunggu sebentar lalu refresh halaman.";
    }

    if (geolocationError.message) {
      return geolocationError.message;
    }
  }

  return "GPS belum aktif. Izinkan lokasi agar attendance bisa dikirim.";
}

export default function AttendancePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [gpsLocked, setGpsLocked] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [gpsError, setGpsError] = useState("");
  const [captureMessage, setCaptureMessage] = useState("");
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<"checked-in" | "checked-out" | null>(null);
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [employee, setEmployee] = useState<AttendanceEmployee | null>(null);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [liveLocationLabel, setLiveLocationLabel] = useState<ReverseGeocodeResult | null>(null);
  const [historyLocationLabels, setHistoryLocationLabels] = useState<Record<string, ReverseGeocodeResult>>({});
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [shiftOptions, setShiftOptions] = useState<AttendanceShiftOption[]>([]);
  const [selectedShift, setSelectedShift] = useState("");
  const [workMode, setWorkMode] = useState<(typeof workModeOptions)[number]>("On Site");
  const [attendanceContext, setAttendanceContext] =
    useState<(typeof attendanceContextOptions)[number]["value"]>("regular");
  const [overtimeMinutes, setOvertimeMinutes] = useState(0);
  const [operationalNote, setOperationalNote] = useState("");

  const refreshAttendanceData = async () => {
    const result = await getAttendancePageData();
    const nextShiftOptions = result.shiftOptions ?? [];

    setShiftOptions(nextShiftOptions);
    setSelectedShift((current) =>
      nextShiftOptions.some((shift) => shift.value === current)
        ? current
        : nextShiftOptions[0]?.value ?? "",
    );

    if (result.success) {
      setEmployee(result.employee);
      setLogs(result.logs);
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed with status ${response.status}`);
    }

    const data = (await response.json()) as NominatimReverseResponse;
    return extractAreaLabel(data);
  };

  const fallbackLocationLabel = "Lokasi GPS";
  const coordinateLabel = location ? getCoordinateLabel(location.lat, location.lng) : fallbackLocationLabel;
  const resolvedLocationLabel = liveLocationLabel?.label ?? coordinateLabel;
  const resolvedLocationDetail = liveLocationLabel?.detail ?? null;
  const currentShift = shiftOptions.find((shift) => shift.value === selectedShift) ??
    shiftOptions[0] ?? {
      value: "",
      label: "Shift belum tersedia",
      window: "-",
      helper: "Hubungi admin untuk mengaktifkan shift di Master Data.",
    };
  const currentAttendanceContext =
    attendanceContextOptions.find((option) => option.value === attendanceContext) ?? attendanceContextOptions[0];
  const lastLog = logs[0] ?? null;
  const lastEventType = lastLog?.eventType ?? null;
  const recommendedAction = lastEventType === "checked-in" ? "Clock Out" : "Clock In";
  const nextActionHint =
    lastEventType === "checked-in"
      ? "Shift sedang berjalan. Clock out saat pekerjaan selesai atau saat handover."
      : lastEventType === "checked-out"
        ? "Attendance terakhir sudah clock out. Clock in lagi jika ada assignment baru."
        : "Mulai attendance pertama hari ini saat sudah berada di lokasi kerja.";
  const readinessItems = [
    {
      label: "Profil",
      value: employee ? employee.siteName : "Belum siap",
      ready: Boolean(employee),
      icon: UserRound,
    },
    {
      label: "GPS",
      value: gpsLocked ? resolvedLocationLabel : "Menunggu izin lokasi",
      ready: gpsLocked,
      icon: Navigation,
    },
    {
      label: "Kamera",
      value: cameraReady ? "Siap capture selfie" : "Menunggu izin kamera",
      ready: cameraReady,
      icon: Camera,
    },
  ];

  useEffect(() => {
    // Update time every minute
    const interval = setInterval(() => {
      setTimeStr(format(new Date(), "hh:mm a"));
      setDateStr(format(new Date(), "EEEE, MMM d").toUpperCase());
    }, 1000);
    setTimeStr(format(new Date(), "hh:mm a"));
    setDateStr(format(new Date(), "EEEE, MMM d").toUpperCase());

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!location) {
      setLiveLocationLabel(null);
      return;
    }

    let cancelled = false;

    const loadCurrentLocationLabel = async () => {
      try {
        const key = getCoordinateKey(location.lat, location.lng);
        const cachedLabel = historyLocationLabels[key];

        if (cachedLabel) {
          setLiveLocationLabel(cachedLabel);
          return;
        }

        const result = await reverseGeocode(location.lat, location.lng);

        if (cancelled) {
          return;
        }

        setLiveLocationLabel(result);
        setHistoryLocationLabels((current) => ({
          ...current,
          [key]: result,
        }));
      } catch {
        if (!cancelled) {
          setLiveLocationLabel(null);
        }
      }
    };

    loadCurrentLocationLabel();

    return () => {
      cancelled = true;
    };
  }, [historyLocationLabels, location]);

  useEffect(() => {
    const coordinatesToResolve = logs
      .filter((log) => log.latitude && log.longitude)
      .map((log) => ({
        latitude: Number(log.latitude),
        longitude: Number(log.longitude),
      }))
      .filter(
        ({ latitude, longitude }) =>
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          !historyLocationLabels[getCoordinateKey(latitude, longitude)],
      );

    if (coordinatesToResolve.length === 0) {
      return;
    }

    let cancelled = false;

    const resolveLogLocations = async () => {
      const resolvedEntries = await Promise.all(
        coordinatesToResolve.map(async ({ latitude, longitude }) => {
          try {
            const result = await reverseGeocode(latitude, longitude);
            return [getCoordinateKey(latitude, longitude), result] as const;
          } catch {
            return null;
          }
        }),
      );

      if (cancelled) {
        return;
      }

      const nextEntries = Object.fromEntries(
        resolvedEntries.filter((entry): entry is readonly [string, ReverseGeocodeResult] => Boolean(entry)),
      );

      if (Object.keys(nextEntries || {}).length > 0) {
        setHistoryLocationLabels((current) => ({
          ...current,
          ...nextEntries,
        }));
      }
    };

    resolveLogLocations();

    return () => {
      cancelled = true;
    };
  }, [historyLocationLabels, logs]);

  useEffect(() => {
    // Init Live Camera
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setCameraError("Camera belum bisa diakses. Izinkan kamera lalu refresh halaman.");
      }
    }

    startCamera();

    if (!navigator.geolocation) {
      setGpsError("Browser ini tidak mendukung geolocation.");
      return;
    }

    const handleLocationSuccess = (pos: GeolocationPosition) => {
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setGpsLocked(true);
      setGpsError("");
    };

    const handleLocationError = (err: GeolocationPositionError | unknown) => {
      setGpsLocked(false);
      setGpsError(getGeolocationErrorMessage(err));
    };

    navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    const watchId = navigator.geolocation.watchPosition(handleLocationSuccess, handleLocationError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    });
    
    refreshAttendanceData();

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    if (!capturedPhoto) {
      setCapturedPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(capturedPhoto);
    setCapturedPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [capturedPhoto]);

  const canSubmit = gpsLocked && cameraReady && Boolean(employee) && Boolean(currentShift.value) && !isSubmitting;

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setSubmitError("Kamera belum siap untuk capture.");
      return null;
    }

    if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
      setSubmitError("Preview kamera belum siap. Coba tunggu sebentar lalu ulangi.");
      return null;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setSubmitError("Capture foto gagal dibuat. Coba ulangi lagi.");
      return null;
    }

    return new File([blob], `attendance-${Date.now()}.jpg`, { type: "image/jpeg" });
  };

  const handleCapturePhoto = async () => {
    setIsCapturing(true);
    setSubmitError("");
    setCaptureMessage("");

    try {
      const file = await captureFrame();

      if (!file) {
        return;
      }

      setCapturedPhoto(file);
      setCaptureMessage("Foto berhasil di-capture dan siap dipakai untuk attendance.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleClock = async (type: "checked-in" | "checked-out") => {
    if (!videoRef.current || !canvasRef.current || !location || !employee) {
      setSubmitError("Kamera, GPS, atau profil user belum siap.");
      return;
    }
    
    setIsSubmitting(type);
    setSubmitError("");
    setSubmitMessage("");
    setCaptureMessage("");

    try {
      const file = capturedPhoto ?? await captureFrame();

      if (!file) {
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("uploadTarget", "attendance");
      formData.append("type", type);
      formData.append("latitude", location.lat.toString());
      formData.append("longitude", location.lng.toString());
      formData.append("locationName", resolvedLocationLabel);
      formData.append("shiftCode", currentShift.value);
      formData.append("shiftLabel", currentShift.label);
      formData.append("shiftWindow", currentShift.window);
      formData.append("workMode", workMode);
      formData.append("attendanceContext", currentAttendanceContext.label);
      formData.append("overtimeMinutes", `${attendanceContext === "overtime" ? overtimeMinutes : 0}`);
      formData.append("operationalNote", operationalNote.trim());

      const res = await submitAttendance(formData);
      if (res.success) {
        setSubmitMessage("Attendance berhasil dicatat.");
        setCapturedPhoto(null);
        setOperationalNote("");
        await refreshAttendanceData();
      } else {
        setSubmitError(res.error || "Failed to log attendance");
      }
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface md:p-5">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col overflow-hidden bg-surface-container-lowest md:min-h-0 md:rounded-[1.25rem] md:ring-1 md:ring-border/60">
        <div className="flex items-center justify-between bg-surface-container-low px-5 py-4 md:px-6 md:py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Attendance Module</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-950 md:text-2xl">Live / Import</h1>
          </div>
          <div className={`rounded-2xl px-4 py-3 text-right ${canSubmit ? "bg-emerald-50" : "bg-amber-50"}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${canSubmit ? "text-emerald-600" : "text-amber-600"}`}>Status</p>
            <p className={`text-sm font-semibold ${canSubmit ? "text-emerald-900" : "text-amber-900"}`}>
              {canSubmit ? `Ready for ${recommendedAction}` : "Waiting Permission"}
            </p>
          </div>
        </div>

        <div className="grid flex-1 gap-0 md:items-start md:grid-cols-[minmax(0,1.25fr)_minmax(360px,420px)]">
          <section className="relative overflow-hidden bg-surface-container-low px-4 pb-6 pt-4 text-foreground md:px-6 md:pb-6 md:pt-6">
            <div className="relative flex h-full flex-col">
              <div className="mb-5 flex items-start justify-between gap-4 md:mb-8">
                <div>
                  <p className="text-sm font-medium text-foreground">Realtime camera</p>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground md:text-base">
                    Pastikan wajah terlihat jelas, pencahayaan cukup, dan lokasi GPS sudah terkunci sebelum clock in atau clock out.
                  </p>
                </div>
                <div className="hidden rounded-2xl bg-white px-4 py-3 ring-1 ring-border/60 md:block">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Current time</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight">{timeStr || "--:--"}</p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">{dateStr || "-"}</p>
                </div>
              </div>

              <div className="relative flex-1 overflow-hidden rounded-[1.25rem] bg-black ring-1 ring-border/60 md:h-[480px] md:flex-none lg:h-[520px]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={() => setCameraReady(true)}
                  className="h-full min-h-[340px] w-full object-cover md:min-h-0"
                />
                <div className="pointer-events-none absolute inset-0 bg-black/5" />

                <div className="absolute left-4 right-4 top-4 flex flex-col gap-3 md:left-6 md:right-6 md:top-6">
                  <div className="flex items-start gap-3 rounded-2xl bg-white/95 p-3 text-slate-900 ring-1 ring-border/60 md:p-4">
                    <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl ${gpsLocked ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                        {gpsLocked ? "GPS Locked" : "Acquiring GPS"}
                      </p>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-900 md:text-base">{resolvedLocationLabel}</p>
                      <p className="mt-1 break-words text-xs text-slate-500 md:text-sm">
                        {resolvedLocationDetail ? `${resolvedLocationDetail} • ${coordinateLabel}` : coordinateLabel}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${cameraReady ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                      {cameraReady ? "Camera Ready" : "Waiting Camera"}
                    </div>
                    <div className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${gpsLocked ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                      {gpsLocked ? "GPS Ready" : "Waiting GPS"}
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between md:bottom-6 md:left-6 md:right-6">
                  <div className="rounded-2xl bg-white/95 px-3 py-2 text-slate-900 ring-1 ring-border/60">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Live Preview</p>
                    <p className="mt-1 text-sm font-medium text-white">
                      {capturedPhoto ? "Foto terakhir siap dipakai untuk attendance" : "Wajah harus berada di dalam frame"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    disabled={!cameraReady || isCapturing}
                    className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/90 p-4 text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCapturing ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <Camera className="h-6 w-6 text-white" />}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside className="flex flex-col bg-surface-container-lowest px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 md:px-6 md:py-8">
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col md:max-w-none">
              <div className="rounded-[1.25rem] bg-surface-container-low p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <UserRound className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-slate-950">{employee?.name ?? "HERO User"}</p>
                    <p className="truncate text-sm text-slate-500">{employee?.jobTitle || employee?.siteName || "Site Team"}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[1.25rem] bg-surface-container-lowest p-5 ring-1 ring-border/60">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">Current time</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-5xl font-semibold tracking-tight text-slate-950">{timeStr.split(" ")[0] || "--:--"}</span>
                  <span className="pb-1 text-xl font-semibold text-slate-500">{timeStr.split(" ")[1] || ""}</span>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-500">{dateStr || "-"}</p>
              </div>

              <div className="mt-4 rounded-[1.25rem] bg-surface-container-lowest p-5 ring-1 ring-border/60">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Konteks Attendance</h2>
                    <p className="mt-1 text-sm text-slate-500">{nextActionHint}</p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {recommendedAction}
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold uppercase text-slate-500">Shift / Roster</span>
                    <select
                      value={selectedShift}
                      onChange={(event) => setSelectedShift(event.target.value)}
                      disabled={shiftOptions.length === 0}
                      className="h-11 rounded-lg border border-[rgba(66,71,80,0.14)] bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {shiftOptions.map((shift) => (
                        <option key={shift.value} value={shift.value}>
                          {shift.label} - {shift.window}
                        </option>
                      ))}
                      {shiftOptions.length === 0 ? (
                        <option value="">Shift belum tersedia</option>
                      ) : null}
                    </select>
                    <span className="text-xs text-slate-500">{currentShift.helper}</span>
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1.5">
                      <span className="text-xs font-semibold uppercase text-slate-500">Lokasi Kerja</span>
                      <select
                        value={workMode}
                        onChange={(event) => setWorkMode(event.target.value as typeof workMode)}
                        className="h-11 rounded-lg border border-[rgba(66,71,80,0.14)] bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {workModeOptions.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1.5">
                      <span className="text-xs font-semibold uppercase text-slate-500">Kondisi</span>
                      <select
                        value={attendanceContext}
                        onChange={(event) => setAttendanceContext(event.target.value as typeof attendanceContext)}
                        className="h-11 rounded-lg border border-[rgba(66,71,80,0.14)] bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {attendanceContextOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {attendanceContext === "overtime" ? (
                    <label className="grid gap-1.5">
                      <span className="text-xs font-semibold uppercase text-slate-500">Estimasi Lembur</span>
                      <input
                        type="number"
                        min={0}
                        step={30}
                        value={overtimeMinutes}
                        onChange={(event) => setOvertimeMinutes(Math.max(0, Number(event.target.value) || 0))}
                        className="h-11 rounded-lg border border-[rgba(66,71,80,0.14)] bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Enter overtime minutes"
                      />
                      <span className="text-xs text-slate-500">Tercatat sebagai {formatOvertimeLabel(overtimeMinutes)} untuk referensi approval/payroll.</span>
                    </label>
                  ) : (
                    <p className="rounded-lg bg-surface-container-low px-3 py-2 text-xs text-slate-600">
                      {currentAttendanceContext.helper}
                    </p>
                  )}

                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold uppercase text-slate-500">Catatan Singkat</span>
                    <textarea
                      value={operationalNote}
                      onChange={(event) => setOperationalNote(event.target.value)}
                      maxLength={160}
                      rows={3}
                      className="resize-none rounded-lg border border-[rgba(66,71,80,0.14)] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Example: standby in workshop, shift B replacement, or emergency work."
                    />
                    <span className="text-right text-[11px] text-slate-400">{operationalNote.length}/160</span>
                  </label>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {readinessItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className="flex items-center gap-3 rounded-[1.25rem] bg-surface-container-low p-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase text-slate-500">{item.label}</p>
                        <p className="truncate text-sm font-semibold text-slate-950">{item.value}</p>
                      </div>
                      {item.ready ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 space-y-3">
                {submitError ? (
                  <Alert className="border-rose-200 bg-rose-50 text-rose-900">
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                ) : null}
                {submitMessage ? (
                  <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>{submitMessage}</AlertDescription>
                  </Alert>
                ) : null}
                {cameraError ? (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                    <AlertDescription>{cameraError}</AlertDescription>
                  </Alert>
                ) : null}
                {gpsError ? (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                    <AlertDescription>{gpsError}</AlertDescription>
                  </Alert>
                ) : null}
                {captureMessage ? (
                  <Alert className="border-sky-200 bg-sky-50 text-sky-900">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>{captureMessage}</AlertDescription>
                  </Alert>
                ) : null}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleClock("checked-in")}
                  disabled={!canSubmit}
                  className="h-14 rounded-[1rem] bg-slate-950 text-white hover:bg-slate-800"
                >
                  {isSubmitting === "checked-in" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  Clock In
                </Button>
                <Button
                  onClick={() => handleClock("checked-out")}
                  disabled={!canSubmit}
                  variant="outline"
                  className="h-14 rounded-[1rem] bg-surface-container-low text-foreground hover:bg-surface-container-highest"
                >
                  {isSubmitting === "checked-out" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  Clock Out
                </Button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-1">
                <div className="rounded-[1.1rem] bg-surface-container-low p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-950">Yang akan tercatat</p>
                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-slate-500" />
                          <span className="truncate">{currentShift.label} ({currentShift.window})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BriefcaseBusiness className="h-4 w-4 text-slate-500" />
                          <span className="truncate">{workMode} - {currentAttendanceContext.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TimerReset className="h-4 w-4 text-slate-500" />
                          <span className="truncate">Lembur: {attendanceContext === "overtime" ? formatOvertimeLabel(overtimeMinutes) : "Tidak ada"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Camera className="h-4 w-4 text-slate-500" />
                          <span className="truncate">Selfie, GPS, jam server, dan lokasi akan menjadi evidence.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[1.25rem] bg-surface-container-lowest p-5 ring-1 ring-border/60">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">Capture Preview</h3>
                    <p className="text-sm text-slate-500">Hasil foto terakhir sebelum attendance dikirim.</p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {capturedPreviewUrl ? "Ready" : "Waiting"}
                  </div>
                </div>

                {capturedPreviewUrl ? (
                    <div className="mt-4 overflow-hidden rounded-[1.1rem] bg-slate-950">
                    <img
                      src={capturedPreviewUrl}
                      alt="Preview capture attendance"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="mt-4 rounded-[1.1rem] bg-surface-container-low px-4 py-8 text-center text-sm text-muted-foreground">
                    Belum ada foto yang di-capture. Tekan tombol kamera di preview untuk melihat hasilnya di sini.
                  </div>
                )}
              </div>

              <div className="mt-4 flex-1 rounded-[1.25rem] bg-surface-container-lowest p-5 ring-1 ring-border/60">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">Log Shift Ini</h3>
                    <p className="text-sm text-slate-500">Termasuk shift malam yang melewati pergantian tanggal.</p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {logs.length} records
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {logs.length === 0 ? (
                    <div className="rounded-2xl bg-surface-container-low px-4 py-8 text-center text-sm text-muted-foreground">
                      Belum ada attendance yang tercatat untuk window shift ini.
                    </div>
                  ) : (
                    logs.map((log) => (
                      (() => {
                        const coordinateText =
                          log.latitude && log.longitude
                            ? getCoordinateLabel(log.latitude, log.longitude)
                            : null;
                        const historyKey =
                          log.latitude && log.longitude
                            ? getCoordinateKey(log.latitude, log.longitude)
                            : null;
                        const reverseLabel = historyKey ? historyLocationLabels[historyKey] : null;
                        const parsedNote = splitAttendanceNote(log.locationNote);
                        const locationLines = [
                          reverseLabel?.label ?? null,
                          reverseLabel?.detail ?? null,
                          coordinateText,
                          parsedNote.locationNote,
                          ...parsedNote.details,
                        ].filter((line, index, lines) => {
                          if (!line) {
                            return false;
                          }

                          const normalizedLine = normalizeTextLine(line);
                          return lines.findIndex((candidate) => normalizeTextLine(candidate ?? null) === normalizedLine) === index;
                        });

                        return (
                          <div key={log.id} className="relative rounded-2xl bg-surface-container-low px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              {format(new Date(log.eventTime), "hh:mm a")}
                            </p>
                            <p className="mt-1 text-base font-semibold capitalize text-slate-950">
                              {log.eventType.replace("-", " ")}
                            </p>
                            <div className="mt-2 space-y-1">
                              {locationLines.map((line, index) => (
                                <p
                                  key={`${log.id}-${index}`}
                                  className={`text-sm leading-6 ${index === 0 ? "font-medium text-slate-700" : "text-slate-500"}`}
                                >
                                  {line}
                                </p>
                              ))}
                            </div>
                          </div>
                        );
                      })()
                    ))
                  )}
                </div>
                <p className="mt-4 text-[11px] text-slate-400">
                  Area label menggunakan reverse geocoding OpenStreetMap.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
