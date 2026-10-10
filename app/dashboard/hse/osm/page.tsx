import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { getHseOsmDashboardData } from "@/app/actions/hse-osm";
import { OsmClientPage } from "./client-page";

export const metadata = {
  title: "On the Spot Monitoring (OSM) — HSE | HERO",
  description: "Manajemen inspeksi keselamatan lapangan, geotagging temuan bahaya, & pelacakan tindakan korektif.",
};

export default async function HseOsmPage() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const initialData = await getHseOsmDashboardData();

  return <OsmClientPage initialData={initialData} />;
}
