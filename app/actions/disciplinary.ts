'use server'

import { and, asc, count, desc, eq, gte, ilike, inArray, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { db } from '@/db'
import {
  hcDisciplinaryActions,
  hcViolationCategories,
  masterDepartments,
  employees,
  hrPositions,
  sites,
} from '@/db/schema/hero'
import { getHrEmployeeContactById } from '@/lib/workflow-email'
import { buildHumanCapitalEmail, sendHumanCapitalEmail } from '@/lib/human-capital-email'
import { generateDisciplinaryLetterPdf } from '@/lib/disciplinary-letter-pdf'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getCurrentMenuPermission, hasGlobalDataAccess } from '@/lib/hero-access'

const DISCIPLINARY_PATH = '/dashboard/hc/disciplinary'

async function requireDisciplinaryPermission(action: 'view' | 'edit' | 'delete') {
  const [employee, permission] = await Promise.all([
    getCurrentEmployee(),
    getCurrentMenuPermission('hc_disciplinary'),
  ])
  const allowed =
    action === 'view'
      ? permission.canView
      : action === 'edit'
        ? permission.canEdit
        : permission.canDelete
  if (!employee || !allowed) throw new Error('Akses disciplinary ditolak.')
  return { employee, permission }
}

async function assertDisciplinaryEmployeeScope(
  employeeId: number,
  action: 'view' | 'edit' | 'delete'
) {
  const access = await requireDisciplinaryPermission(action)
  if (hasGlobalDataAccess(access.permission)) return access
  const [target] = await db
    .select({ id: employees.id, siteId: employees.siteId })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1)
  const allowed =
    access.permission.dataScope === 'own'
      ? target?.id === access.employee.id
      : target?.siteId === access.employee.siteId
  if (!allowed) throw new Error('Data disciplinary berada di luar scope role Anda.')
  return access
}

type IdInput = number | string

export type DisciplinaryFilters = {
  spLevel?: string
  status?: string
  severity?: string
  search?: string
}

export type ViolationCategoryInput = {
  code: string
  name: string
  severity: string
  defaultSpLevel: string
  description?: string
  isActive?: boolean
}

export type DisciplinaryActionInput = {
  employeeId: IdInput
  categoryId: IdInput
  spLevel: string
  letterNumber?: string
  violationDate: string | Date
  description?: string
  actionTaken?: string
  effectiveDate: string | Date
  expiryDate?: string | Date | null
  issuedBy?: string
  issuerDepartment?: string
  issuerSignature?: string
  useLetterhead?: boolean
  notes?: string
  status?: string
}

export async function getNextDisciplinaryLetterNumber(): Promise<string> {
  const currentYear = new Date().getFullYear()
  const [res] = await db
    .select({ count: count() })
    .from(hcDisciplinaryActions)
  const nextNum = (Number(res?.count) || 0) + 1
  return `CP/HC-DISC/${currentYear}/${String(nextNum).padStart(4, '0')}`
}

function toId(value: IdInput) {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) throw new Error('ID tidak valid.')
  return id
}

function toDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('Tanggal tidak valid.')
  return date
}

function toDateString(value: string | Date) {
  return toDate(value).toISOString().slice(0, 10)
}

function toOptionalDate(value?: string | Date | null) {
  if (!value) return null
  return toDate(value)
}

function normalizeText(value?: string | null) {
  return value?.trim() ?? ''
}

function parseSpLevel(levelInput: string | number | undefined | null): number {
  if (levelInput === undefined || levelInput === null) return 1
  const str = String(levelInput).trim().toLowerCase()
  if (str === 'teguran' || str === '0' || str === 'sp0' || str.includes('lisan') || str.includes('pembinaan')) return 0
  if (str === 'sp1' || str === '1') return 1
  if (str === 'sp2' || str === '2') return 2
  if (str === 'sp3' || str === '3' || str.includes('terakhir')) return 3
  if (str === 'skorsing' || str === '4') return 4
  if (str === 'termination' || str === 'phk' || str === '5') return 5
  const match = str.replace(/\D/g, '')
  return match !== '' ? Number(match) : 1
}

