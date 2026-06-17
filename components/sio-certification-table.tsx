'use client'

import { useState, Fragment } from "react"
import { ChevronDown, ChevronRight, User, FileSpreadsheet, Clock, Bell, Send, Mail, Users } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AdminStatusBadge } from "@/components/admin-status-badge"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface SioRow {
  id: number
  employeeId: number
  employeeName: string | null
  employeeSn: string | null
  role: string | null
  department: string | null
  section: string | null
  certType: string
  certNumber: string | null
  certName: string
  issuingBody: string | null
  certDate: Date | string | null
  expiryDate: Date | string | null
  status: string
  notes: string | null
  lastSyncFrom: string | null
}

interface SioCertificationTableProps {
  rows: SioRow[]
  onEdit: (row: SioRow) => void
  onDelete: (row: SioRow) => void
}

function daysUntil(date: Date | string | null): number | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  return Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
}

function formatDate(date: Date | string | null): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function nearestExpiry(group: SioRow[]): { days: number | null; label: string; color: string } {
  let minDays: number | null = null
  let minStatus = 'active'
  for (const r of group) {
    const d = daysUntil(r.expiryDate)
    if (d === null) continue
    if (minDays === null || d < minDays) {
      minDays = d
      minStatus = r.status
    }
  }
  if (minDays === null) return { days: null, label: 'Tanpa expiry', color: 'text-muted-foreground' }
  if (minDays <= 0) return { days: minDays, label: `${Math.abs(minDays)} hr lewat`, color: 'text-rose-600 font-bold' }
  if (minDays <= 30) return { days: minDays, label: `${minDays} hr`, color: 'text-amber-600 font-bold' }
  return { days: minDays, label: `${minDays} hr`, color: 'text-emerald-600' }
}

