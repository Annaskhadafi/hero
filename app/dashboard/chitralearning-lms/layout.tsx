import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { LmsSidebarNav } from '@/components/lms/lms-sidebar-nav'
import { AdminPageShell } from '@/components/admin-page-shell'

export const metadata = {
  title: 'ChitraLearning LMS | HERO',
}

export default async function LmsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Define admin access logic - this could be refined based on actual roles
  const { isLmsAdmin, canManageLmsSection } = await import('@/lib/chitralearning-lms')
  const isAdmin = (await isLmsAdmin(session)) || (await canManageLmsSection())

  return (
    <AdminPageShell title="ChitraLearning LMS">
      <div data-lms-shell className="flex flex-col md:flex-row gap-6 items-start w-full -mx-3 md:-mx-3 lg:-mx-5 xl:-mx-6 pt-2">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-60 flex-shrink-0 relative z-10">
          <LmsSidebarNav isAdmin={isAdmin} />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 w-full min-w-0">
          {children}
        </main>
      </div>
    </AdminPageShell>
  )
}
