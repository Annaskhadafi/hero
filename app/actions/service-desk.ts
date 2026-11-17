'use server'

import { revalidatePath } from 'next/cache'
import { Pool } from 'pg'
import { getDatabaseUrl } from '@/lib/database-url'
import { createNotificationEventForEmployee } from '@/lib/push-notifications'
import { getCurrentEmployee } from '@/lib/get-current-employee'

const pool = new Pool({ connectionString: getDatabaseUrl(), ssl: false })

export interface TroubleshootTicketItem {
  id: number
  ticketNumber: string
  unitCode: string | null
  systemModule: string
  siteId: number
  siteName: string
  categoryId: number | null
  categoryName: string
  reporterEmployeeId: number | null
  reporterName: string | null
  priority: 'kritis' | 'tinggi' | 'sedang' | 'rendah'
  status: 'baru' | 'assigned' | 'investigasi' | 'menunggu_part' | 'selesai' | 'dibatalkan'
  assignedEmployeeId: number | null
  assignedEmployeeName: string | null
  assignedRole: string | null
  assignedEmployees?: Array<{ id: number; name: string; employeeSn?: string; role?: string }>
  title: string
  findingDescription: string
  sourceType: string
  sourceDetail: string
  detectedAt: string
  targetSlaAt: string
  resolvedAt: string | null
  ageStr: string
  slaLabel: string
  isOverdue: boolean
  mttrHours: number | null
  attachments: Array<{ url: string; name: string; size: number; type: string }>
}

export interface TicketActivityItem {
  id: number
  ticketId: number
  actorName: string
  actionType: string
  title: string
  description: string
  createdAt: string
}

export interface CategoryStatItem {
  code: string
  name: string
  count: number
  color: string
}

export interface SiteSummaryItem {
  siteId: number
  siteName: string
  openCount: number
  overdueCount: number
  offlineKritisCount: number
  mttrAvgHours: number | null
}

function formatAge(detectedAt: Date): string {
  const diffMs = Date.now() - detectedAt.getTime()
  if (diffMs <= 0) return 'Baru saja'
  const diffHours = Math.floor(diffMs / (3600 * 1000))
  const days = Math.floor(diffHours / 24)
  const remainingHours = diffHours % 24
  if (days > 0) {
    return remainingHours > 0 ? `${days} h ${remainingHours} j` : `${days} h`
  }
  return `${Math.max(1, diffHours)} j`
}

function formatSlaStatus(targetSlaAt: Date, status: string): { label: string; isOverdue: boolean } {
  if (status === 'selesai' || status === 'dibatalkan') {
    return { label: 'Tepat Waktu', isOverdue: false }
  }
  const diffMs = targetSlaAt.getTime() - Date.now()
  if (diffMs < 0) {
    const overdueHours = Math.max(1, Math.floor(Math.abs(diffMs) / (3600 * 1000)))
    return { label: 'Overdue', isOverdue: true }
  }
  const hoursLeft = Math.floor(diffMs / (3600 * 1000))
  if (hoursLeft <= 0) {
    return { label: '< 1 jam lagi', isOverdue: false }
  }
  return { label: `${hoursLeft} h lagi`, isOverdue: false }
}

