import { myDaySummary } from "@/lib/activity-hub-data";
import { approvalSummary } from "@/lib/approval-data";
import { timesheetSummary } from "@/lib/timesheet-data";
import { dailyReportSections, dailyReportSummary } from "@/lib/daily-report-data";
import { pointsProfile, siteLeaderboard } from "@/lib/points-data";
import { hseSummary } from "@/lib/hse-data";
import { hcSummary } from "@/lib/hc-data";

const attendanceRate =
  hcSummary.activeHeadcount > 0
    ? `${Math.round((hcSummary.presentToday / hcSummary.activeHeadcount) * 100)}%`
    : "0%";

export const analyticsOverview = {
  site: dailyReportSummary.site,
  date: dailyReportSummary.date,
  jobsCompleted: myDaySummary.jobsCompleted,
  jobsAssigned: myDaySummary.jobsAssigned,
  pendingApprovals: approvalSummary.waitingLevel1 + approvalSummary.waitingLevel2,
  overtimeHours: timesheetSummary.overtimeHours,
  reportReady: `${dailyReportSections.length}/${dailyReportSections.length} section ready`,
  hseStatus: hseSummary.zeroIncidentDays,
  attendanceRate,
};

export const analyticsKpis = [
  {
    label: "Aktivitas selesai",
    value: `${analyticsOverview.jobsCompleted}/${analyticsOverview.jobsAssigned}`,
    note: "Job harian tim site",
  },
  {
    label: "Pending approval",
    value: `${analyticsOverview.pendingApprovals}`,
    note: "Level 1 + Level 2",
  },
  {
    label: "Jam lembur",
    value: `${analyticsOverview.overtimeHours}`,
    note: "Dari timesheet minggu ini",
  },
  {
    label: "Report readiness",
    value: analyticsOverview.reportReady,
    note: "Siap generate ke customer",
  },
] as const;

export const analyticsSections = [
  {
    title: "Operations snapshot",
    value: `${myDaySummary.jobsCompleted} pekerjaan selesai`,
    detail: `Masih ada ${myDaySummary.jobsAssigned - myDaySummary.jobsCompleted} pekerjaan aktif di shift ini.`,
    route: "/dashboard/activity-hub/team-board",
  },
  {
    title: "Approval bottleneck",
    value: `${approvalSummary.escalated} item eskalasi`,
    detail: `${approvalSummary.waitingLevel1} item menunggu foreman dan ${approvalSummary.waitingLevel2} item menunggu PJO.`,
    route: "/dashboard/approval",
  },
  {
    title: "Payroll support",
    value: timesheetSummary.overtimeCost,
    detail: `${timesheetSummary.approvedEmployees} karyawan sudah ready payroll.`,
    route: "/dashboard/timesheet",
  },
  {
    title: "Daily report",
    value: dailyReportSummary.hseStatus,
    detail: `${dailyReportSummary.jobsCompleted} aktivitas siap masuk laporan customer.`,
    route: "/dashboard/reports",
  },
  {
    title: "HSE control",
    value: `${hseSummary.openObservations} open observations`,
    detail: `${hseSummary.patrolCompleted} patrol selesai dan APD compliance ${hseSummary.apdCompliance}.`,
    route: "/dashboard/hse",
  },
  {
    title: "People status",
    value: `${hcSummary.presentToday}/${hcSummary.activeHeadcount} hadir`,
    detail: `${hcSummary.expiringCertificates} sertifikat hampir habis dan fit-for-work ${hcSummary.fitForWorkRate}.`,
    route: "/dashboard/hc",
  },
] as const;

export const analyticsHighlights = [
  {
    label: "Top performer site",
    value: siteLeaderboard[0]
      ? `${siteLeaderboard[0].name} • ${siteLeaderboard[0].points} poin`
      : "Belum ada data",
  },
  {
    label: "Employee momentum",
    value:
      pointsProfile.name === "-"
        ? "Belum ada data"
        : `${pointsProfile.name} butuh ${pointsProfile.pointsToNextLevel} poin lagi ke ${pointsProfile.nextLevel}`,
  },
  {
    label: "Attendance trend",
    value: `${analyticsOverview.attendanceRate} hadir hari ini`,
  },
] as const;
