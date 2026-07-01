import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  AlertCircle,
  Award,
  BarChart3,
  BellRing,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  Copy,
  Download,
  Eye,
  ExternalLink,
  FileText,
  GraduationCap,
  HelpCircle,
  History,
  Layers,
  ListChecks,
  LockKeyhole,
  PlayCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  Target,
  Users,
  Zap,
} from "lucide-react";

import {
  cloneInternalLmsCourseAction,
  createInternalLmsAccessRuleAction,
  createInternalLmsCampaignAction,
  createInternalLmsCourseAction,
  createInternalLmsLessonAction,
  createInternalLmsQuizQuestionAction,
  duplicateInternalLmsQuestionAction,
  issueInternalLmsCertificateAction,
  publishInternalLmsCampaignAction,
  restartInternalLmsMaterialAction,
  runInternalLmsReminderAction,
  startInternalLmsCourseAction,
  submitInternalLmsAssignmentResponseAction,
  submitInternalLmsQuizAction,
  updateInternalLmsCourseGovernanceAction,
} from "@/app/dashboard/chitralearning-lms/actions";
import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { ChitraLearningVideoPlayer } from "@/components/chitralearning-video-player";
import { LmsGroupedTable } from "@/components/lms-grouped-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { getServerSession } from "@/lib/auth-session";
import {
  buildInternalLmsComplianceRows,
  buildInternalLmsLearnerCourses,
  buildInternalLmsRefreshmentRows,
  buildInternalLmsRoleMatrix,
  getInternalLmsWorkspaceData,
  type InternalLmsWorkspaceData,
  INTERNAL_LMS_ACCESS_TYPES,
  INTERNAL_LMS_CAMPAIGN_TARGET_TYPES,
  INTERNAL_LMS_CAMPAIGN_TYPES,
  INTERNAL_LMS_FEATURES,
  INTERNAL_LMS_LESSON_TYPES,
  INTERNAL_LMS_RECURRENCE_OPTIONS,
  INTERNAL_LMS_TEST_PHASES,
  summarizeInternalLmsCompliance,
  summarizeInternalLmsRefreshments,
} from "@/lib/chitralearning-lms";
import { getAllLmsProgressFromDb } from "@/lib/lms-mysql";

type LmsProgressRecord = {
  course_id: number;
  course_name: string;
  user_email: string;
  display_name: string;
  user_login: string;
  progress: number;
  status: string;
  grade: number | null;
  startTime: number | null;
  endTime: number | null;
  employeeName: string;
  employeeSn: string;
  department: string;
  section: string;
};

type CourseSummary = {
  courseId: number;
  courseName: string;
  enrolled: number;
  completed: number;
  inProgress: number;
  averageProgress: number;
  averageGrade: number | null;
};

const LMS_SCOPE = [
  {
    title: "Katalog internal",
    description: "Daftar modul belajar dari LMS WordPress, ditampilkan ulang di HERO untuk admin.",
    icon: BookOpen,
    status: "MVP",
  },
  {
    title: "My Learning",
    description: "Karyawan tetap masuk lewat SSO, HERO membaca progress tanpa password LMS terpisah.",
    icon: GraduationCap,
    status: "Aktif",
  },
  {
    title: "Kurikulum & quiz",
    description: "Lesson dan quiz bisa dibuka dari detail course memakai data WordPress LMS yang sama.",
    icon: HelpCircle,
    status: "Aktif",
  },
  {
    title: "Sertifikat training",
    description: "Kelulusan LMS tetap bisa masuk ke Training Records lama saat flow lama dipakai.",
    icon: ClipboardCheck,
    status: "Reuse",
  },
] as const;

const LMS_REFERENCE_FEATURES = [
  {
    feature: "Course catalog, category, search",
    source: "/courses, /all-categories, /get-courses",
    target: "Katalog Kursus",
    status: "Aktif read-only",
  },
  {
    feature: "My Learning",
    source: "/my-learnings, /my-learning",
    target: "My Learning user login",
    status: "Aktif",
  },
  {
    feature: "Curriculum lesson/resource/video",
    source: "/course-chapters/curriculum",
    target: "Detail kurikulum di Progress Peserta",
    status: "Aktif read-only",
  },
  {
    feature: "Quiz start/answer/summary/report",
    source: "/quiz/start, /quiz/summary, /get-quiz-reports",
    target: "Status dan nilai quiz dari detail kurikulum",
    status: "Aktif read-only",
  },
  {
    feature: "Assignment/submission",
    source: "/assignments, /assignment-submissions",
    target: "Disiapkan sebagai assessment internal",
    status: "Belum write",
  },
  {
    feature: "Certificate download/sync",
    source: "/certificate/course/download",
    target: "Reuse sync Training Records lama",
    status: "Reuse",
  },
  {
    feature: "Instructor course builder",
    source: "/instructor/my-course/*",
    target: "Belum dipindah; perlu approval konten dulu",
    status: "Ditahan",
  },
  {
    feature: "Team learning",
    source: "/my-teams/*",
    target: "Bisa dipetakan ke department/section HERO",
    status: "Roadmap",
  },
  {
    feature: "Reviews, discussion, notification",
    source: "/get-reviews, /discussion/course, /notifications",
    target: "Perlu integrasi notification bell HERO",
    status: "Roadmap",
  },
  {
    feature: "Cart, payment, wallet, refund, coupons",
    source: "/cart, /place_order, /wallet, /refund, /promo-code",
    target: "Tidak dicopy ke internal LMS",
    status: "Skip aman",
  },
] as const;

function isCompleted(record: { progress: number; status?: string | null }) {
  const status = (record.status ?? "").toLowerCase();
  return record.progress >= 100 || status === "completed" || status === "passed";
}

function formatDateValue(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Makassar",
  });
}

function buildCourseSummaries(records: LmsProgressRecord[]) {
  const grouped = new Map<number, CourseSummary & { gradeTotal: number; gradeCount: number }>();

  for (const record of records) {
    const existing =
      grouped.get(record.course_id) ??
      {
        courseId: record.course_id,
        courseName: record.course_name,
        enrolled: 0,
        completed: 0,
        inProgress: 0,
        averageProgress: 0,
        averageGrade: null,
        gradeTotal: 0,
        gradeCount: 0,
      };

    existing.enrolled += 1;
    existing.completed += isCompleted(record) ? 1 : 0;
    existing.inProgress += isCompleted(record) ? 0 : 1;
    existing.averageProgress += record.progress || 0;
    if (record.grade != null) {
      existing.gradeTotal += record.grade;
      existing.gradeCount += 1;
    }
    grouped.set(record.course_id, existing);
  }

  return Array.from(grouped.values())
    .map(({ gradeTotal, gradeCount, ...course }) => ({
      ...course,
      averageProgress: course.enrolled > 0 ? Math.round(course.averageProgress / course.enrolled) : 0,
      averageGrade: gradeCount > 0 ? Math.round(gradeTotal / gradeCount) : null,
    }))
    .sort((a, b) => a.courseName.localeCompare(b.courseName));
}

type InternalLearnerCourse = ReturnType<typeof buildInternalLmsLearnerCourses>[number];
type InternalQuizQuestion = InternalLmsWorkspaceData["questions"][number];

function learnerStatusBadge(course: InternalLearnerCourse) {
  const enrollment = course.enrollment;

  if (course.posttestPassed || enrollment?.status === "passed") {
    return <Badge className="border-0 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10">Lulus</Badge>;
  }

  if (course.posttestFailed || enrollment?.status === "failed") {
    return <Badge className="border-0 bg-rose-500/10 text-rose-700 hover:bg-rose-500/10">Gagal</Badge>;
  }

  if (!enrollment) {
    return <Badge variant="outline" className="rounded-full">Belum mulai</Badge>;
  }

  return <Badge className="border-0 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10">Belajar</Badge>;
}

