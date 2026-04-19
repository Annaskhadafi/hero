import { redirect } from "next/navigation";
import { MobileHseClient } from "@/components/mobile/mobile-hse-client";
import { getServerSession } from "@/lib/auth-session";
import { getMobileHse } from "@/lib/mobile-data";

export default async function MobileHsePage() {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");

  const data = await getMobileHse(session.user.email);
  if (!data) return null;

  return <MobileHseClient data={data} />;
}
