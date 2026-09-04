import { db } from '../db';
import { sql } from 'drizzle-orm';

db.execute(sql`ALTER TABLE hero_hse_ptw_permits ADD COLUMN IF NOT EXISTS additional_notes TEXT NOT NULL DEFAULT '';`)
  .then(() => {
    console.log('Column additional_notes added to hero_hse_ptw_permits successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

