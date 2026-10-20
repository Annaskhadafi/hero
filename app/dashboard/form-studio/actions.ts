'use server'

import { db } from '@/db'
import {
  formTemplates,
  formTemplateVersions,
  formTemplateSections,
  formTemplateFields,
  formFieldOptions,
  formSubmissions,
  formSubmissionValues,
  employees,
  notificationEvents,
  notificationDeliveries,
} from '@/db/schema/hero'
import { eq, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { incrementFormMetric } from '@/lib/form-service'
import { getServerSession } from '@/lib/auth-session'
import { getMaestroServerSession } from '@/lib/maestro-session'
import type {
  FormFieldDefinition,
  FormSettings,
  FormThemeConfig,
} from '@/lib/form-builder-types'

async function requireStudioSession() {
  const session = await getServerSession()
  if (session?.user?.email) {
    return { success: true as const, user: session.user, isHero: true }
  }
  const maestroSession = await getMaestroServerSession()
  if (maestroSession?.user?.email) {
    return { success: true as const, user: maestroSession.user, isMaestro: true }
  }
  return { success: false as const, error: 'Unauthorized: Sesi login diperlukan untuk mengelola formulir.' }
}

export async function createFormAction(data: {
  name: string
  category?: string
  description?: string
  slug?: string
}) {
  try {
    const auth = await requireStudioSession()
    if (!auth.success) return { success: false, error: auth.error }

    let creatorEmpId: number | null = null
    if (auth.user?.email) {
      const [emp] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(sql`lower(trim(${employees.email}))`, auth.user.email.toLowerCase().trim()))
        .limit(1)
      creatorEmpId = emp?.id || null
    }

    const rawSlug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const uniqueSlug = `${rawSlug}-${Math.random().toString(36).substring(2, 6)}`
    const templateKey = `form-${Date.now()}`

    const [newTpl] = await db
      .insert(formTemplates)
      .values({
        templateKey,
        slug: uniqueSlug,
        name: data.name,
        category: data.category || 'Survei & Kuesioner',
        description: data.description || '',
        themeConfigJson: JSON.stringify({
          primaryColor: '#2563eb',
          accentColor: '#3b82f6',
          borderRadius: 'md',
        }),
        settingsJson: JSON.stringify({
          requireIdentity: true,
          requireEmail: true,
          requirePhone: false,
          allowMultipleSubmissions: true,
          showProgressBar: true,
          customThankYouMessage: 'Terima kasih atas partisipasi dan waktu Anda!',
        }),
        isActive: true,
      })
      .returning()

    // Buat initial draft version
    const [version] = await db
      .insert(formTemplateVersions)
      .values({
        templateId: newTpl.id,
        versionNumber: 1,
        publishStatus: 'published',
        createdByEmployeeId: creatorEmpId,
      })
      .returning()

    // Buat sample initial fields: NPS & Feedback
    const [section] = await db
      .insert(formTemplateSections)
      .values({
        versionId: version.id,
        sectionKey: 'main',
        label: 'Pertanyaan Utama',
        sortOrder: 1,
      })
      .returning()

    // 1. NPS Field
    const [npsField] = await db
      .insert(formTemplateFields)
      .values({
        versionId: version.id,
        sectionId: section.id,
        fieldKey: 'nps_score',
        fieldType: 'nps',
        label: 'Seberapa besar kemungkinan Anda merekomendasikan layanan kami kepada rekan kerja atau mitra?',
        helpText: 'Skala 0 (Sangat tidak mungkin) sampai 10 (Sangat mungkin)',
        isRequired: true,
        sortOrder: 1,
        configJson: JSON.stringify({ min: 0, max: 10 }),
      })
      .returning()

    // 2. Feedback Field
    await db.insert(formTemplateFields).values({
      versionId: version.id,
      sectionId: section.id,
      fieldKey: 'feedback_reason',
      fieldType: 'long_text',
      label: 'Apa alasan utama Anda memberikan skor tersebut?',
      placeholder: 'Ceritakan pengalaman atau saran Anda...',
      isRequired: false,
      sortOrder: 2,
    })

    revalidatePath('/dashboard/form-studio')
    return { success: true, formId: newTpl.id, slug: newTpl.slug }
  } catch (err: any) {
    console.error('Error createFormAction:', err)
    return { success: false, error: err.message || 'Gagal membuat formulir baru' }
  }
}

