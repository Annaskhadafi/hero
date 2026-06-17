import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { sioReminderConfig } from '@/db/schema/hero'
import { revalidatePath } from 'next/cache'

export async function GET() {
  try {
    const [config] = await db.select().from(sioReminderConfig).limit(1)
    return Response.json(config ?? { additionalRecipients: '', reminderDays: 30, isActive: true })
  } catch {
    return Response.json({ additionalRecipients: '', reminderDays: 30, isActive: true })
  }
}

export async function POST(request: Request) {
  try {
    const fd = await request.formData()
    const additionalRecipients = (fd.get('additionalRecipients') as string) || ''
    const reminderDays = Number(fd.get('reminderDays')) || 30
    const isActive = fd.get('isActive') === 'true'

    const [existing] = await db.select({ id: sioReminderConfig.id }).from(sioReminderConfig).limit(1)
    if (existing) {
      await db.update(sioReminderConfig).set({ additionalRecipients, reminderDays, isActive, updatedAt: new Date() }).where(eq(sioReminderConfig.id, existing.id))
    } else {
      await db.insert(sioReminderConfig).values({ additionalRecipients, reminderDays, isActive })
    }

    revalidatePath('/dashboard/training-records')
    return Response.json({ status: 'success', message: 'Pengaturan reminder disimpan.' })
  } catch (err) {
    return Response.json({ status: 'error', message: err instanceof Error ? err.message : 'Gagal menyimpan.' })
  }
}
