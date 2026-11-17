'use server'

import { revalidatePath } from 'next/cache'
import { eq, desc, asc, sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { db } from '@/db'
import { heroJsas, heroJsaSettings, heroJsaSteps, type NewJsa, type NewJsaStep } from '@/db/schema/jsa'
import { employees } from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { buildHseSafetyEmail, resolveHseSafetyRecipients, sendHseSafetyEmail } from '@/lib/hse-safety-email'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'
import { getAppUrl } from '@/lib/workflow-email'
import { uploadBufferToS3 } from '@/lib/s3-storage'

function generateRealisticSignatureSvgDataUrl(name?: string | null): string {
  const cleanName = (name && name !== '-' ? name : 'Approver').trim()
  let hash = 0
  for (let i = 0; i < cleanName.length; i++) {
    hash = (hash << 5) - hash + cleanName.charCodeAt(i)
    hash |= 0
  }
  const positiveHash = Math.abs(hash)
  const slant = (positiveHash % 6) - 3
  const loopH = 14 + (positiveHash % 6)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 75" width="220" height="75">
    <g transform="rotate(${slant} 110 37)">
      <!-- Initial letter flourish -->
      <path d="M 28 52 C 24 36, 30 20, 42 16 C 54 12, 62 24, 48 36 C 34 48, 44 54, 58 46 C 66 41, 72 32, 76 30" 
            fill="none" stroke="#002b5c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Connected cursive letters -->
      <path d="M 74 34 C 82 26, 88 42, 96 32 C 104 22, 110 40, 118 30 C 126 20, 134 38, 144 30 C 152 22, 158 36, 168 28 C 174 22, 180 32, 188 26" 
            fill="none" stroke="#002b5c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Ascender loop -->
      <path d="M 124 34 C 126 ${loopH}, 132 12, 134 20 C 136 30, 132 42, 138 34" 
            fill="none" stroke="#002b5c" stroke-width="2.0" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Sweeping signature underline flourish -->
      <path d="M 32 58 C 80 56, 130 62, 182 50 C 196 47, 172 55, 142 60 C 112 65, 82 64, 56 62" 
            fill="none" stroke="#002b5c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Terminal pen flick -->
      <path d="M 178 51 Q 192 46 202 42" 
            fill="none" stroke="#002b5c" stroke-width="1.8" stroke-linecap="round"/>
    </g>
  </svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

async function checkJsaPermission(action: 'view' | 'edit' | 'delete'): Promise<boolean> {
  try {
    const permission = await getCurrentMenuPermission('hse_jsa')
    return action === 'view' ? Boolean(permission.canView) : action === 'delete' ? Boolean(permission.canDelete) : Boolean(permission.canEdit)
  } catch {
    return false
  }
}

export type JsaSettings = {
  notificationRecipients: string
  defaultSignerName: string
  defaultSignerTitle: string
  defaultSignerEmail: string
}

const DEFAULT_JSA_SETTINGS: JsaSettings = {
  notificationRecipients: '',
  defaultSignerName: '',
  defaultSignerTitle: '',
  defaultSignerEmail: '',
}

let jsaTablesPromise: Promise<void> | null = null

async function ensureJsaTables() {
  if (!jsaTablesPromise) {
    jsaTablesPromise = (async () => {
      await db.execute(sql`
        create table if not exists hero_jsas (
          id uuid primary key default gen_random_uuid(),
          jsa_number varchar(255) not null,
          job_description text not null,
          equipment_number varchar(255) not null,
          team_members text not null,
          equipment_used jsonb not null default '[]'::jsonb,
          requirements jsonb not null default '[]'::jsonb,
          permits jsonb not null default '[]'::jsonb,
          ppe_requirements jsonb not null default '[]'::jsonb,
          risk_level varchar(50) not null,
          status varchar(50) not null default 'pending',
          signatures jsonb not null default '{}'::jsonb,
          created_at timestamp not null default now(),
          updated_at timestamp not null default now()
        );
        alter table hero_jsas add column if not exists status varchar(50) not null default 'pending';
      `)
      await db.execute(sql`
        create table if not exists hero_jsa_steps (
          id uuid primary key default gen_random_uuid(),
          jsa_id uuid not null references hero_jsas(id) on delete cascade,
          step_order integer not null,
          work_step text not null,
          hazard text not null,
          consequence text not null,
          control text not null,
          residual_risk varchar(50) not null,
          pic varchar(255) not null,
          created_at timestamp not null default now()
        );
      `)
      await db.execute(sql`
        create table if not exists hero_jsa_settings (
          id uuid primary key default gen_random_uuid(),
          setting_key varchar(255) not null unique,
          setting_value jsonb not null default '{}'::jsonb,
          updated_at timestamp not null default now()
        );
      `)
    })().catch((error) => {
      jsaTablesPromise = null
      console.error('[JSA] Failed to ensure tables:', error)
      throw error
    })
  }

  return jsaTablesPromise
}

async function persistSignature(signatureDataUrl: string): Promise<string> {
  if (!signatureDataUrl) return ''
  if (!signatureDataUrl.startsWith('data:image/')) {
    return signatureDataUrl
  }

  try {
    const matches = signatureDataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
    if (!matches || matches.length !== 3) {
      return signatureDataUrl
    }

    const mimeType = matches[1]
    const ext = mimeType.split('/')[1] || 'png'
    const buffer = Buffer.from(matches[2], 'base64')
    const key = `upload/jsa-signature-${randomUUID()}.${ext}`

    await uploadBufferToS3(buffer, key, mimeType)
    return `/api/uploads/${key}`
  } catch (err) {
    console.error('[JSA] Failed to persist signature to S3:', err)
    return signatureDataUrl
  }
}

export async function getHseOfficerOptions() {
  await ensureJsaTables()
  try {
    const emps = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        jobTitle: employees.jobTitle,
        employeeSn: employees.employeeSn,
      })
      .from(employees)
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.name))

    return emps.map((e) => ({
      value: e.email || e.name,
      label: `${e.name}${e.jobTitle ? ` — ${e.jobTitle}` : ''}`,
      name: e.name,
      email: e.email || '',
      title: e.jobTitle || 'HSE Officer / Pengawas Site',
    }))
  } catch (err) {
    console.error('[getHseOfficerOptions] error:', err)
    return []
  }
}

