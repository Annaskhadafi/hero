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
    // Update existing
    await db.update(heroJsas).set({ ...data, updatedAt: new Date() }).where(eq(heroJsas.id, id))
    
    // Delete old steps and insert new ones
    await db.delete(heroJsaSteps).where(eq(heroJsaSteps.jsaId, id))
    if (steps.length > 0) {
      await db.insert(heroJsaSteps).values(
        steps.map((step) => ({
          ...step,
          jsaId: id,
        }))
      )
    }
  } else {

    
    // Create new
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
