import { redirect } from "next/navigation";
import { getCurrentMenuPermission } from "@/lib/hero-access";

export default async function MobileForecastRootPage() {
  const permission = await getCurrentMenuPermission("cs-forecast");
  if (!permission.canView) {
    redirect("/mobile/dashboard");
  }
  redirect("/mobile/central-service/forecast/daily");
}
