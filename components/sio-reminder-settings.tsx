'use client'

import { useState, useEffect } from "react"
import { Bell, BellRing, Send, Clock, AlertTriangle, Settings2, Mail, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

  const [additionalRecipients, setAdditionalRecipients] = useState("")
  const [configLoaded, setConfigLoaded] = useState(false)

  useEffect(() => {
    if (settingsOpen && !configLoaded) {
      fetch('/dashboard/api/sio-reminder-config')
        .then((r) => r.json())
        .then((data) => {
          if (data.additionalRecipients) setAdditionalRecipients(data.additionalRecipients)
          if (data.reminderDays) setDaysBefore(data.reminderDays)
          setConfigLoaded(true)
        })
        .catch(() => {})
    }
  }, [settingsOpen, configLoaded])

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
      const res = await fetch('/dashboard/api/sio-reminder-config', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.status === 'success') setSettingsOpen(false)
    } catch {}
  }

  return (
    <Card className="rounded-[1.2rem] border-0 bg-amber-50/60 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <BellRing className="size-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-amber-900">Reminder Expiry Sertifikasi</h4>
            <p className="text-xs text-amber-700 mt-1">
              Kirim notifikasi email ke atasan langsung (Section Head) + penerima tambahan.
              {additionalRecipients && (
                <span className="block mt-1 text-amber-600 font-medium">
                  <Users className="size-3 inline mr-1" />
                  Penerima tambahan: {additionalRecipients}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-xl text-amber-700" title="Atur penerima" onClick={() => { setSettingsOpen(true); setConfigLoaded(false) }}>
            <Settings2 className="size-4" />
          </Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if(!v) setResult(null) }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs gap-1.5 border-amber-300 bg-white text-amber-800 hover:bg-amber-100">
                <Bell className="size-3.5" />
                Kirim Reminder
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BellRing className="size-5 text-amber-600" />
                  Kirim Reminder Expiry
                </DialogTitle>
                <DialogDescription>
                  Email reminder dikirim ke atasan langsung (Section Head) setiap karyawan yg sertifikatnya akan expired.
                  {additionalRecipients && <span className="block mt-1">Juga ke penerima tambahan: <strong>{additionalRecipients}</strong></span>}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {!result ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Batas waktu reminder</label>
                      <div className="flex gap-2">
                        {REMINDER_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setDaysBefore(opt.value)}
                            className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border transition-colors ${
                              daysBefore === opt.value
                                ? 'border-amber-400 bg-amber-50 text-amber-900'
                                : 'border-muted bg-white text-muted-foreground hover:border-amber-200'
                            }`}
                          >
                            <Clock className="size-4 inline mr-1.5" />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-sky-50 p-3 rounded-xl text-xs text-sky-800 flex items-start gap-2">
                      <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                      <div>
                        <strong>Penting:</strong> Pastikan data atasan (Section Head) sudah benar di User Management.
                        Atur penerima tambahan lewat tombol <strong>Settings</strong> di panel reminder.
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                      <Button onClick={handleSendReminder} disabled={loading} className="bg-amber-600 hover:bg-amber-700">
                        {loading ? 'Mengirim...' : `Kirim Reminder (${daysBefore} hari)`}
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
                      <div className="max-h-48 overflow-y-auto text-xs text-muted-foreground space-y-1 bg-surface-container-low/30 p-3 rounded-lg">
                        {result.details.map((d, i) => (
                          <p key={i} className={d.startsWith('Sent') || d.startsWith('CC') ? 'text-emerald-700' : d.startsWith('Error') ? 'text-rose-600' : ''}>{d}</p>
                        ))}
                      </div>
                    )}
                    <DialogFooter>
                      <Button onClick={() => { setResult(null); setOpen(false) }}>Tutup</Button>
                    </DialogFooter>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="size-5 text-amber-600" />
              Pengaturan Penerima Reminder
            </DialogTitle>
            <DialogDescription>
              Atur penerima email reminder selain atasan langsung (Section Head).
              Pisahkan beberapa email dengan koma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Mail className="size-4 text-muted-foreground" />
                Penerima Email Tambahan
              </Label>
              <Input
                value={additionalRecipients}
                onChange={(e) => setAdditionalRecipients(e.target.value)}
                placeholder="hrd@company.com, manager@company.com"
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Email akan dikirim sebagai CC. Biarkan kosong jika hanya ingin kirim ke atasan langsung.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Batas waktu reminder (hari)</Label>
              <div className="flex gap-2">
                {REMINDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDaysBefore(opt.value)}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border transition-colors ${
                      daysBefore === opt.value
                        ? 'border-amber-400 bg-amber-50 text-amber-900'
                        : 'border-muted bg-white text-muted-foreground hover:border-amber-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Batal</Button>
            <Button onClick={handleSaveSettings} className="bg-amber-600 hover:bg-amber-700">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
