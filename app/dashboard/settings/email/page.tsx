import { redirect } from "next/navigation";
import { getCurrentMenuPermission } from "@/lib/hero-access";
import {
  BarChart3,
  Bell,
  CalendarClock,
  FileSpreadsheet,
  FileText,
  HeartHandshake,
  History,
  Mail,
  RadioTower,
  Server,
  ShieldAlert,
  Smartphone,
  Users,
  Wrench,
  XCircle,
} from "lucide-react";
import { EmailDeliveryLogTable } from "@/components/email-delivery-log-table";
import { HseSafetyNotificationSettingsPanel } from "@/components/hse-safety-notification-settings-panel";
import { ApdNotificationSettingsPanel } from "@/components/apd-notification-settings-panel";
import { ApdSummaryNotificationSettingsPanel } from "@/components/apd-summary-notification-settings-panel";
import { MaritalStatusNotificationSettingsPanel } from "@/components/marital-status-notification-settings-panel";
import { HumanCapitalNotificationSettingsPanel } from "@/components/human-capital-notification-settings-panel";
import { AttendanceNotificationSettingsPanel } from "@/components/attendance-notification-settings-panel";
import { FormWoNotificationSettingsPanel } from "@/components/form-wo-notification-settings-panel";
import { MinePermitReminderSettingsPanel } from "@/components/mine-permit-reminder-settings-panel";
import { CsForecastDailyReportSettingsPanel } from "@/components/cs-forecast-daily-report-settings-panel";
import { EmailSmtpSettingsPanel } from "@/components/email-smtp-settings-panel";
import { EmailTemplateSettingsPanel } from "@/components/email-template-settings-panel";
import { PwaPushSettingsPanel } from "@/components/pwa-push-settings-panel";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getNotificationCenterData } from "@/lib/approval-blueprint";
import { getServerSession } from "@/lib/auth-session";
import {
  getEmailDeliveryLogsData,
  getEmailSmtpSettingsData,
  getEmailTemplatesData,
  getHseSafetyNotificationConfigData,
  getAttendanceNotificationConfigData,
  getHumanCapitalNotificationConfigData,
  getCsForecastDailyReportConfigData,
  getActiveEmployeesForSelect,
  getPwaPushSettingsData,
  getApdNotificationConfigData,
  getApdSummaryNotificationConfigData,
  getMaritalStatusNotificationConfigData,
  getFormWoNotificationConfigData,
} from "@/lib/hero-admin";

const bellRules = [

  {
    label: "Approval assignment",
    event: "approval_assignment",
    target: "Approver",
    priority: "approval",
    active: true,
  },
  {
    label: "Delegation handover",
    event: "delegation_created",
    target: "Delegate",
    priority: "delegation",
    active: true,
  },
  {
    label: "Escalation alert",
    event: "approval_escalation",
    target: "Manager",
    priority: "escalation",
    active: true,
  },
  {
    label: "Before due reminder",
    event: "before_due",
    target: "Requester + Approver",
    priority: "before_due",
    active: true,
  },
];

const pwaRules = [
  { label: "Push approval urgent", audience: "Approver aktif", trigger: "SLA < 2 jam", active: true },
  { label: "Push escalation", audience: "Manager site", trigger: "Lewat SLA", active: true },
  { label: "Push daily report ready", audience: "PJO + Admin", trigger: "Report siap kirim", active: false },
];

function CompactMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="rounded-lg p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[0.65rem] font-semibold uppercase text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 font-display text-2xl font-semibold leading-none">{value}</p>
        </div>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
          <Icon className="size-4" />
        </span>
      </div>
    </Card>
  );
}

