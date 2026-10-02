'use server'

import { db } from '@/db'
import {
  emailDeliveryLogs,
  emailSmtpSettings,
  employees,
  hcContractReviewSettings,
  hcContractReviewTestAttempts,
  hcContractReviewTestConfigs,
  hcContractReviewTestQuestions,
  hcEmployeeContractReviews,
  masterSections,
  notificationEvents,
  notificationDeliveries,
} from '@/db/schema/hero'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { headers } from 'next/headers'
import { getServerSession } from '@/lib/auth-session'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'
import { sendPushNotification } from '@/lib/push-notifications'
import { logEmailDeliveryRecord, sendEmailViaSmtp, type EmailTransportSettings } from '@/lib/email-delivery'
import { resolveWorkflowTemplateContent } from '@/lib/workflow-email'
import { getContractReviewSettings, autoAdvanceDraftReviewIfReady } from './contract-review'

async function getBaseUrl(): Promise<string> {
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) {
    try {
      const headersList = await headers()
      const host = headersList.get('host')
      const protocol = headersList.get('x-forwarded-proto') || 'http'
      if (host) {
        baseUrl = `${protocol}://${host}`
      }
    } catch {
      // outside request context fallback
    }
  }
  return baseUrl || 'http://localhost:3000'
}

async function getSmtpSettings(): Promise<EmailTransportSettings | null> {
  const [settings] = await db
    .select()
    .from(emailSmtpSettings)
    .where(eq(emailSmtpSettings.isActive, true))
    .orderBy(desc(emailSmtpSettings.updatedAt))
    .limit(1)
  if (!settings) return null
  return {
    host: settings.host,
    port: settings.port,
    encryption: settings.encryption,
    username: settings.username,
    passwordSecret: settings.passwordSecret,
    fromEmail: settings.fromEmail,
    fromName: settings.fromName,
    replyToEmail: settings.replyToEmail,
    timeoutSeconds: settings.timeoutSeconds,
  }
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path)
  } catch {
    // Ignore error outside Next.js request context
  }
}

// ─── Test Configs Management (Training Center) ─────────────────────────

export async function getContractReviewTestConfigs() {
  const configs = await db
    .select({
      id: hcContractReviewTestConfigs.id,
      sectionId: hcContractReviewTestConfigs.sectionId,
      sectionName: hcContractReviewTestConfigs.sectionName,
      targetSectionIds: hcContractReviewTestConfigs.targetSectionIds,
      targetSectionNames: hcContractReviewTestConfigs.targetSectionNames,
      reviewType: hcContractReviewTestConfigs.reviewType,
      title: hcContractReviewTestConfigs.title,
      description: hcContractReviewTestConfigs.description,
      durationMinutes: hcContractReviewTestConfigs.durationMinutes,
      hasPassingGrade: hcContractReviewTestConfigs.hasPassingGrade,
      passingGrade: hcContractReviewTestConfigs.passingGrade,
      maxRemedialAttempts: hcContractReviewTestConfigs.maxRemedialAttempts,
      isActive: hcContractReviewTestConfigs.isActive,
      createdAt: hcContractReviewTestConfigs.createdAt,
      updatedAt: hcContractReviewTestConfigs.updatedAt,
      questionCount: sql<number>`(SELECT count(*)::int FROM hero_hc_contract_review_test_questions q WHERE q.config_id = hero_hc_contract_review_test_configs.id)`,
    })
    .from(hcContractReviewTestConfigs)
    .orderBy(desc(hcContractReviewTestConfigs.createdAt))

  const sections = await db
    .select({
      id: masterSections.id,
      name: masterSections.name,
    })
    .from(masterSections)
    .orderBy(masterSections.name)

  return { configs, sections }
}

export async function getContractReviewTestConfigById(id: number) {
  const [config] = await db
    .select()
    .from(hcContractReviewTestConfigs)
    .where(eq(hcContractReviewTestConfigs.id, id))
    .limit(1)

  if (!config) return null

  const questions = await db
    .select()
    .from(hcContractReviewTestQuestions)
    .where(eq(hcContractReviewTestQuestions.configId, id))
    .orderBy(hcContractReviewTestQuestions.sortOrder, hcContractReviewTestQuestions.id)

  return { ...config, questions }
}

