import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { BookOpen, ExternalLink, AlertCircle, RefreshCw, GraduationCap } from "lucide-react";

import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { getServerSession } from "@/lib/auth-session";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface LmsCourse {
  course_id: number;
  course_name: string;
  progress: number;
  status: string;
  grade: number | null;
}

// Function to map status to visual friendly badges
function renderStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case "passed":
    case "completed":
      return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 border-0 rounded-full px-3 py-1 font-medium">Selesai</Badge>;
    case "failed":
      return <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/10 border-0 rounded-full px-3 py-1 font-medium">Gagal</Badge>;
    case "in_progress":
    case "enrolled":
      return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/10 border-0 rounded-full px-3 py-1 font-medium">Sedang Belajar</Badge>;
    default:
      return <Badge className="bg-slate-500/10 text-slate-600 hover:bg-slate-500/10 border-0 rounded-full px-3 py-1 font-medium">{status}</Badge>;
  }
}

export default async function LmsDashboardPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const email = session.user.email;

  // Retrieve employee info to get NIK/SN
  const [employee] = await db
    .select({
      employeeSn: employees.employeeSn,
      name: employees.name,
    })
    .from(employees)
    .where(eq(employees.email, email))
    .limit(1);

  const sn = employee?.employeeSn || email;
  const employeeName = employee?.name || session.user.name || "Karyawan";

  const secret = process.env.LMS_JWT_SECRET;
  const lmsUrl = process.env.LMS_SITE_URL || "https://chitralearning.com";

  let courses: LmsCourse[] = [];
  let connectionError = false;

  if (secret) {
    try {
      // Fetch course progress with timeout to prevent blocking page rendering
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds timeout

      const apiUrl = `${lmsUrl}/wp-json/hero-lms/v1/progress?email=${encodeURIComponent(email)}&sn=${encodeURIComponent(sn)}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${secret}`,
          Accept: "application/json",
        },
        signal: controller.signal,
        cache: "no-store", // Do not cache, retrieve fresh progress
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        courses = await response.json();
      } else {
        console.error(`[LMS API] Failed to fetch progress: ${response.status} ${response.statusText}`);
        connectionError = true;
      }
    } catch (error) {
      console.error("[LMS API] Connection error fetching course progress:", error);
      connectionError = true;
    }
  } else {
    connectionError = true;
  }

  // Calculate quick metrics
  const totalCourses = courses.length;
  const completedCourses = courses.filter(
    (c) => c.progress === 100 || c.status.toLowerCase() === "completed" || c.status.toLowerCase() === "passed"
  ).length;
  const averageProgress = totalCourses > 0 
    ? Math.round(courses.reduce((sum, c) => sum + c.progress, 0) / totalCourses) 
    : 0;

  return (
    <AdminPageShell
      eyebrow="M7 • Learning Management System"
      title="Chitra Learning LMS"
      description="Sertifikasi, pelatihan mandiri, dan modul pembelajaran karyawan Chitra Paratama."
      badge="Integrasi Real-time"
    >
      <AdminMetricGrid
        mode="compact"
        items={[
          { label: "Total Kursus Diikuti", value: `${totalCourses}`, meta: "Modul pelatihan aktif" },
          { label: "Kursus Selesai", value: `${completedCourses}`, meta: "Sertifikasi berhasil didapatkan" },
          { label: "Rata-rata Progress", value: `${averageProgress}%`, meta: "Penyelesaian materi belajar" },
        ]}
      />

      {connectionError && (
        <Card className="rounded-[1.2rem] border border-amber-500/20 bg-amber-500/5 shadow-none mb-6">
          <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
            <AlertCircle className="size-6 text-amber-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <CardTitle className="text-base text-amber-900 font-semibold">
                Koneksi LMS Terbatas
              </CardTitle>
              <CardDescription className="text-amber-800/80 leading-relaxed text-sm">
                Gagal memuat progress belajar real-time dari {lmsUrl}. Anda tetap dapat membuka LMS dan belajar dengan menekan tombol **Mulai Belajar di LMS** di bawah ini.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-[0_18px_42px_rgba(8,32,51,0.08)] mb-6">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-6">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-xl text-foreground font-semibold">
              <GraduationCap className="size-6 text-primary" />
              Portal Pembelajaran Mandiri
            </CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-relaxed">
              Selamat datang, **{employeeName}** ({sn}). Hubungkan akun HERO Anda ke portal Chitra Learning. Anda tidak perlu memasukkan password secara terpisah di platform LMS.
            </CardDescription>
          </div>
          <Button asChild className="h-11 rounded-xl font-medium px-6 bg-primary hover:bg-primary/90 text-white shadow-sm transition-all flex items-center gap-2 shrink-0">
            <Link href="/api/lms/sso" target="_blank">
              Mulai Belajar di LMS <ExternalLink className="size-4" />
            </Link>
          </Button>
        </CardHeader>
      </Card>

      <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground font-semibold">
            <BookOpen className="size-5 text-primary" />
            Workspace Progress Kursus Anda
          </CardTitle>
          <CardDescription className="text-sm">
            Daftar modul pembelajaran aktif yang terdaftar di akun LMS Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <MinimalTableShell
            label="courses"
            fileName="lms-course-progress"
            searchPlaceholder="Cari nama kursus..."
            dateFilter={false}
            summaryClassName="bg-transparent px-1 py-0 shadow-none mb-3"
            actions={
              <Button asChild variant="outline" className="h-9 rounded-lg border-muted flex items-center gap-1 text-xs font-medium">
                <Link href="/api/lms/sso" target="_blank">
                  Sync & Buka LMS <RefreshCw className="size-3.5" />
                </Link>
              </Button>
            }
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[320px] font-semibold">Nama Kursus</TableHead>
                  <TableHead className="min-w-[240px] font-semibold">Progress Belajar</TableHead>
                  <TableHead className="min-w-[140px] font-semibold">Status</TableHead>
                  <TableHead className="min-w-[120px] font-semibold text-right">Nilai Akhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.length > 0 ? (
                  courses.map((course) => (
                    <TableRow key={course.course_id} className="hover:bg-surface-container-low/70">
                      <TableCell className="align-middle py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground text-sm line-clamp-2">{course.course_name}</p>
                          <p className="text-[11px] text-muted-foreground">ID Kursus: #{course.course_id}</p>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle py-4">
                        <div className="flex items-center gap-3">
                          <Progress value={course.progress} className="h-2 w-full max-w-[180px] bg-slate-100" />
                          <span className="text-xs font-semibold text-foreground shrink-0 w-8">{course.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle py-4">
                        {renderStatusBadge(course.status)}
                      </TableCell>
                      <TableCell className="align-middle py-4 text-right font-semibold text-sm text-foreground pr-6">
                        {course.grade !== null ? course.grade : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground text-sm">
                      {connectionError 
                        ? "Gagal memuat daftar kursus dari server LMS. Pastikan koneksi server WordPress aktif."
                        : "Belum ada kursus yang Anda ikuti di LMS Chitra Learning."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </MinimalTableShell>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
