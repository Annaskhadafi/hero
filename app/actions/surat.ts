'use server'

import { db } from '@/db'
import {
  hcLetters,
  hcLetterSequences,
  employees,
  masterSections,
  hrPositions,
  masterDepartments,
} from '@/db/schema/hero'
import { eq, and, desc, asc, sql, count } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

export async function saveHrSignature({
  signerName,
  dataUrl,
}: {
  signerName: string
  dataUrl: string
}): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const safeName = signerName.replace(/[\\/:*?"<>|]/g, '').trim()
    const match = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/)

    if (!safeName || !match) {
      return { success: false, error: 'Format TTD tidak valid.' }
    }

    const extension = match[1] === 'jpeg' ? 'jpg' : match[1]
    const fileName = `ttd ${safeName}.${extension}`
    const filePath = path.join(process.cwd(), 'public', fileName)

    await writeFile(filePath, Buffer.from(match[2], 'base64'))

    return { success: true, url: `/${fileName}` }
  } catch (error) {
    console.error('Error saving HR signature:', error)
    return { success: false, error: 'Gagal menyimpan TTD HR.' }
  }
}
// ─── Letter Number Generation ─────────────────────────────────────────────

const ROMAN_MONTHS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
const LETTER_NUMBER_RETRY_DELAY_MS = 500

function isRetryableDbError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  return (
    message.includes('connection timeout') ||
    message.includes('connection terminated') ||
    message.includes('timeout exceeded') ||
    message.includes('econnreset') ||
    message.includes('etimedout')
  )
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function retryLetterNumberQuery<T>(query: () => Promise<T>) {
  try {
    return await query()
  } catch (error) {
    if (!isRetryableDbError(error)) {
      throw error
    }

    await wait(LETTER_NUMBER_RETRY_DELAY_MS)
    return await query()
  }
}

function formatLetterNumber(
  sequence: number,
  letterType: string,
  month: number,
  year: number
): string {
  let prefix = 'SK'
  if (letterType === 'surat_tugas') prefix = 'ST'
  else if (letterType === 'surat_mcu') prefix = 'MCU'
  else if (letterType === 'surat_perintah_kerja') prefix = 'GA-CHITRABPN'
  else if (letterType === 'surat_perubahan_status') prefix = 'HR- CHITRA'
  else if (letterType === 'surat_pengalaman_kerja') prefix = 'HR-CHITRA'

  const seqStr = String(sequence).padStart(3, '0')
  const romanMonth = ROMAN_MONTHS[month]
  return `${seqStr}/${prefix}/${romanMonth}/${year}`
}

export async function getNextLetterNumber(letterType: string): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  try {
    const [existing] = await retryLetterNumberQuery(() =>
      db
        .select()
        .from(hcLetterSequences)
        .where(
          and(
            eq(hcLetterSequences.letterType, letterType),
            eq(hcLetterSequences.year, year),
            eq(hcLetterSequences.month, month)
          )
        )
        .limit(1)
    )

    const nextSeq = (existing?.lastSequence ?? 0) + 1

    return formatLetterNumber(nextSeq, letterType, month, year)
  } catch (error) {
    console.error('Failed to generate letter number preview:', error)

    return formatLetterNumber(1, letterType, month, year)
  }
}

export async function consumeLetterNumber(letterType: string): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [existing] = await retryLetterNumberQuery(() =>
    db
      .select()
      .from(hcLetterSequences)
      .where(
        and(
          eq(hcLetterSequences.letterType, letterType),
          eq(hcLetterSequences.year, year),
          eq(hcLetterSequences.month, month)
        )
      )
      .limit(1)
  )

  if (existing) {
    const nextSeq = existing.lastSequence + 1
    await retryLetterNumberQuery(() =>
      db
        .update(hcLetterSequences)
        .set({ lastSequence: nextSeq, updatedAt: new Date() })
        .where(eq(hcLetterSequences.id, existing.id))
    )
    return formatLetterNumber(nextSeq, letterType, month, year)
  }

  await retryLetterNumberQuery(() =>
    db.insert(hcLetterSequences).values({
      letterType,
      year,
      month,
      lastSequence: 1,
    })
  )

  return formatLetterNumber(1, letterType, month, year)
}

