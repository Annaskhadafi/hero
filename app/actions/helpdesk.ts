'use server'

import { and, desc, eq, inArray, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { db } from '@/db'
import {
  heroHelpdeskSettings,
  heroTicketCategories,
  heroTicketMessages,
  heroTicketRoutingRules,
  heroTickets,
  type TicketAttachment,
} from '@/db/schema/helpdesk'
import { customers } from '@/db/schema/customers'
import { employees, sites } from '@/db/schema/hero'
import { maestroCustomerUsers } from '@/db/schema/maestro'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { generateHelpdeskAiResponse } from '@/lib/helpdesk-ai'
import { getMaestroServerSession } from '@/lib/maestro-session'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'

// ─── TICKET NUMBER GENERATOR ──────────────────────────────────────────

async function generateNextTicketNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `TIC-${yearMonth}-`

  const [latest] = await db
    .select({ ticketNumber: heroTickets.ticketNumber })
    .from(heroTickets)
    .where(sql`${heroTickets.ticketNumber} LIKE ${prefix + '%'}`)
    .orderBy(desc(heroTickets.id))
    .limit(1)

  let nextSequence = 1
  if (latest?.ticketNumber) {
    const parts = latest.ticketNumber.split('-')
    const lastSeq = parseInt(parts[2] || '0', 10)
    if (!isNaN(lastSeq)) {
      nextSequence = lastSeq + 1
    }
  }

  return `${prefix}${String(nextSequence).padStart(4, '0')}`
}

function revalidateHelpdeskPaths(ticketId?: number) {
  try {
    revalidatePath('/dashboard/helpdesk')
    revalidatePath('/dashboard/settings/maestro/tickets')
    revalidatePath('/dashboard/maestro/tickets')
    revalidatePath('/dashboard/settings/maestro/tickets/settings')
    revalidatePath('/dashboard/settings/helpdesk')
    revalidatePath('/maestro/tickets')
    if (ticketId) {
      revalidatePath(`/maestro/tickets/${ticketId}`)
    }
  } catch {
    // Ignore outside active request
  }
}

// ─── MAESTRO CUSTOMER ACTIONS ────────────────────────────────────────

export async function getHelpdeskCategoriesAction() {
  return db
    .select()
    .from(heroTicketCategories)
    .where(eq(heroTicketCategories.isActive, true))
    .orderBy(heroTicketCategories.name)
}

export async function getMaestroCustomerSitesAction() {
  const session = await getMaestroServerSession()
  if (!session) return []

  const allowedIds = session.access.siteIds || []
  if (allowedIds.length === 0) return []

  return db
    .select({
      id: sites.id,
      name: sites.name,
      code: sql<string | null>`NULL`.as('code'),
    })
    .from(sites)
    .where(and(inArray(sites.id, allowedIds), eq(sites.isActive, true)))
    .orderBy(sites.name)
}

export async function getMaestroTicketsAction(params?: {
  status?: string
  search?: string
}) {
  const session = await getMaestroServerSession()
  if (!session) return { success: false, error: 'Unauthorized', data: [] }

  const customerId = session.customer.id
  const allowedSiteIds = session.access.siteIds || []

  if (allowedSiteIds.length === 0) {
    return { success: true, data: [] }
  }

  const conditions = [
    eq(heroTickets.customerId, customerId),
    inArray(heroTickets.siteId, allowedSiteIds),
  ]

  if (params?.status && params.status !== 'all') {
    conditions.push(eq(heroTickets.status, params.status))
  }

  if (params?.search?.trim()) {
    const q = `%${params.search.trim().toLowerCase()}%`
    conditions.push(
      or(
        sql`LOWER(${heroTickets.ticketNumber}) LIKE ${q}`,
        sql`LOWER(${heroTickets.title}) LIKE ${q}`,
      )!,
    )
  }

  const rows = await db
    .select({
      id: heroTickets.id,
      ticketNumber: heroTickets.ticketNumber,
      title: heroTickets.title,
      priority: heroTickets.priority,
      status: heroTickets.status,
      createdAt: heroTickets.createdAt,
      updatedAt: heroTickets.updatedAt,
      claimedAt: heroTickets.claimedAt,
      aiSummary: heroTickets.aiSummary,
      category: {
        id: heroTicketCategories.id,
        name: heroTicketCategories.name,
        color: heroTicketCategories.color,
        code: heroTicketCategories.code,
      },
      site: {
        id: sites.id,
        name: sites.name,
      },
      assignedEmployee: {
        id: employees.id,
        name: employees.name,
      },
    })
    .from(heroTickets)
    .innerJoin(heroTicketCategories, eq(heroTicketCategories.id, heroTickets.categoryId))
    .innerJoin(sites, eq(sites.id, heroTickets.siteId))
    .leftJoin(employees, eq(employees.id, heroTickets.assignedEmployeeId))
    .where(and(...conditions))
    .orderBy(desc(heroTickets.updatedAt))

  return { success: true, data: rows }
}

