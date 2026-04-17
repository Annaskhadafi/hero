import { FormStudioOverview } from "@/components/form-studio-overview";
import { getFormStudioConsoleData } from "@/lib/approval-blueprint";
import { ensureHeroSeedData } from "@/lib/hero-admin";

export default async function FormStudioPage() {
  await ensureHeroSeedData();
  const data = await getFormStudioConsoleData();
  return <FormStudioOverview data={data} />;
}