export async function upsertContractReviewTestConfig(data: {
  id?: number
  sectionId?: number | null
  sectionName?: string
  targetSectionIds?: number[]
  targetSectionNames?: string[]
  reviewType: string
  title: string
  description?: string
  durationMinutes: number
  hasPassingGrade: boolean
  passingGrade: number
  maxRemedialAttempts: number
  isActive: boolean
}) {
  const session = await getServerSession()
  if (!session?.user) {
    throw new Error('Anda harus login terlebih dahulu.')
  }

  const targetIds = Array.isArray(data.targetSectionIds) ? data.targetSectionIds : []
  let targetNames = Array.isArray(data.targetSectionNames) ? data.targetSectionNames : []

  // Resolve section names if missing but IDs provided
  if (targetIds.length > 0 && targetNames.length !== targetIds.length) {
    const matchedSections = await db
      .select({ id: masterSections.id, name: masterSections.name })
      .from(masterSections)
      .where(inArray(masterSections.id, targetIds))
    const nameMap = new Map(matchedSections.map((s) => [s.id, s.name]))
    targetNames = targetIds.map((id) => nameMap.get(id) || '').filter(Boolean)
  }

  const primarySectionId = targetIds.length > 0 ? targetIds[0] : (data.sectionId ?? null)
  const primarySectionName = targetNames.length > 0 ? targetNames[0] : (data.sectionName || '')

  if (data.id) {
    const [updated] = await db
      .update(hcContractReviewTestConfigs)
      .set({
        sectionId: primarySectionId,
        sectionName: primarySectionName,
        targetSectionIds: targetIds,
        targetSectionNames: targetNames,
        reviewType: data.reviewType || 'all',
        title: data.title,
        description: data.description || '',
        durationMinutes: data.durationMinutes || 30,
        hasPassingGrade: data.hasPassingGrade,
        passingGrade: data.passingGrade ?? 75,
        maxRemedialAttempts: data.maxRemedialAttempts ?? 1,
        isActive: data.isActive,
        updatedAt: new Date(),
      })
      .where(eq(hcContractReviewTestConfigs.id, data.id))
      .returning()

    if (data.isActive === false) {
      await db
        .update(hcEmployeeContractReviews)
        .set({
          testRequired: false,
          testStatus: 'none',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(hcEmployeeContractReviews.testConfigId, data.id),
            inArray(hcEmployeeContractReviews.testStatus, ['none', 'pending', 'in_progress'])
          )
        )

      const draftReviews = await db
        .select({ id: hcEmployeeContractReviews.id })
        .from(hcEmployeeContractReviews)
        .where(
          and(
            eq(hcEmployeeContractReviews.status, 'draft'),
            isNotNull(hcEmployeeContractReviews.leaderSignatureDataUrl),
            ne(hcEmployeeContractReviews.leaderSignatureDataUrl, '')
          )
        )

      for (const dr of draftReviews) {
        await autoAdvanceDraftReviewIfReady(dr.id)
      }

      safeRevalidatePath('/dashboard/hc/contract-review')
    }

    safeRevalidatePath('/dashboard/chitralearning-lms/contract-tests')
    return updated
  }

  const [created] = await db
    .insert(hcContractReviewTestConfigs)
    .values({
      sectionId: primarySectionId,
      sectionName: primarySectionName,
      targetSectionIds: targetIds,
      targetSectionNames: targetNames,
      reviewType: data.reviewType || 'all',
      title: data.title,
      description: data.description || '',
      durationMinutes: data.durationMinutes || 30,
      hasPassingGrade: data.hasPassingGrade,
      passingGrade: data.passingGrade ?? 75,
      maxRemedialAttempts: data.maxRemedialAttempts ?? 1,
      isActive: data.isActive,
    })
    .returning()

  safeRevalidatePath('/dashboard/chitralearning-lms/contract-tests')
  return created
}