function complianceStatusBadge(status: string) {
  if (status === "passed") {
    return <Badge className="border-0 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10">Lulus</Badge>;
  }
  if (status === "failed") {
    return <Badge className="border-0 bg-rose-500/10 text-rose-700 hover:bg-rose-500/10">Gagal</Badge>;
  }
  if (status === "learning") {
    return <Badge className="border-0 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10">Belajar</Badge>;
  }
  return <Badge variant="outline" className="rounded-full">Belum mulai</Badge>;
}

function refreshmentStatusBadge(status: string) {
  if (status === "passed") {
    return <Badge className="border-0 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10">Lulus</Badge>;
  }
  if (status === "failed") {
    return <Badge className="border-0 bg-rose-500/10 text-rose-700 hover:bg-rose-500/10">Gagal</Badge>;
  }
  if (status === "submitted") {
    return <Badge className="border-0 bg-blue-500/10 text-blue-700 hover:bg-blue-500/10">Submitted</Badge>;
  }
  if (status === "learning") {
    return <Badge className="border-0 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10">Belajar</Badge>;
  }
  return <Badge variant="outline" className="rounded-full">Assigned</Badge>;
}

function certificateStatusBadge(status: string) {
  if (status === "expired") {
    return <Badge className="border-0 bg-rose-500/10 text-rose-700 hover:bg-rose-500/10">Expired</Badge>;
  }
  if (status === "expiring") {
    return <Badge className="border-0 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10">Hampir expired</Badge>;
  }
  if (status === "valid") {
    return <Badge className="border-0 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10">Valid</Badge>;
  }
  return <Badge variant="outline" className="rounded-full">Belum ada</Badge>;
}