export async function getMaestroTicketDetailAction(ticketId: number) {
  const session = await getMaestroServerSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const [ticket] = await db
    .select({
      id: heroTickets.id,
      ticketNumber: heroTickets.ticketNumber,
      title: heroTickets.title,
      priority: heroTickets.priority,
      status: heroTickets.status,
      createdAt: heroTickets.createdAt,
      updatedAt: heroTickets.updatedAt,
      claimedAt: heroTickets.claimedAt,
      aiSummary: heroTickets.aiSummary,
      escalationReason: heroTickets.escalationReason,
      resolutionNotes: heroTickets.resolutionNotes,
      resolvedAt: heroTickets.resolvedAt,
      customerId: heroTickets.customerId,
      siteId: heroTickets.siteId,
      category: {
        id: heroTicketCategories.id,
        name: heroTicketCategories.name,
        color: heroTicketCategories.color,
        code: heroTicketCategories.code,
      },
      site: {
        id: sites.id,
        name: sites.name,
      },
      assignedEmployee: {
        id: employees.id,
        name: employees.name,
      },
      customer: {
        id: customers.id,
        name: customers.name,
      },
    })
    .from(heroTickets)
    .innerJoin(heroTicketCategories, eq(heroTicketCategories.id, heroTickets.categoryId))
    .innerJoin(sites, eq(sites.id, heroTickets.siteId))
    .innerJoin(customers, eq(customers.id, heroTickets.customerId))
    .leftJoin(employees, eq(employees.id, heroTickets.assignedEmployeeId))
    .where(
      and(
        eq(heroTickets.id, ticketId),
        eq(heroTickets.customerId, session.customer.id),
      ),
    )
    .limit(1)

  if (!ticket) {
    return { success: false, error: 'Tiket tidak ditemukan.' }
  }

  // Fetch messages (exclude internal notes for customer)
  const messages = await db
    .select({
      id: heroTicketMessages.id,
      senderType: heroTicketMessages.senderType,
      senderCustomerUserId: heroTicketMessages.senderCustomerUserId,
      senderEmployeeId: heroTicketMessages.senderEmployeeId,
      message: heroTicketMessages.message,
      attachments: heroTicketMessages.attachments,
      createdAt: heroTicketMessages.createdAt,
      senderEmployee: {
        name: employees.name,
      },
      senderCustomerUser: {
        name: maestroCustomerUsers.name,
      },
    })
    .from(heroTicketMessages)
    .leftJoin(employees, eq(employees.id, heroTicketMessages.senderEmployeeId))
    .leftJoin(
      maestroCustomerUsers,
      eq(maestroCustomerUsers.id, heroTicketMessages.senderCustomerUserId),
    )
    .where(
      and(
        eq(heroTicketMessages.ticketId, ticketId),
        eq(heroTicketMessages.isInternalNote, false),
      ),
    )
    .orderBy(heroTicketMessages.createdAt)

  return { success: true, ticket, messages }
}

export async function createMaestroTicketAction(input: {
  siteId: number
  categoryId: number
  title: string
  message: string
  priority?: string
  attachments?: TicketAttachment[]
}) {
  const session = await getMaestroServerSession()
  if (!session) return { success: false, error: 'Sesi berakhir, silakan login kembali.' }

  if (!input.title?.trim() || !input.message?.trim()) {
    return { success: false, error: 'Judul dan penjelasan keluhan wajib diisi.' }
  }

  if (!(session.access.siteIds || []).includes(input.siteId)) {
    return { success: false, error: 'Anda tidak memiliki akses ke site yang dipilih.' }
  }

  const [category] = await db
    .select()
    .from(heroTicketCategories)
    .where(eq(heroTicketCategories.id, input.categoryId))
    .limit(1)

  if (!category) return { success: false, error: 'Kategori tiket tidak valid.' }

  const [site] = await db
    .select({ name: sites.name })
    .from(sites)
    .where(eq(sites.id, input.siteId))
    .limit(1)

  const ticketNumber = await generateNextTicketNumber()

  const [newTicket] = await db
    .insert(heroTickets)
    .values({
      ticketNumber,
      customerId: session.customer.id,
      siteId: input.siteId,
      categoryId: input.categoryId,
      customerUserId: session.user.id,
      title: input.title.trim(),
      priority: input.priority || 'medium',
      status: 'bot_active',
    })
    .returning({ id: heroTickets.id })

  // Insert initial customer message
  await db.insert(heroTicketMessages).values({
    ticketId: newTicket.id,
    senderType: 'customer',
    senderCustomerUserId: session.user.id,
    message: input.message.trim(),
    attachments: input.attachments || [],
    isInternalNote: false,
  })

  // Trigger AI First Responder if category allows
  if (category.isAiEnabled) {
    try {
      const aiResponse = await generateHelpdeskAiResponse({
        ticketNumber,
        title: input.title.trim(),
        categoryName: category.name,
        customerName: session.customer.name,
        siteName: site?.name || 'Site',
        messageHistory: [],
        newUserMessage: input.message.trim(),
      })

      // Insert AI message
      await db.insert(heroTicketMessages).values({
        ticketId: newTicket.id,
        senderType: 'bot',
        message: aiResponse.reply,
        aiTokens: aiResponse.tokensUsed,
        isInternalNote: false,
      })

      if (aiResponse.shouldEscalate) {
        await escalateTicketInternal(
          newTicket.id,
          aiResponse.escalationReason || 'Auto-eskalasi oleh AI First Responder',
          aiResponse.summary,
        )
      } else if (aiResponse.summary) {
        await db
          .update(heroTickets)
          .set({ aiSummary: aiResponse.summary, updatedAt: new Date() })
          .where(eq(heroTickets.id, newTicket.id))
      }
    } catch (err) {
      console.error('[Helpdesk] AI first response error:', err)
    }
  }

  revalidateHelpdeskPaths(newTicket.id)

  return { success: true, ticketId: newTicket.id, ticketNumber }
}

