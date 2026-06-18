import { redirect } from "next/navigation";

export const metadata = { title: "Email Templates - HC Settings" };

export default async function HcEmailTemplatesPage() {
  redirect("/dashboard/settings/email");
}
