"use server"

import { and, eq, lte, isNull, desc, isNotNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { hseInventories, hrEmployees } from "@/db/schema/hero"
import { getEmailSmtpSettingsData } from "@/lib/hero-admin"
import { sendEmailViaSmtp } from "@/lib/email-delivery"

// Helper untuk hitung tanggal expired otomatis
function calculateExpirationDate(purchaseDateStr: string | Date | null | undefined, validityMonths: number | null | undefined) {
  if (!purchaseDateStr) return null
  const date = new Date(purchaseDateStr)
  if (isNaN(date.getTime())) return null
  if (!validityMonths || isNaN(Number(validityMonths))) return null
  
  date.setMonth(date.getMonth() + Number(validityMonths))
  return date
}

export async function getHseInventories() {
  try {
    const data = await db
      .select()
      .from(hseInventories)
      .orderBy(desc(hseInventories.createdAt))
    return { success: true, data }
  } catch (error) {
    console.error("Failed to fetch HSE inventories:", error)
    return { success: false, error: "Gagal mengambil data inventaris" }
  }
}

export async function createHseInventory(formData: {
  name: string
  category: string
  qty: number
  location: string
  condition: string
  notes?: string
  picName?: string
  photoUrl?: string
  purchaseDate?: string | Date
  validityMonths?: number
  reminderDaysBefore?: number
  reminderEmailRecipients?: string
}) {
  try {
    const documentId = `INV-${Date.now()}`
    
    // Perhitungan tanggal expired otomatis
    const expirationDate = calculateExpirationDate(formData.purchaseDate, formData.validityMonths)
    
    const [newItem] = await db
      .insert(hseInventories)
      .values({
        documentId,
        name: formData.name,
        category: formData.category,
        qty: Number(formData.qty) || 1,
        location: formData.location,
        condition: formData.condition || "Baik",
        notes: formData.notes ?? "",
        picName: formData.picName ?? "System",
        photoUrl: formData.photoUrl ?? "",
        purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : null,
        validityMonths: formData.validityMonths ? Number(formData.validityMonths) : null,
        expirationDate,
        reminderDaysBefore: formData.reminderDaysBefore ? Number(formData.reminderDaysBefore) : 30,
        reminderEmailRecipients: formData.reminderEmailRecipients ?? "",
        verifiedStatus: "verified",
      })
      .returning()

    revalidatePath("/dashboard/hse/inventaris")
    revalidatePath("/mobile/hse/inventaris")
    return { success: true, data: newItem }
  } catch (error) {
    console.error("Failed to create HSE inventory:", error)
    return { success: false, error: "Gagal menambahkan data inventaris" }
  }
}

export async function updateHseInventory(
  id: number,
  formData: {
    name: string
    category: string
    qty: number
    location: string
    condition: string
    notes?: string
    picName?: string
    photoUrl?: string
    purchaseDate?: string | Date
    validityMonths?: number
    reminderDaysBefore?: number
    reminderEmailRecipients?: string
  }
) {
  try {
    const expirationDate = calculateExpirationDate(formData.purchaseDate, formData.validityMonths)

    const [updatedItem] = await db
      .update(hseInventories)
      .set({
        name: formData.name,
        category: formData.category,
        qty: Number(formData.qty) || 1,
        location: formData.location,
        condition: formData.condition,
        notes: formData.notes ?? "",
        picName: formData.picName ?? "System",
        photoUrl: formData.photoUrl ?? "",
        purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : null,
        validityMonths: formData.validityMonths ? Number(formData.validityMonths) : null,
        expirationDate,
        reminderDaysBefore: formData.reminderDaysBefore ? Number(formData.reminderDaysBefore) : 30,
        reminderEmailRecipients: formData.reminderEmailRecipients ?? "",
        updatedAt: new Date(),
      })
      .where(eq(hseInventories.id, id))
      .returning()

    revalidatePath("/dashboard/hse/inventaris")
    revalidatePath("/mobile/hse/inventaris")
    return { success: true, data: updatedItem }
  } catch (error) {
    console.error("Failed to update HSE inventory:", error)
    return { success: false, error: "Gagal memperbarui data inventaris" }
  }
}

export async function updateHseInventoryStatus(id: number, condition: string) {
  try {
    const [updatedItem] = await db
      .update(hseInventories)
      .set({
        condition,
        updatedAt: new Date(),
      })
      .where(eq(hseInventories.id, id))
      .returning()

    revalidatePath("/dashboard/hse/inventaris")
    revalidatePath("/mobile/hse/inventaris")
    return { success: true, data: updatedItem }
  } catch (error) {
    console.error("Failed to update HSE inventory status:", error)
    return { success: false, error: "Gagal memperbarui kondisi barang" }
  }
}

export async function deleteHseInventory(id: number) {
  try {
    await db.delete(hseInventories).where(eq(hseInventories.id, id))
    revalidatePath("/dashboard/hse/inventaris")
    revalidatePath("/mobile/hse/inventaris")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete HSE inventory:", error)
    return { success: false, error: "Gagal menghapus data inventaris" }
  }
}

// Action untuk scan & kirim reminder email otomatis jika mendekati expired
export async function runHseInventoryReminderCheck() {
  try {
    const now = new Date()
    
    // Cari item yang expiredDate tidak kosong dan belum pernah dikirim reminder (atau sudah lewat)
    const items = await db
      .select()
      .from(hseInventories)
      .where(
        and(
          isNull(hseInventories.lastReminderSentAt)
        )
      )

    if (items.length === 0) {
      return { success: true, sentCount: 0 }
    }

    const smtpSettings = await getEmailSmtpSettingsData()
    const canSendEmail = smtpSettings.host.trim().length > 0 && smtpSettings.fromEmail.trim().length > 0
    
    if (!canSendEmail) {
      console.warn("SMTP settings not configured, skipping HSE inventory email reminders")
      return { success: false, error: "SMTP belum dikonfigurasi" }
    }

    let sentCount = 0

    for (const item of items) {
      if (!item.expirationDate || !item.reminderEmailRecipients) {
        continue
      }

      // Hitung batas tanggal pengiriman reminder
      const expirationTime = new Date(item.expirationDate).getTime()
      const reminderDaysMs = (item.reminderDaysBefore || 30) * 24 * 60 * 60 * 1000
      const reminderTriggerTime = expirationTime - reminderDaysMs

      // Jika waktu sekarang sudah melewati batas pemicu reminder
      if (now.getTime() >= reminderTriggerTime) {
        const recipients = item.reminderEmailRecipients
          .split(",")
          .map((email) => email.trim())
          .filter((email) => email.length > 0 && email.includes("@"))

        if (recipients.length === 0) continue

        const formattedPurchaseDate = item.purchaseDate 
          ? new Date(item.purchaseDate).toLocaleDateString('id-ID', { dateStyle: 'long' })
          : "-"
        const formattedExpDate = new Date(item.expirationDate).toLocaleDateString('id-ID', { dateStyle: 'long' })

        const subject = `[HERO HSE] Pengingat Kedaluwarsa Aset: ${item.name}`
        const html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
              <h2 style="margin: 0; font-size: 20px;">PENGINGAT KEDALUWARSA ASET HSE</h2>
            </div>
            <div style="padding: 24px; background-color: #ffffff;">
              <p>Halo,</p>
              <p>Aset HSE berikut mendekati tanggal kedaluwarsa atau telah kedaluwarsa. Mohon segera lakukan pemeriksaan atau kalibrasi ulang.</p>
              
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #f97316;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold; width: 140px; color: #475569;">Nama Aset:</td>
                    <td style="padding: 6px 0; color: #0f172a;">${item.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold; color: #475569;">Kategori:</td>
                    <td style="padding: 6px 0; color: #0f172a;">${item.category}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold; color: #475569;">Lokasi Simpan:</td>
                    <td style="padding: 6px 0; color: #0f172a;">${item.location}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold; color: #475569;">Tanggal Beli:</td>
                    <td style="padding: 6px 0; color: #0f172a;">${formattedPurchaseDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold; color: #475569;">Masa Berlaku:</td>
                    <td style="padding: 6px 0; color: #0f172a;">${item.validityMonths} Bulan</td>
                  </tr>
                  <tr style="font-size: 16px; font-weight: bold;">
                    <td style="padding: 8px 0; color: #e11d48;">Tanggal Expired:</td>
                    <td style="padding: 8px 0; color: #e11d48;">${formattedExpDate}</td>
                  </tr>
                </table>
              </div>
              
              <p style="margin-top: 24px;">PIC Terkait: <strong>${item.picName}</strong></p>
              <p style="font-size: 13px; color: #64748b; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                Email ini dikirim otomatis oleh <strong>Official HSE System (HERO)</strong>. Jangan membalas email ini.
              </p>
            </div>
          </div>
        `
        const text = `
          PENGINGAT KEDALUWARSA ASET HSE
          Nama Aset: ${item.name}
          Kategori: ${item.category}
          Lokasi: ${item.location}
          Tanggal Beli: ${formattedPurchaseDate}
          Masa Berlaku: ${item.validityMonths} Bulan
          Tanggal Expired: ${formattedExpDate}
          PIC Terkait: ${item.picName}
        `

        for (const recipient of recipients) {
          try {
            await sendEmailViaSmtp(smtpSettings, {
              to: recipient,
              subject,
              html,
              text,
              templateName: "HSE Inventory Expiration Reminder",
              templateCode: "hse_inventory_reminder",
            })
            sentCount++
          } catch (err) {
            console.error(`Failed to send reminder email to ${recipient}:`, err)
          }
        }

        // Tandai sudah dikirim
        await db
          .update(hseInventories)
          .set({ lastReminderSentAt: now })
          .where(eq(hseInventories.id, item.id))
      }
    }

    return { success: true, sentCount }
  } catch (error) {
    console.error("Failed to run HSE inventory reminder check:", error)
    return { success: false, error: "Gagal memproses pengingat email" }
  }
}

export async function getHseUserEmails() {
  try {
    const users = await db
      .select({
        id: hrEmployees.id,
        name: hrEmployees.fullName,
        email: hrEmployees.email,
      })
      .from(hrEmployees)
      .where(
        and(
          eq(hrEmployees.isActive, true),
          isNotNull(hrEmployees.email)
        )
      )
      .orderBy(hrEmployees.fullName)
    
    return { 
      success: true, 
      data: users
        .filter(u => u.email && u.email.trim().length > 0)
        .map(u => ({
          id: u.id,
          name: u.name,
          email: u.email!.trim()
        }))
    }
  } catch (error) {
    console.error("Failed to fetch HSE users for reminders:", error)
    return { success: false, data: [] }
  }
}
