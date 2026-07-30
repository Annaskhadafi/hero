"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { IconArrowLeft, IconCalendarEvent, IconCheck, IconX, IconVideo, IconMapPin, IconStethoscope, IconLink, IconCopy, IconMail, IconFileText, IconEye, IconSend, IconMailForward, IconRefresh } from "@tabler/icons-react";

import { AdminPageShell } from "@/components/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ScheduleInterviewModal } from "@/components/interview/schedule-interview-modal";
import { InterviewSettingsModal } from "@/components/interview/interview-settings-modal";
import { InterviewFormPdf } from "@/components/interview/interview-form-pdf";

const formatAiRecommendation = (recommendation?: string | null) => {
  const translations: Record<string, string> = {
    Shortlist: "Masuk Shortlist",
    Consider: "Dipertimbangkan",
    "Review Further": "Perlu Review Lanjutan",
    Review: "Perlu Review",
    "Manual Review": "Perlu Review Manual",
    Reject: "Ditolak",
    Hire: "Direkomendasikan Diterima",
    "Strong Match": "Sangat Sesuai",
  };

  return recommendation ? translations[recommendation] || recommendation : null;
};

function AnswerCell({ text }: { text: string | null | undefined }) {
  if (!text) return <span className="text-muted-foreground">-</span>;
  try {
    const parsed = JSON.parse(text);
    return <AnswerValue value={parsed} />;
  } catch {
    return <span>{text}</span>;
  }
}

