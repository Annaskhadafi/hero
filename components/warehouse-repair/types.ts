export type TableRbacAccess = {
  canView: boolean
  canCreate?: boolean
  canEdit: boolean
  canDelete: boolean
  canSelectAll?: boolean
}

export interface WarehouseRepairType {
  id: number
  typeCode: string
  typeName: string
  isActive: boolean
  stockStatus?: string
  activeStatus?: string
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface WarehouseRepairUnit {
  id: number
  unitCode: string
  unitName: string
  isActive: boolean
  stockStatus?: string
  activeStatus?: string
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface WarehouseRepairItem {
  id: number
  itemCode: string
  itemName: string
  materialDesc?: string | null
  storageLocation?: string | null
  storageLocationDesc?: string | null
  typeId?: number | null
  typeName?: string | null
  minimumStock: number
  stock: number
  unitId?: number | null
  unitName?: string | null
  photoUrl?: string | null
  isActive: boolean
  stockStatus?: string
  activeStatus?: string
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface WarehouseRepairInbound {
  id: number
  transactionNo: string
  transactionDate: string | Date
  itemId: number
  itemCode?: string | null
  itemName?: string | null
  materialDesc?: string | null
  typeName?: string | null
  unitName?: string | null
  targetSLoc?: string | null
  targetSLocDesc?: string | null
  storageLocation?: string | null
  storageLocationDesc?: string | null
  quantity: number
  note?: string | null
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface WarehouseRepairOutbound {
  id: number
  transactionNo: string
  transactionDate: string | Date
  itemId: number
  itemCode?: string | null
  itemName?: string | null
  materialDesc?: string | null
  typeName?: string | null
  unitName?: string | null
  storageLocation?: string | null
  storageLocationDesc?: string | null
  outboundType?: string | null
  destinationSLoc?: string | null
  destinationSLocDesc?: string | null
  quantity: number
  note?: string | null
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface WarehouseRepairMetrics {
  items: number
  lowStock: number
  inbound: number
  outbound: number
  totalStock: number
  [key: string]: number
}

import { DEFAULT_REPAIR_SITES } from "@/lib/repair-master"

export const PRESET_SLOCS = DEFAULT_REPAIR_SITES.map((site) => ({
  code: site.siteCode,
  desc: site.siteName,
}))

export { WarehouseRepairPageShell } from "./shell"

