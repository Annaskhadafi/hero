import { getDailyActivityApprovalData } from '@/app/dashboard/activity-hub/actions'
import { getEmployeesForContract } from '@/app/actions/employee'
import { getOrgChartData } from '@/app/actions/org-chart'
import { DailyActivityApprovalForm } from '@/components/daily-activity-approval-form'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import {
  activityLibraries,
  activityRouteGroups,
  activityRouteItems,
  activityRouteTemplates,
} from '@/db/schema/hero'
import { asc, eq } from 'drizzle-orm'
import type { RouteFolder } from '@/lib/daily-activity'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Approval Daily Activity - HERO',
}

export default async function DailyActivityApprovalPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const session = await getServerSession()
  const { sessionId } = await params
  const sessionIdNum = Number(sessionId)

  const [
    data,
    employeesRaw,
    orgNodes,
    libraryList,
    routeTemplateRows,
    routeGroupRows,
    routeItemRows,
  ] = await Promise.all([
    getDailyActivityApprovalData(sessionIdNum, session?.user?.email || 'chitra.operation.hero@gmail.com'),
    getEmployeesForContract(),
    getOrgChartData(),
    db
      .select({
        id: activityLibraries.id,
        code: activityLibraries.activityCode,
        name: activityLibraries.activityName,
        basePoints: activityLibraries.basePoints,
        category: activityLibraries.category,
        requiresPhoto: activityLibraries.requiresPhoto,
        requiresEquipmentNo: activityLibraries.requiresEquipmentNo,
        requiresDuration: activityLibraries.requiresDuration,
        requiresLocationGps: activityLibraries.requiresLocationGps,
        requiresTireCount: activityLibraries.requiresTireCount,
        requiresMaterialUsed: activityLibraries.requiresMaterialUsed,
      })
      .from(activityLibraries)
      .where(eq(activityLibraries.isActive, true))
      .orderBy(asc(activityLibraries.activityCode)),
    db
      .select({
        id: activityRouteTemplates.id,
        routeCode: activityRouteTemplates.routeCode,
        routeName: activityRouteTemplates.routeName,
      })
      .from(activityRouteTemplates)
      .where(eq(activityRouteTemplates.isActive, true))
      .orderBy(asc(activityRouteTemplates.routeName)),
    db
      .select({
        id: activityRouteGroups.id,
        routeTemplateId: activityRouteGroups.routeTemplateId,
        groupKey: activityRouteGroups.groupKey,
        groupName: activityRouteGroups.groupName,
        sortOrder: activityRouteGroups.sortOrder,
      })
      .from(activityRouteGroups)
      .orderBy(asc(activityRouteGroups.sortOrder), asc(activityRouteGroups.id)),
    db
      .select({
        id: activityRouteItems.id,
        routeGroupId: activityRouteItems.routeGroupId,
        libraryActivityId: activityRouteItems.libraryActivityId,
        itemCode: activityRouteItems.itemCode,
        itemLabel: activityRouteItems.itemLabel,
        sortOrder: activityRouteItems.sortOrder,
      })
      .from(activityRouteItems)
      .orderBy(asc(activityRouteItems.sortOrder), asc(activityRouteItems.id)),
  ])

  if (!data) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-bold text-slate-800">Dokumen Daily Activity tidak ditemukan</h2>
        <p className="text-sm text-slate-500 mt-1">Sesi aktivitas dengan ID {sessionId} tidak ada atau sudah dihapus.</p>
      </div>
    )
  }

  const itemsByGroupId = new Map<number, any[]>()
  for (const item of routeItemRows || []) {
    const list = itemsByGroupId.get(item.routeGroupId) || []
    list.push(item)
    itemsByGroupId.set(item.routeGroupId, list)
  }

  const groupsByTemplateId = new Map<number, any[]>()
  for (const group of routeGroupRows || []) {
    const list = groupsByTemplateId.get(group.routeTemplateId) || []
    list.push({
      id: group.id,
      groupName: group.groupName,
      items: itemsByGroupId.get(group.id) || [],
    })
    groupsByTemplateId.set(group.routeTemplateId, list)
  }

  const availableRouteFolders: RouteFolder[] = (routeTemplateRows || [])
    .map((t) => ({
      id: t.id,
      routeCode: t.routeCode,
      routeName: t.routeName,
      groups: groupsByTemplateId.get(t.id) || [],
    }))
    .filter((t) => t.groups.length > 0)

  const sanitizedPresets = (libraryList || []).map((l) => ({
    id: Number(l.id),
    code: l.code || '',
    name: l.name || '',
    basePoints: Number(l.basePoints) || 0,
    category: l.category || 'General',
    requiresPhoto: Boolean(l.requiresPhoto),
    requiresEquipmentNo: Boolean(l.requiresEquipmentNo),
    requiresDuration: Boolean(l.requiresDuration),
    requiresLocationGps: Boolean(l.requiresLocationGps),
    requiresTireCount: Boolean(l.requiresTireCount),
    requiresMaterialUsed: Boolean(l.requiresMaterialUsed),
  }))

  const employees = employeesRaw.map((e) => ({
    id: e.id,
    name: e.fullName,
    employeeSn: e.employeeId,
    jobTitle: e.jobTitle,
    department: e.departmentName,
    section: e.sectionName,
  }))

  return (
    <DailyActivityApprovalForm
      data={data as any}
      employees={employees}
      orgNodes={orgNodes}
      activityPresets={sanitizedPresets}
      routeFolders={availableRouteFolders}
    />
  )
}