export async function getTroubleshootDashboardData(filter?: {
  category?: string
  priority?: string
  status?: string
  siteId?: number
  search?: string
  assignedEmployeeIds?: number[]
}) {
  const c = await pool.connect()
  try {
    // 1. Fetch tickets with site names
    let query = `
      SELECT t.*, s.name as site_name, e.name as reporter_name
      FROM hero_service_desk_tickets t
      JOIN hero_sites s ON t.site_id = s.id
      LEFT JOIN hero_employees e ON t.reporter_employee_id = e.id
      WHERE 1=1
    `
    const params: any[] = []

    if (filter?.category && filter.category !== 'all') {
      params.push(filter.category)
      query += ` AND (t.category_name = $${params.length} OR t.system_module = $${params.length})`
    }
    if (filter?.priority && filter.priority !== 'all') {
      params.push(filter.priority)
      query += ` AND t.priority = $${params.length}`
    }
    if (filter?.status && filter.status !== 'all') {
      params.push(filter.status)
      query += ` AND t.status = $${params.length}`
    }
    if (filter?.siteId) {
      params.push(filter.siteId)
      query += ` AND t.site_id = $${params.length}`
    }
    if (filter?.assignedEmployeeIds && filter.assignedEmployeeIds.length > 0) {
      params.push(filter.assignedEmployeeIds)
      query += ` AND (
        t.assigned_employee_id = ANY($${params.length})
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(t.assigned_employees, '[]'::jsonb)) elem
          WHERE (elem->>'id')::int = ANY($${params.length})
        )
      )`
    }
    if (filter?.search?.trim()) {
      params.push(`%${filter.search.trim().toLowerCase()}%`)
      query += ` AND (
        LOWER(t.ticket_number) LIKE $${params.length} OR
        LOWER(t.title) LIKE $${params.length} OR
        LOWER(COALESCE(t.unit_code, '')) LIKE $${params.length} OR
        LOWER(t.finding_description) LIKE $${params.length} OR
        LOWER(COALESCE(t.assigned_employee_name, '')) LIKE $${params.length}
      )`
    }

    query += ` ORDER BY t.detected_at DESC`

    const rawTickets = await c.query(query, params)

    const tickets: TroubleshootTicketItem[] = rawTickets.rows.map((row) => {
      const detectedDate = new Date(row.detected_at)
      const targetSlaDate = new Date(row.target_sla_at)
      const slaInfo = formatSlaStatus(targetSlaDate, row.status)

      let assignedEmployees: Array<{ id: number; name: string; employeeSn?: string; role?: string }> = []
      if (Array.isArray(row.assigned_employees) && row.assigned_employees.length > 0) {
        assignedEmployees = row.assigned_employees
      } else if (row.assigned_employee_id) {
        assignedEmployees = [{ id: row.assigned_employee_id, name: row.assigned_employee_name || 'Staff' }]
      }

      return {
        id: row.id,
        ticketNumber: row.ticket_number,
        unitCode: row.unit_code,
        systemModule: row.system_module || 'General',
        siteId: row.site_id,
        siteName: row.site_name,
        categoryId: row.category_id,
        categoryName: row.category_name,
        reporterEmployeeId: row.reporter_employee_id,
        reporterName: row.reporter_name,
        priority: row.priority,
        status: row.status,
        assignedEmployeeId: row.assigned_employee_id,
        assignedEmployeeName: row.assigned_employee_name,
        assignedRole: row.assigned_role,
        assignedEmployees,
        title: row.title,
        findingDescription: row.finding_description,
        sourceType: row.source_type,
        sourceDetail: row.source_detail,
        detectedAt: row.detected_at.toISOString(),
        targetSlaAt: row.target_sla_at.toISOString(),
        resolvedAt: row.resolved_at ? row.resolved_at.toISOString() : null,
        ageStr: formatAge(detectedDate),
        slaLabel: slaInfo.label,
        isOverdue: slaInfo.isOverdue,
        mttrHours: row.mttr_hours,
        attachments: row.attachments || [],
      }
    })

    // Analytics calculations for Maestro-Grade KPI & Charts
    const totalAll = tickets.length
    const completedTickets = tickets.filter((t) => t.status === 'selesai')
    const activeTickets = tickets.filter((t) => t.status !== 'selesai' && t.status !== 'dibatalkan')
    const overdueTickets = tickets.filter((t) => t.isOverdue && t.status !== 'selesai')
    const criticalTickets = tickets.filter((t) => t.priority === 'kritis' && t.status !== 'selesai')
    const investigatingTickets = tickets.filter((t) => t.status === 'investigasi')
    const onTrackTickets = tickets.filter((t) => !t.isOverdue && t.status !== 'selesai')
    const slaComplianceRate =
      totalAll > 0 ? Math.round(((totalAll - overdueTickets.length) / totalAll) * 100) : 100

    // 2. Build Kanban columns
    const kanban = {
      baru: tickets.filter((t) => t.status === 'baru'),
      assigned: tickets.filter((t) => t.status === 'assigned'),
      investigasi: tickets.filter((t) => t.status === 'investigasi'),
      menunggu_part: tickets.filter((t) => t.status === 'menunggu_part'),
      selesai: tickets.filter((t) => t.status === 'selesai'),
    }

    // 3. Category Stats for Horizontal Bar Chart
    const catStatsRes = await c.query(`
      SELECT 
        category_name as name, 
        COUNT(*) as count
      FROM hero_service_desk_tickets
      WHERE status != 'dibatalkan'
      GROUP BY category_name
      ORDER BY count DESC
      LIMIT 6
    `)

    const categoryColors = ['#0753e7', '#3b82f6', '#06b6d4', '#6366f1', '#8b5cf6', '#ec4899']
    const categoryStats: CategoryStatItem[] = catStatsRes.rows.map((row, idx) => ({
      code: row.name,
      name: row.name,
      count: parseInt(row.count, 10),
      color: categoryColors[idx % categoryColors.length],
    }))

    // 4. Site Summary (Site, Open, Overdue, Offline/Kritis, MTTR)
    const siteSummaryRes = await c.query(`
      SELECT 
        s.id as site_id,
        s.name as site_name,
        COUNT(CASE WHEN t.status IN ('baru', 'assigned', 'investigasi', 'menunggu_part') THEN 1 END) as open_count,
        COUNT(CASE WHEN t.status IN ('baru', 'assigned', 'investigasi', 'menunggu_part') AND t.target_sla_at < NOW() THEN 1 END) as overdue_count,
        COUNT(CASE WHEN t.priority = 'kritis' AND t.status != 'selesai' THEN 1 END) as offline_kritis_count,
        ROUND(AVG(CASE WHEN t.status = 'selesai' AND t.mttr_hours IS NOT NULL THEN t.mttr_hours END)::numeric, 1) as avg_mttr
      FROM hero_sites s
      LEFT JOIN hero_service_desk_tickets t ON s.id = t.site_id
      GROUP BY s.id, s.name
      HAVING COUNT(t.id) > 0
      ORDER BY open_count DESC, s.name ASC
    `)

    const siteSummary: SiteSummaryItem[] = siteSummaryRes.rows.map((row) => ({
      siteId: row.site_id,
      siteName: row.site_name,
      openCount: parseInt(row.open_count, 10) || 0,
      overdueCount: parseInt(row.overdue_count, 10) || 0,
      offlineKritisCount: parseInt(row.offline_kritis_count, 10) || 0,
      mttrAvgHours: row.avg_mttr ? parseFloat(row.avg_mttr) : null,
    }))

    // 5. Fetch Master Filters (Sites, Categories, Technicians, Templates)
    const [sitesList, categoriesList, employeesList, templatesList] = await Promise.all([
      c.query('SELECT id, name FROM hero_sites ORDER BY name ASC'),
      c.query(
        'SELECT id, code, name, color, default_sla_hours, default_priority, default_assigned_employees FROM hero_service_desk_categories WHERE is_active = true ORDER BY name ASC'
      ),
      c.query(
        'SELECT id, name, employee_sn, role FROM hero_employees WHERE is_active = true ORDER BY name ASC LIMIT 100'
      ),
      c.query(`
        SELECT t.*, c.name as category_name
        FROM hero_service_desk_templates t
        JOIN hero_service_desk_categories c ON t.category_id = c.id
        WHERE t.is_active = true
        ORDER BY t.template_name ASC
      `),
    ])

    return {
      success: true,
      kanban,
      tickets,
      totalTickets: tickets.length,
      activeCount: activeTickets.length,
      completedCount: completedTickets.length,
      overdueCount: overdueTickets.length,
      criticalCount: criticalTickets.length,
      investigatingCount: investigatingTickets.length,
      onTrackCount: onTrackTickets.length,
      slaComplianceRate,
      categoryStats,
      siteSummary,
      sites: sitesList.rows,
      categories: categoriesList.rows,
      employees: employeesList.rows,
      templates: templatesList.rows,
    }
  } catch (error: any) {
    console.error('Error fetching troubleshoot dashboard data:', error)
    return {
      success: false,
      error: error.message || 'Gagal memuat data dashboard troubleshoot',
      kanban: { baru: [], assigned: [], investigasi: [], menunggu_part: [], selesai: [] },
      tickets: [],
      totalTickets: 0,
      categoryStats: [],
      siteSummary: [],
      sites: [],
      categories: [],
      employees: [],
    }
  } finally {
    c.release()
  }
}

