import { db } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
  const result = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'repair_form_wo' ORDER BY ordinal_position`);
  const rows = (result as any).rows || (result as any)._rows || [];
  const cols = Array.isArray(rows) ? rows.map((r: any) => r.column_name || r.COLUMN_NAME) : [];
  console.log('All columns:', cols.join(', '));
  console.log('Has submitter_signature_url:', cols.includes('submitter_signature_url'));
  
  // Also try a direct select
  try {
    const test = await db.execute(sql`SELECT submitter_signature_url FROM repair_form_wo LIMIT 1`);
    console.log('Direct select works:', true);
  } catch (e: any) {
    console.log('Direct select error:', e.message);
  }
  
  process.exit(0);
}
main();
