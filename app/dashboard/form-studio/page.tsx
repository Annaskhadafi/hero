import { FormStudioOverview } from "@/components/form-studio-overview";
import { getFormStudioConsoleData } from "@/lib/approval-blueprint";
import { ensureHeroSeedData } from "@/lib/hero-admin";
import { listFormTemplates } from "@/lib/form-service";
import { FormStudioClient } from "@/components/form-studio-client";

export default async function FormStudioPage() {
  await ensureHeroSeedData();
  const [data, customForms] = await Promise.all([
    getFormStudioConsoleData(),
    listFormTemplates(),
  ]);

  return <FormStudioClient blueprintData={data} customForms={customForms} />;
}
