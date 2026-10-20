import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { getHseOsmDashboardData } from "@/app/actions/hse-osm";
import { MobileHseOsmClient } from "@/components/mobile/mobile-hse-osm-client";

export const metadata = {
  title: "On the Spot Monitoring (OSM) Mobile | HERO HSE",
  description: "Aplikasi lapangan On the Spot Monitoring HSE KPC Standard.",
};

export default async function MobileHseOsmPage() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const initialData = await getHseOsmDashboardData();

  return <MobileHseOsmClient initialData={initialData} />;
}
