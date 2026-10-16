import { redirect } from "next/navigation"

export default function MobileHseInspectionsPage() {
  // Pelaksanaan inspeksi safety dilakukan melalui fitur On the Spot Monitoring (OSM Mobile)
  redirect("/mobile/hse/osm")
}
