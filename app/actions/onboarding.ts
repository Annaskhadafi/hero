"use server"

import { db } from "@/db"
import { hcCandidates, hcRecruitments } from "@/db/schema/hero"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import crypto from "crypto"
import { buildWorkflowEmailContent, getAppUrl, sendWorkflowEmail } from "@/lib/workflow-email"

export async function generateOnboardingToken(candidateId: number) {
  try {
    const token = crypto.randomBytes(32).toString("hex")
    const [candidate] = await db
      .select({
        id: hcCandidates.id,
        name: hcCandidates.fullName,
        email: hcCandidates.email,
      })
      .from(hcCandidates)
      .where(eq(hcCandidates.id, candidateId))
      .limit(1)

    if (!candidate) {
      return { success: false, error: "Candidate not found" }
    }

    await db.update(hcCandidates)
      .set({ onboardingToken: token })
      .where(eq(hcCandidates.id, candidateId))

    if (candidate.email?.trim()) {
      try {
        const onboardingUrl = getAppUrl(`/onboarding/${token}`)
        const emailContent = buildWorkflowEmailContent({
          title: "Link onboarding sudah siap",
          greeting: `Halo ${candidate.name || "Candidate"},`,
          intro: "Silakan lengkapi data onboarding Anda melalui tautan berikut.",
          details: [
            "Pastikan dokumen identitas dan data rekening sudah siap.",
            "Link ini bersifat personal dan hanya untuk kandidat yang menerima email ini.",
          ],
          ctaLabel: "Buka Form Onboarding",
          ctaUrl: onboardingUrl,
        })

        await sendWorkflowEmail({
          to: candidate.email,
          fallbackSubject: "Link onboarding HERO",
          fallbackHtml: emailContent.html,
          fallbackText: emailContent.text,
        })
      } catch (emailError) {
        console.error("Failed to send onboarding email:", emailError)
      }
    }
    
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
        kkUrl: formData.kkUrl || null,
        ktpUrl: formData.ktpUrl || null,
        bankBookUrl: formData.bankBookUrl || null,
        startDate: formData.startDate || null,
        onboardingCompletedAt: new Date(),
      })
      .where(eq(hcCandidates.id, data[0].id))

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
