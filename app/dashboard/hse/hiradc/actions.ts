"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/db"
import { hiradcEntries, hiradcRegisters } from "@/db/schema/hero"
import { getServerSession } from "@/lib/auth-session"
import { buildHseSafetyEmail, resolveHseSafetyRecipients, sendHseSafetyEmail } from "@/lib/hse-safety-email"
import { importHiradcWorkbook } from "@/lib/hiradc/importer"
import {
  computeRiskScore,
  convertLikelihoodToSystem,
  convertSeverityToSystem,
  resolveRiskLevel,
} from "@/lib/hiradc/risk"
import { notifyWorkflowBellRecipients } from "@/lib/workflow-notification-center"
import { getAppUrl } from "@/lib/workflow-email"

export type HiradcActionState = { ok: boolean; message: string }

function revalidateHiradc() {
  revalidatePath("/dashboard/hse/hiradc")
  revalidatePath("/dashboard/hse/hiradc/report")
}

function str(formData: FormData, key: string) {
  return `${formData.get(key) ?? ""}`.trim()
}

function requireStr(formData: FormData, key: string, label: string) {
  const value = str(formData, key)
  if (!value) throw new Error(`${label} wajib diisi.`)
  return value
}

function readId(formData: FormData, key = "id") {
  const id = Number(formData.get(key))
  if (!Number.isInteger(id) || id <= 0) throw new Error("ID tidak valid.")
  return id
}

function failure(error: unknown): HiradcActionState {
  return { ok: false, message: error instanceof Error ? error.message : "Operasi HIRADC gagal." }
}

function success(message: string): HiradcActionState {
  revalidateHiradc()
  return { ok: true, message }
}

async function notifyHiradcRecipients(input: {
  templateCode: "hse_hiradc_register_created" | "hse_hiradc_register_updated"
  title: string
  department: string
  location: string
  status: string
  body: string
}) {
  const emailContent = buildHseSafetyEmail({
    title: input.title,
    intro: input.body,
    details: [
      input.department ? `Departemen: ${input.department}` : null,
      input.location ? `Lokasi: ${input.location}` : null,
      input.status ? `Status: ${input.status}` : null,
    ],
    ctaLabel: "Buka HIRADC",
    ctaUrl: getAppUrl("/dashboard/hse/hiradc"),
  })

  await sendHseSafetyEmail({
    templateCode: input.templateCode,
    templateName:
      input.templateCode === "hse_hiradc_register_created"
        ? "HSE HIRADC Register Created"
        : "HSE HIRADC Register Updated",
    variables: {
      title: input.title,
      department: input.department,
      location: input.location,
      status: input.status,
    },
    fallbackSubject:
      input.templateCode === "hse_hiradc_register_created"
        ? `HIRADC register baru: ${input.title}`
        : `Update HIRADC register: ${input.title}`,
    fallbackHtml: emailContent.html,
    fallbackText: emailContent.text,
  })

  const recipients = await resolveHseSafetyRecipients()
  await notifyWorkflowBellRecipients({
    recipientEmails: recipients.to,
    eventType: input.templateCode,
    category: "hse_alerts",
    title:
      input.templateCode === "hse_hiradc_register_created"
        ? `HIRADC baru: ${input.title}`
        : `Update HIRADC: ${input.title}`,
    body: input.body,
    url: "/dashboard/hse/hiradc",
    tagPrefix: "hse-hiradc",
    metadata: {
      title: input.title,
      department: input.department,
      location: input.location,
      status: input.status,
    },
  })
}

/**
 * Build the risk fields for an entry. Likelihood/severity are submitted in the
 * SYSTEM scale already (A-E / 1-5); score + level are derived consistently.
 */
function buildRiskFields(formData: FormData, prefix: "Before" | "After") {
  const likelihood = convertLikelihoodToSystem(str(formData, `likelihood${prefix}`))
  const severity = convertSeverityToSystem(str(formData, `severity${prefix}`))
  const score = computeRiskScore(likelihood, severity)
  const level = resolveRiskLevel(str(formData, `riskLevel${prefix}`), score)
  return { likelihood, severity, score, level }
}

// ----------------------------------------------------------------------------
// Register CRUD
// ----------------------------------------------------------------------------

export async function saveHiradcRegisterAction(
  _prev: HiradcActionState,
  formData: FormData,
): Promise<HiradcActionState> {
  try {
    const session = await getServerSession()
    const idValue = Number(formData.get("id"))
    const payload = {
      title: requireStr(formData, "title", "Judul"),
      documentNo: str(formData, "documentNo"),
      department: str(formData, "department"),
      location: str(formData, "location"),
      revision: str(formData, "revision") || "0",
      effectiveDate: str(formData, "effectiveDate") || null,
      preparedBy: str(formData, "preparedBy"),
      reviewedBy: str(formData, "reviewedBy"),
      approvedBy: str(formData, "approvedBy"),
      status: str(formData, "status") || "draft",
      notes: str(formData, "notes"),
      updatedAt: new Date(),
    }

    if (Number.isInteger(idValue) && idValue > 0) {
      await db.update(hiradcRegisters).set(payload).where(eq(hiradcRegisters.id, idValue))
      try {
        await notifyHiradcRecipients({
          templateCode: "hse_hiradc_register_updated",
          title: payload.title,
          department: payload.department,
          location: payload.location,
          status: payload.status,
          body: `${payload.title} diperbarui di register HIRADC.`,
        })
      } catch (notificationError) {
        console.error("HIRADC register update notification error:", notificationError)
      }
      return success("Register HIRADC diperbarui.")
    }

    await db.insert(hiradcRegisters).values({
      ...payload,
      createdByUserId: session?.user?.id ?? null,
    })
    try {
      await notifyHiradcRecipients({
        templateCode: "hse_hiradc_register_created",
        title: payload.title,
        department: payload.department,
        location: payload.location,
        status: payload.status,
        body: `${payload.title} ditambahkan ke register HIRADC.`,
      })
    } catch (notificationError) {
      console.error("HIRADC register create notification error:", notificationError)
    }
    return success("Register HIRADC dibuat.")
  } catch (error) {
    return failure(error)
  }
}

