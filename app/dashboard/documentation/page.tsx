import { redirect } from 'next/navigation'
import { ActivitySystemBlueprintBoard } from '@/components/activity-system-blueprint-board'
import { getServerSession } from '@/lib/auth-session'

export default async function DocumentationPage() {
  const session = await getServerSession()

  if (!session?.user?.email) {
    redirect('/sign-in')
  }

  return <ActivitySystemBlueprintBoard />
}