export async function saveFormBuilderAction(data: {
  formId: number
  name: string
  description?: string
  slug: string
  isActive: boolean
  themeConfig: FormThemeConfig
  settings: FormSettings
  fields: FormFieldDefinition[]
}) {
  try {
    const auth = await requireStudioSession()
    if (!auth.success) return { success: false, error: auth.error }

    const tpls = await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.id, data.formId))
      .limit(1)

    if (tpls.length === 0) return { success: false, error: 'Formulir tidak ditemukan' }

    // Update table hero_form_templates
    await db
      .update(formTemplates)
      .set({
        name: data.name,
        description: data.description || '',
        slug: data.slug.trim().toLowerCase(),
        isActive: data.isActive,
        themeConfigJson: JSON.stringify(data.themeConfig || {}),
        settingsJson: JSON.stringify(data.settings || {}),
        updatedAt: new Date(),
      })
      .where(eq(formTemplates.id, data.formId))

    // Ambil latest version atau create version baru
    let versions = await db
      .select()
      .from(formTemplateVersions)
      .where(eq(formTemplateVersions.templateId, data.formId))
      .orderBy(desc(formTemplateVersions.versionNumber))
      .limit(1)

    let versionId: number
    if (versions.length === 0) {
      const [v] = await db
        .insert(formTemplateVersions)
        .values({
          templateId: data.formId,
          versionNumber: 1,
          publishStatus: 'published',
        })
        .returning()
      versionId = v.id
    } else {
      versionId = versions[0].id
    }

    // Ambil section default
    let sections = await db
      .select()
      .from(formTemplateSections)
      .where(eq(formTemplateSections.versionId, versionId))
      .limit(1)

    let sectionId: number
    if (sections.length === 0) {
      const [sec] = await db
        .insert(formTemplateSections)
        .values({
          versionId,
          sectionKey: 'section-1',
          label: 'Pertanyaan',
          sortOrder: 1,
        })
        .returning()
      sectionId = sec.id
    } else {
      sectionId = sections[0].id
    }

    // Simpan semua fields: Hapus field lama versi ini lalu insert ulang
    // Untuk safety data relational opsi & field versi ini
    const existingFields = await db
      .select()
      .from(formTemplateFields)
      .where(eq(formTemplateFields.versionId, versionId))

    for (const ef of existingFields) {
      await db.delete(formFieldOptions).where(eq(formFieldOptions.fieldId, ef.id))
    }
    await db.delete(formTemplateFields).where(eq(formTemplateFields.versionId, versionId))

    // Insert new fields
    for (let i = 0; i < data.fields.length; i++) {
      const f = data.fields[i]
      const configJson = JSON.stringify({
        likertRows: f.likertRows,
        likertColumns: f.likertColumns,
        min: f.min,
        max: f.max,
        step: f.step,
        minLabel: f.minLabel,
        maxLabel: f.maxLabel,
        allowedFileTypes: f.allowedFileTypes,
        maxFileSizeMb: f.maxFileSizeMb,
        pageNumber: f.pageNumber || 1,
      })

      const [newField] = await db
        .insert(formTemplateFields)
        .values({
          versionId,
          sectionId,
          fieldKey: f.fieldKey || `field_${Date.now()}_${i}`,
          fieldType: f.fieldType,
          label: f.label || 'Pertanyaan tanpa judul',
          placeholder: f.placeholder || '',
          helpText: f.helpText || '',
          defaultValue: f.defaultValue || '',
          configJson,
          logicRulesJson: JSON.stringify(f.logicRules || []),
          isRequired: Boolean(f.isRequired),
          isHidden: Boolean(f.isHidden),
          sortOrder: i + 1,
        })
        .returning()

      // Insert options jika tipe pilihan
      if (f.options && f.options.length > 0) {
        for (let j = 0; j < f.options.length; j++) {
          const opt = f.options[j]
          await db.insert(formFieldOptions).values({
            fieldId: newField.id,
            optionValue: opt.value || opt.label,
            optionLabel: opt.label,
            sortOrder: j + 1,
          })
        }
      }
    }

    revalidatePath(`/dashboard/form-studio/${data.formId}`)
    revalidatePath(`/dashboard/form-studio/${data.formId}/builder`)
    revalidatePath(`/dashboard/form-studio`)
    return { success: true }
  } catch (err: any) {
    console.error('Error saveFormBuilderAction:', err)
    return { success: false, error: err.message || 'Gagal menyimpan form' }
  }
}

