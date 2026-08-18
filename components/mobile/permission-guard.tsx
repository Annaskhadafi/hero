'use client'

import type { ReactNode } from 'react'
import { useMobilePermissions } from '@/components/mobile/permission-provider'
import type { MobileResourcePermission } from '@/lib/mobile-permissions'

type PermissionAction = keyof MobileResourcePermission

export function PermissionGuard({
  resource,
  action = 'canView',
  children,
  fallback = null,
}: {
  resource: string
  action?: PermissionAction
  children: ReactNode
  fallback?: ReactNode
}) {
  const permissions = useMobilePermissions()
  const resourcePermission = permissions[resource]

  if (!resourcePermission) {
    return fallback
  }

  const isAllowed = Boolean(resourcePermission[action])
  
  if (!isAllowed) {
    return fallback
  }

  return <>{children}</>
}

export function usePermissionGuard(resource: string, action: PermissionAction = 'canView') {
  const permissions = useMobilePermissions()
  const resourcePermission = permissions[resource]
  
  if (!resourcePermission) return false
  
  return Boolean(resourcePermission[action])
}
