"use client";

/**
 * Multi Attendance Terminal — PT Chitra Paratama
 * Route: /multi-attendance  (PUBLIC — no auth, kiosk mode)
 *
 * Features:
 * - Dynamic real-time Face Tracking (FaceDetector API + Universal Canvas Skin Centroid Tracker)
 * - Automatic face recognition & logging to sidebar / DB
 * - Audio Voice Greeting on recognition (Web Speech API)
 * - 3-minute cooldown per employee to prevent rapid duplicate records
 * - LocalStorage persistence for Site + Shift setup
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SiteOption {
  id: number;
  name: string;
  location: string;
}

interface ShiftOption {
  code: string;
  label: string;
  windowLabel: string;
  helper: string;
}

interface HistoryEntry {
  id: number;
  employee_name: string;
  employee_sn: string;
  job_title: string;
  event_type: string;
  event_time: string;
  confidence_score: string | null;
  location_note: string;
}

interface RecognitionResult {
  recognized: boolean;
  employee_id?: number;
  employee_name?: string;
  employee_sn?: string;
  job_title?: string;
  event_type?: "checked-in" | "checked-out";
  confidence?: number;
  timestamp?: string;
  record_id?: number;
  error?: string;
  reason?: string;
}

interface FaceBox {
  id: string;
  topPercent: number;
  leftPercent: number;
  widthPercent: number;
  heightPercent: number;
  rawX: number;
  rawY: number;
  rawWidth: number;
  rawHeight: number;
  employeeName?: string;
  confidence?: number;
  isMatch?: boolean;
}

type TerminalPhase = "setup" | "scanning" | "recognized" | "error";

// ─── Constants ────────────────────────────────────────────────────────────────

const SCAN_INTERVAL_MS = 2000;
const SUCCESS_DISPLAY_MS = 4000;
const LS_KEY = "hero_multi_attendance_setup";

// ─── Voice Speech Helper ──────────────────────────────────────────────────────

function speakGreeting(text: string) {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech errors
    }
  }
}

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

interface SavedSetup {
  siteId: number;
  shiftCode: string;
}

function loadSavedSetup(): SavedSetup | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.siteId === "number" && typeof parsed.shiftCode === "string") {
      return parsed as SavedSetup;
    }
    return null;
  } catch {
    return null;
  }
}

function saveSetup(siteId: number, shiftCode: string) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ siteId, shiftCode }));
  } catch {
    // ignore storage errors
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Dynamic Real-time Face Tracking Box Overlay Supporting Multiple People */
function FaceTrackerOverlay({
  faceBoxes,
  active,
  success = false,
  checkout = false,
  processing = false,
  employeeName,
  confidence,
}: {
  faceBoxes: FaceBox[];
  active?: boolean;
  success?: boolean;
  checkout?: boolean;
  processing?: boolean;
  employeeName?: string;
  confidence?: number;
}) {
  if (faceBoxes.length === 0) {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="w-56 h-72 rounded-[40px] border-2 border-dashed border-sky-400/40 animate-pulse flex flex-col items-center justify-between p-5"
          style={{ boxShadow: "0 0 30px rgba(56, 189, 248, 0.12)" }}
        >
          <div className="text-[10px] font-bold text-sky-400 uppercase tracking-widest bg-sky-950/70 px-3.5 py-1 rounded-full border border-sky-400/30 shadow-md">
            Arahkan Wajah Ke Sini
          </div>
          <div className="text-[10px] text-gray-400 font-semibold text-center leading-tight">
            Mendukung beberapa orang sekaligus
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {faceBoxes.map((box, idx) => {
        const isThisMatch = box.isMatch || (success && (faceBoxes.length === 1 || !!employeeName));
        const name = box.employeeName || (isThisMatch ? employeeName : undefined);
        const conf = box.confidence ?? (isThisMatch ? confidence : undefined);
        const confPct = conf ? `${(conf * 100).toFixed(1)}%` : "";

        const color = isThisMatch
          ? checkout
            ? "#f59e0b"
            : "#16a34a"
          : processing
          ? "#0284c7"
          : "#22c55e";

        return (
          <div
            key={box.id || idx}
            className="absolute transition-all duration-150 ease-out flex flex-col items-center justify-between"
            style={{
              top: `${box.topPercent}%`,
              left: `${box.leftPercent}%`,
              width: `${box.widthPercent}%`,
              height: `${box.heightPercent}%`,
              border: isThisMatch ? `2.5px solid ${color}` : `1.5px solid ${color}cc`,
              boxShadow: isThisMatch
                ? `0 0 35px ${color}70`
                : `0 0 20px ${color}35`,
              background: isThisMatch ? `${color}10` : "transparent",
              borderRadius: "16px",
            }}
          >
            {/* Floating Green Badge Pill Above Face */}
            {isThisMatch && name && (
              <div
                className="absolute -top-11 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-white shadow-lg whitespace-nowrap transition-all duration-300 z-30"
                style={{
                  background: checkout ? "#d97706" : "#16a34a",
                  boxShadow: checkout
                    ? "0 4px 14px rgba(217,119,6,0.5)"
                    : "0 4px 14px rgba(22,163,74,0.5)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12l5 5L20 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="font-semibold text-white tracking-wide">{name}</span>
                {confPct && <span className="font-mono text-xs opacity-95">{confPct}</span>}
              </div>
            )}

            {!isThisMatch && (
              <div
                className="mt-2 rounded-full px-2.5 py-0.5 text-[9px] font-extrabold tracking-widest uppercase shadow-sm"
                style={{
                  background: `${color}25`,
                  color: color,
                  border: `1px solid ${color}40`,
                  backdropFilter: "blur(4px)",
                }}
              >
                {processing ? "MENGANALISA WAJAH..." : `WAJAH #${idx + 1}`}
              </div>
            )}

            {/* 5 Facial Landmark Dots */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute w-1.5 h-1.5 rounded-full top-[36%] left-[34%]" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
              <div className="absolute w-1.5 h-1.5 rounded-full top-[36%] right-[34%]" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
              <div className="absolute w-1.5 h-1.5 rounded-full top-[50%] left-[49%]" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
              <div className="absolute w-1.5 h-1.5 rounded-full bottom-[30%] left-[38%]" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
              <div className="absolute w-1.5 h-1.5 rounded-full bottom-[30%] right-[38%]" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            </div>

            {/* L-Bracket Reticle Corners */}
            {(["tl", "tr", "bl", "br"] as const).map((corner) => (
              <div
                key={corner}
                className="absolute"
                style={{
                  width: 20,
                  height: 20,
                  top: corner.startsWith("t") ? -2 : "auto",
                  bottom: corner.startsWith("b") ? -2 : "auto",
                  left: corner.endsWith("l") ? -2 : "auto",
                  right: corner.endsWith("r") ? -2 : "auto",
                  borderTop: corner.startsWith("t") ? `3px solid ${color}` : "none",
                  borderBottom: corner.startsWith("b") ? `3px solid ${color}` : "none",
                  borderLeft: corner.endsWith("l") ? `3px solid ${color}` : "none",
                  borderRight: corner.endsWith("r") ? `3px solid ${color}` : "none",
                  borderRadius: corner === "tl" ? "8px 0 0 0" : corner === "tr" ? "0 8px 0 0" : corner === "bl" ? "0 0 0 8px" : "0 0 8px 0",
                }}
              />
            ))}

            {/* Bottom Lock Indicator */}
            <div className="mb-2 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider" style={{ color }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: color, animation: "pulse 1.2s infinite" }} />
              {isThisMatch ? "MATCH LOCKED" : "FACE DETECTED"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Recognized employee card — slides up from center */
function RecognizedCard({ result, visible }: { result: RecognitionResult | null; visible: boolean }) {
  if (!result?.recognized) return null;
  const isIn = result.event_type === "checked-in";
  const accent = isIn ? "#16a34a" : "#d97706";
  const bg = isIn ? "#f0fdf4" : "#fffbeb";
  const border = isIn ? "#bbf7d0" : "#fde68a";
  const label = isIn ? "CLOCK IN" : "CLOCK OUT";

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none px-6"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
      }}
    >
      <div
        className="w-full max-w-xs rounded-3xl p-7 text-center shadow-2xl"
        style={{ background: bg, border: `1.5px solid ${border}` }}
      >
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
          style={{ background: `${accent}18`, border: `1.5px solid ${accent}30` }}
        >
          {isIn ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="9" stroke={accent} strokeWidth="2" />
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          )}
        </div>

        {/* Badge */}
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-4 text-xs font-bold tracking-widest"
          style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
          {label} BERHASIL
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-0.5">{result.employee_name}</h2>
        <p className="text-sm text-gray-500 mb-1">
          {result.employee_sn && (
            <span className="font-mono bg-gray-100 rounded-md px-1.5 py-0.5 mr-1.5 text-xs">
              #{result.employee_sn}
            </span>
          )}
          {result.job_title}
        </p>

        <div className="flex items-center justify-center gap-3 mt-4 pt-3 border-t border-gray-100">
          {result.confidence !== undefined && (
            <span className="text-xs font-semibold" style={{ color: accent }}>
              {Math.round(result.confidence * 100)}% match
            </span>
          )}
          {result.timestamp && (
            <span className="text-xs font-mono text-gray-400">
              {format(new Date(result.timestamp), "HH:mm:ss")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Setup modal — site + shift selection */
function SetupModal({
  sites,
  shifts,
  savedSiteId,
  savedShiftCode,
  onConfirm,
  onClose,
  isEdit,
}: {
  sites: SiteOption[];
  shifts: ShiftOption[];
  savedSiteId?: number;
  savedShiftCode?: string;
  onConfirm: (siteId: number, shiftCode: string) => void;
  onClose?: () => void;
  isEdit: boolean;
}) {
  const [selSite, setSelSite] = useState<number>(savedSiteId ?? sites[0]?.id ?? 0);
  const [selShift, setSelShift] = useState<string>(savedShiftCode ?? shifts[0]?.code ?? "day");

  useEffect(() => {
    if (!savedSiteId && sites[0]) setSelSite(sites[0].id);
    if (!savedShiftCode && shifts[0]) setSelShift(shifts[0].code);
  }, [sites, shifts, savedSiteId, savedShiftCode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{ border: "1.5px solid #e5e7eb" }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" fill="white" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-blue-500">
                  Attendance Terminal
                </p>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">
                  {isEdit ? "Ubah Setup Terminal" : "Setup Terminal Absensi"}
                </h1>
              </div>
            </div>
            {isEdit && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M6 18L18 6M6 6l12 12" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-3 ml-15">
            Pilih site dan shift untuk sesi ini. Setting otomatis tersimpan dan tidak hilang saat refresh.
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Site */}
          <div>
            <label className="block text-xs font-bold tracking-[0.2em] uppercase text-gray-400 mb-3">
              Site / Lokasi Kerja
            </label>
            {sites.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Belum ada site terdaftar</p>
                  <p className="text-xs text-amber-600 mt-0.5">Tambah site di Master Data → Sites terlebih dahulu</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {sites.map((site) => {
                  const selected = selSite === site.id;
                  return (
                    <button
                      key={site.id}
                      type="button"
                      onClick={() => setSelSite(site.id)}
                      className="w-full text-left px-4 py-3 rounded-2xl border-2 transition-all duration-150"
                      style={{
                        borderColor: selected ? "#2563eb" : "#e5e7eb",
                        background: selected ? "#eff6ff" : "#ffffff",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{site.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{site.location || "—"}</p>
                        </div>
                        {selected && (
                          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                              <path d="M5 12l5 5L20 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Shift */}
          <div>
            <label className="block text-xs font-bold tracking-[0.2em] uppercase text-gray-400 mb-3">
              Shift Kerja
            </label>
            <div className="grid grid-cols-2 gap-2">
              {shifts.map((shift) => {
                const selected = selShift === shift.code;
                return (
                  <button
                    key={shift.code}
                    type="button"
                    onClick={() => setSelShift(shift.code)}
                    className="text-left px-4 py-3 rounded-2xl border-2 transition-all duration-150"
                    style={{
                      borderColor: selected ? "#2563eb" : "#e5e7eb",
                      background: selected ? "#eff6ff" : "#ffffff",
                    }}
                  >
                    <p className="font-bold text-sm text-gray-900">{shift.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{shift.windowLabel || shift.helper}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 pt-4 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            disabled={!selSite || !selShift || sites.length === 0}
            onClick={() => onConfirm(selSite, selShift)}
            className="w-full py-4 rounded-2xl font-bold text-base bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
          >
            {isEdit ? "Simpan & Lanjutkan" : "Simpan & Mulai Scanning"}
          </button>
          <p className="text-center text-xs text-gray-400 mt-3">
            💾 Setting tersimpan otomatis di browser ini
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Terminal ─────────────────────────────────────────────────────────────

export default function MultiAttendancePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isScanningRef = useRef(false);

  // Setup data from API
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [shifts, setShifts] = useState<ShiftOption[]>([]);
  const [setupLoading, setSetupLoading] = useState(true);

  // Active session
  const [selectedSite, setSelectedSite] = useState<SiteOption | null>(null);
  const [selectedShift, setSelectedShift] = useState<ShiftOption | null>(null);
  const [savedSetup, setSavedSetup] = useState<SavedSetup | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<TerminalPhase>("setup");
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Camera & Multi-Face Boxes
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [faceBoxes, setFaceBoxes] = useState<FaceBox[]>([]);
  const faceBoxesRef = useRef<FaceBox[]>([]);
  const scanIndexRef = useRef<number>(0);
  const faceapiRef = useRef<any>(null);

  // Recognition
  const [lastResult, setLastResult] = useState<RecognitionResult | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "processing">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showError, setShowError] = useState(false);

  // History sidebar
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Clock
  const [clockStr, setClockStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  // ── Refresh history helper ───────────────────────────────────────────────────
  const refreshHistory = useCallback(async (siteId: number) => {
    try {
      const res = await fetch(`/api/multi-attendance/history?siteId=${siteId}`);
      const data = await res.json();
      setHistory(data.records ?? []);
    } catch {
      // silent
    }
  }, []);

  // ── Clock ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      setClockStr(format(new Date(), "HH:mm:ss"));
      setDateStr(format(new Date(), "EEEE, d MMMM yyyy", { locale: localeId }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Load setup data + restore from localStorage ───────────────────────────────
  useEffect(() => {
    const saved = loadSavedSetup();
    setSavedSetup(saved);

    fetch("/api/multi-attendance/setup")
      .then((r) => r.json())
      .then((data: { sites: SiteOption[]; shifts: ShiftOption[] }) => {
        setSites(data.sites ?? []);
        setShifts(data.shifts ?? []);

        if (saved && data.sites?.length && data.shifts?.length) {
          const matchedSite = data.sites.find((s) => s.id === saved.siteId);
          const matchedShift = data.shifts.find((s) => s.code === saved.shiftCode);
          if (matchedSite && matchedShift) {
            setSelectedSite(matchedSite);
            setSelectedShift(matchedShift);
            setPhase("scanning");
            refreshHistory(matchedSite.id);
            return;
          }
        }
        setShowSetupModal(true);
        setPhase("setup");
      })
      .catch(() => {
        setShowSetupModal(true);
        setPhase("setup");
      })
      .finally(() => setSetupLoading(false));
  }, [refreshHistory]);

  // ── Auto refresh history sidebar every 5 seconds ────────────────────────────
  useEffect(() => {
    if (!selectedSite?.id || phase === "setup") return;
    refreshHistory(selectedSite.id);
    const interval = setInterval(() => {
      refreshHistory(selectedSite.id);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedSite?.id, phase, refreshHistory]);

  // ── Start camera ──────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch {
      setCameraError("Kamera tidak dapat diakses. Izinkan akses kamera lalu refresh.");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera]);

  // ── Load face-api.js tinyFaceDetector model ─────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const initFaceApi = async () => {
      try {
        const faceapi = await import("face-api.js");
        if (!faceapi.nets.tinyFaceDetector.params) {
          await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        }
        if (isMounted) {
          faceapiRef.current = faceapi;
        }
      } catch (err) {
        console.warn("[multi-attendance] face-api tinyFaceDetector load failed:", err);
      }
    };
    initFaceApi();
    return () => {
      isMounted = false;
    };
  }, []);

  // ── Real-time Multi-Face Tracking Loop (face-api -> FaceDetector -> Skin Cluster) ──
  useEffect(() => {
    if (!cameraReady || phase !== "scanning") {
      setFaceBoxes([]);
      faceBoxesRef.current = [];
      return;
    }

    let active = true;
    let detector: any = null;

    if (typeof window !== "undefined" && "FaceDetector" in window) {
      try {
        detector = new (window as any).FaceDetector({ fastMode: true, maxFaces: 5 });
      } catch {
        detector = null;
      }
    }

    const detectLoop = async () => {
      if (!active) return;
      const video = videoRef.current;
      const container = containerRef.current;

      if (video && container && video.readyState === 4) {
        const cw = container.clientWidth || 640;
        const ch = container.clientHeight || 480;
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;

        // CSS object-cover compensation calculations:
        const scale = Math.max(cw / vw, ch / vh);
        const renderedW = vw * scale;
        const renderedH = vh * scale;
        const offsetX = (cw - renderedW) / 2;
        const offsetY = (ch - renderedH) / 2;

        // Raw face coordinates on native video pixels: { x, y, width, height }
        let rawFaces: Array<{ x: number; y: number; width: number; height: number }> = [];

        // Tier 1: Deep Learning face-api tinyFaceDetector (Precise Multi-Face AI)
        if (faceapiRef.current && faceapiRef.current.nets.tinyFaceDetector.params) {
          try {
            const detections = await faceapiRef.current.detectAllFaces(
              video,
              new faceapiRef.current.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 })
            );
            if (detections && detections.length > 0) {
              rawFaces = detections.map((d: any) => ({
                x: d.box.x,
                y: d.box.y,
                width: d.box.width,
                height: d.box.height,
              }));
            }
          } catch {
            // fallback to Tier 2
          }
        }

        // Tier 2: Native Chromium FaceDetector API (Up to 5 faces)
        if (rawFaces.length === 0 && detector) {
          try {
            const faces = await detector.detect(video);
            if (faces && faces.length > 0) {
              rawFaces = faces.map((f: any) => ({
                x: f.boundingBox.x,
                y: f.boundingBox.y,
                width: f.boundingBox.width,
                height: f.boundingBox.height,
              }));
            }
          } catch {
            // fallback to Tier 3
          }
        }

        // Tier 3: Universal Skin Centroid Tracker with Neck-Exclusion & Top-Biased Head Framing
        if (rawFaces.length === 0 && canvasRef.current) {
          try {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              const sw = 160;
              const sh = 120;
              canvas.width = sw;
              canvas.height = sh;
              ctx.drawImage(video, 0, 0, sw, sh);

              const imgData = ctx.getImageData(0, 0, sw, sh);
              const data = imgData.data;

              let sumX = 0;
              let sumY = 0;
              let count = 0;
              let minY = sh;

              for (let y = 0; y < sh; y += 3) {
                for (let x = 0; x < sw; x += 3) {
                  const idx = (y * sw + x) * 4;
                  const r = data[idx];
                  const g = data[idx + 1];
                  const b = data[idx + 2];

                  // Skin color threshold in YCbCr color space
                  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
                  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

                  if (cb >= 85 && cb <= 130 && cr >= 133 && cr <= 175) {
                    sumX += x;
                    sumY += y;
                    count++;
                    if (y < minY) minY = y;
                  }
                }
              }

              if (count > 25) {
                const avgX = (sumX / count) * (vw / sw);
                // minY is the top of head/forehead
                const headTopY = minY * (vh / sh);
                // Estimated human head width & 1.3x height
                const headW = vw * 0.26;
                const headH = headW * 1.3;
                // Align box starting from headTopY so neck/chest never drags it down
                const headX = Math.max(0, avgX - headW / 2);
                const headY = Math.max(0, headTopY);

                rawFaces.push({
                  x: headX,
                  y: headY,
                  width: headW,
                  height: headH,
                });
              }
            }
          } catch {
            // ignore
          }
        }

        // Convert raw video pixel coordinates -> screen percentage with mirror & object-cover
        const newBoxes: FaceBox[] = rawFaces.map((rf, idx) => {
          // Horizontal mirror coordinate on video
          const mirroredX = vw - (rf.x + rf.width);
          // Scale and offset within container
          const screenX = offsetX + mirroredX * scale;
          const screenY = offsetY + rf.y * scale;
          const screenW = rf.width * scale;
          const screenH = rf.height * scale;

          const leftPercent = Math.max(0, Math.min(95, (screenX / cw) * 100));
          const topPercent = Math.max(0, Math.min(95, (screenY / ch) * 100));
          const widthPercent = Math.max(8, Math.min(80, (screenW / cw) * 100));
          const heightPercent = Math.max(10, Math.min(80, (screenH / ch) * 100));

          // Preserve matched status if face was already recognized
          const prevBox = faceBoxesRef.current.find(
            (pb) => Math.abs(pb.leftPercent - leftPercent) < 12 && Math.abs(pb.topPercent - topPercent) < 12
          );

          return {
            id: prevBox?.id ?? `face-${idx}-${Date.now()}`,
            leftPercent,
            topPercent,
            widthPercent,
            heightPercent,
            rawX: rf.x,
            rawY: rf.y,
            rawWidth: rf.width,
            rawHeight: rf.height,
            isMatch: prevBox?.isMatch ?? false,
            employeeName: prevBox?.employeeName,
            confidence: prevBox?.confidence,
          };
        });

        if (active) {
          faceBoxesRef.current = newBoxes;
          setFaceBoxes(newBoxes);
        }
      }

      if (active) {
        setTimeout(detectLoop, 90);
      }
    };

    detectLoop();
    return () => {
      active = false;
    };
  }, [cameraReady, phase]);

  // ── Setup confirm + save ──────────────────────────────────────────────────────
  const handleSetupConfirm = useCallback(
    (siteId: number, shiftCode: string) => {
      const site = sites.find((s) => s.id === siteId) ?? null;
      const shift = shifts.find((s) => s.code === shiftCode) ?? null;
      setSelectedSite(site);
      setSelectedShift(shift);
      saveSetup(siteId, shiftCode);
      setSavedSetup({ siteId, shiftCode });
      setPhase("scanning");
      setShowSetupModal(false);
      if (site) refreshHistory(site.id);
    },
    [sites, shifts, refreshHistory]
  );

  // ── Smart Frame capture (Round-robin face crop + 512x512 compression for Raray Vision) ──
  const captureFrame = useCallback(async (): Promise<{ blob: Blob | null; targetBoxId: string | null }> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      return { blob: null, targetBoxId: null };
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const boxes = faceBoxesRef.current;

    const targetDim = 512;
    canvas.width = targetDim;
    canvas.height = targetDim;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { blob: null, targetBoxId: null };

    let sx = 0;
    let sy = 0;
    let sDim = Math.min(vw, vh);
    let targetBoxId: string | null = null;

    if (boxes.length > 0) {
      // Pick next face in round-robin sequence to recognize all people present
      const index = scanIndexRef.current % boxes.length;
      scanIndexRef.current = (scanIndexRef.current + 1) % boxes.length;
      const targetBox = boxes[index];
      targetBoxId = targetBox.id;

      // Use raw video pixel coordinates directly (no un-mirroring confusion!)
      const rawW = targetBox.rawWidth ?? (targetBox.widthPercent / 100) * vw;
      const rawH = targetBox.rawHeight ?? (targetBox.heightPercent / 100) * vh;
      const rawX = targetBox.rawX ?? 0;
      const rawY = targetBox.rawY ?? 0;

      const faceCenterX = rawX + rawW / 2;
      const faceCenterY = rawY + rawH / 2;

      // Expand margin by 1.65x so head, forehead, and chin are comfortably framed
      const maxFaceDim = Math.max(rawW, rawH);
      sDim = Math.min(Math.max(maxFaceDim * 1.65, 240), Math.min(vw, vh));

      sx = faceCenterX - sDim / 2;
      sy = faceCenterY - sDim / 2;

      // Clamp inside video dimensions
      if (sx < 0) sx = 0;
      if (sy < 0) sy = 0;
      if (sx + sDim > vw) sx = vw - sDim;
      if (sy + sDim > vh) sy = vh - sDim;
    } else {
      // Default: Center-crop square to eliminate widescreen side noise / window glare
      sDim = Math.min(vw, vh);
      sx = (vw - sDim) / 2;
      sy = (vh - sDim) / 2;
    }

    ctx.drawImage(video, sx, sy, sDim, sDim, 0, 0, targetDim, targetDim);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return { blob, targetBoxId };
  }, []);

  // ── Error toast ───────────────────────────────────────────────────────────────
  const showErrorToast = useCallback((msg: string) => {
    setErrorMsg(msg);
    setShowError(true);
    setTimeout(() => setShowError(false), 4000);
  }, []);

  // ── Scan tick ─────────────────────────────────────────────────────────────────
  const doScan = useCallback(async () => {
    if (isScanningRef.current || !cameraReady || !selectedSite || !selectedShift) return;
    isScanningRef.current = true;
    setScanStatus("processing");

    try {
      const { blob, targetBoxId } = await captureFrame();
      if (!blob) { isScanningRef.current = false; setScanStatus("scanning"); return; }

      const fd = new FormData();
      fd.append("file", blob, "frame.jpg");
      fd.append("siteId", String(selectedSite.id));
      fd.append("shiftCode", selectedShift.code);

      const res = await fetch("/api/multi-attendance/recognize", { method: "POST", body: fd });
      const result: RecognitionResult = await res.json();

      if (result.recognized && result.reason !== "cooldown") {
        setLastResult(result);
        setShowCard(true);
        refreshHistory(selectedSite.id);

        // Update target face box to show green match & employee name
        if (targetBoxId) {
          setFaceBoxes((prev) =>
            prev.map((b) =>
              b.id === targetBoxId
                ? { ...b, isMatch: true, employeeName: result.employee_name, confidence: result.confidence }
                : b
            )
          );
        }

        // Audio Voice Greeting
        const actionStr = result.event_type === "checked-in" ? "masuk" : "keluar";
        speakGreeting(`Terima kasih ${result.employee_name}, absen ${actionStr} berhasil.`);

        setTimeout(() => {
          setShowCard(false);
          setLastResult(null);
        }, SUCCESS_DISPLAY_MS);
      } else if (result.reason === "cooldown") {
        // Voice warning for cooldown
        if (result.employee_name) {
          speakGreeting(`${result.employee_name}, Anda sudah melakukan absensi.`);
        }
        showErrorToast(result.error ?? "Anda sudah melakukan absensi.");
      } else if (result.reason === "db_error") {
        showErrorToast(result.error ?? "Terjadi kesalahan sistem");
      }
    } catch {
      // silent
    } finally {
      isScanningRef.current = false;
      setScanStatus("scanning");
    }
  }, [cameraReady, captureFrame, refreshHistory, selectedShift, selectedSite, showErrorToast]);

  // ── Scan loop ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "scanning" || !cameraReady) {
      if (scanTimerRef.current) { clearInterval(scanTimerRef.current); scanTimerRef.current = null; }
      setScanStatus("idle");
      return;
    }
    setScanStatus("scanning");
    doScan();
    scanTimerRef.current = setInterval(doScan, SCAN_INTERVAL_MS);
    return () => { if (scanTimerRef.current) clearInterval(scanTimerRef.current); };
  }, [phase, cameraReady, doScan]);

  const countIn = history.filter((h) => h.event_type === "checked-in").length;
  const countOut = history.filter((h) => h.event_type === "checked-out").length;

  return (
    <div
      className="fixed inset-0 overflow-hidden flex flex-col"
      style={{ background: "#f8fafc", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <canvas ref={canvasRef} className="hidden" />

      {/* ── SETUP MODAL ────────────────────────────────────────────────────────── */}
      {(phase === "setup" || showSetupModal) && !setupLoading && (
        <SetupModal
          sites={sites}
          shifts={shifts}
          savedSiteId={savedSetup?.siteId}
          savedShiftCode={savedSetup?.shiftCode}
          onConfirm={handleSetupConfirm}
          onClose={phase !== "setup" ? () => setShowSetupModal(false) : undefined}
          isEdit={phase !== "setup"}
        />
      )}

      {/* ── TOP BAR ────────────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0"
        style={{ background: "white", borderColor: "#e5e7eb", zIndex: 10 }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" fill="white" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-blue-500">
              PT Chitra Paratama
            </p>
            <h1 className="text-sm font-bold text-gray-900 leading-none">
              Attendance Terminal
            </h1>
          </div>
        </div>

        {/* Session info + clock */}
        <div className="flex items-center gap-3">
          {/* Site chip */}
          {selectedSite && (
            <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0L6.343 16.657a8 8 0 1111.314 0z" stroke="#6b7280" strokeWidth="2" />
                <circle cx="12" cy="11" r="3" stroke="#6b7280" strokeWidth="2" />
              </svg>
              <span className="text-xs font-semibold text-gray-600">{selectedSite.name}</span>
            </div>
          )}
          {/* Shift chip */}
          {selectedShift && (
            <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#6b7280" strokeWidth="2" />
                <path d="M12 7v5l3 3" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-xs font-semibold text-gray-600">{selectedShift.label}</span>
            </div>
          )}
          {/* Clock */}
          <div className="text-right">
            <p className="text-xl font-bold font-mono text-gray-900 leading-none tabular-nums">
              {clockStr}
            </p>
            <p className="text-[10px] text-gray-400 capitalize mt-0.5">{dateStr}</p>
          </div>
          {/* Settings button */}
          <button
            type="button"
            onClick={() => setShowSetupModal(true)}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            title="Ubah site & shift"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="#6b7280" strokeWidth="2" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="#6b7280" strokeWidth="2" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── CAMERA ZONE ─────────────────────────────────────────────────────── */}
        <div ref={containerRef} className="relative flex-1 min-h-0 overflow-hidden bg-gray-900">
          {/* Video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => setCameraReady(true)}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />

          {/* Subtle overlay */}
          <div className="absolute inset-0 bg-black/10" />

          {/* Camera error */}
          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm text-center mx-4">
                <div className="w-14 h-14 rounded-2xl bg-red-50 mx-auto mb-4 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.362a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">Kamera tidak tersedia</h3>
                <p className="text-sm text-gray-500">{cameraError}</p>
              </div>
            </div>
          )}

          {/* Dynamic Real-time Multi-Face Tracking Overlay Box */}
          {(phase === "scanning" || phase === "recognized") && (
            <FaceTrackerOverlay
              faceBoxes={faceBoxes}
              active={phase === "scanning"}
              processing={scanStatus === "processing"}
            />
          )}

          {/* Recognized card */}
          <RecognizedCard result={lastResult} visible={showCard} />

          {/* Scan status pill — bottom center */}
          {phase === "scanning" && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-5 py-2.5 shadow-lg border border-gray-200">
                <span
                  className="w-2 h-2 rounded-full bg-blue-500"
                  style={{ animation: "pulse-dot 1.5s infinite" }}
                />
                <span className="text-sm font-semibold text-gray-700">
                  {scanStatus === "processing" ? "Meningkatkan kualitas deteksi..." : "Face Tracking Aktif — Otomatis Absen"}
                </span>
              </div>
            </div>
          )}

          {/* Error / Cooldown Toast */}
          <div
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
            style={{
              opacity: showError ? 1 : 0,
              transform: showError ? "translate(-50%, 0)" : "translate(-50%, 8px)",
              transition: "all 0.3s ease",
            }}
          >
            <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 shadow-lg text-sm font-semibold text-amber-800">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#d97706" strokeWidth="2" />
                <path d="M12 8v4M12 16h.01" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {errorMsg}
            </div>
          </div>

          {/* Idle overlay when setup not done */}
          {phase === "setup" && !showSetupModal && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 text-center shadow-xl max-w-xs mx-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 mx-auto mb-4 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#2563eb" strokeWidth="2" />
                    <path d="M12 8v4l3 3" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="font-bold text-gray-900">Memuat data...</p>
              </div>
            </div>
          )}
        </div>

        {/* ── SIDEBAR ──────────────────────────────────────────────────────────── */}
        <aside
          className="flex flex-col w-72 xl:w-80 border-l flex-shrink-0"
          style={{ background: "white", borderColor: "#e5e7eb" }}
        >
          {/* Sidebar header */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900">Absensi Hari Ini</h2>
              <span className="text-xs font-bold rounded-full bg-blue-50 text-blue-600 px-2.5 py-1 border border-blue-100">
                {history.length} total
              </span>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-green-50 border border-green-100 px-3 py-2.5 text-center">
                <p className="text-2xl font-bold text-green-700 leading-none">{countIn}</p>
                <p className="text-[10px] font-semibold text-green-500 uppercase tracking-wider mt-1">Clock In</p>
              </div>
              <div className="rounded-2xl bg-amber-50 border border-amber-100 px-3 py-2.5 text-center">
                <p className="text-2xl font-bold text-amber-600 leading-none">{countOut}</p>
                <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mt-1">Clock Out</p>
              </div>
            </div>
          </div>

          {/* History list */}
          <div className="flex-1 overflow-y-auto">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 px-5 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 110 8 4 4 0 010-8z" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-400">Belum ada absensi</p>
                  <p className="text-xs text-gray-300 mt-1">Hadapkan wajah ke kamera untuk absen</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {history.map((entry, idx) => {
                  const isIn = entry.event_type === "checked-in";
                  const accentColor = isIn ? "#16a34a" : "#d97706";
                  const bgColor = isIn ? "#f0fdf4" : "#fffbeb";
                  const borderColor = isIn ? "#bbf7d0" : "#fde68a";

                  return (
                    <div
                      key={entry.id}
                      className="px-5 py-3 transition-colors"
                      style={{ background: idx === 0 ? (isIn ? "#f0fdf4" : "#fffbeb") : "white" }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div
                          className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold"
                          style={{ background: bgColor, border: `1.5px solid ${borderColor}`, color: accentColor }}
                        >
                          {entry.employee_name.slice(0, 2).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="font-semibold text-sm text-gray-900 truncate leading-tight">
                              {entry.employee_name}
                            </p>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{
                                background: bgColor,
                                color: accentColor,
                                border: `1px solid ${borderColor}`,
                              }}
                            >
                              {isIn ? "IN" : "OUT"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {entry.employee_sn && (
                              <span className="text-[10px] font-mono text-gray-400">
                                #{entry.employee_sn}
                              </span>
                            )}
                            {entry.employee_sn && entry.job_title && (
                              <span className="text-gray-200">·</span>
                            )}
                            <span className="text-[10px] text-gray-400 truncate">
                              {entry.job_title}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[11px] font-mono font-semibold text-gray-500">
                              {format(new Date(entry.event_time), "HH:mm:ss")}
                            </span>
                            {entry.confidence_score && (
                              <span className="text-[10px] text-gray-300">
                                {Math.round(Number(entry.confidence_score) * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer status */}
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: phase === "scanning" ? "#2563eb" : phase === "recognized" ? "#16a34a" : "#d1d5db",
                    boxShadow: phase === "scanning" ? "0 0 0 3px #dbeafe" : "none",
                  }}
                />
                <span className="text-xs font-medium text-gray-500">
                  {phase === "setup" ? "Menunggu setup" :
                   phase === "scanning" ? "Terminal aktif" :
                   phase === "recognized" ? "Absensi tercatat" : "—"}
                </span>
              </div>
              <span className="text-[10px] text-gray-300">Raray Vision v2</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      ` }} />
    </div>
  );
}
