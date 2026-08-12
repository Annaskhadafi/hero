import { redirect } from "next/navigation";

export default function MobileForecastRootPage() {
  redirect("/mobile/central-service/forecast/daily");
}
