"use server"

import { db } from "@/db"
import {
  rewardItems,
  rewardRedemptions,
  employees,
  pointEvents,
  sites,
} from "@/db/schema/hero"
import { eq, desc, and, sql } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-session"
import { revalidatePath } from "next/cache"
import { resolveUploadUrl } from "@/lib/resolve-upload-url"
import { notifyWorkflowBellRecipients } from "@/lib/workflow-notification-center"
import { sendWorkflowEmail } from "@/lib/workflow-email"

export type RewardItemData = {
  id: number
  code: string
  name: string
  description: string
  category: string
  imageUrl: string
  pointsRequired: number
  stockQuantity: number
  tierEligibility: string
  eligibleSiteIds?: number[]
  eligibleDepartmentIds?: number[]
  eligibleSectionIds?: number[]
  isEligible?: boolean
  ineligibilityReason?: string
  isYearEndBazaar: boolean
  isActive: boolean
  sortOrder: number
}

export type RedemptionRecordData = {
  id: number
  redemptionNumber: string
  employeeId: number
  employeeName: string
  employeeSn: string | null
  rewardItemId: number
  rewardItemName: string
  rewardItemImage: string
  siteId: number | null
  siteName: string | null
  pointsSpent: number
  status: string
  requestNote: string
  approvedByEmployeeId: number | null
  approvalNotes: string
  deliveryStatus: string
  trackingOrReceiptInfo: string
  isYearEndClaim: boolean
  createdAt: string
}

/**
 * Get active reward catalog and user's eligibility
 */
export async function getRewardStoreData() {
  const session = await getServerSession()
  let currentEmployee: {
    id: number
    name: string
    employeeSn: string | null
    totalPoints: number
    siteId: number | null
    siteName: string | null
    departmentId: number | null
    sectionId: number | null
    role: string
    hasClaimedThisYear: boolean
  } | null = null

  if (session?.user?.email) {
    const normalizedEmail = session.user.email.toLowerCase().trim()
    const [emp] = await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        totalPoints: employees.totalPoints,
        siteId: employees.siteId,
        departmentId: employees.departmentId,
        sectionId: employees.sectionId,
        siteName: sites.name,
        role: employees.role,
      })
      .from(employees)
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .where(sql`lower(${employees.email}) = ${normalizedEmail}`)
      .limit(1)

    if (emp) {
      // Check if user has redeemed anything approved/delivered this year
      const currentYear = new Date().getFullYear()
      const [claimedCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(rewardRedemptions)
        .where(
          and(
            eq(rewardRedemptions.employeeId, emp.id),
            sql`EXTRACT(YEAR FROM ${rewardRedemptions.createdAt}) = ${currentYear}`,
            sql`${rewardRedemptions.status} IN ('approved', 'delivered', 'pending')`
          )
        )

      currentEmployee = {
        ...emp,
        hasClaimedThisYear: Number(claimedCount?.count ?? 0) > 0,
      }
    }
  }

  // Get all active items
  const items = await db
    .select()
    .from(rewardItems)
    .where(eq(rewardItems.isActive, true))
    .orderBy(desc(rewardItems.sortOrder), rewardItems.pointsRequired)

  // Get user's redemptions if logged in
  let myRedemptions: RedemptionRecordData[] = []
  if (currentEmployee) {
    const redemptions = await db
      .select({
        id: rewardRedemptions.id,
        redemptionNumber: rewardRedemptions.redemptionNumber,
        employeeId: rewardRedemptions.employeeId,
        employeeName: employees.name,
        employeeSn: employees.employeeSn,
        rewardItemId: rewardRedemptions.rewardItemId,
        rewardItemName: rewardItems.name,
        rewardItemImage: rewardItems.imageUrl,
        siteId: rewardRedemptions.siteId,
        siteName: sites.name,
        pointsSpent: rewardRedemptions.pointsSpent,
        status: rewardRedemptions.status,
        requestNote: rewardRedemptions.requestNote,
        approvedByEmployeeId: rewardRedemptions.approvedByEmployeeId,
        approvalNotes: rewardRedemptions.approvalNotes,
        deliveryStatus: rewardRedemptions.deliveryStatus,
        trackingOrReceiptInfo: rewardRedemptions.trackingOrReceiptInfo,
        isYearEndClaim: rewardRedemptions.isYearEndClaim,
        createdAt: rewardRedemptions.createdAt,
      })
      .from(rewardRedemptions)
      .innerJoin(rewardItems, eq(rewardRedemptions.rewardItemId, rewardItems.id))
      .innerJoin(employees, eq(rewardRedemptions.employeeId, employees.id))
      .leftJoin(sites, eq(rewardRedemptions.siteId, sites.id))
      .where(eq(rewardRedemptions.employeeId, currentEmployee.id))
      .orderBy(desc(rewardRedemptions.createdAt))

    myRedemptions = redemptions.map((r) => ({
      ...r,
      rewardItemImage: resolveUploadUrl(r.rewardItemImage) || "",
      createdAt: r.createdAt.toISOString(),
    }))
  }

  // Format catalog items and check eligibility conditions
  const catalog: RewardItemData[] = items.map((item) => {
    const siteIds = Array.isArray(item.eligibleSiteIds) ? (item.eligibleSiteIds as number[]) : []
    const deptIds = Array.isArray(item.eligibleDepartmentIds) ? (item.eligibleDepartmentIds as number[]) : []
    const secIds = Array.isArray(item.eligibleSectionIds) ? (item.eligibleSectionIds as number[]) : []

    let isEligible = true
    let ineligibilityReason = ""

    if (currentEmployee) {
      if (siteIds.length > 0 && (!currentEmployee.siteId || !siteIds.includes(currentEmployee.siteId))) {
        isEligible = false
        ineligibilityReason = "Hanya untuk site tertentu"
      } else if (deptIds.length > 0 && (!currentEmployee.departmentId || !deptIds.includes(currentEmployee.departmentId))) {
        isEligible = false
        ineligibilityReason = "Hanya untuk departemen tertentu"
      } else if (secIds.length > 0 && (!currentEmployee.sectionId || !secIds.includes(currentEmployee.sectionId))) {
        isEligible = false
        ineligibilityReason = "Hanya untuk divisi/section tertentu"
      }
    }

    return {
      ...item,
      eligibleSiteIds: siteIds,
      eligibleDepartmentIds: deptIds,
      eligibleSectionIds: secIds,
      isEligible,
      ineligibilityReason,
      imageUrl: resolveUploadUrl(item.imageUrl) || "",
    }
  })

  return {
    currentEmployee,
    catalog,
    myRedemptions,
  }
}

