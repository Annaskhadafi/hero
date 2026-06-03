'use server'

import { revalidatePath } from 'next/cache'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/db'
import { heroJsas, heroJsaSteps, type NewJsa, type NewJsaStep } from '@/db/schema/jsa'
import { getServerSession } from '@/lib/auth-session'

export async function getJsaList() {
  return db.select().from(heroJsas).orderBy(desc(heroJsas.createdAt))
}

export async function getJsaById(id: string) {


  const [jsa] = await db.select().from(heroJsas).where(eq(heroJsas.id, id)).limit(1)
  
  if (!jsa) return null

  const steps = await db
    .select()
    .from(heroJsaSteps)
    .where(eq(heroJsaSteps.jsaId, id))
    .orderBy(heroJsaSteps.stepOrder)

  return { ...jsa, steps }
}

export async function saveJsa(
  data: Omit<NewJsa, 'id' | 'createdAt' | 'updatedAt'>,
  steps: Omit<NewJsaStep, 'id' | 'jsaId' | 'createdAt'>[],
  id?: string
) {
  const session = await getServerSession()
  if (!session?.user) throw new Error('Unauthorized')

  if (id) {
    const jsaId = id

    // Update existing
    await db.update(heroJsas).set({ ...data, updatedAt: new Date() }).where(eq(heroJsas.id, jsaId))
    
    // Delete old steps and insert new ones
    await db.delete(heroJsaSteps).where(eq(heroJsaSteps.jsaId, jsaId))
    if (steps.length > 0) {
      await db.insert(heroJsaSteps).values(
        steps.map((step) => ({
          ...step,
          jsaId,
        }))
      )
    }
  } else {
    // Create new
    if (!data.jsaNumber || data.jsaNumber === 'AUTO') {
      const today = new Date()
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
      const randStr = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
      data.jsaNumber = `JSA/${dateStr}/${randStr}`
    }

    const [inserted] = await db.insert(heroJsas).values(data).returning()
    if (steps.length > 0) {
      await db.insert(heroJsaSteps).values(
        steps.map((step) => ({
          ...step,
          jsaId: inserted.id,
        }))
      )
    }
    id = inserted.id
  }

  revalidatePath('/dashboard/hse/jsa')
  return { success: true, id }
}

export async function deleteJsa(id: string) {

  
  await db.delete(heroJsas).where(eq(heroJsas.id, id))
  revalidatePath('/dashboard/hse/jsa')
  return { success: true }
}
