'use server'

import {
  assignMaestroRole,
  createMaestroCustomerUser,
  deleteMaestroCustomerUser,
  getMaestroUserManagementData,
  grantMaestroSiteAccess,
  registerMaestroCustomerUser,
  saveMaestroVisibilityPolicy,
  updateMaestroCustomerUser,
} from '@/lib/maestro-admin'

export async function getMaestroUserManagementDataAction() {
  return getMaestroUserManagementData()
}

export async function registerMaestroCustomerUserAction(input: {
  email: string
  name: string
  password: string
  customerCode: string
  roleCode: string
  locationIds: number[]
}) {
  return registerMaestroCustomerUser(input)
}

export async function createMaestroCustomerUserAction(input: {
  email: string
  name: string
  password: string
  customerId: number
}) {
  return createMaestroCustomerUser(input)
}

export async function assignMaestroRoleAction(userId: string, roleCode: string) {
  return assignMaestroRole(userId, roleCode)
}

export async function grantMaestroSiteAccessAction(input: {
  userId: string
  customerId: number
  siteId: number
}) {
  return grantMaestroSiteAccess(input)
}

export async function saveMaestroVisibilityPolicyAction(
  customerId: number,
  policy: Parameters<typeof saveMaestroVisibilityPolicy>[1],
) {
  return saveMaestroVisibilityPolicy(customerId, policy)
}

export async function updateMaestroCustomerUserAction(input: {
  userId: string
  name: string
  email: string
  password?: string
  customerCode: string
  roleCode: string
  locationIds: number[]
  isActive: boolean
}) {
  return updateMaestroCustomerUser(input)
}

export async function deleteMaestroCustomerUserAction(userId: string) {
  return deleteMaestroCustomerUser(userId)
}