// ─── Save Letter to Archive ───────────────────────────────────────────────

export async function saveLetter(data: {
  letterType: string
  letterNumber: string
  employeeId?: number
  employeeName: string
  subject: string
  content: string
  destination?: string
  purpose?: string
  departureDate?: string
  returnDate?: string
  issuedDate: string
  issuedPlace?: string
  signatoryName?: string
  signatoryTitle?: string
  status?: string
}): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    const [inserted] = await db
      .insert(hcLetters)
      .values({
        letterType: data.letterType,
        letterNumber: data.letterNumber,
        employeeId: data.employeeId ?? null,
        employeeName: data.employeeName,
        subject: data.subject,
        content: data.content,
        destination: data.destination ?? '',
        purpose: data.purpose ?? '',
        departureDate: data.departureDate ?? null,
        returnDate: data.returnDate ?? null,
        issuedDate: data.issuedDate,
        issuedPlace: data.issuedPlace ?? 'Balikpapan',
        signatoryName: data.signatoryName ?? '',
        signatoryTitle: data.signatoryTitle ?? '',
        status: data.status ?? 'draft',
      })
      .returning({ id: hcLetters.id })

    // Consume the letter number sequence so next call gets the next number
    await consumeLetterNumber(data.letterType)

    revalidatePath('/dashboard/hc/surat')
    revalidatePath('/dashboard/hc/surat/archive')
    revalidatePath('/dashboard/hc/surat-keterangan')
    revalidatePath('/dashboard/hc/surat-tugas')
    revalidatePath('/dashboard/hc/surat-pengalaman-kerja')
    revalidatePath('/dashboard/hc/surat-penawaran-kerja')

    return { success: true, id: inserted.id }
  } catch (error) {
    console.error('Error saving letter:', error)
    return { success: false, error: 'Gagal menyimpan surat ke arsip.' }
  }
}

// ─── Get Letter Archives ──────────────────────────────────────────────────

