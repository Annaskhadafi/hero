import { getReminderPreview } from '@/lib/sio-reminder'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const days = Number(url.searchParams.get('days')) || 30
  try {
    const preview = await getReminderPreview(days)
    return Response.json(preview)
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Gagal' }, { status: 500 })
  }
}