function buildQueryString(values: Record<string, string | null | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function quizOptions(question: InternalQuizQuestion) {
  return [
    { key: "A", text: question.optionA, imageUrl: question.optionAImageUrl },
    { key: "B", text: question.optionB, imageUrl: question.optionBImageUrl },
    { key: "C", text: question.optionC, imageUrl: question.optionCImageUrl },
    { key: "D", text: question.optionD, imageUrl: question.optionDImageUrl },
  ].filter((option) => option.text || option.imageUrl);
}

function QuizForm({
  courseId,
  phase,
  questions,
  actionLabel,
}: {
  courseId: number;
  phase: "pretest" | "posttest";
  questions: InternalQuizQuestion[];
  actionLabel: string;
}) {
  if (questions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        {phase === "pretest" ? "Pretest belum dibuat." : "Post test belum dibuat."}
      </div>
    );
  }

  return (
    <form action={submitInternalLmsQuizAction} className="grid gap-4 rounded-lg border border-border bg-background p-3 sm:p-4">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="testPhase" value={phase} />
      {questions.map((question, index) => (
        <fieldset key={question.id} className="grid gap-3 rounded-lg bg-surface-container-low/40 p-3">
          <legend className="text-sm font-semibold text-foreground">
            {index + 1}. {question.questionText}
          </legend>
          {question.questionImageUrl ? (
            <img
              src={question.questionImageUrl}
              alt={`Gambar pertanyaan ${index + 1}`}
              className="max-h-52 w-full rounded-lg border object-contain"
            />
          ) : null}
          <div className="grid gap-2">
            {quizOptions(question).map((option) => (
              <label
                key={`${question.id}-${option.key}`}
                className="flex min-h-12 items-start gap-3 rounded-lg border border-border bg-background p-3 text-sm"
              >
                <input
                  type="radio"
                  name={`answer_${question.id}`}
                  value={option.key}
                  required
                  className="mt-1 size-4 shrink-0"
                />
                <span className="grid flex-1 gap-2">
                  <span className="font-medium">{option.key}. {option.text || "Jawaban gambar"}</span>
                  {option.imageUrl ? (
                    <img
                      src={option.imageUrl}
                      alt={`Gambar jawaban ${option.key}`}
                      className="max-h-36 w-full rounded-md border object-contain"
                    />
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <Button type="submit" className="h-11 w-full rounded-xl sm:w-fit">
        {actionLabel}
      </Button>
    </form>
  );
}

export default async function ChitraLearningLmsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    previewCourseId?: string;
    site?: string;
    department?: string;
    section?: string;
    role?: string;
  }>;
}) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const params = searchParams ? await searchParams : {};
  const previewCourseId = Number(params.previewCourseId ?? 0) || null;
  const managementFilters = {
    site: params.site ?? "",
    department: params.department ?? "",
    section: params.section ?? "",
    role: params.role ?? "",
  };
  const hasManagementFilters = Object.values(managementFilters).some(Boolean);
  const lmsUrl = process.env.LMS_SITE_URL || "https://chitralearning.com";
  const [currentEmployee, employeeRows, internalWorkspace] = await Promise.all([
    db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        department: employees.department,
        section: employees.section,
        accessRole: employees.accessRole,
      })
      .from(employees)
      .where(eq(employees.email, session.user.email))
      .limit(1),
    db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        email: employees.email,
        department: employees.department,
        section: employees.section,
        accessRole: employees.accessRole,
        workLocation: employees.workLocation,
        jobTitle: employees.jobTitle,
        isActive: employees.isActive,
      })
      .from(employees),
    getInternalLmsWorkspaceData(),
  ]);

  const employeesByEmail = new Map(employeeRows.map((employee) => [employee.email.toLowerCase().trim(), employee]));
  const employeesBySn = new Map(
    employeeRows
      .filter((employee) => employee.employeeSn)
      .map((employee) => [employee.employeeSn.toLowerCase().trim(), employee])
  );
  const learnerEmployee = currentEmployee[0] ?? null;
  const employeeName = learnerEmployee?.name || session.user.name || "Karyawan";
  const employeeSn = learnerEmployee?.employeeSn || session.user.email;
  const internalCourseOptions = internalWorkspace.courses;
  const learnerCourses = buildInternalLmsLearnerCourses(internalWorkspace, learnerEmployee, { previewCourseId });
  const activeEmployeeOptions = employeeRows.filter((employee) => employee.isActive);
  const courseNameById = new Map(internalCourseOptions.map((course) => [course.id, course.title]));
  const employeeNameById = new Map(employeeRows.map((employee) => [employee.id, employee.name]));
  const departments = Array.from(new Set(employeeRows.map((employee) => employee.department).filter(Boolean))).sort();
  const sections = Array.from(new Set(employeeRows.map((employee) => employee.section).filter(Boolean))).sort();
  const accessRoles = Array.from(new Set(employeeRows.map((employee) => employee.accessRole).filter(Boolean))).sort();
  const sites = Array.from(new Set(employeeRows.map((employee) => employee.workLocation).filter(Boolean))).sort();
  const complianceRows = buildInternalLmsComplianceRows(internalWorkspace, employeeRows, managementFilters);
  const complianceSummary = summarizeInternalLmsCompliance(complianceRows);
  const refreshmentRows = buildInternalLmsRefreshmentRows(internalWorkspace, employeeRows, managementFilters);
  const refreshmentSummary = summarizeInternalLmsRefreshments(refreshmentRows);
  const roleMatrix = buildInternalLmsRoleMatrix(complianceRows);
  const exportHref = `/api/chitralearning-lms/export${buildQueryString(managementFilters)}`;
  const campaignParticipantCountById = new Map<number, number>();

  for (const participant of internalWorkspace.campaignParticipants) {
    campaignParticipantCountById.set(
      participant.campaignId,
      (campaignParticipantCountById.get(participant.campaignId) ?? 0) + 1
    );
  }

  let records: LmsProgressRecord[] = [];
  let connectionError = false;

  try {
    const rawRecords = await getAllLmsProgressFromDb();
    records = rawRecords.map((record: any) => {
      const emailKey = `${record.user_email ?? ""}`.toLowerCase().trim();
      const snKey = `${record.user_login ?? ""}`.toLowerCase().trim();
      const employee = employeesByEmail.get(emailKey) ?? employeesBySn.get(snKey);

      return {
        ...record,
        employeeName: employee?.name || record.display_name || "Karyawan LMS",
        employeeSn: employee?.employeeSn || record.user_login || "-",
        department: employee?.department || "Belum terhubung",
        section: employee?.section || "-",
      };
    });
  } catch (error) {
    console.error("[ChitraLearning LMS] failed to load LMS progress", error);
    connectionError = true;
  }

  const courseSummaries = buildCourseSummaries(records);
  const completedMyLearning = learnerCourses.filter((course) => course.posttestPassed || course.enrollment?.status === "passed").length;
  const myRefreshmentRows = learnerEmployee
    ? refreshmentRows.filter((row) => row.employeeId === learnerEmployee.id)
    : [];
  const myAverageProgress =
    learnerCourses.length > 0
      ? Math.round(
          learnerCourses.reduce((sum, course) => sum + (course.enrollment?.progress ?? 0), 0) / learnerCourses.length
        )
      : 0;
  const defaultTab = previewCourseId ? "my-learning" : hasManagementFilters ? "management" : "internal-builder";

  return (
    <AdminPageShell
      eyebrow="ChitraLearning LMS"
      title="Learning Workspace"
      description="LMS internal non-komersil untuk course, video/materi, quiz, certificate, dan pengaturan akses karyawan."
      badge="Internal LMS"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="h-9 rounded-xl text-xs">
            <Link href="/dashboard/lms">LMS lama</Link>
          </Button>
          <Button asChild className="h-9 rounded-xl text-xs">
            <Link href="/api/lms/sso" target="_blank">
              Buka LMS <ExternalLink className="size-4" />
            </Link>
          </Button>
        </div>
      }
    >
      {connectionError ? (
        <Card className="border-amber-500/20 bg-amber-500/5 shadow-none">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div>
              <CardTitle className="text-base text-amber-900">Koneksi LMS terbatas</CardTitle>
              <CardDescription className="text-amber-800/80">
                Gagal membaca progress dari {lmsUrl}. Route baru tetap aman karena hanya membaca data dan tidak menulis ke LMS.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      {!internalWorkspace.schemaReady ? (
        <Card className="border-amber-500/20 bg-amber-500/5 shadow-none">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div>
              <CardTitle className="text-base text-amber-900">Schema internal LMS belum aktif</CardTitle>
              <CardDescription className="text-amber-800/80">
                Tabel internal LMS sudah ditambahkan di kode. Jalankan DB push sebelum form builder bisa dipakai.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      <AdminMetricGrid
        mode="compact"
        items={[
          { label: "Course internal", value: `${internalWorkspace.courses.length}`, meta: "Dibuat di HERO" },
          { label: "Video / materi", value: `${internalWorkspace.lessons.length}`, meta: "Lesson internal" },
          { label: "Bank soal", value: `${internalWorkspace.questions.length}`, meta: "Quiz questions" },
          { label: "Sertifikat", value: `${internalWorkspace.certificates.length}`, meta: "Issued internal" },
        ]}
      />

      <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <GraduationCap className="size-5 text-primary" />
              Profil belajar
            </CardTitle>
            <CardDescription>
              {employeeName} ({employeeSn}) memakai data HERO sebagai identitas internal. Commerce LMS referensi tidak dipakai.
            </CardDescription>
          </div>
          <Badge className="w-fit border-0 bg-primary/10 text-primary hover:bg-primary/10">Non-komersil</Badge>
        </CardHeader>
      </Card>

      <Tabs defaultValue={defaultTab} className="space-y-5">
        <TabsList className="flex h-auto flex-wrap justify-start bg-surface-container-low/50">
          <TabsTrigger value="internal-builder" className="gap-1.5">
            <PlayCircle className="size-4" />
            Builder Internal
          </TabsTrigger>
          <TabsTrigger value="access-certificates" className="gap-1.5">
            <ShieldCheck className="size-4" />
            Akses & Sertifikat
          </TabsTrigger>
          <TabsTrigger value="management" className="gap-1.5">
            <BarChart3 className="size-4" />
            Management
          </TabsTrigger>
          <TabsTrigger value="refreshment" className="gap-1.5">
            <Zap className="size-4" />
            Refreshment
          </TabsTrigger>
          <TabsTrigger value="my-learning" className="gap-1.5">
            <GraduationCap className="size-4" />
            My Learning
          </TabsTrigger>
          <TabsTrigger value="courses" className="gap-1.5">
            <BookOpen className="size-4" />
            Katalog Kursus
          </TabsTrigger>
          <TabsTrigger value="learners" className="gap-1.5">
            <Users className="size-4" />
            Progress Peserta
          </TabsTrigger>
          <TabsTrigger value="blueprint" className="gap-1.5">
            <Layers className="size-4" />
            Refactor Plan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="internal-builder" className="space-y-5 outline-none">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {INTERNAL_LMS_FEATURES.map((item) => (
              <Card key={item.feature} className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-sm">
                <CardHeader className="p-4">
                  <Badge variant="outline" className="mb-2 w-fit rounded-full">
                    {item.status}
                  </Badge>
                  <CardTitle className="text-sm">{item.feature}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">{item.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="size-5 text-primary" />
                  Course internal
                </CardTitle>
                <CardDescription>Buat course internal tanpa payment, cart, wallet, atau marketplace.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createInternalLmsCourseAction} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="course-title">Judul course</Label>
                    <Input id="course-title" name="title" placeholder="Contoh: Induksi Safety Site" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="course-description">Deskripsi</Label>
                    <Textarea
                      id="course-description"
                      name="description"
                      rows={3}
                      placeholder="Tujuan belajar, target peserta, dan hasil yang diharapkan."
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="course-category">Kategori</Label>
                      <Input id="course-category" name="category" defaultValue="Internal" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="course-status">Status</Label>
                      <select
                        id="course-status"
                        name="status"
                        defaultValue="draft"
                        className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="passing-score">Passing score</Label>
                      <Input id="passing-score" name="passingScore" type="number" min={0} max={100} defaultValue={80} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="estimated-minutes">Estimasi menit</Label>
                      <Input id="estimated-minutes" name="estimatedMinutes" type="number" min={0} defaultValue={30} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="course-due-days">Deadline hari</Label>
                      <Input id="course-due-days" name="dueDays" type="number" min={1} defaultValue={14} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input name="certificateEnabled" type="checkbox" defaultChecked className="size-4 rounded border-input" />
                    Certificate aktif untuk course ini
                  </label>
                  <Button type="submit" disabled={!internalWorkspace.schemaReady} className="w-fit rounded-xl">
                    Simpan course
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="grid gap-5">
              <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <PlayCircle className="size-5 text-primary" />
                    Video / materi
                  </CardTitle>
                  <CardDescription>Tambah lesson video, file/resource, artikel, atau placeholder quiz.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form action={createInternalLmsLessonAction} className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="lesson-course">Course</Label>
                      <select
                        id="lesson-course"
                        name="courseId"
                        required
                        className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        {internalCourseOptions.length === 0 ? (
                          <option value="">Belum ada course internal</option>
                        ) : (
                          internalCourseOptions.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.title}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lesson-title">Judul lesson</Label>
                      <Input id="lesson-title" name="title" placeholder="Video pengantar / Materi SOP" required />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="lesson-type">Tipe</Label>
                        <select
                          id="lesson-type"
                          name="lessonType"
                          defaultValue="video"
                          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                        >
                          {INTERNAL_LMS_LESSON_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="lesson-duration">Durasi menit</Label>
                        <Input id="lesson-duration" name="durationMinutes" type="number" min={0} defaultValue={10} />
                      </div>
                    </div>
                    <Input name="videoUrl" placeholder="Video URL internal / LMS / storage" />
                    <Input name="fileUrl" placeholder="File/resource URL opsional" />
                    <Textarea name="description" rows={2} placeholder="Ringkasan materi." />
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input name="isRequired" type="checkbox" defaultChecked className="size-4 rounded border-input" />
                        Wajib selesai
                      </label>
                      <Input name="sortOrder" type="number" min={1} defaultValue={1} className="w-24" />
                    </div>
                    <Button
                      type="submit"
                      disabled={!internalWorkspace.schemaReady || internalCourseOptions.length === 0}
                      className="w-fit rounded-xl"
                    >
                      Simpan lesson
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <HelpCircle className="size-5 text-primary" />
                    Quiz question
                  </CardTitle>
                  <CardDescription>Bank soal dasar untuk evaluasi internal per course.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form action={createInternalLmsQuizQuestionAction} className="grid gap-3">
                    <select name="courseId" required className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                      {internalCourseOptions.length === 0 ? (
                        <option value="">Belum ada course internal</option>
                      ) : (
                        internalCourseOptions.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.title}
                          </option>
                        ))
                      )}
                    </select>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select name="testPhase" defaultValue="posttest" className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                        {INTERNAL_LMS_TEST_PHASES.map((phase) => (
                          <option key={phase.value} value={phase.value}>
                            {phase.label}
                          </option>
                        ))}
                      </select>
                      <Input name="questionImageUrl" placeholder="URL gambar pertanyaan opsional" />
                    </div>
                    <Textarea name="questionText" rows={3} placeholder="Pertanyaan quiz" required />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input name="optionA" placeholder="Opsi A" required />
                      <Input name="optionAImageUrl" placeholder="Gambar opsi A opsional" />
                      <Input name="optionB" placeholder="Opsi B" required />
                      <Input name="optionBImageUrl" placeholder="Gambar opsi B opsional" />
                      <Input name="optionC" placeholder="Opsi C" />
                      <Input name="optionCImageUrl" placeholder="Gambar opsi C opsional" />
                      <Input name="optionD" placeholder="Opsi D" />
                      <Input name="optionDImageUrl" placeholder="Gambar opsi D opsional" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <select name="correctOption" defaultValue="A" className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                        <option value="A">Jawaban A</option>
                        <option value="B">Jawaban B</option>
                        <option value="C">Jawaban C</option>
                        <option value="D">Jawaban D</option>
                      </select>
                      <Input name="points" type="number" min={1} defaultValue={1} />
                      <Input name="sortOrder" type="number" min={1} defaultValue={1} />
                    </div>
                    <Button
                      type="submit"
                      disabled={!internalWorkspace.schemaReady || internalCourseOptions.length === 0}
                      className="w-fit rounded-xl"
                    >
                      Simpan question
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-sm">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg">Daftar course internal</CardTitle>
              <CardDescription>Ringkasan course, materi, quiz, akses, peserta, dan sertifikat internal.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[260px]">Course</TableHead>
                    <TableHead className="min-w-[120px]">Status</TableHead>
                    <TableHead className="min-w-[100px] text-center">Lesson</TableHead>
                    <TableHead className="min-w-[140px] text-center">Quiz</TableHead>
                    <TableHead className="min-w-[100px] text-center">Akses</TableHead>
                    <TableHead className="min-w-[120px] text-center">Sertifikat</TableHead>
                    <TableHead className="min-w-[180px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {internalWorkspace.courses.length > 0 ? (
                    internalWorkspace.courses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-semibold">{course.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {course.category} - Passing {course.passingScore}%
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full">
                            {course.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{course.lessonCount}</TableCell>
                        <TableCell className="text-center text-sm font-semibold">
                          {course.quizQuestionCount}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            P{course.pretestQuestionCount}/T{course.posttestQuestionCount}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{course.accessRuleCount}</TableCell>
                        <TableCell className="text-center font-semibold">{course.certificateCount}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button asChild variant="outline" className="h-9 rounded-lg px-3 text-xs">
                              <Link href={`/dashboard/chitralearning-lms?previewCourseId=${course.id}`}>
                                <Eye className="size-3.5" />
                                Preview
                              </Link>
                            </Button>
                            <form action={cloneInternalLmsCourseAction}>
                              <input type="hidden" name="courseId" value={course.id} />
                              <Button type="submit" variant="outline" className="h-9 rounded-lg px-3 text-xs">
                                <Copy className="size-3.5" />
                                Clone
                              </Button>
                            </form>
                            <details className="w-full rounded-lg bg-surface-container-low p-2 text-left sm:w-auto">
                              <summary className="cursor-pointer text-xs font-semibold">Governance</summary>
                              <form action={updateInternalLmsCourseGovernanceAction} className="mt-2 grid gap-2">
                                <input type="hidden" name="courseId" value={course.id} />
                                <select
                                  name="status"
                                  defaultValue={course.status}
                                  className="h-9 rounded-lg border border-input bg-background px-2 text-xs"
                                >
                                  <option value="draft">Draft</option>
                                  <option value="published">Published</option>
                                  <option value="archived">Archived</option>
                                </select>
                                <div className="grid grid-cols-2 gap-2">
                                  <Input name="passingScore" type="number" min={0} max={100} defaultValue={course.passingScore} />
                                  <Input name="dueDays" type="number" min={1} defaultValue={course.dueDays} />
                                </div>
                                <label className="flex items-center gap-2 text-xs font-medium">
                                  <input
                                    name="certificateEnabled"
                                    type="checkbox"
                                    defaultChecked={course.certificateEnabled}
                                    className="size-4 rounded border-input"
                                  />
                                  Certificate
                                </label>
                                <Button type="submit" variant="outline" className="h-9 rounded-lg px-3 text-xs">
                                  Simpan
                                </Button>
                              </form>
                            </details>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                        Belum ada course internal. Tambah course pertama dari form di atas.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-sm">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg">Question bank</CardTitle>
              <CardDescription>Soal pretest/post test dengan dukungan gambar pertanyaan dan gambar jawaban.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">Course</TableHead>
                    <TableHead className="min-w-[110px]">Phase</TableHead>
                    <TableHead className="min-w-[300px]">Pertanyaan</TableHead>
                    <TableHead className="min-w-[120px]">Media</TableHead>
                    <TableHead className="min-w-[90px] text-center">Kunci</TableHead>
                    <TableHead className="min-w-[130px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {internalWorkspace.questions.length > 0 ? (
                    internalWorkspace.questions.map((question) => {
                      const hasAnswerImage = Boolean(
                        question.optionAImageUrl ||
                          question.optionBImageUrl ||
                          question.optionCImageUrl ||
                          question.optionDImageUrl
                      );

                      return (
                        <TableRow key={question.id}>
                          <TableCell className="font-medium">
                            {courseNameById.get(question.courseId) || `Course #${question.courseId}`}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-full">
                              {question.testPhase === "pretest" ? "Pretest" : "Post test"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{question.questionText}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              {question.questionImageUrl ? <Badge variant="outline">Gambar soal</Badge> : null}
                              {hasAnswerImage ? <Badge variant="outline">Gambar jawaban</Badge> : null}
                              {!question.questionImageUrl && !hasAnswerImage ? (
                                <span className="text-xs text-muted-foreground">Teks</span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold">{question.correctOption}</TableCell>
                          <TableCell>
                            <form action={duplicateInternalLmsQuestionAction} className="flex justify-end">
                              <input type="hidden" name="questionId" value={question.id} />
                              <Button type="submit" variant="outline" className="h-9 rounded-lg px-3 text-xs">
                                <Copy className="size-3.5" />
                                Duplicate
                              </Button>
                            </form>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                        Belum ada soal. Tambah manual dulu; import CSV nanti setelah form stabil.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access-certificates" className="space-y-5 outline-none">
          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LockKeyhole className="size-5 text-primary" />
                  Hak akses course
                </CardTitle>
                <CardDescription>
                  Tentukan siapa yang bisa akses: semua karyawan, department, section, access role, atau employee.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createInternalLmsAccessRuleAction} className="grid gap-3">
                  <select name="courseId" required className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    {internalCourseOptions.length === 0 ? (
                      <option value="">Belum ada course internal</option>
                    ) : (
                      internalCourseOptions.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))
                    )}
                  </select>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select name="accessType" defaultValue="all" className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                      {INTERNAL_LMS_ACCESS_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <Input name="accessValue" list="chitralearning-access-values" placeholder="* / Department / Section / Role / Employee ID" />
                    <datalist id="chitralearning-access-values">
                      <option value="*" />
                      {departments.map((department) => (
                        <option key={`department-${department}`} value={department} />
                      ))}
                      {sections.map((section) => (
                        <option key={`section-${section}`} value={section} />
                      ))}
                      {accessRoles.map((role) => (
                        <option key={`role-${role}`} value={role} />
                      ))}
                      {activeEmployeeOptions.slice(0, 100).map((employee) => (
                        <option key={`employee-${employee.id}`} value={`${employee.id}`}>
                          {employee.name} - {employee.employeeSn}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <Textarea name="description" rows={2} placeholder="Contoh: Wajib untuk semua operator site." />
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input name="isActive" type="checkbox" defaultChecked className="size-4 rounded border-input" />
                    Rule aktif
                  </label>
                  <Button
                    type="submit"
                    disabled={!internalWorkspace.schemaReady || internalCourseOptions.length === 0}
                    className="w-fit rounded-xl"
                  >
                    Simpan akses
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="size-5 text-primary" />
                  Issue certificate
                </CardTitle>
                <CardDescription>
                  Terbitkan sertifikat internal dan otomatis tulis ke Training Records HERO.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={issueInternalLmsCertificateAction} className="grid gap-3">
                  <select name="courseId" required className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    {internalCourseOptions.length === 0 ? (
                      <option value="">Belum ada course internal</option>
                    ) : (
                      internalCourseOptions.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))
                    )}
                  </select>
                  <select name="employeeId" required className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    {activeEmployeeOptions.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} - {employee.employeeSn}
                      </option>
                    ))}
                  </select>
                  <Input name="certificateNumber" placeholder="Nomor sertifikat opsional" />
                  <Button
                    type="submit"
                    disabled={!internalWorkspace.schemaReady || internalCourseOptions.length === 0}
                    className="w-fit rounded-xl"
                  >
                    Issue certificate
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-sm">
              <CardHeader className="pb-0">
                <CardTitle className="text-lg">Rule akses aktif</CardTitle>
                <CardDescription>Daftar rule akses per course internal.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {internalWorkspace.accessRules.length > 0 ? (
                      internalWorkspace.accessRules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium">{courseNameById.get(rule.courseId) || `Course #${rule.courseId}`}</TableCell>
                          <TableCell>{rule.accessType}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{rule.accessValue}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-full">
                              {rule.isActive ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                          Belum ada rule akses.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-sm">
              <CardHeader className="pb-0">
                <CardTitle className="text-lg">Sertifikat internal</CardTitle>
                <CardDescription>Certificate yang sudah diterbitkan dari modul internal.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Karyawan</TableHead>
                      <TableHead>Nomor</TableHead>
                      <TableHead>Tanggal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {internalWorkspace.certificates.length > 0 ? (
                      internalWorkspace.certificates.map((certificate) => (
                        <TableRow key={certificate.id}>
                          <TableCell className="font-medium">
                            {courseNameById.get(certificate.courseId) || `Course #${certificate.courseId}`}
                          </TableCell>
                          <TableCell>{employeeNameById.get(certificate.employeeId) || `Employee #${certificate.employeeId}`}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{certificate.certificateNumber}</TableCell>
                          <TableCell>{formatDateValue(certificate.issuedAt)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                          Belum ada certificate internal.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="management" className="space-y-5 outline-none">
          <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="size-5 text-primary" />
                Dashboard compliance
              </CardTitle>
              <CardDescription className="not-sr-only text-sm">
                Monitor peserta wajib, status test, deadline, dan certificate dari LMS internal.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <form method="get" className="grid gap-3 rounded-xl bg-surface-container-low p-3 md:grid-cols-5">
                <select name="site" defaultValue={managementFilters.site} className="h-11 rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Semua site</option>
                  {sites.map((site) => (
                    <option key={site} value={site}>{site}</option>
                  ))}
                </select>
                <select name="department" defaultValue={managementFilters.department} className="h-11 rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Semua department</option>
                  {departments.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
                <select name="section" defaultValue={managementFilters.section} className="h-11 rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Semua section</option>
                  {sections.map((section) => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
                <select name="role" defaultValue={managementFilters.role} className="h-11 rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="">Semua role</option>
                  {accessRoles.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" className="h-11 flex-1 rounded-xl text-xs">Filter</Button>
                  <Button asChild variant="outline" className="h-11 flex-1 rounded-xl text-xs">
                    <Link href="/dashboard/chitralearning-lms">Reset</Link>
                  </Button>
                </div>
              </form>

              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="h-10 rounded-xl text-xs">
                  <Link href={exportHref}>
                    <Download className="size-4" />
                    Export Excel
                  </Link>
                </Button>
                <form action={runInternalLmsReminderAction} className="flex">
                  <input type="hidden" name="site" value={managementFilters.site} />
                  <input type="hidden" name="department" value={managementFilters.department} />
                  <input type="hidden" name="section" value={managementFilters.section} />
                  <input type="hidden" name="role" value={managementFilters.role} />
                  <Button type="submit" variant="outline" className="h-10 rounded-xl text-xs">
                    <BellRing className="size-4" />
                    Kirim reminder
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          <AdminMetricGrid
            mode="compact"
            items={[
              { label: "Belum mulai", value: `${complianceSummary.notStarted}`, meta: "Course wajib" },
              { label: "Sedang belajar", value: `${complianceSummary.learning}`, meta: "Progress aktif" },
              { label: "Gagal", value: `${complianceSummary.failed}`, meta: "Perlu ulang" },
              { label: "Lulus", value: `${complianceSummary.passed}`, meta: "Certificate/training" },
              {
                label: "Certificate risk",
                value: `${complianceSummary.certificateExpired + complianceSummary.certificateExpiring}`,
                meta: `${complianceSummary.certificateExpired} expired, ${complianceSummary.certificateExpiring} hampir`,
              },
            ]}
          />

          <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-sm">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg">Peserta wajib</CardTitle>
              <CardDescription className="not-sr-only text-sm">
                Menampilkan maksimal 80 baris di layar. Export Excel berisi semua hasil filter.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <MinimalTableShell
                label="chitralearning-compliance"
                fileName="chitralearning-compliance"
                searchPlaceholder="Cari peserta, course, department..."
                dateFilter={false}
                showImport={false}
                summaryClassName="bg-transparent px-1 py-0 shadow-none"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[240px]">Peserta</TableHead>
                      <TableHead className="min-w-[260px]">Course</TableHead>
                      <TableHead className="min-w-[120px]">Status</TableHead>
                      <TableHead className="min-w-[120px]">Score</TableHead>
                      <TableHead className="min-w-[130px]">Deadline</TableHead>
                      <TableHead className="min-w-[150px]">Certificate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complianceRows.length > 0 ? (
                      complianceRows.slice(0, 80).map((row) => (
                        <TableRow key={`${row.courseId}-${row.employeeId}`}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-semibold">{row.employeeName}</p>
                              <p className="text-xs text-muted-foreground">
                                {row.employeeSn || "-"} - {row.site || "-"} - {row.department || "-"} / {row.section || "-"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{row.courseTitle}</p>
                              <p className="text-xs text-muted-foreground">{row.role || row.jobTitle || "Tanpa role"}</p>
                            </div>
                          </TableCell>
                          <TableCell>{complianceStatusBadge(row.status)}</TableCell>
                          <TableCell className="text-sm font-semibold">
                            {row.score == null ? "-" : `${row.score}%`}
                            <span className="ml-1 text-xs font-normal text-muted-foreground">/ {row.passingScore}%</span>
                          </TableCell>
                          <TableCell className="text-sm">{formatDateValue(row.dueAt)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {certificateStatusBadge(row.certificateStatus)}
                              <p className="text-xs text-muted-foreground">{row.certificateNumber || "-"}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                          Belum ada course published dengan rule akses yang cocok.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </MinimalTableShell>
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-sm">
              <CardHeader className="pb-0">
                <CardTitle className="text-lg">Matrix training wajib per role</CardTitle>
                <CardDescription className="not-sr-only text-sm">
                  Matrix dihitung dari rule akses all/role dan status peserta.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[160px]">Role</TableHead>
                      <TableHead className="min-w-[220px]">Course wajib</TableHead>
                      <TableHead className="min-w-[80px] text-center">Total</TableHead>
                      <TableHead className="min-w-[90px] text-center">Lulus</TableHead>
                      <TableHead className="min-w-[110px] text-right">Compliance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roleMatrix.length > 0 ? (
                      roleMatrix.slice(0, 80).map((row) => (
                        <TableRow key={`${row.role}-${row.courseTitle}`}>
                          <TableCell className="font-medium">{row.role}</TableCell>
                          <TableCell>{row.courseTitle}</TableCell>
                          <TableCell className="text-center">{row.total}</TableCell>
                          <TableCell className="text-center">{row.passed}</TableCell>
                          <TableCell className="text-right font-semibold">{row.compliance}%</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                          Matrix kosong. Publish course dan set akses dulu.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-sm">
              <CardHeader className="pb-0">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="size-5 text-primary" />
                  Audit log
                </CardTitle>
                <CardDescription className="not-sr-only text-sm">
                  Publish course, issue certificate, passing score, dan reminder run.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 pt-4">
                {internalWorkspace.auditLogs.length > 0 ? (
                  internalWorkspace.auditLogs.slice(0, 30).map((log) => (
                    <div key={log.id} className="rounded-lg border border-border bg-muted/10 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{log.action}</p>
                        <span className="text-xs text-muted-foreground">{formatDateValue(log.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Actor: {log.actorEmployeeId ? employeeNameById.get(log.actorEmployeeId) || `#${log.actorEmployeeId}` : "System"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Course: {log.courseId ? courseNameById.get(log.courseId) || `#${log.courseId}` : "-"}
                      </p>
                      {log.note ? <p className="mt-2 text-xs">{log.note}</p> : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                    Audit log belum ada.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="refreshment" className="space-y-5 outline-none">
          <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="size-5 text-primary" />
                  Quiz dadakan / refreshment
                </CardTitle>
                <CardDescription className="not-sr-only text-sm">
                  Buat campaign wajib untuk site, department, section, role, atau karyawan tertentu. Campaign selalu draft dulu.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={createInternalLmsCampaignAction} className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="campaign-title">Judul campaign</Label>
                    <Input id="campaign-title" name="title" placeholder="Contoh: Refreshment SOP Dump Truck Q3" required />
                  </div>
                  <Textarea name="description" rows={2} placeholder="Tujuan refreshment dan instruksi singkat." />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select name="campaignType" defaultValue="posttest" className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                      {INTERNAL_LMS_CAMPAIGN_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <select name="courseId" defaultValue="" className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                      <option value="">Tanpa course / assignment saja</option>
                      {internalCourseOptions.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select name="targetType" defaultValue="all" className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                      {INTERNAL_LMS_CAMPAIGN_TARGET_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <Input name="targetValue" list="chitralearning-campaign-target-values" placeholder="* / Site / Department / Section / Role / Employee ID" />
                    <datalist id="chitralearning-campaign-target-values">
                      <option value="*" />
                      {sites.map((site) => (
                        <option key={`campaign-site-${site}`} value={site} />
                      ))}
                      {departments.map((department) => (
                        <option key={`campaign-department-${department}`} value={department} />
                      ))}
                      {sections.map((section) => (
                        <option key={`campaign-section-${section}`} value={section} />
                      ))}
                      {accessRoles.map((role) => (
                        <option key={`campaign-role-${role}`} value={role} />
                      ))}
                      {activeEmployeeOptions.slice(0, 100).map((employee) => (
                        <option key={`campaign-employee-${employee.id}`} value={`${employee.id}`}>
                          {employee.name} - {employee.employeeSn}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input name="dueAt" type="datetime-local" />
                    <select name="recurrence" defaultValue="manual" className="h-10 rounded-lg border border-input bg-background px-3 text-sm">
                      {INTERNAL_LMS_RECURRENCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <Input name="passingScore" type="number" min={0} max={100} defaultValue={80} />
                  </div>
                  <Textarea
                    name="assignmentPrompt"
                    rows={3}
                    placeholder="Instruksi assignment bila campaign memakai tugas upload/link."
                  />
                  <Button
                    type="submit"
                    disabled={!internalWorkspace.schemaReady}
                    className="h-11 w-full rounded-xl sm:w-fit"
                  >
                    Simpan draft campaign
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="grid gap-5">
              <AdminMetricGrid
                mode="compact"
                items={[
                  { label: "Assigned", value: `${refreshmentSummary.assigned}`, meta: "Belum selesai" },
                  { label: "Belajar", value: `${refreshmentSummary.learning}`, meta: "Sedang jalan" },
                  { label: "Submitted", value: `${refreshmentSummary.submitted}`, meta: "Assignment masuk" },
                  { label: "Gagal", value: `${refreshmentSummary.failed}`, meta: "Perlu ulang" },
                  { label: "Lulus", value: `${refreshmentSummary.passed}`, meta: "Refreshment clear" },
                ]}
              />

              <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-sm">
                <CardHeader className="pb-0">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CalendarClock className="size-5 text-primary" />
                    Tugas refreshment saya
                  </CardTitle>
                  <CardDescription className="not-sr-only text-sm">
                    Campaign yang ditargetkan ke {employeeName}; post test tetap dikerjakan lewat My Learning.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 pt-4">
                  {myRefreshmentRows.length > 0 ? (
                    myRefreshmentRows.map((row) => {
                      const campaign = internalWorkspace.campaigns.find((item) => item.id === row.campaignId);
                      const assignmentResponse = internalWorkspace.assignmentResponses.find(
                        (item) => item.campaignId === row.campaignId && item.employeeId === row.employeeId
                      );
                      const isAssignment = row.campaignType === "assignment";

                      return (
                        <article key={`my-refreshment-${row.campaignId}`} className="grid gap-3 rounded-xl border border-border bg-background p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                {refreshmentStatusBadge(row.status)}
                                <Badge variant="outline" className="rounded-full">{row.campaignType}</Badge>
                                <Badge variant="outline" className="rounded-full">Deadline {formatDateValue(row.dueAt)}</Badge>
                              </div>
                              <h3 className="font-semibold">{row.campaignTitle}</h3>
                              <p className="text-sm text-muted-foreground">{row.courseTitle}</p>
                            </div>
                            {row.courseId ? (
                              <Button asChild variant="outline" className="h-10 rounded-xl text-xs">
                                <Link href={`/dashboard/chitralearning-lms?previewCourseId=${row.courseId}`}>
                                  <PlayCircle className="size-4" />
                                  Buka My Learning
                                </Link>
                              </Button>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            <span>Score {row.score == null ? "-" : `${row.score}%`}</span>
                            <span>Minimal lolos {row.passingScore}%</span>
                            <span>{assignmentResponse ? `Submitted ${formatDateValue(assignmentResponse.submittedAt)}` : "Belum submit"}</span>
                          </div>
                          {isAssignment && row.status !== "passed" ? (
                            <form action={submitInternalLmsAssignmentResponseAction} className="grid gap-2 rounded-lg bg-surface-container-low/50 p-3">
                              <input type="hidden" name="campaignId" value={row.campaignId} />
                              {campaign?.assignmentPrompt ? (
                                <p className="text-sm font-medium">{campaign.assignmentPrompt}</p>
                              ) : null}
                              <Textarea name="responseText" rows={3} placeholder="Jawaban / ringkasan assignment" />
                              {/* ponytail: upload file asli bisa ditambah belakangan; MVP menyimpan URL file evidence dulu. */}
                              <Input name="fileUrl" placeholder="URL file evidence / SharePoint / Drive" />
                              <Button type="submit" className="h-10 w-full rounded-lg sm:w-fit">
                                <Send className="size-4" />
                                Submit assignment
                              </Button>
                            </form>
                          ) : null}
                        </article>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center text-sm text-muted-foreground">
                      Belum ada refreshment yang ditargetkan ke akun ini.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-sm">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="size-5 text-primary" />
                Campaign refreshment
              </CardTitle>
              <CardDescription className="not-sr-only text-sm">
                Draft tidak live. Publish akan membuat assignment peserta dan enrollment course bila campaign memakai quiz/post test.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[260px]">Campaign</TableHead>
                    <TableHead className="min-w-[120px]">Status</TableHead>
                    <TableHead className="min-w-[180px]">Target</TableHead>
                    <TableHead className="min-w-[130px]">Deadline</TableHead>
                    <TableHead className="min-w-[100px] text-center">Peserta</TableHead>
                    <TableHead className="min-w-[120px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {internalWorkspace.campaigns.length > 0 ? (
                    internalWorkspace.campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-semibold">{campaign.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {INTERNAL_LMS_CAMPAIGN_TYPES.find((type) => type.value === campaign.campaignType)?.label || campaign.campaignType} - {courseNameById.get(campaign.courseId ?? 0) || "Tanpa course"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full">{campaign.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {campaign.targetType}: {campaign.targetValue}
                        </TableCell>
                        <TableCell className="text-sm">{formatDateValue(campaign.dueAt)}</TableCell>
                        <TableCell className="text-center font-semibold">
                          {campaignParticipantCountById.get(campaign.id) ?? 0}
                        </TableCell>
                        <TableCell>
                          <form action={publishInternalLmsCampaignAction} className="flex justify-end">
                            <input type="hidden" name="campaignId" value={campaign.id} />
                            <Button
                              type="submit"
                              variant="outline"
                              disabled={!internalWorkspace.schemaReady || campaign.status !== "draft"}
                              className="h-9 rounded-lg px-3 text-xs"
                            >
                              Publish
                            </Button>
                          </form>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                        Belum ada campaign refreshment.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-sm">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg">Peserta refreshment</CardTitle>
              <CardDescription className="not-sr-only text-sm">
                Filter mengikuti dashboard management. Menampilkan maksimal 80 peserta.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <MinimalTableShell
                label="chitralearning-refreshment"
                fileName="chitralearning-refreshment"
                searchPlaceholder="Cari campaign, peserta, section..."
                dateFilter={false}
                showImport={false}
                summaryClassName="bg-transparent px-1 py-0 shadow-none"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[260px]">Campaign</TableHead>
                      <TableHead className="min-w-[240px]">Peserta</TableHead>
                      <TableHead className="min-w-[120px]">Status</TableHead>
                      <TableHead className="min-w-[100px]">Score</TableHead>
                      <TableHead className="min-w-[130px]">Deadline</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refreshmentRows.length > 0 ? (
                      refreshmentRows.slice(0, 80).map((row) => (
                        <TableRow key={`${row.campaignId}-${row.employeeId}`}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-semibold">{row.campaignTitle}</p>
                              <p className="text-xs text-muted-foreground">
                                {row.campaignType} - {row.courseTitle}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{row.employeeName}</p>
                              <p className="text-xs text-muted-foreground">
                                {row.site || "-"} - {row.department || "-"} / {row.section || "-"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{refreshmentStatusBadge(row.status)}</TableCell>
                          <TableCell className="text-sm font-semibold">
                            {row.score == null ? "-" : `${row.score}%`}
                          </TableCell>
                          <TableCell className="text-sm">{formatDateValue(row.dueAt)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                          Belum ada campaign published atau target belum cocok dengan filter.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </MinimalTableShell>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-learning" className="outline-none">
          <div className="grid gap-4">
            {previewCourseId ? (
              <Card className="rounded-[1.2rem] border-0 bg-amber-500/5 shadow-none">
                <CardHeader className="gap-2">
                  <CardTitle className="flex items-center gap-2 text-base text-amber-900">
                    <Eye className="size-4" />
                    Mode preview peserta
                  </CardTitle>
                  <CardDescription className="not-sr-only text-sm text-amber-800/80">
                    Course draft bisa dicek trainer di sini. User biasa hanya melihat course published dengan rule akses aktif.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : null}

            <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
              <CardHeader className="gap-3 pb-0 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GraduationCap className="size-5 text-primary" />
                    My Learning
                  </CardTitle>
                  <CardDescription className="not-sr-only text-sm">
                    Course wajib untuk {employeeName}. Pretest dibuka sebelum materi; post test dibuka setelah materi.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-0 bg-primary/10 text-primary hover:bg-primary/10">
                    {completedMyLearning}/{learnerCourses.length} lulus
                  </Badge>
                  <Badge variant="outline" className="rounded-full">
                    Progress rata-rata {myAverageProgress}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 pt-4">
                {learnerCourses.length > 0 ? (
                  learnerCourses.map((course) => {
                    const enrollment = course.enrollment;
                    const score = enrollment?.posttestScore ?? enrollment?.score ?? null;
                    const pretestDone = course.pretestQuestions.length === 0 || enrollment?.pretestStatus === "completed";
                    const canOpenPostTest =
                      Boolean(enrollment) &&
                      pretestDone &&
                      (course.lessons.length === 0 || (enrollment?.progress ?? 0) >= 60);
                    const isPreviewDraft = previewCourseId === course.id && course.status !== "published";

                    return (
                      <article
                        key={course.id}
                        className="grid gap-4 rounded-xl border border-border bg-background p-3 shadow-sm sm:p-4"
                      >
                        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="rounded-full">Wajib</Badge>
                              {learnerStatusBadge(course)}
                              <Badge variant="outline" className="rounded-full">
                                Deadline {formatDateValue(course.dueAt)}
                              </Badge>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold leading-tight">{course.title}</h3>
                              <p className="mt-1 text-sm text-muted-foreground">{course.description || "Materi internal ChitraLearning."}</p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 sm:min-w-56">
                            {!enrollment ? (
                              isPreviewDraft ? (
                                <Button disabled className="h-11 w-full rounded-xl">
                                  Mode Preview
                                </Button>
                              ) : (
                                <form action={startInternalLmsCourseAction}>
                                  <input type="hidden" name="courseId" value={course.id} />
                                  <Button type="submit" className="h-11 w-full rounded-xl">
                                    <PlayCircle className="size-4" />
                                    Mulai
                                  </Button>
                                </form>
                              )
                            ) : course.posttestPassed && course.certificate ? (
                              <Button asChild className="h-11 w-full rounded-xl">
                                <Link href={`/api/chitralearning-lms/certificates/${course.certificate.id}`}>
                                  <Download className="size-4" />
                                  Download Certificate
                                </Link>
                              </Button>
                            ) : enrollment.status === "passed" ? (
                              <Button disabled className="h-11 w-full rounded-xl">
                                Lulus
                              </Button>
                            ) : (
                              <Button disabled variant="outline" className="h-11 w-full rounded-xl">
                                {pretestDone ? "Lanjutkan" : "Mulai Pretest"}
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium">Progress</span>
                            <span className="font-semibold">{enrollment?.progress ?? 0}%</span>
                          </div>
                          <Progress value={enrollment?.progress ?? 0} className="h-2.5" />
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span>Score {score == null ? "-" : `${score}%`}</span>
                            <span>Minimal lolos {course.passingScore}%</span>
                            <span>Pretest {enrollment?.pretestScore == null ? "-" : `${enrollment.pretestScore}%`}</span>
                          </div>
                        </div>

                        {!enrollment ? (
                          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                            Tekan Mulai untuk membuka pretest, materi, post test, dan progress resume video.
                          </div>
                        ) : !pretestDone ? (
                          <section className="grid gap-3">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              <ClipboardCheck className="size-4 text-primary" />
                              Pretest
                            </div>
                            <QuizForm
                              courseId={course.id}
                              phase="pretest"
                              questions={course.pretestQuestions}
                              actionLabel="Submit Pretest"
                            />
                          </section>
                        ) : (
                          <div className="grid gap-4">
                            <section className="grid gap-3">
                              <div className="flex items-center gap-2 text-sm font-semibold">
                                <FileText className="size-4 text-primary" />
                                Materi
                              </div>
                              {course.lessons.length > 0 ? (
                                <div className="grid gap-3">
                                  {course.lessons.map((lesson) => (
                                    <div key={lesson.id} className="grid gap-3 rounded-lg border border-border bg-muted/10 p-3">
                                      <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                          <p className="font-semibold">{lesson.title}</p>
                                          <p className="text-sm text-muted-foreground">
                                            {lesson.description || `${lesson.lessonType} - ${lesson.durationMinutes || 0} menit`}
                                          </p>
                                        </div>
                                        <Badge variant="outline" className="rounded-full">{lesson.lessonType}</Badge>
                                      </div>
                                      {lesson.lessonType === "video" && lesson.videoUrl ? (
                                        <ChitraLearningVideoPlayer
                                          enrollmentId={enrollment.id}
                                          lessonId={lesson.id}
                                          videoUrl={lesson.videoUrl}
                                          initialSeconds={
                                            enrollment.lastLessonId === lesson.id ? enrollment.lastPositionSeconds : 0
                                          }
                                        />
                                      ) : null}
                                      {lesson.fileUrl ? (
                                        <Button asChild variant="outline" className="h-10 w-full rounded-lg sm:w-fit">
                                          <Link href={lesson.fileUrl} target="_blank">
                                            <ExternalLink className="size-4" />
                                            Buka file
                                          </Link>
                                        </Button>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                                  Materi belum dibuat.
                                </div>
                              )}
                            </section>

                            {course.posttestFailed ? (
                              <div className="grid gap-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
                                <p className="text-sm font-semibold text-rose-800">
                                  Gagal. Ulang test atau ulang materi.
                                </p>
                                <form action={restartInternalLmsMaterialAction}>
                                  <input type="hidden" name="courseId" value={course.id} />
                                  <Button type="submit" variant="outline" className="h-10 w-full rounded-lg sm:w-fit">
                                    <RotateCcw className="size-4" />
                                    Ulang materi
                                  </Button>
                                </form>
                              </div>
                            ) : null}

                            <section className="grid gap-3">
                              <div className="flex items-center gap-2 text-sm font-semibold">
                                <ClipboardCheck className="size-4 text-primary" />
                                Post test
                              </div>
                              {canOpenPostTest ? (
                                <QuizForm
                                  courseId={course.id}
                                  phase="posttest"
                                  questions={course.posttestQuestions}
                                  actionLabel={course.posttestFailed ? "Ulang Test" : "Ambil Post Test"}
                                />
                              ) : (
                                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                                  Selesaikan pretest dan materi dulu sebelum ambil post test.
                                </div>
                              )}
                            </section>
                          </div>
                        )}
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                    Belum ada course published yang cocok dengan rule akses karyawan ini.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="outline-none">
          <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="size-5 text-primary" />
                Katalog kursus dari LMS
              </CardTitle>
              <CardDescription>Daftar kursus yang sudah punya aktivitas peserta.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <MinimalTableShell
                label="courses"
                fileName="chitralearning-course-catalog"
                searchPlaceholder="Cari kursus..."
                dateFilter={false}
                showImport={false}
                summaryClassName="bg-transparent px-1 py-0 shadow-none"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[320px]">Kursus</TableHead>
                      <TableHead className="min-w-[120px] text-center">Peserta</TableHead>
                      <TableHead className="min-w-[220px]">Progress rata-rata</TableHead>
                      <TableHead className="min-w-[140px]">Selesai</TableHead>
                      <TableHead className="min-w-[120px] text-right">Nilai rata-rata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courseSummaries.length > 0 ? (
                      courseSummaries.map((course) => (
                        <TableRow key={course.courseId}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground">{course.courseName}</p>
                              <p className="text-xs text-muted-foreground">ID Kursus: #{course.courseId}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold">{course.enrolled}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Progress value={course.averageProgress} className="h-2 max-w-[170px]" />
                              <span className="w-10 text-xs font-semibold">{course.averageProgress}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="border-0 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10">
                              {course.completed}/{course.enrolled} selesai
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{course.averageGrade ?? "-"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                          Belum ada kursus yang terbaca untuk workspace baru.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </MinimalTableShell>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learners" className="outline-none">
          <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="size-5 text-primary" />
                Progress peserta
              </CardTitle>
              <CardDescription>Enrollment LMS dipetakan ke User Management HERO bila email/SN cocok.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <MinimalTableShell
                label="learning-detail"
                fileName="chitralearning-learning-detail"
                searchPlaceholder="Cari kursus atau karyawan..."
                dateFilter={false}
                showImport={false}
                summaryClassName="bg-transparent px-1 py-0 shadow-none"
              >
                <LmsGroupedTable lmsRecords={records} connectionError={connectionError} />
              </MinimalTableShell>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blueprint" className="outline-none">
          <div className="grid gap-4 md:grid-cols-2">
            {LMS_SCOPE.map((item) => (
              <Card key={item.title} className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-sm">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <item.icon className="size-5" />
                      </span>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                    </div>
                    <Badge variant="outline" className="rounded-full">{item.status}</Badge>
                  </div>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card className="mt-5 rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ListChecks className="size-5 text-primary" />
                Mapping fitur dari referensi e-lms
              </CardTitle>
              <CardDescription>
                Semua fitur utama referensi dicatat di sini. Yang aman untuk internal sudah aktif read-only; fitur commerce ditahan supaya tidak mengubah operasional HERO.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[240px]">Fitur referensi</TableHead>
                    <TableHead className="min-w-[260px]">Source route/API</TableHead>
                    <TableHead className="min-w-[260px]">Implementasi HERO</TableHead>
                    <TableHead className="min-w-[130px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {LMS_REFERENCE_FEATURES.map((item) => (
                    <TableRow key={item.feature}>
                      <TableCell className="font-semibold">{item.feature}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.source}</TableCell>
                      <TableCell className="text-sm">{item.target}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full">
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
