"use server"

import { db } from "@/db"
import { hcCandidates, hcRecruitments } from "@/db/schema/hero"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import crypto from "crypto"

export async function generateOnboardingToken(candidateId: number) {
  try {
    const token = crypto.randomBytes(32).toString("hex")
    await db.update(hcCandidates)
      .set({ onboardingToken: token })
      .where(eq(hcCandidates.id, candidateId))
    
    revalidatePath(`/dashboard/hc/recruitment/candidates/${candidateId}`)
    return { success: true, token }
  } catch (error: any) {
    console.error("Failed to generate token:", error)
    return { success: false, error: error.message }
  }
}

export async function getCandidateByToken(token: string) {
  try {
    const data = await db.select({
      candidate: hcCandidates,
      recruitment: hcRecruitments
    })
    .from(hcCandidates)
    .leftJoin(hcRecruitments, eq(hcCandidates.recruitmentId, hcRecruitments.id))
    .where(eq(hcCandidates.onboardingToken, token))
    .limit(1)

    if (!data.length) return { success: false, error: "Invalid or expired token" }
    
    return { success: true, data: data[0] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function submitOnboardingData(token: string, formData: any) {
  try {
    const data = await db.select({ id: hcCandidates.id })
      .from(hcCandidates)
      .where(eq(hcCandidates.onboardingToken, token))
      .limit(1)

    if (!data.length) return { success: false, error: "Invalid token" }

    await db.update(hcCandidates)
      .set({
        nikKtp: formData.nikKtp,
        npwpNumber: formData.npwpNumber,
        bpjsKesehatan: formData.bpjsKesehatan,
        bpjsKetenagakerjaan: formData.bpjsKetenagakerjaan,
        bankName: formData.bankName,
        bankAccountNumber: formData.bankAccountNumber,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        // Optional: clear token so it can only be used once?
        // onboardingToken: null
      })
      .where(eq(hcCandidates.id, data[0].id))

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
