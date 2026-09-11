"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Move,
  Plus,
  RotateCcw,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  createOvertimeCommandLetterAction,
  resubmitOvertimeCommandLetterAction,
} from "@/app/dashboard/overtime-requests/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SpeechTextarea as Textarea } from "@/components/ui/speech-textarea";
import { downloadElementAsPdf } from "@/lib/pdf-download";
import { resolveEmployeeApproverHierarchy, type EmployeeHierarchyInfo } from "@/lib/overtime-hierarchy";
import { cn } from "@/lib/utils";

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return String(d)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function fmtDt(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return String(d)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

export type EmployeeOption = EmployeeHierarchyInfo;

type WorkerRow = {
  employeeId: string;
  shiftCode: string;
  rosterType: string;
  category: string;
};

type LineItemRow = {
  lineLabel: string;
  targetUnit: string;
  estimatedMinutes: number;
  plannedPoints: number;
};

function dateInputValue(value = new Date()) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

const SPL_PRESETS = [
  { name: "Overtime Pemasangan & Dismounting Tyre OTR", unit: "1 Unit HD", dur: 120, pts: 10 },
  { name: "Emergency Callout Breakdown Unit Lapangan", unit: "1 Unit", dur: 180, pts: 15 },
  { name: "Perbaikan Struktur Curing Ban Workshop", unit: "2 Tyre", dur: 90, pts: 10 },
  { name: "Inspection & Tyre Maintenance Overtime", unit: "4 Unit", dur: 60, pts: 5 },
];

function formatPtwTime(value: Date | string | null | undefined) {
  if (!value) return "17:00";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "17:00";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":");
}

