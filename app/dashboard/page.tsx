import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { getSidebarDataForUser } from "@/lib/hero-admin";

export default async function DashboardPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  const sidebar = await getSidebarDataForUser(session.user.email)

  // Flatten all items including sub-items (items with children)
  const allItems = [...sidebar.navMain, ...sidebar.navSecondary, ...sidebar.documents]
  const allUrls: string[] = []
  for (const item of allItems) {
    if (item.url && item.url !== '/dashboard') allUrls.push(item.url)
    if ('items' in item && Array.isArray(item.items)) {
      for (const sub of item.items) {
        if (sub.url && sub.url !== '/dashboard') allUrls.push(sub.url)
      }
    }
  }

  const firstAllowedPage = allUrls[0]
  if (firstAllowedPage) redirect(firstAllowedPage)

  // Fallback: user is authenticated but has no menu permissions assigned
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="text-4xl">🔒</div>
      <h1 className="text-xl font-semibold text-foreground">Tidak Ada Akses Menu</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        Akun Anda belum memiliki role atau izin menu yang aktif.
        Hubungi administrator untuk mengatur hak akses Anda.
      </p>
      <p className="text-xs text-muted-foreground">
        Login sebagai: <span className="font-mono">{session.user.email}</span>
      </p>
    </div>
  )
}

