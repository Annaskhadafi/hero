'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { heroSafetyInductions } from '@/db/schema/safety-induction'
import { eq, inArray } from 'drizzle-orm'
import { getS3ObjectReadUrl, isS3UploadConfigured, uploadAnyFileToS3 } from '@/lib/s3-storage'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { buildHseSafetyEmail, sendHseSafetyEmail } from '@/lib/hse-safety-email'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

async function uploadSignatureBuffer(
  buffer: Buffer,
  contentType: string = 'image/png'
): Promise<{ success: boolean; url?: string; error?: string }> {
  // 1. Try S3 upload if configured
  if (isS3UploadConfigured()) {
    try {
      const file = new File([new Uint8Array(buffer)], `signature-${randomUUID().slice(0, 8)}.png`, { type: contentType })
      // ponytail: bound this guest upload; tune the limit if storage latency warrants it.
      const result = await uploadAnyFileToS3(file, undefined, AbortSignal.timeout(20_000))
      if (result?.url) {
        return { success: true, url: resolveUploadUrl(result.url || result.key) }
      }
    } catch (s3Err) {
      console.warn('[Safety Induction] S3 signature upload failed or timed out, falling back to local storage:', s3Err)
    }
  }

  // 2. Fallback to local storage
  try {
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const uniqueName = `signature-${randomUUID().slice(0, 8)}.png`
    const filePath = join(uploadDir, uniqueName)

    await writeFile(filePath, buffer)

    const publicUrl = `/api/uploads/${uniqueName}`
    return { success: true, url: publicUrl }
  } catch (err) {
    console.error('Error uploading public signature locally:', err)
    return {
      success: false,
      error: err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
        ? 'Upload tanda tangan terlalu lama. Silakan coba lagi.'
        : 'Gagal mengupload tanda tangan',
    }
  }
}

async function uploadPublicSignature(
  fileOrBase64: File | string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    let buffer: Buffer
    let contentType = 'image/png'

    if (typeof fileOrBase64 === 'string') {
      const base64Data = fileOrBase64.replace(/^data:image\/\w+;base64,/, '')
      buffer = Buffer.from(base64Data, 'base64')
    } else if (fileOrBase64 && typeof fileOrBase64.arrayBuffer === 'function') {
      buffer = Buffer.from(await fileOrBase64.arrayBuffer())
      contentType = fileOrBase64.type || 'image/png'
    } else {
      return { success: false, error: 'Format tanda tangan tidak valid' }
    }

    if (buffer.length === 0) {
      return { success: false, error: 'Tanda tangan kosong' }
    }

    return await uploadSignatureBuffer(buffer, contentType)
  } catch (err) {
    console.error('Error in uploadPublicSignature:', err)
    return {
      success: false,
      error: err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
        ? 'Upload tanda tangan terlalu lama. Silakan coba lagi.'
        : 'Gagal mengupload tanda tangan',
    }
  }
}

export async function submitSafetyInduction(formData: FormData) {
  try {
    const fullName = (formData.get('fullName') as string | null)?.trim()
    const companyOrigin = (formData.get('companyOrigin') as string | null)?.trim()
    const phoneNumber = (formData.get('phoneNumber') as string | null)?.trim()
    const purpose = (formData.get('purpose') as string | null)?.trim()
    const signatureFile = formData.get('signature') as File | null
    const signatureData = (formData.get('signatureData') as string | null)?.trim()

    const signatureToUpload = (signatureFile && signatureFile.size > 0) ? signatureFile : signatureData

    if (!fullName || !companyOrigin || !phoneNumber || !purpose || !signatureToUpload) {
      return { success: false, error: 'Semua kolom harus diisi termasuk tanda tangan' }
    }

    // Upload signature using public uploader (unauthenticated guests allowed)
    const uploadResult = await uploadPublicSignature(signatureToUpload)

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

    // ponytail: email delivery is best-effort so guest submission is not blocked by SMTP.
    void sendHseSafetyEmail({
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
    }).catch((error) => {
      console.warn(`[Safety Induction] Email notification failed for ${record.id}:`, error)
    })

    revalidatePath('/dashboard/safety-induction')
    revalidatePath('/dashboard/safety')
    revalidatePath('/dashboard/safety/data')
    revalidatePath('/safety-induction')

    return { success: true }
  } catch (error) {
    console.error('Error submitting safety induction:', error)
    return { success: false, error: 'Terjadi kesalahan sistem' }
  }
}

export async function updateSafetyInduction(
  id: string,
  data: {
    fullName: string
    companyOrigin: string
    phoneNumber: string
    purpose: string
  }
) {
  try {
    const { fullName, companyOrigin, phoneNumber, purpose } = data

    if (!id || !fullName?.trim() || !companyOrigin?.trim() || !phoneNumber?.trim() || !purpose?.trim()) {
      return { success: false, error: 'Semua kolom wajib diisi' }
    }

    const [updated] = await db
      .update(heroSafetyInductions)
      .set({
        fullName: fullName.trim(),
        companyOrigin: companyOrigin.trim(),
        phoneNumber: phoneNumber.trim(),
        purpose: purpose.trim(),
        updatedAt: new Date(),
      })
      .where(eq(heroSafetyInductions.id, id))
      .returning()

    if (!updated) {
      return { success: false, error: 'Data tidak ditemukan' }
    }

    revalidatePath('/dashboard/safety-induction')
    return { success: true, data: updated }
  } catch (error) {
    console.error('Error updating safety induction:', error)
    return { success: false, error: 'Gagal memperbarui data safety induction' }
  }
}

export async function deleteSafetyInduction(id: string) {
  try {
    if (!id) {
      return { success: false, error: 'ID tidak valid' }
    }

    const [deleted] = await db
      .delete(heroSafetyInductions)
      .where(eq(heroSafetyInductions.id, id))
      .returning()

    if (!deleted) {
      return { success: false, error: 'Data tidak ditemukan atau sudah dihapus' }
    }

    revalidatePath('/dashboard/safety-induction')
    return { success: true }
  } catch (error) {
    console.error('Error deleting safety induction:', error)
    return { success: false, error: 'Gagal menghapus data safety induction' }
  }
}

export async function deleteBulkSafetyInductions(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return { success: false, error: 'Tidak ada data yang dipilih' }
    }

    await db
      .delete(heroSafetyInductions)
      .where(inArray(heroSafetyInductions.id, ids))

    revalidatePath('/dashboard/safety-induction')
    return { success: true }
  } catch (error) {
    console.error('Error bulk deleting safety inductions:', error)
    return { success: false, error: 'Gagal menghapus data terpilih' }
  }
}