export async function getLetterArchives(filters?: {
  letterType?: string
  status?: string
  search?: string
}) {
  const conditions = []

  if (filters?.letterType) {
    conditions.push(eq(hcLetters.letterType, filters.letterType))
  }
  if (filters?.status) {
    conditions.push(eq(hcLetters.status, filters.status))
  }
  if (filters?.search) {
    conditions.push(
      sql`(${hcLetters.employeeName} ILIKE ${'%' + filters.search + '%'} OR ${hcLetters.letterNumber} ILIKE ${'%' + filters.search + '%'} OR ${hcLetters.subject} ILIKE ${'%' + filters.search + '%'})`
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  return await db
    .select({
      id: hcLetters.id,
      letterType: hcLetters.letterType,
      letterNumber: hcLetters.letterNumber,
      employeeId: hcLetters.employeeId,
      employeeName: hcLetters.employeeName,
      subject: hcLetters.subject,
      content: hcLetters.content,
      destination: hcLetters.destination,
      purpose: hcLetters.purpose,
      departureDate: hcLetters.departureDate,
      returnDate: hcLetters.returnDate,
      issuedDate: hcLetters.issuedDate,
      issuedPlace: hcLetters.issuedPlace,
      signatoryName: hcLetters.signatoryName,
      signatoryTitle: hcLetters.signatoryTitle,
      status: hcLetters.status,
      approvedBy: hcLetters.approvedBy,
      approvedAt: hcLetters.approvedAt,
      pdfUrl: hcLetters.pdfUrl,
      createdAt: hcLetters.createdAt,
      updatedAt: hcLetters.updatedAt,
    })
    .from(hcLetters)
    .where(whereClause)
    .orderBy(desc(hcLetters.createdAt))
}

// ─── Letter Stats ─────────────────────────────────────────────────────────

export async function getLetterStats(): Promise<{
  totalSuratKeterangan: number
  totalSuratTugas: number
  totalSuratMcu: number
  totalPerubahanStatus: number
  totalSuratPengalamanKerja: number
  totalThisMonth: number
  totalArchive: number
}> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  const [totalKeterangan] = await db
    .select({ cnt: count() })
    .from(hcLetters)
    .where(eq(hcLetters.letterType, 'surat_keterangan'))

  const [totalTugas] = await db
    .select({ cnt: count() })
    .from(hcLetters)
    .where(eq(hcLetters.letterType, 'surat_tugas'))

  const [totalMcu] = await db
    .select({ cnt: count() })
    .from(hcLetters)
    .where(eq(hcLetters.letterType, 'surat_mcu'))

  const [totalPerubahanStatus] = await db
    .select({ cnt: count() })
    .from(hcLetters)
    .where(eq(hcLetters.letterType, 'surat_perubahan_status'))

  const [totalPengalamanKerja] = await db
    .select({ cnt: count() })
    .from(hcLetters)
    .where(eq(hcLetters.letterType, 'surat_pengalaman_kerja'))

  const [thisMonth] = await db
    .select({ cnt: count() })
    .from(hcLetters)
    .where(
      and(sql`${hcLetters.issuedDate} >= ${monthStart}`, sql`${hcLetters.issuedDate} < ${monthEnd}`)
    )

  const [totalAll] = await db.select({ cnt: count() }).from(hcLetters)

  return {
    totalSuratKeterangan: totalKeterangan?.cnt ?? 0,
    totalSuratTugas: totalTugas?.cnt ?? 0,
    totalSuratMcu: totalMcu?.cnt ?? 0,
    totalPerubahanStatus: totalPerubahanStatus?.cnt ?? 0,
    totalSuratPengalamanKerja: totalPengalamanKerja?.cnt ?? 0,
    totalThisMonth: thisMonth?.cnt ?? 0,
    totalArchive: totalAll?.cnt ?? 0,
  }
}

export async function updateLetterArchive(
  id: number,
  data: {
    subject: string
    content: string
    signatoryName?: string
    signatoryTitle?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await db
      .update(hcLetters)
      .set({
        subject: data.subject,
        content: data.content,
        signatoryName: data.signatoryName ?? '',
        signatoryTitle: data.signatoryTitle ?? '',
        updatedAt: new Date(),
      })
      .where(eq(hcLetters.id, id))

    revalidatePath('/dashboard/hc/surat')
    revalidatePath('/dashboard/hc/surat/archive')
    return { success: true }
  } catch (error) {
    console.error('Error updating letter archive:', error)
    return { success: false, error: 'Gagal memperbarui arsip surat.' }
  }
}
// ─── Update Letter Status ─────────────────────────────────────────────────

export async function updateLetterStatus(
  id: number,
  status: string,
  approvedBy?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    }

    if (status === 'approved' && approvedBy) {
      updateData.approvedBy = approvedBy
      updateData.approvedAt = new Date()
    }

    await db.update(hcLetters).set(updateData).where(eq(hcLetters.id, id))

    revalidatePath('/dashboard/hc/surat')
    revalidatePath('/dashboard/hc/surat/archive')
    return { success: true }
  } catch (error) {
    console.error('Error updating letter status:', error)
    return { success: false, error: 'Gagal memperbarui status surat.' }
  }
}

// ─── Delete Letter ────────────────────────────────────────────────────────

export async function deleteLetter(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(hcLetters).where(eq(hcLetters.id, id))

    revalidatePath('/dashboard/hc/surat')
    revalidatePath('/dashboard/hc/surat/archive')
    return { success: true }
  } catch (error) {
    console.error('Error deleting letter:', error)
    return { success: false, error: 'Gagal menghapus surat.' }
  }
}

// ─── Get Active Employees ─────────────────────────────────────────────────

export async function getActiveEmployees() {
  return await db
    .select({
      id: employees.id,
      employeeId: employees.employeeSn,
      fullName: employees.name,
      departmentName: masterDepartments.name,
      sectionName: masterSections.name,
      positionName: hrPositions.rankName,
    })
    .from(employees)
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
    .where(eq(employees.isActive, true))
    .orderBy(asc(employees.name))
}
