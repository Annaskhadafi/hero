import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { BookOpen, ExternalLink, AlertCircle, RefreshCw, GraduationCap } from "lucide-react";

import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { getServerSession } from "@/lib/auth-session";
import { AdminPageShell } from "@/components/admin-page-shell";
import { getAllLmsProgressFromDb, syncLmsToTrainingRecords } from "@/lib/lms-mysql";
import { LmsGroupedTable } from "@/components/lms-grouped-table";
import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Button } from "@/components/ui/button";



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

  const lmsUrl = process.env.LMS_SITE_URL || "https://chitralearning.com";

  // Fetch HERO employees to map WordPress users to official HERO data
  const employeeRows = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      email: employees.email,
      department: employees.department,
    })
    .from(employees);

  const employeesByEmail = new Map<string, typeof employeeRows[number]>();
  const employeesBySn = new Map<string, typeof employeeRows[number]>();

  for (const emp of employeeRows) {
    if (emp.email) {
      employeesByEmail.set(emp.email.toLowerCase().trim(), emp);
    }
    if (emp.employeeSn) {
      employeesBySn.set(emp.employeeSn.toLowerCase().trim(), emp);
    }
  }

  let lmsRecords: any[] = [];
  let connectionError = false;

  try {
    // Sync currently logged in user's LMS records
    await syncLmsToTrainingRecords(email);

    // Retrieve all progress records from LMS DB
    const rawRecords = await getAllLmsProgressFromDb();

    // Map raw records to HERO employee data
    lmsRecords = rawRecords.map((rec: any) => {
      let matchedEmployee = null;

      if (rec.user_email) {
        matchedEmployee = employeesByEmail.get(rec.user_email.toLowerCase().trim());
      }
      
      if (!matchedEmployee && rec.user_login) {
        matchedEmployee = employeesBySn.get(rec.user_login.toLowerCase().trim());
      }

      return {
        ...rec,
        employeeName: matchedEmployee?.name || rec.display_name || "Karyawan Lainnya",
        employeeSn: matchedEmployee?.employeeSn || rec.user_login || "-",
        department: matchedEmployee?.department || "Lainnya",
      };
    });
  } catch (error) {
    console.error("[LMS DB] Connection error fetching all LMS progress:", error);
    connectionError = true;
  }

  // Calculate quick metrics across all records
  const totalCourses = new Set(lmsRecords.map((r) => r.course_id)).size;
  const totalStudents = new Set(lmsRecords.map((r) => r.user_email)).size;
  const completedRecords = lmsRecords.filter(
    (c) => c.progress === 100 || c.status.toLowerCase() === "completed" || c.status.toLowerCase() === "passed"
  ).length;

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
          { label: "Total Kursus Terdaftar", value: `${totalCourses}`, meta: "Modul pelatihan aktif" },
          { label: "Karyawan Belajar", value: `${totalStudents}`, meta: "Karyawan aktif belajar" },
          { label: "Modul Terselesaikan", value: `${completedRecords}`, meta: "Sertifikasi berhasil didapatkan" },
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
            Workspace Progress Kursus Karyawan
          </CardTitle>
          <CardDescription className="text-sm">
            Daftar seluruh progress modul pembelajaran karyawan Chitra Paratama.
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
            <LmsGroupedTable lmsRecords={lmsRecords} connectionError={connectionError} />
          </MinimalTableShell>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
