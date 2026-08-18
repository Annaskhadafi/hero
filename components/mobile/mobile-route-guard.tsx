'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { usePermissionGuard } from '@/components/mobile/permission-guard'
import Link from 'next/link'

export function MobileRouteGuard({
  resource,
  children,
}: {
  resource: string
  children: ReactNode
}) {
  const isAllowed = usePermissionGuard(resource, 'canView')
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null // or loading spinner
  }

  if (!isAllowed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#082033]/45 px-5 backdrop-blur-sm">
        <div className="w-full max-w-[360px] rounded-[1.5rem] bg-white p-5 text-center shadow-[0_24px_80px_rgba(8,32,51,0.24)]">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#fff4e8] text-[#5a2200]">
            <ShieldAlert className="size-6" />
          </div>
          <h2 className="mt-4 text-lg font-black tracking-tight text-[#082033]">
            Anda tidak memiliki akses
          </h2>
          <p className="mt-2 text-sm leading-6 font-semibold text-[#486275]">
            Halaman ini dibatasi untuk role tertentu. Hubungi admin untuk membuka akses.
          </p>
          <Link
            prefetch={false}
            href="/mobile/dashboard"
            className="mt-5 flex h-12 items-center justify-center rounded-xl bg-[#003f78] text-xs font-black tracking-[0.12em] text-white uppercase active:scale-[0.98]"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
