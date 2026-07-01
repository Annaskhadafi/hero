import { NextResponse } from "next/server"
import { db } from "@/db"
import { sql } from "drizzle-orm"

export async function GET() {
  try {
    await db.execute(sql`ALTER TABLE "hero_service360_items" ADD COLUMN IF NOT EXISTS "job_title" text;`)
    return NextResponse.json({ success: true, message: "Column added" })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
