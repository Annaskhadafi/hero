'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { heroSafetyInductions } from '@/db/schema/safety-induction'
import { getS3ObjectReadUrl, isS3UploadConfigured, uploadAnyFileToS3 } from '@/lib/s3-storage'
import { buildHseSafetyEmail, sendHseSafetyEmail } from '@/lib/hse-safety-email'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

async function uploadPublicSignature(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    if (isS3UploadConfigured()) {
      const result = await uploadAnyFileToS3(file)
      const readableUrl = await getS3ObjectReadUrl(result.url)
      return { success: true, url: readableUrl || result.url }
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const uniqueName = `signature-${randomUUID().slice(0, 8)}.png`
    const filePath = join(uploadDir, uniqueName)
    const buffer = Buffer.from(await file.arrayBuffer())

    await writeFile(filePath, buffer)

    const publicUrl = `/api/uploads/${uniqueName}`
    return { success: true, url: publicUrl }
  } catch (err) {
    console.error('Error uploading public signature:', err)
    return { success: false, error: 'Gagal mengupload tanda tangan' }
  }
}

export async function submitSafetyInduction(formData: FormData) {
  try {
    const fullName = (formData.get('fullName') as string | null)?.trim()
    const companyOrigin = (formData.get('companyOrigin') as string | null)?.trim()
    const phoneNumber = (formData.get('phoneNumber') as string | null)?.trim()
    const purpose = (formData.get('purpose') as string | null)?.trim()
    const signatureFile = formData.get('signature') as File | null

    if (!fullName || !companyOrigin || !phoneNumber || !purpose || !signatureFile) {
      return { success: false, error: 'Semua kolom harus diisi termasuk tanda tangan' }
    }

    // Upload signature using public uploader (unauthenticated guests allowed)
    const uploadResult = await uploadPublicSignature(signatureFile)

    if (!uploadResult.success || !uploadResult.url) {
      return { success: false, error: uploadResult.error || 'Gagal mengupload tanda tangan' }
    }

    const signatureUrl = uploadResult.url

    // Save to DB
    const [record] = await db.insert(heroSafetyInductions).values({
      fullName,
      companyOrigin,
      phoneNumber,
      purpose,
      signatureUrl,
      agreedAt: new Date(),
    }).returning()

    const emailContent = buildHseSafetyEmail({
      title: 'Safety induction baru',
      intro: 'Form safety induction baru telah disubmit dan masuk ke dashboard HSE.',
      details: [
        `Nama: ${record.fullName}`,
        `Instansi: ${record.companyOrigin}`,
        `Telepon: ${record.phoneNumber}`,
        `Tujuan: ${record.purpose}`,
      ],
    })

    await sendHseSafetyEmail({
      templateCode: 'hse_safety_induction_submitted',
      templateName: 'HSE Safety Induction Submitted',
      variables: {
        fullName: record.fullName,
        companyOrigin: record.companyOrigin,
        phoneNumber: record.phoneNumber,
        purpose: record.purpose,
      },
      fallbackSubject: `Safety induction baru: ${record.fullName}`,
      fallbackHtml: emailContent.html,
      fallbackText: emailContent.text,
    })

    revalidatePath('/dashboard/safety-induction')

    return { success: true }
  } catch (error) {
    console.error('Error submitting safety induction:', error)
    return { success: false, error: 'Terjadi kesalahan sistem' }
  }
}