export async function deleteContractReviewTestConfig(id: number) {
  const session = await getServerSession()
  if (!session?.user) throw new Error('Unauthorized')

  await db
    .update(hcEmployeeContractReviews)
    .set({
      testRequired: false,
      testConfigId: null,
      testStatus: 'none',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hcEmployeeContractReviews.testConfigId, id),
        inArray(hcEmployeeContractReviews.testStatus, ['none', 'pending', 'in_progress'])
      )
    )

  const draftReviews = await db
    .select({ id: hcEmployeeContractReviews.id })
    .from(hcEmployeeContractReviews)
    .where(
      and(
        eq(hcEmployeeContractReviews.status, 'draft'),
        isNotNull(hcEmployeeContractReviews.leaderSignatureDataUrl),
        ne(hcEmployeeContractReviews.leaderSignatureDataUrl, '')
      )
    )

  for (const dr of draftReviews) {
    await autoAdvanceDraftReviewIfReady(dr.id)
  }

  await db.delete(hcContractReviewTestConfigs).where(eq(hcContractReviewTestConfigs.id, id))
  safeRevalidatePath('/dashboard/chitralearning-lms/contract-tests')
  safeRevalidatePath('/dashboard/hc/contract-review')
  return { success: true }
}

// ─── Question Bank Actions ─────────────────────────────────────────────

export async function saveContractReviewTestQuestion(data: {
  id?: number
  configId: number
  questionText: string
  questionImageUrl?: string
  optionA: string
  optionAImageUrl?: string
  optionB: string
  optionBImageUrl?: string
  optionC?: string
  optionCImageUrl?: string
  optionD?: string
  optionDImageUrl?: string
  correctOption: string
  explanation?: string
  points?: number
  sortOrder?: number
}) {
  const session = await getServerSession()
  if (!session?.user) throw new Error('Unauthorized')

  if (data.id) {
    const [updated] = await db
      .update(hcContractReviewTestQuestions)
      .set({
        questionText: data.questionText,
        questionImageUrl: data.questionImageUrl || '',
        optionA: data.optionA,
        optionAImageUrl: data.optionAImageUrl || '',
        optionB: data.optionB,
        optionBImageUrl: data.optionBImageUrl || '',
        optionC: data.optionC || '',
        optionCImageUrl: data.optionCImageUrl || '',
        optionD: data.optionD || '',
        optionDImageUrl: data.optionDImageUrl || '',
        correctOption: data.correctOption || 'A',
        explanation: data.explanation || '',
        points: data.points ?? 1,
        sortOrder: data.sortOrder ?? 1,
        updatedAt: new Date(),
      })
      .where(eq(hcContractReviewTestQuestions.id, data.id))
      .returning()
    revalidatePath(`/dashboard/chitralearning-lms/contract-tests/${data.configId}`)
    return updated
  }

  const [created] = await db
    .insert(hcContractReviewTestQuestions)
    .values({
      configId: data.configId,
      questionText: data.questionText,
      questionImageUrl: data.questionImageUrl || '',
      optionA: data.optionA,
      optionAImageUrl: data.optionAImageUrl || '',
      optionB: data.optionB,
      optionBImageUrl: data.optionBImageUrl || '',
      optionC: data.optionC || '',
      optionCImageUrl: data.optionCImageUrl || '',
      optionD: data.optionD || '',
      optionDImageUrl: data.optionDImageUrl || '',
      correctOption: data.correctOption || 'A',
      explanation: data.explanation || '',
      points: data.points ?? 1,
      sortOrder: data.sortOrder ?? 1,
    })
    .returning()

  safeRevalidatePath(`/dashboard/chitralearning-lms/contract-tests/${data.configId}`)
  return created
}

export async function deleteContractReviewTestQuestion(questionId: number, configId: number) {
  const session = await getServerSession()
  if (!session?.user) throw new Error('Unauthorized')

  await db.delete(hcContractReviewTestQuestions).where(eq(hcContractReviewTestQuestions.id, questionId))
  safeRevalidatePath(`/dashboard/chitralearning-lms/contract-tests/${configId}`)
  return { success: true }
}

// ─── Find Active Config for Employee ───────────────────────────────────

