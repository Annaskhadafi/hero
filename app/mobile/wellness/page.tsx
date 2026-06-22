import { redirect } from "next/navigation";

import { getServerSession } from "@/lib/auth-session";
import { getMobileHc } from "@/lib/mobile-data";
import MobileWellnessClient from "./client-page";

export default async function MobileWellnessPage() {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");

  const data = await getMobileHc(session.user.email);
  if (!data) return null;

  return <MobileWellnessClient data={data} />;
}
