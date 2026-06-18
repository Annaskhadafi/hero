'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { heroSafetyInductions } from '@/db/schema/safety-induction'
import { uploadFile } from '@/app/actions/upload'
import { buildHseSafetyEmail, sendHseSafetyEmail } from '@/lib/hse-safety-email'

export async function submitSafetyInduction(formData: FormData) {
  try {
    const fullName = formData.get('fullName') as string
    const companyOrigin = formData.get('companyOrigin') as string
    const phoneNumber = formData.get('phoneNumber') as string
    const purpose = formData.get('purpose') as string
    const signatureFile = formData.get('signature') as File | null

    if (!fullName || !companyOrigin || !phoneNumber || !purpose || !signatureFile) {
      return { success: false, error: 'Semua kolom harus diisi termasuk tanda tangan' }
    }

    // Upload the signature
    const uploadFormData = new FormData()
    uploadFormData.append('file', signatureFile)
    const uploadResult = await uploadFile(uploadFormData)

    if (!uploadResult.success) {
      return { success: false, error: 'Gagal mengupload tanda tangan' }
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
