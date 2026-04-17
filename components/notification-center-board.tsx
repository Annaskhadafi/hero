import Link from "next/link";
import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { getNotificationCenterData } from "@/lib/approval-blueprint";

type NotificationCenterData = Awaited<ReturnType<typeof getNotificationCenterData>>;

export function NotificationCenterBoard({ data }: { data: NotificationCenterData }) {
  return (
    <AdminPageShell
      eyebrow="M2 • Notification Center"
      title="Notification Center"
      description="Control room untuk event notifikasi, delivery channel, reminder queue, delegation, dan escalation visibility."
    >
      <AdminMetricGrid
        items={[
          { label: "In-app", value: `${data.metrics.inApp}`, meta: "Delivery record yang sudah ditulis ke channel in-app" },
          { label: "Email", value: `${data.metrics.email}`, meta: "Delivery record untuk email template dan reminder" },
          { label: "Before due", value: `${data.metrics.dueSoon}`, meta: "Reminder rule yang dijadwalkan sebelum due" },
          { label: "Overdue", value: `${data.metrics.overdue}`, meta: "Reminder rule yang aktif setelah SLA terlewati" },
          { label: "Delegation", value: `${data.metrics.delegationQueue}`, meta: "Inbox item bertipe delegation yang terlihat di queue" },
          { label: "Escalation", value: `${data.metrics.escalationQueue}`, meta: "Inbox item bertipe escalation yang terlihat di queue" },
        ]}
      />

      <Alert className="bg-[#eff6ff]">
        <AlertDescription className="text-[#1d4ed8]">
          Notification event, delivery log, reminder queue, dan escalation visibility sudah ada di runtime blueprint.
          Scheduler pengiriman otomatis masih backlog, jadi halaman ini berfungsi sebagai monitoring center dan proof
          of persistence saat ini.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card className="rounded-[1.6rem] bg-surface-container-lowest py-0 shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
          <CardHeader className="bg-surface-container-low px-7 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Delivery Stream</CardTitle>
                <CardDescription>Event notifikasi dan hasil delivery per channel.</CardDescription>
              </div>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/dashboard/settings/email">Email Settings</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.events.length > 0 ? (
                  data.events.slice(0, 8).map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <p className="font-medium text-[#0f172a]">{event.eventType.replaceAll("_", " ")}</p>
                          <p className="text-xs text-muted-foreground">
                            Submission #{event.submissionId ?? "-"} • {event.createdAt.toLocaleString("id-ID")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-sm text-[#0f172a]">{event.recipient}</TableCell>
                      <TableCell className="align-top">
                        <AdminStatusBadge value={event.channel} />
                      </TableCell>
                      <TableCell className="align-top">
                        <AdminStatusBadge value={event.deliveryStatus} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Belum ada notification event tercatat.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[1.6rem] bg-surface-container-lowest py-0 shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
            <CardHeader className="bg-surface-container-low px-7 py-6">
              <CardTitle>Reminder Queue</CardTitle>
              <CardDescription>Reminder sebelum due dan overdue yang sudah masuk persistence layer.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.reminders.length > 0 ? (
                    data.reminders.slice(0, 6).map((reminder) => (
                      <TableRow key={reminder.id}>
                        <TableCell className="align-top">
                          <AdminStatusBadge value={reminder.reminderType} />
                        </TableCell>
                        <TableCell className="align-top">
                          <p className="text-sm text-[#0f172a]">{reminder.reminderAt.toLocaleString("id-ID")}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Inbox #{reminder.inboxItemId}</p>
                        </TableCell>
                        <TableCell className="align-top">
                          <AdminStatusBadge value={reminder.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                        Belum ada reminder job yang terjadwal.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-[1.6rem] bg-surface-container-lowest py-0 shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
            <CardHeader className="bg-surface-container-low px-7 py-6">
              <CardTitle>Inbox Routing Queue</CardTitle>
              <CardDescription>Visibility untuk approval, delegation, dan escalation di layer inbox.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inbox Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.inboxRows.length > 0 ? (
                    data.inboxRows.slice(0, 6).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="align-top">
                          <AdminStatusBadge value={item.inboxType} />
                        </TableCell>
                        <TableCell className="align-top">
                          <AdminStatusBadge value={item.status} />
                        </TableCell>
                        <TableCell className="align-top text-sm text-[#0f172a]">
                          {item.dueAt ? item.dueAt.toLocaleString("id-ID") : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                        Belum ada inbox routing item.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPageShell>
  );
}
