import { NextResponse } from 'next/server'
import { runAttendanceReminderTick } from '@/lib/attendance-reminders'

function isAuthorizedCronRequest(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false

  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${cronSecret}`) return true

  const headerSecret = request.headers.get('x-cron-secret')
  if (headerSecret === cronSecret) return true

  const url = new URL(request.url)
  if (url.searchParams.get('secret') === cronSecret) return true

  return false
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized: Invalid or missing CRON_SECRET' },
      { status: 401 }
    )
  }

  try {
    const result = await runAttendanceReminderTick()
    return NextResponse.json({
      ok: true,
      data: result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Attendance reminder tick failed.'
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}