function categoryValues(data: ViolationCategoryInput) {
  return {
    code: normalizeText(data.code).toUpperCase(),
    name: normalizeText(data.name),
    severity: normalizeText(data.severity) || 'Medium',
    defaultSpLevel: parseSpLevel(data.defaultSpLevel),
    description: normalizeText(data.description),
    isActive: data.isActive ?? true,
    updatedAt: new Date(),
  }
}

function disciplinaryValues(data: DisciplinaryActionInput) {
  return {
    employeeId: toId(data.employeeId),
    violationCategoryId: toId(data.categoryId),
    spLevel: parseSpLevel(data.spLevel),
    letterNumber: normalizeText(data.letterNumber),
    violationDate: toDateString(data.violationDate),
    violationDescription: normalizeText(data.description),
    actionTaken: normalizeText(data.actionTaken),
    effectiveDate: toDateString(data.effectiveDate),
    expiryDate: data.expiryDate ? toDateString(data.expiryDate) : null,
    issuedBy: normalizeText(data.issuedBy),
    issuerDepartment: normalizeText(data.issuerDepartment),
    issuerSignature: data.issuerSignature || '',
    useLetterhead: Boolean(data.useLetterhead),
    notes: normalizeText(data.notes),
    status: normalizeText(data.status) || 'active',
    updatedAt: new Date(),
  }
}

