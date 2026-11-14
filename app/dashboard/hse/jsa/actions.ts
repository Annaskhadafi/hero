'use server'

import { revalidatePath } from 'next/cache'
import { eq, desc, sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { db } from '@/db'
import { heroJsas, heroJsaSettings, heroJsaSteps, type NewJsa, type NewJsaStep } from '@/db/schema/jsa'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { buildHseSafetyEmail, resolveHseSafetyRecipients, sendHseSafetyEmail } from '@/lib/hse-safety-email'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'
import { getAppUrl } from '@/lib/workflow-email'
import { uploadBufferToS3 } from '@/lib/s3-storage'

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
      const extraRecipients = [
        settings.notificationRecipients,
        settings.defaultSignerEmail,
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
            ? `${creatorName} mengajukan JSA baru (${notificationPayload.jsaNumber}) untuk pekerjaan "${notificationPayload.jobDescription}" yang memerlukan verifikasi dan TTD online Anda.`
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
  decision: 'approved' | 'rejected'
  verifierName: string
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

  let finalSignatureUrl = input.verifierSignatureUrl || ''
  if (input.decision === 'approved') {
    if (!finalSignatureUrl) {
      throw new Error('Tanda tangan online wajib diberikan untuk menyetujui JSA.')
    }
    if (finalSignatureUrl.startsWith('data:image/')) {
      finalSignatureUrl = await persistSignature(finalSignatureUrl)
    }
  }

  const existingSignatures = ((existing.signatures as any) || {}) as Record<string, any>
  const newSignatures = {
    ...existingSignatures,
    verifierName: input.verifierName.trim(),
    verifierTitle: (input.verifierTitle || 'HSE Officer / Pengawas Site').trim(),
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
      ? `Dokumen JSA (${existing.jsaNumber}) telah diverifikasi & ditandatangani online oleh ${input.verifierName}.`
      : `Dokumen JSA (${existing.jsaNumber}) ditolak/perlu revisi oleh ${input.verifierName}. Alasan: ${input.rejectionReason || '-'}`

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
        `Verifikator: ${input.verifierName} (${input.verifierTitle || 'HSE Officer'})`,
        input.verifierNotes ? `Catatan: ${input.verifierNotes}` : null,
        input.rejectionReason ? `Alasan Penolakan: ${input.rejectionReason}` : null,
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
        verifierName: input.verifierName,
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