export async function deleteHiradcRegisterAction(
  _prev: HiradcActionState,
  formData: FormData,
): Promise<HiradcActionState> {
  try {
    const id = readId(formData)
    await db.delete(hiradcRegisters).where(eq(hiradcRegisters.id, id))
    return success("Register HIRADC dihapus.")
  } catch (error) {
    return failure(error)
  }
}

// ----------------------------------------------------------------------------
// Entry CRUD
// ----------------------------------------------------------------------------

export async function saveHiradcEntryAction(
  _prev: HiradcActionState,
  formData: FormData,
): Promise<HiradcActionState> {
  try {
    const idValue = Number(formData.get("id"))
    const registerIdValue = Number(formData.get("registerId"))
    const registerId = Number.isInteger(registerIdValue) && registerIdValue > 0 ? registerIdValue : null

    const before = buildRiskFields(formData, "Before")
    const after = buildRiskFields(formData, "After")

    const payload = {
      registerId,
      department: str(formData, "department"),
      location: str(formData, "location"),
      activityName: requireStr(formData, "activityName", "Nama Kegiatan"),
      routineType: str(formData, "routineType") || "Rutin",
      equipment: str(formData, "equipment"),
      hazardCategory: str(formData, "hazardCategory"),
      hazardDetails: str(formData, "hazardDetails"),
      riskConsequence: str(formData, "riskConsequence"),
      likelihoodBefore: before.likelihood,
      severityBefore: before.severity,
      scoreBefore: before.score,
      riskLevelBefore: before.level,
      existingControl: str(formData, "existingControl"),
      legalReference: str(formData, "legalReference"),
      likelihoodAfter: after.likelihood,
      severityAfter: after.severity,
      scoreAfter: after.score,
      riskLevelAfter: after.level,
      additionalControl: str(formData, "additionalControl"),
      updatedAt: new Date(),
    }

    if (Number.isInteger(idValue) && idValue > 0) {
      await db.update(hiradcEntries).set(payload).where(eq(hiradcEntries.id, idValue))
      try {
        await notifyHiradcRecipients({
          templateCode: "hse_hiradc_register_updated",
          title: payload.activityName,
          department: payload.department,
          location: payload.location,
          status: payload.riskLevelAfter,
          body: `${payload.activityName} diperbarui pada entri HIRADC.`,
        })
      } catch (notificationError) {
        console.error("HIRADC entry update notification error:", notificationError)
      }
      return success("Baris HIRADC diperbarui.")
    }

    const orderIndex = Number(formData.get("orderIndex")) || Date.now() % 100000
    await db.insert(hiradcEntries).values({ ...payload, orderIndex })
    try {
      await notifyHiradcRecipients({
        templateCode: "hse_hiradc_register_created",
        title: payload.activityName,
        department: payload.department,
        location: payload.location,
        status: payload.riskLevelAfter,
        body: `${payload.activityName} ditambahkan ke entri HIRADC.`,
      })
    } catch (notificationError) {
      console.error("HIRADC entry create notification error:", notificationError)
    }
    return success("Baris HIRADC ditambahkan.")
  } catch (error) {
    return failure(error)
  }
}

export async function deleteHiradcEntryAction(
  _prev: HiradcActionState,
  formData: FormData,
): Promise<HiradcActionState> {
  try {
    const id = readId(formData)
    await db.delete(hiradcEntries).where(eq(hiradcEntries.id, id))
    return success("Baris HIRADC dihapus.")
  } catch (error) {
    return failure(error)
  }
}

// ----------------------------------------------------------------------------
// Import
// ----------------------------------------------------------------------------

export type HiradcImportState = HiradcActionState & {
  totalRows?: number
  successCount?: number
  errorCount?: number
  registerCount?: number
}

export const INITIAL_HIRADC_IMPORT_STATE: HiradcImportState = { ok: false, message: "" }

export async function importHiradcAction(
  _prev: HiradcImportState,
  formData: FormData,
): Promise<HiradcImportState> {
  try {
    const file = formData.get("file")
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Pilih file Excel HIRADC (.xlsx) terlebih dahulu.")
    }

    const grouping = (str(formData, "grouping") as "department" | "single") || "department"
    const replaceExisting = str(formData, "replaceExisting") === "true"
    const session = await getServerSession()

    const buffer = Buffer.from(await file.arrayBuffer())
    const summary = await importHiradcWorkbook(buffer, {
      grouping,
      replaceExisting,
      originalFilename: file.name,
      uploadedByUserId: session?.user?.id ?? null,
    })

    revalidateHiradc()
    return {
      ok: true,
      message: `Import selesai: ${summary.successCount} baris, ${summary.registerCount} register, ${summary.errorCount} error.`,
      totalRows: summary.totalRows,
      successCount: summary.successCount,
      errorCount: summary.errorCount,
      registerCount: summary.registerCount,
    }
  } catch (error) {
    return { ...failure(error) }
  }
}