export async function sendMaestroTicketMessageAction(input: {
  ticketId: number
  message: string
  attachments?: TicketAttachment[]
}) {
  const session = await getMaestroServerSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  if (!input.message?.trim() && (!input.attachments || input.attachments.length === 0)) {
    return { success: false, error: 'Pesan atau lampiran tidak boleh kosong.' }
  }

  const [ticket] = await db
    .select({
      id: heroTickets.id,
      ticketNumber: heroTickets.ticketNumber,
      title: heroTickets.title,
      status: heroTickets.status,
      customerId: heroTickets.customerId,
      siteId: heroTickets.siteId,
      categoryId: heroTickets.categoryId,
      assignedEmployeeId: heroTickets.assignedEmployeeId,
      categoryName: heroTicketCategories.name,
      isAiEnabled: heroTicketCategories.isAiEnabled,
      siteName: sites.name,
    })
    .from(heroTickets)
    .innerJoin(heroTicketCategories, eq(heroTicketCategories.id, heroTickets.categoryId))
    .innerJoin(sites, eq(sites.id, heroTickets.siteId))
    .where(
      and(
        eq(heroTickets.id, input.ticketId),
        eq(heroTickets.customerId, session.customer.id),
      ),
    )
    .limit(1)

  if (!ticket) return { success: false, error: 'Tiket tidak ditemukan.' }
  if (ticket.status === 'closed') {
    return { success: false, error: 'Tiket ini sudah ditutup dan tidak dapat menerima pesan baru.' }
  }

  // Insert customer message
  await db.insert(heroTicketMessages).values({
    ticketId: ticket.id,
    senderType: 'customer',
    senderCustomerUserId: session.user.id,
    message: input.message.trim(),
    attachments: input.attachments || [],
    isInternalNote: false,
  })

  await db
    .update(heroTickets)
    .set({ updatedAt: new Date() })
    .where(eq(heroTickets.id, ticket.id))

  // Call AI Assistant if ticket is bot_active or escalated (still awaiting human PIC takeover)
  const isHumanHandling =
    ticket.status === 'in_progress' ||
    ticket.status === 'resolved' ||
    ticket.status === 'closed' ||
    Boolean(ticket.assignedEmployeeId)

  if (!isHumanHandling && (ticket.isAiEnabled ?? true)) {
    const historyRows = await db
      .select({
        senderType: heroTicketMessages.senderType,
        message: heroTicketMessages.message,
      })
      .from(heroTicketMessages)
      .where(
        and(
          eq(heroTicketMessages.ticketId, ticket.id),
          eq(heroTicketMessages.isInternalNote, false),
        ),
      )
      .orderBy(heroTicketMessages.createdAt)

    const history = historyRows.slice(0, -1).map((r) => ({
      senderType: r.senderType as 'customer' | 'bot' | 'hero_agent' | 'system',
      message: r.message,
    }))

    try {
      const aiResponse = await generateHelpdeskAiResponse({
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        categoryName: ticket.categoryName,
        customerName: session.customer.name,
        siteName: ticket.siteName,
        messageHistory: history,
        newUserMessage: input.message.trim(),
      })

      await db.insert(heroTicketMessages).values({
        ticketId: ticket.id,
        senderType: 'bot',
        message: aiResponse.reply,
        aiTokens: aiResponse.tokensUsed,
        isInternalNote: false,
      })

      if (aiResponse.shouldEscalate && ticket.status !== 'escalated') {
        await escalateTicketInternal(
          ticket.id,
          aiResponse.escalationReason || 'Auto-eskalasi oleh AI Assistant',
          aiResponse.summary,
        )
      } else if (aiResponse.summary) {
        await db
          .update(heroTickets)
          .set({ aiSummary: aiResponse.summary, updatedAt: new Date() })
          .where(eq(heroTickets.id, ticket.id))
      }
    } catch (err) {
      console.error('[Helpdesk] AI follow-up response error:', err)
    }
  } else if (ticket.assignedEmployeeId) {
    // Notify assigned staff
    const [assigned] = await db
      .select({ email: employees.email })
      .from(employees)
      .where(eq(employees.id, ticket.assignedEmployeeId))
      .limit(1)

    if (assigned?.email) {
      await notifyWorkflowBellRecipients({
        recipientEmails: [assigned.email],
        eventType: 'HELPDESK_CUSTOMER_REPLY',
        category: 'info',
        title: `Pesan Baru: ${ticket.ticketNumber}`,
        body: `${session.customer.name} membalas tiket: "${input.message.slice(0, 100)}"`,
        url: `/dashboard/settings/maestro/tickets?ticketId=${ticket.id}`,
      })
    }
  }

  revalidateHelpdeskPaths(ticket.id)

  return { success: true }
}

