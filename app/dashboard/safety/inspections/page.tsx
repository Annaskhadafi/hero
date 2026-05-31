import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getSafetyInspections } from "@/app/actions/safety-inspections"
import { InspectionClient } from "@/components/safety-inspections/inspection-client"
import { buildSignedAttachmentPath } from "@/lib/safety-attachment-token"

export default async function SafetyInspectionsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const inspections = await getSafetyInspections()

  // Pre-sign same-origin proxy URLs for each attachment so images load via a
  // self-contained token (no cookie/DB dependency at image request time).
  const inspectionsWithAttachments = inspections.map((inspection) => ({
    ...inspection,
    reportAttachmentSignedUrl: buildSignedAttachmentPath(inspection.reportAttachmentUrl),
    resultAttachmentSignedUrl: buildSignedAttachmentPath(inspection.resultAttachmentUrl),
  }))

  // Extract unique categories and PICs from the existing data to populate the comboboxes
  const categories = Array.from(new Set(inspections.map(i => i.category).filter(Boolean)))
  const pics = Array.from(new Set(inspections.map(i => i.picName).filter(Boolean)))

  // Add some default categories if list is empty
  const defaultCategories = categories.length > 0 ? categories : ["Lingkungan", "Peralatan", "APD", "Housekeeping", "Prosedur"]

  return <InspectionClient inspections={inspectionsWithAttachments} categories={defaultCategories} pics={pics} currentUser={session?.user?.name ?? ""} />
}
