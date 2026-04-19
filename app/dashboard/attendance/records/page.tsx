"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ExternalLink, ImageOff, MapPin } from "lucide-react";
import { getTodayAttendanceLogs } from "@/app/actions/attendance";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";

type AttendanceRecord = {
  id: number;
  eventType: string;
  eventTime: Date | string;
  locationNote: string;
  photoUrl: string | null;
  photoPreviewUrl?: string | null;
  latitude: string | null;
  longitude: string | null;
  employeeName: string;
  employeeEmail: string;
  siteName: string;
  workLocation: string;
};

type AttendanceEmployee = {
  id: number;
  name: string;
  email: string;
  jobTitle: string;
  workLocation: string;
  siteName: string;
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

type SelectedPhoto = {
  id: number;
  type: string;
  time: Date | string;
  location: string;
  url: string;
  previewUrl: string;
};

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

function getLogCoordinateLabel(log: AttendanceRecord) {
  if (!log.latitude || !log.longitude) {
    return null;
  }

  return getCoordinateLabel(log.latitude, log.longitude);
}

function isCoordinateOnly(value: string | null | undefined) {
  return /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(value?.trim() ?? "");
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
    label: primary || "Lokasi GPS terdeteksi",
    detail: secondary ?? null,
  };
}

async function reverseGeocode(latitude: number, longitude: number) {
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
}

