'use server'

import { revalidatePath } from 'next/cache'
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  chitraLearningCourses,
  chitraLearningTestimonials,
  employees,
} from '@/db/schema/hero'
import { user } from '@/db/schema/auth'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentEmployee } from '@/lib/get-current-employee'

const TESTIMONIALS_PATH = '/dashboard/chitralearning-lms/testimonials'

export interface TestimonialItem {
  id: number
  employeeId: number
  courseId: number | null
  rating: number
  trainingTitle: string
  experienceReview: string
  knowledgeBenefit: string
  feedbackSuggestion: string
  allowDisplay: boolean
  status: string
  createdAt: Date | string
  author: {
    id: number
    name: string
    employeeSn: string
    jobTitle: string
    role: string
    section: string
    department: string
    workLocation: string
    image: string | null
  }
}

export interface TestimonialStats {
  totalCount: number
  averageRating: number
  ratingCounts: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
  satisfactionRate: number // percentage of 4 and 5 stars
}

export async function getLmsTestimonials(options?: {
  ratingFilter?: number | null
  searchQuery?: string | null
  trainingFilter?: string | null
  onlyMyTestimonials?: boolean
}): Promise<TestimonialItem[]> {
  try {
    const session = await getServerSession()
    const currentEmp = await getCurrentEmployee()

    const conditions = []

    // If regular view, only show allowDisplay === true or testimonials written by current employee
    if (options?.onlyMyTestimonials && currentEmp) {
      conditions.push(eq(chitraLearningTestimonials.employeeId, currentEmp.id))
    } else {
      // By default show testimonials where allowDisplay is true
      if (currentEmp) {
        conditions.push(
          or(
            eq(chitraLearningTestimonials.allowDisplay, true),
            eq(chitraLearningTestimonials.employeeId, currentEmp.id)
          )
        )
      } else {
        conditions.push(eq(chitraLearningTestimonials.allowDisplay, true))
      }
    }

    if (options?.ratingFilter && options.ratingFilter >= 1 && options.ratingFilter <= 5) {
      conditions.push(eq(chitraLearningTestimonials.rating, options.ratingFilter))
    }

    if (options?.trainingFilter && options.trainingFilter.trim() !== '') {
      conditions.push(ilike(chitraLearningTestimonials.trainingTitle, `%${options.trainingFilter.trim()}%`))
    }

    if (options?.searchQuery && options.searchQuery.trim() !== '') {
      const q = `%${options.searchQuery.trim()}%`
      conditions.push(
        or(
          ilike(chitraLearningTestimonials.trainingTitle, q),
          ilike(chitraLearningTestimonials.experienceReview, q),
          ilike(chitraLearningTestimonials.knowledgeBenefit, q),
          ilike(chitraLearningTestimonials.feedbackSuggestion, q),
          ilike(employees.name, q)
        )
      )
    }

    const rows = await db
      .select({
        id: chitraLearningTestimonials.id,
        employeeId: chitraLearningTestimonials.employeeId,
        courseId: chitraLearningTestimonials.courseId,
        rating: chitraLearningTestimonials.rating,
        trainingTitle: chitraLearningTestimonials.trainingTitle,
        experienceReview: chitraLearningTestimonials.experienceReview,
        knowledgeBenefit: chitraLearningTestimonials.knowledgeBenefit,
        feedbackSuggestion: chitraLearningTestimonials.feedbackSuggestion,
        allowDisplay: chitraLearningTestimonials.allowDisplay,
        status: chitraLearningTestimonials.status,
        createdAt: chitraLearningTestimonials.createdAt,
        authorId: employees.id,
        authorName: employees.name,
        authorSn: employees.employeeSn,
        authorJobTitle: employees.jobTitle,
        authorRole: employees.role,
        authorSection: employees.section,
        authorDepartment: employees.department,
        authorLocation: employees.workLocation,
        authorImage: user.image,
      })
      .from(chitraLearningTestimonials)
      .innerJoin(employees, eq(chitraLearningTestimonials.employeeId, employees.id))
      .leftJoin(user, eq(employees.authUserId, user.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(chitraLearningTestimonials.createdAt))

    return rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      courseId: r.courseId,
      rating: r.rating,
      trainingTitle: r.trainingTitle,
      experienceReview: r.experienceReview,
      knowledgeBenefit: r.knowledgeBenefit,
      feedbackSuggestion: r.feedbackSuggestion || '',
      allowDisplay: r.allowDisplay,
      status: r.status,
      createdAt: r.createdAt,
      author: {
        id: r.authorId,
        name: r.authorName,
        employeeSn: r.authorSn,
        jobTitle: r.authorJobTitle,
        role: r.authorRole,
        section: r.authorSection,
        department: r.authorDepartment,
        workLocation: r.authorLocation,
        image: r.authorImage,
      },
    }))
  } catch (err) {
    console.error('[getLmsTestimonials] error:', err)
    return []
  }
}

