"use server"

import { db } from "@/db"
import {
  employees,
  pointEvents,
  penaltyEvents,
  badges,
  employeeBadges,
  streakRecords,
} from "@/db/schema/hero"
import { eq, desc } from "drizzle-orm"
import {
  managePointEventAction,
  createPenaltyEvent,
  resolveDisputeAction,
  type AdminMutationState,
} from "@/app/dashboard/admin-actions"

export type EmployeeGamificationDetail = {
  employee: {
    id: number
    name: string
    employeeSn: string | null
    role: string
    department: string | null
    levelName: string | null
    totalPoints: number
    jobTitle: string | null
  }
  badges: Array<{
    badgeId: number
    name: string
    description: string
    iconUrl: string
    colorCode: string
    awardedAt: Date
  }>
  pointHistory: Array<{
    id: number
    category: string
    label: string
    points: number
    sourceType: string
    createdAt: Date
  }>
  penaltyHistory: Array<{
    id: number
    penaltyCode: string
    description: string
    pointsDeducted: number
    isDisputed: boolean
    disputeStatus: string
    createdAt: Date
  }>
  streak: {
    currentStreakDays: number
    longestStreakDays: number
    lastActivityDate: Date | null
    streakBonusActive: boolean
  } | null
}

export async function getEmployeeGamificationDetail(
  employeeId: number
): Promise<{ success: boolean; data?: EmployeeGamificationDetail; error?: string }> {
  try {
    const [emp] = await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        role: employees.role,
        department: employees.department,
        levelName: employees.levelName,
        totalPoints: employees.totalPoints,
        jobTitle: employees.jobTitle,
      })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1)

    if (!emp) {
      return { success: false, error: "Karyawan tidak ditemukan" }
    }

    const [empBadges, points, penalties, [streak]] = await Promise.all([
      db
        .select({
          badgeId: badges.id,
          name: badges.name,
          description: badges.description,
          iconUrl: badges.iconUrl,
          colorCode: badges.colorCode,
          awardedAt: employeeBadges.awardedAt,
        })
        .from(employeeBadges)
        .innerJoin(badges, eq(employeeBadges.badgeId, badges.id))
        .where(eq(employeeBadges.employeeId, employeeId))
        .orderBy(desc(employeeBadges.awardedAt)),

      db
        .select({
          id: pointEvents.id,
          category: pointEvents.category,
          label: pointEvents.label,
          points: pointEvents.points,
          sourceType: pointEvents.sourceType,
          createdAt: pointEvents.createdAt,
        })
        .from(pointEvents)
        .where(eq(pointEvents.employeeId, employeeId))
        .orderBy(desc(pointEvents.createdAt))
        .limit(30),

      db
        .select({
          id: penaltyEvents.id,
          penaltyCode: penaltyEvents.penaltyCode,
          description: penaltyEvents.description,
          pointsDeducted: penaltyEvents.pointsDeducted,
          isDisputed: penaltyEvents.isDisputed,
          disputeStatus: penaltyEvents.disputeStatus,
          createdAt: penaltyEvents.createdAt,
        })
        .from(penaltyEvents)
        .where(eq(penaltyEvents.employeeId, employeeId))
        .orderBy(desc(penaltyEvents.createdAt))
        .limit(30),

      db
        .select({
          currentStreakDays: streakRecords.currentStreakDays,
          longestStreakDays: streakRecords.longestStreakDays,
          lastActivityDate: streakRecords.lastActivityDate,
          streakBonusActive: streakRecords.streakBonusActive,
        })
        .from(streakRecords)
        .where(eq(streakRecords.employeeId, employeeId))
        .limit(1),
    ])

    return {
      success: true,
      data: {
        employee: emp,
        badges: empBadges,
        pointHistory: points,
        penaltyHistory: penalties,
        streak: streak || null,
      },
    }
  } catch (err) {
    console.error("Error in getEmployeeGamificationDetail:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memuat detail karyawan",
    }
  }
}

export async function resolveDispute(formData: FormData): Promise<AdminMutationState> {
  return resolveDisputeAction({ status: "idle", message: "" }, formData)
}

export { managePointEventAction, createPenaltyEvent, resolveDisputeAction }
