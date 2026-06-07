import { getHcEmailTemplates } from "@/app/actions/hc-email-templates";
import { HcEmailTemplatesClient } from "./client-page";

export const metadata = { title: "Email Templates - HC Settings" };

export default async function HcEmailTemplatesPage() {
  const templates = await getHcEmailTemplates();
  return <HcEmailTemplatesClient initialTemplates={templates} />;
}
