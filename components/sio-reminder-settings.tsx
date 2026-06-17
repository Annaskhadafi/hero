'use client'

import { useState, useEffect, useCallback } from "react"
import { Fragment } from "react"
import { Bell, BellRing, Send, Clock, AlertTriangle, Settings2, Mail, Users, Eye, ChevronDown, ChevronRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { sendSioExpiryReminders, type ReminderResult } from "@/lib/sio-reminder"

const REMINDER_OPTIONS = [
  { value: 60, label: '2 bulan sebelum expired' },
  { value: 30, label: '1 bulan sebelum expired' },
]

export function SioReminderPanel() {
  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [daysBefore, setDaysBefore] = useState(30)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ReminderResult | null>(null)

  // Data untuk pratinjau + settings
  const [preview, setPreview] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [expandedManagers, setExpandedManagers] = useState<Set<string>>(new Set())
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set())
  const [showTemplate, setShowTemplate] = useState(false)

  // Data semua Section Head (statis)
  const [sectionHeads, setSectionHeads] = useState<any[]>([])
  const [headsLoading, setHeadsLoading] = useState(false)
  const [editingEmail, setEditingEmail] = useState<{ id: number; email: string } | null>(null)
  const [savingEmail, setSavingEmail] = useState(false)

  const [additionalRecipients, setAdditionalRecipients] = useState("")

  const loadAllData = useCallback(async () => {
    setPreviewLoading(true)
    setHeadsLoading(true)
    try {
      const [configRes, previewRes, headsRes] = await Promise.all([
        fetch('/dashboard/api/sio-reminder-config'),
        fetch(`/dashboard/api/sio-reminder-preview?days=${daysBefore}`),
        fetch('/dashboard/api/sio-section-heads'),
      ])
      const config = await configRes.json()
      if (config.additionalRecipients) setAdditionalRecipients(config.additionalRecipients)
      if (config.reminderDays) setDaysBefore(config.reminderDays)
      if (previewRes.ok) { const p = await previewRes.json(); setPreview(p) }
      if (headsRes.ok) { const h = await headsRes.json(); setSectionHeads(h) }
    } catch {} finally {
      setPreviewLoading(false)
      setHeadsLoading(false)
    }
  }, [daysBefore])

  useEffect(() => {
    if (open) loadAllData()
  }, [open, loadAllData])

  useEffect(() => {
    if (settingsOpen) loadAllData()
  }, [settingsOpen, loadAllData])

  async function handleSendReminder() {
    setLoading(true)
    setResult(null)
    try {
      const res = await sendSioExpiryReminders(daysBefore)
      setResult(res)
    } catch (err) {
      setResult({ sent: 0, skipped: 0, errors: 1, details: [err instanceof Error ? err.message : 'Gagal'] })
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveSettings() {
    const fd = new FormData()
    fd.set('additionalRecipients', additionalRecipients)
    fd.set('reminderDays', String(daysBefore))
    fd.set('isActive', 'true')
    try {
      await fetch('/dashboard/api/sio-reminder-config', { method: 'POST', body: fd })
      setSettingsOpen(false)
    } catch {}
  }

  function toggleManager(email: string) {
    setExpandedManagers((prev) => {
      const next = new Set(prev)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })
  }

  function RecipientsTable() {
    if (previewLoading) return <div className="text-xs text-muted-foreground py-4 text-center">Memuat...</div>
    if (!preview) return null
    if (preview.totalCerts === 0) return <div className="text-xs text-muted-foreground py-4 text-center">Tidak ada sertifikat akan expired dalam periode ini.</div>

    return (
      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-container-low/50">
              <TableHead className="w-8" />
              <TableHead>Section Head</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Jumlah</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.recipients.map((r: any) => {
              const isExpanded = expandedManagers.has(r.managerEmail)
              return (
                <Fragment key={r.managerEmail}>
                  <TableRow className="cursor-pointer hover:bg-surface-container-low/30" onClick={() => toggleManager(r.managerEmail)}>
                    <TableCell>{isExpanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}</TableCell>
                    <TableCell className="font-medium text-sm">{r.managerName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.managerEmail}</TableCell>
                    <TableCell className="text-xs">{r.employees.length} sertifikat</TableCell>
                    <TableCell><Badge className="bg-emerald-500/10 text-emerald-700 border-0 text-[10px]">Akan dikirim</Badge></TableCell>
                  </TableRow>
                  {isExpanded && r.employees.map((emp: any, i: number) => (
                    <TableRow key={`${r.managerEmail}-${i}`} className="bg-surface-container-low/20">
                      <TableCell />
                      <TableCell className="text-xs pl-10" colSpan={2}>
                        <span className="font-medium">{emp.name}</span>
                        <span className="text-muted-foreground ml-2">— {emp.certType} {emp.certName}</span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className={emp.daysLeft <= 0 ? 'text-rose-600 font-bold' : emp.daysLeft <= 30 ? 'text-amber-600 font-bold' : 'text-emerald-600'}>
                          {emp.daysLeft <= 0 ? `${Math.abs(emp.daysLeft)} hr lewat` : `${emp.daysLeft} hr`}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{emp.expiryDate}</TableCell>
                      <TableCell>
                        <Badge className="bg-amber-500/10 text-amber-700 border-0 text-[10px]">Akan dikirim</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              )
            })}
            {preview.additionalRecipients && (
              <TableRow className="bg-sky-50/50">
                <TableCell />
                <TableCell className="font-medium text-sm text-sky-800">CC Tambahan</TableCell>
                <TableCell className="text-xs text-sky-700">{preview.additionalRecipients}</TableCell>
                <TableCell className="text-xs">Ringkasan</TableCell>
                <TableCell><Badge className="bg-sky-500/10 text-sky-700 border-0 text-[10px]">CC</Badge></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    )
  }

  function SkippedWarning() {
    if (!preview?.skippedEmployees?.length) return null
    return (
      <div className="bg-amber-50 p-3 rounded-xl text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle className="size-4 mt-0.5 shrink-0" />
        <div>
          <strong>{preview.skippedEmployees.length} karyawan dilewati</strong> — tidak punya atasan langsung (directManagerId) atau email atasan kosong.
          <span className="block mt-1">Perbaiki data di <strong>User Management → Security → atur directManagerId</strong>.</span>
        </div>
      </div>
    )
  }

  function TemplatePreview() {
    if (!preview?.emailTemplateHtml) return null
    return (
      <div className="space-y-2">
        <button onClick={() => setShowTemplate(!showTemplate)} className="text-xs font-medium text-muted-foreground flex items-center gap-1 hover:text-foreground">
          <Eye className="size-3.5" />
          {showTemplate ? 'Sembunyikan' : 'Lihat'} template email
        </button>
        {showTemplate && (
          <div className="border rounded-xl p-4 bg-white max-h-64 overflow-y-auto text-sm">
            <div dangerouslySetInnerHTML={{ __html: preview.emailTemplateHtml }} />
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Panel utama */}
      <Card className="rounded-[1.2rem] border-0 bg-amber-50/60 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <BellRing className="size-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-amber-900">Reminder Expiry Sertifikasi</h4>
              <p className="text-xs text-amber-700 mt-1">
                Kirim notifikasi email ke atasan langsung (Section Head) + CC tambahan.
                {additionalRecipients && (
                  <span className="block mt-1 text-amber-600 font-medium">
                    <Users className="size-3 inline mr-1" />
                    CC: {additionalRecipients}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-xl text-amber-700" title="Pengaturan penerima & template" onClick={() => setSettingsOpen(true)}>
              <Settings2 className="size-4" />
            </Button>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if(!v) setResult(null) }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs gap-1.5 border-amber-300 bg-white text-amber-800 hover:bg-amber-100">
                  <Bell className="size-3.5" />
                  Kirim Reminder
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <BellRing className="size-5 text-amber-600" />
                    Kirim Reminder Expiry
                  </DialogTitle>
                  <DialogDescription>Pratinjau penerima sebelum dikirim.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {!result ? (
                    <>
                      <div className="flex gap-2">
                        {REMINDER_OPTIONS.map((opt) => (
                          <button key={opt.value} onClick={() => setDaysBefore(opt.value)}
                            className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border transition-colors ${daysBefore === opt.value ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-muted bg-white text-muted-foreground hover:border-amber-200'}`}
                          >
                            <Clock className="size-4 inline mr-1.5" />{opt.label}
                          </button>
                        ))}
                      </div>
                      <RecipientsTable />
                      <SkippedWarning />
                      <TemplatePreview />
                      <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                        <Button onClick={handleSendReminder} disabled={loading || !preview || preview.totalCerts === 0} className="bg-amber-600 hover:bg-amber-700">
                          {loading ? 'Mengirim...' : `Konfirmasi & Kirim (${preview?.totalCerts || 0} email)`}
                        </Button>
                      </DialogFooter>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className={`p-4 rounded-xl ${result.errors > 0 && result.sent === 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Send className={`size-4 ${result.errors > 0 && result.sent === 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
                          {result.errors > 0 && result.sent === 0 ? 'Gagal' : 'Reminder Terkirim'}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Badge className="bg-emerald-500/10 text-emerald-700 border-0">{result.sent} Terkirim</Badge>
                          <Badge className="bg-slate-500/10 text-slate-700 border-0">{result.skipped} Skip</Badge>
                          <Badge className="bg-rose-500/10 text-rose-700 border-0">{result.errors} Error</Badge>
                        </div>
                      </div>
                      {result.details.length > 0 && (
                        <div className="max-h-48 overflow-y-auto text-xs space-y-1 bg-surface-container-low/30 p-3 rounded-lg">
                          {result.details.map((d, i) => (
                            <p key={i} className={d.startsWith('Sent') || d.startsWith('CC') ? 'text-emerald-700' : d.startsWith('Error') ? 'text-rose-600' : ''}>{d}</p>
                          ))}
                        </div>
                      )}
                      <DialogFooter><Button onClick={() => { setResult(null); setOpen(false) }}>Tutup</Button></DialogFooter>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Card>

      {/* Settings Dialog — tampilan lengkap penerima + template + CC */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Settings2 className="size-5 text-amber-600" />
              Pengaturan Reminder Expiry
            </DialogTitle>
            <DialogDescription>
              Atur penerima & validasi data Section Head sebelum kirim reminder.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* 1. Daftar Semua Section Head */}
            <div>
              <h5 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
                <Users className="size-4 text-primary" />
                Penerima Default — Semua Section Head
              </h5>
              <p className="text-[11px] text-muted-foreground mb-2">
                Data Section Head diambil dari jabatan <strong>Manager / Head / Supervisor / Coordinator</strong> di User Management.
                Grup berdasarkan department.
              </p>
              {headsLoading ? (
                <div className="text-xs text-muted-foreground py-4 text-center">Memuat data Section Head...</div>
              ) : sectionHeads.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4 text-center">Belum ada data Section Head.</div>
              ) : (
                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-surface-container-low/50">
                        <TableHead className="w-8" />
                        <TableHead>Department / Section</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="w-20">Aksi</TableHead>
                        <TableHead>Jabatan</TableHead>
                        <TableHead>Anak Buah</TableHead>
                        <TableHead>Sertifikat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const deptGroups: Record<string, { label: string; items: any[] }> = {}
                        const normalizeDept = (d: string) => d.trim().toLowerCase().replace(/\s+/g, ' ')
                        const freq: Record<string, Record<string, number>> = {}
                        for (const h of sectionHeads) {
                          const raw = h.department || 'Lainnya'
                          const key = normalizeDept(raw)
                          if (!deptGroups[key]) { deptGroups[key] = { label: raw, items: [] }; freq[key] = {} }
                          deptGroups[key].items.push(h)
                          freq[key][raw] = (freq[key][raw] || 0) + 1
                        }
                        for (const k of Object.keys(deptGroups)) {
                          deptGroups[k].label = Object.entries(freq[k]).sort((a, b) => b[1] - a[1])[0][0]
                        }
                        return Object.entries(deptGroups).sort((a, b) => a[1].label.localeCompare(b[1].label)).map(([normKey, { label: dept, items: heads }]) => {
                          const isExpanded = expandedDepts.has(dept)
                          return (
                            <Fragment key={normKey}>
                              <TableRow className="cursor-pointer hover:bg-surface-container-low/30 bg-slate-50/50" onClick={() => {
                                const next = new Set(expandedDepts)
                                if (next.has(dept)) next.delete(dept); else next.add(dept)
                                setExpandedDepts(next)
                              }}>
                                <TableCell>{isExpanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}</TableCell>
                                <TableCell className="font-semibold text-sm" colSpan={2}>{dept}</TableCell>
                                <TableCell className="text-xs text-muted-foreground" colSpan={2}>{heads.length} orang</TableCell>
                                <TableCell className="text-xs">{heads.reduce((s, h) => s + h.employeeCount, 0)} org</TableCell>
                                <TableCell className="text-xs">{heads.filter((h) => h.hasExpiringCerts).length} akan expired</TableCell>
                              </TableRow>
                              {isExpanded && heads.map((h: any) => {
                                const editData = editingEmail
                                const isEditing = editData?.id === h.id
                                const curEmail = editData?.email ?? ''
                                return (
                                <TableRow key={h.id} className="bg-surface-container-low/20">
                                  <TableCell />
                                  <TableCell className="text-xs pl-10 text-muted-foreground">{h.section || '-'}</TableCell>
                                  <TableCell className="text-sm font-medium">{h.name}</TableCell>
                                  <TableCell className="text-xs max-w-[200px]">
                                    {isEditing ? (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="email"
                                          value={curEmail}
                                          onChange={(e) => setEditingEmail({ id: h.id, email: e.target.value })}
                                          className="flex h-7 w-full rounded-md border border-input bg-white px-2 py-1 text-xs shadow-sm"
                                          autoFocus
                                        />
                                        <button
                                          onClick={async () => {
                                            setSavingEmail(true)
                                            try {
                                              await fetch('/dashboard/api/sio-section-heads', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ employeeId: h.id, email: curEmail }),
                                              })
                                              setSectionHeads((prev) => prev.map((x) => x.id === h.id ? { ...x, email: curEmail } : x))
                                            } catch {}
                                            setSavingEmail(false)
                                            setEditingEmail(null)
                                          }}
                                          disabled={savingEmail}
                                          className="text-emerald-600 hover:text-emerald-800 text-xs font-medium shrink-0"
                                        >Simpan</button>
                                        <button onClick={() => setEditingEmail(null)} className="text-muted-foreground hover:text-foreground text-xs shrink-0">Batal</button>
                                      </div>
                                    ) : (
                                      <span
                                        className={`cursor-pointer hover:bg-slate-100 px-1.5 py-0.5 rounded inline-block max-w-full truncate ${h.email ? 'text-primary font-mono' : 'text-rose-500 italic'}`}
                                        onClick={() => setEditingEmail({ id: h.id, email: h.email || '' })}
                                        title={h.email || 'Klik untuk tambah email'}
                                      >
                                        {h.email || 'Klik tambah email'}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs whitespace-nowrap">
                                    <button
                                      onClick={async () => {
                                        const exclude = !h.excluded
                                        try {
                                          await fetch('/dashboard/api/sio-section-heads', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ employeeId: h.id, exclude }),
                                          })
                                          setSectionHeads((prev) => prev.map((x) => x.id === h.id ? { ...x, excluded: exclude } : x))
                                        } catch {}
                                      }}
                                      className={`text-[10px] font-medium px-2 py-1 rounded-md transition-colors ${
                                        h.excluded
                                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                          : 'bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600'
                                      }`}
                                      title={h.excluded ? 'Klik untuk aktifkan kembali' : 'Klik untuk kecualikan dari reminder'}
                                    >
                                      {h.excluded ? 'Aktifkan' : 'Kecualikan'}
                                    </button>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{h.jobTitle || '-'}</TableCell>
                                  <TableCell className="text-xs">{h.employeeCount} org</TableCell>
                                  <TableCell className="text-xs">
                                    {h.hasExpiringCerts ? (
                                      <Badge className="bg-amber-500/10 text-amber-700 border-0 text-[10px]">Ada expired</Badge>
                                    ) : (
                                      <Badge className="bg-emerald-500/10 text-emerald-700 border-0 text-[10px]">Aman</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )})}
                            </Fragment>
                          )
                        })
                      })()}
                    </TableBody>
                  </Table>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">
                Total {sectionHeads.length} Section Head. 
                {sectionHeads.filter((h) => !h.email).length} tanpa email — klik email untuk tambah/edit langsung.
              </p>
            </div>

            {/* 2. CC Tambahan */}
            <div className="border-t pt-4">
              <h5 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
                <Mail className="size-4 text-primary" />
                CC — Penerima Email Tambahan
              </h5>
              <p className="text-[11px] text-muted-foreground mb-2">
                Email tambahan yg akan menerima ringkasan reminder (dipisah koma).
              </p>
              <Input
                value={additionalRecipients}
                onChange={(e) => setAdditionalRecipients(e.target.value)}
                placeholder="hrd@company.com, manager@company.com"
                className="text-sm"
              />
            </div>

            {/* 3. Batas Waktu */}
            <div className="border-t pt-4">
              <h5 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
                <Clock className="size-4 text-primary" />
                Batas Waktu Reminder
              </h5>
              <div className="flex gap-2">
                {REMINDER_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => setDaysBefore(opt.value)}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border transition-colors ${daysBefore === opt.value ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-muted bg-white text-muted-foreground hover:border-amber-200'}`}
                  >{opt.label}</button>
                ))}
              </div>
            </div>

            {/* 4. Template Email */}
            <div className="border-t pt-4">
              <h5 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
                <Eye className="size-4 text-primary" />
                Template Email
              </h5>
              <p className="text-[11px] text-muted-foreground mb-2">
                Template email yg akan dikirim ke masing-masing Section Head. Data dinamis diganti sesuai penerima.
              </p>
              {preview?.emailTemplateHtml ? (
                <div className="border rounded-xl p-4 bg-white max-h-80 overflow-y-auto text-sm">
                  <div dangerouslySetInnerHTML={{ __html: preview.emailTemplateHtml }} />
                </div>
              ) : (
                <div className="text-xs text-muted-foreground py-4 text-center">Memuat template...</div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Tutup</Button>
            <Button onClick={handleSaveSettings} className="bg-amber-600 hover:bg-amber-700">Simpan Pengaturan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
