'use server'

import { revalidatePath } from 'next/cache'
import { Pool } from 'pg'
import { getDatabaseUrl } from '@/lib/database-url'
import { getCurrentEmployee } from '@/lib/get-current-employee'

const pool = new Pool({ connectionString: getDatabaseUrl(), ssl: false })

export interface ServiceDeskCategorySetting {
  id: number
  code: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  defaultSlaHours: number
  defaultPriority: 'kritis' | 'tinggi' | 'sedang' | 'rendah'
  defaultAssignedEmployees: Array<{ id: number; name: string; employeeSn?: string; role?: string }>
  targetDepartmentId: number | null
  targetDepartmentName?: string | null
  isActive: boolean
}

export interface ServiceDeskTemplateItem {
  id: number
  categoryId: number
  categoryName: string
  templateName: string
  titleTemplate: string
  descriptionTemplate: string
  priority: 'kritis' | 'tinggi' | 'sedang' | 'rendah'
  slaHours: number
  assignedEmployees: Array<{ id: number; name: string; employeeSn?: string; role?: string }>
  isActive: boolean
  createdAt: string
  updatedAt: string
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

export async function getServiceDeskSettingsData() {
  const currentEmp = await getCurrentEmployee()
  const c = await pool.connect()
  try {
    const [categoriesRes, templatesRes, employeesRes, departmentsRes] = await Promise.all([
      c.query(`
        SELECT c.*, d.name as target_dept_name
        FROM hero_service_desk_categories c
        LEFT JOIN hero_master_departments d ON c.target_department_id = d.id
        WHERE (c.is_active = true OR c.is_active IS NULL)
        ORDER BY c.name ASC
      `),
      c.query(`
        SELECT t.*, c.name as category_name
        FROM hero_service_desk_templates t
        JOIN hero_service_desk_categories c ON t.category_id = c.id
        ORDER BY t.template_name ASC
      `),
      c.query(`
        SELECT id, name, employee_sn, role
        FROM hero_employees
        WHERE is_active = true
        ORDER BY name ASC
        LIMIT 150
      `),
      c.query(`SELECT id, name FROM hero_master_departments WHERE is_active = true ORDER BY name ASC`),
    ])

    const categories: ServiceDeskCategorySetting[] = categoriesRes.rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      color: r.color,
      icon: r.icon,
      defaultSlaHours: r.default_sla_hours || 24,
      defaultPriority: (r.default_priority as any) || 'sedang',
      defaultAssignedEmployees: Array.isArray(r.default_assigned_employees) ? r.default_assigned_employees : [],
      targetDepartmentId: r.target_department_id,
      targetDepartmentName: r.target_dept_name,
      isActive: r.is_active,
    }))

    const templates: ServiceDeskTemplateItem[] = templatesRes.rows.map((r) => ({
      id: r.id,
      categoryId: r.category_id,
      categoryName: r.category_name,
      templateName: r.template_name,
      titleTemplate: r.title_template,
      descriptionTemplate: r.description_template || '',
      priority: (r.priority as any) || 'sedang',
      slaHours: r.sla_hours || 24,
      assignedEmployees: Array.isArray(r.assigned_employees) ? r.assigned_employees : [],
      isActive: r.is_active,
      createdAt: r.created_at ? r.created_at.toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? r.updated_at.toISOString() : new Date().toISOString(),
    }))

    return {
      success: true,
      categories,
      templates,
      employees: employeesRes.rows,
      departments: departmentsRes.rows,
      isAdmin: isUserAdmin(currentEmp),
    }
  } catch (error: any) {
    console.error('Error fetching service desk settings data:', error)
    return {
      success: false,
      categories: [],
      templates: [],
      employees: [],
      departments: [],
      isAdmin: false,
      error: error.message || 'Gagal memuat pengaturan service desk',
    }
  } finally {
    c.release()
  }
}