export async function getTicketActivitiesAction(ticketId: number): Promise<TicketActivityItem[]> {
  const c = await pool.connect()
  try {
    const res = await c.query(
      `SELECT id, ticket_id, actor_name, action_type, title, description, created_at
       FROM hero_service_desk_activities
       WHERE ticket_id = $1
       ORDER BY created_at DESC`,
      [ticketId]
    )
    return res.rows.map((r) => ({
      id: r.id,
      ticketId: r.ticket_id,
      actorName: r.actor_name,
      actionType: r.action_type,
      title: r.title,
      description: r.description,
      createdAt: r.created_at.toISOString(),
    }))
  } catch (error) {
    console.error('Error fetching ticket activities:', error)
    return []
  } finally {
    c.release()
  }
}

export async function createTroubleshootTicket(payload: {
  unitCode?: string
  systemModule?: string
  siteId: number
  categoryName: string
  title: string
  findingDescription: string
  sourceType?: string
  sourceDetail?: string
  priority: 'kritis' | 'tinggi' | 'sedang' | 'rendah'
  assignedEmployeeId?: number
  assignedEmployeeName?: string
  assignedRole?: string
  assignedEmployees?: Array<{ id: number; name: string; employeeSn?: string; role?: string }>
  slaHours?: number
  attachments?: Array<{ url: string; name: string; size: number; type: string }>
}) {
  const currentEmp = await getCurrentEmployee()
  const c = await pool.connect()
  try {
    // Generate next ticket number TKT-XXXX
    const countRes = await c.query('SELECT COUNT(*) FROM hero_service_desk_tickets')
    const nextSeq = parseInt(countRes.rows[0].count, 10) + 1
    const ticketNumber = `TKT-${String(nextSeq).padStart(4, '0')}`

    const slaHours = payload.slaHours || (payload.priority === 'kritis' ? 6 : payload.priority === 'tinggi' ? 12 : 24)
    const targetSlaAt = new Date(Date.now() + slaHours * 3600 * 1000)

    const assignedList = Array.isArray(payload.assignedEmployees) && payload.assignedEmployees.length > 0
      ? payload.assignedEmployees
      : payload.assignedEmployeeName
        ? [{ id: payload.assignedEmployeeId || 0, name: payload.assignedEmployeeName }]
        : []

    const primaryAssignee = assignedList[0] || null
    const assignedEmployeeId = primaryAssignee?.id ? Number(primaryAssignee.id) : (payload.assignedEmployeeId || null)
    const assignedEmployeeName = primaryAssignee?.name || payload.assignedEmployeeName || null
    const assignedStatus = (assignedList.length > 0 || assignedEmployeeName) ? 'assigned' : 'baru'

    const insertRes = await c.query(
      `INSERT INTO hero_service_desk_tickets
       (ticket_number, unit_code, system_module, site_id, category_name, reporter_employee_id, source_department_id, title, finding_description, source_type, source_detail, priority, status, assigned_employee_id, assigned_employee_name, assigned_role, assigned_employees, target_sla_at, attachments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb, $18, $19)
       RETURNING id`,
      [
        ticketNumber,
        payload.unitCode || null,
        payload.systemModule || 'General',
        payload.siteId,
        payload.categoryName,
        currentEmp?.id || null,
        currentEmp?.department_id || null,
        payload.title,
        payload.findingDescription,
        payload.sourceType || 'user_report',
        payload.sourceDetail || 'Pelaporan Pengguna HERO',
        payload.priority,
        assignedStatus,
        assignedEmployeeId,
        assignedEmployeeName,
        payload.assignedRole || null,
        JSON.stringify(assignedList),
        targetSlaAt,
        JSON.stringify(payload.attachments || []),
      ]
    )

    const ticketId = insertRes.rows[0].id

    // Insert initial activity
    await c.query(
      `INSERT INTO hero_service_desk_activities (ticket_id, actor_employee_id, actor_name, action_type, title, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        ticketId,
        currentEmp?.id || null,
        currentEmp?.name || 'Sistem',
        'created',
        'Tiket dibuat oleh pengguna',
        `Kendala dilaporkan dengan prioritas ${payload.priority.toUpperCase()}`,
      ]
    )

    // Broadcast inbox notification to creator if available
    if (currentEmp?.id) {
      await createNotificationEventForEmployee({
        employeeId: currentEmp.id,
        eventType: 'service_desk_ticket_created',
        category: 'info',
        title: `Tiket ${ticketNumber} Berhasil Dibuat`,
        body: `Laporan kendala "${payload.title}" telah diterima dengan target SLA ${slaHours} jam.`,
        url: `/dashboard/helpdesk?ticketId=${ticketId}`,
      }).catch((e) => console.error('Failed to notify creator:', e))
    }

    revalidatePath('/dashboard/helpdesk')
    revalidatePath('/mobile/dashboard')
    revalidatePath('/mobile/helpdesk')
    return { success: true, ticketNumber, ticketId }
  } catch (error: any) {
    console.error('Error creating troubleshoot ticket:', error)
    return { success: false, error: error.message || 'Gagal membuat tiket baru' }
  } finally {
    c.release()
  }
}

export async function updateTicketStatusAction(
  ticketId: number,
  newStatus: 'baru' | 'assigned' | 'investigasi' | 'menunggu_part' | 'selesai' | 'dibatalkan',
  notes?: string
) {
  const currentEmp = await getCurrentEmployee()
  const c = await pool.connect()
  try {
    const tRes = await c.query('SELECT * FROM hero_service_desk_tickets WHERE id = $1', [ticketId])
    if (tRes.rows.length === 0) {
      return { success: false, error: 'Tiket tidak ditemukan' }
    }
    const ticket = tRes.rows[0]

    let resolvedAt: Date | null = null
    let mttrHours: number | null = null

    if (newStatus === 'selesai') {
      resolvedAt = new Date()
      const diffMs = resolvedAt.getTime() - new Date(ticket.detected_at).getTime()
      mttrHours = Math.round((diffMs / (3600 * 1000)) * 10) / 10
    }

    await c.query(
      `UPDATE hero_service_desk_tickets
       SET status = $1, resolved_at = COALESCE($2, resolved_at), mttr_hours = COALESCE($3, mttr_hours), updated_at = NOW()
       WHERE id = $4`,
      [newStatus, resolvedAt, mttrHours, ticketId]
    )

    // Add activity record
    const statusTitles: Record<string, string> = {
      baru: 'Status diubah ke Baru',
      assigned: 'Tiket ditugaskan ke PIC',
      investigasi: 'Investigasi dimulai',
      menunggu_part: 'Menunggu ketersediaan part/sparepart',
      selesai: 'Tiket berhasil diselesaikan',
      dibatalkan: 'Tiket dibatalkan',
    }

    await c.query(
      `INSERT INTO hero_service_desk_activities (ticket_id, actor_employee_id, actor_name, action_type, title, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        ticketId,
        currentEmp?.id || null,
        currentEmp?.name || 'Teknisi',
        'status_changed',
        statusTitles[newStatus] || `Status diubah ke ${newStatus}`,
        notes || `Status tiket diperbarui menjadi ${newStatus.toUpperCase()}`,
      ]
    )

    // Notify ticket reporter if exists
    if (ticket.reporter_employee_id) {
      await createNotificationEventForEmployee({
        employeeId: ticket.reporter_employee_id,
        eventType: 'service_desk_status_updated',
        category: 'info',
        title: `Tiket ${ticket.ticket_number} Diperbarui`,
        body: `Status tiket diubah menjadi ${newStatus.toUpperCase()}. ${notes ? 'Catatan: ' + notes : ''}`,
        url: `/dashboard/helpdesk?ticketId=${ticketId}`,
      }).catch((e) => console.error('Failed to notify reporter:', e))
    }

    revalidatePath('/dashboard/helpdesk')
    return { success: true }
  } catch (error: any) {
    console.error('Error updating ticket status:', error)
    return { success: false, error: error.message || 'Gagal mengubah status tiket' }
  } finally {
    c.release()
  }
}

