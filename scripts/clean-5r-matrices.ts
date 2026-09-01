import { db } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Executing direct SQL delete for bloated 5R matrices...');

  await db.execute(sql`
    DELETE FROM hero_approval_matrix_steps 
    WHERE matrix_id IN (
      SELECT id FROM hero_approval_matrices 
      WHERE transaction_type IN ('five_r_report', 'five-r-report', 'quality-report-5r')
    );
  `);

  await db.execute(sql`
    DELETE FROM hero_approval_matrices 
    WHERE transaction_type IN ('five_r_report', 'five-r-report', 'quality-report-5r');
  `);

  console.log('✅ Bloated 5R matrices deleted cleanly in single batch!');
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
