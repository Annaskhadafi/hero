'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, FileImage, Send } from 'lucide-react'
import { toast } from 'sonner'
import { submitAttendancePermission } from '@/app/actions/attendance'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type PermissionRequestFormProps = {
  variant?: 'desktop' | 'mobile'
}

export function PermissionRequestForm({ variant = 'desktop' }: PermissionRequestFormProps) {
  const router = useRouter()
  const [type, setType] = useState('sick')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const title = variant === 'mobile' ? 'Izin / Sakit' : 'Pengajuan Izin Attendance'
  const helper = useMemo(
    () =>
      type === 'sick'
        ? 'Cell attendance berubah menjadi Sakit. Foto surat sakit opsional.'
        : 'Cell attendance berubah menjadi Izin. Bukti foto opsional.',
    [type]
  )

  function handleSubmit(formData: FormData) {
    setError('')
    setMessage('')
    startTransition(async () => {
      const result = await submitAttendancePermission(formData)
      if (!result.success) {
        const nextError = result.error || 'Pengajuan gagal.'
        setError(nextError)
        toast.error(nextError)
        return
      }
      const nextMessage = result.message || 'Izin tersimpan.'
      setMessage(nextMessage)
      toast.success(nextMessage)
      router.refresh()
    })
  }

  return (
    <Card className="surface-module-card rounded-[1.1rem] border-0 p-4 shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase">
            Attendance Exception
          </p>
          <h1 className="font-display text-foreground mt-1 text-xl font-semibold">{title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{helper}</p>
        </div>
        <div className="bg-surface-container-low text-muted-foreground rounded-full p-2">
          <CalendarDays className="size-5" />
        </div>
      </div>

      <form action={handleSubmit} className="mt-4 grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tipe Izin</Label>
            <select
              name="permissionType"
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="flex h-10 w-full rounded-md border-0 border-b-2 border-b-transparent bg-surface-container-low px-3 text-sm shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)] outline-none focus:border-b-primary focus:bg-surface-container-lowest"
            >
              <option value="sick">Sakit</option>
              <option value="urgent">Izin Urgent</option>
              <option value="leave">Izin Lainnya</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Tanggal</Label>
            <Input
              type="date"
              name="requestDate"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Alasan</Label>
          <Textarea
            name="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Contoh: sakit demam / izin keluarga mendadak"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="inline-flex items-center gap-2">
            <FileImage className="size-4" /> Foto Surat / Bukti (Opsional)
          </Label>
          <input type="hidden" name="uploadTarget" value="attendance" />
          <Input type="file" name="file" accept="image/*" />
        </div>
        {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
        {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
        <Button type="submit" disabled={isPending} className="w-full sm:w-fit">
          <Send className="mr-2 size-4" /> {isPending ? 'Menyimpan...' : 'Kirim Izin'}
        </Button>
      </form>
    </Card>
  )
}
