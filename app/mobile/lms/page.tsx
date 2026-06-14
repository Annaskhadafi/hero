import { redirect } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { BookOpenCheck, Award, Compass, ExternalLink, AlertCircle, Sparkles } from "lucide-react";

import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { getServerSession } from "@/lib/auth-session";
import { getLmsProgressFromDb, syncLmsToTrainingRecords } from "@/lib/lms-mysql";
import { MobileLmsSelector } from "@/components/mobile/mobile-lms-selector";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface LmsCourse {
  course_id: number;
  course_name: string;
  progress: number;
  status: string;
  grade: number | null;
}

function renderStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case "passed":
    case "completed":
      return <Badge className="border-0 bg-[#eaf4fb] text-[#003f78] text-[10px] font-bold">Selesai</Badge>;
    case "failed":
      return <Badge className="border-0 bg-red-100 text-red-700 text-[10px] font-bold">Gagal</Badge>;
    case "in_progress":
    case "enrolled":
      return <Badge className="border-0 bg-[#fff1cf] text-[#8a5a00] text-[10px] font-bold">Belajar</Badge>;
    default:
      return <Badge className="border-0 bg-slate-100 text-slate-700 text-[10px] font-bold">{status}</Badge>;
  }
}

export default async function MobileLmsDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  // Retrieve current employee context
  const [currentEmployee] = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      employeeSn: employees.employeeSn,
      accessRole: employees.accessRole,
    })
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1);

  if (!currentEmployee) {
    return (
      <div className="rounded-[1.2rem] bg-white p-5 text-center text-sm font-semibold text-[#5a2200] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
        Data karyawan Anda belum terdaftar di HERO.
      </div>
    );
  }

  const isSuperAdmin = currentEmployee.accessRole === "Super Admin";
  let targetEmployee = currentEmployee;
  let selectedEmployeeId = "";

  const searchParamsResolved = await searchParams;
  const paramEmployeeId = searchParamsResolved?.employeeId;

  if (isSuperAdmin && paramEmployeeId) {
    const [emp] = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        employeeSn: employees.employeeSn,
        accessRole: employees.accessRole,
      })
      .from(employees)
      .where(eq(employees.id, Number(paramEmployeeId)))
      .limit(1);
    
    if (emp) {
      targetEmployee = emp;
      selectedEmployeeId = String(emp.id);
    }
  }

  // Fetch employee options list for Super Admin selection
  let employeeOptions: any[] = [];
  if (isSuperAdmin) {
    employeeOptions = await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        department: employees.department,
      })
      .from(employees)
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.name));
  }

  const email = targetEmployee.email;
  const sn = targetEmployee.employeeSn || email;
  const employeeName = targetEmployee.name;

  let courses: LmsCourse[] = [];
  let connectionError = false;

  try {
    // Sync LMS data to HERO training records table
    await syncLmsToTrainingRecords(email);

    // Retrieve courses progress directly from LMS DB
    courses = await getLmsProgressFromDb(email, sn);
  } catch (error) {
    console.error("[LMS Mobile DB] Connection error fetching course progress:", error);
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
    <div className="space-y-5">
      <section className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">HC Suite</p>
        <h1 className="text-2xl font-black tracking-tight text-[#003461]">LMS Chitra Learning</h1>
      </section>

      {isSuperAdmin && (
        <section>
          <MobileLmsSelector employees={employeeOptions} selectedId={selectedEmployeeId} />
        </section>
      )}

      {connectionError && (
        <div className="flex items-start gap-3 rounded-[1.2rem] border border-amber-500/20 bg-amber-500/5 p-4 text-amber-800">
          <AlertCircle className="size-5 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="text-xs font-black uppercase tracking-wider">Koneksi LMS Terbatas</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed">
              Gagal memuat progress belajar real-time dari database LMS. Tampilan di bawah mungkin menggunakan cache atau belum diperbarui.
            </p>
          </div>
        </div>
      )}

      <section className="rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Profil Belajar</p>
          <h2 className="mt-1 text-lg font-black text-[#082033]">{employeeName}</h2>
          <p className="mt-1 text-xs font-semibold text-[#486275]">NIK/SN: {targetEmployee.employeeSn || "Belum ada"}</p>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-[1.2rem] bg-[#003f78] p-4 text-white shadow-[0_16px_34px_rgba(0,63,120,0.22)]">
          <BookOpenCheck className="size-5" />
          <p className="mt-3 text-2xl font-black">{totalCourses}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b9dff6]">Total</p>
        </div>
        <div className="rounded-[1.2rem] bg-[#dff2ff] p-4 text-[#003461] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <Award className="size-5" />
          <p className="mt-3 text-2xl font-black">{completedCourses}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Selesai</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 text-[#5a2200] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <Compass className="size-5 text-[#5a2200]" />
          <p className="mt-3 text-2xl font-black">{averageProgress}%</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7a4a32]">Progress</p>
        </div>
      </section>

      <section>
        <a
          href="/api/lms/sso"
          target="_blank"
          className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-[#f0fdf4] border border-[#bbf7d0] px-4 py-4 text-[#14532d] shadow-[0_14px_30px_rgba(20,83,45,0.06)] active:scale-[0.98]"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#166534]">Chitra Learning LMS</p>
            <p className="mt-1 text-base font-black text-[#14532d]">Mulai Belajar di LMS</p>
            <p className="mt-1 text-xs font-semibold text-[#166534]">Akses instan modul pelatihan</p>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#dcfce7] text-[#15803d]">
            <ExternalLink className="size-4" />
          </span>
        </a>
      </section>

      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Progress Kursus Karyawan</p>
        {courses.map((course) => (
          <article key={course.course_id} className="rounded-[1.35rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-[#486275]">ID Kursus: #{course.course_id}</p>
                <h3 className="mt-1 text-sm font-black text-[#082033] line-clamp-2 leading-tight">{course.course_name}</h3>
              </div>
              {renderStatusBadge(course.status)}
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#486275]">Progress</p>
                <div className="mt-1 flex items-center gap-2">
                  <Progress value={course.progress} className="h-1.5 w-full bg-slate-100" />
                  <span className="text-[11px] font-bold text-[#082033] shrink-0 w-8">{course.progress}%</span>
                </div>
              </div>
              <div className="text-right shrink-0 border-l border-dashed border-[#d8e8f3] pl-4">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#486275]">Nilai</p>
                <p className="mt-1 text-sm font-black text-[#003f78]">{course.grade !== null ? course.grade : "-"}</p>
              </div>
            </div>
          </article>
        ))}
        {courses.length === 0 && (
          <div className="rounded-[1.2rem] bg-white p-5 text-center text-sm font-semibold text-[#486275] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            {connectionError 
              ? "Gagal memuat daftar kursus dari server LMS. Pastikan koneksi database aktif."
              : "Belum ada kursus yang diikuti."}
          </div>
        )}
      </section>
    </div>
  );
}
