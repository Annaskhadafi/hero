import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { chitraLearningCertificates, chitraLearningCourses, employees, chitraLearningEnrollments, trainingRecords } from '@/db/schema/hero'
import { eq, desc, and, or } from 'drizzle-orm'
import { Award, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Sertifikat | ChitraLearning LMS',
}

export default async function LmsCertificatesPage() {
  const session = await getServerSession()
  if (!session?.user?.email) {
    redirect('/sign-in')
  }

  // Fetch employee
  const [employee] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1)

  if (!employee) {
    return (
      <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50">
        <p className="text-slate-500">Data karyawan tidak ditemukan untuk email Anda.</p>
      </div>
    )
  }

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
        eq(chitraLearningEnrollments.employeeId, employee.id),
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
          eq(chitraLearningCertificates.employeeId, employee.id)
        )
      )
      .limit(1)

    if (!existing) {
      // Create training record
      const [tr] = await db
        .insert(trainingRecords)
        .values({
          employeeId: employee.id,
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
          employeeId: employee.id,
          enrollmentId: enrollment.id,
          trainingRecordId: tr?.id ?? null,
          certificateNumber: `CL-${new Date().getFullYear()}-${enrollment.courseId}-${employee.id}`,
          status: "issued",
          metadata: {
            source: "chitralearning-internal",
            issuedBy: employee.id,
          },
        })
    }
  }

  // Fetch actual certificates from DB
  const certificates = await db
    .select({
      id: chitraLearningCertificates.id,
      certificateNumber: chitraLearningCertificates.certificateNumber,
      issuedAt: chitraLearningCertificates.issuedAt,
      courseTitle: chitraLearningCourses.title,
    })
    .from(chitraLearningCertificates)
    .innerJoin(chitraLearningCourses, eq(chitraLearningCertificates.courseId, chitraLearningCourses.id))
    .where(eq(chitraLearningCertificates.employeeId, employee.id))
    .orderBy(desc(chitraLearningCertificates.issuedAt))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
          <Award className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading">Sertifikat Anda</h1>
          <p className="text-slate-500">Lihat dan unduh sertifikat dari kursus yang telah diselesaikan.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {certificates.map(cert => (
          <div key={cert.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm group flex flex-col justify-between">
            <div>
              <div className="bg-slate-50 h-32 flex items-center justify-center border-b border-slate-100">
                <Award className="h-16 w-16 text-slate-300 group-hover:text-emerald-400 transition-colors" />
              </div>
              <div className="p-5">
                <h3 className="font-heading font-semibold text-slate-900 mb-2 line-clamp-2">{cert.courseTitle}</h3>
                <div className="space-y-1 text-sm text-slate-500 mb-4">
                  <div className="flex justify-between">
                    <span>Nomor:</span>
                    <span className="font-mono text-slate-700 text-xs">{cert.certificateNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tanggal:</span>
                    <span>{new Date(cert.issuedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 pt-0">
              <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-white transition-colors" asChild>
                <Link href={`/verify-certificate/${cert.certificateNumber}`}>
                  <Eye className="mr-2 h-4 w-4" /> Lihat & Unduh
                </Link>
              </Button>
            </div>
          </div>
        ))}
        {certificates.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
            <Award className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">Belum ada sertifikat</h3>
            <p className="text-slate-500">Selesaikan kursus untuk mendapatkan sertifikat Anda.</p>
          </div>
        )}
      </div>
    </div>
  )
}
