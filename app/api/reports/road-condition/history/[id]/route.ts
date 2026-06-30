import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/db'
import { roadConditionReports } from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { ensureRoadConditionReportTable } from '@/lib/road-condition-history'
import { ROAD_CONDITION_RESOURCE } from '@/lib/road-condition-rubric'

export const runtime = 'nodejs'

async function requireAccess() {
  const session = await getServerSession()
  if (!session?.user?.email) throw new Error('Unauthorized')

  const permission = await getCurrentMenuPermission(ROAD_CONDITION_RESOURCE)
  if (!permission.canView) throw new Error('Akses ditolak.')

  return session
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAccess()
    await ensureRoadConditionReportTable()

    const { id } = await params
    const reportId = Number(id)
    if (!Number.isInteger(reportId) || reportId <= 0) {
      return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 })
    }

    const [deleted] = await db
      .delete(roadConditionReports)
      .where(eq(roadConditionReports.id, reportId))
      .returning({ id: roadConditionReports.id })

    if (!deleted) {
      return NextResponse.json({ error: 'History report tidak ditemukan.' }, { status: 404 })
    }

    return NextResponse.json({ success: true, deletedId: deleted.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menghapus history.'
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 })
  }
}
