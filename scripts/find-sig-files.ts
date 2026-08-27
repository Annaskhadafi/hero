import fs from 'fs'
import path from 'path'
import { db } from '../db'
import { approvals } from '../db/schema/hero'
import { repairFormWo } from '../db/schema/form-wo'
import { eq } from 'drizzle-orm'

async function run() {
  const apprs = await db
    .select()
    .from(approvals)
    .where(eq(approvals.repairFormWoId, 24))
    .orderBy(approvals.level)

  for (const a of apprs) {
    console.log(`\nLevel ${a.level}: ${a.signatureUrl}`)
    if (a.signatureUrl) {
      const candidates = [
        path.join(process.cwd(), 'public', a.signatureUrl.replace(/^\//, '')),
        path.join(process.cwd(), 'public', a.signatureUrl.replace(/^\/api\/uploads\//, 'uploads/')),
        path.join(process.cwd(), 'public', a.signatureUrl.replace(/^\/api\/uploads\//, '')),
        path.join(process.cwd(), 'public', 'uploads', a.signatureUrl.replace(/^\/api\/uploads\//, '')),
        path.join(process.cwd(), 'public', 'uploads', a.signatureUrl.replace(/^\/uploads\//, '')),
        path.join(process.cwd(), a.signatureUrl.replace(/^\//, '')),
      ]
      for (const c of candidates) {
        if (fs.existsSync(c)) {
          console.log(`  FOUND on disk: ${c} (size: ${fs.statSync(c).size} bytes)`)
        }
      }
    }
  }
}

run().catch(console.error)