export function SioCertificationTable({ rows, onEdit, onDelete }: SioCertificationTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [reminderRow, setReminderRow] = useState<SioRow | null>(null)
  const [reminderInfo, setReminderInfo] = useState<{ managerName: string; managerEmail: string; cc: string } | null>(null)
  const [editToEmail, setEditToEmail] = useState('')
  const [editCc, setEditCc] = useState('')
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [savingTo, setSavingTo] = useState(false)
  const [savingCc, setSavingCc] = useState(false)

  const grouped = groupByEmployee(rows)
  const groupKeys = Object.keys(grouped)

  function toggleGroup(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function openReminder(row: SioRow) {
    setReminderRow(row)
    setSending(false)
    setSent(false)
    setLoadingInfo(true)
    let managerName = '-', managerEmail = '-', cc = '-'
    const [configRes, mgrRes] = await Promise.allSettled([
      fetch('/dashboard/api/sio-reminder-config'),
      fetch(`/dashboard/api/sio-manager?employeeId=${row.employeeId}`),
    ])
    if (configRes.status === 'fulfilled' && configRes.value.ok) {
      const config = await configRes.value.json()
      cc = config.additionalRecipients || '(kosong)'
    }
    if (mgrRes.status === 'fulfilled' && mgrRes.value.ok) {
      const mgr = await mgrRes.value.json()
      managerName = mgr.name || '(tidak ada atasan)'
      managerEmail = mgr.email || '(tidak ada email)'
    }
    setEditToEmail(managerEmail)
    setEditCc(cc)
    setReminderInfo({ managerName, managerEmail, cc })
    setLoadingInfo(false)
  }

  async function handleSaveToEmail() {
    if (!reminderRow) return
    setSavingTo(true)
    try {
      await fetch('/dashboard/api/sio-section-heads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: reminderRow.employeeId, email: editToEmail }),
      })
      setReminderInfo((prev) => prev ? { ...prev, managerEmail: editToEmail } : prev)
    } catch {}
    setSavingTo(false)
  }

  async function handleSaveCc() {
    setSavingCc(true)
    try {
      const fd = new FormData()
      fd.set('additionalRecipients', editCc)
      fd.set('reminderDays', '30')
      fd.set('isActive', 'true')
      await fetch('/dashboard/api/sio-reminder-config', { method: 'POST', body: fd })
      setReminderInfo((prev) => prev ? { ...prev, cc: editCc } : prev)
    } catch {}
    setSavingCc(false)
  }

  async function handleSendReminder() {
    if (!reminderRow) return
    setSending(true)
    try {
      const res = await fetch('/dashboard/api/sio-send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeName: reminderRow.employeeName || '',
          certName: reminderRow.certName,
          certType: reminderRow.certType,
          expiryDate: reminderRow.expiryDate ? (typeof reminderRow.expiryDate === 'string' ? reminderRow.expiryDate : reminderRow.expiryDate.toISOString().split('T')[0]) : null,
          toEmail: editToEmail,
          ccEmail: editCc,
        }),
      })
      const json = await res.json()
      if (json.status === 'success') setSent(true)
    } catch {} finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-xl border-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-surface-container-low/50">
            <TableHead className="w-8" />
            <TableHead>Nama</TableHead>
            <TableHead>SN</TableHead>
            <TableHead>Dept / Seksi</TableHead>
            <TableHead>Tipe</TableHead>
            <TableHead>Sisa Hari</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupKeys.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8 text-sm">
                Belum ada data sertifikasi SIO/POP/POM.
              </TableCell>
            </TableRow>
          ) : (
            groupKeys.map((key) => {
              const group = grouped[key]
              const emp = group[0]
              const isExpanded = expanded.has(key)
              const statusSummary = summarizeStatus(group)
              const nearest = nearestExpiry(group)

              const typeLabels = [...new Set(group.map(r => r.certType))].join(', ')

              return (
                <Fragment key={key}>
                  <TableRow
                    className="cursor-pointer hover:bg-surface-container-low/30"
                    onClick={() => toggleGroup(key)}
                  >
                    <TableCell>
                      {isExpanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="size-4 text-primary" />
                        {emp.employeeName || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{emp.employeeSn || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[emp.department, emp.section].filter(Boolean).join(' / ') || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] border-muted">{typeLabels}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className={`inline-flex items-center gap-1 ${nearest.color}`}>
                        <Clock className="size-3" />
                        {nearest.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {statusSummary.valid > 0 && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px]">{statusSummary.valid} Aktif</Badge>
                        )}
                        {statusSummary.expiring > 0 && (
                          <Badge className="bg-amber-500/10 text-amber-600 border-0 text-[10px]">{statusSummary.expiring} Segera</Badge>
                        )}
                        {statusSummary.expired > 0 && (
                          <Badge className="bg-rose-500/10 text-rose-600 border-0 text-[10px]">{statusSummary.expired} Expired</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="size-7 text-amber-600 hover:text-amber-800 hover:bg-amber-50" title="Kirim reminder" onClick={(e) => { e.stopPropagation(); openReminder(group[0]) }}>
                          <Bell className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7" title="Edit" onClick={(e) => { e.stopPropagation(); onEdit(group[0]) }}>
                          <FileSpreadsheet className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="bg-surface-container-low/30">
                      <TableCell />
                      <TableCell className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sertifikat</TableCell>
                      <TableCell className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Masa Berlaku</TableCell>
                      <TableCell className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sisa Hari</TableCell>
                      <TableCell className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Status</TableCell>
                      <TableCell className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Reminder</TableCell>
                      <TableCell colSpan={2} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Aksi</TableCell>
                    </TableRow>
                  )}
                  {isExpanded && group.map((row) => {
                    const days = daysUntil(row.expiryDate)
                    return (
                      <TableRow key={row.id} className="bg-surface-container-low/20">
                        <TableCell />
                        <TableCell className="text-xs pl-10">
                          <span className="font-semibold">{row.certName}</span>
                          {row.certNumber && <span className="text-muted-foreground ml-2">#{row.certNumber}</span>}
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {[row.certType, row.issuingBody].filter(Boolean).join(' • ')}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(row.expiryDate)}</TableCell>
                        <TableCell className="text-xs">
                          {days !== null ? (
                            <span className={`inline-flex items-center gap-1 ${days <= 0 ? 'text-rose-600 font-bold' : days <= 30 ? 'text-amber-600 font-bold' : 'text-emerald-600'}`}>
                              <Clock className="size-3" />
                              {days <= 0 ? `${Math.abs(days)} hr lewat` : `${days} hr`}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <AdminStatusBadge value={row.status} />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                            title="Kirim reminder"
                            onClick={(e) => { e.stopPropagation(); openReminder(row) }}
                          >
                            <Bell className="size-3.5" />
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="size-7" title="Edit" onClick={(e) => { e.stopPropagation(); onEdit(row) }}>
                              <FileSpreadsheet className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-7 text-rose-500 hover:text-rose-700" title="Hapus" onClick={(e) => { e.stopPropagation(); onDelete(row) }}>
                              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </Fragment>
              )
            })
          )}
        </TableBody>
      </Table>

      {/* Reminder Dialog */}
      <Dialog open={!!reminderRow} onOpenChange={(v) => { if (!v) setReminderRow(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="size-5 text-amber-600" />
              Kirim Reminder Expiry
            </DialogTitle>
            <DialogDescription>
              Detail email reminder untuk sertifikat <strong>{reminderRow?.certName}</strong> — {reminderRow?.employeeName}
            </DialogDescription>
          </DialogHeader>

          {loadingInfo ? (
            <div className="text-xs text-muted-foreground py-4 text-center">Memuat data penerima...</div>
          ) : sent ? (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-sm font-semibold flex items-center gap-2">
                <Send className="size-4" />
                Reminder terkirim
              </div>
              <DialogFooter>
                <Button onClick={() => { setReminderRow(null); setSent(false) }}>Tutup</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl bg-slate-50 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-1">
                  <Users className="size-4 text-primary" />
                  Penerima
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Karyawan:</span>
                  <span className="font-medium">{reminderRow?.employeeName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Sertifikat:</span>
                  <span className="font-medium">{reminderRow?.certType} — {reminderRow?.certName}</span>
                </div>
                <div className="border-t pt-2">
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Kepada (Section Head):</label>
                  <div className="flex gap-1">
                    <input
                      type="email"
                      value={editToEmail}
                      onChange={(e) => setEditToEmail(e.target.value)}
                      className="flex h-8 w-full rounded-md border border-input bg-white px-2 py-1 text-xs shadow-sm"
                      placeholder="email@company.com"
                    />
                    <Button size="sm" variant="outline" className="h-8 text-[10px] px-2 shrink-0" onClick={handleSaveToEmail} disabled={savingTo}>
                      {savingTo ? '...' : 'Simpan'}
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">CC:</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={editCc}
                      onChange={(e) => setEditCc(e.target.value)}
                      className="flex h-8 w-full rounded-md border border-input bg-white px-2 py-1 text-xs shadow-sm"
                      placeholder="cc@company.com, lainnya@company.com"
                    />
                    <Button size="sm" variant="outline" className="h-8 text-[10px] px-2 shrink-0" onClick={handleSaveCc} disabled={savingCc}>
                      {savingCc ? '...' : 'Simpan'}
                    </Button>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Pisahkan beberapa email dengan koma</p>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setReminderRow(null)}>Batal</Button>
                <Button onClick={handleSendReminder} disabled={sending} className="bg-amber-600 hover:bg-amber-700">
                  {sending ? 'Mengirim...' : 'Kirim Reminder'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function groupByEmployee(rows: SioRow[]): Record<string, SioRow[]> {
  const map: Record<string, SioRow[]> = {}
  for (const r of rows) {
    const key = `${r.employeeId}`
    if (!map[key]) map[key] = []
    map[key].push(r)
  }
  return map
}

function summarizeStatus(group: SioRow[]) {
  let valid = 0, expiring = 0, expired = 0
  for (const r of group) {
    if (r.status === 'expired') expired++
    else if (r.status === 'expiring_soon') expiring++
    else valid++
  }
  return { valid, expiring, expired }
}
