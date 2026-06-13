import { redirect } from "next/navigation"
import { db } from "@/db"
import { heroSafetyInductions } from "@/db/schema/safety-induction"
import { desc } from "drizzle-orm"
import { MobileHseInductionClient } from "@/components/mobile/mobile-hse-induction-client"
import { getServerSession } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export default async function MobileHseInductionPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect("/sign-in")

  const inductions = await db
    .select()
    .from(heroSafetyInductions)
    .orderBy(desc(heroSafetyInductions.createdAt))

  return <MobileHseInductionClient inductions={inductions} />
}