export async function escalateMaestroTicketAction(ticketId: number, reason?: string) {
  const session = await getMaestroServerSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const [ticket] = await db
    .select({
      id: heroTickets.id,
      ticketNumber: heroTickets.ticketNumber,
      status: heroTickets.status,
    })
    .from(heroTickets)
    .where(
      and(
        eq(heroTickets.id, ticketId),
        eq(heroTickets.customerId, session.customer.id),
      ),
    )
    .limit(1)

  if (!ticket) return { success: false, error: 'Tiket tidak ditemukan.' }

  await escalateTicketInternal(
    ticket.id,
    reason || 'Permintaan eskalasi manual oleh pelanggan',
  )

  revalidateHelpdeskPaths(ticket.id)

  return { success: true }
}

// ─── INTERNAL ESCALATION & ROUTING ───────────────────────────────────

async function escalateTicketInternal(
  ticketId: number,
  escalationReason: string,
  summary?: string,
) {
  const [ticket] = await db
    .select({
      id: heroTickets.id,
      ticketNumber: heroTickets.ticketNumber,
      title: heroTickets.title,
      categoryId: heroTickets.categoryId,
      siteId: heroTickets.siteId,
      customerId: heroTickets.customerId,
      customerName: customers.name,
      siteName: sites.name,
      categoryName: heroTicketCategories.name,
    })
    .from(heroTickets)
    .innerJoin(customers, eq(customers.id, heroTickets.customerId))
    .innerJoin(sites, eq(sites.id, heroTickets.siteId))
    .innerJoin(heroTicketCategories, eq(heroTicketCategories.id, heroTickets.categoryId))
    .where(eq(heroTickets.id, ticketId))
    .limit(1)

  if (!ticket) return

  // Update status to escalated
  await db
    .update(heroTickets)
    .set({
      status: 'escalated',
      escalationReason,
      aiSummary: summary || sql`${heroTickets.aiSummary}`,
      updatedAt: new Date(),
    })
    .where(eq(heroTickets.id, ticketId))

  // Insert system message in thread
  await db.insert(heroTicketMessages).values({
    ticketId,
    senderType: 'system',
    message: `Tiket dialihkan ke Tim HERO Helpdesk. Alasan: ${escalationReason}. Mohon tunggu, staf terkait akan segera menangani keluhan Anda.`,
    isInternalNote: false,
  })

  // Lookup routing rule: matching category + site, or fallback category-only
  const rules = await db
    .select()
    .from(heroTicketRoutingRules)
    .where(
      and(
        eq(heroTicketRoutingRules.categoryId, ticket.categoryId),
        eq(heroTicketRoutingRules.isActive, true),
      ),
    )

  const matchedRule =
    rules.find((r) => r.siteId === ticket.siteId) || rules.find((r) => !r.siteId)

  const recipientEmployeeIds: number[] = []
  if (matchedRule?.assignedEmployeeId) {
    recipientEmployeeIds.push(matchedRule.assignedEmployeeId)
  }
  if (matchedRule?.notifyEmployeeIds && Array.isArray(matchedRule.notifyEmployeeIds)) {
    recipientEmployeeIds.push(...matchedRule.notifyEmployeeIds)
  }

  // Fetch employee emails for bell notification
  if (recipientEmployeeIds.length > 0) {
    const recipients = await db
      .select({ email: employees.email })
      .from(employees)
      .where(inArray(employees.id, recipientEmployeeIds))

    const emails = recipients.map((r) => r.email).filter(Boolean)
    if (emails.length > 0) {
      await notifyWorkflowBellRecipients({
        recipientEmails: emails,
        eventType: 'HELPDESK_TICKET_ESCALATED',
        category: 'info',
        title: `Tiket Eskalasi Baru: ${ticket.ticketNumber}`,
        body: `[${ticket.categoryName}] ${ticket.customerName} (${ticket.siteName}): ${ticket.title}`,
        url: `/dashboard/settings/maestro/tickets?ticketId=${ticket.id}`,
      })
    }
  }
}

