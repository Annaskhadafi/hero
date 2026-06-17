import { getAllSectionHeads, updateSectionHeadEmail, toggleSectionHeadExclusion } from '@/lib/sio-reminder'

export async function GET() {
  try {
    const heads = await getAllSectionHeads()
    return Response.json(heads)
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Gagal' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.employeeId) return Response.json({ status: 'error', message: 'ID karyawan wajib.' }, { status: 400 })

    if ('exclude' in body) {
      const result = await toggleSectionHeadExclusion(body.employeeId, body.exclude)
      return Response.json(result)
    }

    // Default: update email
    const result = await updateSectionHeadEmail(body.employeeId, body.email || '')
    return Response.json(result)
  } catch (err) {
    return Response.json({ status: 'error', message: err instanceof Error ? err.message : 'Gagal' }, { status: 500 })
  }
}
