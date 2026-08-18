'use client'

import { createContext, useContext, ReactNode } from 'react'
import type { MobilePermissionsMap } from '@/lib/mobile-permissions'

const MobilePermissionContext = createContext<MobilePermissionsMap>({})

export function MobilePermissionProvider({
  permissions,
  children,
}: {
  permissions: MobilePermissionsMap
  children: ReactNode
}) {
  return (
    <MobilePermissionContext.Provider value={permissions}>
      {children}
    </MobilePermissionContext.Provider>
  )
}

export function useMobilePermissions() {
  return useContext(MobilePermissionContext)
}
