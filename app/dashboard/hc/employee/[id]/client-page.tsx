"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  IconArrowLeft,
  IconUser,
  IconFileText,
  IconAward,
  IconCalendarEvent,
  IconSchool,
  IconReportMedical,
  IconShield,
  IconAlertCircle,
  IconChecks,
  IconPoint,
  IconHeartbeat,
  IconClock,
  IconScale,
  IconHistory,
  IconFlame,
  IconHierarchy2,
  IconPrinter,
  IconDotsVertical,
  IconSettings
} from "@tabler/icons-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line
} from "recharts";

import { AdminPageShell } from "@/components/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HcWorkspaceBanner } from "@/components/hc/hc-workspace-banner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface EmployeeProfileClientPageProps {
  profile: {
    hrEmployee: {
      id: number;
      employeeId: string;
      fullName: string;
      email: string | null;
      joinDate: string | null;
      contractStart: string | null;
      contractEnd: string | null;
      birthDate: string | null;
      accountStatus: string;
      genderCode: string | null;
      ageBandCode: string | null;
      serviceBandCode: string | null;
      educationCode: string | null;
      demographicEmployeeStatusCode: string | null;
      locationCategoryCode: string | null;
      jobTitle: string | null;
      levelName: string | null;
      departmentName: string | null;
      sectionName: string | null;
      siteName: string | null;
      location: string | null;
      authUserId: string | null;
    };
    gamifiedEmployee: {
      id: number;
      totalPoints: number;
      levelName: string;
      fitStatus: string;
      directManagerId: number | null;
    } | null;
    trainings: any[];
    sioCertifications: any[];
    contractReviews: any[];
    performanceReviews: any[];
    disciplinaryActions: any[];
    points: any[];
    penalties: any[];
    badges: any[];
    totalGamificationPoints: number;
    attendance: any[];
    leaveRequests: any[];
    wellness: any[];
    recruitmentMcu: any[];
    annualMcu?: any[];
    streak: {
      currentStreakDays: number;
      longestStreakDays: number;
    } | null;
    managerName: string | null;
  };
  hrEmployeeId: number;
  embedded?: boolean;
}