function AnswerValue({ value }: { value: any }): React.ReactNode {
  if (value === null || value === undefined) return <span className="text-muted-foreground">-</span>;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return <span>{String(value)}</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">-</span>;
    if (value.every((v) => typeof v === "object" && v !== null && !Array.isArray(v))) {
      const keys = Array.from(new Set(value.flatMap((v) => Object.keys(v))));
      return (
        <table className="w-full text-xs border border-border/40 rounded">
          <thead>
            <tr className="bg-muted/40">
              {keys.map((k) => (
                <th key={k} className="px-2 py-1 text-left font-medium text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {value.map((item, i) => (
              <tr key={i} className="border-t border-border/30">
                {keys.map((k) => (
                  <td key={k} className="px-2 py-1">{item[k] != null ? String(item[k]) : "-"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    return <span>{value.map((v: any) => typeof v === "object" ? JSON.stringify(v) : String(v)).join(", ") || "-"}</span>;
  }
  if (typeof value === "object") {
    return (
      <table className="w-full text-xs">
        <tbody>
          {Object.entries(value).map(([k, v]) => (
            <tr key={k} className="border-b border-border/30 last:border-0">
              <td className="py-1 pr-3 font-medium text-muted-foreground whitespace-nowrap align-top capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</td>
              <td className="py-1"><AnswerValue value={v} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return <span>{String(value)}</span>;
}

function ApplicationFormAnswer({ text }: { text: string | null | undefined }) {
  if (!text) return <span className="text-muted-foreground">-</span>;
  try {
    const parsed = JSON.parse(text);
    return (
      <div className="rounded-lg border bg-muted/20 p-3 text-sm space-y-2">
        {Object.entries(parsed).map(([key, value]) => (
          <div key={key} className="grid grid-cols-[140px_1fr] gap-2">
            <span className="text-xs font-medium text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
            <span className="text-xs text-foreground"><AnswerValue value={value} /></span>
          </div>
        ))}
      </div>
    );
  } catch {
    return <span className="text-xs">{text}</span>;
  }
}

import { scheduleCandidateInterview, updateInterviewStatus, previewInterviewEmail } from "@/app/actions/interviews";
import { scheduleCandidateMcu, recordMcuResult, uploadMcuResultFile, previewMcuEmail } from "@/app/actions/mcu";
import { generateOnboardingToken } from "@/app/actions/onboarding";
import { hireAndCreateEmployee, getCvDownloadUrl, createCandidatePanelEvaluation, updateCandidate, resendEmailFromLog } from "@/app/actions/recruitment";
import { resendTestAssignmentEmail } from "@/app/actions/recruitment-tests";
import { getActiveMcuClinics } from "@/app/actions/hc-mcu-clinics";
import { saveOffering, sendOfferingEmail, respondToOffering } from "@/app/actions/offering";

const MCU_SIGNERS = [
  { name: "Muhammad Iqbal", title: "HR-GA Supervisor", signatureUrl: "/ttd Muhammad Iqbal.png" },
  { name: "Adila Tri Arizona", title: "HR Recruitment & GA", signatureUrl: "/ttd Adila Tri Arizona.png" },
  { name: "Kesuma Bagaskara", title: "HR Operation & IR", signatureUrl: "/ttd Kesuma Bagaskara.png" },
  { name: "Rendra Rachman", title: "Human Capital Manager", signatureUrl: "" },
];

export function CandidateDetailClientPage({ candidate, interviews, mcuRecords, emailLogs = [], testResults = [], panelEvaluations = [], offering = null }: { candidate: any, interviews: any[], mcuRecords: any[], emailLogs?: any[], testResults?: any[], panelEvaluations?: any[], offering?: any }) {
  const router = useRouter();
  const aiRadarData = Array.isArray(candidate.aiDetails?.breakdown)
    ? candidate.aiDetails.breakdown.map((item: any) => ({
        criterion: String(item?.criterion || "Kriteria"),
        score: Math.max(0, Math.min(100, Number(item?.score) || 0)),
        weight: Number(item?.weight) || 0,
      }))
    : [];
  const [appOrigin, setAppOrigin] = useState("");
  const [onboardingToken, setOnboardingToken] = useState<string | null>(candidate.onboardingToken ?? null);
  
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isScheduleStageModalOpen, setIsScheduleStageModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [scheduleStageName, setScheduleStageName] = useState("Interview 1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    scheduledAtDate: "",
    scheduledAtTime: "",
    durationMinutes: 60,
    interviewType: "Online",
    locationOrLink: "",
    interviewerName: "",
    notes: ""
  });

  useEffect(() => {
    setAppOrigin(window.location.origin);
  }, []);

  const [isHireOpen, setIsHireOpen] = useState(false);
  const [isHiring, setIsHiring] = useState(false);
  const [hireStartDate, setHireStartDate] = useState("");
  const [cvViewerUrl, setCvViewerUrl] = useState<string | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [offeringPdfUrl, setOfferingPdfUrl] = useState<string | null>(null);
  const [offeringPdfLoading, setOfferingPdfLoading] = useState(false);
  const [cvLoading, setCvLoading] = useState(false);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [emailPreviewData, setEmailPreviewData] = useState<{ subject: string; html?: string | null; text?: string | null }>({ subject: "", html: "", text: "" });
  const [emailPreviewLoading, setEmailPreviewLoading] = useState(false);
  const [selectedTestResult, setSelectedTestResult] = useState<any>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);
  const [resendingLogId, setResendingLogId] = useState<number | null>(null);
  const [resendingTestId, setResendingTestId] = useState<number | null>(null);

  const handleResendEmailLog = async (logId: number) => {
    setResendingLogId(logId);
    try {
      const res = await resendEmailFromLog(logId);
      if (res.success) {
        toast.success(res.message || "Email berhasil dikirim ulang");
        router.refresh();
      } else {
        toast.error(res.error || "Gagal mengirim ulang email");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat mengirim ulang email");
    } finally {
      setResendingLogId(null);
    }
  };

  const handleResendTestEmail = async (assignmentId: number) => {
    setResendingTestId(assignmentId);
    try {
      const res = await resendTestAssignmentEmail(assignmentId);
      if (res.success) {
        toast.success(res.message || "Email tes berhasil dikirim ulang");
        router.refresh();
      } else {
        toast.error(res.error || "Gagal mengirim ulang email tes");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat mengirim ulang email tes");
    } finally {
      setResendingTestId(null);
    }
  };

  // Edit Candidate
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: candidate.fullName || "",
    email: candidate.email || "",
    phone: candidate.phone || "",
    dateOfBirth: candidate.dateOfBirth ? new Date(candidate.dateOfBirth).toISOString().split("T")[0] : "",
    gender: candidate.gender || "",
    address: candidate.address || "",
    source: candidate.source || "",
    nikKtp: candidate.nikKtp || "",
    npwpNumber: candidate.npwpNumber || "",
    bpjsKesehatan: candidate.bpjsKesehatan || "",
    bpjsKetenagakerjaan: candidate.bpjsKetenagakerjaan || "",
    bankName: candidate.bankName || "",
    bankAccountNumber: candidate.bankAccountNumber || "",
    emergencyContactName: candidate.emergencyContactName || "",
    emergencyContactPhone: candidate.emergencyContactPhone || "",
    notes: candidate.notes || "",
    rating: candidate.rating || 0,
  });

  const [isPanelSubmitting, setIsPanelSubmitting] = useState(false);
  const [panelForm, setPanelForm] = useState({
    interviewId: "",
    panelistName: "",
    panelistRole: "",
    technicalScore: 3,
    communicationScore: 3,
    cultureScore: 3,
    problemSolvingScore: 3,
    attitudeScore: 3,
    overallRecommendation: "Review",
    strengths: "",
    concerns: "",
    notes: "",
  });

  const [mcuResultDialog, setMcuResultDialog] = useState<{ open: boolean; mcuId: number | null; result: "Fit" | "Unfit"; notes: string; file: File | null; resultBy: string }>({
    open: false, mcuId: null, result: "Fit", notes: "", file: null, resultBy: "",
  });
  const [isMcuResultSubmitting, setIsMcuResultSubmitting] = useState(false);

  const handleViewCv = async () => {
    if (!candidate.cvUrl) return;
    setCvLoading(true);
    try {
      const url = await getCvDownloadUrl(candidate.cvUrl);
      setCvViewerUrl(url);
    } catch {
      toast.error("Failed to load CV");
    } finally {
      setCvLoading(false);
    }
  };

  const handleViewOfferingPdf = async () => {
    if (!offering?.pdfUrl) return;
    setOfferingPdfLoading(true);
    try {
      const url = await getCvDownloadUrl(offering.pdfUrl);
      setOfferingPdfUrl(url);
    } catch {
      toast.error("Failed to load offering PDF");
    } finally {
      setOfferingPdfLoading(false);
    }
  };

  const handlePreviewInterview = async () => {
    if (!scheduleForm.scheduledAtDate || !scheduleForm.scheduledAtTime) { toast.error("Isi tanggal dan waktu dulu"); return; }
    setEmailPreviewLoading(true);
    try {
      const d = new Date(`${scheduleForm.scheduledAtDate}T${scheduleForm.scheduledAtTime}`);
      const { format } = await import("date-fns");
      const preview = await previewInterviewEmail({
        candidateName: candidate.fullName,
        jobTitle: candidate.jobTitle || "Posisi",
        scheduledDate: format(d, "EEEE, dd MMMM yyyy"),
        scheduledTime: format(d, "HH:mm"),
        interviewType: scheduleForm.interviewType,
        locationOrLink: scheduleForm.locationOrLink,
        interviewerName: scheduleForm.interviewerName,
        durationMinutes: scheduleForm.durationMinutes,
      });
      setEmailPreviewData(preview);
      setEmailPreviewOpen(true);
    } catch (e: any) { toast.error("Gagal preview"); }
    finally { setEmailPreviewLoading(false); }
  };

  const handlePreviewMcu = async () => {
    if (!mcuForm.scheduledDate || !mcuForm.klinikName) { toast.error("Isi klinik dan tanggal dulu"); return; }
    setEmailPreviewLoading(true);
    try {
      const d = new Date(mcuForm.scheduledDate);
      const { format } = await import("date-fns");
      const preview = await previewMcuEmail({
        candidateName: candidate.fullName,
        jobTitle: candidate.jobTitle || "Posisi",
        klinikName: mcuForm.klinikName,
        paketMcu: mcuForm.paketMcu || "-",
        scheduledDate: format(d, "dd MMMM yyyy"),
      });
      setEmailPreviewData(preview);
      setEmailPreviewOpen(true);
    } catch (e: any) { toast.error("Gagal preview"); }
    finally { setEmailPreviewLoading(false); }
  };

  const handleHire = async () => {
    setIsHiring(true);
    try {
      const result = await hireAndCreateEmployee(candidate.id, hireStartDate);
      toast.success(`Hired! Employee ID: ${result.employeeId}`);
      setIsHireOpen(false);
      setHireStartDate("");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to hire candidate");
    } finally {
      setIsHiring(false);
    }
  };

  const [clinics, setClinics] = useState<Array<{ id: number; name: string; email: string; paketOptions: string[] | null }>>([]);
  const [selectedPaketOptions, setSelectedPaketOptions] = useState<string[]>([]);
  useEffect(() => {
    getActiveMcuClinics().then(setClinics).catch(() => {});
  }, []);

  const [isMcuScheduleOpen, setIsMcuScheduleOpen] = useState(false);
  const [isMcuSubmitting, setIsMcuSubmitting] = useState(false);
  const [mcuForm, setMcuForm] = useState({
    clinicId: "",
    klinikName: "",
    klinikEmail: "",
    paketMcu: "",
    scheduledDate: "",
    signatoryName: MCU_SIGNERS[0].name,
    signatoryTitle: MCU_SIGNERS[0].title,
    signatureUrl: MCU_SIGNERS[0].signatureUrl,
  });

  // Offering state
  const [offeringForm, setOfferingForm] = useState({
    position: offering?.position || candidate.jobTitle || "",
    directSupervisor: offering?.directSupervisor || "",
    salary: offering?.salary || "",
    contractDurationMonths: offering?.contractDurationMonths || 12,
    startDate: offering?.startDate || "",
    outpatientBenefit: offering?.outpatientBenefit || "Penusahaan memberikan bantuan biaya pengobatan rawat jalan sebesar Rp 3.500.000,-",
    inpatientBenefit: offering?.inpatientBenefit || "Penusahaan akan memberikan biaya penggatan/Pengobatan sepengetahuan bagi karyawan beserta istri & 3 (tiga) anak yang sah secara hukum, apabila telah ditanggung menjadi tanggungan karyawan tetap",
    maternityBenefit: offering?.maternityBenefit || "Penusahaan akan memberikan bantuan sebesar Rp 8.000.000,-. Dan apabila dilakukan operasi caesar perusahaan akan mengganti biaya peralatan sebesar Rp 15.000.000, setelah ditanggung menjadi tanggungan karyawan tetap",
    accidentInsurance: offering?.accidentInsurance || "Penusahaan akan menanggung premi asuransi sepengetahuannya",
    bpjsEmployment: offering?.bpjsEmployment || "Wajib berdasarkan Peraturan Pemerintah",
    bpjsHealth: offering?.bpjsHealth || "Wajib berdasarkan Peraturan Pemerintah",
    thr: offering?.thr || "Penusahaan akan memberikan THR setahun upah, dan apabila Saudara belum mencapai masa kerja 1 (satu) tahun tetapi sudah lebih dari 1 (satu) bulan, maka akan dihitung secara proporsional.",
    otherTerms: offering?.otherTerms || "Ketentuan-ketentuan lain yang tidak secara khusus diatur dalam penawaran diatas (Biaya Perjalanan Dinas, Bantuan dan fasilitas lain dan perusahaan) akan tunduk pada peraturan/perjanjian karyawan yang berlaku. Pokok-pokok Musyawarah serta tetapkan pelaksanaan perusahaan",
    signatoryName: offering?.signatoryName || MCU_SIGNERS[0].name,
    signatoryTitle: offering?.signatoryTitle || MCU_SIGNERS[0].title,
    signatureUrl: offering?.signatureUrl || MCU_SIGNERS[0].signatureUrl,
    notes: offering?.notes || "",
  });
  const [isOfferingSaving, setIsOfferingSaving] = useState(false);
  const [isOfferingSending, setIsOfferingSending] = useState(false);

  const handleSaveOffering = async () => {
    setIsOfferingSaving(true);
    try {
      await saveOffering(candidate.id, offeringForm);
      toast.success("Offering data saved.");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to save offering.");
    } finally {
      setIsOfferingSaving(false);
    }
  };

  const handleSendOffering = async () => {
    setIsOfferingSending(true);
    try {
      await saveOffering(candidate.id, offeringForm);
      await sendOfferingEmail(candidate.id);
      toast.success("Offering email sent with PDF attachment.");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to send offering email.");
    } finally {
      setIsOfferingSending(false);
    }
  };

  const handleOfferingResponse = async (response: "Accepted" | "Rejected") => {
    try {
      await respondToOffering(candidate.id, response);
      toast.success(`Offer ${response.toLowerCase()}.`);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update response.");
    }
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleForm.scheduledAtDate || !scheduleForm.scheduledAtTime || !scheduleForm.locationOrLink || !scheduleForm.interviewerName) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduledAt = new Date(`${scheduleForm.scheduledAtDate}T${scheduleForm.scheduledAtTime}`);
      
      await scheduleCandidateInterview(candidate.id, {
        scheduledAt,
        durationMinutes: scheduleForm.durationMinutes,
        interviewType: scheduleForm.interviewType,
        locationOrLink: scheduleForm.locationOrLink,
        interviewerName: scheduleForm.interviewerName,
        notes: scheduleForm.notes,
      });

      toast.success("Interview scheduled and email sent to candidate.");
      setIsScheduleOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to schedule interview.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (interviewId: number, status: string, result: string) => {
    try {
      await updateInterviewStatus(interviewId, status, result);
      toast.success("Interview status updated.");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update status.");
    }
  };

  const handleMcuSubmit = async () => {
    if (!mcuForm.klinikName || !mcuForm.klinikEmail || !mcuForm.paketMcu || !mcuForm.scheduledDate) {
      toast.error("Please fill in all required MCU fields.");
      return;
    }

    setIsMcuSubmitting(true);
    try {
      const scheduledDate = new Date(mcuForm.scheduledDate);
      
      await scheduleCandidateMcu(candidate.id, {
        klinikName: mcuForm.klinikName,
        klinikEmail: mcuForm.klinikEmail,
        paketMcu: mcuForm.paketMcu,
        scheduledDate,
        clinicId: mcuForm.clinicId ? parseInt(mcuForm.clinicId) : null,
        signatoryName: mcuForm.signatoryName,
        signatoryTitle: mcuForm.signatoryTitle,
        signatureUrl: mcuForm.signatureUrl,
      });

      toast.success("MCU scheduled and emails sent to Clinic and Candidate.");
      setIsMcuScheduleOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to schedule MCU.");
    } finally {
      setIsMcuSubmitting(false);
    }
  };

  const handleMcuResult = async () => {
    if (!mcuResultDialog.mcuId) return;
    setIsMcuResultSubmitting(true);
    try {
      let fileUrl = "";
      if (mcuResultDialog.file) {
        const bytes = new Uint8Array(await mcuResultDialog.file.arrayBuffer());
        const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join("");
        const base64 = btoa(binary);
        fileUrl = await uploadMcuResultFile(mcuResultDialog.mcuId, base64, mcuResultDialog.file.name);
      }
      await recordMcuResult(mcuResultDialog.mcuId, {
        result: mcuResultDialog.result,
        notes: mcuResultDialog.notes,
        resultBy: mcuResultDialog.resultBy,
        resultFileUrl: fileUrl || undefined,
      });
      toast.success(`MCU marked as ${mcuResultDialog.result}.`);
      setMcuResultDialog({ open: false, mcuId: null, result: "Fit", notes: "", file: null, resultBy: "" });
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update MCU result.");
    } finally {
      setIsMcuResultSubmitting(false);
    }
  };

  const handleGenerateOnboardingToken = async () => {
    try {
      const res = await generateOnboardingToken(candidate.id);
      if (res.success) {
        setOnboardingToken(res.token ?? null);
        toast.success("Onboarding link generated successfully");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to generate link");
      }
    } catch (e: any) {
      toast.error(e.message || "Error generating link");
    }
  };

  const handlePanelSubmit = async () => {
    if (!panelForm.panelistName.trim()) {
      toast.error("Nama panelis wajib diisi.");
      return;
    }

    setIsPanelSubmitting(true);
    try {
      await createCandidatePanelEvaluation(candidate.id, {
        interviewId: panelForm.interviewId ? parseInt(panelForm.interviewId, 10) : null,
        panelistName: panelForm.panelistName,
        panelistRole: panelForm.panelistRole,
        technicalScore: panelForm.technicalScore,
        communicationScore: panelForm.communicationScore,
        cultureScore: panelForm.cultureScore,
        problemSolvingScore: panelForm.problemSolvingScore,
        attitudeScore: panelForm.attitudeScore,
        overallRecommendation: panelForm.overallRecommendation,
        strengths: panelForm.strengths,
        concerns: panelForm.concerns,
        notes: panelForm.notes,
      });
      toast.success("Panel evaluation saved.");
      setPanelForm({ ...panelForm, panelistName: "", panelistRole: "", strengths: "", concerns: "", notes: "" });
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to save panel evaluation.");
    } finally {
      setIsPanelSubmitting(false);
    }
  };

  const panelAverage = panelEvaluations.length
    ? (panelEvaluations.reduce((sum, item) => sum + item.technicalScore + item.communicationScore + item.cultureScore + item.problemSolvingScore + item.attitudeScore, 0) / (panelEvaluations.length * 5)).toFixed(1)
    : null;

  const onboardingPath = onboardingToken ? `/onboarding/${onboardingToken}` : "";
  const onboardingUrl = onboardingPath && appOrigin ? `${appOrigin}${onboardingPath}` : onboardingPath;

  return (
    <>
      <AdminPageShell 
        eyebrow="Candidate Details" 
        title={candidate.fullName} 
        description={`${candidate.jobTitle || 'Position'} • Applied on ${format(new Date(candidate.createdAt), "dd MMM yyyy")}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/hc/recruitment")}>
              <IconArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              setEditForm({
                fullName: candidate.fullName || "",
                email: candidate.email || "",
                phone: candidate.phone || "",
                dateOfBirth: candidate.dateOfBirth ? new Date(candidate.dateOfBirth).toISOString().split("T")[0] : "",
                gender: candidate.gender || "",
                address: candidate.address || "",
                source: candidate.source || "",
                nikKtp: candidate.nikKtp || "",
                npwpNumber: candidate.npwpNumber || "",
                bpjsKesehatan: candidate.bpjsKesehatan || "",
                bpjsKetenagakerjaan: candidate.bpjsKetenagakerjaan || "",
                bankName: candidate.bankName || "",
                bankAccountNumber: candidate.bankAccountNumber || "",
                emergencyContactName: candidate.emergencyContactName || "",
                emergencyContactPhone: candidate.emergencyContactPhone || "",
                notes: candidate.notes || "",
                rating: candidate.rating || 0,
              });
              setIsEditOpen(true);
            }}>
              Edit
            </Button>
            <Badge variant="secondary" className="text-sm px-3 py-1">{candidate.currentStage}</Badge>
            {candidate.cvUrl && (
              <Button variant="outline" size="sm" onClick={handleViewCv} disabled={cvLoading}>
                <IconFileText className="w-4 h-4 mr-2" />
                View CV
              </Button>
            )}
            {candidate.currentStage === "Medical Checkup" && (
              <Button size="sm" onClick={() => setIsHireOpen(true)}>
                <IconCheck className="w-4 h-4 mr-2" /> Hire
              </Button>
            )}
          </>
        }
      >

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="interviews">Interviews ({interviews.length})</TabsTrigger>
          <TabsTrigger value="offering">Offering</TabsTrigger>
          <TabsTrigger value="panel-evaluation">Panelist ({panelEvaluations.length})</TabsTrigger>
          <TabsTrigger value="mcu">Medical Checkup ({mcuRecords.length})</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="history">Stage History</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="emails">Emails ({emailLogs.length})</TabsTrigger>
          <TabsTrigger value="test-results">Test Results ({testResults.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Data pribadi dari form lamaran</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Full Name</div>
                      <div className="font-medium">{candidate.fullName || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Email</div>
                      <div className="font-medium">{candidate.email || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Phone</div>
                      <div className="font-medium">{candidate.phone || "-"}</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Date of Birth</div>
                      <div className="font-medium">{candidate.dateOfBirth ? format(new Date(candidate.dateOfBirth), "dd MMMM yyyy") : "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Gender</div>
                      <div className="font-medium">{candidate.gender || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Address</div>
                      <div className="font-medium text-sm">{candidate.address || "-"}</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Source</div>
                      <div className="font-medium">{candidate.source || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Applied Date</div>
                      <div className="font-medium">{format(new Date(candidate.createdAt), "dd MMMM yyyy")}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Current Stage</div>
                      <Badge variant="outline">{candidate.currentStage}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Job Vacancy Details */}
            <Card>
              <CardHeader>
                <CardTitle>Job Vacancy Details</CardTitle>
                <CardDescription>Informasi lowongan yang dilamar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Position</div>
                      <div className="font-medium">{candidate.jobTitle || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Department</div>
                      <div className="font-medium">{candidate.department || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Section</div>
                      <div className="font-medium">{candidate.section || "-"}</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Location</div>
                      <div className="font-medium">{candidate.location || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Open Date</div>
                      <div className="font-medium">{candidate.startDate ? format(new Date(candidate.startDate), "dd MMMM yyyy") : "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Expiry Date</div>
                      <div className="font-medium">{candidate.endDate ? format(new Date(candidate.endDate), "dd MMMM yyyy") : "-"}</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Quota</div>
                      <div className="font-medium">{candidate.totalRequested || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Vacancy Status</div>
                      <div className="font-medium">{candidate.vacancyStatus || "-"}</div>
                    </div>
                  </div>
                </div>
                {candidate.jobDescription && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Job Description</div>
                    <div className="text-sm whitespace-pre-wrap">{candidate.jobDescription}</div>
                  </div>
                )}
                {candidate.requirements && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Requirements</div>
                    <div className="text-sm whitespace-pre-wrap">{candidate.requirements}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Work Experience */}
            <Card>
              <CardHeader>
                <CardTitle>Work Experience</CardTitle>
              </CardHeader>
              <CardContent>
                {candidate.workExperience?.length > 0 ? (
                  <div className="space-y-4">
                    {candidate.workExperience.map((we: any, i: number) => (
                      <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold">{we.role}</div>
                            <div className="text-sm text-muted-foreground">{we.company}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">{we.yearIn} - {we.yearOut}</div>
                        </div>
                        {we.description && (
                          <div className="mt-2 text-sm text-muted-foreground">{we.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No work experience listed</p>
                )}
              </CardContent>
            </Card>

            {/* Education */}
            <Card>
              <CardHeader>
                <CardTitle>Education</CardTitle>
              </CardHeader>
              <CardContent>
                {candidate.education?.length > 0 ? (
                  <div className="space-y-4">
                    {candidate.education.map((edu: any, i: number) => (
                      <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold">{edu.institution}</div>
                            <div className="text-sm text-muted-foreground">{edu.major} • {edu.level}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">{edu.yearIn} - {edu.yearOut}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No education listed</p>
                )}
              </CardContent>
            </Card>

            {/* Driving Licenses & Certificates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Driving Licenses</CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.drivingLicenses?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {candidate.drivingLicenses.map((lic: string, i: number) => (
                        <Badge key={i} variant="secondary">{lic}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No driving licenses listed</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Certifications</CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.certificates?.length > 0 ? (
                    <div className="space-y-3">
                      {candidate.certificates.map((cert: any, i: number) => (
                        <div key={i} className="flex justify-between items-center p-2 rounded bg-muted/30">
                          <div>
                            <div className="font-medium text-sm">{cert.name}</div>
                            <div className="text-xs text-muted-foreground">{cert.publisher}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">{cert.year}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No certifications listed</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Achievements */}
            {candidate.achievements && (
              <Card>
                <CardHeader>
                  <CardTitle>Achievements</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{candidate.achievements}</p>
                </CardContent>
              </Card>
            )}

            {/* CV & Rating */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>CV / Resume</CardTitle>
                </CardHeader>
                <CardContent>
                  {candidate.cvUrl ? (
                    <Button variant="outline" onClick={handleViewCv} disabled={cvLoading}>
                      <IconFileText className="w-4 h-4 mr-2" />
                      {cvLoading ? "Loading..." : "View CV Document"}
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">No CV uploaded</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rating & Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Rating</div>
                    <div className="font-medium">{candidate.rating ? `${candidate.rating} / 5` : "Not rated yet"}</div>
                  </div>
                  {candidate.notes && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Notes</div>
                      <div className="text-sm mt-1 bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{candidate.notes}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Smart Assessment */}
            <Card>
              <CardHeader>
                <CardTitle>Smart Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {candidate.aiScore !== null ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-bold">{candidate.aiScore}%</div>
                      <div className="text-sm text-muted-foreground">Match Score</div>
                      {formatAiRecommendation(candidate.aiDetails?.recommendation) && (
                        <Badge variant="secondary" className="uppercase tracking-wide">
                          {formatAiRecommendation(candidate.aiDetails?.recommendation)}
                        </Badge>
                      )}
                      {candidate.aiAssessmentDate && (
                        <div className="text-xs text-muted-foreground ml-auto">
                          Assessed: {format(new Date(candidate.aiAssessmentDate), "dd MMM yyyy HH:mm")}
                        </div>
                      )}
                    </div>
                    {candidate.aiSummary && (
                      <div className="text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{candidate.aiSummary}</div>
                    )}
                    {aiRadarData.length > 0 && (
                      <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">Radar Smart Analysis Score</div>
                            <div className="text-xs text-muted-foreground">Visual perbandingan nilai tiap kriteria assessment</div>
                          </div>
                          <Badge variant="secondary" className="border-emerald-200 bg-emerald-100 text-emerald-700">
                            {candidate.aiScore}% total
                          </Badge>
                        </div>
                        <div className="h-80 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={aiRadarData} margin={{ top: 18, right: 40, bottom: 18, left: 40 }}>
                              <PolarGrid stroke="#cbd5e1" radialLines />
                              <PolarAngleAxis dataKey="criterion" tick={{ fill: "#334155", fontSize: 11, fontWeight: 600 }} />
                              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} tickCount={6} />
                              <Radar name="Score Smart" dataKey="score" stroke="#059669" fill="#10b981" fillOpacity={0.34} strokeWidth={3} dot={{ r: 3, fill: "#0f766e", strokeWidth: 1 }} />
                              <RechartsTooltip
                                contentStyle={{ borderRadius: 12, border: "1px solid #d1fae5", boxShadow: "0 18px 45px rgba(15, 23, 42, 0.14)" }}
                                formatter={(value: number, name: string) => [`${value}%`, name]}
                                labelFormatter={(label) => `Kriteria: ${label}`}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                    {candidate.aiDetails?.knockout?.length > 0 && (
                      <div className="rounded-md border bg-muted/20 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Knockout Check</div>
                        <div className="space-y-2">
                          {candidate.aiDetails.knockout.map((item: any, idx: number) => (
                            <div key={`${item.criterion}-${idx}`} className="flex items-start justify-between gap-3 text-sm">
                              <div>
                                <div className="font-medium">{item.criterion}</div>
                                <div className="text-xs text-muted-foreground">{item.reason}</div>
                              </div>
                              <Badge variant={item.passed ? "default" : "destructive"}>{item.passed ? "Pass" : "Fail"}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {candidate.aiDetails?.breakdown?.length > 0 && (
                      <div className="rounded-md border bg-muted/20 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Scoring Breakdown</div>
                        <div className="space-y-3">
                          {candidate.aiDetails.breakdown.map((item: any, idx: number) => (
                            <div key={`${item.criterion}-${idx}`} className="space-y-1">
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="font-medium">{item.criterion}</span>
                                <span className="text-xs text-muted-foreground">{item.score}% / weight {item.weight}</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, Number(item.score) || 0))}%` }} />
                              </div>
                              <div className="text-xs text-muted-foreground">{item.reason}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No Smart assessment yet</p>
                )}
              </CardContent>
            </Card>

            {/* Rejection Info */}
            {candidate.rejectionReason && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Rejection Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Rejected At Stage</div>
                    <div className="font-medium">{candidate.rejectedAtStage || "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Reason</div>
                    <div className="text-sm mt-1 bg-destructive/5 p-3 rounded-md whitespace-pre-wrap">{candidate.rejectionReason}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Onboarding Info */}
            {(candidate.nikKtp || candidate.npwpNumber || candidate.bankName || candidate.emergencyContactName) && (
              <Card>
                <CardHeader>
                  <CardTitle>Onboarding Data</CardTitle>
                  <CardDescription>Data administrasi dari form onboarding</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">NIK KTP</div>
                        <div className="font-medium">{candidate.nikKtp || "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">NPWP</div>
                        <div className="font-medium">{candidate.npwpNumber || "-"}</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">BPJS Kesehatan</div>
                        <div className="font-medium">{candidate.bpjsKesehatan || "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">BPJS Ketenagakerjaan</div>
                        <div className="font-medium">{candidate.bpjsKetenagakerjaan || "-"}</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Bank Name</div>
                        <div className="font-medium">{candidate.bankName || "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Bank Account</div>
                        <div className="font-medium">{candidate.bankAccountNumber || "-"}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Emergency Contact Name</div>
                      <div className="font-medium">{candidate.emergencyContactName || "-"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Emergency Contact Phone</div>
                      <div className="font-medium">{candidate.emergencyContactPhone || "-"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="font-medium">{candidate.email}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Phone</div>
                  <div className="font-medium">{candidate.phone}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Source</div>
                  <div className="font-medium">{candidate.source}</div>
                </div>
                {candidate.aiScore !== null && (
                  <div>
                    <div className="text-sm text-muted-foreground">Smart Match Score</div>
                    <div className="font-medium flex items-center gap-2">
                      <span className="text-lg">{candidate.aiScore}%</span>
                    </div>
                  </div>
                )}
                {candidate.aiSummary && (
                  <div>
                    <div className="text-sm text-muted-foreground">Smart Summary</div>
                    <div className="text-sm mt-1 bg-muted/50 p-3 rounded-md">{candidate.aiSummary}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Education & Experience</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Work Experience</h4>
                  {candidate.workExperience?.length > 0 ? (
                    <ul className="space-y-3">
                      {candidate.workExperience.map((we: any, i: number) => (
                        <li key={i} className="text-sm border-l-2 border-primary/20 pl-3">
                          <div className="font-medium">{we.role} at {we.company}</div>
                          <div className="text-muted-foreground text-xs">{we.yearIn} - {we.yearOut}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No experience listed</p>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Education</h4>
                  {candidate.education?.length > 0 ? (
                    <ul className="space-y-3">
                      {candidate.education.map((edu: any, i: number) => (
                        <li key={i} className="text-sm border-l-2 border-primary/20 pl-3">
                          <div className="font-medium">{edu.institution} ({edu.level})</div>
                          <div className="text-muted-foreground text-xs">{edu.major} • {edu.yearIn} - {edu.yearOut}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No education listed</p>
                  )}
                </div>
                {aiRadarData.length > 0 && (
                  <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Radar Smart Analysis Score</div>
                        <div className="text-xs text-muted-foreground">Diambil dari breakdown score Smart assessment</div>
                      </div>
                      <Badge variant="secondary" className="border-emerald-200 bg-emerald-100 text-emerald-700">
                        {candidate.aiScore}% total
                      </Badge>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={aiRadarData} margin={{ top: 16, right: 34, bottom: 16, left: 34 }}>
                          <PolarGrid stroke="#cbd5e1" radialLines />
                          <PolarAngleAxis dataKey="criterion" tick={{ fill: "#334155", fontSize: 10, fontWeight: 600 }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} tickCount={6} />
                          <Radar name="Score Smart" dataKey="score" stroke="#059669" fill="#10b981" fillOpacity={0.34} strokeWidth={3} dot={{ r: 3, fill: "#0f766e", strokeWidth: 1 }} />
                          <RechartsTooltip
                            contentStyle={{ borderRadius: 12, border: "1px solid #d1fae5", boxShadow: "0 18px 45px rgba(15, 23, 42, 0.14)" }}
                            formatter={(value: number, name: string) => [`${value}%`, name]}
                            labelFormatter={(label) => `Kriteria: ${label}`}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="interviews">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Jadwal Interview Berjenjang</h3>
              <p className="text-xs text-muted-foreground">Kelola jadwal interview multi-stage & notifikasi pewawancara</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsSettingsModalOpen(true)}>
                Pengaturan Pewawancara
              </Button>
              <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={() => {
                setScheduleStageName(candidate.currentStage?.startsWith("Passed") ? "Interview 2" : "Interview 1");
                setIsScheduleStageModalOpen(true);
              }}>
                <IconCalendarEvent className="w-4 h-4 mr-1.5" />
                Jadwalkan Interview
              </Button>
            </div>
          </div>

          {interviews.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <IconCalendarEvent className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h4 className="text-lg font-medium">No interviews scheduled</h4>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  This candidate does not have any upcoming or past interviews. Click the button above to schedule one.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {interviews.map((interview) => (
                <Card key={interview.id} className={interview.status === 'Completed' ? 'opacity-80 bg-muted/30' : ''}>
                  <CardHeader className="pb-3 flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {interview.interviewType === 'Online' ? <IconVideo className="w-4 h-4 text-cyan-600" /> : <IconMapPin className="w-4 h-4 text-amber-600" />}
                        {interview.stageName || "Interview 1"} ({interview.interviewType})
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(interview.scheduledAt), "EEEE, dd MMMM yyyy • HH:mm")} ({interview.durationMinutes} mins)
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {interview.accessToken && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-cyan-700 border-cyan-300 hover:bg-cyan-50"
                          onClick={() => {
                            const origin = typeof window !== "undefined" ? window.location.origin : "";
                            const url = `${origin}/interview-evaluation/${interview.accessToken}`;
                            navigator.clipboard.writeText(url);
                            toast.success("Link Form Penilaian berhasil di-copy!");
                          }}
                        >
                          <IconCopy className="w-3.5 h-3.5 mr-1" /> Copy Link Form
                        </Button>
                      )}
                      <Badge variant={
                        interview.status === 'Scheduled' ? 'default' : 
                        interview.status === 'Completed' ? 'secondary' : 'destructive'
                      }>
                        {interview.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block text-xs">Interviewer</span>
                        <span className="font-medium">{interview.interviewerName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">Location / Link</span>
                        {interview.locationOrLink.startsWith('http') ? (
                          <a href={interview.locationOrLink} target="_blank" className="text-blue-500 hover:underline">{interview.locationOrLink}</a>
                        ) : (
                          <span className="font-medium">{interview.locationOrLink}</span>
                        )}
                      </div>
                      {interview.notes && (
                        <div className="md:col-span-2 mt-2 bg-muted/50 p-3 rounded-md">
                          <span className="text-muted-foreground block text-xs mb-1">Notes to Candidate</span>
                          {interview.notes}
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  {interview.status === 'Scheduled' && (
                    <div className="bg-muted/30 p-4 border-t flex items-center justify-end gap-2">
                      <span className="text-sm text-muted-foreground mr-auto">Mark interview outcome:</span>
                      <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" 
                        onClick={() => handleUpdateStatus(interview.id, 'Completed', 'Pass')}>
                        <IconCheck className="w-4 h-4 mr-1" /> Passed
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleUpdateStatus(interview.id, 'Completed', 'Fail')}>
                        <IconX className="w-4 h-4 mr-1" /> Failed
                      </Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground"
                        onClick={() => handleUpdateStatus(interview.id, 'No-Show', 'Fail')}>
                        No-Show
                      </Button>
                    </div>
                  )}

                  {interview.status === 'Completed' && (
                    <div className="bg-muted/30 p-3 border-t">
                      <span className="text-sm font-medium">Result: <Badge variant={interview.result === 'Pass' ? 'default' : 'destructive'} className={interview.result === 'Pass' ? 'bg-green-500' : ''}>{interview.result}</Badge></span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="panel-evaluation">
          <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Panelist Evaluation</CardTitle>
                <CardDescription>Isi kelayakan kandidat saat proses interview. Skor 1-5 per dimensi.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Nama Panelis *</Label>
                    <Input value={panelForm.panelistName} onChange={(e) => setPanelForm({ ...panelForm, panelistName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Role/Jabatan</Label>
                    <Input placeholder="User, HC, Dept Head" value={panelForm.panelistRole} onChange={(e) => setPanelForm({ ...panelForm, panelistRole: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Interview terkait</Label>
                  <Select value={panelForm.interviewId || "none"} onValueChange={(value) => setPanelForm({ ...panelForm, interviewId: value === "none" ? "" : value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tidak spesifik</SelectItem>
                      {interviews.map((interview) => (
                        <SelectItem key={interview.id} value={String(interview.id)}>
                          {interview.interviewType} · {format(new Date(interview.scheduledAt), "dd MMM yyyy HH:mm")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    ["technicalScore", "Technical"],
                    ["communicationScore", "Communication"],
                    ["cultureScore", "Culture Fit"],
                    ["problemSolvingScore", "Problem Solving"],
                    ["attitudeScore", "Attitude"],
                  ].map(([key, label]) => (
                    <div key={key} className="space-y-2">
                      <Label>{label}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        value={(panelForm as any)[key]}
                        onChange={(e) => setPanelForm({ ...panelForm, [key]: Math.max(1, Math.min(5, parseInt(e.target.value, 10) || 1)) } as any)}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Recommendation</Label>
                  <Select value={panelForm.overallRecommendation} onValueChange={(value) => setPanelForm({ ...panelForm, overallRecommendation: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Strong Hire">Strong Hire</SelectItem>
                      <SelectItem value="Hire">Hire</SelectItem>
                      <SelectItem value="Review">Review</SelectItem>
                      <SelectItem value="Hold">Hold</SelectItem>
                      <SelectItem value="Reject">Reject</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Strengths</Label>
                  <Textarea rows={2} value={panelForm.strengths} onChange={(e) => setPanelForm({ ...panelForm, strengths: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Concerns</Label>
                  <Textarea rows={2} value={panelForm.concerns} onChange={(e) => setPanelForm({ ...panelForm, concerns: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea rows={3} value={panelForm.notes} onChange={(e) => setPanelForm({ ...panelForm, notes: e.target.value })} />
                </div>

                <Button onClick={handlePanelSubmit} disabled={isPanelSubmitting} className="w-full">
                  {isPanelSubmitting ? "Saving..." : "Save Evaluation"}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Panel Summary</CardTitle>
                  <CardDescription>{panelEvaluations.length} panelist submissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-muted/40 p-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Average</div>
                      <div className="text-2xl font-bold">{panelAverage ? `${panelAverage}/5` : "-"}</div>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Latest</div>
                      <div className="text-lg font-semibold">{panelEvaluations[0]?.overallRecommendation || "-"}</div>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Panelists</div>
                      <div className="text-2xl font-bold">{panelEvaluations.length}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {panelEvaluations.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">Belum ada penilaian panelis.</CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {panelEvaluations.map((evaluation) => {
                    const avg = ((evaluation.technicalScore + evaluation.communicationScore + evaluation.cultureScore + evaluation.problemSolvingScore + evaluation.attitudeScore) / 5).toFixed(1);
                    return (
                      <Card key={evaluation.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <CardTitle className="text-base">{evaluation.panelistName}</CardTitle>
                              <CardDescription>{evaluation.panelistRole || "Panelist"} · {format(new Date(evaluation.submittedAt), "dd MMM yyyy HH:mm")}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{avg}/5</Badge>
                              <Badge>{evaluation.overallRecommendation}</Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                            <div className="rounded bg-muted/40 p-2">Technical<br/><b>{evaluation.technicalScore}</b></div>
                            <div className="rounded bg-muted/40 p-2">Communication<br/><b>{evaluation.communicationScore}</b></div>
                            <div className="rounded bg-muted/40 p-2">Culture<br/><b>{evaluation.cultureScore}</b></div>
                            <div className="rounded bg-muted/40 p-2">Problem<br/><b>{evaluation.problemSolvingScore}</b></div>
                            <div className="rounded bg-muted/40 p-2">Attitude<br/><b>{evaluation.attitudeScore}</b></div>
                          </div>
                          {evaluation.strengths && <div><b>Strengths:</b> {evaluation.strengths}</div>}
                          {evaluation.concerns && <div><b>Concerns:</b> {evaluation.concerns}</div>}
                          {evaluation.notes && <div className="rounded bg-muted/40 p-3 whitespace-pre-wrap">{evaluation.notes}</div>}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="offering">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Job Offering</h3>
            <div className="flex items-center gap-2">
              {offering?.status === "Sent" && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">Email Sent</Badge>
              )}
              {offering?.status === "Accepted" && (
                <Badge className="bg-green-500 hover:bg-green-600">Accepted</Badge>
              )}
              {offering?.status === "Rejected" && (
                <Badge variant="destructive">Rejected</Badge>
              )}
              {(!offering || offering.status === "Draft") && (
                <Badge variant="outline">Draft</Badge>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Offering Form */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Offering Details</CardTitle>
                <CardDescription>Isi detail penawaran kerja untuk kandidat ini</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Jabatan / Level / POH</Label>
                    <Input value={offeringForm.position} onChange={e => setOfferingForm({...offeringForm, position: e.target.value})} placeholder="HSE Officer / Staff / Balikpapan" />
                  </div>
                  <div className="space-y-2">
                    <Label>Atasan Langsung</Label>
                    <Input value={offeringForm.directSupervisor} onChange={e => setOfferingForm({...offeringForm, directSupervisor: e.target.value})} placeholder="Nama atasan langsung" />
                  </div>
                  <div className="space-y-2">
                    <Label>Gaji Pokok</Label>
                    <Input value={offeringForm.salary} onChange={e => setOfferingForm({...offeringForm, salary: e.target.value})} placeholder="Rp. 8.000.000,-" />
                  </div>
                  <div className="space-y-2">
                    <Label>Masa Kontrak (bulan)</Label>
                    <Input type="number" value={offeringForm.contractDurationMonths} onChange={e => setOfferingForm({...offeringForm, contractDurationMonths: parseInt(e.target.value) || 12})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tanggal Mulai Kerja</Label>
                    <Input type="date" value={offeringForm.startDate} onChange={e => setOfferingForm({...offeringForm, startDate: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Penandatangan</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={offeringForm.signatoryName} onChange={e => {
                      const signer = MCU_SIGNERS.find(s => s.name === e.target.value) || MCU_SIGNERS[0];
                      setOfferingForm({...offeringForm, signatoryName: signer.name, signatoryTitle: signer.title, signatureUrl: signer.signatureUrl});
                    }}>
                      {MCU_SIGNERS.map(s => <option key={s.name} value={s.name}>{s.name} — {s.title}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>5. Biaya Rawat Jalan</Label>
                  <Textarea rows={2} value={offeringForm.outpatientBenefit} onChange={e => setOfferingForm({...offeringForm, outpatientBenefit: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>6. Biaya Rawat Inap</Label>
                  <Textarea rows={2} value={offeringForm.inpatientBenefit} onChange={e => setOfferingForm({...offeringForm, inpatientBenefit: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>7. Biaya Melahirkan</Label>
                  <Textarea rows={2} value={offeringForm.maternityBenefit} onChange={e => setOfferingForm({...offeringForm, maternityBenefit: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>8. Asuransi Kecelakaan</Label>
                  <Textarea rows={2} value={offeringForm.accidentInsurance} onChange={e => setOfferingForm({...offeringForm, accidentInsurance: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>9. BPJS Ketenagakerjaan</Label>
                    <Input value={offeringForm.bpjsEmployment} onChange={e => setOfferingForm({...offeringForm, bpjsEmployment: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>10. BPJS Kesehatan</Label>
                    <Input value={offeringForm.bpjsHealth} onChange={e => setOfferingForm({...offeringForm, bpjsHealth: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>11. THR</Label>
                  <Textarea rows={2} value={offeringForm.thr} onChange={e => setOfferingForm({...offeringForm, thr: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>12. Ketentuan-ketentuan Lain</Label>
                  <Textarea rows={3} value={offeringForm.otherTerms} onChange={e => setOfferingForm({...offeringForm, otherTerms: e.target.value})} />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <Button onClick={handleSaveOffering} disabled={isOfferingSaving}>
                    {isOfferingSaving ? "Saving..." : "Save Draft"}
                  </Button>
                  <Button onClick={handleSendOffering} disabled={isOfferingSending} variant="default">
                    {isOfferingSending ? "Sending..." : "Send Offering Email + PDF"}
                  </Button>
                  {offering?.status === "Sent" && (
                    <>
                      <Button onClick={() => handleOfferingResponse("Accepted")} variant="outline" className="text-green-600 border-green-200 hover:bg-green-50">
                        <IconCheck className="w-4 h-4 mr-1" /> Accept
                      </Button>
                      <Button onClick={() => handleOfferingResponse("Rejected")} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                        <IconX className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Offering Status */}
            {offering && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Offering Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block text-xs">Status</span>
                      <Badge variant={offering.status === "Accepted" ? "default" : offering.status === "Rejected" ? "destructive" : "secondary"}>
                        {offering.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Letter Number</span>
                      <span className="font-medium">{offering.letterNumber || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Sent At</span>
                      <span className="font-medium">{offering.sentAt ? format(new Date(offering.sentAt), "dd MMM yyyy HH:mm") : "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">Responded At</span>
                      <span className="font-medium">{offering.respondedAt ? format(new Date(offering.respondedAt), "dd MMM yyyy HH:mm") : "-"}</span>
                    </div>
                  </div>
                  {offering.pdfUrl && (
                    <div className="mt-3">
                      <Button variant="link" className="h-auto p-0 text-sm text-blue-600" onClick={handleViewOfferingPdf} disabled={offeringPdfLoading}>
                        <IconFileText className="w-4 h-4 mr-1" /> {offeringPdfLoading ? "Loading..." : "View Offering PDF"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="mcu">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Medical Check Up (MCU)</h3>
            <Button onClick={() => setIsMcuScheduleOpen(true)}>
              <IconStethoscope className="w-4 h-4 mr-2" />
              Schedule MCU
            </Button>
          </div>

          {mcuRecords.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <IconStethoscope className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                <h4 className="text-lg font-medium">No MCU scheduled</h4>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  This candidate has not been scheduled for a Medical Checkup yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {mcuRecords.map((mcu) => (
                <Card key={mcu.id} className={mcu.status !== 'Scheduled' ? 'opacity-90 bg-muted/20' : ''}>
                  <CardHeader className="pb-3 flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <IconStethoscope className="w-4 h-4" />
                        Medical Checkup at {mcu.klinikName}
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(mcu.scheduledDate), "EEEE, dd MMMM yyyy")}
                      </CardDescription>
                    </div>
                    <Badge variant={
                      mcu.status === 'Scheduled' ? 'default' : 
                      mcu.status === 'Fit' ? 'secondary' : 'destructive'
                    } className={mcu.status === 'Fit' ? 'bg-green-500' : ''}>
                      {mcu.status}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block text-xs">Clinic Email</span>
                        <span className="font-medium">{mcu.klinikEmail}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">MCU Package</span>
                        <span className="font-medium">{mcu.paketMcu}</span>
                      </div>
                      {mcu.resultDate && (
                        <div>
                          <span className="text-muted-foreground block text-xs">Result Date</span>
                          <span className="font-medium">{format(new Date(mcu.resultDate), "dd MMM yyyy")}</span>
                        </div>
                      )}
                      {mcu.resultBy && (
                        <div>
                          <span className="text-muted-foreground block text-xs">Recorded By</span>
                          <span className="font-medium">{mcu.resultBy}</span>
                        </div>
                      )}
                      {mcu.resultNotes && (
                        <div className="md:col-span-2 mt-2 bg-muted/50 p-3 rounded-md">
                          <span className="text-muted-foreground block text-xs mb-1">Result Notes</span>
                          {mcu.resultNotes}
                        </div>
                      )}
                      {mcu.resultFileUrl && (
                        <div className="md:col-span-2">
                          <Button type="button" variant="link" className="h-auto p-0 text-sm text-blue-600" onClick={() => setPdfPreviewUrl(mcu.resultFileUrl)}>
                            <IconFileText className="w-4 h-4 mr-1" /> Preview Result PDF
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  {mcu.status === 'Scheduled' && (
                    <div className="bg-muted/30 p-4 border-t flex items-center justify-end gap-2">
                      <span className="text-sm text-muted-foreground mr-auto">Mark MCU Result:</span>
                      <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" 
                        onClick={() => setMcuResultDialog({ open: true, mcuId: mcu.id, result: "Fit", notes: "", file: null, resultBy: "" })}>
                        <IconCheck className="w-4 h-4 mr-1" /> Fit
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setMcuResultDialog({ open: true, mcuId: mcu.id, result: "Unfit", notes: "", file: null, resultBy: "" })}>
                        <IconX className="w-4 h-4 mr-1" /> Unfit
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="onboarding">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Onboarding</h3>
            {!onboardingToken ? (
              <Button onClick={handleGenerateOnboardingToken}>
                <IconLink className="w-4 h-4 mr-2" />
                Generate Link
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  navigator.clipboard.writeText(onboardingUrl);
                  toast.success("Link copied to clipboard");
                }}>
                  <IconCopy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
                <Button asChild variant="secondary">
                  <a href={onboardingPath} target="_blank" rel="noreferrer">
                    <IconLink className="w-4 h-4 mr-2" />
                    Open Form
                  </a>
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Administrative Information</CardTitle>
                <CardDescription>Data submitted by candidate via the onboarding link</CardDescription>
              </CardHeader>
              <CardContent>
                {candidate.nikKtp ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-muted-foreground">NIK KTP</div>
                        <div className="font-medium">{candidate.nikKtp || "-"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">NPWP Number</div>
                        <div className="font-medium">{candidate.npwpNumber || "-"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Emergency Contact Name</div>
                        <div className="font-medium">{candidate.emergencyContactName || "-"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Emergency Contact Phone</div>
                        <div className="font-medium">{candidate.emergencyContactPhone || "-"}</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Bank Name</div>
                        <div className="font-medium">{candidate.bankName || "-"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Bank Account Number</div>
                        <div className="font-medium">{candidate.bankAccountNumber || "-"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">BPJS Kesehatan</div>
                        <div className="font-medium">{candidate.bpjsKesehatan || "-"}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">BPJS Ketenagakerjaan</div>
                        <div className="font-medium">{candidate.bpjsKetenagakerjaan || "-"}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <IconLink className="w-12 h-12 mb-4 opacity-20" />
                    <p>Candidate has not submitted their onboarding data yet.</p>
                    {!onboardingToken && (
                      <p className="text-sm mt-1">Generate a link first to send to the candidate.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dokumen Pendukung</CardTitle>
                <CardDescription>Dokumen yang di-upload kandidat melalui form onboarding. Klik gambar untuk preview.</CardDescription>
              </CardHeader>
              <CardContent>
                {candidate.kkUrl || candidate.ktpUrl || candidate.bankBookUrl ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {candidate.kkUrl && (
                      <div className="border rounded-lg p-3 text-center cursor-pointer hover:bg-muted/50 transition" onClick={() => setPreviewDoc({ url: candidate.kkUrl, title: "Kartu Keluarga" })}>
                        <img src={candidate.kkUrl} alt="Kartu Keluarga" className="w-full h-32 object-contain rounded mb-2 bg-muted" />
                        <p className="text-sm font-medium">Kartu Keluarga</p>
                        <p className="text-xs text-muted-foreground">Klik untuk preview</p>
                      </div>
                    )}
                    {candidate.ktpUrl && (
                      <div className="border rounded-lg p-3 text-center cursor-pointer hover:bg-muted/50 transition" onClick={() => setPreviewDoc({ url: candidate.ktpUrl, title: "KTP" })}>
                        <img src={candidate.ktpUrl} alt="KTP" className="w-full h-32 object-contain rounded mb-2 bg-muted" />
                        <p className="text-sm font-medium">KTP</p>
                        <p className="text-xs text-muted-foreground">Klik untuk preview</p>
                      </div>
                    )}
                    {candidate.bankBookUrl && (
                      <div className="border rounded-lg p-3 text-center cursor-pointer hover:bg-muted/50 transition" onClick={() => setPreviewDoc({ url: candidate.bankBookUrl, title: "Buku Tabungan" })}>
                        <img src={candidate.bankBookUrl} alt="Buku Tabungan" className="w-full h-32 object-contain rounded mb-2 bg-muted" />
                        <p className="text-sm font-medium">Buku Tabungan</p>
                        <p className="text-xs text-muted-foreground">Klik untuk preview</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <IconFileText className="w-12 h-12 mb-4 opacity-20" />
                    <p>Belum ada dokumen yang di-upload.</p>
                    <p className="text-sm mt-1">Dokumen akan muncul setelah kandidat mengisi form onboarding.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Stage History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {candidate.stages?.map((stage: any, i: number) => (
                  <div key={stage.id} className="relative pl-6 border-l-2 border-muted pb-6 last:pb-0">
                    <div className="absolute w-3 h-3 bg-primary rounded-full -left-[7px] top-1"></div>
                    <div className="font-medium">{stage.stage}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Entered: {format(new Date(stage.enteredAt), "dd MMM yyyy HH:mm")}
                      {stage.exitedAt && ` • Exited: ${format(new Date(stage.exitedAt), "dd MMM yyyy HH:mm")}`}
                    </div>
                    {stage.result && (
                      <div className="mt-2 text-sm flex gap-2">
                        <Badge variant="outline">{stage.result}</Badge>
                        {stage.score !== null && <Badge variant="secondary">Score: {stage.score}</Badge>}
                      </div>
                    )}
                    {stage.notes && (
                      <div className="mt-2 text-sm bg-muted/50 p-2 rounded">{stage.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Unified timeline of all actions for this candidate</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const activities: { id: string; type: string; title: string; description: string; timestamp: Date }[] = [];

                // Stage changes
                (candidate.stages || []).forEach((s: any) => {
                  activities.push({
                    id: `stage-${s.id}-enter`,
                    type: "stage",
                    title: `Stage: ${s.stage}`,
                    description: s.evaluator ? `Oleh ${s.evaluator}${s.notes ? ` — ${s.notes}` : ""}` : s.notes || "Memasuki tahap ini",
                    timestamp: new Date(s.enteredAt),
                  });
                  if (s.exitedAt) {
                    activities.push({
                      id: `stage-${s.id}-exit`,
                      type: "stage",
                      title: `Selesai: ${s.stage}`,
                      description: `Hasil: ${s.result || "-"}${s.score !== null ? `, Skor: ${s.score}` : ""}`,
                      timestamp: new Date(s.exitedAt),
                    });
                  }
                });

                // Email logs
                (emailLogs || []).forEach((log: any) => {
                  activities.push({
                    id: `email-${log.id}`,
                    type: "email",
                    title: `Email: ${log.templateName || log.subject || "Email"}`,
                    description: `Ke ${log.toEmail} — ${log.status === "sent" ? "Terkirim" : "Gagal"}${log.errorMessage ? `: ${log.errorMessage}` : ""}`,
                    timestamp: log.sentAt ? new Date(log.sentAt) : new Date(log.createdAt),
                  });
                });

                // Sort descending by timestamp
                activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

                if (activities.length === 0) {
                  return <p className="text-sm text-muted-foreground py-8 text-center">Belum ada aktivitas.</p>;
                }

                const iconMap: Record<string, string> = { stage: "bg-amber-100 text-amber-700", email: "bg-sky-100 text-sky-700" };

                return (
                  <div className="space-y-4">
                    {activities.map((act) => (
                      <div key={act.id} className="relative pl-6 border-l-2 border-muted pb-4 last:pb-0">
                        <div className={cn("absolute w-3 h-3 rounded-full -left-[7px] top-1", act.type === "stage" ? "bg-amber-500" : "bg-sky-500")} />
                        <div className="font-medium text-sm">{act.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{act.description}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{format(act.timestamp, "dd MMM yyyy HH:mm")}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails">
          <Card>
            <CardHeader>
              <CardTitle>Email Delivery Logs</CardTitle>
              <CardDescription>History of emails sent to {candidate.email || "this candidate"}</CardDescription>
            </CardHeader>
            <CardContent>
              {emailLogs.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">No email delivery records found.</div>
              ) : (
                <div className="space-y-4">
                  {emailLogs.map((log: any) => (
                    <div key={log.id} className="relative pl-6 border-l-2 border-muted pb-6 last:pb-0">
                      <div className={cn("absolute w-3 h-3 rounded-full -left-[7px] top-1", log.status === "sent" ? "bg-green-500" : "bg-destructive")} />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <IconMail className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{log.templateName || log.subject || "Email"}</span>
                          <Badge variant={log.status === "sent" ? "default" : "destructive"} className="text-xs">
                            {log.status}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 self-start sm:self-auto"
                          disabled={resendingLogId === log.id}
                          onClick={() => handleResendEmailLog(log.id)}
                        >
                          <IconSend className="w-3 h-3" />
                          {resendingLogId === log.id ? "Sending..." : "Resend Email"}
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        To: {log.toEmail} • From: {log.fromEmail || "-"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {log.sentAt ? format(new Date(log.sentAt), "dd MMM yyyy HH:mm") : format(new Date(log.createdAt), "dd MMM yyyy HH:mm")}
                      </div>
                      {log.errorMessage && (
                        <div className="mt-2 text-sm bg-destructive/10 text-destructive p-2 rounded">{log.errorMessage}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test-results">
          <Card>
            <CardHeader>
              <CardTitle>Hasil Test Online</CardTitle>
              <CardDescription>Skor dan jawaban dari setiap test yang dikerjakan</CardDescription>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Belum ada test yang dikerjakan.</p>
              ) : (
                <div className="space-y-3">
                  {testResults.map((result: any) => {
                    const isSubmitted = result.status === "Completed" || result.status === "Graded" || result.completedAt;
                    return (
                      <div key={result.id} className="rounded-xl border border-border/70 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="font-bold text-base">{result.testTitle}</h3>
                          <p className="text-xs text-muted-foreground">
                            {result.startedAt ? format(new Date(result.startedAt), "dd MMM yyyy HH:mm") : "Belum mulai"}
                            {result.completedAt ? ` → ${format(new Date(result.completedAt), "HH:mm")}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <Badge variant={isSubmitted ? "default" : "secondary"}>{result.status}</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1"
                            disabled={resendingTestId === result.id}
                            onClick={() => handleResendTestEmail(result.id)}
                          >
                            <IconMailForward className="w-3.5 h-3.5 text-sky-600" />
                            {resendingTestId === result.id ? "Sending..." : "Resend Email Tes"}
                          </Button>
                          {result.answers.length > 0 && (
                            <div className="text-right">
                              {result.hasAutoScore ? (
                                <>
                                  <div className="text-xs text-muted-foreground">Score</div>
                                  <div className="text-xl font-bold text-primary tabular-nums">{result.percentage}%</div>
                                  {result.passingScore > 0 && (
                                    <Badge variant={result.passed ? "default" : "destructive"} className={result.passed ? "bg-emerald-600" : ""}>
                                      {result.passed ? "LULUS" : "TIDAK LULUS"} · PG: {result.passingScore}%
                                    </Badge>
                                  )}
                                  <div className="text-xs text-muted-foreground">
                                    Benar <span className="text-emerald-600 font-semibold">{result.correctCount}</span>/{result.totalQuestions} soal
                                    {result.totalMaxPoints > 0 && (
                                      <span> · <span className="font-mono">{result.totalEarnedPoints}/{result.totalMaxPoints} pts</span></span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-xs text-muted-foreground">Status</div>
                                  <div className="text-base font-semibold text-amber-600">Perlu Verif Manual</div>
                                </>
                              )}
                            </div>
                          )}
                          {isSubmitted && result.answers.length > 0 && (
                            <Button variant="outline" size="sm" onClick={() => setSelectedTestResult(result)}>
                              <IconEye className="w-4 h-4" />
                              Detail
                            </Button>
                          )}
                        </div>
                      </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(selectedTestResult)} onOpenChange={(open) => !open && setSelectedTestResult(null)}>
        <DialogContent className="sm:max-w-[72rem] w-[92vw]">
          <DialogHeader>
            <DialogTitle>Detail Result — {selectedTestResult?.testTitle}</DialogTitle>
            <DialogDescription>
              Jawaban dan skor dari test yang sudah disubmit kandidat.
            </DialogDescription>
          </DialogHeader>
          {selectedTestResult && (
            <div className="space-y-4">
              {selectedTestResult.isApplicationForm ? (
                <>
                  <div className="grid grid-cols-1 gap-3 rounded-xl bg-muted/30 p-4 text-sm sm:grid-cols-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Status</div>
                      <Badge variant={selectedTestResult.status === "Completed" ? "default" : "secondary"}>{selectedTestResult.status}</Badge>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Tipe</div>
                      <div className="font-semibold">Application Form</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Diselesaikan</div>
                      <div className="font-semibold">{selectedTestResult.completedAt ? format(new Date(selectedTestResult.completedAt), "dd MMM yyyy HH:mm") : "-"}</div>
                    </div>
                  </div>
                  <div className="max-h-[60vh] overflow-auto rounded-lg border p-4 space-y-4">
                    {selectedTestResult.answers.map((ans: any, idx: number) => (
                      <div key={ans.id} className="rounded-xl border bg-muted/20 p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Application Form Data</div>
                        <ApplicationFormAnswer text={ans.answerText} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 rounded-xl bg-muted/30 p-4 text-sm sm:grid-cols-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Status</div>
                      <Badge variant={selectedTestResult.status === "Completed" || selectedTestResult.status === "Graded" ? "default" : "secondary"}>{selectedTestResult.status}</Badge>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{selectedTestResult.hasAutoScore ? 'Score' : 'Status'}</div>
                      {selectedTestResult.hasAutoScore ? (
                        <div className="text-xl font-bold text-primary tabular-nums">{selectedTestResult.percentage}%</div>
                      ) : (
                        <div className="text-base font-semibold text-amber-600">Perlu Verif Manual</div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Correct</div>
                      <div className="font-semibold">{selectedTestResult.correctCount}/{selectedTestResult.totalQuestions} soal</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Points</div>
                      <div className="font-mono font-semibold">{selectedTestResult.totalEarnedPoints}/{selectedTestResult.totalMaxPoints}</div>
                    </div>
                  </div>
                  <div className="max-h-[60vh] overflow-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead className="w-10 text-center text-xs">#</TableHead>
                          <TableHead className="text-xs min-w-[320px]">PERTANYAAN</TableHead>
                          <TableHead className="text-xs w-56">JAWABAN</TableHead>
                          <TableHead className="text-xs w-20 text-right">SKOR</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTestResult.answers.map((ans: any, idx: number) => (
                          <TableRow key={ans.id} className="border-t">
                            <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="text-sm align-top">
                            <div className="prose prose-sm max-w-none text-foreground break-words whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: ans.questionText }} />
                          </TableCell>
                            <TableCell className="text-sm align-top">
                              <span className={cn(ans.pointsAwarded > 0 ? "font-medium text-green-700" : "font-medium text-destructive")}>
                                <AnswerCell text={ans.answerText} />
                              </span>
                            </TableCell>
                            <TableCell className="text-right align-top">
                              {ans.isCorrect !== null ? (
                                <Badge variant={ans.pointsAwarded > 0 ? "default" : "destructive"} className={cn("text-xs font-mono", ans.pointsAwarded > 0 ? "bg-green-600" : "")}>
                                  {ans.pointsAwarded}/{ans.maxPoints}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Dialog */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={scheduleForm.scheduledAtDate} onChange={(e) => setScheduleForm({...scheduleForm, scheduledAtDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Time <span className="text-destructive">*</span></Label>
                <Input type="time" value={scheduleForm.scheduledAtTime} onChange={(e) => setScheduleForm({...scheduleForm, scheduledAtTime: e.target.value})} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (mins)</Label>
                <Input type="number" min="15" step="15" value={scheduleForm.durationMinutes} onChange={(e) => setScheduleForm({...scheduleForm, durationMinutes: parseInt(e.target.value) || 60})} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={scheduleForm.interviewType} onValueChange={(val) => setScheduleForm({...scheduleForm, interviewType: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="Offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Interviewer Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. John Doe (HR Manager)" value={scheduleForm.interviewerName} onChange={(e) => setScheduleForm({...scheduleForm, interviewerName: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>{scheduleForm.interviewType === 'Online' ? 'Meeting Link' : 'Location / Address'} <span className="text-destructive">*</span></Label>
              <Input placeholder={scheduleForm.interviewType === 'Online' ? 'https://meet.google.com/...' : 'Office Room 2A'} value={scheduleForm.locationOrLink} onChange={(e) => setScheduleForm({...scheduleForm, locationOrLink: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Additional Notes (included in email)</Label>
              <Textarea 
                placeholder="e.g. Please bring a copy of your CV and ID card..." 
                value={scheduleForm.notes} 
                onChange={(e) => setScheduleForm({...scheduleForm, notes: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={handlePreviewInterview} disabled={emailPreviewLoading}>
              {emailPreviewLoading ? "Loading..." : "Preview Email"}
            </Button>
            <Button onClick={handleScheduleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Scheduling & Sending..." : "Schedule & Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>

    {/* Edit Candidate Dialog */}
    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Candidate — {candidate.fullName}</DialogTitle>
          <DialogDescription>Update data kandidat di semua tab.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="personal" className="mt-2">
          <TabsList className="mb-4">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            <TabsTrigger value="notes">Notes & Rating</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={editForm.dateOfBirth} onChange={e => setEditForm({...editForm, dateOfBirth: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})}>
                  <option value="">-- Select --</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Input value={editForm.source} onChange={e => setEditForm({...editForm, source: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea rows={2} value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} />
            </div>
          </TabsContent>

          <TabsContent value="onboarding" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>NIK KTP</Label>
                <Input value={editForm.nikKtp} onChange={e => setEditForm({...editForm, nikKtp: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>NPWP Number</Label>
                <Input value={editForm.npwpNumber} onChange={e => setEditForm({...editForm, npwpNumber: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>BPJS Kesehatan</Label>
                <Input value={editForm.bpjsKesehatan} onChange={e => setEditForm({...editForm, bpjsKesehatan: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>BPJS Ketenagakerjaan</Label>
                <Input value={editForm.bpjsKetenagakerjaan} onChange={e => setEditForm({...editForm, bpjsKetenagakerjaan: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input value={editForm.bankName} onChange={e => setEditForm({...editForm, bankName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Bank Account Number</Label>
                <Input value={editForm.bankAccountNumber} onChange={e => setEditForm({...editForm, bankAccountNumber: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact Name</Label>
                <Input value={editForm.emergencyContactName} onChange={e => setEditForm({...editForm, emergencyContactName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact Phone</Label>
                <Input value={editForm.emergencyContactPhone} onChange={e => setEditForm({...editForm, emergencyContactPhone: e.target.value})} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rating (1-5)</Label>
                <Input type="number" min={0} max={5} value={editForm.rating} onChange={e => setEditForm({...editForm, rating: parseInt(e.target.value) || 0})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={4} value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
          <Button onClick={async () => {
            setIsEditSaving(true);
            try {
              const updated = await updateCandidate(candidate.id, {
                fullName: editForm.fullName,
                email: editForm.email,
                phone: editForm.phone,
                dateOfBirth: editForm.dateOfBirth || null,
                gender: editForm.gender,
                address: editForm.address,
                source: editForm.source,
                nikKtp: editForm.nikKtp,
                npwpNumber: editForm.npwpNumber,
                bpjsKesehatan: editForm.bpjsKesehatan,
                bpjsKetenagakerjaan: editForm.bpjsKetenagakerjaan,
                bankName: editForm.bankName,
                bankAccountNumber: editForm.bankAccountNumber,
                emergencyContactName: editForm.emergencyContactName,
                emergencyContactPhone: editForm.emergencyContactPhone,
                notes: editForm.notes,
                rating: editForm.rating,
              });
              toast.success("Candidate updated");
              setIsEditOpen(false);
              router.refresh();
            } catch (e: any) {
              toast.error(e.message || "Failed to update candidate");
            } finally {
              setIsEditSaving(false);
            }
          }} disabled={isEditSaving}>
            {isEditSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      {/* Hire Confirmation Dialog */}
      <Dialog open={isHireOpen} onOpenChange={setIsHireOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Hire</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p>Hire <strong>{candidate.fullName}</strong> for <strong>{candidate.jobTitle || "the position"}</strong>?</p>
            <div className="space-y-2">
              <Label className="text-sm">Tanggal Mulai Kerja</Label>
              <Input type="date" value={hireStartDate} onChange={e => setHireStartDate(e.target.value)} />
              <p className="text-xs text-muted-foreground">Tanggal ini akan dikirim ke kandidat via email onboarding.</p>
            </div>
            <p className="text-sm text-muted-foreground">
              This will create an Employee record with auto-generated NIK and move the candidate to Hired stage.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHireOpen(false)}>Cancel</Button>
            <Button onClick={handleHire} disabled={isHiring}>
              {isHiring ? "Processing..." : "Confirm Hire"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewDoc?.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex justify-center">
            {previewDoc && (
              <img src={previewDoc.url} alt={previewDoc.title} className="max-w-full max-h-[70vh] object-contain rounded-lg border" />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDoc(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule MCU Dialog */}
      <Dialog open={isMcuScheduleOpen} onOpenChange={setIsMcuScheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Medical Checkup</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Clinic <span className="text-destructive">*</span></Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={mcuForm.clinicId}
                onChange={(e) => {
                  const clinic = clinics.find(c => c.id === parseInt(e.target.value));
                  setMcuForm({
                    ...mcuForm,
                    clinicId: e.target.value,
                    klinikName: clinic?.name || "",
                    klinikEmail: clinic?.email || "",
                    paketMcu: "",
                  });
                  setSelectedPaketOptions(clinic?.paketOptions || []);
                }}
              >
                <option value="">-- Select Clinic --</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {clinics.length === 0 && (
                <p className="text-xs text-muted-foreground">No clinics registered. <Link href="/dashboard/hc/settings/mcu-clinics" className="text-accent underline">Add clinics first</Link>.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Clinic Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={mcuForm.klinikEmail} onChange={(e) => setMcuForm({...mcuForm, klinikEmail: e.target.value})} />
              <p className="text-xs text-muted-foreground">Surat Pengantar MCU akan dikirim ke email ini.</p>
            </div>

            <div className="space-y-2">
              <Label>MCU Package <span className="text-destructive">*</span></Label>
              {selectedPaketOptions.length > 0 ? (
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={mcuForm.paketMcu}
                  onChange={(e) => setMcuForm({...mcuForm, paketMcu: e.target.value})}
                >
                  <option value="">-- Select Package --</option>
                  {selectedPaketOptions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              ) : (
                <Input placeholder="e.g. Paket Executive" value={mcuForm.paketMcu} onChange={(e) => setMcuForm({...mcuForm, paketMcu: e.target.value})} />
              )}
            </div>

            <div className="space-y-2">
              <Label>Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={mcuForm.scheduledDate} onChange={(e) => setMcuForm({...mcuForm, scheduledDate: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Penandatangan Surat MCU</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={mcuForm.signatoryName}
                onChange={(e) => {
                  const signer = MCU_SIGNERS.find((item) => item.name === e.target.value) || MCU_SIGNERS[0];
                  setMcuForm({ ...mcuForm, signatoryName: signer.name, signatoryTitle: signer.title, signatureUrl: signer.signatureUrl });
                }}
              >
                {MCU_SIGNERS.map((signer) => (
                  <option key={signer.name} value={signer.name}>{signer.name} — {signer.title}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">TTD akan digambar di PDF Surat Pengantar jika file TTD tersedia.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMcuScheduleOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={handlePreviewMcu} disabled={emailPreviewLoading}>
              {emailPreviewLoading ? "Loading..." : "Preview Email"}
            </Button>
            <Button onClick={handleMcuSubmit} disabled={isMcuSubmitting}>
              {isMcuSubmitting ? "Processing..." : "Schedule & Send Emails"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CV Viewer Dialog */}
      <Dialog open={!!cvViewerUrl} onOpenChange={(open) => { if (!open) setCvViewerUrl(null); }}>
        <DialogContent className="w-[95vw] h-[95vh] max-w-none p-0 gap-0 overflow-hidden flex flex-col" style={{ maxHeight: '95vh' }}>
          <DialogHeader className="px-6 py-3 border-b shrink-0">
            <DialogTitle>CV / Resume — {candidate.fullName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-muted/20" style={{ minHeight: 0, flex: '1 1 0%' }}>
            {cvViewerUrl ? (
              <iframe
                src={cvViewerUrl}
                className="w-full h-full border-0"
                style={{ height: '100%', minHeight: 0 }}
                title={`CV of ${candidate.fullName}`}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
            )}
          </div>
          <DialogFooter className="px-6 py-3 border-t shrink-0">
            <Button variant="outline" onClick={() => setCvViewerUrl(null)}>Close</Button>
            {cvViewerUrl && (
              <Button asChild variant="default">
                <a href={cvViewerUrl} target="_blank" rel="noreferrer">Open in New Tab</a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offering PDF Viewer Dialog */}
      <Dialog open={!!offeringPdfUrl} onOpenChange={(open) => { if (!open) setOfferingPdfUrl(null); }}>
        <DialogContent className="w-[95vw] h-[95vh] max-w-none p-0 gap-0 overflow-hidden flex flex-col" style={{ maxHeight: '95vh' }}>
          <DialogHeader className="px-6 py-3 border-b shrink-0">
            <DialogTitle>Offering Letter — {candidate.fullName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-muted/20" style={{ minHeight: 0, flex: '1 1 0%' }}>
            {offeringPdfUrl ? (
              <iframe src={offeringPdfUrl} className="w-full h-full border-0" style={{ height: '100%', minHeight: 0 }} title={`Offering letter of ${candidate.fullName}`} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
            )}
          </div>
          <DialogFooter className="px-6 py-3 border-t shrink-0">
            <Button variant="outline" onClick={() => setOfferingPdfUrl(null)}>Close</Button>
            {offeringPdfUrl && (
              <Button asChild variant="default">
                <a href={offeringPdfUrl} target="_blank" rel="noreferrer">Open in New Tab</a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MCU Result PDF Preview Dialog */}
      <Dialog open={!!pdfPreviewUrl} onOpenChange={(open) => { if (!open) setPdfPreviewUrl(null); }}>
        <DialogContent className="w-[95vw] h-[95vh] max-w-none p-0 gap-0 overflow-hidden flex flex-col" style={{ maxHeight: '95vh' }}>
          <DialogHeader className="px-6 py-3 border-b shrink-0">
            <DialogTitle>MCU Result PDF — {candidate.fullName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-muted/20" style={{ minHeight: 0, flex: '1 1 0%' }}>
            {pdfPreviewUrl ? (
              <iframe src={pdfPreviewUrl} className="w-full h-full border-0" style={{ height: '100%', minHeight: 0 }} title={`MCU result of ${candidate.fullName}`} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
            )}
          </div>
          <DialogFooter className="px-6 py-3 border-t shrink-0">
            <Button variant="outline" onClick={() => setPdfPreviewUrl(null)}>Close</Button>
            {pdfPreviewUrl && (
              <Button asChild variant="default">
                <a href={pdfPreviewUrl} target="_blank" rel="noreferrer">Open in New Tab</a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Preview Dialog */}
      <Dialog open={emailPreviewOpen} onOpenChange={setEmailPreviewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" style={{ maxHeight: '85vh' }}>
          <DialogHeader className="shrink-0">
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>Subject: {emailPreviewData.subject}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-0 space-y-2">
            {emailPreviewData.html && (
              <div className="border rounded-lg bg-white">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3 pb-1">HTML Preview</div>
                <iframe srcDoc={emailPreviewData.html} className="w-full border-0" style={{ height: '400px' }} title="Email Preview" />
              </div>
            )}
            {emailPreviewData.text && (
              <div className="border rounded-lg bg-white">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-4 pt-3 pb-1">Plain Text</div>
                <pre className="whitespace-pre-wrap break-words p-4 pt-0 font-mono text-sm leading-6 text-slate-900">{emailPreviewData.text}</pre>
              </div>
            )}
            {!emailPreviewData.html && !emailPreviewData.text && (
              <div className="p-6 text-sm text-muted-foreground">No preview content.</div>
            )}
          </div>
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setEmailPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MCU Result Dialog */}
      <Dialog open={mcuResultDialog.open} onOpenChange={(open) => { if (!open) setMcuResultDialog({ open: false, mcuId: null, result: "Fit", notes: "", file: null, resultBy: "" }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record MCU Result — {mcuResultDialog.result}</DialogTitle>
            <DialogDescription>
              {mcuResultDialog.result === "Fit" ? "Confirm candidate is FIT for the position." : "Record reason for UNFIT result."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Recorded By</Label>
              <Input placeholder="Your name" value={mcuResultDialog.resultBy} onChange={e => setMcuResultDialog(prev => ({ ...prev, resultBy: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder={mcuResultDialog.result === "Fit" ? "Optional notes..." : "Reason for unfit result..."} value={mcuResultDialog.notes} onChange={e => setMcuResultDialog(prev => ({ ...prev, notes: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Result File (PDF)</Label>
              <Input type="file" accept="application/pdf" onChange={e => setMcuResultDialog(prev => ({ ...prev, file: e.target.files?.[0] ?? null }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMcuResultDialog({ open: false, mcuId: null, result: "Fit", notes: "", file: null, resultBy: "" })}>Cancel</Button>
            <Button onClick={handleMcuResult} disabled={isMcuResultSubmitting} className={mcuResultDialog.result === "Unfit" ? "bg-red-600 hover:bg-red-700" : ""}>
              {isMcuResultSubmitting ? "Saving..." : `Confirm ${mcuResultDialog.result}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multi-Stage Interview Schedule Modal */}
      <ScheduleInterviewModal
        open={isScheduleStageModalOpen}
        onOpenChange={setIsScheduleStageModalOpen}
        candidateId={candidate.id}
        candidateName={candidate.fullName}
        jobTitle={candidate.vacancyTitle}
        defaultStageName={scheduleStageName}
        onSuccess={() => router.refresh()}
      />

      {/* Interview Settings Modal */}
      <InterviewSettingsModal
        open={isSettingsModalOpen}
        onOpenChange={setIsSettingsModalOpen}
      />
    </>
  );
}
