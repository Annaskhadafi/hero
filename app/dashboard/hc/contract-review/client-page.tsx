"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bug, Plus, Settings } from "lucide-react"

import {
  deleteContractReview,
  generateTestContractReview,
  saveContractReviewSettings,
  sendDueContractReviewReminders,
} from "@/app/actions/contract-review"
import { AdminPageShell } from "@/components/admin-page-shell"
import { HcWorkspaceBanner, hcPrimaryActionClassName } from "@/components/hc/hc-workspace-banner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EnterpriseActionButtons } from "@/components/ui/enterprise-table-kit"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MinimalTableShell } from "@/components/ui/minimal-table-shell"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

export function ContractReviewClientPage({ reviews, employees, settings }: { reviews: any[], employees: any[], settings: any }) {
  const router = useRouter()
  const [rows, setRows] = useState(reviews)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsForm, setSettingsForm] = useState(settings)
  const [testLinks, setTestLinks] = useState<Array<{ step: number; role: string; name: string; url: string }> | null>(null)
  const [isTestRunning, setIsTestRunning] = useState(false)
  const [isReminderRunning, setIsReminderRunning] = useState(false)
  const access = { canView: true, canEdit: true, canDelete: true }

  const employeeOptions = employees.map((emp: any) => ({
    value: String(emp.id),
    label: `${emp.name} - ${emp.rank || emp.position || emp.jobTitle || 'Employee'}`,
  }))

  const updateApproverField = (field: string, id: string) => {
    const emp = employees.find((e: any) => String(e.id) === id)
    const name = emp?.name || ''
    const email = emp?.email ?? ''
    setSettingsForm({
      ...settingsForm,
      approvalMatrix: {
        ...settingsForm.approvalMatrix,
        [field + 'Name']: name,
        [field + 'Email']: email,
      },
    })
  }

  const updateSectionHead = (section: string, id: string) => {
    const emp = employees.find((e: any) => String(e.id) === id)
    const name = emp?.name || ''
    const email = emp?.email ?? ''
    setSettingsForm({
      ...settingsForm,
      approvalMatrix: {
        ...settingsForm.approvalMatrix,
        sectionHeads: {
          ...settingsForm.approvalMatrix.sectionHeads,
          [section]: { name, email },
        },
      },
    })
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus review ini?")) return
    setRows(rows.filter((r) => r.id !== id))
    await deleteContractReview(id)
  }

  const saveSettings = async () => {
    const result = await saveContractReviewSettings(settingsForm)
    if (result.success) {
      toast.success("Contract Review settings saved")
      setIsSettingsOpen(false)
    } else {
      toast.error("Failed to save settings")
    }
  }

  const handleTestApproval = async () => {
    setIsTestRunning(true)
    const result = await generateTestContractReview()
    setIsTestRunning(false)
    if (result.success && result.data) {
      setTestLinks(result.data.links)
      router.refresh()
    } else {
      toast.error(result.error || 'Gagal membuat test review')
    }
  }

  const handleSendReminders = async () => {
    setIsReminderRunning(true)
    const result = await sendDueContractReviewReminders()
    setIsReminderRunning(false)

    if (result.success) {
      toast.success(`Reminder contract review terkirim: ${result.sent}, dilewati: ${result.skipped}`)
      router.refresh()
    } else {
      toast.error(result.error || 'Gagal mengirim reminder contract review')
    }
  }

  return (
    <AdminPageShell eyebrow="HC • Contract & Probation" title="Employee Review" description="Kelola evaluasi probation dan contract extension karyawan.">
      <HcWorkspaceBanner
        title="Contract & Probation Reviews"
        description="Monitor evaluasi karyawan untuk perpanjangan kontrak atau pengangkatan karyawan tetap."
        items={[
          { label: "Total Reviews", value: rows.length, tone: "slate" },
        ]}
      />

      <MinimalTableShell 
        label="contract review" 
        title="Daftar Review" 
        description="Daftar historis evaluasi karyawan." 
        fileName="contract-reviews-hc" 
        searchPlaceholder="Cari..." 
        access={access} 
        primaryAction={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
              <Settings className="size-4" /> Settings
            </Button>
            <Button variant="secondary" onClick={handleTestApproval} disabled={isTestRunning}>
              <Bug className="size-4" /> {isTestRunning ? 'Generating...' : 'Test Approval'}
            </Button>
            <Button variant="outline" onClick={handleSendReminders} disabled={isReminderRunning}>
              {isReminderRunning ? 'Sending reminders...' : 'Send Reminders'}
            </Button>
            <Button onClick={() => router.push('/dashboard/hc/contract-review/new')} className={hcPrimaryActionClassName}>
              <Plus className="size-4" />Tambah Review
            </Button>
          </div>
        }
        columnOptions={[]}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Karyawan</TableHead>
              <TableHead>Jenis Review</TableHead>
              <TableHead>Tgl Masuk</TableHead>
              <TableHead>Tgl Review</TableHead>
              <TableHead>Rekomendasi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">Belum ada data review.</TableCell>
              </TableRow>
            )}
            {rows.map((row) => {
              const emp = employees.find(e => e.id === row.employeeId)
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{emp?.name || row.employeeNameStr || '-'}</TableCell>
                  <TableCell className="capitalize">{row.reviewType}</TableCell>
                  <TableCell>{row.hireDate ? new Date(row.hireDate).toLocaleDateString('id-ID') : '-'}</TableCell>
                  <TableCell>{row.todayDate ? new Date(row.todayDate).toLocaleDateString('id-ID') : '-'}</TableCell>
                  <TableCell className="capitalize">{row.recommendation.replace('_', ' ')}</TableCell>
                  <TableCell className="capitalize">{row.status}</TableCell>
                  <TableCell>
                    <EnterpriseActionButtons 
                      access={access} 
                      labels={{ view: "Print Preview", edit: "Edit", delete: "Hapus" }} 
                      onView={() => router.push(`/dashboard/hc/contract-review/${row.id}?mode=print`)} 
                      onEdit={() => router.push(`/dashboard/hc/contract-review/${row.id}`)} 
                      onDelete={() => handleDelete(row.id)} 
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </MinimalTableShell>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contract Review Settings</DialogTitle>
            <DialogDescription>Atur approval matrix dan template email tanpa hardcode.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* ── Approval Matrix ── */}
            <div className="space-y-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Approval Matrix</h3>
              <div className="space-y-3">
                <div><Label>HO Sites (pisahkan koma)</Label><Input value={settingsForm.approvalMatrix.hoSites.join(', ')} onChange={(e) => setSettingsForm({ ...settingsForm, approvalMatrix: { ...settingsForm.approvalMatrix, hoSites: e.target.value.split(',').map((v: string) => v.trim()).filter(Boolean) } })} /></div>
              </div>

              {/* Section Heads */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Section Heads</p>
                {(['repairRetread', 'serviceMvc', 'serviceOthers'] as const).map((key) => {
                  const labels: Record<string, string> = { repairRetread: 'Repair/Retread', serviceMvc: 'Service MVC', serviceOthers: 'Service Others' }
                  const sh = settingsForm.approvalMatrix.sectionHeads[key]
                  const matchedEmp = employees.find((e: any) => e.name === sh.name)
                  return (
                    <div key={key} className="space-y-1">
                      <Label>{labels[key]} Section Head</Label>
                      <SearchableSelect label={labels[key]} placeholder={`Pilih ${labels[key]} Head...`} value={matchedEmp ? String(matchedEmp.id) : ''} onValueChange={(val) => updateSectionHead(key, val)} options={employeeOptions} widthClassName="w-full" />
                      <Input value={sh.email} onChange={(e) => setSettingsForm({ ...settingsForm, approvalMatrix: { ...settingsForm.approvalMatrix, sectionHeads: { ...settingsForm.approvalMatrix.sectionHeads, [key]: { ...sh, email: e.target.value } } } })} placeholder="Email..." className="h-8 text-xs" />
                    </div>
                  )
                })}
              </div>

              {/* Manager & HR */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Manager & HR</p>
                <div className="space-y-1">
                  <Label>Central Service Manager</Label>
                  <SearchableSelect label="Manager" placeholder="Pilih Manager..." value={(() => { const emp = employees.find((e: any) => e.name === settingsForm.approvalMatrix.managerName); return emp ? String(emp.id) : '' })()} onValueChange={(val) => updateApproverField('manager', val)} options={employeeOptions} widthClassName="w-full" />
                  <Input value={settingsForm.approvalMatrix.managerEmail} onChange={(e) => setSettingsForm({ ...settingsForm, approvalMatrix: { ...settingsForm.approvalMatrix, managerEmail: e.target.value } })} placeholder="Email..." className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label>Default HR</Label>
                  <SearchableSelect label="HR" placeholder="Pilih HR..." value={(() => { const emp = employees.find((e: any) => e.name === settingsForm.approvalMatrix.hrName); return emp ? String(emp.id) : '' })()} onValueChange={(val) => updateApproverField('hr', val)} options={employeeOptions} widthClassName="w-full" />
                  <Input value={settingsForm.approvalMatrix.hrEmail} onChange={(e) => setSettingsForm({ ...settingsForm, approvalMatrix: { ...settingsForm.approvalMatrix, hrEmail: e.target.value } })} placeholder="Email..." className="h-8 text-xs" />
                </div>
              </div>

              <div className="space-y-1">
                <Label>PJO/TE Keywords</Label>
                <Input value={settingsForm.approvalMatrix.pjoKeywords.join(', ')} onChange={(e) => setSettingsForm({ ...settingsForm, approvalMatrix: { ...settingsForm.approvalMatrix, pjoKeywords: e.target.value.split(',').map((v: string) => v.trim()).filter(Boolean) } })} />
              </div>
            </div>

            {/* ── Email Templates ── */}
            <div className="space-y-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Email Templates</h3>
              {(['reminder', 'employeeSignature', 'approverSignature'] as const).map((key) => {
                const labels: Record<string, string> = { reminder: 'Reminder (H-60/H-30/H-14/H-7/H-1)', employeeSignature: 'Undangan TTD Karyawan', approverSignature: 'Notifikasi Approval' }
                return (
                  <div key={key} className="space-y-2 rounded-xl border p-3">
                    <p className="text-xs font-semibold text-muted-foreground">{labels[key]}</p>
                    <div><Label className="text-xs">Subject</Label><Input value={settingsForm.emailTemplates[key].subject} onChange={(e) => setSettingsForm({ ...settingsForm, emailTemplates: { ...settingsForm.emailTemplates, [key]: { ...settingsForm.emailTemplates[key], subject: e.target.value } } })} /></div>
                    <div><Label className="text-xs">Body</Label><Textarea rows={8} value={settingsForm.emailTemplates[key].body} onChange={(e) => setSettingsForm({ ...settingsForm, emailTemplates: { ...settingsForm.emailTemplates, [key]: { ...settingsForm.emailTemplates[key], body: e.target.value } } })} className="text-xs" /></div>
                    <p className="text-[10px] text-muted-foreground">Variables: {'{{employeeName}}, {{employeeSn}}, {{employeeSection}}, {{employeeSite}}, {{contractEndDate}}, {{recipientName}}, {{reviewerName}}, {{reviewLink}}, {{approverName}}, {{approvalStep}}, {{approvalLink}}'}</p>
                  </div>
                )
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
            <Button onClick={saveSettings}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!testLinks} onOpenChange={(o) => { if (!o) setTestLinks(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Approval Links</DialogTitle>
            <DialogDescription>Klik link untuk menguji alur approval TTD digital. Semua link menggunakan email dummy wustho.c@gmail.com.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {testLinks?.map((link) => (
              <div key={link.step} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Step {link.step}: {link.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{link.role.replace(/_/g, ' ')}</p>
                </div>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">Buka Link</a>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestLinks(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}