export async function getJsaSettings(): Promise<JsaSettings> {
  await ensureJsaTables()

  try {
    const [row] = await db
      .select()
      .from(heroJsaSettings)
      .where(eq(heroJsaSettings.settingKey, 'jsa_workflow'))
      .limit(1)

    return { ...DEFAULT_JSA_SETTINGS, ...((row?.settingValue as Partial<JsaSettings> | undefined) ?? {}) }
  } catch (error) {
    console.error('[JSA] getJsaSettings error:', error)
    return DEFAULT_JSA_SETTINGS
  }
}

export async function saveJsaSettings(settings: JsaSettings) {
  const session = await getServerSession()
  if (!session?.user) throw new Error('Unauthorized')

  const canEdit = await checkJsaPermission('edit')
  if (!canEdit) throw new Error('Role Anda tidak punya akses mengubah setting JSA.')

  await ensureJsaTables()

  const [existing] = await db
    .select({ id: heroJsaSettings.id })
    .from(heroJsaSettings)
    .where(eq(heroJsaSettings.settingKey, 'jsa_workflow'))
    .limit(1)

  if (existing) {
    await db
      .update(heroJsaSettings)
      .set({ settingValue: settings, updatedAt: new Date() })
      .where(eq(heroJsaSettings.id, existing.id))
  } else {
    await db.insert(heroJsaSettings).values({ settingKey: 'jsa_workflow', settingValue: settings })
  }

  revalidatePath('/dashboard/hse/jsa')
  return { success: true }
}

export async function getJsaList() {
  await ensureJsaTables()
  return db.select().from(heroJsas).orderBy(desc(heroJsas.createdAt))
}