let schemaEnsured = false
export async function ensureDisciplinarySchema() {
  if (schemaEnsured) return
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_hc_violation_categories (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        severity TEXT NOT NULL DEFAULT 'minor',
        default_sp_level INTEGER NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS hero_hc_disciplinary_actions (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE CASCADE,
        violation_category_id INTEGER REFERENCES hero_hc_violation_categories(id) ON DELETE SET NULL,
        sp_level INTEGER NOT NULL DEFAULT 1,
        letter_number TEXT NOT NULL DEFAULT '',
        violation_date DATE NOT NULL,
        violation_description TEXT NOT NULL DEFAULT '',
        action_taken TEXT NOT NULL DEFAULT '',
        effective_date DATE NOT NULL,
        expiry_date DATE,
        issued_by TEXT NOT NULL DEFAULT '',
        issuer_department TEXT NOT NULL DEFAULT '',
        issuer_signature TEXT NOT NULL DEFAULT '',
        use_letterhead BOOLEAN NOT NULL DEFAULT false,
        notes TEXT NOT NULL DEFAULT '',
        attachment_url TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      );

      ALTER TABLE hero_hc_disciplinary_actions ADD COLUMN IF NOT EXISTS issuer_department TEXT NOT NULL DEFAULT '';
      ALTER TABLE hero_hc_disciplinary_actions ADD COLUMN IF NOT EXISTS issuer_signature TEXT NOT NULL DEFAULT '';
      ALTER TABLE hero_hc_disciplinary_actions ADD COLUMN IF NOT EXISTS use_letterhead BOOLEAN NOT NULL DEFAULT false;

      INSERT INTO hero_hc_violation_categories (code, name, description, severity, default_sp_level, is_active)
      VALUES 
        ('DISC-01', 'Keterlambatan Masuk Kerja Berulang', 'Keterlambatan hadir melebihi batas toleransi tanpa izin resmi.', 'minor', 1, true),
        ('DISC-02', 'Mangkir / Tidak Masuk Kerja Tanpa Keterangan', 'Tidak masuk kerja tanpa pemberitahuan atau surat keterangan dokter sah.', 'moderate', 1, true),
        ('DISC-03', 'Pelanggaran SOP & Prosedur Keselamatan Kerja', 'Tidak mematuhi SOP operasional atau tata tertib keselamatan K3/HSE.', 'major', 2, true),
        ('DISC-04', 'Pengabaian Perintah Kerja Atasan / Insubordinasi', 'Menolak instruksi kerja sah yang diberikan atasan atau manajemen.', 'major', 2, true),
        ('DISC-05', 'Tindakan Indisipliner Berat / Kode Etik', 'Pelanggaran berat terhadap peraturan perusahaan dan integritas bisnis.', 'critical', 3, true)
      ON CONFLICT (code) DO NOTHING;
    `)
    schemaEnsured = true
  } catch (err) {
    console.error('[disciplinary] Schema ensure error:', err)
  }
}

export async function getViolationCategories() {
  await requireDisciplinaryPermission('view')
  await ensureDisciplinarySchema()
  try {
    return await db.select().from(hcViolationCategories).orderBy(asc(hcViolationCategories.code))
  } catch (err) {
    console.error('[disciplinary] Error getViolationCategories:', err)
    return []
  }
}

export async function createViolationCategory(data: ViolationCategoryInput) {
  await requireDisciplinaryPermission('edit')
  const [created] = await db.insert(hcViolationCategories).values(categoryValues(data)).returning()
  revalidatePath(DISCIPLINARY_PATH)
  return normalizeCategory(created)
}

export async function updateViolationCategory(id: IdInput, data: ViolationCategoryInput) {
  await requireDisciplinaryPermission('edit')
  const [updated] = await db
    .update(hcViolationCategories)
    .set(categoryValues(data))
    .where(eq(hcViolationCategories.id, toId(id)))
    .returning()
  revalidatePath(DISCIPLINARY_PATH)
  return normalizeCategory(updated)
}

export async function deleteViolationCategory(id: IdInput) {
  await requireDisciplinaryPermission('delete')
  await db.delete(hcViolationCategories).where(eq(hcViolationCategories.id, toId(id)))
  revalidatePath(DISCIPLINARY_PATH)
  return { success: true }
}

function buildDisciplinaryWhere(filters?: DisciplinaryFilters) {
  const clauses = []
  if (filters?.spLevel)
    clauses.push(eq(hcDisciplinaryActions.spLevel, Number(filters.spLevel.replace(/\D/g, '')) || 1))
  if (filters?.status) clauses.push(eq(hcDisciplinaryActions.status, filters.status))
  if (filters?.severity) clauses.push(eq(hcViolationCategories.severity, filters.severity))
  if (filters?.search) clauses.push(buildSearchClause(filters.search))
  return clauses.length ? and(...clauses) : undefined
}

function buildSearchClause(search: string) {
  const term = `%${search.trim()}%`
  return or(
    ilike(employees.name, term),
    ilike(hcDisciplinaryActions.letterNumber, term),
    ilike(hcViolationCategories.name, term)
  )
}

export async function getDisciplinaryActions(filters?: DisciplinaryFilters) {
  const access = await requireDisciplinaryPermission('view')
  await ensureDisciplinarySchema()
  try {
    const scope = buildDisciplinaryWhere(filters)
    const scopeClauses = scope ? [scope] : []
    if (!hasGlobalDataAccess(access.permission)) {
      scopeClauses.push(
        access.permission.dataScope === 'own'
          ? eq(hcDisciplinaryActions.employeeId, access.employee.id)
          : eq(employees.siteId, access.employee.siteId)
      )
    }
    const rows = await db
      .select({
        id: hcDisciplinaryActions.id,
        employeeId: hcDisciplinaryActions.employeeId,
        categoryId: hcDisciplinaryActions.violationCategoryId,
        spLevel: hcDisciplinaryActions.spLevel,
        letterNumber: hcDisciplinaryActions.letterNumber,
        violationDate: hcDisciplinaryActions.violationDate,
        description: hcDisciplinaryActions.violationDescription,
        actionTaken: hcDisciplinaryActions.actionTaken,
        effectiveDate: hcDisciplinaryActions.effectiveDate,
        expiryDate: hcDisciplinaryActions.expiryDate,
        issuedBy: hcDisciplinaryActions.issuedBy,
        issuerDepartment: hcDisciplinaryActions.issuerDepartment,
        issuerSignature: hcDisciplinaryActions.issuerSignature,
        useLetterhead: hcDisciplinaryActions.useLetterhead,
        notes: hcDisciplinaryActions.notes,
        status: hcDisciplinaryActions.status,
        attachmentUrl: hcDisciplinaryActions.attachmentUrl,
        createdAt: hcDisciplinaryActions.createdAt,
        employeeName: employees.name,
        employeeSn: employees.employeeSn,
        jobTitle: employees.jobTitle,
        siteName: sites.name,
        department: masterDepartments.name,
        position: hrPositions.rankName,
        categoryCode: hcViolationCategories.code,
        categoryName: hcViolationCategories.name,
        severity: hcViolationCategories.severity,
      })
      .from(hcDisciplinaryActions)
      .leftJoin(employees, eq(hcDisciplinaryActions.employeeId, employees.id))
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .leftJoin(
        hcViolationCategories,
        eq(hcDisciplinaryActions.violationCategoryId, hcViolationCategories.id)
      )
      .where(scopeClauses.length ? and(...scopeClauses) : undefined)
      .orderBy(desc(hcDisciplinaryActions.violationDate))

    return rows.map((row) => ({
      ...row,
      spLevel:
        row.spLevel === 0
          ? 'Teguran'
          : row.spLevel === 1
          ? 'SP1'
          : row.spLevel === 2
          ? 'SP2'
          : row.spLevel === 3
          ? 'SP3'
          : row.spLevel === 4
          ? 'Skorsing'
          : row.spLevel === 5
          ? 'Termination'
          : `SP${row.spLevel}`,
    }))
  } catch (err) {
    console.error('[disciplinary] Error getDisciplinaryActions:', err)
    return []
  }
}

export async function getDisciplinaryById(id: IdInput) {
  const [record] = await db
    .select()
    .from(hcDisciplinaryActions)
    .where(eq(hcDisciplinaryActions.id, toId(id)))
    .limit(1)
  if (record) await assertDisciplinaryEmployeeScope(record.employeeId, 'view')
  return record
}

export async function createDisciplinaryAction(data: DisciplinaryActionInput) {
  const access = await assertDisciplinaryEmployeeScope(toId(data.employeeId), 'edit')
  
  // Ambil langsung tanda tangan, nama, dan departemen dari akun yang membuat surat
  let resolvedIssuerSignature = data.issuerSignature?.trim() || ''
  let resolvedIssuedBy = data.issuedBy?.trim() || ''
  let resolvedIssuerDept = data.issuerDepartment?.trim() || ''

  if (access.employee.id) {
    const [curEmp] = await db
      .select({
        signatureDataUrl: employees.signatureDataUrl,
        name: employees.name,
        deptName: masterDepartments.name,
      })
      .from(employees)
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .where(eq(employees.id, access.employee.id))
      .limit(1)
    if (!resolvedIssuerSignature && curEmp?.signatureDataUrl) {
      resolvedIssuerSignature = curEmp.signatureDataUrl
    }
    if (!resolvedIssuedBy && curEmp?.name) {
      resolvedIssuedBy = curEmp.name
    }
    if (!resolvedIssuerDept) {
      resolvedIssuerDept = curEmp?.deptName || 'Human Capital'
    }
  }

  const valuesToInsert = disciplinaryValues({
    ...data,
    issuerSignature: resolvedIssuerSignature,
    issuedBy: resolvedIssuedBy || data.issuedBy || access.employee.name || 'Human Capital Dept',
    issuerDepartment: resolvedIssuerDept || 'Human Capital',
  })

  const [created] = await db
    .insert(hcDisciplinaryActions)
    .values(valuesToInsert)
    .returning()
  const [employeeDetails] = await db
    .select({
      name: employees.name,
      employeeSn: employees.employeeSn,
      email: employees.email,
      position: hrPositions.rankName,
      jobTitle: employees.jobTitle,
      department: masterDepartments.name,
      siteName: sites.name,
    })
    .from(employees)
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .where(eq(employees.id, created.employeeId))
    .limit(1)

  const [category] = created.violationCategoryId
    ? await db
        .select({
          code: hcViolationCategories.code,
          name: hcViolationCategories.name,
          severity: hcViolationCategories.severity,
        })
        .from(hcViolationCategories)
        .where(eq(hcViolationCategories.id, created.violationCategoryId))
        .limit(1)
    : []

  const levelName =
    created.spLevel === 0
      ? 'Teguran'
      : created.spLevel === 1
      ? 'SP1'
      : created.spLevel === 2
      ? 'SP2'
      : created.spLevel === 3
      ? 'SP3'
      : created.spLevel === 4
      ? 'Skorsing'
      : created.spLevel === 5
      ? 'Termination'
      : `SP${created.spLevel}`

  // Generate official PDF letter
  let pdfAttachment: any = null
  const empName = employeeDetails?.name || 'Karyawan'
  const empEmail = employeeDetails?.email || null

  try {
    const pdfBuffer = await generateDisciplinaryLetterPdf({
      letterNumber: created.letterNumber || `CP/HC-DISC/${new Date().getFullYear()}/${String(created.id).padStart(4, '0')}`,
      spLevel: levelName,
      employeeName: empName,
      employeeSn: employeeDetails?.employeeSn || '',
      position: employeeDetails?.position || employeeDetails?.jobTitle || '',
      department: employeeDetails?.department || '',
      siteName: employeeDetails?.siteName || 'Head Office',
      categoryName: category?.name || '-',
      categoryCode: category?.code || 'DISC',
      severity: category?.severity || 'Medium',
      violationDate: created.violationDate,
      effectiveDate: created.effectiveDate,
      expiryDate: created.expiryDate,
      description: created.violationDescription,
      actionTaken: created.actionTaken,
      issuedBy: created.issuedBy || 'Human Capital Dept',
      issuerDepartment: created.issuerDepartment || resolvedIssuerDept || 'Human Capital',
      issuerSignature: created.issuerSignature || null,
      useLetterhead: Boolean(created.useLetterhead),
    })

    const safeNum = (created.letterNumber || 'SURAT-SANKSI').replace(/[^a-zA-Z0-9_-]/g, '_')
    pdfAttachment = {
      filename: `${safeNum}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }
  } catch (pdfErr) {
    console.error('Gagal membuat PDF surat sanksi:', pdfErr)
  }

  try {
    const emailContent = buildHumanCapitalEmail({
      title: `Penerbitan Surat Sanksi Disiplin (${levelName})`,
      intro: `Surat tindakan sanksi disiplin telah diterbitkan untuk Saudara/i ${empName}. Berkas surat resmi dalam format PDF terlampir dalam email ini.`,
      details: [
        `Karyawan: ${empName} (SN: ${employeeDetails?.employeeSn || '-'})`,
        `Kategori: [${category?.code || 'DISC'}] ${category?.name || '-'}`,
        `Tingkat Sanksi: ${levelName}`,
        `Nomor Surat: ${created.letterNumber || '-'}`,
        `Tanggal Efektif: ${created.effectiveDate}`,
        created.expiryDate ? `Berlaku Hingga: ${created.expiryDate}` : null,
        `Status: ${created.status}`,
      ],
    })

    await sendHumanCapitalEmail({
      templateCode: 'hc_disciplinary_created',
      templateName: 'HC Disciplinary Created',
      variables: {
        employeeName: empName,
        categoryName: category?.name || '-',
        severity: category?.severity || '-',
        spLevel: levelName,
        status: created.status,
        letterNumber: created.letterNumber || '-',
      },
      extraTo: empEmail ? [empEmail] : [],
      fallbackSubject: `Surat Tindakan Disiplin (${levelName}): ${empName}`,
      fallbackHtml: emailContent.html,
      fallbackText: emailContent.text,
      attachments: pdfAttachment ? [pdfAttachment] : undefined,
    })
  } catch (emailErr) {
    console.error('[disciplinary] Gagal mengirim email notifikasi sanksi:', emailErr)
  }

  revalidatePath(DISCIPLINARY_PATH)
  return JSON.parse(JSON.stringify(normalizeAction(created)))
}

