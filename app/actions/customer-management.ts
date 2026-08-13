"use server"

import { onechitaDb } from "@/db/onechitra-db"
import { db } from "@/db"
import { customers } from "@/db/schema"
import { asc, ilike, or } from "drizzle-orm"

export type CustomerRecord = {
  id: number
  customerCode: string
  name: string
  contactName: string | null
  email: string | null
  birthday: string | null
  address1: string | null
  address2: string | null
  address3: string | null
  address4: string | null
  address5: string | null
  businessCategory: string | null
  businessCategorySource?: string | null
  businessCategoryEnrichedAt?: Date | null
  createdAt?: Date | string | null
  updatedAt?: Date | string | null
}

export type CustomerStats = {
  totalCustomers: number
  newThisMonth: number
}

export type GetCustomersParams = {
  page?: number
  limit?: number
  search?: string
  category?: string
}

/**
 * Read-only. Source of truth: onechitranewdb (remote).
 * No create / update / delete operations allowed on this data.
 */
export async function getCustomersAction(params?: GetCustomersParams) {
  try {
    const page = Math.max(1, params?.page || 1)
    const limit = Math.max(1, Math.min(1000, params?.limit || 50))
    const offset = (page - 1) * limit
    const search = params?.search?.trim()
    const category = params?.category?.trim()

    const conditions: string[] = []
    const values: unknown[] = []
    let paramIdx = 1

    if (search) {
      conditions.push(
        `(name ILIKE $${paramIdx} OR customer_code ILIKE $${paramIdx + 1} OR contact_name ILIKE $${paramIdx + 2} OR email ILIKE $${paramIdx + 3})`
      )
      const term = `%${search}%`
      values.push(term, term, term, term)
      paramIdx += 4
    }

    if (category && category !== "all") {
      conditions.push(`business_category = $${paramIdx}`)
      values.push(category)
      paramIdx++
    }

    const whereSQL = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

    const [dataRes, countRes, totalStatsRes, newMonthRes, categoriesRes] = await Promise.all([
      onechitaDb.query(
        `SELECT id, customer_code, name, contact_name, email,
                address_1, address_2, address_3, address_4, address_5,
                birthday, business_category, business_category_source,
                business_category_enriched_at, created_at, updated_at
         FROM customers ${whereSQL}
         ORDER BY name ASC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...values, limit, offset]
      ),
      onechitaDb.query(`SELECT COUNT(*) FROM customers ${whereSQL}`, values),
      onechitaDb.query(`SELECT COUNT(*) FROM customers`),
      onechitaDb.query(
        `SELECT COUNT(*) FROM customers WHERE created_at >= $1`,
        [new Date(new Date().getFullYear(), new Date().getMonth(), 1)]
      ),
      onechitaDb.query(
        `SELECT DISTINCT business_category FROM customers
         WHERE business_category IS NOT NULL AND business_category != ''
         ORDER BY business_category`
      ),
    ])

    const total = parseInt(countRes.rows[0].count, 10)
    const totalCustomers = parseInt(totalStatsRes.rows[0].count, 10)
    const newThisMonth = parseInt(newMonthRes.rows[0].count, 10)
    const categories = categoriesRes.rows.map((r: { business_category: string }) => r.business_category)

    const data: CustomerRecord[] = dataRes.rows.map((r: Record<string, unknown>) => ({
      id: r.id as number,
      customerCode: (r.customer_code as string) || "",
      name: (r.name as string) || "",
      contactName: (r.contact_name as string) || null,
      email: (r.email as string) || null,
      birthday: (r.birthday as string) || null,
      address1: (r.address_1 as string) || null,
      address2: (r.address_2 as string) || null,
      address3: (r.address_3 as string) || null,
      address4: (r.address_4 as string) || null,
      address5: (r.address_5 as string) || null,
      businessCategory: (r.business_category as string) || null,
      businessCategorySource: (r.business_category_source as string) || null,
      businessCategoryEnrichedAt: r.business_category_enriched_at as Date | null,
      createdAt: r.created_at as Date | null,
      updatedAt: r.updated_at as Date | null,
    }))

    return {
      success: true as const,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: { totalCustomers, newThisMonth },
      categories,
    }
  } catch (error) {
    console.warn("[getCustomersAction] Remote onechitranewdb query failed, attempting local HERO DB fallback:", (error as Error)?.message || error)

    try {
      const page = Math.max(1, params?.page || 1)
      const limit = Math.max(1, Math.min(1000, params?.limit || 50))
      const offset = (page - 1) * limit
      const search = params?.search?.trim()

      let conditions: ReturnType<typeof ilike>[] = []
      if (search) {
        conditions.push(ilike(customers.name, `%${search}%`))
        conditions.push(ilike(customers.customerCode, `%${search}%`))
      }

      const localList = await db
        .select()
        .from(customers)
        .where(conditions.length > 0 ? or(...conditions) : undefined)
        .orderBy(asc(customers.name))
        .limit(limit)
        .offset(offset)

      const formatted: CustomerRecord[] = localList.map((c) => ({
        id: c.id,
        customerCode: c.customerCode || "",
        name: c.name || "",
        contactName: c.contactName || null,
        email: c.email || null,
        birthday: c.birthday ? String(c.birthday) : null,
        address1: c.address1 || null,
        address2: c.address2 || null,
        address3: c.address3 || null,
        address4: c.address4 || null,
        address5: c.address5 || null,
        businessCategory: c.businessCategory || null,
        businessCategorySource: c.businessCategorySource || null,
        businessCategoryEnrichedAt: c.businessCategoryEnrichedAt || null,
        createdAt: c.createdAt || null,
        updatedAt: c.updatedAt || null,
      }))

      return {
        success: true as const,
        data: formatted,
        total: formatted.length,
        page,
        limit,
        totalPages: Math.ceil(formatted.length / limit) || 1,
        stats: { totalCustomers: formatted.length, newThisMonth: 0 },
        categories: [],
      }
    } catch (fallbackErr) {
      console.error("[getCustomersAction] Local HERO DB fallback also failed:", fallbackErr)
      return {
        success: false as const,
        error: "Gagal mengambil data customer",
        data: [] as CustomerRecord[],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
        stats: { totalCustomers: 0, newThisMonth: 0 },
        categories: [],
      }
    }
  }
}

// ─── Write operations are intentionally disabled ───────────────────────────
// Customer data is managed in onechitranewdb (remote, read-only from this app).
// To add/edit customers, manage them directly in the source system.

export async function createCustomerAction(_data: unknown) {
  return { success: false, error: "Data customer dikelola di sistem sumber (onechitranewdb). Tidak bisa ditambah dari sini." }
}

export async function updateCustomerAction(_id: number, _data: unknown) {
  return { success: false, error: "Data customer dikelola di sistem sumber (onechitranewdb). Tidak bisa diedit dari sini." }
}

export async function deleteCustomerAction(_id: number) {
  return { success: false, error: "Data customer dikelola di sistem sumber (onechitranewdb). Tidak bisa dihapus dari sini." }
}

export async function importCustomersCSVAction(_rows: unknown[]) {
  return { success: false, error: "Import tidak tersedia. Data customer bersumber dari onechitranewdb." }
}

export async function syncCustomersFromSAPAction() {
  return { success: true, count: 0, message: "Data customer bersumber langsung dari onechitranewdb (live)." }
}