export default function AttendanceRecordsPage() {
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [employee, setEmployee] = useState<AttendanceEmployee | null>(null);
  const [locationLabels, setLocationLabels] = useState<Record<string, ReverseGeocodeResult>>({});
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(null);
  const [photoErrorId, setPhotoErrorId] = useState<number | null>(null);

  const refreshLogs = useCallback(async () => {
    const res = await getTodayAttendanceLogs();
      if (res.success && res.employee) {
        setEmployee(res.employee);
        setLogs(res.logs);
      }
  }, []);

  useEffect(() => {
    void refreshLogs();
  }, [refreshLogs]);

  useEffect(() => {
    const handleFocus = () => {
      void refreshLogs();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshLogs();
      }
    };
    const intervalId = window.setInterval(() => void refreshLogs(), 15000);

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshLogs]);

  const coordinatesToResolve = useMemo(
    () =>
      logs
        .filter((log) => log.latitude && log.longitude)
        .map((log) => ({
          latitude: Number(log.latitude),
          longitude: Number(log.longitude),
        }))
        .filter(
          ({ latitude, longitude }) =>
            Number.isFinite(latitude) &&
            Number.isFinite(longitude) &&
            !locationLabels[getCoordinateKey(latitude, longitude)],
        ),
    [locationLabels, logs],
  );

  useEffect(() => {
    if (coordinatesToResolve.length === 0) {
      return;
    }

    let cancelled = false;

    const resolveLocations = async () => {
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

      if (Object.keys(nextEntries).length > 0) {
        setLocationLabels((current) => ({
          ...current,
          ...nextEntries,
        }));
      }
    };

    resolveLocations();

    return () => {
      cancelled = true;
    };
  }, [coordinatesToResolve]);

  const getLocationLines = (log: AttendanceRecord) => {
    const coordinateText = getLogCoordinateLabel(log);
    const coordinateKey = log.latitude && log.longitude ? getCoordinateKey(log.latitude, log.longitude) : null;
    const resolvedLocation = coordinateKey ? locationLabels[coordinateKey] : null;
    const parsedNote = splitAttendanceNote(log.locationNote);
    const note = isCoordinateOnly(parsedNote.locationNote) ? null : parsedNote.locationNote;

    return [
      resolvedLocation?.label ?? note ?? (coordinateText ? "Mencari nama lokasi..." : "Lokasi belum tersedia"),
      resolvedLocation?.detail ?? null,
      coordinateText,
    ].filter((line, index, lines) => {
      if (!line) {
        return false;
      }

      const normalizedLine = normalizeTextLine(line);
      return lines.findIndex((candidate) => normalizeTextLine(candidate ?? null) === normalizedLine) === index;
    });
  };

  const getOperationalDetails = (log: AttendanceRecord) => splitAttendanceNote(log.locationNote).details;

  const handleOpenPhoto = (log: AttendanceRecord) => {
    if (!log.photoUrl) {
      return;
    }

    const locationLines = getLocationLines(log);

    setPhotoErrorId(null);
    setSelectedPhoto({
      id: log.id,
      type: log.eventType === "checked-out" ? "Clock Out / Jam Pulang" : "Clock In / Jam Masuk",
      time: log.eventTime,
      location: locationLines[0] ?? "Attendance record",
      url: log.photoUrl,
      previewUrl: log.photoPreviewUrl || log.photoUrl,
    });
  };

  const selectedPhotoFailed = selectedPhoto ? photoErrorId === selectedPhoto.id : false;
  const clockInLog = logs.find((log) => log.eventType === "checked-in") ?? null;
  const clockOutLog = logs.find((log) => log.eventType === "checked-out") ?? null;
  const overtimeDetails = logs
    .flatMap((log) => getOperationalDetails(log))
    .filter((detail) => detail.toLowerCase().startsWith("lembur:") && !detail.toLowerCase().includes("tidak ada"));

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <p className="industrial-label">Attendance Ledger</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-foreground">Attendance Records</h1>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="surface-muted-card rounded-[1.25rem] p-4 md:col-span-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">User & Site</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{employee?.name ?? "HERO User"}</p>
          <p className="text-sm text-muted-foreground">{employee?.siteName ?? "Site belum tersedia"} - {employee?.workLocation ?? "Lokasi kerja belum tersedia"}</p>
        </div>
        <div className="surface-muted-card rounded-[1.25rem] p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Jam Masuk</p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {clockInLog ? format(new Date(clockInLog.eventTime), "HH:mm") : "--:--"}
          </p>
          <p className="text-sm text-muted-foreground">Photo evidence tersimpan per record.</p>
        </div>
        <div className="surface-muted-card rounded-[1.25rem] p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Jam Pulang / Lembur</p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {clockOutLog ? format(new Date(clockOutLog.eventTime), "HH:mm") : "--:--"}
          </p>
          <p className="text-sm text-muted-foreground">{overtimeDetails[0] ?? "Belum ada lembur tercatat"}</p>
        </div>
      </div>

      <div className="surface-module-card overflow-hidden rounded-[1.5rem]">
        <MinimalTableShell
          label="attendance records"
          fileName="attendance-records"
          searchPlaceholder="Cari user, site, tipe attendance, atau lokasi..."
          summaryClassName="bg-transparent px-1 py-0 shadow-none"
          className="p-4"
        >
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse text-left">
              <thead>
                <tr className="bg-surface-container-low text-sm font-semibold text-muted-foreground">
                  <th className="p-4">User / Site</th>
                  <th className="p-4">Time</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Shift & Overtime</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">GPS Coordinates</th>
                  <th className="p-4">Photo Evidence</th>
                </tr>
              </thead>
              <tbody className="text-sm text-foreground">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No attendance records found for this shift window.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const coordinateText = getLogCoordinateLabel(log);
                    const locationLines = getLocationLines(log);
                    const operationalDetails = getOperationalDetails(log);
                    const mapUrl = coordinateText
                      ? `https://www.google.com/maps?q=${encodeURIComponent(coordinateText)}`
                      : null;

                    return (
                      <tr
                        key={log.id}
                        data-date-value={new Date(log.eventTime).toISOString()}
                        className="border-b border-[rgba(66,71,80,0.08)] last:border-0 hover:bg-surface-container-low"
                      >
                        <td className="p-4">
                          <p className="font-semibold text-foreground">{log.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{log.siteName}</p>
                          <p className="text-xs text-muted-foreground">{log.workLocation}</p>
                        </td>
                        <td className="p-4 font-medium">{format(new Date(log.eventTime), "PPpp")}</td>
                        <td className="p-4 capitalize">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${log.eventType === "checked-in" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                            {log.eventType === "checked-out" ? "Clock Out / Jam Pulang" : "Clock In / Jam Masuk"}
                          </span>
                        </td>
                        <td className="p-4">
                          {operationalDetails.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {operationalDetails.map((detail) => (
                                <span key={detail} className="rounded-full bg-surface-container-low px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                                  {detail}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Belum ada detail shift.</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground">{locationLines[0]}</p>
                              {locationLines.slice(1).map((line) => (
                                <p key={line} className="text-xs text-muted-foreground">
                                  {line}
                                </p>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-mono text-muted-foreground">
                          {coordinateText ? (
                            <div className="space-y-1">
                              <p>{coordinateText}</p>
                              {mapUrl ? (
                                <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-sans font-semibold text-primary hover:underline">
                                  Open map
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : null}
                            </div>
                          ) : (
                            "No GPS"
                          )}
                        </td>
                        <td className="p-4">
                          {log.photoUrl ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 rounded-lg px-3 text-xs normal-case tracking-normal"
                              onClick={() => handleOpenPhoto(log)}
                            >
                              View Photo
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </MinimalTableShell>
      </div>

      <Dialog
        open={Boolean(selectedPhoto)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPhoto(null);
            setPhotoErrorId(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Foto Attendance</DialogTitle>
            <DialogDescription>
              {selectedPhoto
                ? `${selectedPhoto.type} - ${format(new Date(selectedPhoto.time), "PPpp")} - ${selectedPhoto.location}`
                : "Preview foto attendance"}
            </DialogDescription>
          </DialogHeader>

          <div className="mx-6 mb-6 overflow-hidden rounded-lg border border-[rgba(66,71,80,0.12)] bg-slate-950">
            {selectedPhoto && !selectedPhotoFailed ? (
              <img
                src={selectedPhoto.previewUrl}
                alt={`Foto attendance ${selectedPhoto.type}`}
                className="max-h-[70vh] w-full object-contain"
                onError={() => setPhotoErrorId(selectedPhoto.id)}
              />
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center text-white">
                <ImageOff className="h-10 w-10 text-slate-300" />
                <div>
                  <p className="font-semibold">Foto belum bisa dimuat.</p>
                  <p className="mt-1 text-sm text-slate-300">
                    Coba refresh halaman. Jika masih gagal, cek akses Object Storage untuk attendance photo.
                  </p>
                </div>
                {selectedPhoto?.url ? (
                  <a
                    href={selectedPhoto.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-sky-200 hover:underline"
                  >
                    Buka URL asli
                  </a>
                ) : null}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
