import { NextResponse } from 'next/server'
import { db } from '@/db'
import { minePermitReminderConfig } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const [config] = await db.select().from(minePermitReminderConfig).limit(1)
    if (config) {
      return NextResponse.json(config)
    }
    return NextResponse.json({ additionalRecipients: '', reminderDays: 60, isActive: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const additionalRecipients = formData.get('additionalRecipients')?.toString() ?? ''
    const reminderDays = parseInt(formData.get('reminderDays')?.toString() ?? '60', 10)
    const isActive = formData.get('isActive') === 'true'

    const [existing] = await db.select({ id: minePermitReminderConfig.id }).from(minePermitReminderConfig).limit(1)

    if (existing) {
      await db.update(minePermitReminderConfig).set({ additionalRecipients, reminderDays, isActive, updatedAt: new Date() }).where(eq(minePermitReminderConfig.id, existing.id))
    } else {
      await db.insert(minePermitReminderConfig).values({ additionalRecipients, reminderDays, isActive })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}