export default async function EmailSettingsPage() {
  const access = await getCurrentMenuPermission("settings_email");
  if (!access.canView) {
    redirect("/dashboard");
  }

  const [logs, notifications, smtpSettings, templates, pwaPushSettings, hseSafetyConfig, apdSummaryConfig, maritalStatusConfig, attendanceConfig, humanCapitalConfig, csForecastConfig, apdConfig, formWoConfig, employees, session] = await Promise.all([
    getEmailDeliveryLogsData(),
    getNotificationCenterData(),
    getEmailSmtpSettingsData(),
    getEmailTemplatesData(),
    getPwaPushSettingsData(),
    getHseSafetyNotificationConfigData(),
    getApdSummaryNotificationConfigData(),
    getMaritalStatusNotificationConfigData(),
    getAttendanceNotificationConfigData(),
    getHumanCapitalNotificationConfigData(),
    getCsForecastDailyReportConfigData(),
    getApdNotificationConfigData(),
    getFormWoNotificationConfigData(),
    getActiveEmployeesForSelect(),
    getServerSession(),
  ]);

  const pending = logs.filter((log) => log.status === "pending").length;
  const failed = logs.filter((log) => log.status === "failed").length;
  const sent = logs.filter((log) => log.status === "sent" || log.status === "delivered").length;
  const bellDeliveries = notifications.deliveries.filter(
    (delivery) => delivery.deliveryChannel === "in_app",
  );
  const pwaDeliveries = notifications.deliveries.filter(
    (delivery) => delivery.deliveryChannel === "pwa_push" || delivery.deliveryChannel === "push",
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-border/70 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <span className="inline-flex h-7 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold uppercase text-muted-foreground shadow-sm">
            <Mail className="size-3.5 text-primary" />
            System Controls
          </span>
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-normal text-foreground sm:text-3xl">
            Email Settings
          </h1>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <CompactMetric icon={Mail} label="Email sent" value={sent} />
        <CompactMetric icon={XCircle} label="Failed" value={failed} />
        <CompactMetric icon={History} label="Pending" value={pending} />
        <CompactMetric icon={FileText} label="Templates" value={templates.length} />
        <CompactMetric icon={Bell} label="Bell logs" value={bellDeliveries.length} />
        <CompactMetric icon={Smartphone} label="PWA push" value={pwaDeliveries.length} />
      </div>

      <Tabs defaultValue="smtp" className="space-y-4">
        <TabsList className="h-auto w-full inline-flex items-center justify-start gap-1 overflow-x-auto p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/80 shadow-2xs scrollbar-none">
          <TabsTrigger
            value="smtp"
            className="shrink-0 gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
          >
            <Server className="size-3.5" />
            <span>SMTP</span>
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="shrink-0 gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
          >
            <FileText className="size-3.5" />
            <span>Template</span>
            <Badge className="ml-1 h-5 px-1.5 rounded-full border-0 bg-slate-200/80 text-[10px] font-bold text-slate-700">
              {templates.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="form-wo"
            className="shrink-0 gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
          >
            <Wrench className="size-3.5" />
            <span>Form WO Approval</span>
          </TabsTrigger>
          <TabsTrigger
            value="hse"
            className="shrink-0 gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
          >
            <ShieldAlert className="size-3.5" />
            <span>HSE Safety</span>
          </TabsTrigger>
          <TabsTrigger
            value="apd-summary"
            className="shrink-0 gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="size-3.5" />
            <span>Summary APD</span>
          </TabsTrigger>
          <TabsTrigger
            value="marital-status"
            className="shrink-0 gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
          >
            <HeartHandshake className="size-3.5" />
            <span>Perubahan Status</span>
          </TabsTrigger>
          <TabsTrigger
            value="hc"
            className="shrink-0 gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
          >
            <Users className="size-3.5" />
            <span>Human Capital</span>
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            className="shrink-0 gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
          >
            <CalendarClock className="size-3.5" />
            <span>Izin Absensi</span>
          </TabsTrigger>
          <TabsTrigger
            value="apd"
            className="shrink-0 gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
          >
            <Users className="size-3.5" />
            <span>APD & CS</span>
          </TabsTrigger>
          <TabsTrigger
            value="mine-permit"
            className="shrink-0 gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
          >
            <Users className="size-3.5" />
            <span>Mine Permit</span>
          </TabsTrigger>
          <TabsTrigger
            value="cs-forecast"
            className="shrink-0 gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
          >
            <BarChart3 className="size-3.5" />
            <span>CS Forecast</span>
          </TabsTrigger>
          <TabsTrigger
            value="bell"
            className="shrink-0 gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
          >
            <Bell className="size-3.5" />
            <span>Bell</span>
          </TabsTrigger>
          <TabsTrigger
            value="pwa"
            className="shrink-0 gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
          >
            <Smartphone className="size-3.5" />
            <span>PWA Push</span>
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className="shrink-0 gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
          >
            <History className="size-3.5" />
            <span>Logs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="smtp">
          <EmailSmtpSettingsPanel
            smtpSettings={smtpSettings}
            currentUserEmail={session?.user?.email ?? null}
          />
        </TabsContent>

        <TabsContent value="templates">
          <EmailTemplateSettingsPanel
            templates={templates}
            hseRecipientEmails={hseSafetyConfig.recipientEmails}
            hseCcEmails={hseSafetyConfig.ccEmails}
            hcRecipientEmails={humanCapitalConfig.recipientEmails}
            hcCcEmails={humanCapitalConfig.ccEmails}
            employees={employees}
          />
        </TabsContent>

        <TabsContent value="form-wo">
          <FormWoNotificationSettingsPanel config={formWoConfig} employees={employees} />
        </TabsContent>

        <TabsContent value="hse">
          <HseSafetyNotificationSettingsPanel config={hseSafetyConfig} employees={employees} />
        </TabsContent>

        <TabsContent value="apd-summary">
          <ApdSummaryNotificationSettingsPanel config={apdSummaryConfig} employees={employees} />
        </TabsContent>

        <TabsContent value="marital-status">
          <MaritalStatusNotificationSettingsPanel config={maritalStatusConfig} employees={employees} />
        </TabsContent>

        <TabsContent value="hc">
          <HumanCapitalNotificationSettingsPanel config={humanCapitalConfig} employees={employees} />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceNotificationSettingsPanel config={attendanceConfig} canEdit={access.canEdit} />
        </TabsContent>

        <TabsContent value="apd">
          <ApdNotificationSettingsPanel config={apdConfig} employees={employees} />
        </TabsContent>

        <TabsContent value="mine-permit">
          <MinePermitReminderSettingsPanel />
        </TabsContent>

        <TabsContent value="cs-forecast">
          <CsForecastDailyReportSettingsPanel
            config={csForecastConfig}
            template={templates.find((t) => t.templateCode === 'cs_forecast_daily_report') ?? null}
            employees={employees}
          />
        </TabsContent>

        <TabsContent value="bell">
          <Tabs defaultValue="rules" className="space-y-4">
            <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
              <TabsTrigger value="rules">Rules</TabsTrigger>
              <TabsTrigger value="behavior">Behavior</TabsTrigger>
            </TabsList>

            <TabsContent value="rules">
              <Card className="rounded-lg p-4 shadow-sm">
                <h2 className="font-display text-lg font-semibold">Notification Bell Rules</h2>
                <div className="mt-4 space-y-3">
                  {bellRules.map((rule) => (
                    <div key={rule.event} className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-container-low p-3">
                      <div className="min-w-[220px] flex-1">
                        <p className="font-semibold">{rule.label}</p>
                        <p className="font-mono text-xs text-muted-foreground">{rule.event}</p>
                      </div>
                      <p className="min-w-[160px] text-sm text-muted-foreground">{rule.target}</p>
                      <AdminStatusBadge value={rule.priority} />
                      <Switch defaultChecked={rule.active} />
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="behavior">
              <Card className="rounded-lg p-4 shadow-sm">
                <h2 className="font-display text-lg font-semibold">Bell Behavior</h2>
                <div className="mt-4 space-y-4">
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">Realtime badge count</span>
                    <Switch defaultChecked />
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">Sound alert untuk escalation</span>
                    <Switch defaultChecked />
                  </label>
                  <label className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">Auto mark read setelah dibuka</span>
                    <Switch defaultChecked />
                  </label>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="pwa">
          <div className="space-y-4">
            <PwaPushSettingsPanel settings={pwaPushSettings} />

            <Card className="rounded-lg p-4 shadow-sm">
              <h2 className="font-display text-lg font-semibold">Push Rules</h2>
              <div className="mt-4 space-y-3">
                {pwaRules.map((rule) => (
                  <div key={rule.label} className="rounded-lg bg-surface-container-low p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{rule.label}</p>
                        <p className="text-sm text-muted-foreground">{rule.audience}</p>
                      </div>
                      <Switch defaultChecked={rule.active} />
                    </div>
                    <p className="mt-2 inline-flex rounded-lg bg-surface-container-lowest px-2 py-1 text-xs font-semibold text-muted-foreground">
                      {rule.trigger}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <div className="space-y-4">
            <Card className="rounded-lg p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Mail className="size-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">Email Delivery Logs</h2>
              </div>
              <EmailDeliveryLogTable logs={logs} />
            </Card>

            <Card className="rounded-lg p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <RadioTower className="size-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">Notification Delivery Logs</h2>
              </div>
              <MinimalTableShell
                label="notification delivery logs"
                fileName="notification-delivery-logs"
                searchPlaceholder="Search channel, recipient, status, or error..."
                summaryClassName="bg-transparent px-1 py-0 shadow-none"
              >
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Channel</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.deliveries.map((delivery) => (
                      <TableRow key={delivery.id} className="hover:bg-surface-container" data-date-value={delivery.createdAt.toISOString()}>
                        <TableCell className="font-semibold">{delivery.deliveryChannel}</TableCell>
                        <TableCell className="max-w-[240px] truncate font-mono text-xs" title={delivery.recipient}>
                          {delivery.recipient}
                        </TableCell>
                        <TableCell>
                          <AdminStatusBadge value={delivery.status} />
                        </TableCell>
                        <TableCell className="max-w-[320px] truncate text-muted-foreground">
                          {delivery.errorMessage ?? "-"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {delivery.createdAt.toLocaleString("id-ID")}
                        </TableCell>
                      </TableRow>
                    ))}
                    {notifications.deliveries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          Belum ada notification delivery log.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </MinimalTableShell>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