// ─── HERO OPERATOR ACTIONS ───────────────────────────────────────────

export async function getHeroTicketsAction(params?: {
  status?: string
  categoryId?: number
  siteId?: number
  search?: string
  assignedToMe?: boolean
}) {
  const currentEmp = await getCurrentEmployee()
  if (!currentEmp) return { success: false, error: 'Unauthorized', data: [] }

  const conditions = []

  if (params?.status && params.status !== 'all') {
    conditions.push(eq(heroTickets.status, params.status))
  }

  if (params?.categoryId) {
    conditions.push(eq(heroTickets.categoryId, params.categoryId))
  }

  if (params?.siteId) {
    conditions.push(eq(heroTickets.siteId, params.siteId))
  }

  if (params?.assignedToMe) {
    conditions.push(eq(heroTickets.assignedEmployeeId, currentEmp.id))
  }

  if (params?.search?.trim()) {
    const q = `%${params.search.trim().toLowerCase()}%`
    conditions.push(
      or(
        sql`LOWER(${heroTickets.ticketNumber}) LIKE ${q}`,
        sql`LOWER(${heroTickets.title}) LIKE ${q}`,
        sql`LOWER(${customers.name}) LIKE ${q}`,
        sql`LOWER(${sites.name}) LIKE ${q}`,
      )!,
    )
  }

  const rows = await db
    .select({
      id: heroTickets.id,
      ticketNumber: heroTickets.ticketNumber,
      title: heroTickets.title,
      priority: heroTickets.priority,
      status: heroTickets.status,
      aiSummary: heroTickets.aiSummary,
      escalationReason: heroTickets.escalationReason,
      claimedAt: heroTickets.claimedAt,
      resolvedAt: heroTickets.resolvedAt,
      createdAt: heroTickets.createdAt,
      updatedAt: heroTickets.updatedAt,
      customer: {
        id: customers.id,
        name: customers.name,
      },
      site: {
        id: sites.id,
        name: sites.name,
      },
      category: {
        id: heroTicketCategories.id,
        name: heroTicketCategories.name,
        color: heroTicketCategories.color,
        code: heroTicketCategories.code,
      },
      assignedEmployee: {
        id: employees.id,
        name: employees.name,
        email: employees.email,
      },
      customerUser: {
        id: maestroCustomerUsers.id,
        name: maestroCustomerUsers.name,
        email: maestroCustomerUsers.email,
      },
    })
    .from(heroTickets)
    .innerJoin(customers, eq(customers.id, heroTickets.customerId))
    .innerJoin(sites, eq(sites.id, heroTickets.siteId))
    .innerJoin(heroTicketCategories, eq(heroTicketCategories.id, heroTickets.categoryId))
    .innerJoin(maestroCustomerUsers, eq(maestroCustomerUsers.id, heroTickets.customerUserId))
    .leftJoin(employees, eq(employees.id, heroTickets.assignedEmployeeId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(heroTickets.updatedAt))

  return { success: true, data: rows }
}

export async function getHeroTicketDetailAction(ticketId: number) {
  const currentEmp = await getCurrentEmployee()
  if (!currentEmp) return { success: false, error: 'Unauthorized' }

  const [ticket] = await db
    .select({
      id: heroTickets.id,
      ticketNumber: heroTickets.ticketNumber,
      title: heroTickets.title,
      priority: heroTickets.priority,
      status: heroTickets.status,
      aiSummary: heroTickets.aiSummary,
      escalationReason: heroTickets.escalationReason,
      resolutionNotes: heroTickets.resolutionNotes,
      claimedAt: heroTickets.claimedAt,
      resolvedAt: heroTickets.resolvedAt,
      closedAt: heroTickets.closedAt,
      createdAt: heroTickets.createdAt,
      updatedAt: heroTickets.updatedAt,
      customer: {
        id: customers.id,
        name: customers.name,
      },
      site: {
        id: sites.id,
        name: sites.name,
      },
      category: {
        id: heroTicketCategories.id,
        name: heroTicketCategories.name,
        color: heroTicketCategories.color,
        code: heroTicketCategories.code,
      },
      assignedEmployee: {
        id: employees.id,
        name: employees.name,
        email: employees.email,
      },
      customerUser: {
        id: maestroCustomerUsers.id,
        name: maestroCustomerUsers.name,
        email: maestroCustomerUsers.email,
      },
    })
    .from(heroTickets)
    .innerJoin(customers, eq(customers.id, heroTickets.customerId))
    .innerJoin(sites, eq(sites.id, heroTickets.siteId))
    .innerJoin(heroTicketCategories, eq(heroTicketCategories.id, heroTickets.categoryId))
    .innerJoin(maestroCustomerUsers, eq(maestroCustomerUsers.id, heroTickets.customerUserId))
    .leftJoin(employees, eq(employees.id, heroTickets.assignedEmployeeId))
    .where(eq(heroTickets.id, ticketId))
    .limit(1)

  if (!ticket) return { success: false, error: 'Tiket tidak ditemukan.' }

  // Staf HERO can view ALL messages including internal notes
  const messages = await db
    .select({
      id: heroTicketMessages.id,
      senderType: heroTicketMessages.senderType,
      senderCustomerUserId: heroTicketMessages.senderCustomerUserId,
      senderEmployeeId: heroTicketMessages.senderEmployeeId,
      message: heroTicketMessages.message,
      attachments: heroTicketMessages.attachments,
      isInternalNote: heroTicketMessages.isInternalNote,
      aiTokens: heroTicketMessages.aiTokens,
      createdAt: heroTicketMessages.createdAt,
      senderEmployee: {
        name: employees.name,
      },
      senderCustomerUser: {
        name: maestroCustomerUsers.name,
      },
    })
    .from(heroTicketMessages)
    .leftJoin(employees, eq(employees.id, heroTicketMessages.senderEmployeeId))
    .leftJoin(
      maestroCustomerUsers,
      eq(maestroCustomerUsers.id, heroTicketMessages.senderCustomerUserId),
    )
    .where(eq(heroTicketMessages.ticketId, ticketId))
    .orderBy(heroTicketMessages.createdAt)

  return { success: true, ticket, messages }
}

export async function claimHeroTicketAction(ticketId: number) {
  const currentEmp = await getCurrentEmployee()
  if (!currentEmp) return { success: false, error: 'Unauthorized' }

  const [ticket] = await db
    .select({ id: heroTickets.id, ticketNumber: heroTickets.ticketNumber })
    .from(heroTickets)
    .where(eq(heroTickets.id, ticketId))
    .limit(1)

  if (!ticket) return { success: false, error: 'Tiket tidak ditemukan.' }

  const now = new Date()
  await db
    .update(heroTickets)
    .set({
      assignedEmployeeId: currentEmp.id,
      claimedAt: now,
      status: 'in_progress',
      updatedAt: now,
    })
    .where(eq(heroTickets.id, ticketId))

  // Post system notice in message thread
  await db.insert(heroTicketMessages).values({
    ticketId,
    senderType: 'system',
    message: `${currentEmp.name} telah mengambil alih (claim) penanganan tiket ini.`,
    isInternalNote: false,
  })

  revalidateHelpdeskPaths(ticketId)

  return { success: true }
}

export async function assignHeroTicketAction(ticketId: number, targetEmployeeId: number) {
  const currentEmp = await getCurrentEmployee()
  if (!currentEmp) return { success: false, error: 'Unauthorized' }

  const [targetEmp] = await db
    .select({ id: employees.id, name: employees.name, email: employees.email })
    .from(employees)
    .where(eq(employees.id, targetEmployeeId))
    .limit(1)

  if (!targetEmp) return { success: false, error: 'Karyawan target tidak ditemukan.' }

  const now = new Date()
  await db
    .update(heroTickets)
    .set({
      assignedEmployeeId: targetEmp.id,
      claimedAt: now,
      status: 'assigned',
      updatedAt: now,
    })
    .where(eq(heroTickets.id, ticketId))

  await db.insert(heroTicketMessages).values({
    ticketId,
    senderType: 'system',
    message: `Tiket ditugaskan ke ${targetEmp.name} oleh ${currentEmp.name}.`,
    isInternalNote: false,
  })

  if (targetEmp.email) {
    const [t] = await db
      .select({ ticketNumber: heroTickets.ticketNumber, title: heroTickets.title })
      .from(heroTickets)
      .where(eq(heroTickets.id, ticketId))
      .limit(1)

    await notifyWorkflowBellRecipients({
      recipientEmails: [targetEmp.email],
      eventType: 'HELPDESK_TICKET_ASSIGNED',
      category: 'info',
      title: `Tiket Ditugaskan: ${t?.ticketNumber}`,
      body: `Anda ditugaskan menangani tiket: "${t?.title}" oleh ${currentEmp.name}`,
      url: `/dashboard/settings/maestro/tickets?ticketId=${ticketId}`,
    })
  }

  revalidateHelpdeskPaths(ticketId)

  return { success: true }
}

export async function sendHeroTicketMessageAction(input: {
  ticketId: number
  message: string
  isInternalNote: boolean
  attachments?: TicketAttachment[]
}) {
  const currentEmp = await getCurrentEmployee()
  if (!currentEmp) return { success: false, error: 'Unauthorized' }

  if (!input.message?.trim() && (!input.attachments || input.attachments.length === 0)) {
    return { success: false, error: 'Pesan atau lampiran tidak boleh kosong.' }
  }

  const [ticket] = await db
    .select({
      id: heroTickets.id,
      ticketNumber: heroTickets.ticketNumber,
      status: heroTickets.status,
      assignedEmployeeId: heroTickets.assignedEmployeeId,
    })
    .from(heroTickets)
    .where(eq(heroTickets.id, input.ticketId))
    .limit(1)

  if (!ticket) return { success: false, error: 'Tiket tidak ditemukan.' }

  await db.insert(heroTicketMessages).values({
    ticketId: ticket.id,
    senderType: 'hero_agent',
    senderEmployeeId: currentEmp.id,
    message: input.message.trim(),
    attachments: input.attachments || [],
    isInternalNote: input.isInternalNote,
  })

  // If this is a public reply to customer and ticket was escalated/assigned, update status to in_progress
  const updates: Record<string, any> = { updatedAt: new Date() }
  if (!input.isInternalNote) {
    if (ticket.status === 'escalated' || ticket.status === 'assigned') {
      updates.status = 'in_progress'
    }
    // Auto-claim if not yet assigned
    if (!ticket.assignedEmployeeId) {
      updates.assignedEmployeeId = currentEmp.id
      updates.claimedAt = new Date()
    }
  }

  await db.update(heroTickets).set(updates).where(eq(heroTickets.id, ticket.id))

  revalidateHelpdeskPaths(ticket.id)

  return { success: true }
}

export async function resolveHeroTicketAction(input: {
  ticketId: number
  resolutionNotes: string
}) {
  const currentEmp = await getCurrentEmployee()
  if (!currentEmp) return { success: false, error: 'Unauthorized' }

  const now = new Date()
  await db
    .update(heroTickets)
    .set({
      status: 'resolved',
      resolutionNotes: input.resolutionNotes.trim(),
      resolvedAt: now,
      updatedAt: now,
    })
    .where(eq(heroTickets.id, input.ticketId))

  await db.insert(heroTicketMessages).values({
    ticketId: input.ticketId,
    senderType: 'system',
    message: `Tiket dinyatakan SELESAI oleh ${currentEmp.name}. Catatan penyelesaian: ${input.resolutionNotes.trim()}`,
    isInternalNote: false,
  })

  revalidateHelpdeskPaths(input.ticketId)

  return { success: true }
}

export async function closeHeroTicketAction(ticketId: number) {
  const currentEmp = await getCurrentEmployee()
  if (!currentEmp) return { success: false, error: 'Unauthorized' }

  const now = new Date()
  await db
    .update(heroTickets)
    .set({
      status: 'closed',
      closedAt: now,
      updatedAt: now,
    })
    .where(eq(heroTickets.id, ticketId))

  await db.insert(heroTicketMessages).values({
    ticketId,
    senderType: 'system',
    message: `Tiket telah DITUTUP oleh ${currentEmp.name}.`,
    isInternalNote: false,
  })

  revalidateHelpdeskPaths(ticketId)

  return { success: true }
}

// ─── SETTINGS ACTIONS ────────────────────────────────────────────────

export async function getHelpdeskSettingsAction() {
  const currentEmp = await getCurrentEmployee()
  if (!currentEmp) return { success: false, error: 'Unauthorized' }

  const [settings] = await db.select().from(heroHelpdeskSettings).limit(1)
  const categories = await db
    .select()
    .from(heroTicketCategories)
    .orderBy(heroTicketCategories.name)

  const routingRules = await db
    .select({
      id: heroTicketRoutingRules.id,
      categoryId: heroTicketRoutingRules.categoryId,
      siteId: heroTicketRoutingRules.siteId,
      assignedEmployeeId: heroTicketRoutingRules.assignedEmployeeId,
      notifyEmployeeIds: heroTicketRoutingRules.notifyEmployeeIds,
      isActive: heroTicketRoutingRules.isActive,
      categoryName: heroTicketCategories.name,
      siteName: sites.name,
      assignedEmployeeName: employees.name,
    })
    .from(heroTicketRoutingRules)
    .innerJoin(
      heroTicketCategories,
      eq(heroTicketCategories.id, heroTicketRoutingRules.categoryId),
    )
    .leftJoin(sites, eq(sites.id, heroTicketRoutingRules.siteId))
    .leftJoin(employees, eq(employees.id, heroTicketRoutingRules.assignedEmployeeId))
    .orderBy(heroTicketCategories.name)

  const activeEmployees = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      department: employees.department,
    })
    .from(employees)
    .where(
      or(
        eq(employees.isActive, true),
        sql`lower(${employees.employmentStatus}) = 'active'`,
      ),
    )
    .orderBy(employees.name)

  const allSites = await db
    .select({
      id: sites.id,
      name: sites.name,
      code: sql<string | null>`NULL`.as('code'),
    })
    .from(sites)
    .where(eq(sites.isActive, true))
    .orderBy(sites.name)

  return {
    success: true,
    settings,
    categories,
    routingRules,
    activeEmployees,
    sites: allSites,
  }
}

