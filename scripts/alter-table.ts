import { db } from '../db';
import { sql } from 'drizzle-orm';

db.execute(sql`ALTER TABLE hero_approvals ADD COLUMN IF NOT EXISTS signature_url TEXT;`)
  .then(() => console.log('Column added'))
  .catch(console.error);