export async function updateCategoryRoutingAction(
  categoryId: number,
  payload: {
    defaultSlaHours: number
    defaultPriority: 'kritis' | 'tinggi' | 'sedang' | 'rendah'
    defaultAssignedEmployees: Array<{ id: number; name: string; employeeSn?: string; role?: string }>
    targetDepartmentId?: number | null
  }
) {
  const currentEmp = await getCurrentEmployee()
  if (!currentEmp || !isUserAdmin(currentEmp)) {
    return { success: false, error: 'Akses ditolak: Hanya Admin yang dapat memperbarui routing kategori.' }
  }

  const c = await pool.connect()
  try {
    await c.query(
      `UPDATE hero_service_desk_categories
       SET default_sla_hours = $1,
           default_priority = $2,
           default_assigned_employees = $3::jsonb,
           target_department_id = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [
        payload.defaultSlaHours,
        payload.defaultPriority,
        JSON.stringify(payload.defaultAssignedEmployees || []),
        payload.targetDepartmentId || null,
        categoryId,
      ]
    )

    revalidatePath('/dashboard/helpdesk')
    revalidatePath('/dashboard/helpdesk/settings')
    revalidatePath('/mobile/dashboard')
    revalidatePath('/mobile/helpdesk')
    return { success: true, message: 'Pengaturan routing kategori berhasil disimpan.' }
  } catch (error: any) {
    console.error('Error updating category routing:', error)
    return { success: false, error: error.message || 'Gagal memperbarui routing kategori.' }
  } finally {
    c.release()
  }
}

export interface CreateTemplateInput {
  categoryId: number
  templateName: string
  titleTemplate: string
  descriptionTemplate: string
  priority: 'kritis' | 'tinggi' | 'sedang' | 'rendah'
  slaHours: number
  assignedEmployees: Array<{ id: number; name: string; employeeSn?: string; role?: string }>
}

export async function createProblemTemplateAction(payload: CreateTemplateInput) {
  const currentEmp = await getCurrentEmployee()
  if (!currentEmp || !isUserAdmin(currentEmp)) {
    return { success: false, error: 'Akses ditolak: Hanya Admin yang dapat menambah template kendala.' }
  }

  const c = await pool.connect()
  try {
    const res = await c.query(
      `INSERT INTO hero_service_desk_templates
       (category_id, template_name, title_template, description_template, priority, sla_hours, assigned_employees, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, true)
       RETURNING id`,
      [
        payload.categoryId,
        payload.templateName.trim(),
        payload.titleTemplate.trim(),
        payload.descriptionTemplate.trim(),
        payload.priority,
        payload.slaHours,
        JSON.stringify(payload.assignedEmployees || []),
      ]
    )

    revalidatePath('/dashboard/helpdesk')
    revalidatePath('/dashboard/helpdesk/settings')
    revalidatePath('/mobile/dashboard')
    revalidatePath('/mobile/helpdesk')
    return { success: true, templateId: res.rows[0].id, message: 'Template kendala berhasil dibuat.' }
  } catch (error: any) {
    console.error('Error creating problem template:', error)
    return { success: false, error: error.message || 'Gagal membuat template kendala.' }
  } finally {
    c.release()
  }
}

export async function updateProblemTemplateAction(
  templateId: number,
  payload: CreateTemplateInput
) {
  const currentEmp = await getCurrentEmployee()
  if (!currentEmp || !isUserAdmin(currentEmp)) {
    return { success: false, error: 'Akses ditolak: Hanya Admin yang dapat mengubah template kendala.' }
  }

  const c = await pool.connect()
  try {
    await c.query(
      `UPDATE hero_service_desk_templates
       SET category_id = $1,
           template_name = $2,
           title_template = $3,
           description_template = $4,
           priority = $5,
           sla_hours = $6,
           assigned_employees = $7::jsonb,
           updated_at = NOW()
       WHERE id = $8`,
      [
        payload.categoryId,
        payload.templateName.trim(),
        payload.titleTemplate.trim(),
        payload.descriptionTemplate.trim(),
        payload.priority,
        payload.slaHours,
        JSON.stringify(payload.assignedEmployees || []),
        templateId,
      ]
    )

    revalidatePath('/dashboard/helpdesk')
    revalidatePath('/dashboard/helpdesk/settings')
    revalidatePath('/mobile/dashboard')
    revalidatePath('/mobile/helpdesk')
    return { success: true, message: 'Template kendala berhasil diperbarui.' }
  } catch (error: any) {
    console.error('Error updating problem template:', error)
    return { success: false, error: error.message || 'Gagal mengubah template kendala.' }
  } finally {
    c.release()
  }
}

export async function deleteProblemTemplateAction(templateId: number) {
  const currentEmp = await getCurrentEmployee()
  if (!currentEmp || !isUserAdmin(currentEmp)) {
    return { success: false, error: 'Akses ditolak: Hanya Admin yang dapat menghapus template.' }
  }

  const c = await pool.connect()
  try {
    await c.query('DELETE FROM hero_service_desk_templates WHERE id = $1', [templateId])

    revalidatePath('/dashboard/helpdesk')
    revalidatePath('/dashboard/helpdesk/settings')
    revalidatePath('/mobile/dashboard')
    revalidatePath('/mobile/helpdesk')
    return { success: true, message: 'Template kendala berhasil dihapus.' }
  } catch (error: any) {
    console.error('Error deleting problem template:', error)
    return { success: false, error: error.message || 'Gagal menghapus template kendala.' }
  } finally {
    c.release()
  }
}