export async function updateHelpdeskSettingsAction(input: {
  aiEnabled: boolean
  aiModel: string
  aiSystemPrompt: string
  aiGreetingMessage: string
  autoEscalateKeywords: string[]
  maxBotTurnsBeforeEscalate: number
}) {
  const currentEmp = await getCurrentEmployee()
  if (!currentEmp) return { success: false, error: 'Unauthorized' }

  await db
    .insert(heroHelpdeskSettings)
    .values({
      id: 1,
      ...input,
      updatedByEmployeeId: currentEmp.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: heroHelpdeskSettings.id,
      set: {
        ...input,
        updatedByEmployeeId: currentEmp.id,
        updatedAt: new Date(),
      },
    })

  revalidateHelpdeskPaths()
  return { success: true }
}

export async function upsertHelpdeskCategoryAction(input: {
  id?: number
  code: string
  name: string
  description?: string
  color: string
  icon?: string
  defaultSlaHours: number
  isAiEnabled: boolean
  isActive: boolean
}) {
  const currentEmp = await getCurrentEmployee()
  if (!currentEmp) return { success: false, error: 'Unauthorized' }

  if (input.id) {
    await db
      .update(heroTicketCategories)
      .set({
        name: input.name.trim(),
        description: input.description?.trim() || '',
        color: input.color,
        icon: input.icon || 'HelpCircle',
        defaultSlaHours: input.defaultSlaHours,
        isAiEnabled: input.isAiEnabled,
        isActive: input.isActive,
        updatedAt: new Date(),
      })
      .where(eq(heroTicketCategories.id, input.id))
  } else {
    await db.insert(heroTicketCategories).values({
      code: input.code.trim().toLowerCase().replace(/\s+/g, '-'),
      name: input.name.trim(),
      description: input.description?.trim() || '',
      color: input.color,
      icon: input.icon || 'HelpCircle',
      defaultSlaHours: input.defaultSlaHours,
      isAiEnabled: input.isAiEnabled,
      isActive: input.isActive,
    })
  }

  revalidateHelpdeskPaths()
  return { success: true }
}