/**
 * Get all redemptions for Admin management
 */
export async function getAdminRedemptionsList() {
  const redemptions = await db
    .select({
      id: rewardRedemptions.id,
      redemptionNumber: rewardRedemptions.redemptionNumber,
      employeeId: rewardRedemptions.employeeId,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      rewardItemId: rewardRedemptions.rewardItemId,
      rewardItemName: rewardItems.name,
      rewardItemImage: rewardItems.imageUrl,
      siteId: rewardRedemptions.siteId,
      siteName: sites.name,
      pointsSpent: rewardRedemptions.pointsSpent,
      status: rewardRedemptions.status,
      requestNote: rewardRedemptions.requestNote,
      approvedByEmployeeId: rewardRedemptions.approvedByEmployeeId,
      approvalNotes: rewardRedemptions.approvalNotes,
      deliveryStatus: rewardRedemptions.deliveryStatus,
      trackingOrReceiptInfo: rewardRedemptions.trackingOrReceiptInfo,
      isYearEndClaim: rewardRedemptions.isYearEndClaim,
      createdAt: rewardRedemptions.createdAt,
    })
    .from(rewardRedemptions)
    .innerJoin(rewardItems, eq(rewardRedemptions.rewardItemId, rewardItems.id))
    .innerJoin(employees, eq(rewardRedemptions.employeeId, employees.id))
    .leftJoin(sites, eq(rewardRedemptions.siteId, sites.id))
    .orderBy(desc(rewardRedemptions.createdAt))
    .limit(100)

  return redemptions.map((r) => ({
    ...r,
    rewardItemImage: resolveUploadUrl(r.rewardItemImage) || "",
    createdAt: r.createdAt.toISOString(),
  }))
}