export async function submitPublicResponseAction(data: {
  slug: string
  respondentName: string
  respondentEmail: string
  respondentPhone?: string
  respondentCompany?: string
  respondentSite?: string
  respondentDepartment?: string
  durationSeconds?: number
  answers: Record<string, any>
}) {
  try {
    const cleanSlug = data.slug.trim().toLowerCase()
    const tpls = await db
      .select()
      .from(formTemplates)
      .where(sql`LOWER(${formTemplates.slug}) = ${cleanSlug} OR LOWER(${formTemplates.templateKey}) = ${cleanSlug}`)
      .limit(1)

    if (tpls.length === 0) return { success: false, error: 'Formulir tidak ditemukan' }
    const tpl = tpls[0]

    const versions = await db
      .select()
      .from(formTemplateVersions)
      .where(eq(formTemplateVersions.templateId, tpl.id))
      .orderBy(desc(formTemplateVersions.versionNumber))
      .limit(1)

    if (versions.length === 0) return { success: false, error: 'Versi formulir tidak ditemukan' }
    const version = versions[0]

    const dbFields = await db
      .select()
      .from(formTemplateFields)
      .where(eq(formTemplateFields.versionId, version.id))

    // Validasi field wajib
    for (const f of dbFields) {
      if (f.isRequired) {
        const val = data.answers[f.fieldKey]
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          return { success: false, error: `Pertanyaan "${f.label}" wajib diisi` }
        }
      }
    }

    // Detect optional multi-tenant respondent session (HERO employee, Maestro customer, or public guest)
    const heroSession = await getServerSession()
    const maestroSession = !heroSession?.user?.email ? await getMaestroServerSession() : null

    let requesterEmployeeId: number | null = null
    if (heroSession?.user?.email) {
      const [emp] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(sql`lower(trim(${employees.email}))`, heroSession.user.email.toLowerCase().trim()))
        .limit(1)
      requesterEmployeeId = emp?.id || null
    }

    const respondentMetadata = {
      company: data.respondentCompany?.trim() || '',
      site: data.respondentSite?.trim() || '',
      department: data.respondentDepartment?.trim() || '',
      tenantSource: maestroSession?.user ? 'maestro' : (heroSession?.user ? 'hero' : 'public'),
      userEmail: heroSession?.user?.email || maestroSession?.user?.email || '',
      userName: heroSession?.user?.name || maestroSession?.user?.name || '',
    }

    // Insert submission record
    const [sub] = await db
      .insert(formSubmissions)
      .values({
        templateId: tpl.id,
        templateVersionId: version.id,
        requesterEmployeeId,
        respondentName: data.respondentName.trim(),
        respondentEmail: data.respondentEmail.trim(),
        respondentPhone: data.respondentPhone?.trim() || '',
        respondentMetadataJson: JSON.stringify(respondentMetadata),
        isPublicSubmission: !heroSession?.user && !maestroSession?.user,
        durationSeconds: data.durationSeconds || 0,
        requestNumber: `RES-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        requestStatus: 'submitted',
        submittedAt: new Date(),
      })
      .returning()

    // Insert values
    for (const f of dbFields) {
      const rawVal = data.answers[f.fieldKey]
      if (rawVal === undefined || rawVal === null) continue

      let valueText = ''
      let numericValue: number | null = null
      let jsonValue = ''
      let displayValue = ''

      if (typeof rawVal === 'number') {
        numericValue = rawVal
        valueText = String(rawVal)
        displayValue = String(rawVal)
      } else if (typeof rawVal === 'string') {
        valueText = rawVal
        displayValue = rawVal
        const parsed = Number(rawVal)
        if (!isNaN(parsed) && ['nps', 'star_rating', 'slider', 'number'].includes(f.fieldType)) {
          numericValue = parsed
        }
      } else if (Array.isArray(rawVal)) {
        jsonValue = JSON.stringify(rawVal)
        valueText = rawVal.join(', ')
        displayValue = rawVal.join(', ')
      } else if (typeof rawVal === 'object') {
        jsonValue = JSON.stringify(rawVal)
        valueText = JSON.stringify(rawVal)
        displayValue = JSON.stringify(rawVal)
      }

      await db.insert(formSubmissionValues).values({
        submissionId: sub.id,
        fieldKey: f.fieldKey,
        fieldType: f.fieldType,
        valueText,
        numericValue,
        jsonValue,
        displayValue,
      })
    }

    // Increment completion metric
    await incrementFormMetric(tpl.slug || tpl.templateKey, 'completion')

    return { success: true, submissionId: sub.id }
  } catch (err: any) {
    console.error('Error submitPublicResponseAction:', err)
    return { success: false, error: err.message || 'Gagal mengirim jawaban' }
  }
}

export async function trackFormStartAction(slug: string) {
  try {
    await incrementFormMetric(slug, 'start')
    return { success: true }
  } catch {
    return { success: false }
  }
}

export async function deleteFormAction(formId: number) {
  try {
    const auth = await requireStudioSession()
    if (!auth.success) return { success: false, error: auth.error }

    await db.delete(formTemplates).where(eq(formTemplates.id, formId))
    revalidatePath('/dashboard/form-studio')
    return { success: true }
  } catch (err: any) {
    console.error('Error deleteFormAction:', err)
    return { success: false, error: err.message || 'Gagal menghapus formulir' }
  }
}

export async function broadcastWhatsAppFormAction(data: {
  formId: number
  phoneNumbers: string[]
  customMessage?: string
}) {
  try {
    const auth = await requireStudioSession()
    if (!auth.success) return { success: false, error: auth.error }

    const [tpl] = await db
      .select()
      .from(formTemplates)
      .where(eq(formTemplates.id, data.formId))
      .limit(1)

    if (!tpl) return { success: false, error: 'Formulir tidak ditemukan' }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://form.chitraparatama.com'
    const formUrl = `${baseUrl.replace(/hero\./, 'form.')}/f/${tpl.slug}`

    const results = []

    for (const rawPhone of data.phoneNumbers) {
      const cleanPhone = rawPhone.trim().replace(/[^0-9]/g, '')
      if (!cleanPhone) continue

      // Format WhatsApp Indonesian phone
      const formattedPhone = cleanPhone.startsWith('0')
        ? `62${cleanPhone.slice(1)}`
        : cleanPhone.startsWith('62')
        ? cleanPhone
        : `62${cleanPhone}`

      const finalMessage = data.customMessage
        ? data.customMessage
            .replace(/\{\{formName\}\}/g, tpl.name)
            .replace(/\{\{formUrl\}\}/g, formUrl)
            .replace(/\{\{formDesc\}\}/g, tpl.description || '')
        : `Halo Rekan/Bapak/Ibu,\n\nMohon kesediaannya untuk meluangkan waktu sejenak mengisi formulir/kuesioner resmi PT Chitra Paratama berikut:\n\n📋 *${tpl.name}*\n${tpl.description ? `_${tpl.description}_\n` : ''}\n🔗 *Link Pengisian:* ${formUrl}\n\nMasukan Anda sangat berharga bagi peningkatan kualitas layanan operasional kami.\nTerima kasih atas partisipasinya! 🙏`

      // 1. Audit log di hero_notification_events & hero_notification_deliveries
      try {
        const [ev] = await db
          .insert(notificationEvents)
          .values({
            channel: 'whatsapp',
            eventType: 'form_broadcast_whatsapp',
            recipient: formattedPhone,
            payloadSnapshot: JSON.stringify({
              formId: tpl.id,
              formName: tpl.name,
              formUrl,
              message: finalMessage,
            }),
            deliveryStatus: 'delivered',
            deliveredAt: new Date(),
          })
          .returning()

        if (ev) {
          await db.insert(notificationDeliveries).values({
            notificationEventId: ev.id,
            deliveryChannel: 'whatsapp',
            recipient: formattedPhone,
            status: 'delivered',
            sentAt: new Date(),
          })
        }
      } catch (logErr) {
        console.warn('Gagal mencatat notificationEvent WA:', logErr)
      }

      // 2. Kirim via WhatsApp API Gateway jika dikonfigurasi di environment
      if (process.env.WHATSAPP_API_URL) {
        try {
          await fetch(process.env.WHATSAPP_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(process.env.WHATSAPP_TOKEN
                ? { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }
                : {}),
            },
            body: JSON.stringify({
              phone: formattedPhone,
              message: finalMessage,
            }),
          })
        } catch (fetchErr) {
          console.warn('Gagal memanggil WHATSAPP_API_URL:', fetchErr)
        }
      }

      results.push({ phone: formattedPhone, success: true })
    }

    return {
      success: true,
      sentCount: results.length,
      formUrl,
      messagePreview: data.customMessage
        ? data.customMessage.replace(/\{\{formName\}\}/g, tpl.name).replace(/\{\{formUrl\}\}/g, formUrl)
        : `📋 *${tpl.name}*\n🔗 ${formUrl}`,
    }
  } catch (err: any) {
    console.error('Error broadcastWhatsAppFormAction:', err)
    return { success: false, error: err.message || 'Gagal mengirim broadcast WhatsApp' }
  }
}
