import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import { getInternalLmsWorkspaceData, buildInternalLmsLearnerCourses } from '@/lib/chitralearning-lms'
import { MobileCourseCover } from '@/components/mobile/mobile-course-cover'
import {
  BookOpen, Award, ChevronRight, Play, Clock, Layers, Star,
  TrendingUp, CheckCircle2, Compass
} from 'lucide-react'

function formatDuration(minutes: number) {
  if (!minutes) return '0m'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}j` : `${h}j ${m}m`
}

function getLevelLabel(level?: string | null) {
  if (level === 'advanced') return 'Mahir'
  if (level === 'intermediate') return 'Menengah'
  return 'Dasar'
}

export default async function MobileChitraLearningHome() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  const [currentEmployeeRows, workspaceData] = await Promise.all([
    db.select().from(employees).where(eq(employees.email, session.user.email)).limit(1),
    getInternalLmsWorkspaceData(),
  ])

  const currentEmployee = currentEmployeeRows[0] || null
  const learnerCourses = buildInternalLmsLearnerCourses(workspaceData, currentEmployee)

  const inProgressCourses = learnerCourses.filter(c => c.enrollment && !c.certificate && c.enrollment.progress < 100 && c.enrollment.approvalStatus === 'approved')
  const completedCourses = learnerCourses.filter(c => c.certificate || (c.enrollment && c.enrollment.progress >= 100))
  const pendingCourses = learnerCourses.filter(c => c.enrollment && c.enrollment.approvalStatus === 'pending')
  const availableCourses = learnerCourses.filter(c => !c.enrollment)

  const resumeCourse = inProgressCourses[0] ?? null
  const resumeProgress = resumeCourse?.enrollment?.progress ?? 0
  const totalMinutes = learnerCourses.reduce((s, c) => s + (c.estimatedMinutes ?? 0), 0)
  const employeeName = currentEmployee?.name?.split(' ')[0] ?? 'Karyawan'

  const hour = new Date().getHours()
  const greeting = hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 19 ? 'Selamat Sore' : 'Selamat Malam'

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <section className="space-y-0.5">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">ChitraLearning</p>
        <h1 className="text-2xl font-black tracking-tight text-[#003461]">{greeting}, {employeeName} 👋</h1>
        <p className="text-xs font-semibold text-[#486275]">Terus belajar, terus berkembang.</p>
      </section>

      {/* Stats Row */}
      <section className="grid grid-cols-3 gap-2.5">
        <div className="rounded-[1.2rem] bg-[#003461] p-3.5 text-white shadow-[0_16px_34px_rgba(0,52,97,0.22)]">
          <Layers className="size-4" />
          <p className="mt-2.5 text-2xl font-black leading-none">{learnerCourses.length}</p>
          <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#b9dff6]">Kursus</p>
        </div>
        <div className="rounded-[1.2rem] bg-[#e9f6fd] p-3.5 text-[#003461] shadow-[0_12px_28px_rgba(8,32,51,0.06)]">
          <CheckCircle2 className="size-4 text-emerald-500" />
          <p className="mt-2.5 text-2xl font-black leading-none text-[#082033]">{completedCourses.length}</p>
          <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#486275]">Selesai</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-3.5 shadow-[0_12px_28px_rgba(8,32,51,0.07)]">
          <Award className="size-4 text-amber-500" />
          <p className="mt-2.5 text-2xl font-black leading-none text-[#082033]">{workspaceData.certificates.filter(c => c.employeeId === currentEmployee?.id).length}</p>
          <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#486275]">Sertifikat</p>
        </div>
      </section>

      {/* Resume / Hero Banner */}
      {resumeCourse ? (
        <section>
          <Link
            href={`/mobile/chitralearning/learn/${resumeCourse.slug}`}
            className="block rounded-[1.35rem] overflow-hidden shadow-[0_20px_48px_rgba(0,52,97,0.18)] active:scale-[0.99] transition-transform"
          >
            {/* Cover */}
            <div
              className="relative h-36 bg-gradient-to-br from-[#003461] via-[#005a9e] to-[#0ea5b0]"
            >
              {resumeCourse.coverImageUrl && (
                <MobileCourseCover
                  src={resumeCourse.coverImageUrl}
                  alt={resumeCourse.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-55"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#003461]/90 via-[#003461]/40 to-transparent" />
              <div className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white">
                <Play className="size-4 fill-white" />
              </div>
              <div className="absolute bottom-3 left-4 right-4">
                <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white/90 backdrop-blur-sm">
                  Lanjut Belajar
                </span>
              </div>
            </div>
            {/* Info */}
            <div className="bg-white px-4 pb-4 pt-3.5">
              <h2 className="text-sm font-black text-[#082033] leading-snug line-clamp-2">{resumeCourse.title}</h2>
              <p className="mt-1 text-[10px] font-semibold text-[#486275]">
                {resumeCourse.category} · {getLevelLabel((resumeCourse as any).level)}
              </p>
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black text-[#003461]">Progress</span>
                  <span className="text-[10px] font-black text-[#003461]">{resumeProgress}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#e9f6fd]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#003461] to-[#0ea5b0] transition-all"
                    style={{ width: `${resumeProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </Link>
        </section>
      ) : (
        <section>
          <Link
            href="/mobile/chitralearning/courses"
            className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-gradient-to-br from-[#003461] to-[#005a9e] px-5 py-5 shadow-[0_16px_40px_rgba(0,52,97,0.22)] active:scale-[0.99] transition-transform"
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b9dff6]">Mulai Belajar</p>
              <p className="mt-1 text-base font-black text-white">Jelajahi Katalog Kursus</p>
              <p className="mt-0.5 text-xs font-semibold text-[#7ec8e3]">{availableCourses.length} kursus tersedia untuk Anda</p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <Compass className="size-5 text-white" />
            </span>
          </Link>
        </section>
      )}

      {/* Quick Nav */}
      <section className="grid grid-cols-4 gap-2">
        {[
          { href: '/mobile/chitralearning/courses', icon: Compass, label: 'Jelajahi', bg: 'bg-[#e9f6fd]', color: 'text-[#003461]' },
          { href: '/mobile/chitralearning/my-learning', icon: BookOpen, label: 'Kursus Saya', bg: 'bg-[#f0fdf4]', color: 'text-emerald-700' },
          { href: '/mobile/chitralearning/certificates', icon: Award, label: 'Sertifikat', bg: 'bg-[#fefce8]', color: 'text-amber-700' },
          { href: '/mobile/chitralearning/my-learning?tab=pending', icon: TrendingUp, label: 'Pengajuan', bg: 'bg-[#fdf4ff]', color: 'text-purple-700' },
        ].map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
          >
            <span className={`flex size-12 items-center justify-center rounded-2xl ${item.bg} ${item.color} shadow-[0_4px_14px_rgba(8,32,51,0.07)]`}>
              <item.icon className="size-5" />
            </span>
            <span className="text-[9px] font-black uppercase tracking-[0.06em] text-[#486275] text-center leading-tight">{item.label}</span>
          </Link>
        ))}
      </section>

      {/* In Progress Courses */}
      {inProgressCourses.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Sedang Berjalan</p>
            <Link href="/mobile/chitralearning/my-learning" className="flex items-center gap-0.5 text-[10px] font-black text-[#003461]">
              Lihat Semua <ChevronRight className="size-3" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {inProgressCourses.slice(0, 3).map(course => (
              <Link
                key={course.id}
                href={`/mobile/chitralearning/learn/${course.slug}`}
                className="flex items-center gap-3 rounded-[1.2rem] bg-white p-3.5 shadow-[0_8px_24px_rgba(8,32,51,0.07)] active:scale-[0.99] transition-transform"
              >
                <div className="relative size-14 shrink-0 rounded-xl overflow-hidden">
                  <MobileCourseCover src={course.coverImageUrl} alt={course.title} className="absolute inset-0 w-full h-full" fallbackClassName="absolute inset-0 w-full h-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[#082033] line-clamp-1">{course.title}</p>
                  <p className="text-[10px] font-semibold text-[#486275] mt-0.5">{course.category}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 rounded-full bg-[#e9f6fd]">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#003461] to-[#0ea5b0]" style={{ width: `${course.enrollment?.progress ?? 0}%` }} />
                    </div>
                    <span className="text-[9px] font-black text-[#003461]">{course.enrollment?.progress ?? 0}%</span>
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-[#486275]" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Pending Approval */}
      {pendingCourses.length > 0 && (
        <section className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Menunggu Persetujuan</p>
          <div className="space-y-2">
            {pendingCourses.slice(0, 2).map(course => (
              <div key={course.id} className="flex items-center gap-3 rounded-[1.2rem] bg-amber-50 border border-amber-100 p-3.5">
                <div className="size-10 shrink-0 rounded-xl overflow-hidden bg-amber-100 flex items-center justify-center">
                  <Clock className="size-5 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[#082033] line-clamp-1">{course.title}</p>
                  <p className="text-[10px] font-semibold text-amber-600 mt-0.5">Menunggu persetujuan</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Available Courses */}
      {availableCourses.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Rekomendasi Kursus</p>
            <Link href="/mobile/chitralearning/courses" className="flex items-center gap-0.5 text-[10px] font-black text-[#003461]">
              Lihat Semua <ChevronRight className="size-3" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {availableCourses.slice(0, 3).map(course => (
              <Link
                key={course.id}
                href={`/mobile/chitralearning/courses/${course.slug}`}
                className="flex items-center gap-3 rounded-[1.2rem] bg-white p-3.5 shadow-[0_8px_24px_rgba(8,32,51,0.07)] active:scale-[0.99] transition-transform"
              >
                <div className="relative size-14 shrink-0 rounded-xl overflow-hidden">
                  <MobileCourseCover src={course.coverImageUrl} alt={course.title} className="absolute inset-0 w-full h-full" fallbackClassName="absolute inset-0 w-full h-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-[#082033] line-clamp-1">{course.title}</p>
                  <p className="text-[10px] font-semibold text-[#486275] mt-0.5">{course.category}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[9px] font-bold text-[#486275] flex items-center gap-1">
                      <Clock className="size-3" /> {formatDuration(course.estimatedMinutes ?? 0)}
                    </span>
                    <span className="text-[9px] font-bold text-[#486275]">· {course.lessonCount} materi</span>
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-[#486275]" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {learnerCourses.length === 0 && (
        <section className="rounded-[1.35rem] bg-white p-8 text-center shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-[#e9f6fd] mx-auto mb-4">
            <BookOpen className="size-8 text-[#003461]" />
          </div>
          <p className="font-black text-[#082033]">Belum ada kursus</p>
          <p className="mt-1 text-xs font-semibold text-[#486275]">Hubungi HR untuk mendapatkan akses kursus.</p>
        </section>
      )}
    </div>
  )
}