/**
 * Employee submits a redemption request
 */
export async function submitRewardRedemptionAction(
  rewardItemId: number,
  requestNote: string = ""
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return { success: false, error: "Harap masuk/login terlebih dahulu." }
    }

    const normalizedEmail = session.user.email.toLowerCase().trim()
    const [emp] = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        totalPoints: employees.totalPoints,
        siteId: employees.siteId,
        departmentId: employees.departmentId,
        sectionId: employees.sectionId,
      })
      .from(employees)
      .where(sql`lower(${employees.email}) = ${normalizedEmail}`)
      .limit(1)

    if (!emp) {
      return { success: false, error: "Data karyawan tidak ditemukan." }
    }

    const [item] = await db
      .select()
      .from(rewardItems)
      .where(and(eq(rewardItems.id, rewardItemId), eq(rewardItems.isActive, true)))
      .limit(1)

    if (!item) {
      return { success: false, error: "Item hadiah tidak ditemukan atau non-aktif." }
    }

    // Eligibility condition checks
    const siteIds = Array.isArray(item.eligibleSiteIds) ? (item.eligibleSiteIds as number[]) : []
    const deptIds = Array.isArray(item.eligibleDepartmentIds) ? (item.eligibleDepartmentIds as number[]) : []
    const secIds = Array.isArray(item.eligibleSectionIds) ? (item.eligibleSectionIds as number[]) : []

    if (siteIds.length > 0 && (!emp.siteId || !siteIds.includes(emp.siteId))) {
      return { success: false, error: "Hadiah ini khusus untuk site tertentu." }
    }
    if (deptIds.length > 0 && (!emp.departmentId || !deptIds.includes(emp.departmentId))) {
      return { success: false, error: "Hadiah ini khusus untuk departemen tertentu." }
    }
    if (secIds.length > 0 && (!emp.sectionId || !secIds.includes(emp.sectionId))) {
      return { success: false, error: "Hadiah ini khusus untuk divisi/section tertentu." }
    }

    if (item.stockQuantity <= 0) {
      return { success: false, error: "Stok hadiah ini sedang habis." }
    }

    if (emp.totalPoints < item.pointsRequired) {
      return {
        success: false,
        error: `Poin tidak mencukupi. Anda memiliki ${emp.totalPoints} poin, butuh ${item.pointsRequired} poin.`,
      }
    }

    // Generate unique code RDM-YYYYMM-XXXX
    const now = new Date()
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const redemptionNumber = `RDM-${yearMonth}-${randomSuffix}`

    // Database transaction: deduct points, reduce stock, insert redemption & point event
    await db.transaction(async (tx) => {
      // 1. Insert redemption
      const [insertedRedemption] = await tx
        .insert(rewardRedemptions)
        .values({
          redemptionNumber,
          employeeId: emp.id,
          rewardItemId: item.id,
          siteId: emp.siteId,
          pointsSpent: item.pointsRequired,
          status: "pending",
          requestNote,
          isYearEndClaim: item.isYearEndBazaar,
        })
        .returning()

      // 2. Reduce stock
      await tx
        .update(rewardItems)
        .set({
          stockQuantity: sql`${rewardItems.stockQuantity} - 1`,
          updatedAt: new Date(),
        })
        .where(eq(rewardItems.id, item.id))

      // 3. Deduct employee total points
      const newBalance = emp.totalPoints - item.pointsRequired
      await tx
        .update(employees)
        .set({
          totalPoints: newBalance,
        })
        .where(eq(employees.id, emp.id))

      // 4. Log point event
      await tx.insert(pointEvents).values({
        employeeId: emp.id,
        transactionType: "redeem",
        sourceType: "reward_store",
        sourceId: insertedRedemption.id,
        category: "Reward Store",
        label: `Tukar Hadiah: ${item.name} (${redemptionNumber})`,
        points: -item.pointsRequired,
        balanceAfter: newBalance,
        metadata: JSON.stringify({
          rewardItemId: item.id,
          redemptionNumber,
          isYearEndClaim: item.isYearEndBazaar,
        }),
      })
    })

    // Async trigger notifications to user & HC Admin
    try {
      await notifyWorkflowBellRecipients({
        recipientEmails: [emp.email],
        eventType: "reward_redemption_submitted",
        category: "points_updates",
        title: "Pengajuan Tukar Hadiah Diproses",
        body: `Klaim hadiah ${item.name} (${redemptionNumber}) sedang menunggu verifikasi tim Human Capital.`,
        url: "/dashboard/leaderboard?tab=reward-store",
      })
    } catch (notifErr) {
      console.warn("Notification trigger failed:", notifErr)
    }

    revalidatePath("/dashboard/leaderboard")
    revalidatePath("/mobile/profile")
    return {
      success: true,
      message: `Permintaan penukaran ${item.name} berhasil diajukan (${redemptionNumber})! Poin Anda telah dipotong sementara menunggu konfirmasi HC.`,
    }
  } catch (error: any) {
    console.error("Redemption error:", error)
    return { success: false, error: error.message || "Gagal mengajukan penukaran hadiah." }
  }
}

