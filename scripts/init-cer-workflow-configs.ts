import { sql } from 'drizzle-orm';
import { db } from '../db';
import { cerWorkflowConfigs } from '../db/schema/cer';

async function main() {
  console.log('Creating hero_cer_workflow_configs table if not exists...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hero_cer_workflow_configs (
      id SERIAL PRIMARY KEY,
      it_spv_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
      budget_validator_employee_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      finance_check_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
      director_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
      auto_skip_empty_hierarchy BOOLEAN NOT NULL DEFAULT true,
      is_testing_mode BOOLEAN NOT NULL DEFAULT true,
      testing_recipient_email TEXT NOT NULL DEFAULT 'gilang.suryo@chitraparatama.co.id',
      updated_by_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  console.log('Checking existing config row via Drizzle...');
  const [existing] = await db.select().from(cerWorkflowConfigs).limit(1);
  if (!existing) {
    console.log('Inserting default configuration for CER Workflow...');
    await db.insert(cerWorkflowConfigs).values({
      itSpvEmployeeId: 962,
      budgetValidatorEmployeeIds: [1341, 960],
      financeCheckEmployeeId: 990,
      directorEmployeeId: null,
      autoSkipEmptyHierarchy: true,
      isTestingMode: true,
      testingRecipientEmail: 'gilang.suryo@chitraparatama.co.id',
    });
    console.log('Default config inserted successfully.');
  } else {
    console.log('Config already exists:', existing);
  }
}

main().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
