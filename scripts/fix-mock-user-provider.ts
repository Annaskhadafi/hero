import { db } from '../db';
import { account, user } from '../db/schema/auth';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('Fixing providerId for E2E mock user...');
  const [existingUser] = await db.select().from(user).where(eq(user.email, 'employee@hero.com')).limit(1);
  if (existingUser) {
    await db.update(account)
      .set({ providerId: 'credential' })
      .where(eq(account.userId, existingUser.id));
    console.log('Successfully updated providerId to "credential"');
  } else {
    console.log('User employee@hero.com not found');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
