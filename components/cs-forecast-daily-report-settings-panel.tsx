'use client'

import { useState } from 'react'
import { BarChart3, Clock, FileText, Send, Sparkles } from 'lucide-react'
import { EmployeeMultiSelect } from '@/components/employee-multi-select'
import {
  saveCsForecastDailyReportConfigAction,
  saveEmailTemplateAction,
  sendCsForecastDailyReportNowAction,
  type EmailSettingsActionState,
} from '@/app/dashboard/settings/email/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

const INITIAL_STATE: EmailSettingsActionState = {
  status: 'idle',
  message: '',
}

const PLACEHOLDERS = [
  { code: '{{periodLabel}}', label: 'Periode (e.g. 2026-07)' },
  { code: '{{reportDate}}', label: 'Tanggal Laporan (e.g. 2026-07-22)' },
  { code: '{{totalForecast}}', label: 'Total Forecast (IDR)' },
  { code: '{{revenueSap}}', label: 'Revenue SAP (IDR)' },
  { code: '{{achievement}}', label: 'Achievement Rate (%)' },
  { code: '{{pendingCount}}', label: 'Jumlah Pending Document' },
  { code: '{{carryOverCount}}', label: 'Jumlah Carry Over Document' },
  { code: '{{reportUrl}}', label: 'URL Dashboard Daily Report' },
]

