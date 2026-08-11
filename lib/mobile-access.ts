import type { getSidebarDataForUser } from '@/lib/hero-admin'

export type MobileSidebarItem = NonNullable<
  Awaited<ReturnType<typeof getSidebarDataForUser>>
>['navMain'][number]

export type MobileAllowedLink = {
  href: string
  resource?: string | null
}

export const MOBILE_ALWAYS_ALLOWED_HREFS = [
  '/mobile',
  '/mobile/dashboard',
  '/mobile/menu',
  '/mobile/notifications',
  '/mobile/profile',
  '/mobile/information',
] as const

const desktopToMobileRoutes: Array<{ desktop: string; mobile: string }> = [
  { desktop: '/dashboard/apd', mobile: '/mobile/apd' },
  { desktop: '/dashboard/activity-hub/my-day', mobile: '/mobile/activity/input' },
  { desktop: '/dashboard/activity-hub', mobile: '/mobile/activity' },
  { desktop: '/dashboard/overtime-requests', mobile: '/mobile/overtime' },
  { desktop: '/dashboard/overtime', mobile: '/mobile/overtime' },
  { desktop: '/dashboard/timesheet', mobile: '/mobile/timesheet' },
  { desktop: '/dashboard/scheduling-timesheet', mobile: '/mobile/timesheet' },
  { desktop: '/dashboard/approval', mobile: '/mobile/approval' },
  { desktop: '/dashboard/360-service/service-form', mobile: '/mobile/service-form' },
  { desktop: '/dashboard/curhat', mobile: '/mobile/curhat' },
  { desktop: '/dashboard/hr-counseling', mobile: '/mobile/hr-counseling' },
  { desktop: '/dashboard/safety/data', mobile: '/mobile/hse/safety-data' },
  { desktop: '/dashboard/safety/inspections', mobile: '/mobile/hse/inspections' },
  { desktop: '/dashboard/safety', mobile: '/mobile/hse/safety-data' },
  { desktop: '/dashboard/hse/checklist-generator', mobile: '/mobile/hse/checklist' },
  { desktop: '/dashboard/hse/incident-report', mobile: '/mobile/hse/incident-report' },
  { desktop: '/dashboard/hse/hiradc', mobile: '/mobile/hse/hiradc' },
  { desktop: '/dashboard/hse/inventaris', mobile: '/mobile/hse/inventaris' },
  { desktop: '/dashboard/hse/jsa', mobile: '/mobile/hse/jsa' },
  { desktop: '/dashboard/hse/izin-kerja-ptw', mobile: '/mobile/hse/ptw' },
  { desktop: '/dashboard/hse/sia-sio-tools-certification', mobile: '/mobile/hse/sia-sio-tools' },
  { desktop: '/dashboard/hse/tire-inspection', mobile: '/mobile/hse/tire-inspection' },
  { desktop: '/dashboard/reports/road-condition', mobile: '/mobile/reports/road-condition' },
  {
    desktop: '/dashboard/central-service/site-condition',
    mobile: '/mobile/reports/road-condition',
  },
  { desktop: '/dashboard/hse', mobile: '/mobile/hse' },
  { desktop: '/dashboard/safety-induction', mobile: '/mobile/hse/induction' },
  { desktop: '/dashboard/gamification', mobile: '/mobile/gamification' },
  { desktop: '/dashboard/leaderboard', mobile: '/mobile/gamification' },
  { desktop: '/dashboard/wellness', mobile: '/mobile/wellness' },
  { desktop: '/dashboard/hc/mcu-wellness', mobile: '/mobile/wellness' },
  { desktop: '/dashboard/executive', mobile: '/mobile/executive' },
  { desktop: '/dashboard/cargo-manifest', mobile: '/mobile/cargo-manifest' },
  { desktop: '/dashboard/security/roles', mobile: '/mobile/security/roles' },
  { desktop: '/dashboard/reports', mobile: '/mobile/reports' },
  { desktop: '/dashboard/hc/training', mobile: '/mobile/training' },
  { desktop: '/dashboard/training-records', mobile: '/mobile/training' },
  { desktop: '/dashboard/hc/permission', mobile: '/mobile/attendance/permission' },
  { desktop: '/dashboard/attendance', mobile: '/mobile/attendance' },
  { desktop: '/dashboard/chitralearning-lms', mobile: '/mobile/chitralearning' },
  { desktop: '/dashboard/central-service/assets', mobile: '/mobile/central-service/assets' },
  { desktop: '/dashboard/central-service/forecast/daily', mobile: '/mobile/central-service/forecast/daily' },
  { desktop: '/dashboard/central-service/forecast/report', mobile: '/mobile/central-service/forecast/report' },
  { desktop: '/dashboard/central-service/forecast', mobile: '/mobile/central-service/forecast' },
  { desktop: '/dashboard/hc/leader-performance', mobile: '/mobile/leader-performance' },
]

const fallbackMobileSegments = new Set([
  'activity',
  'approval',
  'assets',
  'attendance',
  'cargo-manifest',
  'curhat',
  'executive',
  'forecast',
  'central-service',
  'gamification',
  'hr-counseling',
  'hse',
  'hiradc',
  'incident-report',
  'induction',
  'inspections',
  'inventaris',
  'chitralearning',
  'lms',
  'notifications',
  'overtime',
  'profile',
  'reports',
  'road-condition',
  'site-condition',
  'timesheet',
  'training',
  'wellness',
  'leader-performance',
  'permission',
  'checklist',
  'corrective-action',
  'jsa',
  'observasi-emergency',
  'ptw',
  'safety-data',
  'service-form',
  'sia-sio-tools',
  'tire-inspection',
])

export function getMobileUrlForDesktopUrl(desktopUrl: string): string | null {
  if (!desktopUrl) return null
  if (desktopUrl.startsWith('/mobile')) return desktopUrl.split('?')[0]

  const cleanUrl = desktopUrl.split('?')[0]
  const matchedRoute = desktopToMobileRoutes.find(
    (route) => cleanUrl === route.desktop || cleanUrl.startsWith(`${route.desktop}/`)
  )
  if (matchedRoute) return matchedRoute.mobile

  const segments = cleanUrl.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1]

  if (fallbackMobileSegments.has(lastSegment)) {
    return `/mobile/${lastSegment}`
  }

  return null
}

export function buildMobileAllowedLinks(items: MobileSidebarItem[]): MobileAllowedLink[] {
  const links = new Map<string, MobileAllowedLink>()

  for (const href of MOBILE_ALWAYS_ALLOWED_HREFS) {
    links.set(href, { href })
  }

  for (const item of items) {
    const href = getMobileUrlForDesktopUrl(item.url || '')
    if (!href) continue
    links.set(href, { href, resource: item.resource })
  }

  return Array.from(links.values())
}

export function isMobileHrefAllowed(href: string, allowedLinks: MobileAllowedLink[]) {
  const targetPath = href.split('?')[0]
  if (MOBILE_ALWAYS_ALLOWED_HREFS.some((allowedHref) => targetPath === allowedHref)) return true

  return allowedLinks.some((link) => {
    const allowedPath = link.href.split('?')[0]
    return targetPath === allowedPath || targetPath.startsWith(`${allowedPath}/`)
  })
}