export async function findActiveTestConfigForEmployee(employeeId: number, reviewType: string = 'contract') {
  const settings = await getContractReviewSettings()
  if (settings.onlineTest?.enabled === false) {
    return null
  }

  const [emp] = await db
    .select({
      id: employees.id,
      sectionId: employees.sectionId,
      sectionName: masterSections.name,
      employmentStatus: employees.employmentStatus,
    })
    .from(employees)
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .where(eq(employees.id, employeeId))
    .limit(1)

  if (!emp) return null

  // Fetch all active configs matching reviewType or 'all'
  const activeConfigs = await db
    .select()
    .from(hcContractReviewTestConfigs)
    .where(
      and(
        eq(hcContractReviewTestConfigs.isActive, true),
        inArray(hcContractReviewTestConfigs.reviewType, [reviewType, 'all'])
      )
    )

  // 1. First priority: match by sectionId (in targetSectionIds or legacy sectionId)
  if (emp.sectionId) {
    const configBySection = activeConfigs.find((cfg) => {
      const targetIds = (cfg.targetSectionIds as number[]) || []
      if (Array.isArray(targetIds) && targetIds.length > 0) {
        return targetIds.includes(emp.sectionId!)
      }
      return cfg.sectionId === emp.sectionId
    })
    if (configBySection) return configBySection
  }

  // 2. Second priority: match by sectionName (in targetSectionNames or legacy sectionName)
  if (emp.sectionName) {
    const configByName = activeConfigs.find((cfg) => {
      const targetNames = (cfg.targetSectionNames as string[]) || []
      if (Array.isArray(targetNames) && targetNames.length > 0) {
        return targetNames.some(
          (name) => name?.trim().toLowerCase() === emp.sectionName!.trim().toLowerCase()
        )
      }
      return cfg.sectionName?.trim().toLowerCase() === emp.sectionName.trim().toLowerCase()
    })
    if (configByName) return configByName
  }

  // 3. Fallback to general config (empty targetSectionIds AND empty sectionId)
  const generalConfig = activeConfigs.find((cfg) => {
    const targetIds = (cfg.targetSectionIds as number[]) || []
    return (
      (!targetIds || targetIds.length === 0) &&
      (!cfg.sectionId || !cfg.sectionName || cfg.sectionName === '')
    )
  })

  return generalConfig || null
}

// ─── Test Attempt & Execution Logic ────────────────────────────────────

export async function generateContractReviewTestAttempt(params: {
  employeeId: number
  reviewId?: number
  configId: number
}) {
  const [config] = await db
    .select()
    .from(hcContractReviewTestConfigs)
    .where(eq(hcContractReviewTestConfigs.id, params.configId))
    .limit(1)

  if (!config) throw new Error('Konfigurasi ujian tidak ditemukan.')

  // Count existing attempts for this employee & config
  const existingAttempts = await db
    .select({
      id: hcContractReviewTestAttempts.id,
      attemptNumber: hcContractReviewTestAttempts.attemptNumber,
      status: hcContractReviewTestAttempts.status,
      score: hcContractReviewTestAttempts.score,
    })
    .from(hcContractReviewTestAttempts)
    .where(
      and(
        eq(hcContractReviewTestAttempts.employeeId, params.employeeId),
        eq(hcContractReviewTestAttempts.configId, params.configId)
      )
    )
    .orderBy(desc(hcContractReviewTestAttempts.attemptNumber))

  // If there's an ongoing (in_progress / pending) attempt, return that
  const ongoing = existingAttempts.find((a) => ['pending', 'in_progress'].includes(a.status))
  if (ongoing) {
    const [fullOngoing] = await db
      .select()
      .from(hcContractReviewTestAttempts)
      .where(eq(hcContractReviewTestAttempts.id, ongoing.id))
      .limit(1)
    return fullOngoing
  }

  const attemptNumber = existingAttempts.length + 1
  const accessToken = `crt_${randomUUID().replace(/-/g, '')}`
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days valid

  const [attempt] = await db
    .insert(hcContractReviewTestAttempts)
    .values({
      configId: params.configId,
      employeeId: params.employeeId,
      reviewId: params.reviewId ?? null,
      attemptNumber,
      accessToken,
      hasPassingGrade: config.hasPassingGrade,
      passingGrade: config.passingGrade,
      status: 'pending',
      expiresAt,
    })
    .returning()

  // Update review if attached
  if (params.reviewId) {
    await db
      .update(hcEmployeeContractReviews)
      .set({
        testRequired: true,
        testConfigId: config.id,
        testStatus: 'pending',
        testAttemptCount: attemptNumber,
        updatedAt: new Date(),
      })
      .where(eq(hcEmployeeContractReviews.id, params.reviewId))
  }

  return attempt
}