export async function assignTicketAction(ticketId: number, picName: string, role?: string) {
  const currentEmp = await getCurrentEmployee()
  const c = await pool.connect()
  try {
    await c.query(
      `UPDATE hero_service_desk_tickets
       SET assigned_employee_name = $1, assigned_role = $2, status = CASE WHEN status = 'baru' THEN 'assigned' ELSE status END, updated_at = NOW()
       WHERE id = $3`,
      [picName, role || 'Teknisi', ticketId]
    )

    await c.query(
      `INSERT INTO hero_service_desk_activities (ticket_id, actor_employee_id, actor_name, action_type, title, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        ticketId,
        currentEmp?.id || null,
        currentEmp?.name || 'Supervisor',
        'assigned',
        `Di-assign ke ${picName}`,
        `Penugasan langsung PIC teknisi penanganan kendala`,
      ]
    )

    revalidatePath('/dashboard/helpdesk')
    return { success: true }
  } catch (error: any) {
    console.error('Error assigning ticket:', error)
    return { success: false, error: error.message || 'Gagal menugaskan tiket' }
  } finally {
    c.release()
  }
}

export async function addTicketNoteAction(ticketId: number, note: string) {
  const currentEmp = await getCurrentEmployee()
  const c = await pool.connect()
  try {
    await c.query(
      `INSERT INTO hero_service_desk_activities (ticket_id, actor_employee_id, actor_name, action_type, title, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        ticketId,
        currentEmp?.id || null,
        currentEmp?.name || 'Staff',
        'note_added',
        'Catatan ditambahkan',
        note,
      ]
    )

    revalidatePath('/dashboard/helpdesk')
    return { success: true }
  } catch (error: any) {
    console.error('Error adding ticket note:', error)
    return { success: false, error: error.message || 'Gagal menambahkan catatan' }
  } finally {
    c.release()
  }
}

