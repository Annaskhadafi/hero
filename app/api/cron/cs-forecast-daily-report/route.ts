import { NextResponse } from 'next/server'
import { runCsForecastDailyReportTick } from '@/lib/cs-forecast-daily-report'

// ponytail: open cron endpoint for Dokploy / simple GET execution (CRON_SECRET optional)
export async function GET(_request: Request) {
  try {
    const result = await runCsForecastDailyReportTick()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CS forecast daily report tick failed.'
    return NextResponse.json({ ok: false, message }, { status: 500 })
  }
}