export async function getLmsTestimonialStats(): Promise<TestimonialStats> {
  try {
    const rows = await db
      .select({
        rating: chitraLearningTestimonials.rating,
      })
      .from(chitraLearningTestimonials)
      .where(eq(chitraLearningTestimonials.allowDisplay, true))

    const totalCount = rows.length
    if (totalCount === 0) {
      return {
        totalCount: 0,
        averageRating: 5.0,
        ratingCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        satisfactionRate: 100,
      }
    }

    const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    let sum = 0
    let satisfied = 0

    for (const row of rows) {
      const r = Math.min(Math.max(row.rating || 5, 1), 5) as 1 | 2 | 3 | 4 | 5
      ratingCounts[r] = (ratingCounts[r] || 0) + 1
      sum += r
      if (r >= 4) satisfied++
    }

    const averageRating = Number((sum / totalCount).toFixed(1))
    const satisfactionRate = Math.round((satisfied / totalCount) * 100)

    return {
      totalCount,
      averageRating,
      ratingCounts,
      satisfactionRate,
    }
  } catch (err) {
    console.error('[getLmsTestimonialStats] error:', err)
    return {
      totalCount: 0,
      averageRating: 5.0,
      ratingCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      satisfactionRate: 100,
    }
  }
}

export async function getAvailableLmsCourses(): Promise<Array<{ id: number; title: string }>> {
  try {
    return await db
      .select({
        id: chitraLearningCourses.id,
        title: chitraLearningCourses.title,
      })
      .from(chitraLearningCourses)
      .orderBy(chitraLearningCourses.title)
  } catch {
    return []
  }
}

export async function getCurrentUserEmployeeInfo() {
  const session = await getServerSession()
  if (!session?.user) return null

  const emp = await getCurrentEmployee()
  if (!emp) return null

  // Avatar & permissions
  let userImage: string | null = null
  if (emp.authUserId) {
    const [u] = await db
      .select({ image: user.image })
      .from(user)
      .where(eq(user.id, emp.authUserId))
      .limit(1)
    userImage = u?.image || null
  }

  const { isLmsAdmin } = await import('@/lib/chitralearning-lms')
  const { isSuperAdminUser } = await import('@/lib/role-utils')
  const isSuper = isSuperAdminUser(emp, session.user)
  const isLmsAdm = await isLmsAdmin(session)
  const isTrainingStaff =
    (emp.department || '').toLowerCase().includes('training') ||
    (emp.section || '').toLowerCase().includes('training') ||
    (emp.jobTitle || '').toLowerCase().includes('trainer') ||
    (emp.jobTitle || '').toLowerCase().includes('training')

  const canManageAll = isSuper || isLmsAdm || isTrainingStaff

  return {
    id: emp.id,
    name: emp.name,
    email: emp.email,
    employeeSn: emp.employeeSn,
    jobTitle: emp.jobTitle || emp.role || 'Staff',
    role: emp.role,
    section: emp.section || 'Site Operation',
    department: emp.department || 'Operasional',
    image: userImage || session.user.image || null,
    canManageAll,
  }
}

export interface CreateTestimonialInput {
  rating: number // 1-5
  trainingTitle: string
  experienceReview: string
  knowledgeBenefit: string
  feedbackSuggestion?: string
  allowDisplay: boolean
  courseId?: number | null
}