export async function updateDisciplinaryAction(id: IdInput, data: DisciplinaryActionInput) {
  const [existing] = await db
    .select({ employeeId: hcDisciplinaryActions.employeeId })
    .from(hcDisciplinaryActions)
    .where(eq(hcDisciplinaryActions.id, toId(id)))
    .limit(1)
  if (!existing) throw new Error('Data disciplinary tidak ditemukan.')
  await assertDisciplinaryEmployeeScope(existing.employeeId, 'edit')
  await assertDisciplinaryEmployeeScope(toId(data.employeeId), 'edit')
  const [updated] = await db
    .update(hcDisciplinaryActions)
    .set(disciplinaryValues(data))
    .where(eq(hcDisciplinaryActions.id, toId(id)))
    .returning()
  revalidatePath(DISCIPLINARY_PATH)
  return JSON.parse(JSON.stringify(normalizeAction(updated)))
}

export async function updateDisciplinaryStatus(id: IdInput, status: string) {
  const [existing] = await db
    .select({ employeeId: hcDisciplinaryActions.employeeId })
    .from(hcDisciplinaryActions)
    .where(eq(hcDisciplinaryActions.id, toId(id)))
    .limit(1)
  if (!existing) throw new Error('Data disciplinary tidak ditemukan.')
  await assertDisciplinaryEmployeeScope(existing.employeeId, 'edit')
  const [updated] = await db
    .update(hcDisciplinaryActions)
    .set({ status: normalizeText(status) || 'active', updatedAt: new Date() })
    .where(eq(hcDisciplinaryActions.id, toId(id)))
    .returning()

  const employee = await getHrEmployeeContactById(updated.employeeId)
  const [category] = updated.violationCategoryId
    ? await db
        .select({ name: hcViolationCategories.name })
        .from(hcViolationCategories)
        .where(eq(hcViolationCategories.id, updated.violationCategoryId))
        .limit(1)
    : []

  const emailContent = buildHumanCapitalEmail({
    title: 'Update status tindakan disipliner',
    intro: 'Status tindakan disipliner karyawan telah berubah.',
    details: [
      `Karyawan: ${employee.name}`,
      `Kategori: ${category?.name || '-'}`,
      `SP Level: SP${updated.spLevel}`,
      `Status baru: ${updated.status}`,
    ],
  })

  try {
    await sendHumanCapitalEmail({
      templateCode: 'hc_disciplinary_status_update',
      templateName: 'HC Disciplinary Status Update',
      variables: {
        employeeName: employee.name,
        categoryName: category?.name || '-',
        spLevel: `SP${updated.spLevel}`,
        status: updated.status,
      },
      extraTo: employee.email ? [employee.email] : [],
      fallbackSubject: `Update disipliner: ${employee.name}`,
      fallbackHtml: emailContent.html,
      fallbackText: emailContent.text,
    })
  } catch (emailErr) {
    console.error('[disciplinary] Gagal mengirim email status update:', emailErr)
  }

  revalidatePath(DISCIPLINARY_PATH)
  return JSON.parse(JSON.stringify(normalizeAction(updated)))
}

