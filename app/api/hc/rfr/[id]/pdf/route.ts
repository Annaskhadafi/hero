import { NextResponse } from 'next/server'
import { getRfrDetail } from '@/app/actions/rfr'
import { generateRfrPdf } from '@/lib/rfr-pdf'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const rfrId = parseInt(id, 10)
    if (isNaN(rfrId)) {
      return NextResponse.json({ error: 'ID RFR tidak valid' }, { status: 400 })
    }

    const detail = await getRfrDetail(rfrId)
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
      },
    })
  } catch (error: any) {
    console.error('[RFR PDF API] Error:', error)
    return NextResponse.json({ error: 'Gagal membuat file PDF RFR' }, { status: 500 })
  }
}
