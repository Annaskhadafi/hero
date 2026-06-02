'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { heroSafetyInductions } from '@/db/schema/safety-induction'
import { uploadFile } from '@/app/actions/upload'

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
    await db.insert(heroSafetyInductions).values({
      fullName,
      companyOrigin,
      phoneNumber,
      purpose,
      signatureUrl,
      agreedAt: new Date(),
    })

    revalidatePath('/dashboard/safety-induction')

    return { success: true }
  } catch (error) {
    console.error('Error submitting safety induction:', error)
    return { success: false, error: 'Terjadi kesalahan sistem' }
  }
}