export async function deleteDisciplinaryAction(id: IdInput) {
  const [existing] = await db
    .select({ employeeId: hcDisciplinaryActions.employeeId })
    .from(hcDisciplinaryActions)
    .where(eq(hcDisciplinaryActions.id, toId(id)))
    .limit(1)
  if (!existing) throw new Error('Data disciplinary tidak ditemukan.')
  await assertDisciplinaryEmployeeScope(existing.employeeId, 'delete')
  await db.delete(hcDisciplinaryActions).where(eq(hcDisciplinaryActions.id, toId(id)))
  revalidatePath(DISCIPLINARY_PATH)
  return { success: true }
}

export async function getDisciplinaryStats() {
  try {
    const records = await getDisciplinaryActions()
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    return {
      totalCases: records.length,
      activeSp: records.filter((record) => isActiveRecord(record.status, record.expiryDate)).length,
      expired: records.filter((record) => isExpiredRecord(record.status, record.expiryDate)).length,
      thisMonth: records.filter((record) => new Date(record.violationDate) >= monthStart).length,
      byLevel: {
        Teguran: records.filter((record) => record.spLevel === 'Teguran').length,
        SP1: records.filter((record) => record.spLevel === 'SP1').length,
        SP2: records.filter((record) => record.spLevel === 'SP2').length,
        SP3: records.filter((record) => record.spLevel === 'SP3').length,
        Skorsing: records.filter((record) => record.spLevel === 'Skorsing').length,
        Termination: records.filter((record) => record.spLevel === 'Termination').length,
      },
    }
  } catch (err) {
    console.error('[disciplinary] Error getDisciplinaryStats:', err)
    return {
      totalCases: 0,
      activeSp: 0,
      expired: 0,
      thisMonth: 0,
      byLevel: {
        Teguran: 0,
        SP1: 0,
        SP2: 0,
        SP3: 0,
        Skorsing: 0,
        Termination: 0,
      },
    }
  }
}

