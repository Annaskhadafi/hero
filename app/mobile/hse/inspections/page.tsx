import { redirect } from "next/navigation"
import { getSafetyInspections } from "@/app/actions/safety-inspections"
import { MobileHseInspectionsClient } from "@/components/mobile/mobile-hse-inspections-client"
import { getServerSession } from "@/lib/auth-session"

export default async function MobileHseInspectionsPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect("/sign-in")

  const inspections = await getSafetyInspections()

  const categories = Array.from(new Set(inspections.map(i => i.category).filter(Boolean)))
  const pics = Array.from(new Set(inspections.map(i => i.picName).filter(Boolean)))

  return (
    <MobileHseInspectionsClient
      inspections={inspections}
      categories={categories}
      pics={pics}
      currentUser={session?.user?.name ?? ""}
    />
  )
}
