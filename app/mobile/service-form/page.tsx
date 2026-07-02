import { ArrowLeft, FileSignature } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { ServiceFormWorkspace } from '@/components/service-forms/service-form-workspace'
import { getServerSession } from '@/lib/auth-session'

export default async function MobileServiceFormPage() {
  const session = await getServerSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/mobile/dashboard"
          className="flex size-9 items-center justify-center rounded-xl bg-white text-[#003f78] shadow-sm active:scale-[0.96]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#e9f6fd] text-[#003f78]">
            <FileSignature className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black tracking-tight text-[#003461]">
              Service Form
            </h1>
            <p className="text-[10px] font-bold tracking-wider text-[#486275] uppercase">
              Service 360
            </p>
          </div>
        </div>
      </div>

      <ServiceFormWorkspace mobile />
    </div>
  )
}
