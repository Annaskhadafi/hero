import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";

export default async function MobileMenuPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  redirect("/mobile/dashboard");
}