function isActiveRecord(status: string, expiryDate: string | Date | null) {
  return (
    ['active', 'Active'].includes(status) && (!expiryDate || new Date(expiryDate) >= new Date())
  )
}

function isExpiredRecord(status: string, expiryDate: string | Date | null) {
  return (
    ['expired', 'Expired'].includes(status) ||
    Boolean(expiryDate && new Date(expiryDate) < new Date())
  )
}

export async function getActiveEmployees() {
  await requireDisciplinaryPermission('view')
  try {
    const access = await requireDisciplinaryPermission('view')
    const conditions = [eq(employees.isActive, true)]
    if (!hasGlobalDataAccess(access.permission)) {
      conditions.push(
        access.permission.dataScope === 'own'
          ? eq(employees.id, access.employee.id)
          : eq(employees.siteId, access.employee.siteId)
      )
    }
    return await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        department: masterDepartments.name,
        position: hrPositions.rankName,
        jobTitle: employees.jobTitle,
        siteName: sites.name,
      })
      .from(employees)
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .where(and(...conditions))
      .orderBy(asc(employees.name))
  } catch (err) {
    console.error('[disciplinary] Error getActiveEmployees:', err)
    return []
  }
}

export async function getDisciplinaryCount() {
  await requireDisciplinaryPermission('view')
  const [result] = await db.select({ count: count() }).from(hcDisciplinaryActions)
  return result.count
}