export async function getJsaById(id: string) {
  await ensureJsaTables()

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
  await ensureJsaTables()

  const session = await getServerSession()
  // If editing an existing JSA, user must be logged in
  if (id && !session?.user) {
    throw new Error('Unauthorized: Harus login untuk mengubah data JSA.')
  }

  let settings: JsaSettings = DEFAULT_JSA_SETTINGS
  try {
    settings = await getJsaSettings()
  } catch (err) {
    console.warn('[JSA] getJsaSettings fallback:', err)
  }

  let notificationPayload: null | {
    mode: 'create' | 'update'
    jsaNumber: string
    jobDescription: string
    riskLevel: string
    teamMembers: string
  } = null

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
    notificationPayload = {
      mode: 'update',
      jsaNumber: data.jsaNumber || jsaId,
      jobDescription: data.jobDescription,
      riskLevel: data.riskLevel,
      teamMembers: data.teamMembers,
      creatorName: (data.signatures as any)?.creatorName || 'Manpower',
      equipmentNumber: data.equipmentNumber,
      jsaId,
    }
  } else {
    // Create new JSA
    if (!data.jsaNumber || data.jsaNumber === 'AUTO' || data.jsaNumber.trim() === '') {
      const today = new Date()
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
      const randStr = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
      data.jsaNumber = `JSA/${dateStr}/${randStr}`
    }

    const [inserted] = await db.insert(heroJsas).values({ ...data, status: 'pending' }).returning()
    if (steps.length > 0) {
      await db.insert(heroJsaSteps).values(
        steps.map((step) => ({
          ...step,
          jsaId: inserted.id,
        }))
      )
    }
    id = inserted.id
    notificationPayload = {
      mode: 'create',
      jsaNumber: inserted.jsaNumber,
      jobDescription: inserted.jobDescription,
      riskLevel: inserted.riskLevel,
      teamMembers: inserted.teamMembers,
      creatorName: (inserted.signatures as any)?.creatorName || 'Manpower',
      equipmentNumber: inserted.equipmentNumber,
      jsaId: inserted.id,
    }
  }

  // Handle notifications asynchronously without failing JSA save if email/bell fails
  if (notificationPayload) {
    try {
      const isCreate = notificationPayload.mode === 'create'
      const creatorName = notificationPayload.creatorName || 'Manpower'
      const targetApprovalUrl = `/dashboard/hse/jsa?tab=approval&id=${notificationPayload.jsaId}`

      const emailContent = buildHseSafetyEmail({
        title: isCreate
          ? `Permohonan Verifikasi & Approval JSA: ${notificationPayload.jsaNumber}`
          : `JSA diperbarui: ${notificationPayload.jsaNumber}`,
        intro: isCreate
          ? `Dokumen Job Safety Analysis (JSA) baru telah diajukan oleh ${creatorName} dan saat ini menunggu verifikasi serta tanda tangan online dari Departemen HSE / Pengawas Site.`
          : `${notificationPayload.jobDescription} telah diperbarui di sistem JSA.`,
        details: [
          `Nomor JSA: ${notificationPayload.jsaNumber}`,
          `Pembuat: ${creatorName}`,
          `Pekerjaan: ${notificationPayload.jobDescription}`,
          `No. Unit/Peralatan: ${notificationPayload.equipmentNumber || '-'}`,
          `Tingkat Risiko: ${notificationPayload.riskLevel}`,
          notificationPayload.teamMembers ? `Tim: ${notificationPayload.teamMembers}` : null,
          isCreate ? `Status: Menunggu Verifikasi & TTD Online HSE` : null,
        ],
        ctaLabel: isCreate ? 'Verifikasi & TTD JSA' : 'Buka JSA',
        ctaUrl: getAppUrl(targetApprovalUrl),
      })
      const targetApproverEmail = (data.signatures as any)?.targetApproverEmail || ''
      const targetApproverName = (data.signatures as any)?.targetApproverName || ''

      const extraRecipients = [
        settings.notificationRecipients,
        settings.defaultSignerEmail,
        targetApproverEmail,
      ].filter(Boolean).join(',')

      await sendHseSafetyEmail({
        templateCode: isCreate ? 'hse_jsa_approval_request' : 'hse_jsa_updated',
        templateName: isCreate ? 'HSE JSA Approval Request' : 'HSE JSA Updated',
        variables: notificationPayload,
        extraTo: extraRecipients,
        fallbackSubject: isCreate
          ? `[HERO HSE] Permohonan Verifikasi & Approval JSA - ${notificationPayload.jsaNumber}`
          : `[HERO HSE] Update JSA: ${notificationPayload.jsaNumber}`,
        fallbackHtml: emailContent.html,
        fallbackText: emailContent.text,
      }).catch((e) => console.warn('[JSA Email Warn]', e))

      const bellRecipients = await resolveHseSafetyRecipients({ extraTo: extraRecipients }).catch(() => ({ to: [] }))
      if (bellRecipients?.to?.length > 0) {
        await notifyWorkflowBellRecipients({
          recipientEmails: bellRecipients.to,
          eventType: isCreate ? 'hse_jsa_approval_request' : 'hse_jsa_updated',
          category: 'approval_requests',
          title: isCreate
            ? `Review & Approval JSA: ${notificationPayload.jsaNumber}`
            : `Update JSA: ${notificationPayload.jsaNumber}`,
          body: isCreate
            ? `${creatorName} mengajukan JSA baru (${notificationPayload.jsaNumber}) untuk pekerjaan "${notificationPayload.jobDescription}" yang ditugaskan kepada ${targetApproverName || 'HSE Officer'} untuk verifikasi & TTD online.`
            : `${notificationPayload.jobDescription} diperbarui di register JSA.`,
          url: targetApprovalUrl,
          tagPrefix: 'hse-jsa',
          metadata: {
            jsaId: id,
            jsaNumber: notificationPayload.jsaNumber,
          },
        }).catch((e) => console.warn('[JSA Bell Warn]', e))
      }
    } catch (notifErr) {
      console.warn('[JSA] Notification delivery caught:', notifErr)
    }
  }

  try {
    revalidatePath('/dashboard/hse/jsa')
    revalidatePath('/jsa')
  } catch (revalErr) {
    console.warn('[JSA] revalidatePath warn:', revalErr)
  }

  return { success: true, id }
}