export async function getContractReviewTestAttemptByToken(accessToken: string) {
  const [attempt] = await db
    .select()
    .from(hcContractReviewTestAttempts)
    .where(eq(hcContractReviewTestAttempts.accessToken, accessToken))
    .limit(1)

  if (!attempt) return null

  const [config] = await db
    .select()
    .from(hcContractReviewTestConfigs)
    .where(eq(hcContractReviewTestConfigs.id, attempt.configId))
    .limit(1)

  if (!config) return null

  const [emp] = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      sectionName: masterSections.name,
    })
    .from(employees)
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .where(eq(employees.id, attempt.employeeId))
    .limit(1)

  const questions = await db
    .select({
      id: hcContractReviewTestQuestions.id,
      questionText: hcContractReviewTestQuestions.questionText,
      questionImageUrl: hcContractReviewTestQuestions.questionImageUrl,
      optionA: hcContractReviewTestQuestions.optionA,
      optionAImageUrl: hcContractReviewTestQuestions.optionAImageUrl,
      optionB: hcContractReviewTestQuestions.optionB,
      optionBImageUrl: hcContractReviewTestQuestions.optionBImageUrl,
      optionC: hcContractReviewTestQuestions.optionC,
      optionCImageUrl: hcContractReviewTestQuestions.optionCImageUrl,
      optionD: hcContractReviewTestQuestions.optionD,
      optionDImageUrl: hcContractReviewTestQuestions.optionDImageUrl,
      points: hcContractReviewTestQuestions.points,
      sortOrder: hcContractReviewTestQuestions.sortOrder,
    })
    .from(hcContractReviewTestQuestions)
    .where(eq(hcContractReviewTestQuestions.configId, config.id))
    .orderBy(hcContractReviewTestQuestions.sortOrder, hcContractReviewTestQuestions.id)

  return {
    attempt,
    config,
    employee: emp,
    questions,
  }
}

