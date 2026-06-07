import { getHcEmailTemplates, ensureDefaultTemplates } from "@/app/actions/hc-email-templates";
import { HcEmailTemplatesClient } from "./client-page";

export const metadata = { title: "Email Templates - HC Settings" };

export default async function HcEmailTemplatesPage() {
  let templates = await getHcEmailTemplates();
  if (templates.length === 0) {
    await ensureDefaultTemplates();
    templates = await getHcEmailTemplates();
  }
  return <HcEmailTemplatesClient initialTemplates={templates} />;
}