/**
 * Admin approves or rejects redemption
 */
export async function adminReviewRedemptionAction(
  redemptionId: number,
  newStatus: "approved" | "rejected",
  approvalNotes: string = ""
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return { success: false, error: "Unauthorized" }
    }

    const [adminEmp] = await db
      .select({ id: employees.id, name: employees.name, role: employees.role })
      .from(employees)
      .where(sql`lower(${employees.email}) = ${session.user.email.toLowerCase().trim()}`)
      .limit(1)

    const [redemption] = await db
      .select()
      .from(rewardRedemptions)
      .where(eq(rewardRedemptions.id, redemptionId))
      .limit(1)

    if (!redemption) {
      return { success: false, error: "Data klaim penukaran tidak ditemukan." }
    }

    if (redemption.status !== "pending") {
      return { success: false, error: `Klaim sudah diproses sebelumnya (${redemption.status}).` }
    }

    await db.transaction(async (tx) => {
      // Update redemption
      await tx
        .update(rewardRedemptions)
        .set({
          status: newStatus,
          approvedByEmployeeId: adminEmp?.id ?? null,
          approvalNotes,
          updatedAt: new Date(),
        })
        .where(eq(rewardRedemptions.id, redemptionId))

      // If rejected, refund points & restore item stock!
      if (newStatus === "rejected") {
        // 1. Restore item stock
        await tx
          .update(rewardItems)
          .set({
            stockQuantity: sql`${rewardItems.stockQuantity} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(rewardItems.id, redemption.rewardItemId))

        // 2. Refund points to employee
        const [emp] = await tx
          .select({ totalPoints: employees.totalPoints })
          .from(employees)
          .where(eq(employees.id, redemption.employeeId))

        const refundBalance = (emp?.totalPoints ?? 0) + redemption.pointsSpent

        await tx
          .update(employees)
          .set({
            totalPoints: refundBalance,
          })
          .where(eq(employees.id, redemption.employeeId))

        // 3. Log refund point event
        await tx.insert(pointEvents).values({
          employeeId: redemption.employeeId,
          transactionType: "refund",
          sourceType: "reward_store",
          sourceId: redemption.id,
          category: "Reward Store",
          label: `Refund Poin (Ditolak): ${redemption.redemptionNumber}`,
          points: redemption.pointsSpent,
          balanceAfter: refundBalance,
          metadata: JSON.stringify({
            reason: approvalNotes,
            redemptionNumber: redemption.redemptionNumber,
          }),
        })
      }
    })

    // Async notification trigger
    try {
      const [empUser] = await db
        .select({ email: employees.email, name: employees.name })
        .from(employees)
        .where(eq(employees.id, redemption.employeeId))
        .limit(1)

      if (empUser?.email) {
        const isApproved = newStatus === "approved"
        await notifyWorkflowBellRecipients({
          recipientEmails: [empUser.email],
          eventType: isApproved ? "reward_redemption_approved" : "reward_redemption_rejected",
          category: "approval_requests",
          title: isApproved ? "Klaim Hadiah Disetujui!" : "Klaim Hadiah Ditolak",
          body: isApproved
            ? `Selamat! Klaim #${redemption.redemptionNumber} telah disetujui. Hadiah sedang dipersiapkan untuk dikirim ke site.`
            : `Klaim #${redemption.redemptionNumber} tidak disetujui. Sebanyak ${redemption.pointsSpent} poin telah dikembalikan ke akun Anda.`,
          url: "/dashboard/leaderboard?tab=reward-store",
        })

        // Also send email notification
        await sendWorkflowEmail({
          to: empUser.email,
          fallbackSubject: isApproved
            ? `[HERO] Klaim Hadiah #${redemption.redemptionNumber} Telah Disetujui`
            : `[HERO] Update Status Klaim Hadiah #${redemption.redemptionNumber}`,
          fallbackText: isApproved
            ? `Halo ${empUser.name},\n\nKlaim hadiah Anda #${redemption.redemptionNumber} telah disetujui oleh HC.\nSilakan pantau status logistik di aplikasi.`
            : `Halo ${empUser.name},\n\nKlaim hadiah #${redemption.redemptionNumber} ditolak dengan catatan: ${approvalNotes}.\nPoin sebanyak ${redemption.pointsSpent} telah dikembalikan penuh ke saldo Anda.`,
        })
      }
    } catch (notifErr) {
      console.warn("Notification error:", notifErr)
    }

    revalidatePath("/dashboard/leaderboard")
    revalidatePath("/mobile/profile")
    return {
      success: true,
      message: `Klaim penukaran berhasil di-${newStatus === "approved" ? "setujui" : "tolak (poin dikembalikan)"}.`,
    }
  } catch (error: any) {
    console.error("Admin review error:", error)
    return { success: false, error: error.message || "Gagal memproses klaim penukaran." }
  }
}

