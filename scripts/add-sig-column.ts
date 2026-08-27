import { db } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    await db.execute(sql`ALTER TABLE "repair_form_wo" ADD COLUMN IF NOT EXISTS "submitter_signature_url" text`);
    console.log('✅ Column submitter_signature_url added successfully');
  } catch (e: any) {
    console.error('Error:', e.message);
  }
  // Verify
  const result = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'repair_form_wo' ORDER BY ordinal_position`);
  console.log('Columns:', (result as any).rows?.map((r: any) => r.column_name).join(', '));
  process.exit(0);
}
main();