export function MobileOvertimeRequestForm({
  employees = [],
  currentEmployee,
  parentSplId,
  editSplId,
  initialSplData,
}: {
  employees: EmployeeOption[];
  currentEmployee?: EmployeeOption | null;
  parentSplId?: number;
  editSplId?: number;
  initialSplData?: any;
}) {
  const router = useRouter();

  const rawDoc = initialSplData?.document || initialSplData;
  const doc = rawDoc
    ? {
        ...rawDoc,
        id: rawDoc.id || rawDoc.documentId || editSplId || parentSplId,
        approvals: rawDoc.approvals || initialSplData?.approvals || [],
        participants: rawDoc.participants || initialSplData?.participants || [],
        lineItems: rawDoc.lineItems || initialSplData?.lineItems || [],
      }
    : null;

  const initialTargetId = doc?.requestedByEmployeeId || currentEmployee?.id || employees[0]?.id;
  const initialHierarchy = initialTargetId
    ? resolveEmployeeApproverHierarchy(initialTargetId, employees)
    : { leader: null, superior: null, department: "Central Services" };

  const [title, setTitle] = useState(
    doc?.title
      ? editSplId
        ? doc.title
        : parentSplId
          ? `Extension ${doc.title}`
          : doc.title
      : parentSplId
        ? "Extension SPL Lembur"
        : ""
  );
  const [workDate, setWorkDate] = useState(
    doc?.workDate ? dateInputValue(new Date(doc.workDate)) : dateInputValue()
  );
  const [plannedStartDate, setPlannedStartDate] = useState(
    doc?.plannedStartAt
      ? dateInputValue(new Date(doc.plannedStartAt))
      : doc?.workDate
        ? dateInputValue(new Date(doc.workDate))
        : dateInputValue()
  );
  const [plannedStartTime, setPlannedStartTime] = useState(
    doc?.plannedStartAt ? formatPtwTime(new Date(doc.plannedStartAt)) : "17:00"
  );
  const [plannedEndDate, setPlannedEndDate] = useState(
    doc?.plannedEndAt
      ? dateInputValue(new Date(doc.plannedEndAt))
      : doc?.workDate
        ? dateInputValue(new Date(doc.workDate))
        : dateInputValue()
  );
  const [plannedEndTime, setPlannedEndTime] = useState(
    doc?.plannedEndAt ? formatPtwTime(new Date(doc.plannedEndAt)) : "20:00"
  );
  const requesterEmployeeIdState = doc?.requestedByEmployeeId ? String(doc.requestedByEmployeeId) : (currentEmployee?.id ? String(currentEmployee.id) : "")
  const [requesterEmployeeId, setRequesterEmployeeId] = useState(requesterEmployeeIdState);
  const [requesterDepartment, setRequesterDepartment] = useState(
    doc?.requesterDepartment || doc?.department || initialHierarchy.department || currentEmployee?.department || "Central Services"
  );
  const [requestNotes, setRequestNotes] = useState(doc?.requestNotes || "");

  const isApprovedDoc =
    (doc?.status || '').toLowerCase() === 'approved' ||
    (doc?.status || '').toLowerCase() === 'closed';

  const existingEmployeeApproval = doc?.approvals?.find((a: any) => a.stepOrder === 1 || a.approverRole === 'employee' || a.approverRole === 'requester' || (a.stepLabel && a.stepLabel.toLowerCase().includes('karyawan')));
  const existingLeaderApproval = doc?.approvals?.find((a: any) => (doc?.approvals?.length === 2 ? a.stepOrder === 1 : a.stepOrder === 2) || a.approverRole === 'leader' || a.approverRole === 'pjo_or_te_initial' || (a.stepLabel && (a.stepLabel.toLowerCase().includes('leader') || a.stepLabel.toLowerCase().includes('supervisor'))));
  const existingSuperiorApproval = doc?.approvals?.find((a: any) => (doc?.approvals?.length === 2 ? a.stepOrder === 2 : a.stepOrder === 3) || a.approverRole === 'section_head' || a.approverRole === 'section_head_confirmation' || a.approverRole === 'superior' || (a.stepLabel && (a.stepLabel.toLowerCase().includes('section') || a.stepLabel.toLowerCase().includes('head'))));

  const isEmployeeSigned = Boolean(
    doc?.id &&
    doc?.status &&
    doc.status.toLowerCase() !== 'draft' &&
    (existingEmployeeApproval?.status === 'approved' || existingEmployeeApproval?.status === 'signed' || doc.createdAt)
  );

  const isLeaderApproved = (existingLeaderApproval?.status === 'approved' || existingLeaderApproval?.status === 'signed') && existingLeaderApproval?.status !== 'reverted' && existingLeaderApproval?.status !== 'needs_revision';
  const isLeaderLocked = isApprovedDoc || Boolean(isLeaderApproved);
  const isLeaderSigned = Boolean(doc?.id && isLeaderApproved);

  const isSuperiorApproved = (existingSuperiorApproval?.status === 'approved' || existingSuperiorApproval?.status === 'signed') && existingSuperiorApproval?.status !== 'reverted' && existingSuperiorApproval?.status !== 'needs_revision';
  const isSuperiorLocked = isApprovedDoc || Boolean(isSuperiorApproved);
  const isSuperiorSigned = Boolean(doc?.id && isSuperiorApproved);

  const matchedLeaderByEmployee = employees.find(
    (e) =>
      (existingLeaderApproval?.approverEmployeeId && e.id === Number(existingLeaderApproval.approverEmployeeId)) ||
      (existingLeaderApproval?.approverName && e.name.toLowerCase().trim() === existingLeaderApproval.approverName.toLowerCase().trim())
  );

  const matchedSuperiorByEmployee = employees.find(
    (e) =>
      (existingSuperiorApproval?.approverEmployeeId && e.id === Number(existingSuperiorApproval.approverEmployeeId)) ||
      (existingSuperiorApproval?.approverName && e.name.toLowerCase().trim() === existingSuperiorApproval.approverName.toLowerCase().trim())
  );

  // Jika sedang revisi / edit SPL (doc?.id), prioritaskan approver yang tersimpan di existing approval. Jika baru buat, gunakan hierarchy.
  const isEditingExistingSpl = Boolean(doc?.id || editSplId || parentSplId);

  const initialLeaderId = isEditingExistingSpl && (existingLeaderApproval || matchedLeaderByEmployee)
    ? (existingLeaderApproval?.approverEmployeeId
        ? String(existingLeaderApproval.approverEmployeeId)
        : matchedLeaderByEmployee
          ? String(matchedLeaderByEmployee.id)
          : initialHierarchy.leader?.id
            ? String(initialHierarchy.leader.id)
            : "")
    : (initialHierarchy.leader?.id
        ? String(initialHierarchy.leader.id)
        : existingLeaderApproval?.approverEmployeeId
          ? String(existingLeaderApproval.approverEmployeeId)
          : matchedLeaderByEmployee
            ? String(matchedLeaderByEmployee.id)
            : "");

  const initialLeaderName = isEditingExistingSpl && (existingLeaderApproval || matchedLeaderByEmployee)
    ? (existingLeaderApproval?.approverName ||
        matchedLeaderByEmployee?.name ||
        initialHierarchy.leader?.name ||
        "")
    : (initialHierarchy.leader?.name ||
        matchedLeaderByEmployee?.name ||
        existingLeaderApproval?.approverName ||
        "");

  const initialSuperiorId = isEditingExistingSpl && (existingSuperiorApproval || matchedSuperiorByEmployee)
    ? (existingSuperiorApproval?.approverEmployeeId
        ? String(existingSuperiorApproval.approverEmployeeId)
        : matchedSuperiorByEmployee
          ? String(matchedSuperiorByEmployee.id)
          : initialHierarchy.superior?.id
            ? String(initialHierarchy.superior.id)
            : "")
    : (initialHierarchy.superior?.id
        ? String(initialHierarchy.superior.id)
        : existingSuperiorApproval?.approverEmployeeId
          ? String(existingSuperiorApproval.approverEmployeeId)
          : matchedSuperiorByEmployee
            ? String(matchedSuperiorByEmployee.id)
            : "");

  const initialSuperiorName = isEditingExistingSpl && (existingSuperiorApproval || matchedSuperiorByEmployee)
    ? (existingSuperiorApproval?.approverName ||
        matchedSuperiorByEmployee?.name ||
        initialHierarchy.superior?.name ||
        "")
    : (initialHierarchy.superior?.name ||
        matchedSuperiorByEmployee?.name ||
        existingSuperiorApproval?.approverName ||
        "");

  const [leaderEmployeeId, setLeaderEmployeeId] = useState(initialLeaderId);
  const [leaderName, setLeaderName] = useState(initialLeaderName);
  const [superiorEmployeeId, setSuperiorEmployeeId] = useState(initialSuperiorId);
  const [superiorName, setSuperiorName] = useState(initialSuperiorName);

  const currentLeaderName = useMemo(() => {
    if (leaderEmployeeId) {
      const emp = employees.find((e) => String(e.id) === String(leaderEmployeeId));
      if (emp?.name) return emp.name;
    }
    return leaderName || existingLeaderApproval?.approverName || initialHierarchy.leader?.name || "—";
  }, [employees, leaderEmployeeId, leaderName, existingLeaderApproval?.approverName, initialHierarchy.leader?.name]);

  const currentSuperiorName = useMemo(() => {
    if (superiorEmployeeId) {
      const emp = employees.find((e) => String(e.id) === String(superiorEmployeeId));
      if (emp?.name) return emp.name;
    }
    return superiorName || existingSuperiorApproval?.approverName || initialHierarchy.superior?.name || "—";
  }, [employees, superiorEmployeeId, superiorName, existingSuperiorApproval?.approverName, initialHierarchy.superior?.name]);

  const requesterName = useMemo(() => {
    const selected = employees.find((e) => String(e.id) === String(requesterEmployeeId));
    return selected?.name || doc?.requesterName || currentEmployee?.name || "—";
  }, [employees, requesterEmployeeId, doc?.requesterName, currentEmployee?.name]);

  const [workers, setWorkers] = useState<WorkerRow[]>(() => {
    if (initialSplData?.participants && initialSplData.participants.length > 0) {
      return initialSplData.participants.map((p: any) => ({
        employeeId: String(p.employeeId),
        shiftCode: p.shiftCode || "DS",
        rosterType: p.rosterType || "5:2",
        category: p.category || "after_mandatory_ot",
      }));
    }
    return [
      {
        employeeId: currentEmployee?.id ? String(currentEmployee.id) : "",
        shiftCode: "DS",
        rosterType: "5:2",
        category: "after_mandatory_ot",
      },
    ];
  });

  const [lineItems, setLineItems] = useState<LineItemRow[]>(() => {
    if (initialSplData?.lineItems && initialSplData.lineItems.length > 0) {
      return initialSplData.lineItems.map((l: any) => ({
        lineLabel: l.lineLabel || "",
        targetUnit: l.targetUnit || "",
        estimatedMinutes: Number(l.estimatedMinutes) || 60,
        plannedPoints: Number(l.plannedPoints) || 5,
      }));
    }
    return [
      {
        lineLabel: "Overtime Pemasangan & Dismounting Tyre OTR",
        targetUnit: "1 Unit HD",
        estimatedMinutes: 120,
        plannedPoints: 10,
      },
    ];
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState<{
    splNumber: string;
    title: string;
    workDate: string;
    totalMinutes: number;
    workerCount: number;
  } | null>(null);

  const pdfPreviewRef = useRef<HTMLDivElement>(null);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1.0);

  function resetZoomAndPan() {
    setPreviewZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }

  useEffect(() => {
    if (!isPdfOpen) {
      resetZoomAndPan();
    }
  }, [isPdfOpen]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      initialPinchDistRef.current = dist;
      initialZoomRef.current = previewZoom;
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = {
        x: t.clientX - panOffset.x,
        y: t.clientY - panOffset.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scaleFactor = dist / initialPinchDistRef.current;
      const newZoom = Math.min(3.5, Math.max(0.6, Number((initialZoomRef.current * scaleFactor).toFixed(2))));
      setPreviewZoom(newZoom);
    } else if (e.touches.length === 1 && isDragging) {
      const t = e.touches[0];
      setPanOffset({
        x: t.clientX - dragStartRef.current.x,
        y: t.clientY - dragStartRef.current.y,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      initialPinchDistRef.current = null;
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
      setPreviewZoom((z) => Math.min(3.5, Math.max(0.6, Number((z + zoomDelta).toFixed(2)))));
    }
  };

  async function handleDownloadPdf() {
    if (!pdfPreviewRef.current) return;
    setIsDownloadingPdf(true);
    try {
      await downloadElementAsPdf(pdfPreviewRef.current, `${doc?.splNumber || 'SPL'}-Document.pdf`);
      toast.success("PDF SPL berhasil diunduh.");
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengunduh PDF.");
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  function applyHierarchy(empId: string | number) {
    if (!empId) return;
    const hierarchy = resolveEmployeeApproverHierarchy(empId, employees);
    if (hierarchy.department) {
      setRequesterDepartment(hierarchy.department);
    }
    if (hierarchy.leader && !isLeaderLocked) {
      setLeaderEmployeeId(String(hierarchy.leader.id));
      setLeaderName(hierarchy.leader.name);
    }
    if (hierarchy.superior && !isSuperiorLocked) {
      setSuperiorEmployeeId(String(hierarchy.superior.id));
      setSuperiorName(hierarchy.superior.name);
    }
  }

  const employeeOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: String(e.id),
        label: `${e.name}${e.position ? ` — ${e.position}` : ""}${e.department ? ` (${e.department})` : ""}`,
      })),
    [employees]
  );

  const totalEstimatedMinutes = useMemo(
    () => lineItems.reduce((sum, item) => sum + (Number(item.estimatedMinutes) || 0), 0),
    [lineItems]
  );

  function addWorkerRow() {
    setWorkers((prev) => [
      ...prev,
      {
        employeeId: "",
        shiftCode: "DS",
        rosterType: "5:2",
        category: "after_mandatory_ot",
      },
    ]);
  }

  function updateWorker(index: number, field: keyof WorkerRow, value: string) {
    setWorkers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

    if (field === "employeeId" && value) {
      if (index === 0 && (!requesterEmployeeId || requesterEmployeeId === workers[0]?.employeeId)) {
        setRequesterEmployeeId(value);
        applyHierarchy(value);
      } else if (!leaderEmployeeId || !superiorEmployeeId) {
        applyHierarchy(value);
      }
    }
  }

  function removeWorker(index: number) {
    if (workers.length <= 1) return;
    setWorkers((prev) => prev.filter((_, idx) => idx !== index));
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      {
        lineLabel: "",
        targetUnit: "",
        estimatedMinutes: 60,
        plannedPoints: 5,
      },
    ]);
  }

  function addPresetLineItem(preset: (typeof SPL_PRESETS)[number]) {
    setLineItems((prev) => [
      ...prev,
      {
        lineLabel: preset.name,
        targetUnit: preset.unit,
        estimatedMinutes: preset.dur,
        plannedPoints: preset.pts,
      },
    ]);
    toast.success(`Preset "${preset.name}" ditambahkan.`);
  }

  function updateLineItem(index: number, field: keyof LineItemRow, value: any) {
    setLineItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Mohon isi judul / keperluan lembur.");
      return;
    }

    const validWorkers = workers.filter((w) => Boolean(w.employeeId));
    if (validWorkers.length === 0) {
      toast.error("Mohon pilih minimal 1 peserta lembur.");
      return;
    }

    const validItems = lineItems.filter((item) => Boolean(item.lineLabel.trim()));
    if (validItems.length === 0) {
      toast.error("Mohon isi minimal 1 aktivitas pekerjaan lembur.");
      return;
    }

    setIsSubmitting(true);
    try {
      const startDateTime = `${plannedStartDate}T${plannedStartTime}`;
      const endDateTime = `${plannedEndDate}T${plannedEndTime}`;

      if (editSplId) {
        const res = await resubmitOvertimeCommandLetterAction({
          documentId: editSplId,
          title: title.trim(),
          workDate,
          plannedStartAt: startDateTime,
          plannedEndAt: endDateTime,
          requestedByEmployeeId: Number(requesterEmployeeId) || currentEmployee?.id || null,
          requestNotes: requestNotes.trim(),
          status: 'Submitted',
          participants: validWorkers.map((w) => ({
            employeeId: Number(w.employeeId),
            shiftCode: w.shiftCode,
            rosterType: w.rosterType,
            category: w.category,
          })),
          lineItems: validItems.map((item) => ({
            lineLabel: item.lineLabel.trim(),
            targetUnit: item.targetUnit.trim(),
            estimatedMinutes: Number(item.estimatedMinutes) || 60,
            plannedPoints: Number(item.plannedPoints) || 0,
          })),
          leaderName: leaderName || undefined,
          superiorName: superiorName || undefined,
        });

        if (!res.success) {
          toast.error(res.error || "Gagal menyimpan revisi SPL.");
          return;
        }

        toast.success("Revisi Surat Perintah Lembur (SPL) berhasil disimpan dan diajukan ulang!");
        // Reset state form menjadi bersih
        setTitle("");
        setRequestNotes("");
        setWorkers([
          {
            employeeId: currentEmployee?.id ? String(currentEmployee.id) : "",
            shiftCode: "DS",
            rosterType: "5:2",
            category: "after_mandatory_ot",
          },
        ]);
        setLineItems([
          {
            lineLabel: "Overtime Pemasangan & Dismounting Tyre OTR",
            targetUnit: "1 Unit HD",
            estimatedMinutes: 120,
            plannedPoints: 10,
          },
        ]);
        setSubmittedSummary(null);
        router.push("/mobile/overtime?tab=approval&submitted=1");
        router.refresh();
      } else {
        const res = await createOvertimeCommandLetterAction({
          title: title.trim(),
          workDate,
          plannedStartAt: startDateTime,
          plannedEndAt: endDateTime,
          requestedByEmployeeId: Number(requesterEmployeeId) || currentEmployee?.id || null,
          requestNotes: requestNotes.trim(),
          workerParticipants: validWorkers.map((w) => ({
            employeeId: Number(w.employeeId),
            shiftCode: w.shiftCode,
            rosterType: w.rosterType,
            category: w.category,
          })),
          lineItems: validItems.map((item) => ({
            lineLabel: item.lineLabel.trim(),
            targetUnit: item.targetUnit.trim(),
            estimatedMinutes: Number(item.estimatedMinutes) || 60,
            plannedPoints: Number(item.plannedPoints) || 0,
          })),
          leaderEmployeeId: leaderEmployeeId ? Number(leaderEmployeeId) : null,
          leaderName: leaderName || null,
          superiorEmployeeId: superiorEmployeeId ? Number(superiorEmployeeId) : null,
          superiorName: superiorName || null,
        });

        if (!res.success) {
          toast.error((res as any).error || "Gagal membuat SPL.");
          return;
        }

        toast.success("Surat Perintah Lembur (SPL) berhasil diajukan!");
        setTitle("");
        setRequestNotes("");
        setWorkers([
          {
            employeeId: currentEmployee?.id ? String(currentEmployee.id) : "",
            shiftCode: "DS",
            rosterType: "5:2",
            category: "after_mandatory_ot",
          },
        ]);
        setLineItems([
          {
            lineLabel: "Overtime Pemasangan & Dismounting Tyre OTR",
            targetUnit: "1 Unit HD",
            estimatedMinutes: 120,
            plannedPoints: 10,
          },
        ]);
        setSubmittedSummary(null);
        router.push("/mobile/overtime?tab=approval&submitted=1");
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Terjadi kesalahan saat mengajukan SPL.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedSummary) {
    return (
      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm border border-slate-100 text-slate-900">
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-600" />
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
              SPL Berhasil Diajukan
            </p>
            <p className="mt-1 text-sm font-semibold">
              Dokumen telah diteruskan ke alur verifikasi & approval atasan.
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl bg-slate-50 p-4 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nomor SPL</p>
            <p className="font-bold text-[#003461] text-sm">{submittedSummary.splNumber}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Judul Lembur</p>
            <p className="font-semibold text-slate-800">{submittedSummary.title}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Peserta</p>
              <p className="font-semibold text-slate-800">{submittedSummary.workerCount} Karyawan</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Durasi</p>
              <p className="font-semibold text-slate-800">{submittedSummary.totalMinutes} Menit</p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => {
            setSubmittedSummary(null);
            setTitle("");
            setRequestNotes("");
          }}
          className="w-full h-12 rounded-xl bg-[#003461] text-white hover:bg-[#00274a] font-bold text-xs"
        >
          Buat SPL Baru
        </Button>
      </section>
    );
  }

  const revertedStep = (doc?.approvals || []).find(
    (a: any) => (a.status || '').toLowerCase() === 'reverted' || (a.status || '').toLowerCase() === 'needs_revision'
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {isApprovedDoc ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-950">SPL Telah Disetujui Lengkap (Approved)</p>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                Surat Perintah Lembur <strong>{doc?.splNumber || (editSplId ? `#${editSplId}` : '')}</strong> telah disetujui dan berstatus terkunci. Dokumen tidak dapat diubah kembali.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button
              type="button"
              onClick={() => setIsPdfOpen(true)}
              className="h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <FileText className="size-4" />
              Lihat &amp; Unduh PDF Resmi
            </Button>
            {editSplId ? (
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-xl border-emerald-300 text-emerald-900 bg-white hover:bg-emerald-50 font-bold text-xs"
              >
                <a href={`/mobile/overtime?tab=apply&extend=${editSplId}`}>
                  <Plus className="size-4 mr-1.5" /> Ajukan Extension SPL
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {parentSplId ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-blue-300 bg-blue-50 p-3.5 text-blue-900 text-xs shadow-xs">
          <RotateCcw className="size-4 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Mode Extension SPL #{parentSplId}</p>
            <p className="text-[11px] text-blue-800 mt-0.5">
              Anda sedang membuat perpanjangan pengajuan SPL berdasarkan rujukan SPL #{parentSplId}.
            </p>
          </div>
        </div>
      ) : null}

      {/* ── 1. Details & Request Profile ── */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-teal-100 text-teal-800 font-bold text-[10px]">
              F.HC.SPL
            </span>
            <p className="text-xs font-bold text-slate-800">
              {editSplId ? `Revisi Formulir SPL #${editSplId}` : '1. Header & Jadwal Lembur'}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setIsPdfOpen(true)}
            size="sm"
            variant="outline"
            className={cn(
              "h-8 px-3 rounded-xl text-xs font-bold gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer",
              editSplId
                ? "border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900 ring-2 ring-amber-200/70"
                : "border-sky-200 bg-[#eaf4fb] hover:bg-sky-100 text-[#003f78]"
            )}
          >
            <Eye className="size-3.5" />
            Preview
          </Button>
        </div>

        <div className="space-y-3 text-xs">
          <Label className="block space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700">Judul / Keperluan Lembur *</span>
            <Input
              required
              placeholder="Contoh: Overtime Pemasangan Tyre OTR Unit HD-785..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 rounded-xl bg-slate-50/70 border-slate-200 text-xs font-medium"
            />
          </Label>

          <div className="grid grid-cols-2 gap-3">
            <Label className="block space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700">Tanggal Pekerjaan *</span>
              <Input
                type="date"
                required
                value={workDate}
                onChange={(e) => {
                  setWorkDate(e.target.value);
                  setPlannedStartDate(e.target.value);
                  setPlannedEndDate(e.target.value);
                }}
                className="h-10 rounded-xl bg-slate-50/70 border-slate-200 text-xs"
              />
            </Label>

            <Label className="block space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700">Departemen</span>
              <Input
                value={requesterDepartment}
                onChange={(e) => setRequesterDepartment(e.target.value)}
                placeholder="Central Services"
                className="h-10 rounded-xl bg-slate-50/70 border-slate-200 text-xs"
              />
            </Label>
          </div>

          <Label className="block space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700">Pemohon (Requester)</span>
            <SearchableSelect
              label="Pemohon"
              placeholder="PILIH PEMOHON..."
              value={requesterEmployeeId}
              onValueChange={(val) => {
                setRequesterEmployeeId(val);
                applyHierarchy(val);
              }}
              options={employeeOptions}
              widthClassName="w-full"
            />
          </Label>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700">Mulai (Start) *</span>
              <div className="flex gap-1">
                <Input
                  type="date"
                  value={plannedStartDate}
                  onChange={(e) => setPlannedStartDate(e.target.value)}
                  className="h-9 rounded-lg bg-slate-50/70 border-slate-200 text-[11px] w-3/5 px-1.5"
                />
                <Input
                  type="time"
                  value={plannedStartTime}
                  onChange={(e) => setPlannedStartTime(e.target.value)}
                  className="h-9 rounded-lg bg-slate-50/70 border-slate-200 text-[11px] w-2/5 px-1.5 font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700">Selesai (End) *</span>
              <div className="flex gap-1">
                <Input
                  type="date"
                  value={plannedEndDate}
                  onChange={(e) => setPlannedEndDate(e.target.value)}
                  className="h-9 rounded-lg bg-slate-50/70 border-slate-200 text-[11px] w-3/5 px-1.5"
                />
                <Input
                  type="time"
                  value={plannedEndTime}
                  onChange={(e) => setPlannedEndTime(e.target.value)}
                  className="h-9 rounded-lg bg-slate-50/70 border-slate-200 text-[11px] w-2/5 px-1.5 font-semibold"
                />
              </div>
            </div>
          </div>

          <Label className="block space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700">Alasan Lembur & Instruksi</span>
            <Textarea
              rows={3}
              placeholder="Instruksi operasional, area kerja, SPK terkait, atau alasan lembur..."
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              className="rounded-xl bg-slate-50/70 border-slate-200 text-xs p-3"
            />
          </Label>
        </div>
      </section>

      {/* ── 2. Section A: Workers (Peserta Lembur) ── */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-blue-600"></span>
            <p className="text-xs font-bold text-slate-800">A. Workers (Peserta Lembur)</p>
          </div>
          <Badge className="bg-blue-50 text-blue-700 border-0 font-bold text-[10px]">
            {workers.filter((w) => Boolean(w.employeeId)).length} Peserta
          </Badge>
        </div>

        <div className="space-y-3">
          {workers.map((worker, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2.5 relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600">Peserta #{idx + 1}</span>
                {workers.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeWorker(idx)}
                    className="size-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>

              <div>
                <SearchableSelect
                  label="Worker"
                  placeholder="PILIH WORKER..."
                  value={worker.employeeId}
                  onValueChange={(val) => updateWorker(idx, "employeeId", val)}
                  options={employeeOptions}
                  widthClassName="w-full"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">Shift</span>
                  <select
                    value={worker.shiftCode}
                    onChange={(e) => updateWorker(idx, "shiftCode", e.target.value)}
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium"
                  >
                    <option value="DS">DS (Day)</option>
                    <option value="NS">NS (Night)</option>
                    <option value="ALL">ALL</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">Roster</span>
                  <select
                    value={worker.rosterType}
                    onChange={(e) => updateWorker(idx, "rosterType", e.target.value)}
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium"
                  >
                    <option value="5:2">5:2</option>
                    <option value="6:1">6:1</option>
                    <option value="10:2">10:2</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">Kategori</span>
                  <select
                    value={worker.category}
                    onChange={(e) => updateWorker(idx, "category", e.target.value)}
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-1.5 text-[10px] font-medium"
                  >
                    <option value="after_mandatory_ot">Mandatory OT</option>
                    <option value="off_day_ot">Off Day OT</option>
                    <option value="emergency_callout">Emergency</option>
                  </select>
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addWorkerRow}
            className="w-full h-9 rounded-xl border-dashed border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 text-xs font-semibold gap-1.5"
          >
            <UserPlus className="size-3.5 text-slate-500" /> Tambah Peserta Lembur
          </Button>
        </div>
      </section>

      {/* ── 3. Section B: Line Items (Aktivitas Pekerjaan) ── */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-600"></span>
            <p className="text-xs font-bold text-slate-800">B. Line Items (Aktivitas Pekerjaan)</p>
          </div>
          <Badge className="bg-emerald-50 text-emerald-700 border-0 font-bold text-[10px]">
            {lineItems.length} Aktivitas • {totalEstimatedMinutes} Mnt
          </Badge>
        </div>



        <div className="space-y-3">
          {lineItems.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600">Aktivitas #{idx + 1}</span>
                {lineItems.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeLineItem(idx)}
                    className="size-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1">
                  Uraian Aktivitas Pekerjaan *
                </span>
                <Input
                  required
                  placeholder="Nama aktivitas pekerjaan..."
                  value={item.lineLabel}
                  onChange={(e) => updateLineItem(idx, "lineLabel", e.target.value)}
                  className="h-9 rounded-lg bg-white border-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">Target / Unit</span>
                  <Input
                    placeholder="e.g. 1 Unit HD"
                    value={item.targetUnit}
                    onChange={(e) => updateLineItem(idx, "targetUnit", e.target.value)}
                    className="h-8 rounded-lg bg-white border-slate-200 text-[11px]"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">Durasi (Mnt)</span>
                  <Input
                    type="number"
                    min={15}
                    value={item.estimatedMinutes}
                    onChange={(e) => updateLineItem(idx, "estimatedMinutes", Number(e.target.value))}
                    className="h-8 rounded-lg bg-white border-slate-200 text-[11px] font-semibold text-center"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">Poin</span>
                  <Input
                    type="number"
                    min={0}
                    value={item.plannedPoints}
                    onChange={(e) => updateLineItem(idx, "plannedPoints", Number(e.target.value))}
                    className="h-8 rounded-lg bg-white border-slate-200 text-[11px] font-bold text-center"
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLineItem}
            className="w-full h-9 rounded-xl border-dashed border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 text-xs font-semibold gap-1.5"
          >
            <Plus className="size-3.5 text-slate-500" /> Tambah Baris Aktivitas
          </Button>
        </div>
      </section>

      {/* ── 4. Section C: Signatories & Verification Matrix ── */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-600"></span>
            <p className="text-xs font-bold text-slate-800">
              C. Penandatangan Approval (Signatories)
            </p>
          </div>
          <Badge className="bg-amber-50 text-amber-700 border-0 font-bold text-[10px]">
            2-Tier Verification
          </Badge>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-700">
                Leader / Supervisor (Tahap 1)
              </span>
              {isLeaderLocked ? (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  SUDAH DISETUJUI (TERKUNCI)
                </span>
              ) : null}
            </div>
            <SearchableSelect
              label="Leader"
              placeholder="PILIH LEADER..."
              value={leaderEmployeeId}
              onValueChange={(val) => {
                if (isLeaderLocked) return;
                setLeaderEmployeeId(val);
                const emp = employees.find((e) => String(e.id) === val);
                setLeaderName(emp?.name || "");
              }}
              options={employeeOptions}
              widthClassName="w-full"
              disabled={isLeaderLocked}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-700">
                Superior / Section Head (Tahap 2)
              </span>
              {isSuperiorLocked ? (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  SUDAH DISETUJUI (TERKUNCI)
                </span>
              ) : null}
            </div>
            <SearchableSelect
              label="Section Head"
              placeholder="PILIH SECTION HEAD..."
              value={superiorEmployeeId}
              onValueChange={(val) => {
                if (isSuperiorLocked) return;
                setSuperiorEmployeeId(val);
                const emp = employees.find((e) => String(e.id) === val);
                setSuperiorName(emp?.name || "");
              }}
              options={employeeOptions}
              widthClassName="w-full"
              disabled={isSuperiorLocked}
            />
          </div>
        </div>
      </section>

      {/* ── Bottom Sticky Action Bar ── */}
      <div className="sticky bottom-20 z-10 rounded-2xl bg-white/95 p-3 shadow-lg border border-slate-200/80 backdrop-blur">
        {isApprovedDoc ? (
          <Button
            type="button"
            onClick={() => setIsPdfOpen(true)}
            className="w-full h-12 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <FileText className="size-4" />
            LIHAT &amp; UNDUH DOKUMEN PDF (RESMI)
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className="w-full h-12 rounded-xl bg-[#003461] hover:bg-[#00274a] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md"
          >
            <Check className="size-4" />
            {isSubmitting
              ? "Menyimpan & Mengajukan..."
              : editSplId
                ? "SIMPAN & AJUKAN ULANG REVISI SPL"
                : parentSplId
                  ? "AJUKAN EXTENSION SPL"
                  : "AJUKAN SURAT PERINTAH LEMBUR (SPL)"}
          </Button>
        )}
      </div>

      {/* ── Official PDF Preview Modal Dialog (Parity with Official Letterhead) ── */}
      <Dialog open={isPdfOpen} onOpenChange={setIsPdfOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[430px] w-full sm:max-w-[430px] mx-auto h-[92dvh] sm:h-[86dvh] max-h-[92dvh] flex flex-col p-0 overflow-hidden bg-slate-100 border border-slate-200 shadow-2xl rounded-t-2xl sm:rounded-2xl z-50"
        >
          {/* Top Viewer Navbar */}
          <div className="bg-white px-3 sm:px-4 py-2.5 flex items-center justify-between border-b border-slate-200 shrink-0 select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-lg bg-blue-50 text-[#003461] border border-blue-100 flex items-center justify-center shrink-0">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-slate-900 truncate">
                  Dokumen Surat Perintah Lembur • <span className="text-[#003461]">{doc?.splNumber || (doc?.id ? 'SPL-DRAFT-REVISI' : 'SPL-DRAFT')}</span>
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {requesterName} • {workDate ? fmtDate(workDate) : '—'} • {requesterDepartment || 'Central Services'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                <span className="text-[10px] font-mono font-bold text-slate-700 px-1.5 py-0.5">
                  1/1
                </span>
              </div>

              <Button
                size="sm"
                variant="outline"
                disabled={isDownloadingPdf}
                className="h-7 px-2 text-[10px] font-semibold gap-1 rounded-lg bg-[#e2e8f0] border-slate-200 text-slate-800 cursor-pointer"
                onClick={handleDownloadPdf}
              >
                <Download className="size-3" />
                <span>{isDownloadingPdf ? 'Unduh...' : 'UNDUH PDF'}</span>
              </Button>

              <button
                type="button"
                onClick={() => setIsPdfOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer ml-0.5"
                aria-label="Tutup Preview"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Body Viewer */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 bg-slate-100 space-y-3 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
            {/* Zoom Action Bar */}
            <div className="flex flex-col gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-xs rounded-xl border border-slate-200 shadow-2xs max-w-lg mx-auto">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="size-3.5 text-[#003461]" /> Preview Dokumen Surat / PDF
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
                    className="h-7 w-7 p-0 text-xs font-extrabold text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                    title="Zoom Out"
                  >
                    -
                  </Button>
                  <span className="text-[11px] font-mono font-bold text-slate-600 px-1 min-w-10 text-center">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewZoom((z) => Math.min(3.5, Number((z + 0.15).toFixed(2))))}
                    className="h-7 w-7 p-0 text-xs font-extrabold text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                    title="Zoom In"
                  >
                    +
                  </Button>
                  {(previewZoom !== 1.0 || panOffset.x !== 0 || panOffset.y !== 0) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetZoomAndPan}
                      className="h-7 px-2 text-[10px] font-bold text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="size-3" />
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* Presets & Drag hint */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                <div className="flex items-center gap-1">
                  {[
                    { label: "Fit", zoom: 1.0 },
                    { label: "150%", zoom: 1.5 },
                    { label: "200%", zoom: 2.0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setPreviewZoom(preset.zoom)}
                      className={cn(
                        "px-2 py-0.5 rounded-md font-semibold text-[10px] transition-colors cursor-pointer",
                        Math.abs(previewZoom - preset.zoom) < 0.05
                          ? "bg-[#003461] text-white"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-[9.5px]">
                  <Move className="size-3 shrink-0" />
                  <span>Geser / drag untuk navigasi</span>
                </div>
              </div>
            </div>

            {/* PDF Letterhead Document Preview Container with Pan, Drag, Pinch */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              onWheel={handleWheel}
              className={cn(
                "flex justify-center items-start overflow-hidden p-1 w-full max-w-full touch-none select-none relative",
                isDragging ? "cursor-grabbing" : "cursor-grab"
              )}
            >
              <div
                ref={pdfPreviewRef}
                id="mobile-spl-preview-sheet"
                className="relative mx-auto shrink-0 bg-white shadow-md border border-slate-200 rounded-sm origin-top transition-transform duration-100 w-[210mm] min-h-[297mm] will-change-transform"
                style={{
                  backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)',
                  backgroundSize: '100% 100%',
                  transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${0.44 * previewZoom})`,
                  marginBottom: `${-160 + (previewZoom - 1.0) * 125}mm`,
                }}
              >
                <div
                  className="relative z-10 text-[8pt] sm:text-[8.5pt] font-sans leading-tight text-black"
                  style={{
                    color: 'black',
                    paddingTop: '38mm',
                    paddingBottom: '35mm',
                    paddingLeft: '20mm',
                    paddingRight: '20mm',
                    minHeight: '297mm',
                  }}
                >
                {/* Header Document */}
                <div className="text-center mb-3">
                  <h1 className="font-bold text-[11pt] uppercase text-black leading-tight">
                    SURAT PERINTAH LEMBUR (SPL)
                  </h1>
                  <p className="font-semibold text-[8pt] text-slate-700 uppercase tracking-wide">
                    PT CHITRA PARATAMA • HUMAN CAPITAL
                  </p>
                </div>

                {/* Section 1: Details & Request Profile */}
                <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8pt]">
                  <tbody>
                    <tr>
                      <td colSpan={4} className="font-bold bg-slate-50 text-black py-0.5">Details &amp; Request Profile</td>
                    </tr>
                    <tr>
                      <td className="w-1/4 font-bold bg-slate-50 text-black">SPL Number</td>
                      <td className="w-1/4 font-mono font-semibold text-black">{doc?.splNumber || (doc?.id ? 'SPL-DRAFT-REVISI' : 'SPL-DRAFT')}</td>
                      <td className="w-1/4 font-bold bg-slate-50 text-black">Work Date</td>
                      <td className="w-1/4 font-semibold text-black">{workDate ? fmtDate(workDate) : '—'}</td>
                    </tr>
                    <tr>
                      <td className="font-bold bg-slate-50 text-black">Title / Keperluan</td>
                      <td colSpan={3} className="font-semibold text-black">{title || doc?.title || '—'}</td>
                    </tr>
                    <tr>
                      <td className="font-bold bg-slate-50 text-black">Requester Name</td>
                      <td className="text-black">{requesterName}</td>
                      <td className="font-bold bg-slate-50 text-black">Department</td>
                      <td className="text-black">{requesterDepartment || 'Central Services'}</td>
                    </tr>
                    <tr>
                      <td className="font-bold bg-slate-50 text-black">Planned Schedule</td>
                      <td colSpan={3} className="text-black">
                        {plannedStartDate ? fmtDate(plannedStartDate) : ''} ({plannedStartTime} s.d. {plannedEndTime})
                      </td>
                    </tr>
                    {requestNotes ? (
                      <tr>
                        <td className="font-bold bg-slate-50 text-black">Request Notes</td>
                        <td colSpan={3} className="text-black">{requestNotes}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>

                {/* Section 2: Workers */}
                <div className="font-bold mb-1 text-[8pt] text-black">
                  A. Workers ({workers.filter(w => Boolean(w.employeeId)).length} Orang)
                </div>
                <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-center text-[7.5pt] sm:text-[8pt]">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-black">
                      <th className="w-[8%]">#</th>
                      <th className="text-left w-[42%]">Name</th>
                      <th className="w-[15%]">Shift</th>
                      <th className="w-[15%]">Roster</th>
                      <th className="w-[20%]">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.filter(w => Boolean(w.employeeId)).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-2 text-slate-400 italic">Belum ada peserta lembur.</td>
                      </tr>
                    ) : (
                      workers.filter(w => Boolean(w.employeeId)).map((w, idx) => {
                        const emp = employees.find((e) => String(e.id) === w.employeeId);
                        return (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td className="text-left font-semibold text-black">
                              {emp?.name || w.employeeId}
                            </td>
                            <td>{w.shiftCode}</td>
                            <td>{w.rosterType}</td>
                            <td className="capitalize text-[7.5pt] text-slate-800">
                              {w.category.replace(/_/g, ' ')}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Section 3: Line Items */}
                <div className="font-bold mb-1 text-[8pt] text-black">
                  B. Line Items (Aktivitas Pekerjaan)
                </div>
                <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[7.5pt] sm:text-[8pt]">
                  <thead>
                    <tr className="bg-slate-50 text-center font-bold text-black">
                      <th className="w-[8%]">#</th>
                      <th className="text-left w-[40%]">Activity</th>
                      <th className="w-[18%]">Target</th>
                      <th className="w-[14%]">Minutes</th>
                      <th className="w-[20%]">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.filter(item => Boolean(item.lineLabel.trim())).map((item, idx) => (
                      <tr key={idx}>
                        <td className="text-center font-mono">{idx + 1}</td>
                        <td className="font-medium text-black">{item.lineLabel}</td>
                        <td className="text-center font-mono text-black">{item.targetUnit || '—'}</td>
                        <td className="text-center font-mono text-black">{item.estimatedMinutes} m</td>
                        <td className="text-center font-bold font-mono text-black">{item.plannedPoints} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Section 4: Approval Steps */}
                <div className="font-bold mb-1 text-[8pt] text-black">
                  C. Approval Steps
                </div>
                <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-center text-[7.5pt] sm:text-[8pt]">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-black">
                      <th className="w-[6%]">#</th>
                      <th className="text-left w-[20%]">Tahap</th>
                      <th className="text-left w-[22%]">Approver</th>
                      <th className="w-[14%]">Status</th>
                      <th className="w-[16%]">Waktu</th>
                      <th className="text-left w-[22%]">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(doc?.approvals && doc.approvals.length > 0) ? (
                      doc.approvals.map((step: any, idx: number) => (
                        <tr key={`spl-preview-step-${step.id || step.stepOrder || idx}`}>
                          <td>{step.stepOrder || idx + 1}</td>
                          <td className="text-left">{step.stepLabel || (idx === 0 ? 'Leader / Supervisor' : 'Section Head')}</td>
                          <td className="text-left">{step.approverName || '-'}</td>
                          <td className="capitalize font-semibold text-black">{step.status || 'pending'}</td>
                          <td className="text-[7pt]">{fmtDt(step.signedAt)}</td>
                          <td className="text-left text-[7pt] text-slate-600">{step.remarks || '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <>
                        <tr>
                          <td>1</td>
                          <td className="text-left">Karyawan Sign</td>
                          <td className="text-left">{requesterName}</td>
                          <td className="capitalize font-semibold text-black">Draft</td>
                          <td className="text-[7pt]">—</td>
                          <td className="text-left text-[7pt] text-slate-600">—</td>
                        </tr>
                        <tr>
                          <td>2</td>
                          <td className="text-left">Leader / Supervisor</td>
                          <td className="text-left">{currentLeaderName || '-'}</td>
                          <td className="capitalize font-semibold text-black">{existingLeaderApproval?.status || 'Waiting'}</td>
                          <td className="text-[7pt]">{fmtDt(existingLeaderApproval?.signedAt)}</td>
                          <td className="text-left text-[7pt] text-slate-600">{existingLeaderApproval?.remarks || '—'}</td>
                        </tr>
                        <tr>
                          <td>3</td>
                          <td className="text-left">Section Head</td>
                          <td className="text-left">{currentSuperiorName || '-'}</td>
                          <td className="capitalize font-semibold text-black">{existingSuperiorApproval?.status || 'Waiting'}</td>
                          <td className="text-[7pt]">{fmtDt(existingSuperiorApproval?.signedAt)}</td>
                          <td className="text-left text-[7pt] text-slate-600">{existingSuperiorApproval?.remarks || '—'}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>

                {/* Section 5: Signatories Grid */}
                <div className="font-bold mb-2 text-[8pt] text-black">Signatories</div>
                <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                  {/* 1. Serviceman / Requester */}
                  <div className="flex flex-col items-center text-center">
                    <div className="text-[7pt] text-slate-500 font-semibold mb-1">Employee Signature</div>
                    <div className="h-14 w-full flex items-center justify-center my-1">
                      {existingEmployeeApproval?.signatureDataUrl ? (
                        <img src={existingEmployeeApproval.signatureDataUrl} alt="TTD Pemohon" className="max-h-12 max-w-full object-contain" />
                      ) : isEmployeeSigned ? (
                        <svg className="h-10 w-24 text-slate-900" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 26 C22 10, 32 32, 48 18 C62 6, 68 28, 82 14 C89 8, 92 10, 88 18 C82 24, 72 26, 68 22 C58 16, 48 18, 42 22" />
                          <path d="M22 30 C38 32, 60 28, 84 26" />
                        </svg>
                      ) : (
                        <span className="text-slate-400 italic text-[7pt]">(Belum Disetujui)</span>
                      )}
                    </div>
                    <div className="mt-1 border-b border-slate-400 pb-0.5 font-bold text-[8pt] text-slate-900 w-[80%] truncate">
                      {requesterName}
                    </div>
                    <div className="text-[7pt] text-slate-600 font-medium">Serviceman / Pemohon</div>
                    <div className="text-[6.5pt] text-slate-400 mt-0.5">
                      {isEmployeeSigned && doc?.createdAt ? `Waktu Pengajuan: ${fmtDt(doc.createdAt)}` : '—'}
                    </div>
                  </div>

                  {/* 2. Leader / Supervisor */}
                  <div className="flex flex-col items-center text-center">
                    <div className="text-[7pt] text-slate-500 font-semibold mb-1">Leader / Supervisor Signature</div>
                    <div className="h-14 w-full flex items-center justify-center my-1">
                      {existingLeaderApproval?.signatureDataUrl ? (
                        <img src={existingLeaderApproval.signatureDataUrl} alt="TTD Leader" className="max-h-12 max-w-full object-contain" />
                      ) : isLeaderSigned ? (
                        <svg className="h-10 w-24 text-slate-900" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 26 C22 10, 32 32, 48 18 C62 6, 68 28, 82 14 C89 8, 92 10, 88 18 C82 24, 72 26, 68 22 C58 16, 48 18, 42 22" />
                          <path d="M22 30 C38 32, 60 28, 84 26" />
                        </svg>
                      ) : (
                        <span className="text-slate-400 italic text-[7pt]">(Belum Disetujui)</span>
                      )}
                    </div>
                    <div className="mt-1 border-b border-slate-400 pb-0.5 font-bold text-[8pt] text-slate-900 w-[80%] truncate">
                      {currentLeaderName || '—'}
                    </div>
                    <div className="text-[7pt] text-slate-600 font-medium">Leader / Supervisor</div>
                    <div className="text-[6.5pt] text-slate-400 mt-0.5">
                      {isLeaderSigned && existingLeaderApproval?.signedAt ? `Waktu TTD: ${fmtDt(existingLeaderApproval.signedAt)}` : '—'}
                    </div>
                  </div>

                  {/* 3. Section Head / Superior */}
                  <div className="flex flex-col items-center text-center">
                    <div className="text-[7pt] text-slate-500 font-semibold mb-1">Section Head Signature</div>
                    <div className="h-14 w-full flex items-center justify-center my-1">
                      {existingSuperiorApproval?.signatureDataUrl ? (
                        <img src={existingSuperiorApproval.signatureDataUrl} alt="TTD Superior" className="max-h-12 max-w-full object-contain" />
                      ) : isSuperiorSigned ? (
                        <svg className="h-10 w-24 text-slate-900" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 26 C22 10, 32 32, 48 18 C62 6, 68 28, 82 14 C89 8, 92 10, 88 18 C82 24, 72 26, 68 22 C58 16, 48 18, 42 22" />
                          <path d="M22 30 C38 32, 60 28, 84 26" />
                        </svg>
                      ) : (
                        <span className="text-slate-400 italic text-[7pt]">(Belum Disetujui)</span>
                      )}
                    </div>
                    <div className="mt-1 border-b border-slate-400 pb-0.5 font-bold text-[8pt] text-slate-900 w-[80%] truncate">
                      {currentSuperiorName || '—'}
                    </div>
                    <div className="text-[7pt] text-slate-600 font-medium">Section Head</div>
                    <div className="text-[6.5pt] text-slate-400 mt-0.5">
                      {isSuperiorSigned && existingSuperiorApproval?.signedAt ? `Waktu TTD: ${fmtDt(existingSuperiorApproval.signedAt)}` : '—'}
                    </div>
                  </div>
                </div>

                <div className="text-right text-[7pt] text-slate-500 mt-2 font-mono">
                  F.HC.SPL.001.01 • PT Chitra Paratama
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      </Dialog>
    </form>
  );
}
