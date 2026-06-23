import { getDatabaseUrl } from '../lib/database-url';
import { Pool } from 'pg';

const url = getDatabaseUrl();
const pool = new Pool({ connectionString: url });

async function main() {
  console.log('=== Current FK constraint on hero_hc_letters ===');
  const before = await pool.query(`
    SELECT tc.constraint_name, ccu.table_schema, ccu.table_name AS ref_table, ccu.column_name AS ref_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'hero_hc_letters' AND tc.constraint_type = 'FOREIGN KEY'
  `);
  console.log(JSON.stringify(before.rows, null, 2));

  console.log('\n=== Dropping old FK ===');
  await pool.query('ALTER TABLE "hero_hc_letters" DROP CONSTRAINT IF EXISTS "hero_hc_letters_employee_id_hero_hr_employees_id_fk"');
  console.log('Old FK dropped.');

  console.log('\n=== Adding new FK referencing hero_employees ===');
  await pool.query('ALTER TABLE "hero_hc_letters" ADD CONSTRAINT "hero_hc_letters_employee_id_hero_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hero_employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION');
  console.log('New FK added.');

  console.log('\n=== Verification ===');
  const after = await pool.query(`
    SELECT tc.constraint_name, ccu.table_schema, ccu.table_name AS ref_table, ccu.column_name AS ref_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'hero_hc_letters' AND tc.constraint_type = 'FOREIGN KEY'
  `);
  console.log(JSON.stringify(after.rows, null, 2));

  await pool.end();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
