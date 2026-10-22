import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { getHseOsmDashboardData, getHseOsmSessions } from "@/app/actions/hse-osm";
import { OsmClientPage } from "./client-page";

export const metadata = {
  title: "OSM list — HSE | HERO",
  description: "Daftar monitoring inspeksi keselamatan On the Spot Monitoring (OSM), temuan bahaya, & pelacakan tindakan korektif.",
};

export default async function HseOsmPage() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const [initialData, sessionsRes] = await Promise.all([
    getHseOsmDashboardData(),
    getHseOsmSessions({ limit: 50 }),
  ]);
  const initialSessions = sessionsRes.success && sessionsRes.data ? sessionsRes.data : [];

  return <OsmClientPage initialData={{ ...(initialData as any), sessions: initialSessions }} />;
}
