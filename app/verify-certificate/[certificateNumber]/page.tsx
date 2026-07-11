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
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Verifikasi Sertifikat</h1>
          <p className="text-slate-600">
            Sertifikat ini resmi diterbitkan oleh ChitraLearning LMS untuk:
          </p>
          <div className="mt-4 inline-block bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full font-medium border border-emerald-200">
            Terverifikasi Asli ✓
          </div>
        </div>

        <div className="bg-white p-6 md:p-10 rounded-2xl shadow-xl border border-slate-200">
          <div className="flex flex-col md:flex-row gap-8 items-start mb-8 border-b border-slate-100 pb-8">
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Diberikan kepada</p>
                <p className="text-xl font-bold text-slate-900">{certificate.employeeName}</p>
                <p className="text-sm text-slate-600">ID Karyawan: {certificate.employeeSn}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Atas penyelesaian kursus</p>
                <p className="text-lg font-semibold text-blue-700">{certificate.courseTitle}</p>
              </div>
              <div className="flex gap-8">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Tanggal Terbit</p>
                  <p className="font-medium text-slate-900">{certificate.issuedAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">No. Sertifikat</p>
                  <p className="font-medium text-slate-900">{certificate.certificateNumber}</p>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              {/* Optional Company Logo here */}
              <div className="h-24 w-24 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100">
                <span className="text-blue-700 font-bold text-2xl">HERO</span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <CertificateViewer 
              variables={{
                employeeName: certificate.employeeName,
                courseTitle: certificate.courseTitle,
                date: certificate.issuedAt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
                certificateNumber: certificate.certificateNumber
              }} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}