export function CsForecastDailyReportSettingsPanel({
  config,
  template,
  employees,
}: {
  config: {
    recipientEmails: string
    ccEmails: string
    sendTimes: string
    isActive: boolean
    lastSentKey?: string
    lastSentAt?: Date | string | null
  }
  template?: {
    id: number
    name: string
    templateCode: string
    subject: string
    htmlContent: string
    textContent: string
    isActive: boolean
  } | null
  employees: Array<{ id: number; name: string; email: string }>
}) {
  const [formData, setFormData] = useState({
    recipientEmails: config.recipientEmails || '',
    ccEmails: config.ccEmails || '',
    sendTimes: config.sendTimes || '08:00',
    isActive: config.isActive ?? false,
  })

  const [templateData, setTemplateData] = useState({
    subject: template?.subject || 'CS Forecast Daily Report {{periodLabel}} - {{reportDate}}',
    htmlContent: template?.htmlContent || '',
    textContent: template?.textContent || '',
  })

  const [isSaving, setIsSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSaving(true)

    try {
      // 1. Save Schedule & Recipients
      const fdSchedule = new FormData()
      fdSchedule.set('recipientEmails', formData.recipientEmails)
      fdSchedule.set('ccEmails', formData.ccEmails)
      fdSchedule.set('sendTimes', formData.sendTimes)
      fdSchedule.set('isActive', String(formData.isActive))

      const schedResult = await saveCsForecastDailyReportConfigAction(INITIAL_STATE, fdSchedule)

      // 2. Save Custom Template Override
      const fdTemplate = new FormData()
      if (template?.id) {
        fdTemplate.set('intent', 'update')
        fdTemplate.set('id', String(template.id))
      } else {
        fdTemplate.set('intent', 'create')
      }
      fdTemplate.set('name', template?.name || 'CS Forecast Daily Report')
      fdTemplate.set('templateCode', 'cs_forecast_daily_report')
      fdTemplate.set('templateType', 'Report')
      fdTemplate.set('deliveryChannel', 'email')
      fdTemplate.set('recipientScope', 'central-service')
      fdTemplate.set('ccEmail', '')
      fdTemplate.set('subject', templateData.subject)
      fdTemplate.set('htmlContent', templateData.htmlContent)
      fdTemplate.set('textContent', templateData.textContent)
      fdTemplate.set('isActive', 'true')

      await saveEmailTemplateAction(INITIAL_STATE, fdTemplate)

      if (schedResult.status === 'success') {
        toast.success('Jadwal & Custom Body Email CS Forecast berhasil disimpan!')
      } else {
        toast.error(schedResult.message || 'Gagal menyimpan jadwal.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSendNow() {
    setIsSending(true)
    try {
      const result = await sendCsForecastDailyReportNowAction()
      if (result.status === 'success') {
        toast.success(result.message)
      } else {
        toast.error(result.message || 'Gagal mengirim email.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan saat mengirim email.')
    } finally {
      setIsSending(false)
    }
  }

  const lastSentLabel = config.lastSentAt
    ? new Date(config.lastSentAt).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Belum pernah'

  return (
    <Card className="rounded-lg p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
          <BarChart3 className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold">CS Forecast Daily Report</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Auto-kirim ringkasan Daily Report (image + Excel) ke penerima terpilih pada jam
            terjadwal (UTC+8). Cron: <code>/api/cron/cs-forecast-daily-report</code>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-5">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-surface-container-lowest p-4">
          <div className="space-y-1">
            <Label className="text-sm font-semibold">Aktifkan Auto Send</Label>
            <p className="text-muted-foreground text-[13px]">
              Jika aktif, cron akan mengirim report saat jam jadwal tercapai.
            </p>
          </div>
          <Switch
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData((c) => ({ ...c, isActive: checked }))}
          />
        </div>

        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Clock className="size-4" /> Pengaturan Jadwal
            </TabsTrigger>
            <TabsTrigger value="template" className="flex items-center gap-2">
              <FileText className="size-4" /> Custom Body Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cs-send-times" className="inline-flex items-center gap-2">
                <Clock className="size-4" /> Jam kirim (HH:mm, pisah koma)
              </Label>
              <Input
                id="cs-send-times"
                value={formData.sendTimes}
                onChange={(e) => setFormData((c) => ({ ...c, sendTimes: e.target.value }))}
                placeholder="08:00, 17:00"
                className="max-w-md"
              />
              <p className="text-xs text-muted-foreground">
                Contoh: <code>08:00, 12:30, 17:00</code> (UTC+8). Setiap slot dikirim max 1× per hari.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>Penerima utama (User Management)</Label>
                <EmployeeMultiSelect
                  label="penerima"
                  selectedEmails={
                    formData.recipientEmails
                      ? formData.recipientEmails
                          .split(',')
                          .map((e) => e.trim())
                          .filter(Boolean)
                      : []
                  }
                  onChange={(emails: string[]) =>
                    setFormData((c) => ({ ...c, recipientEmails: emails.join(', ') }))
                  }
                  employees={employees}
                  placeholder="Pilih karyawan dari User Management..."
                />
                <p className="text-xs text-muted-foreground">
                  Daftar dari User Management (`hero_employees`) yang punya email aktif.
                </p>
              </div>
              <div className="space-y-2">
                <Label>CC (User Management)</Label>
                <EmployeeMultiSelect
                  label="CC"
                  selectedEmails={
                    formData.ccEmails
                      ? formData.ccEmails
                          .split(',')
                          .map((e) => e.trim())
                          .filter(Boolean)
                      : []
                  }
                  onChange={(emails: string[]) =>
                    setFormData((c) => ({ ...c, ccEmails: emails.join(', ') }))
                  }
                  employees={employees}
                  placeholder="Pilih CC dari User Management..."
                />
                <p className="text-xs text-muted-foreground">
                  Opsional. Hanya email karyawan aktif dari User Management.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="template" className="mt-4 space-y-4">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-primary">
                <Sparkles className="size-3.5" /> Variabel Dinamis Tersedia
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PLACEHOLDERS.map((p) => (
                  <Badge
                    key={p.code}
                    variant="outline"
                    className="cursor-pointer bg-background text-[11px] hover:bg-muted"
                    title={p.label}
                    onClick={() => {
                      navigator.clipboard.writeText(p.code)
                      toast.success(`Copied ${p.code} to clipboard`)
                    }}
                  >
                    {p.code}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cs-template-subject">Subject Email</Label>
              <Input
                id="cs-template-subject"
                value={templateData.subject}
                onChange={(e) => setTemplateData((t) => ({ ...t, subject: e.target.value }))}
                placeholder="CS Forecast Daily Report {{periodLabel}} - {{reportDate}}"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cs-template-html">Custom HTML Body Email</Label>
              <Textarea
                id="cs-template-html"
                rows={9}
                value={templateData.htmlContent}
                onChange={(e) => setTemplateData((t) => ({ ...t, htmlContent: e.target.value }))}
                placeholder="<p>Yth. Bapak/Ibu Management & Team Central Service...</p>"
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Anda dapat mengubah salam pembuka, rincian pesan, maupun footer sesuai kebutuhan.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cs-template-text">Text Body (Plain Text)</Label>
              <Textarea
                id="cs-template-text"
                rows={5}
                value={templateData.textContent}
                onChange={(e) => setTemplateData((t) => ({ ...t, textContent: e.target.value }))}
                placeholder="Yth. Bapak/Ibu Management & Team Central Service..."
                className="font-mono text-xs"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Last sent: <span className="font-medium text-foreground">{lastSentLabel}</span>
          {config.lastSentKey ? ` · key ${config.lastSentKey}` : ''}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Menyimpan...' : 'Simpan Setting & Body Email'}
          </Button>
          <Button type="button" variant="outline" onClick={handleSendNow} disabled={isSending}>
            <Send className="mr-2 size-4" />
            {isSending ? 'Mengirim...' : 'Kirim Sekarang'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