export async function getRecentDisciplinaryActions(days = 30) {
  const access = await requireDisciplinaryPermission('view')
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const conditions = [gte(hcDisciplinaryActions.createdAt, since)]
  if (!hasGlobalDataAccess(access.permission)) {
    conditions.push(
      access.permission.dataScope === 'own'
        ? eq(hcDisciplinaryActions.employeeId, access.employee.id)
        : inArray(
            hcDisciplinaryActions.employeeId,
            db
              .select({ id: employees.id })
              .from(employees)
              .where(eq(employees.siteId, access.employee.siteId))
          )
    )
  }
  return db
    .select()
    .from(hcDisciplinaryActions)
    .where(and(...conditions))
}

function normalizeAction(record: typeof hcDisciplinaryActions.$inferSelect) {
  const lvl = record.spLevel
  const spLevel =
    lvl === 0
      ? 'Teguran'
      : lvl === 1
      ? 'SP1'
      : lvl === 2
      ? 'SP2'
      : lvl === 3
      ? 'SP3'
      : lvl === 4
      ? 'Skorsing'
      : lvl === 5
      ? 'Termination'
      : `SP${lvl}`

  return {
    ...record,
    categoryId: record.violationCategoryId,
    spLevel,
    description: record.violationDescription,
  }
}

function normalizeCategory(record: typeof hcViolationCategories.$inferSelect) {
  const lvl = record.defaultSpLevel
  const defaultSpLevel =
    lvl === 0
      ? 'Teguran'
      : lvl === 1
      ? 'SP1'
      : lvl === 2
      ? 'SP2'
      : lvl === 3
      ? 'SP3'
      : lvl === 4
      ? 'Skorsing'
      : lvl === 5
      ? 'Termination'
      : `SP${lvl}`

  return {
    ...record,
    defaultSpLevel,
  }
}
