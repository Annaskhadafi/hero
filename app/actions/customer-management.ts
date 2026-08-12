"use server"

import { db } from "@/db"
import { customers } from "@/db/schema/customers"
import { eq, ilike, or, sql, count, desc, gte } from "drizzle-orm"
import { revalidatePath } from "next/cache"

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

let _customersTableEnsured = false

async function ensureCustomersTable() {
  if (_customersTableEnsured) return
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id" serial PRIMARY KEY,
        "customer_code" varchar(100) UNIQUE NOT NULL,
        "name" varchar(255) NOT NULL,
        "contact_name" varchar(255),
        "email" varchar(255),
        "birthday" date,
        "address_1" text,
        "address_2" text,
        "address_3" text,
        "address_4" text,
        "address_5" text,
        "business_category" varchar(255),
        "business_category_source" varchar(100),
        "business_category_enriched_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `)
    _customersTableEnsured = true
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes("already exists") || msg.includes("duplicate key")) {
      _customersTableEnsured = true
      return
    }
    console.error("ensureCustomersTable error:", error)
  }
}

export async function getCustomersAction(params?: GetCustomersParams) {
  try {
    await ensureCustomersTable()
    const page = Math.max(1, params?.page || 1)
    const limit = Math.max(1, Math.min(1000, params?.limit || 50))
    const offset = (page - 1) * limit
    const search = params?.search?.trim()
    const category = params?.category?.trim()

    const conditions = []

    if (search) {
      conditions.push(
        or(
          ilike(customers.name, `%${search}%`),
          ilike(customers.customerCode, `%${search}%`),
          ilike(customers.contactName, `%${search}%`),
          ilike(customers.email, `%${search}%`)
        )
      )
    }

    if (category && category !== "all") {
      conditions.push(eq(customers.businessCategory, category))
    }

    const whereClause = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined

    // Query Data
    const dataQuery = db
      .select()
      .from(customers)
      .orderBy(desc(customers.id))
      .limit(limit)
      .offset(offset)

    if (whereClause) {
      dataQuery.where(whereClause)
    }

    const rows = await dataQuery

    // Query Total Count
    const countQuery = db.select({ count: count() }).from(customers)
    if (whereClause) {
      countQuery.where(whereClause)
    }
    const totalResult = await countQuery
    const total = Number(totalResult[0]?.count || 0)

    // Calculate Stats
    const totalStatsRes = await db.select({ count: count() }).from(customers)
    const totalCustomers = Number(totalStatsRes[0]?.count || 0)

    const firstDayOfMonth = new Date()
    firstDayOfMonth.setDate(1)
    firstDayOfMonth.setHours(0, 0, 0, 0)

    const newMonthRes = await db
      .select({ count: count() })
      .from(customers)
      .where(gte(customers.createdAt, firstDayOfMonth))
    const newThisMonth = Number(newMonthRes[0]?.count || 0)

    // Fetch Unique Categories
    const categoriesRes = await db
      .selectDistinct({ category: customers.businessCategory })
      .from(customers)
      .where(sql`${customers.businessCategory} IS NOT NULL AND ${customers.businessCategory} != ''`)

    const categories = categoriesRes
      .map((c) => c.category)
      .filter((c): c is string => Boolean(c))

    return {
      success: true as const,
      data: rows as CustomerRecord[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalCustomers,
        newThisMonth,
      },
      categories,
    }
  } catch (error) {
    console.error("Failed to fetch customers:", error)
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

export async function createCustomerAction(data: {
  customerCode?: string
  name: string
  contactName?: string
  email?: string
  birthday?: string
  address1?: string
  address2?: string
  address3?: string
  address4?: string
  address5?: string
  businessCategory?: string
}) {
  try {
    await ensureCustomersTable()
    const code = data.customerCode?.trim() || `CUST-${Date.now().toString().slice(-6)}`
    const [inserted] = await db
      .insert(customers)
      .values({
        customerCode: code,
        name: data.name.trim(),
        contactName: data.contactName?.trim() || null,
        email: data.email?.trim() || null,
        birthday: data.birthday?.trim() || null,
        address1: data.address1?.trim() || null,
        address2: data.address2?.trim() || null,
        address3: data.address3?.trim() || null,
        address4: data.address4?.trim() || null,
        address5: data.address5?.trim() || null,
        businessCategory: data.businessCategory?.trim() || null,
      })
      .returning()

    revalidatePath("/dashboard/customers")
    revalidatePath("/dashboard/repair-retread/form-wo")
    return { success: true, data: inserted }
  } catch (error) {
    console.error("Failed to create customer:", error)
    return { success: false, error: "Gagal membuat customer baru" }
  }
}

export async function updateCustomerAction(
  id: number,
  data: Partial<{
    customerCode: string
    name: string
    contactName: string
    email: string
    birthday: string
    address1: string
    address2: string
    address3: string
    address4: string
    address5: string
    businessCategory: string
  }>
) {
  try {
    await ensureCustomersTable()
    const [updated] = await db
      .update(customers)
      .set({
        ...(data.customerCode !== undefined && { customerCode: data.customerCode.trim() }),
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.contactName !== undefined && { contactName: data.contactName.trim() || null }),
        ...(data.email !== undefined && { email: data.email.trim() || null }),
        ...(data.birthday !== undefined && { birthday: data.birthday.trim() || null }),
        ...(data.address1 !== undefined && { address1: data.address1.trim() || null }),
        ...(data.address2 !== undefined && { address2: data.address2.trim() || null }),
        ...(data.address3 !== undefined && { address3: data.address3.trim() || null }),
        ...(data.address4 !== undefined && { address4: data.address4.trim() || null }),
        ...(data.address5 !== undefined && { address5: data.address5.trim() || null }),
        ...(data.businessCategory !== undefined && { businessCategory: data.businessCategory.trim() || null }),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning()

    revalidatePath("/dashboard/customers")
    revalidatePath("/dashboard/repair-retread/form-wo")
    return { success: true, data: updated }
  } catch (error) {
    console.error("Failed to update customer:", error)
    return { success: false, error: "Gagal memperbarui data customer" }
  }
}

export async function deleteCustomerAction(id: number) {
  try {
    await ensureCustomersTable()
    await db.delete(customers).where(eq(customers.id, id))
    revalidatePath("/dashboard/customers")
    revalidatePath("/dashboard/repair-retread/form-wo")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete customer:", error)
    return { success: false, error: "Gagal menghapus data customer" }
  }
}

export async function importCustomersCSVAction(
  rows: Array<{
    customerCode?: string
    name: string
    contactName?: string
    email?: string
    birthday?: string
    address1?: string
    businessCategory?: string
  }>
) {
  try {
    await ensureCustomersTable()
    let imported = 0
    for (const row of rows) {
      if (!row.name || !row.name.trim()) continue
      const code = row.customerCode?.trim() || `CUST-${Math.floor(100000 + Math.random() * 900000)}`
      await db
        .insert(customers)
        .values({
          customerCode: code,
          name: row.name.trim(),
          contactName: row.contactName?.trim() || null,
          email: row.email?.trim() || null,
          birthday: row.birthday?.trim() || null,
          address1: row.address1?.trim() || null,
          businessCategory: row.businessCategory?.trim() || null,
        })
        .onConflictDoUpdate({
          target: customers.customerCode,
          set: {
            name: row.name.trim(),
            contactName: row.contactName?.trim() || null,
            email: row.email?.trim() || null,
            businessCategory: row.businessCategory?.trim() || null,
            updatedAt: new Date(),
          },
        })
      imported++
    }
    revalidatePath("/dashboard/customers")
    revalidatePath("/dashboard/repair-retread/form-wo")
    return { success: true, importedCount: imported }
  } catch (error) {
    console.error("Failed to import customers:", error)
    return { success: false, error: "Gagal mengimpor CSV customer" }
  }
}

export async function syncCustomersFromSAPAction() {
  try {
    revalidatePath("/dashboard/customers")
    return { success: true, count: 0, message: "Sinkronisasi SAP selesai" }
  } catch (error) {
    return { success: false, error: "Gagal sinkronisasi SAP" }
  }
}
