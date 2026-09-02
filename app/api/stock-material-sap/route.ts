import { NextRequest, NextResponse } from "next/server"
import { sql } from "drizzle-orm"

import { db } from "@/db"
import { normalizeSloc, normalizedSlocSql } from "@/lib/sloc"
import { getServerSession } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

const STOCK_MATERIAL_SAP_FALLBACK_URL =
  process.env.STOCK_MATERIAL_SAP_FALLBACK_URL ?? "https://one.chitraparatama.com/api/stocks-sap-new"

type Zmc9StockSapRow = {
  stock_id: number
  plant_code: string | null
  plant_name: string | null
  material_no: string | null
  old_material_no: string | null
  material_desc: string | null
  stor_loc: string | null
  stor_loc_desc: string | null
  total_stock: string | number | null
  base_unit_of_measure: string | null
  value_stock: string | number | null
  currency: string | null
  extracted_at: Date | string | null
  updated_at?: Date | string | null
}

function buildFallbackUrl(searchParams: URLSearchParams) {
  const params = new URLSearchParams({
    page: searchParams.get("page") || "1",
    pageSize: searchParams.get("pageSize") || "100",
    search: searchParams.get("search") || "",
    plant: "all",
    slocDesc: searchParams.get("slocDesc") || "",
    warehouseType: "repair-2002",
  })

  return `${STOCK_MATERIAL_SAP_FALLBACK_URL}?${params.toString()}`
}

async function fetchFallbackStockMaterialSap(searchParams: URLSearchParams) {
  const response = await fetch(buildFallbackUrl(searchParams), {
    cache: "no-store",
    headers: { accept: "application/json" },
  })

  const payload = await response.json()

  if (!response.ok) {
    throw new Error(`Fallback One Chitra stock SAP gagal: HTTP ${response.status}`)
  }

  return NextResponse.json({
    ...payload,
    source: "one-chitra-fallback",
  })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ status: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)

  try {
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "100")
    const search = searchParams.get("search") || ""
    const slocDesc = searchParams.get("slocDesc") || ""
    const getAll = searchParams.get("all") === "true"
    const offset = (page - 1) * pageSize

    let whereClause = sql`plant_code = '2002'`
    const normalizedStorLoc = normalizedSlocSql(sql`stor_loc`)

    if (search) {
      const searchPattern = `%${search.toLowerCase()}%`
      whereClause = sql`${whereClause} AND (
        LOWER(material_no) LIKE ${searchPattern} OR
        LOWER(material_desc) LIKE ${searchPattern} OR
        LOWER(old_material_no) LIKE ${searchPattern} OR
        LOWER(${normalizedStorLoc}) LIKE ${searchPattern}
      )`
    }

    if (slocDesc) {
      whereClause = sql`${whereClause} AND LOWER(stor_loc_desc) LIKE ${`%${slocDesc.toLowerCase()}%`}`
    }

    const statsResult = await db.execute(sql`
      SELECT
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE COALESCE(total_stock, 0) <= 0) as out_of_stock_count,
        SUM(COALESCE(value_stock, 0)) as total_value
      FROM public.zmc9_stock_sap
      WHERE ${whereClause}
    `)

    const totalCount = Number(statsResult.rows[0].count)
    const outOfStockCount = Number(statsResult.rows[0].out_of_stock_count || 0)
    const totalValue = Number(statsResult.rows[0].total_value || 0)

    const query = getAll
      ? sql`
          SELECT * FROM public.zmc9_stock_sap
          WHERE ${whereClause}
          ORDER BY stock_id DESC
        `
      : sql`
          SELECT * FROM public.zmc9_stock_sap
          WHERE ${whereClause}
          ORDER BY stock_id DESC
          LIMIT ${pageSize} OFFSET ${offset}
        `

    const result = await db.execute(query)

    const rows = (result.rows as Zmc9StockSapRow[]).map((row) => ({
      stockId: Number(row.stock_id),
      plantCode: row.plant_code ?? "",
      plantName: row.plant_name ?? "",
      materialNo: row.material_no ?? "",
      oldMaterialNo: row.old_material_no ?? "",
      materialDesc: row.material_desc ?? "",
      storLoc: normalizeSloc(row.stor_loc),
      storLocDesc: row.stor_loc_desc ?? "",
      totalStock: Number(row.total_stock ?? 0),
      baseUnitOfMeasure: row.base_unit_of_measure ?? "",
      valueStock: Number(row.value_stock ?? 0),
      currency: row.currency ?? "",
      extractedAt: row.extracted_at ? new Date(row.extracted_at).toISOString() : null,
      updatedAt: (row.updated_at ?? row.extracted_at) ? new Date(row.updated_at ?? row.extracted_at ?? "").toISOString() : null,
    }))

    return NextResponse.json({
      status: "OK",
      result: rows,
      stats: {
        totalCount,
        outOfStockCount,
        totalValue,
      },
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    })
  } catch (error) {
    console.warn("HERO zmc9_stock_sap unavailable, using One Chitra fallback:", error)

    try {
      return await fetchFallbackStockMaterialSap(searchParams)
    } catch (fallbackError) {
      console.error("Failed to fetch Repair Warehouse stock material SAP fallback:", fallbackError)
      return NextResponse.json(
        {
          status: "ERROR",
          message: "Failed to fetch Repair Warehouse stock material SAP from HERO database and One Chitra fallback.",
        },
        { status: 500 },
      )
    }
  }
}