export async function startContractReviewTestAttempt(accessToken: string) {
  const [attempt] = await db
    .select()
    .from(hcContractReviewTestAttempts)
    .where(eq(hcContractReviewTestAttempts.accessToken, accessToken))
    .limit(1)

  if (!attempt) throw new Error('Attempt not found')

  if (attempt.status === 'pending') {
    const [updated] = await db
      .update(hcContractReviewTestAttempts)
      .set({
        status: 'in_progress',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(hcContractReviewTestAttempts.id, attempt.id))
      .returning()
    return updated
  }

  return attempt
}

export async function submitContractReviewTestAttempt(
  accessToken: string,
  answers: Record<string, string>
) {
  const [attempt] = await db
    .select()
    .from(hcContractReviewTestAttempts)
    .where(eq(hcContractReviewTestAttempts.accessToken, accessToken))
    .limit(1)

  if (!attempt) throw new Error('Ujian tidak ditemukan.')
  if (['passed', 'failed', 'completed'].includes(attempt.status)) {
    return {
      success: true,
      alreadySubmitted: true,
      score: attempt.score,
      status: attempt.status,
    }
  }

  const [config] = await db
    .select()
    .from(hcContractReviewTestConfigs)
    .where(eq(hcContractReviewTestConfigs.id, attempt.configId))
    .limit(1)

  if (!config) throw new Error('Konfigurasi ujian tidak ditemukan.')

  const questions = await db
    .select()
    .from(hcContractReviewTestQuestions)
    .where(eq(hcContractReviewTestQuestions.configId, config.id))

  const totalQuestions = questions.length
  let correctCount = 0
  let totalPointsEarned = 0
  let totalPossiblePoints = 0

  for (const q of questions) {
    const points = q.points || 1
    totalPossiblePoints += points
    const chosen = answers[String(q.id)]?.trim().toUpperCase()
    if (chosen && chosen === q.correctOption.trim().toUpperCase()) {
      correctCount++
      totalPointsEarned += points
    }
  }

  const scorePercentage =
    totalPossiblePoints > 0 ? Math.round((totalPointsEarned / totalPossiblePoints) * 100) : 0

  let finalStatus: 'passed' | 'failed' | 'completed' = 'completed'
  if (config.hasPassingGrade) {
    finalStatus = scorePercentage >= config.passingGrade ? 'passed' : 'failed'
  }

  const completedAt = new Date()

  const [updatedAttempt] = await db
    .update(hcContractReviewTestAttempts)
    .set({
      score: scorePercentage,
      totalQuestions,
      correctAnswers: correctCount,
      status: finalStatus,
      answersPayload: answers,
      completedAt,
      updatedAt: completedAt,
    })
    .where(eq(hcContractReviewTestAttempts.id, attempt.id))
    .returning()

  // If review is attached, sync review test fields
  if (attempt.reviewId) {
    await db
      .update(hcEmployeeContractReviews)
      .set({
        testRequired: true,
        testConfigId: config.id,
        testStatus: finalStatus,
        testFinalScore: scorePercentage,
        testAttemptCount: attempt.attemptNumber,
        testCompletedAt: completedAt,
        updatedAt: completedAt,
      })
      .where(eq(hcEmployeeContractReviews.id, attempt.reviewId))
  }

  // Check if remedial allowed
  const canRemediate =
    finalStatus === 'failed' &&
    config.maxRemedialAttempts > 0 &&
    attempt.attemptNumber <= config.maxRemedialAttempts

  return {
    success: true,
    score: scorePercentage,
    totalQuestions,
    correctAnswers: correctCount,
    status: finalStatus,
    hasPassingGrade: config.hasPassingGrade,
    passingGrade: config.passingGrade,
    attemptNumber: attempt.attemptNumber,
    maxRemedialAttempts: config.maxRemedialAttempts,
    canRemediate,
  }
}

export async function requestRemedialAttempt(previousToken: string) {
  const [prev] = await db
    .select()
    .from(hcContractReviewTestAttempts)
    .where(eq(hcContractReviewTestAttempts.accessToken, previousToken))
    .limit(1)

  if (!prev) throw new Error('Previous attempt not found.')

  const [config] = await db
    .select()
    .from(hcContractReviewTestConfigs)
    .where(eq(hcContractReviewTestConfigs.id, prev.configId))
    .limit(1)

  if (!config) throw new Error('Config not found.')
  if (prev.attemptNumber > config.maxRemedialAttempts) {
    throw new Error('Batas maksimal kesempatan remedial telah habis.')
  }

  const newAttempt = await generateContractReviewTestAttempt({
    employeeId: prev.employeeId,
    reviewId: prev.reviewId ?? undefined,
    configId: prev.configId,
  })

  return newAttempt
}

// ─── Multi-Channel Notification Dispatcher ──────────────────────────────

export async function dispatchContractReviewTestInvitation(params: {
  employeeId: number
  reviewId?: number
  configId: number
}) {
  const [emp] = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      email: employees.email,
      phone: employees.phone,
      sectionName: masterSections.name,
    })
    .from(employees)
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .where(eq(employees.id, params.employeeId))
    .limit(1)

  if (!emp) throw new Error('Karyawan tidak ditemukan.')

  const [config] = await db
    .select()
    .from(hcContractReviewTestConfigs)
    .where(eq(hcContractReviewTestConfigs.id, params.configId))
    .limit(1)

  if (!config) throw new Error('Konfigurasi ujian tidak ditemukan.')

  const attempt = await generateContractReviewTestAttempt({
    employeeId: emp.id,
    reviewId: params.reviewId,
    configId: config.id,
  })

  const baseUrl = await getBaseUrl()
  const testLink = `${baseUrl}/contract-review-test/${attempt.accessToken}`
  const settings = await getContractReviewSettings()
  const template = settings.emailTemplates.onlineTestInvitation || {
    subject: `[Contract Review] Ujian Evaluasi Kompetensi Online - ${emp.name} (${emp.employeeSn})`,
    body: `Yth. ${emp.name},\n\nSebagai bagian dari Contract Review, Anda diwajibkan untuk mengerjakan Test Online berikut:\n\nMateri Ujian: ${config.title}\nDurasi: ${config.durationMinutes} Menit\nPassing Grade: ${config.hasPassingGrade ? `${config.passingGrade}%` : 'Non-passing (Asesmen Selesai)'}\n\nSilakan akses link ujian berikut:\n${testLink}\n\nTerima kasih.`,
  }

  const variables = {
    employeeName: emp.name,
    employeeSn: emp.employeeSn || '-',
    employeeSection: emp.sectionName || '-',
    testTitle: config.title,
    durationMinutes: String(config.durationMinutes),
    passingGrade: config.hasPassingGrade ? `${config.passingGrade}%` : 'Tanpa Syarat Kelulusan (Evaluasi Selesai)',
    testLink,
  }

  let finalBody = template.body
  for (const [k, v] of Object.entries(variables)) {
    finalBody = finalBody.replace(new RegExp(`{{${k}}}`, 'g'), v)
  }
  let finalSubject = template.subject
  for (const [k, v] of Object.entries(variables)) {
    finalSubject = finalSubject.replace(new RegExp(`{{${k}}}`, 'g'), v)
  }

  // 1. Send Email (via SMTP)
  if (emp.email?.trim()) {
    try {
      const smtpSettings = await getSmtpSettings()
      if (smtpSettings) {
        const hcPolicyCc = await getHumanCapitalPolicyCcRecipients()
        const resolvedTemplate = await resolveWorkflowTemplateContent({
          templateCode: 'hc_contract_review_test_invitation',
          cc: hcPolicyCc,
          variables,
          fallbackSubject: finalSubject,
          fallbackHtml: finalBody.replace(/\n/g, '<br/>'),
          fallbackText: finalBody,
        })
        await sendEmailViaSmtp(smtpSettings, {
          to: emp.email,
          cc: resolvedTemplate.ccList,
          subject: resolvedTemplate.subject,
          text: resolvedTemplate.text,
          html: resolvedTemplate.html,
          templateCode: 'hc_contract_review_test_invitation',
          templateName: `Test Online Contract Review - ${emp.name}`,
        })
      }
    } catch (e) {
      console.warn('[contract-review-test] Email send error:', e)
    }
  }

  // 2. Send Bell Notification
  if (emp.email?.trim()) {
    try {
      await notifyWorkflowBellRecipients({
        recipientEmails: [emp.email.trim()],
        category: 'approval_requests',
        title: `Ujian Online Contract Review: ${config.title}`,
        body: `Silakan kerjakan ujian evaluasi kompetensi sebagai syarat review kontrak. Durasi: ${config.durationMinutes} menit.`,
        url: `/contract-review-test/${attempt.accessToken}`,
      })
    } catch (e) {
      console.warn('[contract-review-test] Bell notification error:', e)
    }
  }

  // 3. Web Push Notification
  try {
    await sendPushNotification({
      employeeId: emp.id,
      category: 'approval_requests',
      title: `Ujian Online Contract Review`,
      body: `Materi: ${config.title}. Klik untuk memulai ujian online.`,
      url: `/contract-review-test/${attempt.accessToken}`,
    })
  } catch (e) {
    console.warn('[contract-review-test] Push notification error:', e)
  }

  // 4. WhatsApp / Phone Notification
  if (emp.phone?.trim()) {
    try {
      const waMessage = `Halo ${emp.name},\n\nAnda memiliki tugas *Test Online Contract Review* PT Chitra Paratama.\n\n*Materi:* ${config.title}\n*Durasi:* ${config.durationMinutes} Menit\n*Link Ujian:* ${testLink}\n\nHarap diselesaikan sebelum batas waktu berakhir. Terima kasih.`
      // Log delivery record
      await db.insert(notificationDeliveries).values({
        channel: 'whatsapp',
        recipientAddress: emp.phone.trim(),
        subjectOrTitle: 'Test Online Contract Review',
        status: 'delivered',
        deliveredAt: new Date(),
        errorMessage: null,
      })
      // If external WA gateway endpoint exists in process.env, forward it
      if (process.env.WHATSAPP_API_URL) {
        await fetch(process.env.WHATSAPP_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.WHATSAPP_TOKEN ? { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } : {}),
          },
          body: JSON.stringify({
            phone: emp.phone.trim(),
            message: waMessage,
          }),
        }).catch(() => {})
      }
    } catch (e) {
      console.warn('[contract-review-test] WA dispatch error:', e)
    }
  }

  return {
    success: true,
    attemptId: attempt.id,
    accessToken: attempt.accessToken,
    testLink,
  }
}
