import { NextResponse } from 'next/server'
import { getPublicOvertimeEvidenceData } from '@/lib/overtime-evidence-data'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const decodedId = decodeURIComponent(id)
    const data = await getPublicOvertimeEvidenceData(decodedId)
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Dokumen SPL tidak ditemukan' },
        { status: 404 }
      )
    }
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('Error fetching overtime evidence:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat bukti lembur' },
      { status: 500 }
    )
  }
}
