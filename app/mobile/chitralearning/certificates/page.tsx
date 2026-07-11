import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { employees, chitraLearningEnrollments, chitraLearningCertificates, chitraLearningCourses, trainingRecords } from '@/db/schema/hero'
import { eq, and, or } from 'drizzle-orm'
import { getInternalLmsWorkspaceData, buildInternalLmsLearnerCourses } from '@/lib/chitralearning-lms'
import { MobileCourseCover } from '@/components/mobile/mobile-course-cover'
import { Award, BookOpen, Calendar, ExternalLink, Star } from 'lucide-react'

export default async function MobileCertificatesPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  const [employeeRows] = await db.select().from(employees).where(eq(employees.email, session.user.email)).limit(1)
  const currentEmployee = employeeRows ?? null

  if (currentEmployee) {
    // Auto-heal missing certificates
    const completedEnrollments = await db
      .select({
        id: chitraLearningEnrollments.id,
        courseId: chitraLearningEnrollments.courseId,
        courseTitle: chitraLearningCourses.title,
        certificateEnabled: chitraLearningCourses.certificateEnabled,
        completedAt: chitraLearningEnrollments.completedAt,
      })
      .from(chitraLearningEnrollments)
      .innerJoin(chitraLearningCourses, eq(chitraLearningEnrollments.courseId, chitraLearningCourses.id))
      .where(
        and(
          eq(chitraLearningEnrollments.employeeId, currentEmployee.id),
          or(
            eq(chitraLearningEnrollments.status, 'passed'),
            eq(chitraLearningEnrollments.progress, 100)
          )
        )
      )

    for (const enrollment of completedEnrollments) {
      if (!enrollment.certificateEnabled) continue;
      // Check if certificate exists
      const [existing] = await db
        .select({ id: chitraLearningCertificates.id })
        .from(chitraLearningCertificates)
        .where(
          and(
            eq(chitraLearningCertificates.courseId, enrollment.courseId),
            eq(chitraLearningCertificates.employeeId, currentEmployee.id)
          )
        )
        .limit(1)

      if (!existing) {
        // Create training record
        const [tr] = await db
          .insert(trainingRecords)
          .values({
            employeeId: currentEmployee.id,
            trainingName: enrollment.courseTitle,
            provider: "ChitraLearning LMS Internal",
            completedYear: enrollment.completedAt ? enrollment.completedAt.getFullYear() : new Date().getFullYear(),
            status: "valid",
          })
          .returning({ id: trainingRecords.id })

        // Create certificate
        await db
          .insert(chitraLearningCertificates)
          .values({
            courseId: enrollment.courseId,
            employeeId: currentEmployee.id,
            enrollmentId: enrollment.id,
            trainingRecordId: tr?.id ?? null,
            certificateNumber: `CL-${new Date().getFullYear()}-${enrollment.courseId}-${currentEmployee.id}`,
            status: "issued",
            metadata: {
              source: "chitralearning-internal",
              issuedBy: currentEmployee.id,
            },
          })
      }
    }
  }

  const workspaceData = await getInternalLmsWorkspaceData()
  const learnerCourses = buildInternalLmsLearnerCourses(workspaceData, currentEmployee)

  const certifiedCourses = learnerCourses.filter(c => !!c.certificate)

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <section className="space-y-0.5">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">ChitraLearning</p>
        <h1 className="text-2xl font-black tracking-tight text-[#003461]">Sertifikat Saya</h1>
        <p className="text-xs font-semibold text-[#486275]">{certifiedCourses.length} sertifikat diperoleh</p>
      </section>

      {/* Summary card */}
      <section className="rounded-[1.35rem] overflow-hidden shadow-[0_16px_40px_rgba(0,52,97,0.15)]">
        <div className="bg-gradient-to-br from-[#003461] via-[#004f8a] to-[#0ea5b0] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#7ec8e3]">Total Sertifikat</p>
              <p className="mt-1 text-4xl font-black text-white">{certifiedCourses.length}</p>
            </div>
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <Award className="size-7 text-amber-300" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <div className="flex-1 rounded-xl bg-white/10 p-3">
              <p className="text-xs font-black text-white">{certifiedCourses.length}</p>
              <p className="mt-0.5 text-[9px] font-bold text-[#b9dff6]">Kursus Selesai</p>
            </div>
            <div className="flex-1 rounded-xl bg-white/10 p-3">
              <p className="text-xs font-black text-white">
                {certifiedCourses.filter(c => c.certificate?.expiresAt && new Date(c.certificate.expiresAt) > new Date()).length}
              </p>
              <p className="mt-0.5 text-[9px] font-bold text-[#b9dff6]">Masih Berlaku</p>
            </div>
          </div>
        </div>
      </section>

      {/* Certificate List */}
      <section className="space-y-3">
        {certifiedCourses.length === 0 ? (
          <div className="rounded-[1.35rem] bg-white p-10 text-center shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <Award className="mx-auto mb-3 size-12 text-[#486275]/20" />
            <p className="font-black text-[#082033]">Belum ada sertifikat</p>
            <p className="mt-1 text-xs font-semibold text-[#486275]">
              Selesaikan kursus bersertifikat untuk mendapatkan sertifikat Anda.
            </p>
            <Link
              href="/mobile/chitralearning/courses"
              className="mt-4 inline-block rounded-[0.75rem] bg-[#003461] px-5 py-2.5 text-xs font-black text-white"
            >
              Jelajahi Kursus
            </Link>
          </div>
        ) : (
          certifiedCourses.map(course => {
            const cert = course.certificate!
            const issuedAt = cert.issuedAt ? new Date(cert.issuedAt) : null
            const expiresAt = cert.expiresAt ? new Date(cert.expiresAt) : null
            const isExpired = expiresAt ? expiresAt < new Date() : false
            const isExpiringSoon = expiresAt && !isExpired
              ? (expiresAt.getTime() - Date.now()) < (30 * 24 * 60 * 60 * 1000)
              : false

            return (
              <div
                key={course.id}
                className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_8px_28px_rgba(8,32,51,0.09)]"
              >
                {/* Gold accent bar + cover */}
                <div className="flex">
                  <div className="w-1 shrink-0 bg-gradient-to-b from-amber-400 to-amber-600" />
                  <div className="flex-1 p-4">
                    <div className="flex items-start gap-3.5">
                      {/* Thumbnail */}
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                        <MobileCourseCover
                          src={course.coverImageUrl}
                          alt={course.title}
                          className="absolute inset-0 h-full w-full"
                          fallbackClassName="absolute inset-0 h-full w-full"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-black text-[#082033] leading-snug line-clamp-2">{course.title}</h3>
                        {course.category && (
                          <p className="mt-0.5 text-[10px] font-semibold text-[#486275]">{course.category}</p>
                        )}
                        <div className="mt-1">
                          {isExpired ? (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-rose-700">Expired</span>
                          ) : isExpiringSoon ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-700">Segera Expired</span>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-700">✓ Valid</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cert info */}
                    <div className="mt-3 rounded-xl bg-[#f6fbff] p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-[#486275] uppercase tracking-wider">Nomor Sertifikat</span>
                        <span className="text-[10px] font-black text-[#082033]">{cert.certificateNumber}</span>
                      </div>
                      {issuedAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-[#486275] uppercase tracking-wider">Diterbitkan</span>
                          <span className="text-[10px] font-black text-[#082033]">
                            {issuedAt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                      {expiresAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-[#486275] uppercase tracking-wider">Berlaku Hingga</span>
                          <span className={`text-[10px] font-black ${isExpired ? 'text-rose-600' : isExpiringSoon ? 'text-amber-600' : 'text-[#082033]'}`}>
                            {expiresAt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* View cert button */}
                    <Link
                      href={`/verify-certificate/${cert.certificateNumber}`}
                      className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-[#003461]/20 text-[10px] font-black uppercase tracking-wider text-[#003461] active:bg-[#e9f6fd] transition-colors"
                    >
                      <ExternalLink className="size-3.5" />
                      Lihat & Unduh Sertifikat
                    </Link>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}
