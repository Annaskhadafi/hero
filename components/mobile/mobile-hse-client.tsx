"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Boxes,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  Flame,
  HardHat,
  ImagePlus,
  ListChecks,
  MapPin,
  Navigation,
  NotebookTabs,
  RadioTower,
  ShieldCheck,
  Siren,
  Stethoscope,
  MoreHorizontal
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  HSE_EMERGENCY_DRAFT_STORAGE_KEY,
  HSE_OBSERVATION_DRAFT_STORAGE_KEY,
  type EmergencyIncidentSyncPayload,
  type HseObservationSyncPayload,
  type QueuedFilePayload,
} from "@/lib/offline-sync";

type HseObservationRecord = {
  id: number;
  title: string;
  location: string;
  severity: string;
  category: string;
  status: string;
  notes: string;
  observedAt: Date;
};

type HseIncidentRecord = {
  id: number;
  title: string;
  type: string;
  unitNumber: string;
  impact: string;
  status: string;
  location?: string;
  alertStatus?: string;
  reportedAt: Date;
};

type MobileHseClientProps = {
  data: {
    context: {
      site: {
        name: string;
      };
    };
    observations: HseObservationRecord[];
    incidents: HseIncidentRecord[];
  };
};

type GeoState = {
  latitude: string;
  longitude: string;
  accuracy: string;
  message: string;
};

const initialGeo: GeoState = {
  latitude: "",
  longitude: "",
  accuracy: "",
  message: "GPS standby",
};

