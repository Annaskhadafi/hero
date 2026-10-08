import { NextRequest, NextResponse } from 'next/server';
import { fetchMaritalStatusRequestById } from '@/lib/marital-status-data';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requestId = parseInt(id, 10);
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'ID permohonan tidak valid' }, { status: 400 });
    }

    const data = await fetchMaritalStatusRequestById(requestId);
    if (!data) {
      return NextResponse.json({ error: 'Permohonan tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
