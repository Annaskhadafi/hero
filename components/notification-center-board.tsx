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
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { getNotificationCenterData } from "@/lib/approval-blueprint";

type NotificationCenterData = Awaited<ReturnType<typeof getNotificationCenterData>>;

export function NotificationCenterBoard({ data }: { data: NotificationCenterData }) {
  return (
    <AdminPageShell
      eyebrow="Communication Control"
      title="Notification Center"
      description="Pusat pantau pesan, email, pengingat, delegasi, dan eskalasi agar tindak lanjut approval tidak terlewat."
    >
      <AdminMetricGrid
        items={[
          { label: "Pesan aplikasi", value: `${data.metrics.inApp}`, meta: "Pemberitahuan yang tampil di dalam HERO" },
          { label: "Email", value: `${data.metrics.email}`, meta: "Pemberitahuan yang dikirim melalui email" },
          { label: "Sebelum jatuh tempo", value: `${data.metrics.dueSoon}`, meta: "Pengingat sebelum batas waktu tiba" },
          { label: "Terlambat", value: `${data.metrics.overdue}`, meta: "Pengingat setelah batas waktu terlewati" },
          { label: "Delegasi", value: `${data.metrics.delegationQueue}`, meta: "Tugas yang dialihkan ke pemeriksa lain" },
          { label: "Eskalasi", value: `${data.metrics.escalationQueue}`, meta: "Tugas yang perlu perhatian level lebih tinggi" },
        ]}
      />

      <Alert className="bg-[#eff6ff]">
        <AlertDescription className="text-[#1d4ed8]">
          Halaman ini membantu admin memantau pesan yang terkirim, pengingat yang menunggu jadwal, dan approval yang
          perlu didelegasikan atau dieskalasikan.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="delivery" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="delivery">Riwayat Pengiriman</TabsTrigger>
          <TabsTrigger value="reminders">Daftar Pengingat</TabsTrigger>
          <TabsTrigger value="follow-up">Tindak Lanjut</TabsTrigger>
        </TabsList>

        <TabsContent value="delivery">
          <Card className="rounded-[1.6rem] bg-surface-container-lowest py-0 shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
            <CardHeader className="bg-surface-container-low px-7 py-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Riwayat Pengiriman</CardTitle>
                  <CardDescription>Daftar pesan dan status pengiriman per kanal.</CardDescription>
                </div>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/dashboard/settings/email">Email Settings</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
              <MinimalTableShell
                label="delivery events"
                fileName="notification-delivery-events"
                searchPlaceholder="Cari event, penerima, kanal, atau status..."
                summaryClassName="bg-transparent px-1 py-0 shadow-none"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aktivitas</TableHead>
                      <TableHead>Penerima</TableHead>
                      <TableHead>Kanal</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.events.length > 0 ? (
                      data.events.map((event) => (
                        <TableRow key={event.id} data-date-value={event.createdAt.toISOString()}>
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <p className="font-medium text-[#0f172a]">{event.eventType.replaceAll("_", " ")}</p>
                              <p className="text-xs text-muted-foreground">
                                Pengajuan #{event.submissionId ?? "-"} • {event.createdAt.toLocaleString("id-ID")}
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
                          Belum ada riwayat pengiriman tercatat.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </MinimalTableShell>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders">
          <Card className="rounded-[1.6rem] bg-surface-container-lowest py-0 shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
            <CardHeader className="bg-surface-container-low px-7 py-6">
              <CardTitle>Daftar Pengingat</CardTitle>
              <CardDescription>Pengingat sebelum dan sesudah batas waktu approval.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
              <MinimalTableShell
                label="reminders"
                fileName="notification-reminders"
                searchPlaceholder="Cari jenis reminder, status, atau inbox..."
                summaryClassName="bg-transparent px-1 py-0 shadow-none"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Jadwal</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.reminders.length > 0 ? (
                      data.reminders.map((reminder) => (
                        <TableRow key={reminder.id} data-date-value={reminder.reminderAt.toISOString()}>
                          <TableCell className="align-top">
                            <AdminStatusBadge value={reminder.reminderType} />
                          </TableCell>
                          <TableCell className="align-top">
                            <p className="text-sm text-[#0f172a]">{reminder.reminderAt.toLocaleString("id-ID")}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Tugas #{reminder.inboxItemId}</p>
                          </TableCell>
                          <TableCell className="align-top">
                            <AdminStatusBadge value={reminder.status} />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                          Belum ada pengingat yang terjadwal.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </MinimalTableShell>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="follow-up">
          <Card className="rounded-[1.6rem] bg-surface-container-lowest py-0 shadow-[0_18px_34px_rgba(0,52,97,0.08)]">
            <CardHeader className="bg-surface-container-low px-7 py-6">
              <CardTitle>Daftar Tindak Lanjut</CardTitle>
              <CardDescription>Approval, delegasi, dan eskalasi yang perlu dipantau.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
              <MinimalTableShell
                label="follow up tasks"
                fileName="notification-follow-up"
                searchPlaceholder="Cari tipe tugas, status, atau tenggat..."
                summaryClassName="bg-transparent px-1 py-0 shadow-none"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jenis tugas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Jatuh tempo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.inboxRows.length > 0 ? (
                      data.inboxRows.map((item) => (
                        <TableRow key={item.id} data-date-value={item.dueAt?.toISOString() ?? ""}>
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
                          Belum ada tugas tindak lanjut.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </MinimalTableShell>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
