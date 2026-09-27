import { redirect } from 'next/navigation'
import { getMaestroServerSession } from '@/lib/maestro-session'

export const dynamic = 'force-dynamic'

export default async function MaestroRootPage() {
  const session = await getMaestroServerSession()
  if (session) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
