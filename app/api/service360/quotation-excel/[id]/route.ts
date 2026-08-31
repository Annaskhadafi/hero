import { NextRequest, NextResponse } from 'next/server'
import { generateQuotationExcel } from '@/lib/quotation-excel'
import { getServerSession } from '@/lib/auth-session'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const quotationId = parseInt(id)
    if (isNaN(quotationId)) {
      return NextResponse.json({ error: 'Invalid quotation ID' }, { status: 400 })
    }

    const buffer = await generateQuotationExcel(quotationId)

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="quotation-${quotationId}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Quotation excel export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    )
  }
}
