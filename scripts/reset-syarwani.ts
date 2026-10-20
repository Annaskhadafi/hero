import { db } from '../db';
import { heroEmployees } from '../db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  await db.update(heroEmployees).set({
    faceEmbedding: null,
    faceRegisteredAt: null,
    faceRarayId: null,
    faceRarayRegisteredAt: null,
  }).where(eq(heroEmployees.employeeSn, '62949'));
  console.log('Achmad Syarwani (62949) face data reset successfully');

  const [emp] = await db.select().from(heroEmployees).where(eq(heroEmployees.employeeSn, '62949'));
  console.log('Current state:', {
    name: emp?.name,
    faceRegisteredAt: emp?.faceRegisteredAt,
    faceRarayRegisteredAt: emp?.faceRarayRegisteredAt,
  });

  process.exit(0);
}

main().catch(console.error);
