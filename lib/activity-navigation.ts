export const activityMenuLabels = {
  input: "Input Aktivitas Harian",
  teamBoard: "Monitoring Tim & SPL",
  library: "Kamus Aktivitas",
  routes: "Route Template Harian",
  configuration: "Rule Aktivitas Global",
} as const;

export const activityHubTabs = [
  {
    label: activityMenuLabels.input,
    href: "/dashboard/activity-hub/my-day",
  },
  {
    label: activityMenuLabels.teamBoard,
    href: "/dashboard/activity-hub/team-board",
  },
  {
    label: activityMenuLabels.library,
    href: "/dashboard/activity-hub/library",
  },
  {
    label: activityMenuLabels.routes,
    href: "/dashboard/activity-hub/routes",
  },
  {
    label: activityMenuLabels.configuration,
    href: "/dashboard/activity-hub/configuration",
  },
] as const;

export const mobileActivityDrawerItem = {
  label: activityMenuLabels.input,
  href: "/mobile/activity/input",
} as const;

const pagePurposes = {
  input: {
    title: activityMenuLabels.input,
    description:
      "Satu pintu input aktivitas harian. Desktop dan mobile memakai konsep yang sama; bedanya hanya layout sesuai perangkat.",
  },
  teamBoard: {
    title: activityMenuLabels.teamBoard,
    description:
      "Halaman ini untuk monitoring tim, status SPL, dan konteks pekerjaan. Review boleh dilihat di sini, tetapi keputusan resmi tetap di Approval Inbox.",
    primaryAction: {
      label: "Buka Approval Inbox",
      href: "/dashboard/approval",
    },
  },
  library: {
    title: activityMenuLabels.library,
    description:
      "Kamus Aktivitas adalah kamus pekerjaan resmi: nama aktivitas, base point, requirement foto/unit/waktu/remark, dan rule per aktivitas. Master Data hanya untuk site, department, section, jabatan, employee, dan kategori global.",
  },
  routes: {
    title: activityMenuLabels.routes,
    description:
      "Route Template Harian adalah susunan pekerjaan per section, jabatan, site, dan shift dari Kamus Aktivitas. Ini template harian, bukan assignment aktual atau master aktivitas kedua.",
  },
  configuration: {
    title: activityMenuLabels.configuration,
    description:
      "Rule Aktivitas Global dipakai untuk rule global seperti deadline, penalty, cap poin, event multiplier, dan validasi site. Detail pekerjaan tetap dikelola di Kamus Aktivitas.",
  },
} as const;

export function getActivityPagePurpose<Page extends keyof typeof pagePurposes>(page: Page) {
  return pagePurposes[page];
}