/**
 * Admin updates delivery status (shipped to site, ready at site, received)
 */
export async function adminUpdateDeliveryStatusAction(
  redemptionId: number,
  deliveryStatus: "pending" | "shipped_to_site" | "ready_at_site" | "received",
  trackingInfo: string = ""
) {
  try {
    const [redemption] = await db
      .select({
        id: rewardRedemptions.id,
        redemptionNumber: rewardRedemptions.redemptionNumber,
        employeeId: rewardRedemptions.employeeId,
      })
      .from(rewardRedemptions)
      .where(eq(rewardRedemptions.id, redemptionId))
      .limit(1)

    await db
      .update(rewardRedemptions)
      .set({
        deliveryStatus,
        trackingOrReceiptInfo: trackingInfo,
        status: deliveryStatus === "received" ? "delivered" : undefined,
        updatedAt: new Date(),
      })
      .where(eq(rewardRedemptions.id, redemptionId))

    // Notification on shipping update
    if (redemption) {
      try {
        const [empUser] = await db
          .select({ email: employees.email, name: employees.name })
          .from(employees)
          .where(eq(employees.id, redemption.employeeId))
          .limit(1)

        if (empUser?.email) {
          const statusLabels: Record<string, string> = {
            shipped_to_site: "Sedang dikirim dalam perjalanan ke Site",
            ready_at_site: "Sudah tiba di Site dan siap diambil",
            received: "Telah diterima secara lengkap",
          }
          const label = statusLabels[deliveryStatus] || deliveryStatus

          await notifyWorkflowBellRecipients({
            recipientEmails: [empUser.email],
            eventType: "reward_delivery_updated",
            category: "info",
            title: "Update Logistik Hadiah HERO",
            body: `Status pengiriman hadiah #${redemption.redemptionNumber}: ${label}.`,
            url: "/dashboard/leaderboard?tab=reward-store",
          })
        }
      } catch (err) {
        console.warn("Delivery notif error:", err)
      }
    }

    revalidatePath("/dashboard/leaderboard")
    revalidatePath("/mobile/profile")
    return { success: true, message: "Status logistik & pengiriman hadiah berhasil diperbarui." }
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal memperbarui status pengiriman." }
  }
}

/**
 * Admin adds or edits reward catalog item
 */