async function fileToPayload(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Gagal membaca file foto HSE."));
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
    return raw ? (JSON.parse(raw) as T) : null;
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

function formatDate(value: Date) {
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

const hseFieldActions = [
  {
    title: "Observation",
    description: "Catat unsafe act/condition dengan GPS.",
    icon: ShieldCheck,
    tab: "observation" as const,
    tone: "bg-[#e6f6ff] text-[#003f78]",
  },
  {
    title: "Emergency",
    description: "Alert insiden cepat, wajib GPS + foto.",
    icon: Siren,
    tab: "emergency" as const,
    tone: "bg-[#fff1ea] text-[#8a3d00]",
  },
  {
    title: "Inspection",
    description: "Buka daftar safety inspection.",
    icon: ClipboardCheck,
    href: "/mobile/hse/inspections",
    tone: "bg-[#eef7ed] text-[#166534]",
  },
  {
    title: "Induction",
    description: "Akses safety induction pekerja/tamu.",
    icon: Stethoscope,
    href: "/mobile/hse/induction",
    tone: "bg-[#f2efff] text-[#5b21b6]",
  },
];

const hseAdminFeatures = [
  { title: "Observasi & Emergency", href: "/mobile/hse/observasi-emergency", icon: AlertTriangle, meta: "Catat observasi & insiden lengkap" },
  { title: "Incident Report", href: "/mobile/hse/incident-report", icon: AlertTriangle, meta: "Investigasi & laporan" },
  { title: "Corrective Action", href: "/mobile/hse/corrective-action", icon: CheckCircle2, meta: "Follow-up & close-out" },
  { title: "HIRADC", href: "/mobile/hse/hiradc", icon: Flame, meta: "Risk register" },
  { title: "JSA", href: "/mobile/hse/jsa", icon: FileCheck2, meta: "Job safety analysis" },
  { title: "Izin Kerja PTW", href: "/mobile/hse/ptw", icon: HardHat, meta: "Permit to work" },
  { title: "Inventaris HSE", href: "/mobile/hse/inventaris", icon: Boxes, meta: "APD & equipment" },
  { title: "Checklist", href: "/mobile/hse/checklist", icon: ListChecks, meta: "Template & daily check" },
  { title: "Safety Data", href: "/mobile/hse/safety-data", icon: NotebookTabs, meta: "Performance dashboard" },
  { title: "SIA/SIO Tools", href: "/mobile/hse/sia-sio-tools", icon: ClipboardList, meta: "Sertifikasi tools" },
];

export function MobileHseClient({ data }: MobileHseClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queuedDraftKey = searchParams.get("draft")?.trim() || "";
  const queuedMode = searchParams.get("mode") === "emergency" ? "emergency" : "observation";

  const [activeTab, setActiveTab] = useState<"observation" | "emergency">(queuedMode);
  const [openHseDrawer, setOpenHseDrawer] = useState(false);
  const [geo, setGeo] = useState<GeoState>(initialGeo);
  const [observations, setObservations] = useState(data.observations);
  const [incidents, setIncidents] = useState(data.incidents);
  const [message, setMessage] = useState<{ kind: "idle" | "success" | "error"; text: string }>({
    kind: "idle",
    text: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [observationTitle, setObservationTitle] = useState("");
  const [observationCategory, setObservationCategory] = useState("Unsafe Action");
  const [observationSeverity, setObservationSeverity] = useState("Medium");
  const [observationNotes, setObservationNotes] = useState("");
  const [observationLocation, setObservationLocation] = useState("");

  const [emergencyTitle, setEmergencyTitle] = useState("");
  const [emergencyType, setEmergencyType] = useState("Near Miss");
  const [emergencyImpact, setEmergencyImpact] = useState("Medium");
  const [emergencyStatus, setEmergencyStatus] = useState("Open");
  const [emergencyUnitNumber, setEmergencyUnitNumber] = useState("");
  const [emergencyLocation, setEmergencyLocation] = useState("");
  const [emergencyNotes, setEmergencyNotes] = useState("");
  const [emergencyPhoto, setEmergencyPhoto] = useState<File | null>(null);
  const [emergencyPhotoName, setEmergencyPhotoName] = useState("");
  const [restoredEmergencyPhoto, setRestoredEmergencyPhoto] = useState<QueuedFilePayload | null>(null);
  const [photoCaptureMode, setPhotoCaptureMode] = useState<"camera" | "gallery">("camera");

  useEffect(() => {
    const draft = queuedDraftKey
      ? readDraft<HseObservationSyncPayload | EmergencyIncidentSyncPayload>(queuedDraftKey)
      : activeTab === "emergency"
        ? readDraft<EmergencyIncidentSyncPayload>(HSE_EMERGENCY_DRAFT_STORAGE_KEY)
        : readDraft<HseObservationSyncPayload>(HSE_OBSERVATION_DRAFT_STORAGE_KEY);

    if (!draft) return;

    if (queuedMode === "emergency" || ("unitNumber" in draft && activeTab === "emergency")) {
      const emergencyDraft = draft as EmergencyIncidentSyncPayload;
      setActiveTab("emergency");
      setEmergencyTitle(emergencyDraft.title);
      setEmergencyType(emergencyDraft.type);
      setEmergencyImpact(emergencyDraft.impact);
      setEmergencyStatus(emergencyDraft.status);
      setEmergencyUnitNumber(emergencyDraft.unitNumber);
      setEmergencyLocation(emergencyDraft.location);
      setEmergencyNotes(emergencyDraft.notes);
      setEmergencyPhotoName(emergencyDraft.photo?.name ?? "");
      setRestoredEmergencyPhoto(emergencyDraft.photo ?? null);
      return;
    }

    const observationDraft = draft as HseObservationSyncPayload;
    setActiveTab("observation");
    setObservationTitle(observationDraft.title);
    setObservationCategory(observationDraft.category);
    setObservationSeverity(observationDraft.severity);
    setObservationNotes(observationDraft.notes);
    setObservationLocation(observationDraft.location);
  }, [activeTab, queuedDraftKey, queuedMode]);

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
          message: "GPS lock aktif",
        });
      },
      (error) => {
        setGeo((current) => ({ ...current, message: error.message || "GPS butuh izin." }));
      },
      { enableHighAccuracy: true, maximumAge: 8000, timeout: 12000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    writeDraft(HSE_OBSERVATION_DRAFT_STORAGE_KEY, {
      title: observationTitle,
      category: observationCategory,
      severity: observationSeverity,
      notes: observationNotes,
      location: observationLocation || data.context.site.name,
      latitude: geo.latitude,
      longitude: geo.longitude,
    } satisfies HseObservationSyncPayload);
  }, [
    data.context.site.name,
    geo.latitude,
    geo.longitude,
    observationCategory,
    observationLocation,
    observationNotes,
    observationSeverity,
    observationTitle,
  ]);

  useEffect(() => {
    writeDraft(HSE_EMERGENCY_DRAFT_STORAGE_KEY, {
      title: emergencyTitle,
      type: emergencyType,
      impact: emergencyImpact,
      status: emergencyStatus,
      unitNumber: emergencyUnitNumber,
      location: emergencyLocation || data.context.site.name,
      notes: emergencyNotes,
      latitude: geo.latitude,
      longitude: geo.longitude,
      photo: null,
    } satisfies EmergencyIncidentSyncPayload);
  }, [
    data.context.site.name,
    emergencyImpact,
    emergencyLocation,
    emergencyNotes,
    emergencyStatus,
    emergencyTitle,
    emergencyType,
    emergencyUnitNumber,
    geo.latitude,
    geo.longitude,
  ]);

  async function submitObservation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage({ kind: "idle", text: "" });

    if (!observationTitle.trim() || !observationNotes.trim()) {
      setMessage({ kind: "error", text: "Judul dan catatan observasi wajib diisi." });
      return;
    }

    const payload: HseObservationSyncPayload = {
      title: observationTitle,
      category: observationCategory,
      severity: observationSeverity,
      notes: observationNotes,
      location: observationLocation || data.context.site.name,
      latitude: geo.latitude,
      longitude: geo.longitude,
    };

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/mobile/sync/hse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { success: boolean; message?: string };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Observasi HSE gagal disimpan.");
      }

      clearDraft(HSE_OBSERVATION_DRAFT_STORAGE_KEY);
      if (queuedDraftKey) clearDraft(queuedDraftKey);
      setMessage({ kind: "success", text: result.message || "HSE observation saved successfully." });
      router.refresh();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Observasi HSE gagal disimpan.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitEmergency(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage({ kind: "idle", text: "" });

    if (!emergencyTitle.trim() || !emergencyNotes.trim()) {
      setMessage({ kind: "error", text: "Judul dan kronologi emergency wajib diisi." });
      return;
    }

    if (!geo.latitude || !geo.longitude) {
      setMessage({ kind: "error", text: "Emergency report butuh GPS aktif." });
      return;
    }

    if (!emergencyPhoto && !restoredEmergencyPhoto) {
      setMessage({ kind: "error", text: "Emergency report butuh foto lapangan." });
      return;
    }

    const payload: EmergencyIncidentSyncPayload = {
      title: emergencyTitle,
      type: emergencyType,
      impact: emergencyImpact,
      status: emergencyStatus,
      unitNumber: emergencyUnitNumber,
      location: emergencyLocation || data.context.site.name,
      notes: emergencyNotes,
      latitude: geo.latitude,
      longitude: geo.longitude,
      photo: emergencyPhoto ? await fileToPayload(emergencyPhoto) : restoredEmergencyPhoto,
    };

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/mobile/sync/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { success: boolean; message?: string };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Emergency report gagal disimpan.");
      }

      clearDraft(HSE_EMERGENCY_DRAFT_STORAGE_KEY);
      if (queuedDraftKey) clearDraft(queuedDraftKey);
      setMessage({ kind: "success", text: result.message || "Emergency report berhasil disimpan." });
      router.refresh();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Emergency report gagal disimpan.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const openObservations = observations.filter((item) => item.status.toLowerCase() === "open").length;

  return (
    <div className="space-y-5">
      {/* Offline/Sync Status Bar & LTI Counter */}
      <div className="flex items-center justify-between px-1 bg-white p-3 rounded-2xl border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Online · Auto Sync Active</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-500/10 px-2.5 py-1 rounded-full">
          <span>🏆 365 Days LTI-Free</span>
        </div>
      </div>

      <section className="space-y-3">
        <div className="rounded-[1.3rem] bg-gradient-to-br from-[#5a2200] to-[#8a3d00] p-4 text-white shadow-[0_18px_38px_rgba(90,34,0,0.24)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ffd7b5]">Emergency Access</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight">Safety Command</h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#ffe6d1]">
                Submit observasi HSE atau emergency incident cepat dengan GPS, foto, dan alert supervisor.
              </p>
            </div>
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/12">
              <RadioTower className="size-5" />
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[1rem] bg-white/10 px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#ffd7b5]">Site</p>
              <p className="mt-1 text-sm font-black">{data.context.site.name}</p>
            </div>
            <div className="rounded-[1rem] bg-white/10 px-3 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#ffd7b5]">GPS</p>
              <p className="mt-1 text-sm font-black">{geo.accuracy || geo.message}</p>
            </div>
          </div>
        </div>
      </section>

      {message.kind !== "idle" ? (
        <div
          className={
            message.kind === "success"
              ? "rounded-[1.2rem] bg-[#dff4e8] px-4 py-3 text-sm font-semibold text-[#14532d]"
              : "rounded-[1.2rem] bg-[#f4ddce] px-4 py-3 text-sm font-semibold text-[#5a2200]"
          }
        >
          {message.text}
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.2rem] bg-[#003f78] p-4 text-white shadow-[0_16px_34px_rgba(0,63,120,0.22)]">
          <ShieldCheck className="size-5" />
          <p className="mt-3 text-3xl font-black">{observations.length}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b9dff6]">Observations</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 text-[#5a2200] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <AlertTriangle className="size-5" />
          <p className="mt-3 text-3xl font-black">{openObservations}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7a4a32]">Open Items</p>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">HSE Quick Actions</p>
        </div>

        <div className="grid grid-cols-4 gap-y-4 gap-x-2 rounded-[1.5rem] bg-white p-5 shadow-[0_12px_32px_rgba(8,32,51,0.06)] border border-slate-100">
          {hseFieldActions.map((action) => {
            const Icon = action.icon;

            if ("tab" in action && action.tab) {
              return (
                <button
                  key={action.title}
                  type="button"
                  onClick={() => {
                    setActiveTab(action.tab);
                    document.getElementById("hse-submit-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="flex flex-col items-center justify-center text-center group active:scale-95 transition-transform"
                >
                  <div className={`flex size-11 items-center justify-center rounded-2xl ${action.tone}`}>
                    <Icon className="size-5" />
                  </div>
                  <span className="mt-2 text-[11px] font-bold text-slate-700 leading-tight">
                    {action.title}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={action.title}
                href={action.href}
                className="flex flex-col items-center justify-center text-center group active:scale-95 transition-transform"
              >
                <div className={`flex size-11 items-center justify-center rounded-2xl ${action.tone}`}>
                  <Icon className="size-5" />
                </div>
                <span className="mt-2 text-[11px] font-bold text-slate-700 leading-tight">
                  {action.title}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Compliance & Admin</p>
        </div>

        <div className="grid grid-cols-4 gap-y-4 gap-x-2 rounded-[1.5rem] bg-white p-5 shadow-[0_12px_32px_rgba(8,32,51,0.06)] border border-slate-100">
          {hseAdminFeatures.slice(0, 3).map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.title}
                href={feature.href}
                className="flex flex-col items-center justify-center text-center group active:scale-95 transition-transform"
              >
                <div className="flex size-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
                  <Icon className="size-5" />
                </div>
                <span className="mt-2 text-[10px] font-bold text-slate-700 leading-tight truncate w-full px-1">
                  {feature.title.split(" ")[0]}
                </span>
              </Link>
            );
          })}

          <Sheet open={openHseDrawer} onOpenChange={setOpenHseDrawer}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center text-center group active:scale-95 transition-transform">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 group-hover:bg-slate-200 transition-colors">
                  <MoreHorizontal className="size-5" />
                </div>
                <span className="mt-2 text-[11px] font-bold text-slate-700 leading-tight">
                  Lainnya
                </span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[2rem] px-6 pb-8 pt-4 max-h-[85vh] overflow-y-auto">
              <SheetHeader className="mb-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-4" />
                <SheetTitle className="text-lg font-black text-[#003461]">Semua Fitur HSE</SheetTitle>
              </SheetHeader>

              <div className="space-y-3">
                {hseAdminFeatures.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <Link
                      key={index}
                      href={feature.href}
                      onClick={() => setOpenHseDrawer(false)}
                      className="flex items-center gap-4 rounded-2xl bg-slate-50/50 p-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#003461]">{feature.title}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{feature.meta}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </section>

      <section id="hse-submit-panel" className="scroll-mt-24 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl bg-[#e6f6ff] p-1">
            <TabsTrigger value="observation" className="rounded-xl text-[11px] font-black uppercase tracking-[0.12em]">
              Observation
            </TabsTrigger>
            <TabsTrigger value="emergency" className="rounded-xl text-[11px] font-black uppercase tracking-[0.12em]">
              Emergency
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === "observation" ? (
          <form onSubmit={submitObservation} className="mt-4 space-y-4">
            <Label className="block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Observation title</span>
              <Input
                value={observationTitle}
                onChange={(event) => setObservationTitle(event.target.value)}
                placeholder="Contoh: APD tidak lengkap di workshop"
                className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
              />
            </Label>

            <div className="grid grid-cols-2 gap-3">
              <Label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Category</span>
                <select
                  value={observationCategory}
                  onChange={(event) => setObservationCategory(event.target.value)}
                  className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
                >
                  <option>Unsafe Action</option>
                  <option>Unsafe Condition</option>
                  <option>Environmental</option>
                  <option>Housekeeping</option>
                </select>
              </Label>
              <Label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Severity</span>
                <select
                  value={observationSeverity}
                  onChange={(event) => setObservationSeverity(event.target.value)}
                  className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </Label>
            </div>

            <Label className="block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Location</span>
              <Input
                value={observationLocation}
                onChange={(event) => setObservationLocation(event.target.value)}
                placeholder="Observation location"
                className="h-12 rounded-2xl border-0 bg-[#e9f6fd] px-4 text-sm font-semibold text-[#082033]"
              />
            </Label>

            <Label className="block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Notes</span>
              <Textarea
                value={observationNotes}
                onChange={(event) => setObservationNotes(event.target.value)}
                rows={4}
                placeholder="Jelaskan kondisi, risiko, dan tindakan awal."
                className="rounded-2xl border-0 bg-[#e9f6fd] px-4 py-3 text-sm font-semibold text-[#082033]"
              />
            </Label>

            <div className="rounded-[1.25rem] bg-[#f6fbff] p-4 text-xs font-semibold leading-5 text-[#486275] border border-slate-100 relative overflow-hidden">
              <p className="flex items-center gap-2 font-black uppercase tracking-[0.12em] text-[#003f78]">
                <Navigation className="size-3.5 text-[#003f78]" />
                GPS capture
              </p>
              <p className="mt-1 text-slate-800 font-bold">{geo.latitude && geo.longitude ? `${geo.latitude}, ${geo.longitude}` : geo.message}</p>
              {geo.latitude && geo.longitude && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-2 text-emerald-700">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-wider">GPS Lock High Accuracy</span>
                  </div>
                  <span className="text-[9px] font-bold">Active</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="h-14 w-full rounded-2xl bg-[#003f78] text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Submit Observation"}
            </Button>
          </form>
        ) : (
          <form onSubmit={submitEmergency} className="mt-4 space-y-4">
            <div className="rounded-[1rem] bg-[#fff8e8] px-4 py-3 text-xs font-semibold leading-5 text-[#8c5818]">
              Emergency submit akan auto-alert supervisor dan management saat sync berhasil.
            </div>

            <Label className="block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Emergency title</span>
              <Input
                value={emergencyTitle}
                onChange={(event) => setEmergencyTitle(event.target.value)}
                placeholder="Contoh: Fire spark near hydraulic line"
                className="h-12 rounded-2xl border-0 bg-[#fff1ea] px-4 text-sm font-semibold text-[#082033]"
              />
            </Label>

            <div className="grid grid-cols-2 gap-3">
              <Label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Type</span>
                <select
                  value={emergencyType}
                  onChange={(event) => setEmergencyType(event.target.value)}
                  className="h-12 w-full rounded-2xl border-0 bg-[#fff1ea] px-4 text-sm font-semibold text-[#082033]"
                >
                  <option>Near Miss</option>
                  <option>Property Damage</option>
                  <option>Medical</option>
                  <option>Fire</option>
                  <option>Environmental Spill</option>
                </select>
              </Label>
              <Label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Impact</span>
                <select
                  value={emergencyImpact}
                  onChange={(event) => setEmergencyImpact(event.target.value)}
                  className="h-12 w-full rounded-2xl border-0 bg-[#fff1ea] px-4 text-sm font-semibold text-[#082033]"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Unit no.</span>
                <Input
                  value={emergencyUnitNumber}
                  onChange={(event) => setEmergencyUnitNumber(event.target.value)}
                  placeholder="DT-451"
                  className="h-12 rounded-2xl border-0 bg-[#fff1ea] px-4 text-sm font-semibold text-[#082033]"
                />
              </Label>
              <Label className="block space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Status</span>
                <select
                  value={emergencyStatus}
                  onChange={(event) => setEmergencyStatus(event.target.value)}
                  className="h-12 w-full rounded-2xl border-0 bg-[#fff1ea] px-4 text-sm font-semibold text-[#082033]"
                >
                  <option>Open</option>
                  <option>Mitigating</option>
                  <option>Escalated</option>
                </select>
              </Label>
            </div>

            <Label className="block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Location</span>
              <Input
                value={emergencyLocation}
                onChange={(event) => setEmergencyLocation(event.target.value)}
                placeholder="Incident location"
                className="h-12 rounded-2xl border-0 bg-[#fff1ea] px-4 text-sm font-semibold text-[#082033]"
              />
            </Label>

            <Label className="block space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Chronology</span>
              <Textarea
                value={emergencyNotes}
                onChange={(event) => setEmergencyNotes(event.target.value)}
                rows={4}
                placeholder="Ringkas kronologi, korban/dampak, tindakan awal."
                className="rounded-2xl border-0 bg-[#fff1ea] px-4 py-3 text-sm font-semibold text-[#082033]"
              />
            </Label>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-2xl border-0 bg-[#fff1ea] text-[#8a3d00]"
                onClick={() => {
                  setPhotoCaptureMode("camera");
                  document.getElementById("emergency-photo")?.click();
                }}
              >
                <Camera className="size-4" />
                Kamera
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-2xl border-0 bg-[#fff1ea] text-[#8a3d00]"
                onClick={() => {
                  setPhotoCaptureMode("gallery");
                  document.getElementById("emergency-photo")?.click();
                }}
              >
                <ImagePlus className="size-4" />
                Galeri
              </Button>
            </div>
            <input
              id="emergency-photo"
              type="file"
              accept="image/*"
              capture={photoCaptureMode === "camera" ? "environment" : undefined}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setEmergencyPhoto(file);
                setEmergencyPhotoName(file?.name ?? "");
                setRestoredEmergencyPhoto(null);
              }}
            />

            <div className="rounded-[1.25rem] bg-[#fff8e8] p-4 text-xs font-semibold leading-5 text-[#8a5a00] border border-amber-100 relative overflow-hidden">
              <p className="flex items-center gap-2 font-black uppercase tracking-[0.12em] text-[#8a3d00]">
                <MapPin className="size-3.5 text-[#8a3d00]" />
                GPS + Photo
              </p>
              <p className="mt-1 text-amber-950 font-bold">{geo.latitude && geo.longitude ? `${geo.latitude}, ${geo.longitude}` : geo.message}</p>
              <p className="mt-1 text-slate-500 text-[10px]">{emergencyPhotoName || "Foto wajib untuk emergency report."}</p>
              {geo.latitude && geo.longitude && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-500/10 px-3 py-2 text-amber-700">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-wider">GPS Lock Active</span>
                  </div>
                  <span className="text-[9px] font-bold">Secure</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="h-14 w-full rounded-2xl bg-gradient-to-br from-[#5a2200] to-[#8a3d00] text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send Emergency Alert"}
            </Button>
          </form>
        )}
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Observation Feed</p>
        {observations.map((item) => (
          <article key={item.id} className="rounded-[1.25rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-[#082033]">{item.title}</h2>
                <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#486275]">
                  <MapPin className="size-3.5" />
                  {item.location}
                </p>
              </div>
              <span className="rounded-full bg-[#f0dcc5] px-3 py-1 text-[10px] font-black uppercase text-[#8c5818]">
                {item.severity}
              </span>
            </div>
            <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-[#486275]">{item.notes}</p>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">
              {item.category} · {item.status} · {formatDate(item.observedAt)}
            </p>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Incident Register</p>
        {incidents.map((incident) => (
          <article key={incident.id} className="rounded-[1.2rem] bg-[#e9f6fd] p-4">
            <h3 className="text-sm font-black text-[#082033]">{incident.title}</h3>
            <p className="mt-1 text-xs font-semibold text-[#486275]">
              {incident.type} · {incident.unitNumber} · {incident.status}
            </p>
            {incident.location ? (
              <p className="mt-2 text-xs font-semibold text-[#486275]">{incident.location}</p>
            ) : null}
            {incident.alertStatus ? (
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#003f78]">
                Alert {incident.alertStatus}
              </p>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}
