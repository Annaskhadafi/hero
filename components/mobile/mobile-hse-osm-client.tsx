"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Crosshair,
  Download,
  ExternalLink,
  Eye,
  FileText,
  HardHat,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Maximize2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UploadCloud,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { OsmMiniMap } from "@/components/ui/osm-mini-map";
import {
  createHseOsmFinding,
  createHseOsmSession,
  getHseEmployeesList,
  getHseOsmDashboardData,
  getHseOsmSessionById,
  getHseOsmSessions,
  submitHseOsmAction,
  syncHseOsmOfflineBatch,
  verifyHseOsmFinding,
} from "@/app/actions/hse-osm";
import { uploadFile } from "@/app/actions/upload";
import { resolveClientUploadUrl } from "@/lib/client-upload-url";
import {
  HSE_OSM_DEFAULT_CLASSIFICATIONS,
  HSE_OSM_DEFAULT_FOCUS_ITEMS,
  HSE_OSM_LAST_SYNC_KEY,
  HSE_OSM_OFFLINE_STORAGE_KEY,
  HSE_OSM_RISK_CONFIG,
  HSE_OSM_STATUS_CONFIG,
  type HseOsmFindingStatus,
  type HseOsmRiskLevel,
} from "@/lib/hse-osm-constants";

type MobileHseOsmClientProps = {
  initialData: any;
};

type ViewMode = "hub" | "monitoring_list" | "create_wizard" | "session_detail";