export async function adminSaveRewardItemAction(payload: {
  id?: number
  code: string
  name: string
  description?: string
  category?: string
  imageUrl?: string
  pointsRequired: number
  stockQuantity: number
  tierEligibility?: string
  eligibleSiteIds?: number[]
  eligibleDepartmentIds?: number[]
  eligibleSectionIds?: number[]
  isYearEndBazaar?: boolean
  isActive?: boolean
  sortOrder?: number
}) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const [adminEmp] = await db
      .select({ accessRole: employees.accessRole })
      .from(employees)
      .where(eq(employees.authUserId, session.user.id))
      .limit(1)

    if (adminEmp?.accessRole !== "Super Admin") {
      return { success: false, error: "Aksi ini hanya dapat dilakukan oleh Super Admin di Desktop." }
    }

    const eligibleSiteIds = Array.isArray(payload.eligibleSiteIds) ? payload.eligibleSiteIds : []
    const eligibleDepartmentIds = Array.isArray(payload.eligibleDepartmentIds) ? payload.eligibleDepartmentIds : []
    const eligibleSectionIds = Array.isArray(payload.eligibleSectionIds) ? payload.eligibleSectionIds : []

    if (payload.id) {
      await db
        .update(rewardItems)
        .set({
          code: payload.code,
          name: payload.name,
          description: payload.description || "",
          category: payload.category || "merchandise",
          imageUrl: payload.imageUrl || "",
          pointsRequired: payload.pointsRequired,
          stockQuantity: payload.stockQuantity,
          tierEligibility: payload.tierEligibility || "all",
          eligibleSiteIds,
          eligibleDepartmentIds,
          eligibleSectionIds,
          isYearEndBazaar: payload.isYearEndBazaar ?? false,
          isActive: payload.isActive ?? true,
          sortOrder: payload.sortOrder || 0,
          updatedAt: new Date(),
        })
        .where(eq(rewardItems.id, payload.id))
    } else {
      await db.insert(rewardItems).values({
        code: payload.code,
        name: payload.name,
        description: payload.description || "",
        category: payload.category || "merchandise",
        imageUrl: payload.imageUrl || "",
        pointsRequired: payload.pointsRequired,
        stockQuantity: payload.stockQuantity,
        tierEligibility: payload.tierEligibility || "all",
        eligibleSiteIds,
        eligibleDepartmentIds,
        eligibleSectionIds,
        isYearEndBazaar: payload.isYearEndBazaar ?? false,
        isActive: payload.isActive ?? true,
        sortOrder: payload.sortOrder || 0,
      })
    }

    revalidatePath("/dashboard/leaderboard")
    revalidatePath("/dashboard/reward-store")
    revalidatePath("/mobile/reward-store")
    revalidatePath("/mobile/profile")
    return { success: true, message: "Katalog hadiah berhasil disimpan!" }
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menyimpan item hadiah." }
  }
}

/**
 * Super Admin deletes reward catalog item
 */
export async function adminDeleteRewardItemAction(itemId: number) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const [adminEmp] = await db
      .select({ accessRole: employees.accessRole })
      .from(employees)
      .where(eq(employees.authUserId, session.user.id))
      .limit(1)

    if (adminEmp?.accessRole !== "Super Admin") {
      return { success: false, error: "Aksi ini hanya dapat dilakukan oleh Super Admin di Desktop." }
    }

    // Check if item has been redeemed
    const [existingRedemption] = await db
      .select({ id: rewardRedemptions.id })
      .from(rewardRedemptions)
      .where(eq(rewardRedemptions.rewardItemId, itemId))
      .limit(1)

    if (existingRedemption) {
      // Soft-delete if already has redemption transactions
      await db
        .update(rewardItems)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(rewardItems.id, itemId))
    } else {
      // Physical delete
      await db.delete(rewardItems).where(eq(rewardItems.id, itemId))
    }

    revalidatePath("/dashboard/leaderboard")
    revalidatePath("/dashboard/reward-store")
    revalidatePath("/mobile/reward-store")
    revalidatePath("/mobile/profile")
    return { success: true, message: "Item hadiah berhasil dihapus!" }
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menghapus item hadiah." }
  }
}
