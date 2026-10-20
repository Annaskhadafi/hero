"use server"

import { db } from "@/db"
import { userPinnedServices } from "@/db/schema"
import { eq } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-session"
import { revalidatePath } from "next/cache"
import { DEFAULT_PINNED_TITLES } from "@/lib/pinned-services"

export async function getUserPinnedServices(userEmail?: string): Promise<string[] | null> {
  try {
    let email = userEmail
    if (!email) {
      const session = await getServerSession()
      email = session?.user?.email || undefined
    }

    if (!email) {
      return null
    }

    const rows = await db
      .select({
        pinnedTitles: userPinnedServices.pinnedTitles,
      })
      .from(userPinnedServices)
      .where(eq(userPinnedServices.userEmail, email))
      .limit(1)

    if (rows.length > 0 && Array.isArray(rows[0].pinnedTitles)) {
      return rows[0].pinnedTitles
    }

    return null
  } catch (error) {
    console.error("[getUserPinnedServices] error:", error)
    return null
  }
}

export async function saveUserPinnedServices(
  pinnedTitles: string[]
): Promise<{ success: boolean; data?: string[]; error?: string }> {
  try {
    const session = await getServerSession()
    const email = session?.user?.email

    if (!email) {
      return { success: false, error: "Unauthorized" }
    }

    // Clean array of unique titles
    const uniqueTitles = Array.from(new Set(pinnedTitles.filter(Boolean)))

    await db
      .insert(userPinnedServices)
      .values({
        userEmail: email,
        pinnedTitles: uniqueTitles,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPinnedServices.userEmail,
        set: {
          pinnedTitles: uniqueTitles,
          updatedAt: new Date(),
        },
      })

    revalidatePath("/mobile/dashboard")
    return { success: true, data: uniqueTitles }
  } catch (error) {
    console.error("[saveUserPinnedServices] error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan pin menu",
    }
  }
}

export async function toggleUserPinnedService(
  title: string
): Promise<{ success: boolean; isPinned?: boolean; data?: string[]; error?: string }> {
  try {
    const session = await getServerSession()
    const email = session?.user?.email

    if (!email) {
      return { success: false, error: "Unauthorized" }
    }

    const currentPins = (await getUserPinnedServices(email)) ?? DEFAULT_PINNED_TITLES

    const isAlreadyPinned = currentPins.some(
      (t) => t.toLowerCase() === title.toLowerCase()
    )

    let nextPins: string[]
    if (isAlreadyPinned) {
      nextPins = currentPins.filter((t) => t.toLowerCase() !== title.toLowerCase())
    } else {
      nextPins = [...currentPins, title]
    }

    const saveRes = await saveUserPinnedServices(nextPins)
    if (!saveRes.success) {
      return { success: false, error: saveRes.error }
    }

    return {
      success: true,
      isPinned: !isAlreadyPinned,
      data: nextPins,
    }
  } catch (error) {
    console.error("[toggleUserPinnedService] error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengubah pin menu",
    }
  }
}

export async function resetUserPinnedServices(): Promise<{
  success: boolean;
  data?: string[];
  error?: string;
}> {
  try {
    const session = await getServerSession()
    const email = session?.user?.email

    if (!email) {
      return { success: false, error: "Unauthorized" }
    }

    await db
      .delete(userPinnedServices)
      .where(eq(userPinnedServices.userEmail, email))

    revalidatePath("/mobile/dashboard")
    return { success: true, data: DEFAULT_PINNED_TITLES }
  } catch (error) {
    console.error("[resetUserPinnedServices] error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mereset pin menu",
    }
  }
}
