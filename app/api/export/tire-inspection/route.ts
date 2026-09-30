import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tireRepairInspections, tireRepairPhotos } from '@/db/schema/tire-repair';
import { ensureTireRepairSchema } from '@/app/actions/tire-repair-actions';
import { generateTireInspectionExcelBuffer } from '@/lib/tire-inspection-excel-helper';
import { desc, eq } from 'drizzle-orm';
import type { TireRepairInspectionRecord } from '@/lib/tire-repair-constants';

export async function GET(request: NextRequest) {
  try {
    await ensureTireRepairSchema();

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month') || undefined;
    const year = searchParams.get('year') || undefined;
    const ids = searchParams.get('ids') ? searchParams.get('ids')!.split(',').map(Number) : undefined;

    // Fetch inspections
    const recordsRaw = await db
      .select()
      .from(tireRepairInspections)
      .orderBy(desc(tireRepairInspections.createdAt));

    // Fetch photos
    const allPhotos = await db.select().from(tireRepairPhotos);
    const photosByInspection: Record<number, typeof allPhotos> = {};
    allPhotos.forEach((p) => {
      if (!photosByInspection[p.inspectionId]) {
        photosByInspection[p.inspectionId] = [];
      }
      photosByInspection[p.inspectionId].push(p);
    });

    let records: TireRepairInspectionRecord[] = recordsRaw.map((item) => ({
      ...item,
      photos: photosByInspection[item.id] || [],
    }));

    if (ids && ids.length > 0) {
      records = records.filter((r) => ids.includes(r.id));
    }

    const buffer = await generateTireInspectionExcelBuffer(records, { month, year });

    const monthStr = month ? String(month).padStart(2, '0') : String(new Date().getMonth() + 1).padStart(2, '0');
    const yearStr = year || String(new Date().getFullYear());
    const fileName = `TYRE_INSPECTION_REPORT_CP_KPC_${monthStr}_${yearStr}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('Export Excel API error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal mengeksport file Excel' },
      { status: 500 }
    );
  }
}