export async function deleteJsa(id: string) {
  const session = await getServerSession()
  if (!session?.user) throw new Error('Unauthorized')

  const canDelete = await checkJsaPermission('delete')
  if (!canDelete) throw new Error('Role Anda tidak punya akses menghapus JSA.')

  await ensureJsaTables()
  await db.delete(heroJsas).where(eq(heroJsas.id, id))
  revalidatePath('/dashboard/hse/jsa')
  return { success: true }
}

export async function verifyJsaAction(input: {
  id: string
  decision: 'approved' | 'rejected' | 'revert'
  verifierName?: string
  verifierTitle?: string
  verifierSignatureUrl?: string
  verifierNotes?: string
  rejectionReason?: string
}) {
  const session = await getServerSession()
  if (!session?.user) throw new Error('Unauthorized: Anda harus login untuk melakukan verifikasi.')

  const canEdit = await checkJsaPermission('edit')
  if (!canEdit) throw new Error('Role Anda tidak memiliki akses untuk verifikasi JSA.')

  await ensureJsaTables()

  const [existing] = await db.select().from(heroJsas).where(eq(heroJsas.id, input.id)).limit(1)
  if (!existing) throw new Error('Data JSA tidak ditemukan.')

  const existingSignatures = ((existing.signatures as any) || {}) as Record<string, any>

  // 1. Handle REVERT action
  if (input.decision === 'revert') {
    const updatedSignatures = {
      ...existingSignatures,
      verifierUrl: '',
      rejectionReason: '',
      approvalStatus: 'pending',
      revertedAt: new Date().toISOString(),
      revertedByEmail: session.user.email,
    }

    await db
      .update(heroJsas)
      .set({
        status: 'pending',
        signatures: updatedSignatures,
        updatedAt: new Date(),
      })
      .where(eq(heroJsas.id, input.id))

    try {
      revalidatePath('/dashboard/hse/jsa')
      revalidatePath('/dashboard/approval')
      revalidatePath(`/print/jsa/${input.id}`)
      revalidatePath('/jsa')
    } catch {}

    return { success: true, status: 'pending', message: 'Status JSA berhasil dikembalikan ke Pending.' }
  }

  // 2. Resolve Verifier Identity & Signature
  let verifierName = (input.verifierName || '').trim()
  let verifierTitle = (input.verifierTitle || '').trim()
  let finalSignatureUrl = (input.verifierSignatureUrl || '').trim()

  const currentEmp = await getCurrentEmployee().catch(() => null)
  if (!verifierName) {
    verifierName = currentEmp?.name || session.user.name || 'HSE Officer'
  }
  if (!verifierTitle) {
    verifierTitle = currentEmp?.jobTitle || (currentEmp?.departmentId ? 'HSE Specialist' : 'HSE Officer / Pengawas Site')
  }

  if (input.decision === 'approved') {
    // Auto-resolve signature if not provided
    if (!finalSignatureUrl) {
      if (currentEmp?.id) {
        const [empRow] = await db
          .select({ signatureDataUrl: employees.signatureDataUrl })
          .from(employees)
          .where(eq(employees.id, currentEmp.id))
          .limit(1)
        if (empRow?.signatureDataUrl) {
          finalSignatureUrl = empRow.signatureDataUrl
        }
      }
      if (!finalSignatureUrl) {
        finalSignatureUrl = generateRealisticSignatureSvgDataUrl(verifierName)
      }
    }

    if (finalSignatureUrl.startsWith('data:image/')) {
      finalSignatureUrl = await persistSignature(finalSignatureUrl)
    }
  }

  const newSignatures = {
    ...existingSignatures,
    verifierName,
    verifierTitle: verifierTitle || 'HSE Officer / Pengawas Site',
    verifierUrl: input.decision === 'approved' ? finalSignatureUrl : (existingSignatures.verifierUrl || ''),
    verifierDate: new Date().toISOString(),
    verifierNotes: (input.verifierNotes || '').trim(),
    rejectionReason: input.decision === 'rejected' ? (input.rejectionReason || '').trim() : '',
    approvalStatus: input.decision,
    verifiedAt: new Date().toISOString(),
    verifiedByEmail: session.user.email,
  }

  const newStatus = input.decision === 'approved' ? 'approved' : 'rejected'

  await db
    .update(heroJsas)
    .set({
      status: newStatus,
      signatures: newSignatures,
      updatedAt: new Date(),
    })
    .where(eq(heroJsas.id, input.id))

  // Dispatch confirmation notifications to creator and HSE team
  try {
    const settings = await getJsaSettings()
    const extraRecipients = [settings.notificationRecipients, settings.defaultSignerEmail].filter(Boolean).join(',')
    const bellRecipients = await resolveHseSafetyRecipients({ extraTo: extraRecipients }).catch(() => ({ to: [] }))

    const title = input.decision === 'approved'
      ? `JSA Disetujui: ${existing.jsaNumber}`
      : `JSA Perlu Revisi / Ditolak: ${existing.jsaNumber}`

    const body = input.decision === 'approved'
      ? `Dokumen JSA (${existing.jsaNumber}) telah diverifikasi & ditandatangani online oleh ${verifierName}.`
      : `Dokumen JSA (${existing.jsaNumber}) ditolak/perlu revisi oleh ${verifierName}. Catatan kesalahan: ${input.rejectionReason || '-'}`

    if (bellRecipients?.to?.length > 0) {
      await notifyWorkflowBellRecipients({
        recipientEmails: bellRecipients.to,
        eventType: input.decision === 'approved' ? 'hse_jsa_approved' : 'hse_jsa_rejected',
        category: 'approval_requests',
        title,
        body,
        url: `/dashboard/hse/jsa?tab=approval&id=${existing.id}`,
        tagPrefix: 'hse-jsa',
        metadata: {
          jsaId: existing.id,
          jsaNumber: existing.jsaNumber,
          decision: input.decision,
        },
      }).catch((e) => console.warn('[JSA Verify Bell Warn]', e))
    }

    const emailContent = buildHseSafetyEmail({
      title,
      intro: body,
      details: [
        `Nomor JSA: ${existing.jsaNumber}`,
        `Pekerjaan: ${existing.jobDescription}`,
        `Status: ${input.decision === 'approved' ? 'DISETUJUI (APPROVED)' : 'DITOLAK (REJECTED)'}`,
        `Verifikator: ${verifierName} (${verifierTitle})`,
        input.verifierNotes ? `Catatan: ${input.verifierNotes}` : null,
        input.rejectionReason ? `Catatan Dimana Salahnya / Alasan Revisi: ${input.rejectionReason}` : null,
      ],
      ctaLabel: 'Lihat Dokumen JSA',
      ctaUrl: getAppUrl(`/dashboard/hse/jsa?id=${existing.id}`),
    })

    await sendHseSafetyEmail({
      templateCode: input.decision === 'approved' ? 'hse_jsa_approved' : 'hse_jsa_rejected',
      templateName: input.decision === 'approved' ? 'HSE JSA Approved' : 'HSE JSA Rejected',
      variables: {
        jsaNumber: existing.jsaNumber,
        status: newStatus,
        verifierName,
      },
      extraTo: extraRecipients,
      fallbackSubject: `[HERO HSE] ${title}`,
      fallbackHtml: emailContent.html,
      fallbackText: emailContent.text,
    }).catch((e) => console.warn('[JSA Verify Email Warn]', e))
  } catch (err) {
    console.warn('[JSA Verify Notification Warn]', err)
  }

  revalidatePath('/dashboard/hse/jsa')
  revalidatePath('/dashboard/approval')
  revalidatePath(`/print/jsa/${input.id}`)
  revalidatePath('/jsa')

  return { success: true, status: newStatus }
}

/**
 * 1-Click Approval action (Kayak SPL / Daily Activity)
 * Otomatis pasang TTD digital user login tanpa perlu gambar manual satu-satu
 */
export async function quickApproveJsaAction(id: string, notes?: string) {
  return verifyJsaAction({
    id,
    decision: 'approved',
    verifierNotes: notes || 'Disetujui secara online via tombol approval',
  })
}

/**
 * Quick Reject action dengan catatan dimana salahnya
 */
export async function quickRejectJsaAction(id: string, reason: string) {
  if (!reason || !reason.trim()) {
    throw new Error('Catatan penolakan / dimana salahnya wajib diisi.')
  }
  return verifyJsaAction({
    id,
    decision: 'rejected',
    rejectionReason: reason.trim(),
  })
}

/**
 * Revert action (Kembalikan status ke Pending/Draft)
 */
export async function revertJsaAction(id: string) {
  return verifyJsaAction({
    id,
    decision: 'revert',
  })
}