export async function escalateTicketAction(ticketId: number, reason: string) {
  const currentEmp = await getCurrentEmployee()
  const c = await pool.connect()
  try {
    const tRes = await c.query('SELECT ticket_number FROM hero_service_desk_tickets WHERE id = $1', [ticketId])
    const ticketNumber = tRes.rows[0]?.ticket_number || 'Tiket'

    await c.query(
      `UPDATE hero_service_desk_tickets
       SET priority = 'kritis', updated_at = NOW()
       WHERE id = $1`,
      [ticketId]
    )

    await c.query(
      `INSERT INTO hero_service_desk_activities (ticket_id, actor_employee_id, actor_name, action_type, title, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        ticketId,
        currentEmp?.id || null,
        currentEmp?.name || 'Staff',
        'escalated',
        'Eskalasi Tiket Kritis',
        reason || 'Tiket dieskalasi ke prioritas KRITIS untuk penanganan prioritas tinggi.',
      ]
    )

    // Notify current employee
    if (currentEmp?.id) {
      await createNotificationEventForEmployee({
        employeeId: currentEmp.id,
        eventType: 'service_desk_escalated',
        category: 'hse_alerts',
        title: `🚨 Eskalasi Tiket: ${ticketNumber}`,
        body: `Tiket ${ticketNumber} telah dieskalasi ke prioritas KRITIS. Alasan: ${reason}`,
        url: `/dashboard/helpdesk?ticketId=${ticketId}`,
      }).catch((e) => console.error('Failed to notify on escalation:', e))
    }

    revalidatePath('/dashboard/helpdesk')
    revalidatePath('/mobile/dashboard')
    revalidatePath('/mobile/helpdesk')
    return { success: true }
  } catch (error: any) {
    console.error('Error escalating ticket:', error)
    return { success: false, error: error.message || 'Gagal melakukan eskalasi tiket' }
  } finally {
    c.release()
  }
}

export interface MobileDashboardTroubleshootResult {
  success: boolean
  scope: 'personal' | 'department'
  personalCount: number
  departmentCount: number
  userDepartmentName: string
  tickets: TroubleshootTicketItem[]
  sites: Array<{ id: number; name: string }>
  categories: Array<{ id: number; code: string; name: string; default_sla_hours: number }>
  error?: string
}

export async function getMobileDashboardTroubleshootData(
  scope: 'personal' | 'department' = 'personal'
): Promise<MobileDashboardTroubleshootResult> {
  const currentEmp = await getCurrentEmployee()
  const c = await pool.connect()
  try {
    const empId = currentEmp?.id || 0
    const empName = currentEmp?.name || ''
    const deptId = currentEmp?.department_id || null
    const deptName = currentEmp?.department || 'Umum'

    // 1. Get counts for both scopes
    const personalCountRes = await c.query(
      `SELECT COUNT(*) FROM hero_service_desk_tickets 
       WHERE status != 'selesai' AND status != 'dibatalkan' 
       AND (reporter_employee_id = $1 OR assigned_employee_id = $1 OR LOWER(assigned_employee_name) = LOWER($2))`,
      [empId, empName]
    )
    const personalCount = parseInt(personalCountRes.rows[0]?.count || '0', 10)

    let departmentCount = 0
    if (deptId) {
      const deptCountRes = await c.query(
        `SELECT COUNT(*) FROM hero_service_desk_tickets 
         WHERE status != 'selesai' AND status != 'dibatalkan' 
         AND (source_department_id = $1 OR target_department_id = $1)`,
        [deptId]
      )
      departmentCount = parseInt(deptCountRes.rows[0]?.count || '0', 10)
    } else {
      const allOpenRes = await c.query(
        `SELECT COUNT(*) FROM hero_service_desk_tickets WHERE status != 'selesai' AND status != 'dibatalkan'`
      )
      departmentCount = parseInt(allOpenRes.rows[0]?.count || '0', 10)
    }

    // 2. Query scoped tickets
    let query = `
      SELECT t.*, s.name as site_name, e.name as reporter_name
      FROM hero_service_desk_tickets t
      JOIN hero_sites s ON t.site_id = s.id
      LEFT JOIN hero_employees e ON t.reporter_employee_id = e.id
      WHERE t.status != 'dibatalkan'
    `
    const params: any[] = []

    if (scope === 'personal') {
      params.push(empId, empName)
      query += ` AND (t.reporter_employee_id = $1 OR t.assigned_employee_id = $1 OR LOWER(t.assigned_employee_name) = LOWER($2))`
    } else {
      if (deptId) {
        params.push(deptId)
        query += ` AND (t.source_department_id = $1 OR t.target_department_id = $1)`
      }
    }

    query += ` ORDER BY t.detected_at DESC LIMIT 10`

    const rawTickets = await c.query(query, params)

    const tickets: TroubleshootTicketItem[] = rawTickets.rows.map((row) => {
      const detectedDate = new Date(row.detected_at)
      const targetSlaDate = new Date(row.target_sla_at)
      const slaInfo = formatSlaStatus(targetSlaDate, row.status)

      return {
        id: row.id,
        ticketNumber: row.ticket_number,
        unitCode: row.unit_code,
        systemModule: row.system_module || 'General',
        siteId: row.site_id,
        siteName: row.site_name,
        categoryId: row.category_id,
        categoryName: row.category_name,
        reporterEmployeeId: row.reporter_employee_id,
        reporterName: row.reporter_name,
        priority: row.priority,
        status: row.status,
        assignedEmployeeId: row.assigned_employee_id,
        assignedEmployeeName: row.assigned_employee_name,
        assignedRole: row.assigned_role,
        title: row.title,
        findingDescription: row.finding_description,
        sourceType: row.source_type,
        sourceDetail: row.source_detail,
        detectedAt: row.detected_at.toISOString(),
        targetSlaAt: row.target_sla_at.toISOString(),
        resolvedAt: row.resolved_at ? row.resolved_at.toISOString() : null,
        ageStr: formatAge(detectedDate),
        slaLabel: slaInfo.label,
        isOverdue: slaInfo.isOverdue,
        mttrHours: row.mttr_hours,
        attachments: row.attachments || [],
      }
    })

    const [sitesRes, catRes] = await Promise.all([
      c.query('SELECT id, name FROM hero_sites WHERE is_active = true ORDER BY name ASC'),
      c.query('SELECT id, code, name, default_sla_hours FROM hero_service_desk_categories WHERE is_active = true ORDER BY name ASC'),
    ])

    return {
      success: true,
      scope,
      personalCount,
      departmentCount,
      userDepartmentName: deptName,
      tickets,
      sites: sitesRes.rows,
      categories: catRes.rows,
    }
  } catch (error: any) {
    console.error('Error fetching mobile dashboard troubleshoot data:', error)
    return {
      success: false,
      scope,
      personalCount: 0,
      departmentCount: 0,
      userDepartmentName: 'Departemen',
      tickets: [],
      sites: [],
      categories: [],
      error: error.message || 'Gagal memuat data tiket mobile dashboard',
    }
  } finally {
    c.release()
  }
}

export interface AdminEditTicketInput {
  title: string
  findingDescription: string
  categoryId?: number
  categoryName: string
  priority: 'kritis' | 'tinggi' | 'sedang' | 'rendah'
  status: 'baru' | 'assigned' | 'investigasi' | 'menunggu_part' | 'selesai' | 'dibatalkan'
  siteId?: number
  systemModule?: string
  unitCode?: string
  targetSlaAt?: string
  assignedEmployees?: Array<{ id: number; name: string; employeeSn?: string; role?: string }>
}

function isUserAdmin(emp: any): boolean {
  if (!emp) return false
  const role = (emp.role || emp.accessRole || '').toLowerCase()
  return (
    ['admin', 'superadmin', 'super admin', 'site admin'].includes(role) ||
    emp.isAdmin === true ||
    emp.is_admin === true
  )
}

export async function updateTicketAdminAction(ticketId: number, data: AdminEditTicketInput) {
  const currentEmp = await getCurrentEmployee()
  if (!currentEmp || !isUserAdmin(currentEmp)) {
    return { success: false, error: 'Akses ditolak: Hanya Admin yang dapat menyunting tiket ini.' }
  }

  const c = await pool.connect()
  try {
    const assignedList =
      Array.isArray(data.assignedEmployees) && data.assignedEmployees.length > 0
        ? data.assignedEmployees
        : []

    const primaryAssignee = assignedList[0] || null
    const assignedEmployeeId = primaryAssignee?.id ? Number(primaryAssignee.id) : null
    const assignedEmployeeName = primaryAssignee?.name || null

    await c.query(
      `UPDATE hero_service_desk_tickets
       SET title = $1,
           finding_description = $2,
           category_name = $3,
           priority = $4,
           status = $5,
           assigned_employee_id = $6,
           assigned_employee_name = $7,
           assigned_employees = $8::jsonb,
           target_sla_at = COALESCE($9::timestamp, target_sla_at),
           site_id = COALESCE($10, site_id),
           unit_code = COALESCE($11, unit_code),
           system_module = COALESCE($12, system_module),
           updated_at = NOW()
       WHERE id = $13`,
      [
        data.title,
        data.findingDescription,
        data.categoryName,
        data.priority,
        data.status,
        assignedEmployeeId,
        assignedEmployeeName,
        JSON.stringify(assignedList),
        data.targetSlaAt ? new Date(data.targetSlaAt) : null,
        data.siteId || null,
        data.unitCode || null,
        data.systemModule || null,
        ticketId,
      ]
    )

    await c.query(
      `INSERT INTO hero_service_desk_activities (ticket_id, actor_employee_id, actor_name, action_type, title, description)
       VALUES ($1, $2, $3, 'updated', 'Tiket diperbarui oleh Admin', $4)`,
      [
        ticketId,
        currentEmp.id,
        currentEmp.name,
        `Admin menyunting rincian tiket (${data.priority.toUpperCase()} - ${data.status.toUpperCase()})`,
      ]
    )

    revalidatePath('/dashboard/helpdesk')
    revalidatePath('/mobile/dashboard')
    revalidatePath('/mobile/helpdesk')
    return { success: true, message: 'Tiket berhasil diperbarui oleh Admin.' }
  } catch (error: any) {
    console.error('Error updating ticket by admin:', error)
    return { success: false, error: error.message || 'Gagal menyunting tiket.' }
  } finally {
    c.release()
  }
}

export async function deleteTicketAdminAction(ticketId: number) {
  const currentEmp = await getCurrentEmployee()
  if (!currentEmp || !isUserAdmin(currentEmp)) {
    return { success: false, error: 'Akses ditolak: Hanya Admin yang dapat menghapus tiket.' }
  }

  const c = await pool.connect()
  try {
    await c.query('DELETE FROM hero_service_desk_activities WHERE ticket_id = $1', [ticketId])
    await c.query('DELETE FROM hero_service_desk_tickets WHERE id = $1', [ticketId])

    revalidatePath('/dashboard/helpdesk')
    revalidatePath('/mobile/dashboard')
    revalidatePath('/mobile/helpdesk')
    return { success: true, message: 'Tiket berhasil dihapus secara permanen.' }
  } catch (error: any) {
    console.error('Error deleting ticket by admin:', error)
    return { success: false, error: error.message || 'Gagal menghapus tiket.' }
  } finally {
    c.release()
  }
}

export async function bulkDeleteTicketsAction(ticketIds: number[]) {
  const currentEmp = await getCurrentEmployee()
  if (!currentEmp || !isUserAdmin(currentEmp)) {
    return { success: false, error: 'Akses ditolak: Hanya Admin yang dapat menghapus tiket.' }
  }
  if (!ticketIds || ticketIds.length === 0) {
    return { success: false, error: 'Tidak ada tiket yang dipilih.' }
  }

  const c = await pool.connect()
  try {
    await c.query('DELETE FROM hero_service_desk_activities WHERE ticket_id = ANY($1)', [ticketIds])
    await c.query('DELETE FROM hero_service_desk_tickets WHERE id = ANY($1)', [ticketIds])

    revalidatePath('/dashboard/helpdesk')
    revalidatePath('/mobile/dashboard')
    revalidatePath('/mobile/helpdesk')
    return { success: true, deletedCount: ticketIds.length, message: `${ticketIds.length} tiket berhasil dihapus.` }
  } catch (error: any) {
    console.error('Error bulk deleting tickets by admin:', error)
    return { success: false, error: error.message || 'Gagal menghapus tiket secara massal.' }
  } finally {
    c.release()
  }
}
