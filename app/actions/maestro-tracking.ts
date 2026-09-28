'use server'

import { and, asc, desc, eq, inArray, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { salesOrders, salesOrderItems } from '@/db/schema/sales-orders'
import { deliveries } from '@/db/schema/deliveries'
import { products } from '@/db/schema/products'
import { warehouses } from '@/db/schema/warehouses'
import { evhsVouchers, evhsVoucherItems } from '@/db/schema/evhs'
import {
  cargoManifests,
  cargoManifestItems,
  cargoMasterSites,
  masterSections,
  employees,
} from '@/db/schema/hero'
import { getMaestroServerSession } from '@/lib/maestro-session'

export interface MaestroCargoManifestItem {
  id: number
  manifestNumber: string
  date: string
  siteId: number | null
  siteName: string | null
  sectionId: number | null
  sectionName: string | null
  attention: string
  transportVia: string
  shippedVia: string
  finalDestination: string
  signatureName: string
  signatureDataUrl: string
  status: string
  createdByName: string | null
  createdAt: string
  items: Array<{
    id: number
    no: number
    description: string
    serialNumber: string
    qty: number
    brand: string
    remark: string
  }>
}

export interface MaestroPoItem {
  id: number
  customerPo: string
  invoiceNumber: string
  salesDate: string
  status: string
  categoryProduct: string | null
  tripDestination: string | null
  notes: string | null
  totalItems: number
  totalQty: number
  totalAmount: number
  items: Array<{
    id: number
    description: string
    quantity: number
    unitPrice: string
    partNumber?: string
  }>
  deliveries: Array<{
    id: number
    deliveryNumber: string | null
    doSap: string | null
    status: string
    scheduledDate: string
    deliveryDate: string | null
  }>
}

export interface MaestroDeliveryItem {
  id: number
  deliveryNumber: string
  doSap: string | null
  customerPo: string
  scheduledDate: string
  deliveryDate: string | null
  status: string
  deliveryType: string
  driverName: string | null
  vehicleNumber: string | null
  vendorName: string | null
  awbNumber: string | null
  shippingAddress: string | null
  doStatus: string | null
  scanDoDocument: string | null
  notes: string | null
}

export interface MaestroVhsUsageItem {
  id: number
  vhsNo: string
  woNo: string | null
  date: string
  warehouseName: string
  status: string
  mrkoStatus: string | null
  totalQty: number
  items: Array<{
    id: number
    productName: string
    serialNumber: string | null
    unitId: string | null
    pos: string | null
    qty: number
  }>
}

export interface MaestroTrackingData {
  customerName: string
  customerCode: string | null
  kpis: {
    totalManifest: number
    sentManifest: number
    deliveredManifest: number
    totalPo: number
    completedPo: number
    inTransitDeliveries: number
    receivedDeliveries: number
    totalTiresDelivered: number
  }
  cargoManifests: MaestroCargoManifestItem[]
  poList: MaestroPoItem[]
  deliveriesList: MaestroDeliveryItem[]
  vhsList: MaestroVhsUsageItem[]
}

export async function getMaestroTrackingDataAction(filters?: {
  status?: string
  search?: string
}): Promise<{ success: boolean; data?: MaestroTrackingData; error?: string }> {
  try {
    const session = await getMaestroServerSession()
    if (!session) {
      return { success: false, error: 'Sesi MAESTRO tidak ditemukan atau kedaluwarsa.' }
    }

    const { customer, access } = session
    const customerId = customer.id

    // 1. Query Cargo Manifests from HERO
    const manifestRows = await db
      .select({
        id: cargoManifests.id,
        manifestNumber: cargoManifests.manifestNumber,
        date: cargoManifests.date,
        siteId: cargoManifests.siteId,
        siteName: cargoMasterSites.siteName,
        sectionId: cargoManifests.sectionId,
        sectionName: masterSections.name,
        attention: cargoManifests.attention,
        transportVia: cargoManifests.transportVia,
        shippedVia: cargoManifests.shippedVia,
        finalDestination: cargoManifests.finalDestination,
        signatureName: cargoManifests.signatureName,
        signatureDataUrl: cargoManifests.signatureDataUrl,
        status: cargoManifests.status,
        createdByEmployeeId: cargoManifests.createdByEmployeeId,
        createdByName: employees.name,
        createdAt: cargoManifests.createdAt,
      })
      .from(cargoManifests)
      .leftJoin(employees, eq(cargoManifests.createdByEmployeeId, employees.id))
      .leftJoin(cargoMasterSites, eq(cargoManifests.siteId, cargoMasterSites.id))
      .leftJoin(masterSections, eq(cargoManifests.sectionId, masterSections.id))
      .orderBy(desc(cargoManifests.createdAt))
      .limit(60)

    const manifestIds = manifestRows.map((m) => m.id)
    const itemsByManifest = new Map<number, any[]>()

    if (manifestIds.length > 0) {
      const cItems = await db
        .select()
        .from(cargoManifestItems)
        .where(inArray(cargoManifestItems.manifestId, manifestIds))
        .orderBy(asc(cargoManifestItems.no))

      for (const item of cItems) {
        if (!itemsByManifest.has(item.manifestId)) {
          itemsByManifest.set(item.manifestId, [])
        }
        itemsByManifest.get(item.manifestId)!.push({
          id: item.id,
          no: item.no,
          description: item.description,
          serialNumber: item.serialNumber,
          qty: item.qty,
          brand: item.brand,
          remark: item.remark,
        })
      }
    }

    const cargoManifestList: MaestroCargoManifestItem[] = manifestRows.map((row) => ({
      id: row.id,
      manifestNumber: row.manifestNumber,
      date: typeof row.date === 'string' ? row.date : (row.date as any).toISOString().slice(0, 10),
      siteId: row.siteId,
      siteName: row.siteName,
      sectionId: row.sectionId,
      sectionName: row.sectionName,
      attention: row.attention,
      transportVia: row.transportVia,
      shippedVia: row.shippedVia,
      finalDestination: row.finalDestination,
      signatureName: row.signatureName,
      signatureDataUrl: row.signatureDataUrl,
      status: row.status,
      createdByName: row.createdByName,
      createdAt: row.createdAt.toISOString(),
      items: itemsByManifest.get(row.id) ?? [],
    }))

    // 2. Query Sales Orders for this customer
    const poRows = await db
      .select({
        id: salesOrders.id,
        customerPo: salesOrders.customerPo,
        invoiceNumber: salesOrders.invoiceNumber,
        salesDate: salesOrders.salesDate,
        status: salesOrders.status,
        categoryProduct: salesOrders.categoryProduct,
        tripDestination: salesOrders.tripDestination,
        notes: salesOrders.notes,
        createdAt: salesOrders.createdAt,
      })
      .from(salesOrders)
      .where(eq(salesOrders.customerId, customerId))
      .orderBy(desc(salesOrders.salesDate))
      .limit(60)

    const poIds = poRows.map((p) => p.id)
    const itemsByPo = new Map<number, any[]>()
    const deliveriesByPo = new Map<number, any[]>()

    if (poIds.length > 0) {
      // Fetch PO Items
      const itemRows = await db
        .select({
          id: salesOrderItems.id,
          salesOrderId: salesOrderItems.salesOrderId,
          description: salesOrderItems.description,
          quantity: salesOrderItems.quantity,
          unitPrice: salesOrderItems.unitPrice,
          productId: salesOrderItems.productId,
          productName: products.materialDescription,
          partNumber: products.materialNumber,
        })
        .from(salesOrderItems)
        .leftJoin(products, eq(salesOrderItems.productId, products.id))
        .where(inArray(salesOrderItems.salesOrderId, poIds))

      for (const item of itemRows) {
        if (!itemsByPo.has(item.salesOrderId)) {
          itemsByPo.set(item.salesOrderId, [])
        }
        itemsByPo.get(item.salesOrderId)!.push({
          id: item.id,
          description: item.description || item.productName || 'Ban / Material',
          quantity: item.quantity,
          unitPrice: String(item.unitPrice || '0'),
          partNumber: item.partNumber || undefined,
        })
      }

      // Fetch Deliveries for these POs
      const delRows = await db
        .select({
          id: deliveries.id,
          salesOrderId: deliveries.salesOrderId,
          deliveryNumber: deliveries.deliveryNumber,
          doSap: deliveries.doSap,
          status: deliveries.status,
          scheduledDate: deliveries.scheduledDate,
          deliveryDate: deliveries.deliveryDate,
          deliveryType: deliveries.deliveryType,
          driverName: deliveries.driverName,
          vehicleNumber: deliveries.vehicleNumber,
          vendorName: deliveries.vendorName,
          awbNumber: deliveries.awbNumber,
          shippingAddress: deliveries.shippingAddress,
          doStatus: deliveries.doStatus,
          scanDoDocument: deliveries.scanDoDocument,
          notes: deliveries.notes,
        })
        .from(deliveries)
        .where(inArray(deliveries.salesOrderId, poIds))
        .orderBy(desc(deliveries.scheduledDate))

      for (const del of delRows) {
        if (!deliveriesByPo.has(del.salesOrderId)) {
          deliveriesByPo.set(del.salesOrderId, [])
        }
        deliveriesByPo.get(del.salesOrderId)!.push(del)
      }
    }

    const allDeliveries: MaestroDeliveryItem[] = []
    const poList: MaestroPoItem[] = poRows.map((po) => {
      const items = itemsByPo.get(po.id) || []
      const dels = deliveriesByPo.get(po.id) || []

      const totalQty = items.reduce((sum, it) => sum + (it.quantity || 0), 0)
      const totalAmount = items.reduce(
        (sum, it) => sum + (it.quantity || 0) * parseFloat(it.unitPrice || '0'),
        0,
      )

      for (const d of dels) {
        allDeliveries.push({
          id: d.id,
          deliveryNumber: d.deliveryNumber || `DO-${d.id}`,
          doSap: d.doSap,
          customerPo: po.customerPo || po.invoiceNumber || '-',
          scheduledDate: d.scheduledDate.toISOString(),
          deliveryDate: d.deliveryDate ? d.deliveryDate.toISOString() : null,
          status: d.status || 'scheduled',
          deliveryType: d.deliveryType || 'full',
          driverName: d.driverName,
          vehicleNumber: d.vehicleNumber,
          vendorName: d.vendorName,
          awbNumber: d.awbNumber,
          shippingAddress: d.shippingAddress,
          doStatus: d.doStatus,
          scanDoDocument: d.scanDoDocument,
          notes: d.notes,
        })
      }

      return {
        id: po.id,
        customerPo: po.customerPo || po.invoiceNumber || `PO-${po.id}`,
        invoiceNumber: po.invoiceNumber || '-',
        salesDate: po.salesDate.toISOString(),
        status: po.status || 'draft',
        categoryProduct: po.categoryProduct,
        tripDestination: po.tripDestination,
        notes: po.notes,
        totalItems: items.length,
        totalQty,
        totalAmount,
        items,
        deliveries: dels.map((d) => ({
          id: d.id,
          deliveryNumber: d.deliveryNumber,
          doSap: d.doSap,
          status: d.status,
          scheduledDate: d.scheduledDate.toISOString(),
          deliveryDate: d.deliveryDate ? d.deliveryDate.toISOString() : null,
        })),
      }
    })

    // 3. Query eVHS usage for consignment warehouses linked to this customer
    const vhsRows = await db
      .select({
        id: evhsVouchers.id,
        vhsNo: evhsVouchers.vhsNo,
        woNo: evhsVouchers.woNo,
        date: evhsVouchers.date,
        status: evhsVouchers.status,
        mrkoStatus: evhsVouchers.mrkoStatus,
        warehouseSloc: warehouses.sloc,
        warehouseDesc: warehouses.description,
      })
      .from(evhsVouchers)
      .leftJoin(warehouses, eq(evhsVouchers.warehouseId, warehouses.id))
      .where(eq(warehouses.customerId, customerId))
      .orderBy(desc(evhsVouchers.date))
      .limit(30)

    const vhsIds = vhsRows.map((v) => v.id)
    const itemsByVhs = new Map<number, any[]>()

    if (vhsIds.length > 0) {
      const vItems = await db
        .select({
          id: evhsVoucherItems.id,
          voucherId: evhsVoucherItems.voucherId,
          qty: evhsVoucherItems.qty,
          serialNumber: evhsVoucherItems.serialNumber,
          unitId: evhsVoucherItems.unitId,
          pos: evhsVoucherItems.pos,
          productName: products.materialDescription,
        })
        .from(evhsVoucherItems)
        .leftJoin(products, eq(evhsVoucherItems.productId, products.id))
        .where(inArray(evhsVoucherItems.voucherId, vhsIds))

      for (const it of vItems) {
        if (!itemsByVhs.has(it.voucherId)) {
          itemsByVhs.set(it.voucherId, [])
        }
        itemsByVhs.get(it.voucherId)!.push({
          id: it.id,
          productName: it.productName || 'Tire Unit',
          serialNumber: it.serialNumber,
          unitId: it.unitId,
          pos: it.pos,
          qty: it.qty,
        })
      }
    }

    const vhsList: MaestroVhsUsageItem[] = vhsRows.map((vhs) => {
      const itms = itemsByVhs.get(vhs.id) || []
      const totalQty = itms.reduce((sum, i) => sum + (i.qty || 0), 0)
      return {
        id: vhs.id,
        vhsNo: vhs.vhsNo,
        woNo: vhs.woNo,
        date: typeof vhs.date === 'string' ? vhs.date : (vhs.date as any).toISOString().slice(0, 10),
        warehouseName: vhs.warehouseDesc || vhs.warehouseSloc || 'Site Consignment Warehouse',
        status: vhs.status,
        mrkoStatus: vhs.mrkoStatus,
        totalQty,
        items: itms,
      }
    })

    // Calculate KPIs
    const totalManifest = cargoManifestList.length
    const sentManifest = cargoManifestList.filter((m) => m.status === 'sent').length
    const deliveredManifest = cargoManifestList.filter((m) => m.status === 'delivered').length
    const totalPo = poList.length
    const completedPo = poList.filter((p) => p.status === 'completed' || p.status === 'delivered').length
    const inTransitDeliveries = allDeliveries.filter(
      (d) => d.status === 'in_transit' || d.status === 'scheduled' || d.status === 'on_delivery',
    ).length
    const receivedDeliveries = allDeliveries.filter(
      (d) => d.status === 'delivered' || d.status === 'completed' || d.doStatus === 'Received',
    ).length
    const totalTiresDelivered = poList.reduce((sum, p) => sum + p.totalQty, 0)

    return {
      success: true,
      data: {
        customerName: customer.name,
        customerCode: customer.customerCode,
        kpis: {
          totalManifest,
          sentManifest,
          deliveredManifest,
          totalPo,
          completedPo,
          inTransitDeliveries,
          receivedDeliveries,
          totalTiresDelivered,
        },
        cargoManifests: cargoManifestList,
        poList,
        deliveriesList: allDeliveries,
        vhsList,
      },
    }
  } catch (err: unknown) {
    console.error('[MAESTRO] Error fetching tracking data:', err)
    const message = err instanceof Error ? err.message : 'Gagal memuat data PO & Delivery Tracking.'
    return { success: false, error: message }
  }
}
