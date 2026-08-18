import { db } from '@/db'
import { heroSafetyInductions } from '@/db/schema/safety-induction'
import { desc } from 'drizzle-orm'
import { SafetyInductionClient } from './_components/safety-induction-client'

export const dynamic = 'force-dynamic'

export default async function SafetyInductionDashboard() {
  const inductions = await db
    .select()
    .from(heroSafetyInductions)
    .orderBy(desc(heroSafetyInductions.createdAt))

  return (
    <div className="p-6">
      <SafetyInductionClient initialData={inductions} />
    </div>
  )
}

