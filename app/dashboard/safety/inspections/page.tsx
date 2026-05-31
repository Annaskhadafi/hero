import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getSafetyInspections } from "@/app/actions/safety-inspections"
import { InspectionClient } from "@/components/safety-inspections/inspection-client"

export default async function SafetyInspectionsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const inspections = await getSafetyInspections()
  
  // Extract unique categories and PICs from the existing data to populate the comboboxes
  const categories = Array.from(new Set(inspections.map(i => i.category).filter(Boolean)))
  const pics = Array.from(new Set(inspections.map(i => i.picName).filter(Boolean)))

  // Add some default categories if list is empty
  const defaultCategories = categories.length > 0 ? categories : ["Lingkungan", "Peralatan", "APD", "Housekeeping", "Prosedur"]

  return <InspectionClient inspections={inspections} categories={defaultCategories} pics={pics} currentUser={session?.user?.name ?? ""} />
}
