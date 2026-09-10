"use client"

import { useMemo } from "react"

export type ActionType = "view" | "create" | "edit" | "delete"

export type UserPermissions = {
  permissions?: string[]
  isSuperAdmin?: boolean
}

export function usePermissions(userPermissions?: UserPermissions) {
  // Ponytail: Standardized client-side RBAC hook for One Chitra
  // Naming format: 'resource:action' (e.g. 'customers:edit', 'sales-orders:view')
  const hasResourcePermission = useMemo(
    () => (resource: string, action: ActionType = "view"): boolean => {
      if (!userPermissions) return false
      if (userPermissions.isSuperAdmin) return true
      if (!userPermissions.permissions) return false

      const requiredPermission = `${resource}:${action}`
      return (
        userPermissions.permissions.includes(requiredPermission) ||
        userPermissions.permissions.includes(`${resource}:*`) ||
        userPermissions.permissions.includes("*")
      )
    },
    [userPermissions]
  )

  const hasPermission = useMemo(
    () => (permission: string): boolean => {
      if (!userPermissions) return false
      if (userPermissions.isSuperAdmin) return true
      if (!userPermissions.permissions) return false

      return userPermissions.permissions.includes(permission)
    },
    [userPermissions]
  )

  return {
    hasResourcePermission,
    hasPermission,
  }
}