export async function upsertHelpdeskRoutingRuleAction(input: {
  id?: number
  categoryId: number
  siteId?: number | null
  assignedEmployeeId?: number | null
  notifyEmployeeIds: number[]
  isActive: boolean
}) {
  const currentEmp = await getCurrentEmployee()
  if (!currentEmp) return { success: false, error: 'Unauthorized' }

  if (input.id) {
    await db
      .update(heroTicketRoutingRules)
      .set({
        categoryId: input.categoryId,
        siteId: input.siteId || null,
        assignedEmployeeId: input.assignedEmployeeId || null,
        notifyEmployeeIds: input.notifyEmployeeIds || [],
        isActive: input.isActive,
        updatedAt: new Date(),
      })
      .where(eq(heroTicketRoutingRules.id, input.id))
  } else {
    await db.insert(heroTicketRoutingRules).values({
      categoryId: input.categoryId,
      siteId: input.siteId || null,
      assignedEmployeeId: input.assignedEmployeeId || null,
      notifyEmployeeIds: input.notifyEmployeeIds || [],
      isActive: input.isActive,
    })
  }

  revalidateHelpdeskPaths()
  return { success: true }
}

export async function deleteHelpdeskRoutingRuleAction(id: number) {
  const currentEmp = await getCurrentEmployee()
  if (!currentEmp) return { success: false, error: 'Unauthorized' }

  await db.delete(heroTicketRoutingRules).where(eq(heroTicketRoutingRules.id, id))
  revalidateHelpdeskPaths()
  return { success: true }
}
