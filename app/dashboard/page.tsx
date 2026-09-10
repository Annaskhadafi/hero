import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { getSidebarDataForUser } from "@/lib/hero-admin";

export default async function DashboardPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')
  const sidebar = await getSidebarDataForUser(session.user.email)
  const firstAllowedPage = [...sidebar.navMain, ...sidebar.navSecondary, ...sidebar.documents]
    .map((item) => item.url)
    .find((url) => url && url !== '/dashboard')
  if (firstAllowedPage) redirect(firstAllowedPage)
  return null
}
