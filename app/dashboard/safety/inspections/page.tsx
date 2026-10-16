import { redirect } from "next/navigation"

export default function SafetyInspectionsPage() {
  // Fitur Safety Inspection lama dialihkan ke OSM List (Hero Desktop)
  redirect("/dashboard/hse/osm")
}
