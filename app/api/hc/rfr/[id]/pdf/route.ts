import { NextResponse } from 'next/server'
import { getRfrDetail } from '@/app/actions/rfr'
import { generateRfrPdf } from '@/lib/rfr-pdf'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { hcRfrApprovals, hcRfrRequests } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const rawNumber = id.replace(/^rfr-/, '')
    let rfrId = parseInt(rawNumber, 10)

    if (isNaN(rfrId)) {
      return NextResponse.json({ error: 'ID RFR tidak valid' }, { status: 400 })
    }

    let detail = await getRfrDetail(rfrId)
    
    // If not found directly by rfrId, try lookup by approvalId
    if (!detail || !detail.rfr) {
      const [approvalRow] = await db
        .select({ rfrId: hcRfrApprovals.rfrId })
        .from(hcRfrApprovals)
        .where(eq(hcRfrApprovals.id, rfrId))
        .limit(1)

      if (approvalRow?.rfrId) {
        rfrId = approvalRow.rfrId
        detail = await getRfrDetail(rfrId)
      }
    }

    if (!detail || !detail.rfr) {
      return NextResponse.json({ error: 'RFR tidak ditemukan' }, { status: 404 })
    }

    const pdfBuffer = await generateRfrPdf({
      rfrNumber: detail.rfr.rfrNumber,
      requestDate: detail.rfr.requestDate,
      joinDateEstimation: detail.rfr.joinDateEstimation,
      requestorName: detail.rfr.requestorName,
      sectionDepartment: detail.rfr.sectionDepartment,
      receivedByHr: detail.rfr.receivedByHr,
      positionTitle: detail.rfr.positionTitle,
      numberOfPersons: detail.rfr.numberOfPersons,
      briefJobDescription: detail.rfr.briefJobDescription,
      level: detail.rfr.level,
      reasonForRequest: detail.rfr.reasonForRequest,
      mppStatus: detail.rfr.mppStatus,
      reasonsIfNonBudgeted: detail.rfr.reasonsIfNonBudgeted,
      employmentStatus: detail.rfr.employmentStatus,
      contractDurationMonths: detail.rfr.contractDurationMonths,
      attachmentMpp: detail.rfr.attachmentMpp,
      attachmentJd: detail.rfr.attachmentJd,
      sexPreference: detail.rfr.sexPreference,
      agePreference: detail.rfr.agePreference,
      educationDegree: detail.rfr.educationDegree,
      educationBackground: detail.rfr.educationBackground as string[],
      yearsOfExperience: detail.rfr.yearsOfExperience,
      fieldOfJobExperience: detail.rfr.fieldOfJobExperience,
      functionalCompetencies: detail.rfr.functionalCompetencies as any[],
      approvals: detail.approvals,
    })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${detail.rfr.rfrNumber}_Request_For_Recruitment.pdf"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error: any) {
    console.error('[RFR PDF API] Error:', error)
    return NextResponse.json({ error: 'Gagal membuat file PDF RFR' }, { status: 500 })
  }
}
