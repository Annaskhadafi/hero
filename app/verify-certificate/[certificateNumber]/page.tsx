import { db } from '@/db'
import { chitraLearningCertificates, chitraLearningCourses, employees, chitraLearningEnrollments, trainingRecords } from '@/db/schema/hero'
import { eq, and, or } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { CertificateViewer } from './client-viewer'
import Image from 'next/image'

export const metadata = {
  title: 'Verifikasi Sertifikat | ChitraLearning',
}

export default async function VerifyCertificatePage({ params }: { params: Promise<{ certificateNumber: string }> }) {
  const { certificateNumber } = await params
  const certificateRows = await db
    .select({
      id: chitraLearningCertificates.id,
      certificateNumber: chitraLearningCertificates.certificateNumber,
      issuedAt: chitraLearningCertificates.issuedAt,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      courseTitle: chitraLearningCourses.title,
      courseId: chitraLearningCourses.id,
    })
    .from(chitraLearningCertificates)
    .innerJoin(employees, eq(chitraLearningCertificates.employeeId, employees.id))
    .innerJoin(chitraLearningCourses, eq(chitraLearningCertificates.courseId, chitraLearningCourses.id))
    .where(eq(chitraLearningCertificates.certificateNumber, certificateNumber))
    .limit(1)

  let certificate = certificateRows[0] || null

  if (!certificate) {
    const match = certificateNumber.match(/^CL-(\d+)-(\d+)-(\d+)$/)
    if (match) {
      const year = parseInt(match[1])
      const courseId = parseInt(match[2])
      const employeeId = parseInt(match[3])

      // Verify enrollment eligibility
      const [enrollment] = await db
        .select({
          id: chitraLearningEnrollments.id,
          completedAt: chitraLearningEnrollments.completedAt,
          courseTitle: chitraLearningCourses.title,
          employeeName: employees.name,
          employeeSn: employees.employeeSn,
        })
        .from(chitraLearningEnrollments)
        .innerJoin(chitraLearningCourses, eq(chitraLearningEnrollments.courseId, chitraLearningCourses.id))
        .innerJoin(employees, eq(chitraLearningEnrollments.employeeId, employees.id))
        .where(
          and(
            eq(chitraLearningEnrollments.courseId, courseId),
            eq(chitraLearningEnrollments.employeeId, employeeId),
            or(
              eq(chitraLearningEnrollments.status, 'passed'),
              eq(chitraLearningEnrollments.progress, 100)
            )
          )
        )
        .limit(1)

      if (enrollment) {
        // Issue certificate automatically
        const [tr] = await db
          .insert(trainingRecords)
          .values({
            employeeId,
            trainingName: enrollment.courseTitle,
            provider: "ChitraLearning LMS Internal",
            completedYear: enrollment.completedAt ? enrollment.completedAt.getFullYear() : year,
            status: "valid",
          })
          .returning({ id: trainingRecords.id })

        const [createdCert] = await db
          .insert(chitraLearningCertificates)
          .values({
            courseId,
            employeeId,
            enrollmentId: enrollment.id,
            trainingRecordId: tr?.id ?? null,
            certificateNumber: certificateNumber,
            status: "issued",
            metadata: {
              source: "chitralearning-internal-autoheal",
              issuedBy: employeeId,
            },
          })
          .returning()

        if (createdCert) {
          certificate = {
            id: createdCert.id,
            certificateNumber: createdCert.certificateNumber,
            issuedAt: createdCert.issuedAt,
            employeeName: enrollment.employeeName,
            employeeSn: enrollment.employeeSn,
            courseTitle: enrollment.courseTitle,
            courseId,
          }
        }
      }
    }
  }

  if (!certificate) {
    notFound()
  }



  return (
    <main className="flex min-h-dvh items-start justify-center bg-slate-50 px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="w-full max-w-5xl">
        <header className="mb-6 text-center sm:mb-10">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Verifikasi Sertifikat</h1>
          <p className="mx-auto max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            Sertifikat ini resmi diterbitkan oleh ChitraLearning LMS untuk:
          </p>
          <div className="mt-4 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700 sm:px-4">
            Terverifikasi Asli
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/60 sm:p-6 lg:p-10">
          <div className="mb-5 flex flex-col items-start gap-6 border-b border-slate-100 pb-5 sm:mb-8 sm:pb-8 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500 sm:text-sm">Diberikan kepada</p>
                <p className="break-words text-lg font-bold text-slate-900 sm:text-xl">{certificate.employeeName}</p>
                <p className="break-all text-sm text-slate-600">ID Karyawan: {certificate.employeeSn}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500 sm:text-sm">Atas penyelesaian kursus</p>
                <p className="text-base font-semibold leading-6 text-blue-700 sm:text-lg">{certificate.courseTitle}</p>
              </div>
              <dl className="grid gap-4 sm:grid-cols-2 sm:gap-8">
                <div className="min-w-0">
                  <dt className="mb-1 text-xs font-medium text-slate-500 sm:text-sm">Tanggal Terbit</dt>
                  <dd className="font-medium text-slate-900">{certificate.issuedAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="mb-1 text-xs font-medium text-slate-500 sm:text-sm">No. Sertifikat</dt>
                  <dd className="break-all font-mono text-sm font-semibold text-slate-900 sm:text-base">{certificate.certificateNumber}</dd>
                </div>
              </dl>
            </div>
            <div className="hidden shrink-0 md:block" aria-hidden="true">
              <div className="flex size-24 items-center justify-center rounded-full border border-blue-100 bg-blue-50">
                <span className="text-2xl font-bold text-blue-700">HERO</span>
              </div>
            </div>
          </div>

          <div className="flex w-full justify-center">
            <CertificateViewer 
              variables={{
                employeeName: certificate.employeeName,
                courseTitle: certificate.courseTitle,
                date: certificate.issuedAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
                certificateNumber: certificate.certificateNumber
              }} 
            />
          </div>
        </section>
      </div>
    </main>
  )
}