export function MobileHseOsmClient({ initialData }: MobileHseOsmClientProps) {
  const router = useRouter();

  const [currentView, setCurrentView] = useState<ViewMode>("hub");
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Live GPS state
  const [liveGeo, setLiveGeo] = useState<{ lat: string; lng: string; acc: string; message: string }>({
    lat: "",
    lng: "",
    acc: "",
    message: "GPS standby",
  });

  // Metrics
  const [metrics, setMetrics] = useState(initialData?.metrics || {
    totalSessions: 0,
    totalFindings: 0,
    openTickets: 0,
    processedTickets: 0,
    closedTickets: 0,
    rejectedTickets: 0,
  });

  // Monitoring sessions
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Active Session Detail View
  const [activeSessionDetail, setActiveSessionDetail] = useState<any>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Wizard state: Step 1 (Team), Step 2 (Spatial & Focus), Step 3 (Findings & Camera)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [wizardLocationArea, setWizardLocationArea] = useState("");
  const [wizardLocationDetail, setWizardLocationDetail] = useState("");
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [wizardDate, setWizardDate] = useState("");
  const [wizardTime, setWizardTime] = useState("");
  const [wizardLat, setWizardLat] = useState("");
  const [wizardLng, setWizardLng] = useState("");
  const [wizardGpsAcc, setWizardGpsAcc] = useState("");
  const [wizardFocusItem, setWizardFocusItem] = useState("Fatality Prevention");
  const [wizardNotes, setWizardNotes] = useState("");

  // Wizard Team Members
  const [wizardTeam, setWizardTeam] = useState<any[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<any[]>(
    initialData?.employees || []
  );
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [selectedMultiEmpIds, setSelectedMultiEmpIds] = useState<number[]>([]);
  const [inlineEmpSearch, setInlineEmpSearch] = useState("");
  const [searchEmpModalOpen, setSearchEmpModalOpen] = useState(false);
  const [empSearchQuery, setEmpSearchQuery] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualBadge, setManualBadge] = useState("");
  const [manualDept, setManualDept] = useState("");
  const [isManualExternal, setIsManualExternal] = useState(false);

  // Wizard Finding (Step 3)
  const [wizardClassification, setWizardClassification] = useState<string>(
    HSE_OSM_DEFAULT_CLASSIFICATIONS[0].name
  );
  const [wizardFindingDesc, setWizardFindingDesc] = useState("");
  const [wizardRiskLevel, setWizardRiskLevel] = useState<HseOsmRiskLevel>("MEDIUM");
  const [wizardActionReq, setWizardActionReq] = useState("");
  const [wizardPhotos, setWizardPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [isSubmittingWizard, setIsSubmittingWizard] = useState(false);

  // Active action/verification modal state in mobile
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);
  const [actionFinding, setActionFinding] = useState<any>(null);
  const [actionTakenText, setActionTakenText] = useState("");
  const [actionPhotos, setActionPhotos] = useState<string[]>([]);
  const [rejectionReasonText, setRejectionReasonText] = useState("");
  const [actionMode, setActionMode] = useState<"action" | "close" | "reject" | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [showDetailMap, setShowDetailMap] = useState(false);

  // Inspector profile info from session
  const actor = initialData?.actor;
  const inspectorName = actor?.employee?.name || actor?.sessionUser?.name || "Muhammad Ikbal Isisa";
  const inspectorBadge = actor?.employee?.employeeSn || "2108847";
  const inspectorDept = "Chitra Paratama PT";
  const inspectorSection = actor?.employee?.jobTitle || "PJO Contractor";

  // Check online status and stored sync info
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const savedLastSync = localStorage.getItem(HSE_OSM_LAST_SYNC_KEY);
    if (savedLastSync) setLastSyncTime(savedLastSync);

    const savedQueue = localStorage.getItem(HSE_OSM_OFFLINE_STORAGE_KEY);
    if (savedQueue) {
      try {
        const parsed = JSON.parse(savedQueue);
        setOfflineQueueCount(Array.isArray(parsed) ? parsed.length : 0);
      } catch {}
    }

    // Auto capture GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLiveGeo({
            lat: pos.coords.latitude.toFixed(7),
            lng: pos.coords.longitude.toFixed(7),
            acc: `±${Math.round(pos.coords.accuracy)}m`,
            message: "Online",
          });
        },
        (err) => {
          setLiveGeo((prev) => ({ ...prev, message: "GPS nonaktif" }));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch employees list if not passed from server
  useEffect(() => {
    if (!initialData?.employees || initialData.employees.length === 0) {
      getHseEmployeesList().then((res) => {
        if (res.success && res.data) setAvailableEmployees(res.data);
      });
    }
  }, [initialData?.employees]);

  const filteredEmployees = useMemo(() => {
    if (!empSearchQuery.trim()) return availableEmployees;
    const q = empSearchQuery.toLowerCase();
    return availableEmployees.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.employeeSn?.toLowerCase().includes(q) ||
        e.departmentName?.toLowerCase().includes(q) ||
        e.sectionName?.toLowerCase().includes(q) ||
        e.jobTitle?.toLowerCase().includes(q)
    );
  }, [availableEmployees, empSearchQuery]);

  const inlineFilteredEmployees = useMemo(() => {
    if (!inlineEmpSearch.trim()) return [];
    const q = inlineEmpSearch.toLowerCase();
    return availableEmployees.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.employeeSn?.toLowerCase().includes(q) ||
        e.departmentName?.toLowerCase().includes(q) ||
        e.sectionName?.toLowerCase().includes(q) ||
        e.jobTitle?.toLowerCase().includes(q)
    );
  }, [availableEmployees, inlineEmpSearch]);

  function addEmployeeToTeam(emp: {
    id?: number;
    employeeSn: string;
    name: string;
    departmentName?: string | null;
  }) {
    if (wizardTeam.some((m) => m.badgeNumber === emp.employeeSn)) {
      alert(`Karyawan ${emp.name} sudah terdaftar dalam tim.`);
      return;
    }
    setWizardTeam((prev) => [
      ...prev,
      {
        employeeId: emp.id,
        badgeNumber: emp.employeeSn,
        name: emp.name,
        department: emp.departmentName || "Mining Operations",
        company: "PT Chitra Paratama",
        isTeamLeader: false,
        isExternal: false,
      },
    ]);
    setSelectedEmpId("");
    setInlineEmpSearch("");
    setSearchEmpModalOpen(false);
  }

  function addMultipleEmployeesToTeam(empIds: number[]) {
    if (empIds.length === 0) return;
    const toAdd = availableEmployees.filter(
      (emp) =>
        empIds.includes(emp.id) &&
        !wizardTeam.some((m) => m.badgeNumber === emp.employeeSn || m.employeeId === emp.id)
    );
    if (toAdd.length === 0) {
      alert("Semua personil yang dipilih sudah terdaftar di tim.");
      return;
    }
    const newMembers = toAdd.map((emp) => ({
      employeeId: emp.id,
      badgeNumber: emp.employeeSn,
      name: emp.name,
      department: emp.departmentName || "Mining Operations",
      company: "PT Chitra Paratama",
      isTeamLeader: false,
      isExternal: false,
    }));
    setWizardTeam((prev) => [...prev, ...newMembers]);
    setSelectedMultiEmpIds([]);
    setInlineEmpSearch("");
    setEmpSearchQuery("");
    setSearchEmpModalOpen(false);
  }

  // Reset wizard on initial open
  function startNewOsm() {
    const now = new Date();
    setWizardDate(now.toISOString().split("T")[0]);
    const defaultSiteName = actor?.employee?.siteId
      ? initialData?.sites?.find((s: any) => s.id === actor?.employee?.siteId)?.name || "Pit West - Sangatta"
      : "Pit West - Sangatta";
    setWizardLocationArea(defaultSiteName);
    setWizardLocationDetail("");
    setWizardLat(liveGeo.lat);
    setWizardLng(liveGeo.lng);
    setWizardGpsAcc(liveGeo.acc);
    setWizardFocusItem("Fatality Prevention");
    setWizardNotes("");
    setWizardStep(1);

    // Initial leader
    setWizardTeam([
      {
        name: inspectorName,
        badgeNumber: inspectorBadge,
        department: "Mining Operations",
        company: "PT Chitra Paratama",
        isTeamLeader: true,
        isExternal: false,
      },
    ]);

    setWizardFindingDesc("");
    setWizardPhotos([]);
    setWizardActionReq("");
    setWizardError(null);
    setCurrentView("create_wizard");
  }

  // Load sessions list
  async function loadSessions() {
    setIsLoadingSessions(true);
    try {
      const res = await getHseOsmSessions({ limit: 50 });
      if (res.success && res.data) {
        setSessions(res.data);
      }
      const resMetrics = await getHseOsmDashboardData();
      if (resMetrics.success && resMetrics.metrics) {
        setMetrics(resMetrics.metrics);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSessions(false);
    }
  }

  useEffect(() => {
    if (currentView === "monitoring_list" || currentView === "hub") {
      loadSessions();
    }
  }, [currentView]);

  async function handleOpenDetail(sessionId: number) {
    setIsLoadingDetail(true);
    try {
      const res = await getHseOsmSessionById(sessionId);
      if (res.success && res.data) {
        setActiveSessionDetail(res.data);
        setCurrentView("session_detail");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDetail(false);
    }
  }

  // Sync offline queue to server
  async function handleSync() {
    if (!navigator.onLine) {
      alert("Perangkat sedang offline. Sambungkan ke koneksi internet untuk melakukan sinkronisasi.");
      return;
    }

    setIsSyncing(true);
    try {
      const savedQueue = localStorage.getItem(HSE_OSM_OFFLINE_STORAGE_KEY);
      if (savedQueue) {
        const queue = JSON.parse(savedQueue);
        if (Array.isArray(queue) && queue.length > 0) {
          const res = await syncHseOsmOfflineBatch(queue);
          if (res.success) {
            localStorage.removeItem(HSE_OSM_OFFLINE_STORAGE_KEY);
            setOfflineQueueCount(0);
          }
        }
      }

      const nowFormatted = new Date().toISOString().replace("T", " ").slice(0, 16);
      localStorage.setItem(HSE_OSM_LAST_SYNC_KEY, nowFormatted);
      setLastSyncTime(nowFormatted);

      await loadSessions();
      alert("Sinkronisasi data OSM berhasil dilakukan!");
    } catch (err: any) {
      alert(`Gagal sinkronisasi: ${err?.message || "Terjadi kendala jaringan"}`);
    } finally {
      setIsSyncing(false);
    }
  }

  // Photo upload handler
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>, target: "wizard" | "action") {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentPhotos = target === "wizard" ? wizardPhotos : actionPhotos;
    if (currentPhotos.length + files.length > 3) {
      alert("Maksimal 3 foto temuan.");
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("uploadTarget", "hse-osm");

        const res = await uploadFile(formData);
        if (res.success && res.url) {
          newUrls.push(res.url);
        } else {
          throw new Error(res.error || "Gagal mengunggah foto.");
        }
      }

      if (target === "wizard") {
        setWizardPhotos((prev) => [...prev, ...newUrls]);
      } else {
        setActionPhotos((prev) => [...prev, ...newUrls]);
      }
    } catch (err: any) {
      alert(err?.message || "Gagal mengunggah foto.");
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  }

  // Submit complete wizard
  async function handleSubmitWizard() {
    if (!wizardLocationArea.trim()) {
      setWizardError("Area lokasi inspeksi wajib diisi.");
      setWizardStep(2);
      return;
    }

    const leader = wizardTeam.find((m) => m.isTeamLeader) || wizardTeam[0];
    if (!leader) {
      setWizardError("Minimal harus ada satu Team Leader.");
      setWizardStep(1);
      return;
    }

    setIsSubmittingWizard(true);
    setWizardError(null);

    const findingsPayload = wizardFindingDesc.trim()
      ? [
          {
            classificationName: wizardClassification,
            description: wizardFindingDesc.trim(),
            photoUrls: wizardPhotos,
            riskLevel: wizardRiskLevel,
            actionRequired: wizardActionReq.trim(),
          },
        ]
      : [];

    const sessionPayload = {
      inspectionDate: wizardDate,
      inspectionTime: wizardTime,
      locationArea: wizardLocationArea.trim(),
      locationDetail: wizardLocationDetail.trim(),
      latitude: wizardLat || liveGeo.lat,
      longitude: wizardLng || liveGeo.lng,
      gpsAccuracy: wizardGpsAcc || liveGeo.acc,
      focusItemName: wizardFocusItem,
      leadEmployeeName: leader.name,
      leadBadgeNumber: leader.badgeNumber,
      leadDepartment: leader.department,
      leadCompany: leader.company || "PT Chitra Paratama",
      notes: wizardNotes.trim(),
      teamMembers: wizardTeam,
      findings: findingsPayload,
    };

    // If offline, save to local queue
    if (!navigator.onLine) {
      try {
        const savedQueue = localStorage.getItem(HSE_OSM_OFFLINE_STORAGE_KEY);
        const queue = savedQueue ? JSON.parse(savedQueue) : [];
        queue.push(sessionPayload);
        localStorage.setItem(HSE_OSM_OFFLINE_STORAGE_KEY, JSON.stringify(queue));
        setOfflineQueueCount(queue.length);
        alert("Perangkat offline: Sesi OSM disimpan ke antrean offline lokal dan akan disinkronkan saat online.");
        setCurrentView("hub");
      } catch (err: any) {
        setWizardError("Gagal menyimpan ke penyimpanan offline.");
      } finally {
        setIsSubmittingWizard(false);
      }
      return;
    }

    try {
      const res = await createHseOsmSession(sessionPayload);
      if (!res.success) throw new Error(res.error || "Gagal membuat sesi OSM.");

      alert("Sesi On the Spot Monitoring berhasil dibuat!");
      await loadSessions();
      setCurrentView("monitoring_list");
    } catch (err: any) {
      setWizardError(err?.message || "Terjadi kesalahan saat submit.");
    } finally {
      setIsSubmittingWizard(false);
    }
  }

  // Handle Action Submit (Corrective Action / Verify)
  async function handleExecuteAction() {
    if (!actionFinding) return;
    setIsSubmittingAction(true);
    try {
      if (actionMode === "action") {
        if (!actionTakenText.trim()) throw new Error("Catatan tindakan perbaikan wajib diisi.");
        const res = await submitHseOsmAction(actionFinding.id, {
          actionTaken: actionTakenText.trim(),
          actionPhotoUrls: actionPhotos,
        });
        if (!res.success) throw new Error(res.error || "Gagal menyimpan perbaikan.");
      } else if (actionMode === "close") {
        const res = await verifyHseOsmFinding(actionFinding.id, { status: "CLOSED" });
        if (!res.success) throw new Error(res.error || "Gagal memverifikasi penutupan.");
      } else if (actionMode === "reject") {
        if (!rejectionReasonText.trim()) throw new Error("Alasan penolakan perbaikan wajib diisi.");
        const res = await verifyHseOsmFinding(actionFinding.id, {
          status: "REJECTED",
          rejectionReason: rejectionReasonText.trim(),
        });
        if (!res.success) throw new Error(res.error || "Gagal menolak perbaikan.");
      }

      // Refresh detail
      if (activeSessionDetail?.id) {
        await handleOpenDetail(activeSessionDetail.id);
      }
      setActionMode(null);
      setActionFinding(null);
      setActionTakenText("");
      setActionPhotos([]);
      setRejectionReasonText("");
    } catch (err: any) {
      alert(err?.message || "Gagal memproses aksi.");
    } finally {
      setIsSubmittingAction(false);
    }
  }

  // ==========================================
  // VIEW 1: HUB / PUSAT KONTROL OSM (Slide 2 & 3)
  // ==========================================
  if (currentView === "hub") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
        {/* Top Header Card (Slide 2) */}
        <div className="bg-white dark:bg-slate-900 border-b p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/mobile/hse")}
                className="size-8 -ml-1 text-muted-foreground"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <div>
                <h1 className="text-base font-bold text-foreground leading-tight">HSES App</h1>
                <p className="text-[11px] text-muted-foreground">Report Solution Console</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  isOnline
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {isOnline ? (
                  <>
                    <Wifi className="size-3" /> ONLINE
                  </>
                ) : (
                  <>
                    <WifiOff className="size-3" /> OFFLINE
                  </>
                )}
              </span>
            </div>
          </div>

          {/* User Profile Card (Slide 2 & 3) */}
          <div className="rounded-xl border bg-slate-50/70 dark:bg-slate-800/40 p-3.5 space-y-2">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-teal-100 dark:bg-teal-950 flex items-center justify-center font-bold text-teal-800 dark:text-teal-200 text-sm border border-teal-300">
                {inspectorName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-foreground truncate">{inspectorName}</h2>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  NRP: {inspectorBadge} • {inspectorDept}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                    {inspectorSection}
                  </span>
                </div>
              </div>
            </div>

            {liveGeo.lat && (
              <div className="pt-2 border-t text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3 text-red-500 shrink-0" />
                <span>
                  Latitude: {liveGeo.lat}, Longitude: {liveGeo.lng}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons: Monitoring, Report, Sync (Slide 3) */}
        <div className="p-4 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            ACTIONS
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Action 1: Monitoring */}
            <button
              onClick={() => setCurrentView("monitoring_list")}
              className="flex flex-col items-center justify-center p-3.5 rounded-xl border bg-white dark:bg-slate-900 shadow-xs hover:border-amber-500 active:scale-95 transition-all text-center gap-2"
            >
              <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shadow-2xs">
                <HardHat className="size-5" />
              </div>
              <span className="text-xs font-semibold text-foreground">Monitoring</span>
            </button>

            {/* Action 2: Report */}
            <button
              onClick={() => setCurrentView("monitoring_list")}
              className="flex flex-col items-center justify-center p-3.5 rounded-xl border bg-white dark:bg-slate-900 shadow-xs hover:border-blue-500 active:scale-95 transition-all text-center gap-2"
            >
              <div className="size-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shadow-2xs">
                <FileText className="size-5" />
              </div>
              <span className="text-xs font-semibold text-foreground">Report</span>
            </button>

            {/* Action 3: Sync */}
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex flex-col items-center justify-center p-3.5 rounded-xl border bg-white dark:bg-slate-900 shadow-xs hover:border-emerald-500 active:scale-95 transition-all text-center gap-2 relative"
            >
              {offlineQueueCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow">
                  {offlineQueueCount}
                </span>
              )}
              <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shadow-2xs">
                <RefreshCw className={`size-5 ${isSyncing ? "animate-spin" : ""}`} />
              </div>
              <span className="text-xs font-semibold text-foreground">Sync</span>
            </button>
          </div>

          <div className="text-[11px] text-muted-foreground text-center">
            Last sync: {lastSyncTime || "2024-10-09 13:34"}
          </div>

          {/* DASHBOARD REPORTS (Slide 3) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                DASHBOARD REPORTS
              </span>
              <span className="text-[11px] text-muted-foreground">Detailed report in HSES</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* OPEN CARD */}
              <div className="rounded-xl border border-red-200 bg-white dark:bg-slate-900 p-4 text-center space-y-1 shadow-xs">
                <span className="text-3xl font-black text-red-600">{metrics.openTickets}</span>
                <span className="text-xs font-bold text-red-700 block">OPEN</span>
                <span className="text-[11px] text-muted-foreground block">Ticket Open</span>
              </div>

              {/* REJECTED CARD */}
              <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 p-4 text-center space-y-1 shadow-xs">
                <span className="text-3xl font-black text-slate-700 dark:text-slate-300">
                  {metrics.rejectedTickets}
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Rejected
                </span>
                <span className="text-[11px] text-muted-foreground block">Ticket Rejected</span>
              </div>

              {/* PROCESSED CARD */}
              <div className="rounded-xl border border-amber-200 bg-white dark:bg-slate-900 p-4 text-center space-y-1 shadow-xs">
                <span className="text-3xl font-black text-amber-600">
                  {metrics.processedTickets}
                </span>
                <span className="text-xs font-bold text-amber-700 block">Processed</span>
                <span className="text-[11px] text-muted-foreground block">Tindak Lanjut</span>
              </div>

              {/* CLOSED CARD */}
              <div className="rounded-xl border border-emerald-200 bg-white dark:bg-slate-900 p-4 text-center space-y-1 shadow-xs">
                <span className="text-3xl font-black text-emerald-600">
                  {metrics.closedTickets}
                </span>
                <span className="text-xs font-bold text-emerald-700 block">CLOSED</span>
                <span className="text-[11px] text-muted-foreground block">Selesai Diverifikasi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Action Button "+ New OSM" */}
        <div className="fixed bottom-6 right-6 z-30">
          <Button
            onClick={startNewOsm}
            className="size-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex items-center justify-center p-0 active:scale-95 transition-transform"
          >
            <Plus className="size-7" />
          </Button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: DAFTAR TUGAS & NAVIGASI (Slide 6)
  // ==========================================
  if (currentView === "monitoring_list") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
        {/* Navigation Header */}
        <div className="bg-white dark:bg-slate-900 border-b p-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentView("hub")}
              className="size-8 -ml-1 text-muted-foreground"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <h1 className="text-base font-bold text-foreground">Monitoring OSM</h1>
          </div>
          <Button
            size="sm"
            onClick={startNewOsm}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 gap-1 rounded-full px-3"
          >
            <Plus className="size-3.5" /> New
          </Button>
        </div>

        {/* Sessions List */}
        <div className="p-4 space-y-3">
          {isLoadingSessions ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
              <Loader2 className="size-6 animate-spin text-amber-600" />
              <span>Memuat data monitoring...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-xs rounded-xl border border-dashed bg-white dark:bg-slate-900 p-6 space-y-3">
              <HardHat className="size-8 mx-auto text-slate-400" />
              <p>Belum ada sesi monitoring On the Spot.</p>
              <Button onClick={startNewOsm} size="sm" className="text-xs bg-blue-600 text-white">
                Buat Sesi Baru Sekarang
              </Button>
            </div>
          ) : (
            sessions.map((item) => {
              const summary = item.findingsSummary || { total: 0, open: 0, closed: 0 };
              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenDetail(item.id)}
                  className="rounded-xl border bg-white dark:bg-slate-900 p-4 space-y-2.5 shadow-xs active:scale-[0.99] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">{item.inspectionDate}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {item.sessionNumber}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <h3 className="text-sm font-semibold text-foreground">{item.locationArea}</h3>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      {item.focusItemName}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {summary.total} Temuan
                      </span>
                      {summary.open > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                          {summary.open} Open
                        </span>
                      )}
                      {summary.closed > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {summary.closed} Closed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-blue-600 font-medium text-xs">
                      <span>Detail</span>
                      <ChevronRight className="size-3.5" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FAB */}
        <div className="fixed bottom-6 right-6 z-30">
          <Button
            onClick={startNewOsm}
            className="size-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex items-center justify-center p-0 active:scale-95 transition-transform"
          >
            <Plus className="size-7" />
          </Button>
        </div>
      </div>
    );
  }

  // ========================================================
  // VIEW 3: WIZARD FORM 3-TAHAP PEMBUATAN SESI (Slide 4, 5, 7)
  // ========================================================
  if (currentView === "create_wizard") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b p-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (wizardStep > 1) setWizardStep((prev) => (prev - 1) as any);
                else setCurrentView("hub");
              }}
              className="size-8 -ml-1 text-muted-foreground"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <h1 className="text-base font-bold text-foreground">
              {wizardStep === 1 && "Tahap 1: Registrasi Tim"}
              {wizardStep === 2 && "Tahap 2: Lokasi & Fokus"}
              {wizardStep === 3 && "Tahap 3: Temuan Lapangan"}
            </h1>
          </div>
          <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-full border border-amber-300">
            Step {wizardStep}/3
          </span>
        </div>

        <div className="p-4 space-y-4">
          {/* STEP 1: REGISTRASI TIM INSPEKSI (Slide 4) */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    OSM MEMBER TEAM
                  </span>
                  <span className="text-xs text-muted-foreground">{wizardTeam.length} Personil</span>
                </div>

                {/* Team Members List Card (Slide 4) */}
                <div className="space-y-2.5">
                  {wizardTeam.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 text-xs">
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            {m.name}
                            {m.isTeamLeader && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold px-1.5 rounded-full border border-amber-300">
                                Team Leader
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Badge Number: {m.badgeNumber}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{m.department}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                          <Checkbox
                            checked={m.isTeamLeader}
                            onCheckedChange={() => {
                              setWizardTeam((prev) =>
                                prev.map((item, i) => ({
                                  ...item,
                                  isTeamLeader: i === idx ? !item.isTeamLeader : item.isTeamLeader,
                                }))
                              );
                            }}
                          />
                          <span>Leader</span>
                        </label>
                        {wizardTeam.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setWizardTeam((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-red-500 p-1"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Member inline form */}
                <div className="pt-3 border-t space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>+ Tambah Anggota Tim</span>
                    <label className="flex items-center gap-1.5 text-[11px] font-normal cursor-pointer">
                      <Checkbox
                        checked={isManualExternal}
                        onCheckedChange={(c) => setIsManualExternal(!!c)}
                      />
                      <span>Personil Eksternal</span>
                    </label>
                  </div>

                  {!isManualExternal ? (
                    <div className="space-y-2.5 w-full">
                      {/* Search Bar Full Width */}
                      <div className="relative w-full">
                        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Cari nama atau NRP anggota tim..."
                          value={inlineEmpSearch}
                          onChange={(e) => setInlineEmpSearch(e.target.value)}
                          className="w-full pl-9 pr-8 text-xs h-9 bg-slate-50 dark:bg-slate-800 rounded-lg border"
                        />
                        {inlineEmpSearch && (
                          <button
                            type="button"
                            onClick={() => setInlineEmpSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Hasil Pencarian Langsung dengan Checkbox Multi-Select jika ada ketikan */}
                      {inlineEmpSearch.trim() && (
                        <div className="border rounded-xl p-2.5 bg-slate-50/70 dark:bg-slate-800/40 space-y-2 max-h-60 overflow-y-auto">
                          <div className="flex items-center justify-between text-[11px] px-1 text-muted-foreground pb-1 border-b">
                            <span>Hasil Pencarian ({inlineFilteredEmployees.length} Karyawan)</span>
                            {inlineFilteredEmployees.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const selectable = inlineFilteredEmployees
                                    .filter(
                                      (e) =>
                                        !wizardTeam.some(
                                          (m) => m.badgeNumber === e.employeeSn || m.employeeId === e.id
                                        )
                                    )
                                    .map((e) => e.id);
                                  setSelectedMultiEmpIds(selectable);
                                }}
                                className="text-blue-600 font-semibold hover:underline"
                              >
                                Pilih Semua
                              </button>
                            )}
                          </div>

                          {inlineFilteredEmployees.length === 0 ? (
                            <p className="text-xs text-center text-muted-foreground py-3">
                              Tidak ditemukan karyawan dengan nama/NRP tersebut
                            </p>
                          ) : (
                            inlineFilteredEmployees.slice(0, 15).map((emp) => {
                              const isAlreadyAdded = wizardTeam.some(
                                (m) => m.badgeNumber === emp.employeeSn || m.employeeId === emp.id
                              );
                              const isChecked = selectedMultiEmpIds.includes(emp.id);

                              return (
                                <div
                                  key={emp.id}
                                  onClick={() => {
                                    if (isAlreadyAdded) return;
                                    setSelectedMultiEmpIds((prev) =>
                                      isChecked ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                                    );
                                  }}
                                  className={`p-2 rounded-lg border flex items-center justify-between transition-all ${
                                    isAlreadyAdded
                                      ? "bg-slate-100/50 dark:bg-slate-800/20 opacity-50 cursor-not-allowed"
                                      : isChecked
                                      ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 cursor-pointer"
                                      : "bg-white dark:bg-slate-900 hover:bg-slate-50 cursor-pointer"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {!isAlreadyAdded ? (
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={() => {
                                          setSelectedMultiEmpIds((prev) =>
                                            isChecked ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                                          );
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    ) : (
                                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold truncate text-foreground">{emp.name}</p>
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        NRP: {emp.employeeSn} • {emp.departmentName || "Mining Operations"}
                                      </p>
                                    </div>
                                  </div>

                                  {isAlreadyAdded ? (
                                    <span className="text-[10px] text-emerald-600 font-semibold shrink-0">Di Tim</span>
                                  ) : (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addEmployeeToTeam(emp);
                                      }}
                                      className="h-6 text-[10px] px-2 text-blue-600 hover:bg-blue-50 shrink-0 font-semibold"
                                    >
                                      + Tambah
                                    </Button>
                                  )}
                                </div>
                              );
                            })
                          )}

                          {/* Tombol Tambahkan Sekaligus dari Pencarian Inline */}
                          {selectedMultiEmpIds.length > 0 && (
                            <Button
                              type="button"
                              onClick={() => addMultipleEmployeesToTeam(selectedMultiEmpIds)}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 font-bold mt-1 gap-1.5 shadow-xs"
                            >
                              <UserPlus className="size-3.5" />
                              Tambahkan ({selectedMultiEmpIds.length}) Anggota Terpilih ke Tim
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Tombol Buka Dialog Multi-Select Lengkap (Full-Width) */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedMultiEmpIds([]);
                          setEmpSearchQuery(inlineEmpSearch);
                          setSearchEmpModalOpen(true);
                        }}
                        className="w-full h-11 border-blue-200 dark:border-blue-900 bg-blue-50/70 hover:bg-blue-100/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-between px-3 rounded-xl shadow-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="size-6 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <Users className="size-3.5" />
                          </div>
                          <div className="text-left">
                            <span className="block font-bold">Pilih Banyak Anggota (Multi-Select)</span>
                            <span className="text-[10px] font-normal text-muted-foreground">
                              Bisa centang beberapa personil sekaligus
                            </span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] font-semibold bg-white/80 dark:bg-slate-800">
                          {availableEmployees.length} Karyawan
                        </Badge>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        placeholder="Nama Lengkap..."
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        className="text-xs h-8"
                      />
                      <Input
                        placeholder="Badge / NRP..."
                        value={manualBadge}
                        onChange={(e) => setManualBadge(e.target.value)}
                        className="text-xs h-8"
                      />
                      <Input
                        placeholder="Divisi / Departemen..."
                        value={manualDept}
                        onChange={(e) => setManualDept(e.target.value)}
                        className="text-xs h-8"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (!manualName.trim() || !manualBadge.trim()) {
                            alert("Nama dan Badge wajib diisi.");
                            return;
                          }
                          setWizardTeam((prev) => [
                            ...prev,
                            {
                              badgeNumber: manualBadge.trim(),
                              name: manualName.trim(),
                              department: manualDept.trim() || "KPC Mining",
                              company: "PT Kaltim Prima Coal",
                              isTeamLeader: false,
                              isExternal: true,
                            },
                          ]);
                          setManualName("");
                          setManualBadge("");
                          setManualDept("");
                        }}
                        className="w-full bg-blue-600 text-white text-xs h-8"
                      >
                        Tambah Personil Eksternal
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation button */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentView("hub")}
                  className="flex-1 text-xs h-10"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setWizardStep(2)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-10 font-bold"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: DATA SPASIAL & FOKUS (Slide 5) */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="rounded-2xl border bg-white dark:bg-slate-900 p-4 space-y-4 shadow-sm">
                {/* Header Card */}
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <span className="text-[10px] font-black tracking-wider text-blue-600 dark:text-blue-400 uppercase">
                      STEP 2 OF 3 • SPATIAL & FOCUS
                    </span>
                    <h2 className="text-sm font-bold text-foreground">Lokasi Inspeksi & Fokus Monitoring</h2>
                  </div>
                  <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <MapPin className="size-4" />
                  </div>
                </div>

                {/* 1. Date & Time (2 columns) */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="size-3 text-muted-foreground" />
                      Tanggal Inspeksi
                    </Label>
                    <Input
                      type="date"
                      value={wizardDate}
                      onChange={(e) => setWizardDate(e.target.value)}
                      className="text-xs h-9 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Clock className="size-3 text-muted-foreground" />
                      Waktu Inspeksi
                    </Label>
                    <Input
                      type="time"
                      value={wizardTime}
                      onChange={(e) => setWizardTime(e.target.value)}
                      className="text-xs h-9 bg-slate-50 dark:bg-slate-800 rounded-lg"
                    />
                  </div>
                </div>

                {/* 2. Nama Lokasi Utama (Location Area) with Quick Chips */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-blue-600" />
                      Nama Lokasi Area <span className="text-red-500">*</span>
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Ketik atau pilih chip</span>
                  </div>
                  <Input
                    placeholder="Contoh: Pit West, Workshop HERO, Hauling Road..."
                    value={wizardLocationArea}
                    onChange={(e) => setWizardLocationArea(e.target.value)}
                    className="text-xs h-9 bg-slate-50 dark:bg-slate-800 font-semibold rounded-lg"
                    required
                  />

                  {/* Quick Preset Location Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      "Pit West - Sangatta",
                      "Workshop Central HERO",
                      "Hauling Road KM 12",
                      "Disposal South",
                      "Fuel Station & Washpad",
                      "Warehouse & Yard",
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setWizardLocationArea(chip)}
                        className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                          wizardLocationArea === chip
                            ? "bg-blue-600 text-white border-blue-600 font-bold shadow-xs scale-102"
                            : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-medium active:scale-95"
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Detail Lokasi / Area Spesifik (Requested) */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                    <Compass className="size-3.5 text-blue-600" />
                    Detail Lokasi / Area Spesifik
                  </Label>
                  <Input
                    placeholder="Contoh: Bay 4 Workshop RMI, Bench 3 West, KM 14.5, Front Loading 01..."
                    value={wizardLocationDetail}
                    onChange={(e) => setWizardLocationDetail(e.target.value)}
                    className="text-xs h-9 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Keterangan spesifik titik pekerjaan saat inspeksi dilakukan.
                  </p>
                </div>

                {/* 4. GPS Geotagging & Real Map View (Requested) */}
                <div className="space-y-2 pt-1 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                        <Crosshair className="size-3.5 text-emerald-600" />
                        Peta Lokasi GPS (OpenStreetMap)
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Koordinat geotagging otomatis dari satelit GPS
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isDetectingGps}
                      onClick={() => {
                        setIsDetectingGps(true);
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            (pos) => {
                              setWizardLat(pos.coords.latitude.toFixed(7));
                              setWizardLng(pos.coords.longitude.toFixed(7));
                              setWizardGpsAcc(`±${Math.round(pos.coords.accuracy)}m`);
                              setIsDetectingGps(false);
                            },
                            (err) => {
                              alert(`Gagal membaca GPS: ${err.message}`);
                              setIsDetectingGps(false);
                            },
                            { enableHighAccuracy: true, timeout: 15000 }
                          );
                        } else {
                          alert("GPS tidak didukung oleh browser Anda.");
                          setIsDetectingGps(false);
                        }
                      }}
                      className="h-7 text-[11px] px-2 text-blue-600 border-blue-200 dark:border-blue-800 hover:bg-blue-50 gap-1 font-semibold"
                    >
                      <RefreshCw className={`size-3 ${isDetectingGps ? "animate-spin text-blue-600" : ""}`} />
                      {isDetectingGps ? "Mencari..." : "Perbarui GPS"}
                    </Button>
                  </div>

                  {/* Real Leaflet OpenStreetMap Mini Map (No Iframe Blocking) */}
                  <OsmMiniMap
                    latitude={wizardLat || liveGeo.lat}
                    longitude={wizardLng || liveGeo.lng}
                    accuracy={wizardGpsAcc || liveGeo.acc || "±5m"}
                    className="h-44"
                  />
                </div>

                {/* 5. Fokus Area Monitoring (5 Kategori Visual Cards) */}
                <div className="space-y-2 pt-1 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-blue-600" />
                      Fokus Area Monitoring OSM <span className="text-red-500">*</span>
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-semibold">Pilih 1 Fokus</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {[
                      {
                        name: "Fatality Prevention",
                        desc: "Kontrol bahaya fatal: isolasi energi, ruang terbatas, jatuh dari ketinggian",
                        badge: "Kritis",
                        badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
                        icon: ShieldAlert,
                      },
                      {
                        name: "Environmental Management",
                        desc: "Pengelolaan limbah B3, tumpahan oli, sediment pond, hidrologi",
                        badge: "Lingkungan",
                        badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                        icon: Compass,
                      },
                      {
                        name: "Finger Injury Prevention",
                        desc: "Titik jepit alat, perkakas tangan, APD sarung tangan mekanik",
                        badge: "Cedera Jari",
                        badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                        icon: AlertTriangle,
                      },
                      {
                        name: "Risk Management",
                        desc: "JSA/IBPR, kepatuhan SOP/WIN, safe work procedure di lapangan",
                        badge: "Prosedur",
                        badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
                        icon: Crosshair,
                      },
                      {
                        name: "Incident Management",
                        desc: "Verifikasi tindakan perbaikan temuan insiden sebelumnya",
                        badge: "Investigasi",
                        badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
                        icon: ShieldCheck,
                      },
                    ].map((f) => {
                      const isSelected = wizardFocusItem === f.name;
                      const IconComp = f.icon;

                      return (
                        <div
                          key={f.name}
                          onClick={() => setWizardFocusItem(f.name)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] ${
                            isSelected
                              ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-600 shadow-xs ring-1 ring-blue-500/30"
                              : "bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/70 border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            }`}>
                              <IconComp className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-foreground truncate">{f.name}</p>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${f.badgeClass}`}>
                                  {f.badge}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">{f.desc}</p>
                            </div>
                          </div>

                          <div className="shrink-0 pl-2">
                            {isSelected ? (
                              <CheckCircle2 className="size-4 text-blue-600" />
                            ) : (
                              <div className="size-4 rounded-full border border-slate-300 dark:border-slate-600" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setWizardStep(1)}
                  className="flex-1 text-xs h-10"
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    if (!wizardLocationArea.trim()) {
                      alert("Area lokasi wajib diisi.");
                      return;
                    }
                    setWizardStep(3);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-10 font-bold"
                >
                  Next: Input Temuan (3/3)
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: INPUT TIKET TEMUAN LAPANGAN (Slide 7) */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 space-y-3.5">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">
                  Create Finding OSM (Laporan Temuan)
                </div>

                {/* Summary Info */}
                <div className="p-2.5 rounded-lg bg-muted/40 text-[11px] space-y-1">
                  <p>
                    <strong>Lokasi:</strong> {wizardLocationArea}
                    {wizardLocationDetail ? ` (${wizardLocationDetail})` : ""} ({wizardDate})
                  </p>
                  <p>
                    <strong>Fokus:</strong> {wizardFocusItem}
                  </p>
                </div>

                {/* Classification Type (10 Categories) */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Tipe Klasifikasi (10 Kategori Standar KPC)
                  </Label>
                  <Select value={wizardClassification} onValueChange={setWizardClassification}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {HSE_OSM_DEFAULT_CLASSIFICATIONS.map((c, idx) => (
                        <SelectItem key={idx} value={c.name} className="text-xs">
                          {idx + 1}. {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Risk Level */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Tingkat Risiko</Label>
                  <Select
                    value={wizardRiskLevel}
                    onValueChange={(val) => setWizardRiskLevel(val as HseOsmRiskLevel)}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW" className="text-xs">
                        Low Risk
                      </SelectItem>
                      <SelectItem value="MEDIUM" className="text-xs">
                        Medium Risk
                      </SelectItem>
                      <SelectItem value="HIGH" className="text-xs">
                        High Risk
                      </SelectItem>
                      <SelectItem value="CRITICAL" className="text-xs">
                        Critical Risk
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Uraian Teks Masalah (Slide 7) */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Uraian Teks / Deskripsi Masalah <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    rows={4}
                    placeholder="Input paragraf deskripsi masalah atau temuan kondisi tidak aman..."
                    value={wizardFindingDesc}
                    onChange={(e) => setWizardFindingDesc(e.target.value)}
                    className="text-xs resize-none"
                    required
                  />
                </div>

                {/* Modul Kamera (Slide 7: Batas unggah tiga file) */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Modul Kamera (Batas Unggah 3 File Foto)
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {wizardPhotos.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-video rounded-lg border overflow-hidden bg-slate-950"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveClientUploadUrl(url)}
                          alt={`Foto ${idx + 1}`}
                          className="size-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setWizardPhotos((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 size-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}

                    {wizardPhotos.length < 3 && (
                      <label className="border-2 border-dashed rounded-lg aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/20 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e, "wizard")}
                          disabled={isUploadingPhoto}
                        />
                        {isUploadingPhoto ? (
                          <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <Camera className="size-5 text-muted-foreground mb-0.5" />
                            <span className="text-[10px] text-muted-foreground font-medium">Foto</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                </div>

                {/* Rekomendasi Tindakan */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Rekomendasi Tindakan Perbaikan
                  </Label>
                  <Input
                    placeholder="Tindakan yang perlu diambil..."
                    value={wizardActionReq}
                    onChange={(e) => setWizardActionReq(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              {wizardError && (
                <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
                  {wizardError}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setWizardStep(2)}
                  className="flex-1 text-xs h-10"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmitWizard}
                  disabled={isSubmittingWizard || isUploadingPhoto}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 font-bold gap-1.5"
                >
                  {isSubmittingWizard ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4" /> Simpan Sesi OSM
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Sheet: Cari Karyawan Internal HERO (Multi-Select Full-Width) */}
        {searchEmpModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div
              className="fixed inset-0 -z-10"
              onClick={() => {
                setSearchEmpModalOpen(false);
                setEmpSearchQuery("");
                setSelectedMultiEmpIds([]);
              }}
            />
            <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl max-h-[90vh] h-[85vh] w-full sm:max-w-md flex flex-col shadow-2xl overflow-hidden border">
              {/* Header Modal */}
              <div className="p-3.5 border-b flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Pilih Anggota Tim (Multi-Select)</h2>
                    <p className="text-[11px] text-muted-foreground">
                      Bisa centang beberapa personil sekaligus untuk tim OSM
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => {
                    setSearchEmpModalOpen(false);
                    setEmpSearchQuery("");
                    setSelectedMultiEmpIds([]);
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* Search Bar Full Width */}
              <div className="p-3 border-b bg-background">
                <div className="relative w-full">
                  <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    autoFocus
                    placeholder="Cari nama, NRP / badge, atau departemen..."
                    value={empSearchQuery}
                    onChange={(e) => setEmpSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 text-xs h-9 bg-slate-50 dark:bg-slate-800 rounded-lg"
                  />
                  {empSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setEmpSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Toolbar Multi-Select: Pilih Semua & Counter */}
              <div className="px-3.5 py-2 bg-slate-50/80 dark:bg-slate-800/40 border-b flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const selectableIds = filteredEmployees
                        .filter(
                          (e) =>
                            !wizardTeam.some(
                              (m) => m.badgeNumber === e.employeeSn || m.employeeId === e.id
                            )
                        )
                        .map((e) => e.id);
                      setSelectedMultiEmpIds(selectableIds);
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                  >
                    Pilih Semua ({filteredEmployees.length})
                  </button>
                  {selectedMultiEmpIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedMultiEmpIds([])}
                      className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Batal Pilih
                    </button>
                  )}
                </div>
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  {selectedMultiEmpIds.length} Terpilih
                </span>
              </div>

              {/* Employee List with Checkboxes */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredEmployees.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-1.5">
                    <Users className="size-8 mx-auto opacity-30" />
                    <p className="text-xs font-semibold">Tidak ada karyawan yang cocok</p>
                    <p className="text-[11px]">Coba kata kunci pencarian nama atau NRP lain.</p>
                  </div>
                ) : (
                  filteredEmployees.slice(0, 100).map((emp) => {
                    const isAlreadyAdded = wizardTeam.some(
                      (m) => m.badgeNumber === emp.employeeSn || m.employeeId === emp.id
                    );
                    const isChecked = selectedMultiEmpIds.includes(emp.id);

                    return (
                      <div
                        key={emp.id}
                        onClick={() => {
                          if (isAlreadyAdded) return;
                          setSelectedMultiEmpIds((prev) =>
                            isChecked ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                          );
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                          isAlreadyAdded
                            ? "bg-slate-100/60 dark:bg-slate-800/30 opacity-60 cursor-not-allowed border-slate-200 dark:border-slate-800"
                            : isChecked
                            ? "bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 cursor-pointer shadow-xs"
                            : "bg-card hover:bg-slate-50 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800 cursor-pointer shadow-xs active:scale-[0.99]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="shrink-0">
                            {isAlreadyAdded ? (
                              <CheckCircle2 className="size-5 text-emerald-600" />
                            ) : (
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => {
                                  setSelectedMultiEmpIds((prev) =>
                                    isChecked ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                                  );
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                          </div>

                          <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              {emp.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              NRP: <span className="font-mono font-medium">{emp.employeeSn}</span> •{" "}
                              {emp.departmentName || "Mining Operations"}
                            </p>
                            {emp.jobTitle && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {emp.jobTitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 pl-2">
                          {isAlreadyAdded ? (
                            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              Sudah di Tim
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isChecked
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 dark:bg-slate-800 text-muted-foreground"
                              }`}
                            >
                              {isChecked ? "Terpilih" : "Pilih"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                {filteredEmployees.length > 100 && (
                  <p className="text-[10px] text-center text-muted-foreground pt-1 italic">
                    Menampilkan 100 dari {filteredEmployees.length} karyawan. Gunakan kolom pencarian untuk mempersempit.
                  </p>
                )}
              </div>

              {/* Sticky Footer: Full-Width Submit Button */}
              <div className="p-3 border-t bg-white dark:bg-slate-900 sticky bottom-0 z-10 flex flex-col gap-2 shadow-lg">
                <Button
                  type="button"
                  onClick={() => addMultipleEmployeesToTeam(selectedMultiEmpIds)}
                  disabled={selectedMultiEmpIds.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-11 rounded-xl shadow-md gap-2"
                >
                  <UserPlus className="size-4" />
                  Tambahkan {selectedMultiEmpIds.length > 0 ? `(${selectedMultiEmpIds.length}) ` : ""}Anggota Terpilih ke Tim
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchEmpModalOpen(false);
                    setEmpSearchQuery("");
                    setSelectedMultiEmpIds([]);
                  }}
                  className="w-full h-8 text-xs text-muted-foreground"
                >
                  Batal / Tutup
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 4: DETAIL SESI & TEMUAN (Slide 7)
  // ==========================================
  if (currentView === "session_detail" && activeSessionDetail) {
    const s = activeSessionDetail;
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
        {/* Navigation Bar */}
        <div className="bg-white dark:bg-slate-900 border-b p-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentView("monitoring_list")}
              className="size-8 -ml-1 text-muted-foreground"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">{s.sessionNumber}</h1>
              <p className="text-[11px] text-muted-foreground">{s.locationArea}</p>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5 rounded-full px-3 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100"
          >
            <Link href={`/print/hse/osm/${s.id}`} target="_blank">
              <Download className="size-3.5" />
              Download PDF
            </Link>
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Metadata Card */}
          <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between text-muted-foreground border-b pb-2">
              <span>
                {s.inspectionDate} • {s.inspectionTime}
              </span>
              <span className="font-semibold text-amber-600">{s.focusItemName}</span>
            </div>
            <p>
              <strong>Leader:</strong> {s.leadEmployeeName} ({s.leadBadgeNumber})
            </p>
            <p>
              <strong>Area:</strong> {s.locationArea}
            </p>
            {s.locationDetail ? (
              <p>
                <strong>Detail Lokasi:</strong> {s.locationDetail}
              </p>
            ) : null}
            {s.latitude && s.longitude ? (
              <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                <p className="font-mono text-[11px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="size-3 text-red-500 shrink-0" />
                  <span>{s.latitude}, {s.longitude}</span>
                  {s.gpsAccuracy ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      ({s.gpsAccuracy})
                    </span>
                  ) : null}
                </p>

                <div className="flex items-center gap-2 pt-0.5">
                  <a
                    href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 active:scale-95 transition"
                  >
                    <ExternalLink className="size-3" />
                    Buka di Google Maps
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowDetailMap((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 active:scale-95 transition cursor-pointer"
                  >
                    <MapPin className="size-3 text-red-500" />
                    {showDetailMap ? "Tutup Peta" : "Lihat Peta"}
                  </button>
                </div>

                {showDetailMap && (
                  <div className="pt-2 animate-in fade-in duration-200">
                    <OsmMiniMap
                      latitude={Number(s.latitude)}
                      longitude={Number(s.longitude)}
                      accuracy={s.gpsAccuracy || undefined}
                      className="h-44 rounded-xl border shadow-xs"
                    />
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Findings List */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Daftar Temuan ({s.findings?.length || 0})
            </div>

            {s.findings?.map((f: any) => {
              const statusCfg =
                HSE_OSM_STATUS_CONFIG[f.status as HseOsmFindingStatus] || HSE_OSM_STATUS_CONFIG.OPEN;
              const riskCfg =
                HSE_OSM_RISK_CONFIG[f.riskLevel as HseOsmRiskLevel] || HSE_OSM_RISK_CONFIG.MEDIUM;

              return (
                <div
                  key={f.id}
                  className="rounded-xl border bg-white dark:bg-slate-900 p-4 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {f.findingNumber}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${riskCfg.badgeClass}`}>
                      {riskCfg.label}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-foreground">{f.classificationName}</h4>
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line leading-relaxed">
                      {f.description}
                    </p>
                  </div>

                  {/* Photos Before (Temuan Awal) */}
                  {f.photoUrls && f.photoUrls.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-rose-500" />
                        Foto Kondisi Temuan (Before)
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {f.photoUrls.map((pUrl: string, pIdx: number) => (
                          <div
                            key={pIdx}
                            onClick={() => setSelectedPhotoModal(resolveClientUploadUrl(pUrl))}
                            className="aspect-video rounded-lg border overflow-hidden bg-slate-950 cursor-pointer shadow-2xs hover:opacity-90 transition"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={resolveClientUploadUrl(pUrl)}
                              alt="Foto Temuan (Before)"
                              className="size-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Corrective Action / After (if available) */}
                  {f.actionTaken && (
                    <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Tindakan Perbaikan (After):
                        </span>
                        {f.actionSubmittedBy && (
                          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400">
                            Oleh: {f.actionSubmittedBy}
                          </span>
                        )}
                      </div>
                      <p className="text-foreground leading-relaxed">{f.actionTaken}</p>
                      {f.actionPhotoUrls && f.actionPhotoUrls.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 block">
                            Bukti Selesai Perbaikan:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {f.actionPhotoUrls.map((apUrl: string, apIdx: number) => (
                              <div
                                key={apIdx}
                                onClick={() => setSelectedPhotoModal(resolveClientUploadUrl(apUrl))}
                                className="size-16 rounded-lg border border-emerald-300 dark:border-emerald-700 overflow-hidden bg-slate-950 cursor-pointer shadow-xs hover:opacity-90 transition"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={resolveClientUploadUrl(apUrl)}
                                  alt="Foto Bukti (After)"
                                  className="size-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer status & Action buttons */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusCfg.badgeClass}`}>
                      <span className={`size-1.5 rounded-full ${statusCfg.dotClass}`} />
                      {statusCfg.label}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {f.status === "OPEN" && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setActionFinding(f);
                            setActionMode("action");
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7 px-2.5"
                        >
                          Tindak Lanjuti
                        </Button>
                      )}

                      {f.status === "PROCESSED" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActionFinding(f);
                              setActionMode("reject");
                            }}
                            className="border-red-300 text-red-600 text-xs h-7 px-2"
                          >
                            Tolak
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setActionFinding(f);
                              setActionMode("close");
                            }}
                            className="bg-emerald-600 text-white text-xs h-7 px-2.5"
                          >
                            Close
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Dialog Modal for Mobile */}
        {actionMode && actionFinding && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-3">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-4 space-y-3.5 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-bold text-foreground">
                  {actionMode === "action" && "Input Tindakan Perbaikan"}
                  {actionMode === "close" && "Verifikasi Penutupan (Close)"}
                  {actionMode === "reject" && "Tolak Perbaikan Lapangan"}
                </h3>
                <button onClick={() => setActionMode(null)} className="text-muted-foreground p-1">
                  <X className="size-4" />
                </button>
              </div>

              {actionMode === "action" && (
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Uraian Tindakan Perbaikan</Label>
                    <Textarea
                      rows={3}
                      placeholder="Jelaskan tindakan korektif yang telah diselesaikan..."
                      value={actionTakenText}
                      onChange={(e) => setActionTakenText(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Foto Bukti Perbaikan (Maks. 3)</Label>
                    <div className="flex gap-2">
                      {actionPhotos.map((url, idx) => (
                        <div key={idx} className="relative size-16 rounded border overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={resolveClientUploadUrl(url)}
                            alt="Bukti"
                            className="size-full object-cover"
                          />
                        </div>
                      ))}
                      {actionPhotos.length < 3 && (
                        <label className="size-16 rounded border-2 border-dashed flex items-center justify-center cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(e, "action")}
                          />
                          <Camera className="size-5 text-muted-foreground" />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {actionMode === "close" && (
                <p className="text-xs text-muted-foreground">
                  Pastikan bahaya telah tuntas dieliminasi sebelum memverifikasi penutupan tiket ini.
                </p>
              )}

              {actionMode === "reject" && (
                <div className="space-y-1 text-xs">
                  <Label className="text-xs font-semibold">Alasan Penolakan / Catatan Revisi</Label>
                  <Textarea
                    rows={3}
                    placeholder="Tuliskan catatan revisi..."
                    value={rejectionReasonText}
                    onChange={(e) => setRejectionReasonText(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionMode(null)}
                  className="flex-1 text-xs"
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={handleExecuteAction}
                  disabled={isSubmittingAction}
                  className={`flex-1 text-xs text-white ${
                    actionMode === "action"
                      ? "bg-amber-600"
                      : actionMode === "close"
                      ? "bg-emerald-600"
                      : "bg-red-600"
                  }`}
                >
                  {isSubmittingAction ? "Menyimpan..." : "Kirim"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Photo Lightbox */}
        {selectedPhotoModal && (
          <div
            onClick={() => setSelectedPhotoModal(null)}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhotoModal}
              alt="Preview"
              className="max-h-[85vh] max-w-full rounded object-contain"
            />
          </div>
        )}
      </div>
    );
  }

  return null;
}
