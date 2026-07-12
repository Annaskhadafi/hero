import { redirect } from 'next/navigation'
import { ClipboardList, Settings2, Users2 } from 'lucide-react'

import {
  manageOvertimeCommandLetterAction,
  manageOvertimeRequestLeaderPermissionAction,
  transitionOvertimeCommandLetterStatusAction,
} from '@/app/dashboard/activity-hub/actions'
import { OvertimeCommandLetterComposer } from '@/components/overtime-command-letter-composer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getServerSession } from '@/lib/auth-session'
import { getOvertimeRequestWorkspaceData } from '@/lib/overtime-request-data'

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase()

  if (['draft', 'submitted'].includes(normalized)) {
    return 'bg-amber-100 text-amber-900'
  }

  if (['approved', 'closed'].includes(normalized)) {
    return 'bg-emerald-100 text-emerald-900'
  }

  return 'bg-slate-100 text-slate-800'
}

function MetricPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface-container-low rounded-full px-4 py-2 text-sm shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground ml-2 font-semibold">{value}</span>
    </div>
  )
}

export default async function OvertimeRequestsPage() {
  const session = await getServerSession()

  if (!session?.user?.email) {
    redirect('/sign-in')
  }

  const data = await getOvertimeRequestWorkspaceData(session.user.email)
  if (!data) {
    return null
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[1.5rem]">
        <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Pengajuan Lembur</Badge>
              <Badge variant="outline">{data.lead.name}</Badge>
              <Badge variant="outline">{data.lead.department}</Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl sm:text-3xl">
                Workspace Surat Pengajuan Lembur
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                Leader pilih bawahan yang boleh ikut lembur, lalu assign checklist pekerjaan dari
                library untuk tiap orang. Mobile dan web baca sumber data yang sama.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <MetricPill label="Dokumen" value={data.metrics.totalDocuments} />
              <MetricPill
                label="Leader aktif"
                value={`${data.metrics.activeLeaders}/${data.metrics.totalLeaders}`}
              />
              <MetricPill label="Assigned workers" value={data.metrics.totalAssignedWorkers} />
              <MetricPill label="Assigned lines" value={data.metrics.totalAssignedLines} />
            </div>
          </div>

          <div className="bg-surface-container-low text-muted-foreground rounded-[1.2rem] px-4 py-3 text-sm">
            {data.canCreateRequests
              ? `Akses leader aktif. Bawahan tersedia: ${data.team.length} orang.`
              : 'Leader ini belum aktif di setting pengajuan lembur.'}
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="request" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="request">Pengajuan</TabsTrigger>
          <TabsTrigger value="history">Riwayat</TabsTrigger>
          {data.canManageSettings ? <TabsTrigger value="settings">Settings</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="request">
          <Card className="rounded-[1.4rem]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="text-primary size-5" />
                Form Pengajuan Lembur
              </CardTitle>
              <CardDescription>
                Satu line = satu checklist kerja untuk satu bawahan. Tambahkan line sebanyak yang
                dibutuhkan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.canCreateRequests && data.team.length > 0 ? (
                <OvertimeCommandLetterComposer
                  action={manageOvertimeCommandLetterAction}
                  intent="create"
                  submitLabel="Simpan Pengajuan Lembur"
                  routeTemplates={data.splOptions.routeTemplates}
                  libraryActivities={data.splOptions.libraryActivities}
                  teamMembers={data.team.map((member) => ({
                    id: member.id,
                    name: member.name,
                    role: member.jobTitle || member.role,
                  }))}
                />
              ) : (
                <div className="bg-surface-container-low text-muted-foreground rounded-[1.2rem] px-4 py-6 text-sm font-medium">
                  {data.team.length === 0
                    ? 'Belum ada bawahan aktif. Pengajuan lembur baru bisa dibuat setelah struktur bawahan tersedia.'
                    : 'Leader ini belum diaktifkan pada setting pengajuan lembur.'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-4">
            {data.splDocuments.length > 0 ? (
              data.splDocuments.map((document) => (
                <Card key={document.id} className="rounded-[1.4rem]">
                  <CardContent className="space-y-4 pt-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-foreground text-lg font-semibold">{document.title}</p>
                        <p className="text-muted-foreground text-sm">
                          {document.splNumber} • {document.workDate.toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      <Badge className={statusBadgeClass(document.status)}>{document.status}</Badge>
                    </div>

                    {['draft', 'returned'].includes(document.status.toLowerCase()) ? (
                      <form action={transitionOvertimeCommandLetterStatusAction}>
                        <input type="hidden" name="id" value={document.id} />
                        <input type="hidden" name="targetStatus" value="submitted" />
                        <Button type="submit" className="rounded-xl">
                          Submit ke Approval
                        </Button>
                      </form>
                    ) : null}

                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="bg-surface-container-low rounded-[1rem] px-4 py-3 text-sm">
                        <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
                          Workers
                        </p>
                        <p className="text-foreground mt-2 font-semibold">{document.workerCount}</p>
                      </div>
                      <div className="bg-surface-container-low rounded-[1rem] px-4 py-3 text-sm">
                        <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
                          Lines
                        </p>
                        <p className="text-foreground mt-2 font-semibold">{document.lineCount}</p>
                      </div>
                      <div className="bg-surface-container-low rounded-[1rem] px-4 py-3 text-sm">
                        <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
                          Progress
                        </p>
                        <p className="text-foreground mt-2 font-semibold">
                          {document.progressPercent}%
                        </p>
                      </div>
                      <div className="bg-surface-container-low rounded-[1rem] px-4 py-3 text-sm">
                        <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
                          Planned Points
                        </p>
                        <p className="text-foreground mt-2 font-semibold">
                          {document.plannedPointsTotal}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
                      <div className="bg-surface-container-low rounded-[1rem] px-4 py-4">
                        <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
                          Assigned Workers
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {document.workers.length > 0 ? (
                            document.workers.map((worker) => (
                              <div
                                key={worker.employeeId}
                                className="text-foreground rounded-full bg-white px-3 py-1 text-xs font-semibold"
                              >
                                {worker.employeeName}
                              </div>
                            ))
                          ) : (
                            <div className="text-muted-foreground text-sm">
                              Belum ada worker terpasang.
                            </div>
                          )}
                        </div>

                        <div className="mt-4 space-y-2">
                          {document.items.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-[0.9rem] bg-white px-3 py-3 text-sm"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="text-foreground font-semibold">{item.lineLabel}</p>
                                  <p className="text-muted-foreground text-xs">
                                    {item.assignedEmployeeName ?? 'Belum pilih'} •{' '}
                                    {item.targetUnit || '-'} • {item.estimatedMinutes} menit
                                  </p>
                                </div>
                                <Badge variant="outline">{item.plannedPoints} pts</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {['draft', 'returned'].includes(document.status.toLowerCase()) ? (
                        <details className="bg-surface-container-low rounded-[1rem] px-4 py-4">
                          <summary className="text-foreground cursor-pointer list-none text-sm font-semibold">
                            Edit Pengajuan
                          </summary>
                          <div className="mt-4">
                            <OvertimeCommandLetterComposer
                              action={manageOvertimeCommandLetterAction}
                              intent="update"
                              submitLabel="Update Request"
                              routeTemplates={data.splOptions.routeTemplates}
                              libraryActivities={data.splOptions.libraryActivities}
                              teamMembers={data.team.map((member) => ({
                                id: member.id,
                                name: member.name,
                                role: member.jobTitle || member.role,
                              }))}
                              defaults={document}
                            />

                            <form action={manageOvertimeCommandLetterAction} className="mt-3">
                              <input type="hidden" name="intent" value="delete" />
                              <input type="hidden" name="id" value={document.id} />
                              <Button
                                type="submit"
                                variant="outline"
                                className="w-full rounded-xl text-rose-700"
                              >
                                Hapus Pengajuan
                              </Button>
                            </form>
                          </div>
                        </details>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="rounded-[1.4rem]">
                <CardContent className="text-muted-foreground pt-6 text-sm">
                  Belum ada pengajuan lembur untuk site ini.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {data.canManageSettings ? (
          <TabsContent value="settings">
            <Card className="rounded-[1.4rem]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="text-primary size-5" />
                  Setting Leader Pembuat
                </CardTitle>
                <CardDescription>
                  Aktifkan siapa saja yang boleh membuat pengajuan lembur. Scope tetap otomatis
                  hanya ke bawahan dia.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.leaderCandidates.length > 0 ? (
                  data.leaderCandidates.map((leader) => (
                    <div
                      key={leader.id}
                      className="bg-surface-container-low flex flex-col gap-3 rounded-[1rem] px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div>
                        <p className="text-foreground font-semibold">{leader.name}</p>
                        <p className="text-muted-foreground text-sm">
                          {leader.jobTitle || leader.role} • {leader.department}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          Bawahan aktif: {leader.subordinateCount}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={
                            leader.isActive
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-slate-100 text-slate-800'
                          }
                        >
                          {leader.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                        <form action={manageOvertimeRequestLeaderPermissionAction}>
                          <input type="hidden" name="leaderEmployeeId" value={leader.id} />
                          <input
                            type="hidden"
                            name="isActive"
                            value={leader.isActive ? 'false' : 'true'}
                          />
                          <Button
                            type="submit"
                            variant={leader.isActive ? 'outline' : 'default'}
                            className="rounded-full"
                          >
                            <Users2 className="size-4" />
                            {leader.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-surface-container-low text-muted-foreground rounded-[1rem] px-4 py-6 text-sm">
                    Belum ada kandidat leader dengan bawahan aktif di site ini.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}
