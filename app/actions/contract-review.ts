'use server'

import { db } from '@/db'
import { hcEmployeeContractReviews } from '@/db/schema/hero'
import { eq, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function getContractReviews() {
  try {
    const records = await db.select().from(hcEmployeeContractReviews).orderBy(desc(hcEmployeeContractReviews.createdAt))
    return { success: true, data: records }
  } catch (error: any) {
    console.error('Error fetching contract reviews:', error)
    return { success: false, error: error.message }
  }
}

export async function getContractReviewById(id: number) {
  try {
    const [record] = await db.select().from(hcEmployeeContractReviews).where(eq(hcEmployeeContractReviews.id, id))
    if (!record) return { success: false, error: 'Review not found' }
    return { success: true, data: record }
  } catch (error: any) {
    console.error('Error fetching contract review:', error)
    return { success: false, error: error.message }
  }
}

export async function saveContractReview(data: Partial<typeof hcEmployeeContractReviews.$inferInsert>) {
  try {
    let saved: any
    if (data.id) {
      const [updated] = await db
        .update(hcEmployeeContractReviews)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(hcEmployeeContractReviews.id, data.id))
        .returning()
      saved = updated
    } else {
      const [inserted] = await db
        .insert(hcEmployeeContractReviews)
        .values(data as any)
        .returning()
      saved = inserted
    }

    revalidatePath('/dashboard/hc/contract-review')
    return { success: true, data: saved }
  } catch (error: any) {
    console.error('Error saving contract review:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteContractReview(id: number) {
  try {
    await db.delete(hcEmployeeContractReviews).where(eq(hcEmployeeContractReviews.id, id))
    revalidatePath('/dashboard/hc/contract-review')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting contract review:', error)
    return { success: false, error: error.message }
  }
}