export function EmployeeProfileClientPage({
  profile,
  hrEmployeeId,
  embedded = false,
}: EmployeeProfileClientPageProps) {
  const router = useRouter();
  const {
    hrEmployee: emp,
    gamifiedEmployee,
    trainings,
    sioCertifications: sioCertificationsData,
    contractReviews,
    performanceReviews,
    disciplinaryActions,
    points,
    penalties,
    badges,
    totalGamificationPoints,
    attendance,
    leaveRequests,
    wellness,
    recruitmentMcu,
    annualMcu,
    streak,
    managerName,
  } = profile;

  const [activeTab, setActiveTab] = useState("profile");

  // Helper date formatter
  const formatDate = (dateString: string | null | Date) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatGender = (gender: string | null) => {
    if (!gender) return "-";
    const g = gender.toLowerCase().trim();
    if (g === "l" || g === "m" || g === "male" || g === "laki-laki" || g === "laki - laki" || g === "1") return "Laki-laki";
    if (g === "p" || g === "f" || g === "female" || g === "perempuan" || g === "2") return "Perempuan";
    return gender;
  };

  // Helper currency/number formatter
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("id-ID").format(num);
  };

  // Handle print report
  const handlePrint = () => {
    window.print();
  };

  // Calculate Competency Radar Chart data
  const radarData = useMemo(() => {
    if (contractReviews.length > 0) {
      const latestReview = contractReviews[0];
      const parseAch = (ach: string) => {
        if (ach === "Exceed") return 100;
        if (ach === "Meet") return 80;
        if (ach === "Below") return 50;
        return 75;
      };

      return [
        { subject: "Disiplin", A: parseAch(latestReview.compDisciplineAch), fullMark: 100 },
        { subject: "Keahlian", A: parseAch(latestReview.compSkillAch), fullMark: 100 },
        { subject: "Hasil Kerja", A: parseAch(latestReview.compResultAch), fullMark: 100 },
        { subject: "Kualitas", A: parseAch(latestReview.compQualityAch), fullMark: 100 },
        { subject: "Layanan", A: parseAch(latestReview.compCustomerAch), fullMark: 100 },
        { subject: "Kerja Tim", A: parseAch(latestReview.compTeamworkAch), fullMark: 100 },
      ];
    }

    if (performanceReviews.length > 0) {
      const avgScore = parseFloat(performanceReviews[0].overallScore) || 75;
      return [
        { subject: "Disiplin", A: Math.min(100, Math.max(30, avgScore + 5)), fullMark: 100 },
        { subject: "Keahlian", A: Math.min(100, Math.max(30, avgScore)), fullMark: 100 },
        { subject: "Hasil Kerja", A: Math.min(100, Math.max(30, avgScore - 5)), fullMark: 100 },
        { subject: "Kualitas", A: Math.min(100, Math.max(30, avgScore + 2)), fullMark: 100 },
        { subject: "Layanan", A: Math.min(100, Math.max(30, avgScore - 2)), fullMark: 100 },
        { subject: "Kerja Tim", A: Math.min(100, Math.max(30, avgScore + 4)), fullMark: 100 },
      ];
    }

    return [];
  }, [contractReviews, performanceReviews]);

  // Attendance summary metrics
  const attendanceMetrics = useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter((a) => a.status === "present" || a.status === "on-time" || a.status === "wfh").length;
    const late = attendance.filter((a) => a.status === "late").length;
    const absent = attendance.filter((a) => a.status === "absent").length;

    const rate = total > 0 ? Math.round((present / total) * 100) : 100;

    return { total, present, late, absent, rate };
  }, [attendance]);

  // Attendance vs Lateness Monthly Bar Chart
  const monthlyAttendanceData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const currentYear = new Date().getFullYear();
    const dataMap = months.map((m) => ({
      name: m,
      Hadir: 0,
      Terlambat: 0,
      Mangkir: 0,
    }));

    let hasRealData = false;
    for (const record of attendance) {
      if (!record.eventTime) continue;
      const date = new Date(record.eventTime);
      if (date.getFullYear() !== currentYear) continue;
      const monthIndex = date.getMonth();
      hasRealData = true;
      
      if (record.status === "present" || record.status === "on-time" || record.status === "wfh") {
        dataMap[monthIndex].Hadir++;
      } else if (record.status === "late") {
        dataMap[monthIndex].Terlambat++;
      } else if (record.status === "absent") {
        dataMap[monthIndex].Mangkir++;
      }
    }

    return {
      data: dataMap,
      hasRealData,
    };
  }, [attendance]);

  // Wellness Trend Data
  const wellnessTrend = useMemo(() => {
    return wellness
      .slice(0, 10)
      .reverse()
      .map((w) => {
        const date = new Date(w.recordedAt).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
        });

        let pressureSystolic = 120;
        let pressureDiastolic = 80;
        if (w.metricType === "blood_pressure" && w.metricValue.includes("/")) {
          const parts = w.metricValue.split("/");
          pressureSystolic = parseInt(parts[0], 10) || 120;
          pressureDiastolic = parseInt(parts[1], 10) || 80;
        }

        return {
          date,
          systolic: pressureSystolic,
          diastolic: pressureDiastolic,
          notes: w.notes,
        };
      });
  }, [wellness]);

  // Contract status calculation
  const contractStatus = useMemo(() => {
    if (!emp.contractEnd) return { label: "Permanen / PKWTT", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
    const end = new Date(emp.contractEnd);
    const today = new Date();
    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { label: "Kontrak Berakhir", color: "bg-rose-500/10 text-rose-500 border-rose-500/20" };
    if (diffDays <= 30) return { label: "Habis < 30 Hari", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
    return { label: "Kontrak Aktif", color: "bg-sky-500/10 text-sky-500 border-sky-500/20" };
  }, [emp.contractEnd]);

  return (
    <AdminPageShell
      title="Profil Produktivitas Karyawan"
      eyebrow="Profil & Kepegawaian"
      description="Analisis performa, riwayat pelatihan, absensi, dan kesehatan karyawan dalam satu panel terpadu."
      actions={
        <div className="flex items-center gap-2 no-print">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <IconPrinter className="w-4 h-4 mr-2" /> Cetak Profil
          </Button>
          
          {/* Quick Actions Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100">
                <IconSettings className="w-4 h-4 mr-2" /> Aksi Cepat
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Manajemen Karyawan</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/dashboard/leaderboard")}>
                <IconPoint className="w-4 h-4 mr-2 text-amber-500" /> Beri Poin Pekerjaan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/dashboard/hc/disciplinary")}>
                <IconScale className="w-4 h-4 mr-2 text-rose-500" /> Terbitkan SP / Sanksi
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/dashboard/hc/contract-review")}>
                <IconFileText className="w-4 h-4 mr-2 text-violet-500" /> Review Kontrak
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/hc/employee")}>
            <IconArrowLeft className="w-4 h-4 mr-2" /> Kembali
          </Button>
        </div>
      }
    >
      {/* Dynamic Printing Style overrides */}
      <style jsx global>{`
        ${embedded ? `
          [data-slot="sidebar"],
          [data-slot="sidebar-gap"],
          [data-admin-dashboard-shell] > header,
          .no-print {
            display: none !important;
          }
          [data-slot="sidebar-inset"] {
            margin: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          [data-admin-dashboard-shell] > div {
            min-height: 100vh;
          }
          body {
            background: #f8fafc !important;
          }
        ` : ''}
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print, header, nav, footer, button, .dropdown-menu {
            display: none !important;
          }
          .pdf-wrapper {
            font-size: 10pt !important;
            font-family: Arial, sans-serif !important;
            max-width: 100% !important;
            padding: 10mm !important;
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          .print-layout {
            display: flex !important;
            flex-direction: column !important;
            gap: 20px !important;
          }
          /* Force expand all tabs for paper printout */
          .tabs-content-print {
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
            margin-bottom: 24px !important;
            page-break-inside: avoid !important;
          }
          .tabs-list-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="pdf-wrapper print-layout">
        
        {/* ─── Profile Header Glassmorphism Card ──────────────────────────────── */}
        <div className="relative overflow-hidden rounded-[1.5rem] border border-white/20 bg-slate-900/90 p-6 text-white shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90 mb-6 print:bg-slate-950 print:text-white print:border-slate-800">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl no-print" />
          <div className="absolute left-1/3 bottom-0 -mb-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl no-print" />

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
              <div className="grid size-20 place-items-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-3xl font-bold text-white shadow-lg shadow-indigo-500/30 print:shadow-none">
                {emp.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                  <h1 className="text-2xl font-bold tracking-tight">{emp.fullName}</h1>
                  <Badge className={cn("border px-2.5 py-0.5 rounded-full text-xs font-semibold", contractStatus.color)}>
                    {contractStatus.label}
                  </Badge>
                </div>
                <p className="text-white/70 mt-1 font-medium">{emp.jobTitle || "Posisi belum ditentukan"} • {emp.departmentName || "HC"}</p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-sm text-white/50 print:text-white/70">
                  <span>NIK: <strong>{emp.employeeId}</strong></span>
                  <span>•</span>
                  <span>Bergabung: <strong>{formatDate(emp.joinDate)}</strong></span>
                  <span>•</span>
                  <span>Lokasi: <strong>{emp.location || emp.siteName || "-"}</strong></span>
                </div>
              </div>
            </div>

            {/* Gamification Streak & Points widgets */}
            <div className="flex flex-row items-center gap-4 w-full md:w-auto justify-center border-t border-white/10 md:border-t-0 pt-4 md:pt-0">
              {streak && streak.currentStreakDays > 0 && (
                <div className="flex flex-col items-center px-4 py-2 bg-gradient-to-br from-amber-500/10 to-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20 backdrop-blur">
                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold flex items-center gap-0.5">
                    <IconFlame className="size-3 text-orange-500 fill-orange-500" /> Streak
                  </span>
                  <span className="text-2xl font-bold text-orange-500 mt-0.5 animate-pulse">
                    {streak.currentStreakDays} Hari
                  </span>
                </div>
              )}
              <div className="flex flex-col items-center px-4 py-2 bg-white/5 rounded-xl border border-white/10 backdrop-blur">
                <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Total Poin</span>
                <span className="text-2xl font-bold text-amber-400 mt-0.5 flex items-center gap-0.5">
                  <IconPoint className="size-5 fill-current text-amber-400" />
                  {formatNumber(totalGamificationPoints)}
                </span>
              </div>
              <div className="flex flex-col items-center px-4 py-2 bg-white/5 rounded-xl border border-white/10 backdrop-blur">
                <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Lencana</span>
                <span className="text-2xl font-bold text-violet-400 mt-0.5 flex items-center gap-1">
                  <IconAward className="size-5 text-violet-400" />
                  {badges.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Grid Dashboard: Radar Kompetensi & Summary Widgets ────────────── */}
        <div className="grid gap-6 md:grid-cols-3 mb-6 print:grid-cols-2">
          {/* Radar Kompetensi Card */}
          <Card className="md:col-span-2 overflow-hidden border-violet-100 bg-gradient-to-b from-white to-violet-50/20 print:col-span-1">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-violet-100 p-1.5 text-violet-600">
                  <IconChecks className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Radar Kompetensi Karyawan</CardTitle>
                  <CardDescription className="text-xs">Pemetaan kompetensi berdasarkan evaluasi berkala dan performa</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[280px]">
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 9 }} />
                    <Radar name={emp.fullName} dataKey="A" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} />
                    <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px", border: "1px solid #ddd" }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
                  <IconChecks className="size-8 text-muted-foreground/30" />
                  <span className="text-xs">Belum ada data evaluasi kinerja atau kompetensi di database</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Info & Health Alerts */}
          <div className="flex flex-col gap-6 print:col-span-1">
            {/* Org Hierachy card */}
            <Card className="flex-1 border-indigo-100 bg-gradient-to-b from-white to-indigo-50/20">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-indigo-100 p-1.5 text-indigo-600">
                    <IconHierarchy2 className="size-5" />
                  </div>
                  <CardTitle className="text-sm font-bold">Hierarki Organisasi</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm pt-2 space-y-2">
                <div className="flex items-center justify-between border-b border-indigo-100/50 pb-2">
                  <span className="text-muted-foreground">Manager Langsung</span>
                  <span className="font-semibold text-foreground text-right">{managerName || "Belum Ditugaskan"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tingkat Jabatan</span>
                  <span className="font-semibold text-indigo-700 text-right">{emp.levelName || "Rookie"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Wellness Summary */}
            <Card className="flex-1 border-rose-100 bg-gradient-to-b from-white to-rose-50/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-rose-100 p-1.5 text-rose-600">
                      <IconHeartbeat className="size-5" />
                    </div>
                    <CardTitle className="text-sm font-bold">Status Kesehatan</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 border-emerald-200">
                    {gamifiedEmployee?.fitStatus === "fit" ? "Sangat Fit" : "Fit"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-rose-100/50 pb-2">
                  <span className="text-muted-foreground">Tekanan Darah</span>
                  <span className="font-semibold text-foreground">
                    {wellness.length > 0 && wellness[0].metricType === "blood_pressure" ? wellness[0].metricValue : "120/80"} mmHg
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rekomendasi Medis</span>
                  <span className="font-semibold text-rose-600 truncate max-w-[150px]" title={recruitmentMcu[0]?.recommendations || "Jaga Kebugaran"}>
                    {recruitmentMcu[0]?.recommendations || "Jaga Kebugaran"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ─── Tabs Layout & Content ────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-7 h-auto p-1.5 gap-1 bg-surface-container-low border rounded-2xl mb-6 tabs-list-print">
            <TabsTrigger value="profile" className="flex items-center gap-1.5 py-2 px-3 text-xs font-medium rounded-xl">
              <IconUser className="size-4" /> Profil
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-1.5 py-2 px-3 text-xs font-medium rounded-xl">
              <IconCalendarEvent className="size-4" /> Absensi
            </TabsTrigger>
            <TabsTrigger value="points" className="flex items-center gap-1.5 py-2 px-3 text-xs font-medium rounded-xl">
              <IconAward className="size-4" /> Poin
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-1.5 py-2 px-3 text-xs font-medium rounded-xl">
              <IconSchool className="size-4" /> Pelatihan
            </TabsTrigger>
            <TabsTrigger value="evaluation" className="flex items-center gap-1.5 py-2 px-3 text-xs font-medium rounded-xl">
              <IconFileText className="size-4" /> Evaluasi
            </TabsTrigger>
            <TabsTrigger value="discipline" className="flex items-center gap-1.5 py-2 px-3 text-xs font-medium rounded-xl">
              <IconScale className="size-4" /> Disiplin
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-1.5 py-2 px-3 text-xs font-medium rounded-xl">
              <IconReportMedical className="size-4" /> MCU
            </TabsTrigger>
          </TabsList>

          {/* 1. Profil & Kontrak */}
          <TabsContent value="profile" className="space-y-6 tabs-content-print">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold">Data Diri & Kepegawaian</CardTitle>
                  <CardDescription className="text-xs">Informasi fundamental identitas karyawan</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Nama Lengkap</span>
                    <span className="font-semibold text-foreground text-right">{emp.fullName}</span>
                  </div>
                  <div className="grid grid-cols-2 py-2 border-b border-border/50">
                    <span className="text-muted-foreground">E-mail</span>
                    <span className="font-semibold text-foreground text-right">{emp.email || "-"}</span>
                  </div>
                  <div className="grid grid-cols-2 py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Jenis Kelamin</span>
                    <span className="font-semibold text-foreground text-right">{formatGender(emp.genderCode)}</span>
                  </div>
                  <div className="grid grid-cols-2 py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Tanggal Lahir</span>
                    <span className="font-semibold text-foreground text-right">{formatDate(emp.birthDate)}</span>
                  </div>
                  <div className="grid grid-cols-2 py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Pendidikan Terakhir</span>
                    <span className="font-semibold text-foreground text-right">{emp.educationCode || "-"}</span>
                  </div>
                  <div className="grid grid-cols-2 py-2">
                    <span className="text-muted-foreground">Manager Langsung</span>
                    <span className="font-semibold text-foreground text-right">{managerName || "-"}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold">Detail Penempatan & Kontrak Kerja</CardTitle>
                  <CardDescription className="text-xs">Periode ikatan kerja dan struktur divisi</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Site / Proyek</span>
                    <span className="font-semibold text-foreground text-right">{emp.siteName || "-"}</span>
                  </div>
                  <div className="grid grid-cols-2 py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Departemen</span>
                    <span className="font-semibold text-foreground text-right">{emp.departmentName || "-"}</span>
                  </div>
                  <div className="grid grid-cols-2 py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Seksi / Section</span>
                    <span className="font-semibold text-foreground text-right">{emp.sectionName || "-"}</span>
                  </div>
                  <div className="grid grid-cols-2 py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Mulai Kontrak</span>
                    <span className="font-semibold text-foreground text-right">{formatDate(emp.contractStart)}</span>
                  </div>
                  <div className="grid grid-cols-2 py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Akhir Kontrak</span>
                    <span className="font-semibold text-foreground text-right">{formatDate(emp.contractEnd)}</span>
                  </div>
                  <div className="grid grid-cols-2 py-2">
                    <span className="text-muted-foreground">Band Masa Kerja</span>
                    <span className="font-semibold text-foreground text-right">{emp.serviceBandCode || "-"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 2. Absensi & Cuti */}
          <TabsContent value="attendance" className="space-y-6 tabs-content-print">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Monthly Attendance vs Lateness bar chart */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Tren Kehadiran vs Keterlambatan Bulanan</CardTitle>
                  <CardDescription className="text-xs">Statistik pola kerja karyawan sepanjang tahun berjalan</CardDescription>
                </CardHeader>
                <CardContent className="h-[260px] pt-4">
                  {monthlyAttendanceData.hasRealData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyAttendanceData.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                        <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Bar dataKey="Hadir" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Terlambat" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Mangkir" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
                      <IconCalendarEvent className="size-8 text-muted-foreground/30" />
                      <span className="text-xs">Belum ada riwayat presensi tercatat di database</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Ringkasan Absensi</CardTitle>
                  <CardDescription className="text-xs">Statistik absensi akumulatif</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-1.5"><IconChecks className="size-4 text-emerald-500" /> Tepat Waktu</span>
                    <span className="font-bold text-emerald-600">{attendanceMetrics.present} Hari</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-1.5"><IconClock className="size-4 text-amber-500" /> Terlambat</span>
                    <span className="font-bold text-amber-600">{attendanceMetrics.late} Hari</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-1.5"><IconAlertCircle className="size-4 text-rose-500" /> Absen / Mangkir</span>
                    <span className="font-bold text-rose-600">{attendanceMetrics.absent} Hari</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Total Pengajuan Cuti</span>
                    <span className="font-bold text-foreground">{leaveRequests.length} Pengajuan</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 3. Poin & Gamifikasi */}
          <TabsContent value="points" className="space-y-6 tabs-content-print">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Lencana Penghargaan</CardTitle>
                  <CardDescription className="text-xs">Medali apresiasi atas prestasi karyawan</CardDescription>
                </CardHeader>
                <CardContent>
                  {badges.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <IconAward className="size-8 text-muted-foreground/50 mb-2" />
                      <span className="text-xs">Belum memperoleh lencana penghargaan</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {badges.map((b) => (
                        <div
                          key={b.id}
                          className="flex flex-col items-center p-3 rounded-2xl border text-center relative overflow-hidden group shadow-sm bg-gradient-to-br from-white to-slate-50"
                          style={{ borderColor: `${b.badgeColorCode}30` }}
                        >
                          <div
                            className="size-10 rounded-xl flex items-center justify-center mb-2 shadow-sm"
                            style={{ backgroundColor: `${b.badgeColorCode}15`, color: b.badgeColorCode }}
                          >
                            <IconAward className="size-6" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 line-clamp-1">{b.badgeName}</span>
                          <span className="text-[9px] text-muted-foreground line-clamp-1">{b.badgeDescription}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Riwayat Transaksi Poin Pekerjaan</CardTitle>
                  <CardDescription className="text-xs">Catatan perolehan poin dari aktivitas harian</CardDescription>
                </CardHeader>
                <CardContent>
                  {points.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <IconHistory className="size-8 text-muted-foreground/50 mb-2" />
                      <span className="text-xs">Belum ada riwayat aktivitas poin</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[300px] overflow-y-auto pr-1">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Tanggal</TableHead>
                            <TableHead className="text-xs">Kategori</TableHead>
                            <TableHead className="text-xs">Aktivitas</TableHead>
                            <TableHead className="text-xs text-right">Poin</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {points.map((p) => (
                            <TableRow key={p.id} className="text-xs">
                              <TableCell>{formatDate(p.createdAt)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] uppercase font-semibold border-slate-200">
                                  {p.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium text-slate-800">{p.label}</TableCell>
                              <TableCell className={cn("text-right font-bold", p.transactionType === "deduction" ? "text-rose-600" : "text-emerald-600")}>
                                {p.transactionType === "deduction" ? "-" : "+"}{p.points} Poin
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 4. Pelatihan */}
          <TabsContent value="training" className="space-y-6 tabs-content-print">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Sertifikasi & Pelatihan Karyawan</CardTitle>
                <CardDescription className="text-xs">Kumpulan kompetensi yang telah divalidasi</CardDescription>
              </CardHeader>
              <CardContent>
                {trainings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <IconSchool className="size-10 text-muted-foreground/30 mb-2 animate-bounce" />
                    <span className="text-sm font-medium">Belum ada sertifikat pelatihan terdaftar</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama Pelatihan</TableHead>
                          <TableHead>Penyelenggara (Provider)</TableHead>
                          <TableHead>Tahun Lulus</TableHead>
                          <TableHead>Masa Berlaku</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trainings.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="font-semibold text-slate-800">{t.trainingName}</TableCell>
                            <TableCell>{t.provider}</TableCell>
                            <TableCell>{t.completedYear}</TableCell>
                            <TableCell>{t.expiresAt ? formatDate(t.expiresAt) : "Seumur Hidup"}</TableCell>
                            <TableCell>
                              <Badge className={cn("text-xs font-semibold rounded-full px-2 py-0.5",
                                t.status === "active" || t.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                              )}>
                                {t.status === "active" || t.status === "completed" ? "Valid" : "Proses"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SIO / POP / POM Certifications */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Sertifikasi SIO / POP / POM</CardTitle>
                <CardDescription className="text-xs">Sertifikasi alat berat dan izin operasi</CardDescription>
              </CardHeader>
              <CardContent>
                {(!sioCertificationsData || sioCertificationsData.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <IconShield className="size-10 text-muted-foreground/30 mb-2" />
                    <span className="text-sm font-medium">Belum ada sertifikasi SIO/POP/POM</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipe</TableHead>
                          <TableHead>Sertifikat</TableHead>
                          <TableHead>Penerbit</TableHead>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Masa Berlaku</TableHead>
                          <TableHead>Sisa Hari</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sioCertificationsData.map((c: any) => {
                          const days = c.expiryDate ? Math.ceil((new Date(c.expiryDate).getTime() - Date.now()) / 86400000) : null
                          return (
                            <TableRow key={c.id}>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] border-muted">{c.certType}</Badge>
                              </TableCell>
                              <TableCell className="font-semibold text-slate-800">
                                {c.certName}
                                {c.certNumber && <span className="text-muted-foreground ml-1 text-xs">#{c.certNumber}</span>}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{c.issuingBody || '-'}</TableCell>
                              <TableCell className="text-xs">{c.certDate ? formatDate(c.certDate) : '-'}</TableCell>
                              <TableCell className="text-xs">{c.expiryDate ? formatDate(c.expiryDate) : '-'}</TableCell>
                              <TableCell className="text-xs">
                                {days !== null ? (
                                  <span className={cn(days <= 0 ? 'text-rose-600 font-bold' : days <= 30 ? 'text-amber-600 font-bold' : 'text-emerald-600')}>
                                    {days <= 0 ? `${Math.abs(days)} hr lewat` : `${days} hr`}
                                  </span>
                                ) : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge className={cn("text-xs font-semibold rounded-full px-2 py-0.5",
                                  c.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                                  c.status === 'expiring_soon' ? 'bg-amber-100 text-amber-800' :
                                  'bg-rose-100 text-rose-800'
                                )}>
                                  {c.status === 'active' ? 'Aktif' : c.status === 'expiring_soon' ? 'Hampir Berakhir' : 'Expired'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 5. Evaluasi & Kontrak */}
          <TabsContent value="evaluation" className="space-y-6 tabs-content-print">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold">Riwayat Evaluasi Kontrak (Probation/PKWT)</CardTitle>
                  <CardDescription className="text-xs">Hasil review perpanjangan kerja karyawan</CardDescription>
                </CardHeader>
                <CardContent>
                  {contractReviews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <IconFileText className="size-8 text-muted-foreground/50 mb-2" />
                      <span className="text-xs">Belum ada riwayat review kontrak</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {contractReviews.map((r) => (
                        <div key={r.id} className="p-4 rounded-2xl border bg-slate-50 border-slate-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-800 capitalize">{r.reviewType} Review</span>
                            <span className="text-xs text-muted-foreground">{formatDate(r.todayDate)}</span>
                          </div>
                          <div className="text-xs text-slate-600 space-y-1.5">
                            <div className="flex justify-between">
                              <span>Rekomendasi</span>
                              <span className="font-semibold text-violet-700">{r.recommendation.replace(/_/g, ' ').toUpperCase()}</span>
                            </div>
                            {r.contractExtendedMonths && (
                              <div className="flex justify-between">
                                <span>Perpanjangan</span>
                                <span className="font-semibold">{r.contractExtendedMonths} Bulan</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span>Evaluator / Superior</span>
                              <span className="font-medium">{r.superiorName}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold">Hasil Penilaian Kinerja Tahunan</CardTitle>
                  <CardDescription className="text-xs">Skor evaluasi dari Performance Cycle</CardDescription>
                </CardHeader>
                <CardContent>
                  {performanceReviews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <IconChecks className="size-8 text-muted-foreground/50 mb-2" />
                      <span className="text-xs">Belum ada penilaian kinerja tahunan terdaftar</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {performanceReviews.map((pr) => (
                        <div key={pr.id} className="p-4 rounded-2xl border bg-gradient-to-r from-violet-50/20 to-indigo-50/20 border-violet-100/60 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-bold text-slate-800">{pr.cycleName}</span>
                              <p className="text-[10px] text-muted-foreground">Tahun Periode: {pr.cycleYear}</p>
                            </div>
                            <Badge className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-2 py-0.5 rounded-full text-xs">
                              Skor: {pr.overallScore}
                            </Badge>
                          </div>
                          <div className="text-xs space-y-1.5 text-slate-700">
                            <div className="flex justify-between">
                              <span>Rating Kualitatif</span>
                              <span className="font-bold text-indigo-600">{pr.overallRating}</span>
                            </div>
                            <div>
                              <span className="font-semibold block text-[10px] text-muted-foreground uppercase tracking-wider">Kekuatan (Strengths)</span>
                              <p className="mt-0.5 italic text-slate-600">{pr.strengths || "-"}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 6. Kedisiplinan & SP */}
          <TabsContent value="discipline" className="space-y-6 tabs-content-print">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Riwayat Surat Peringatan (SP)</CardTitle>
                  <CardDescription className="text-xs">Laporan sanksi pelanggaran kedisiplinan resmi</CardDescription>
                </CardHeader>
                <CardContent>
                  {disciplinaryActions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                      <IconScale className="size-10 text-muted-foreground/30 mb-2" />
                      <span className="text-sm font-medium">Bebas dari Surat Peringatan (SP)</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Sanksi</TableHead>
                            <TableHead className="text-xs">Nomor Surat</TableHead>
                            <TableHead className="text-xs">Kategori Pelanggaran</TableHead>
                            <TableHead className="text-xs">Tanggal Pelanggaran</TableHead>
                            <TableHead className="text-xs">Masa Berlaku SP</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {disciplinaryActions.map((da) => (
                            <TableRow key={da.id} className="text-xs">
                              <TableCell className="font-bold text-rose-600">SP {da.spLevel}</TableCell>
                              <TableCell className="font-mono">{da.letterNumber || "-"}</TableCell>
                              <TableCell className="font-medium text-slate-800">{da.violationName || "-"}</TableCell>
                              <TableCell>{formatDate(da.violationDate)}</TableCell>
                              <TableCell>{formatDate(da.effectiveDate)} - {da.expiryDate ? formatDate(da.expiryDate) : "Permanen"}</TableCell>
                              <TableCell>
                                <Badge className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full",
                                  da.status === "active" ? "bg-rose-500 text-white" : "bg-slate-200 text-slate-600"
                                )}>
                                  {da.status === "active" ? "Aktif" : "Kedaluwarsa"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Riwayat Pengurangan Poin (Penalti)</CardTitle>
                  <CardDescription className="text-xs">Denda poin gamifikasi akibat pelanggaran kecil</CardDescription>
                </CardHeader>
                <CardContent>
                  {penalties.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <IconShield className="size-8 text-muted-foreground/30 mb-2" />
                      <span className="text-xs">Tidak ada denda poin terdaftar</span>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {penalties.map((p) => (
                        <div key={p.id} className="p-3 border rounded-xl bg-slate-50 border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-800">{p.penaltyType}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDate(p.referenceDate)}</p>
                          </div>
                          <span className="font-bold text-rose-600">-{p.pointsDeducted} Poin</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 7. Kesehatan (MCU & Wellness) */}
          <TabsContent value="health" className="space-y-6 tabs-content-print">
            {/* Annual MCU Wellness (post-hire) */}
            {annualMcu && annualMcu.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold">Riwayat MCU Tahunan (Wellness Advance)</CardTitle>
                  <CardDescription className="text-xs">Medical Check Up tahunan karyawan + AI extraction</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-xs">
                    {annualMcu.map((mcu: any) => (
                      <div key={mcu.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50/40 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800">MCU {formatDate(mcu.mcuDate)}</span>
                          <Badge
                            className={
                              mcu.status === "fit"
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : mcu.status === "unfit"
                                ? "bg-rose-600 hover:bg-rose-700 text-white"
                                : "bg-amber-500 hover:bg-amber-600 text-white"
                            }
                          >
                            {mcu.aiKategori || mcu.status}
                          </Badge>
                        </div>
                        <div className="text-slate-600 space-y-1">
                          <div className="flex justify-between">
                            <span>Klinik</span>
                            <span className="font-medium">{mcu.clinicName || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Paket</span>
                            <span className="font-medium">{mcu.paketMcu || "-"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>MCU Berikutnya</span>
                            <span className="font-medium">{formatDate(mcu.nextMcuDue)}</span>
                          </div>
                        </div>
                        {mcu.aiKesimpulan && (
                          <p className="text-slate-700"><span className="font-semibold">Kesimpulan AI:</span> {mcu.aiKesimpulan}</p>
                        )}
                        {mcu.aiSaran && (
                          <p className="text-slate-600"><span className="font-semibold">Saran:</span> {mcu.aiSaran}</p>
                        )}
                        {mcu.resultFileUrl && (
                          <a
                            href={mcu.resultFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#003461] font-semibold underline"
                          >
                            <IconReportMedical className="size-3.5" /> Lihat Dokumen
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 md:grid-cols-3">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Hasil MCU Rekrutmen Awal</CardTitle>
                  <CardDescription className="text-xs">Pemeriksaan medis awal masuk kerja</CardDescription>
                </CardHeader>
                <CardContent>
                  {recruitmentMcu.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <IconReportMedical className="size-8 text-muted-foreground/30 mb-2" />
                      <span className="text-xs">Data MCU rekrutmen tidak ditemukan</span>
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs">
                      {recruitmentMcu.map((mcu) => (
                        <div key={mcu.id} className="p-4 border border-rose-100 rounded-2xl bg-rose-50/10 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">MCU Fit Test</span>
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">{mcu.status}</Badge>
                          </div>
                          <div className="text-slate-600 space-y-1 mt-2">
                            <div className="flex justify-between">
                              <span>Klinik Pemeriksa</span>
                              <span className="font-medium">{mcu.klinikName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Paket MCU</span>
                              <span className="font-medium">{mcu.paketMcu}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tanggal Uji</span>
                              <span className="font-medium">{formatDate(mcu.resultDate)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base font-bold">Grafik Tekanan Darah (Wellness Records)</CardTitle>
                  <CardDescription className="text-xs">Tren pemantauan vitalitas kesehatan bulanan</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px]">
                  {wellnessTrend.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <IconHeartbeat className="size-8 text-muted-foreground/30 mb-2" />
                      <span className="text-xs">Belum ada riwayat rekam medis wellness bulanan</span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={wellnessTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} />
                        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                        <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        <Line name="Sistolik (Atas)" type="monotone" dataKey="systolic" stroke="#f43f5e" strokeWidth={2.5} activeDot={{ r: 6 }} />
                        <Line name="Diastolik (Bawah)" type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={2.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminPageShell>
  );
}