export async function submitLmsTestimonial(input: CreateTestimonialInput) {
  const session = await getServerSession()
  if (!session?.user) {
    return { success: false, message: 'Silakan login terlebih dahulu.' }
  }

  const currentEmp = await getCurrentEmployee()
  if (!currentEmp) {
    return { success: false, message: 'Data karyawan tidak ditemukan untuk sesi ini.' }
  }

  const rating = Math.min(Math.max(Number(input.rating) || 5, 1), 5)
  const trainingTitle = (input.trainingTitle || '').trim()
  const experienceReview = (input.experienceReview || '').trim()
  const knowledgeBenefit = (input.knowledgeBenefit || '').trim()
  const feedbackSuggestion = (input.feedbackSuggestion || '').trim()
  const allowDisplay = Boolean(input.allowDisplay)

  if (!trainingTitle) {
    return { success: false, message: 'Harap isi nama Training atau Modul yang Diikuti.' }
  }
  if (!experienceReview) {
    return { success: false, message: 'Harap ceritakan pengalaman Anda selama mengikuti pembelajaran.' }
  }
  if (!knowledgeBenefit) {
    return { success: false, message: 'Harap isi pengetahuan atau manfaat yang Anda dapatkan.' }
  }

  try {
    const [inserted] = await db
      .insert(chitraLearningTestimonials)
      .values({
        employeeId: currentEmp.id,
        courseId: input.courseId || null,
        rating,
        trainingTitle,
        experienceReview,
        knowledgeBenefit,
        feedbackSuggestion,
        allowDisplay,
        status: 'published',
      })
      .returning({ id: chitraLearningTestimonials.id })

    revalidatePath(TESTIMONIALS_PATH)
    return { success: true, id: inserted.id, message: 'Testimoni Anda berhasil dikirim!' }
  } catch (err: any) {
    console.error('[submitLmsTestimonial] error:', err)
    return { success: false, message: err?.message || 'Gagal menyimpan testimoni.' }
  }
}

export async function deleteLmsTestimonial(id: number) {
  const session = await getServerSession()
  if (!session?.user) {
    return { success: false, message: 'Unauthorized' }
  }

  const currentEmp = await getCurrentEmployee()
  if (!currentEmp) {
    return { success: false, message: 'Unauthorized' }
  }

  try {
    const [existing] = await db
      .select({ id: chitraLearningTestimonials.id, employeeId: chitraLearningTestimonials.employeeId })
      .from(chitraLearningTestimonials)
      .where(eq(chitraLearningTestimonials.id, id))
      .limit(1)

    if (!existing) {
      return { success: false, message: 'Testimoni tidak ditemukan.' }
    }

    // Only author, training admin, or superadmin can delete
    const isOwner = existing.employeeId === currentEmp.id
    const { isLmsAdmin } = await import('@/lib/chitralearning-lms')
    const { isSuperAdminUser } = await import('@/lib/role-utils')
    const isSuper = isSuperAdminUser(currentEmp, session.user)
    const isLmsAdm = await isLmsAdmin(session)
    const isTrainingStaff =
      (currentEmp.department || '').toLowerCase().includes('training') ||
      (currentEmp.section || '').toLowerCase().includes('training') ||
      (currentEmp.jobTitle || '').toLowerCase().includes('trainer') ||
      (currentEmp.jobTitle || '').toLowerCase().includes('training')

    if (!isOwner && !isSuper && !isLmsAdm && !isTrainingStaff) {
      return { success: false, message: 'Anda tidak memiliki akses untuk menghapus testimoni ini.' }
    }

    await db.delete(chitraLearningTestimonials).where(eq(chitraLearningTestimonials.id, id))
    revalidatePath(TESTIMONIALS_PATH)
    return { success: true, message: 'Testimoni berhasil dihapus.' }
  } catch (err: any) {
    console.error('[deleteLmsTestimonial] error:', err)
    return { success: false, message: err?.message || 'Gagal menghapus testimoni.' }
  }
}
