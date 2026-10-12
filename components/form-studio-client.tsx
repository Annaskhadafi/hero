'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AdminPageShell } from '@/components/admin-page-shell'
import { AdminMetricGrid } from '@/components/admin-metric-grid'
import { AdminStatusBadge } from '@/components/admin-status-badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  Plus,
  BarChart3,
  Edit,
  ExternalLink,
  Copy,
  Trash2,
  MoreVertical,
  Check,
  Globe,
  Users,
  Eye,
  CheckCircle2,
  Send,
  MessageSquare,
} from 'lucide-react'
import {
  createFormAction,
  deleteFormAction,
  broadcastWhatsAppFormAction,
} from '@/app/dashboard/form-studio/actions'
import { getFormBaseUrl } from '@/lib/form-config'

export function FormStudioClient({
  blueprintData,
  customForms,
}: {
  blueprintData: any
  customForms: any[]
}) {
  const router = useRouter()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formCategory, setFormCategory] = useState('Survei & Kuesioner')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  // Broadcast WhatsApp state
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false)
  const [broadcastForm, setBroadcastForm] = useState<any | null>(null)
  const [broadcastPhones, setBroadcastPhones] = useState('')
  const [broadcastCustomMessage, setBroadcastCustomMessage] = useState('')
  const [isBroadcasting, setIsBroadcasting] = useState(false)

  const baseUrl = getFormBaseUrl()

  const totalForms = customForms.length
  const totalViews = customForms.reduce((acc, f) => acc + (f.viewCount || 0), 0)
  const totalSubmissions = customForms.reduce((acc, f) => acc + (f.completionCount || 0), 0)
  const avgCompletionRate =
    totalViews > 0 ? Math.round((totalSubmissions / totalViews) * 100) : 0

  function openBroadcastDialog(form: any) {
    setBroadcastForm(form)
    const publicUrl = `${baseUrl}/f/${form.slug}`
    setBroadcastCustomMessage(
      `Halo Rekan/Bapak/Ibu,\n\nMohon kesediaannya untuk meluangkan waktu sejenak mengisi formulir/kuesioner resmi PT Chitra Paratama berikut:\n\n📋 *${form.name}*\n${form.description ? `_${form.description}_\n` : ''}\n🔗 *Link Pengisian:* ${publicUrl}\n\nMasukan Anda sangat berharga bagi peningkatan mutu dan layanan kami.\nTerima kasih! 🙏`
    )
    setIsBroadcastOpen(true)
  }

  async function handleSendBroadcast(e: React.FormEvent) {
    e.preventDefault()
    if (!broadcastForm) return

    const phones = broadcastPhones
      .split(/[\n,;]+/)
      .map((p) => p.trim())
      .filter(Boolean)

    if (phones.length === 0) {
      alert('Silakan masukkan minimal satu nomor WhatsApp tujuan.')
      return
    }

    setIsBroadcasting(true)
    try {
      const res = await broadcastWhatsAppFormAction({
        formId: broadcastForm.id,
        phoneNumbers: phones,
        customMessage: broadcastCustomMessage,
      })

      if (res.success) {
        alert(`Berhasil memproses broadcast WhatsApp ke ${res.sentCount} nomor tujuan!`)
        setIsBroadcastOpen(false)
        setBroadcastPhones('')
      } else {
        alert(res.error || 'Gagal mengirim broadcast WhatsApp.')
      }
    } finally {
      setIsBroadcasting(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim()) return

    setIsSubmitting(true)
    try {
      const res = await createFormAction({
        name: formName.trim(),
        description: formDesc.trim(),
        category: formCategory,
      })

      if (res.success && res.formId) {
        setIsCreateOpen(false)
        router.push(`/dashboard/form-studio/${res.formId}/builder`)
      } else {
        alert(res.error || 'Gagal membuat formulir')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(formId: number, name: string) {
    if (!confirm(`Apakah Anda yakin ingin menghapus form "${name}"? Seluruh respon akan dihapus.`)) {
      return
    }
    const res = await deleteFormAction(formId)
    if (res.success) {
      router.refresh()
    } else {
      alert(res.error || 'Gagal menghapus')
    }
  }

  function handleCopyLink(slug: string) {
    const fullUrl = `${baseUrl}/f/${slug}`
    navigator.clipboard.writeText(fullUrl)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(null), 2500)
  }

  return (
    <AdminPageShell
      eyebrow="Survey & Form Engine"
      title="Form Builder & Studio"
      description="Buat kuesioner enterprise, survei NPS/kepuasan responden publik (form.chitraparatama.com), dengan analitik real-time SurveyMonkey-grade."
      actions={
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              Buat Form Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Buat Kuesioner / Formulir Baru</DialogTitle>
                <DialogDescription>
                  Formulir akan otomatis disajikan di subdomain responden publik dengan verifikasi nama/email.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Judul Formulir</Label>
                  <Input
                    id="title"
                    placeholder="Contoh: Survei Kepuasan Karyawan & Mitra 2026"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Kategori</Label>
                  <Input
                    id="category"
                    placeholder="Contoh: Survei Pelanggan, Evaluasi HSE, Riset HR"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="desc">Deskripsi Singkat</Label>
                  <Textarea
                    id="desc"
                    placeholder="Jelaskan tujuan survei ini kepada responden..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Memproses...' : 'Lanjut ke Builder'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <AdminMetricGrid
        metrics={[
          {
            label: 'Total Formulir Aktif',
            value: totalForms,
            detail: `${customForms.filter((f) => f.isActive).length} siap menerima responden`,
          },
          {
            label: 'Total Kunjungan (Views)',
            value: totalViews,
            detail: 'Responden yang membuka link formulir',
          },
          {
            label: 'Total Jawaban Terkumpul',
            value: totalSubmissions,
            detail: 'Responden yang menyelesaikan kuesioner',
          },
          {
            label: 'Rata-rata Penyelesaian',
            value: `${avgCompletionRate}%`,
            detail: 'Completion rate kuesioner aktif',
          },
        ]}
      />

      <Card className="mt-6 border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg font-semibold">Daftar Formulir & Kuesioner</CardTitle>
            <CardDescription>
              Kelola pertanyaan, desain tema, buka analitik SurveyMonkey, atau salin link publik untuk responden.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {customForms.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">
              <FileText className="h-10 w-10 text-slate-400" />
              <h3 className="mt-3 text-base font-semibold text-slate-800 dark:text-slate-200">
                Belum ada formulir dibuat
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Klik tombol "Buat Form Baru" di atas untuk mulai membuat kuesioner pertama Anda.
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 gap-2"
                variant="outline"
              >
                <Plus className="h-4 w-4" /> Buat Form Pertama
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama & Slug Kuesioner</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Kunjungan</TableHead>
                    <TableHead>Respon Selesai</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customForms.map((form) => {
                    const publicUrl = `${baseUrl}/f/${form.slug}`
                    return (
                      <TableRow key={form.id}>
                        <TableCell>
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {form.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <Globe className="h-3 w-3" />
                            <span className="font-mono">{form.slug}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {form.category}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Eye className="h-3.5 w-3.5 text-slate-400" />
                            <span>{form.viewCount || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
                            <Users className="h-3.5 w-3.5" />
                            <span>{form.completionCount || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <AdminStatusBadge
                            status={form.isActive ? 'ready' : 'planned'}
                            customLabels={{ ready: 'Aktif', planned: 'Nonaktif' }}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/dashboard/form-studio/${form.id}/builder`}>
                              <Button size="sm" variant="outline" className="gap-1.5 h-8">
                                <Edit className="h-3.5 w-3.5" />
                                Builder
                              </Button>
                            </Link>

                            <Link href={`/dashboard/form-studio/${form.id}/analytics`}>
                              <Button size="sm" variant="secondary" className="gap-1.5 h-8">
                                <BarChart3 className="h-3.5 w-3.5 text-blue-600" />
                                Analitik
                              </Button>
                            </Link>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openBroadcastDialog(form)}
                              className="gap-1.5 h-8 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                              Broadcast WA
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openBroadcastDialog(form)}>
                                  <MessageSquare className="h-4 w-4 mr-2 text-emerald-600" />
                                  Broadcast WhatsApp
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCopyLink(form.slug)}>
                                  {copiedSlug === form.slug ? (
                                    <>
                                      <Check className="h-4 w-4 mr-2 text-emerald-600" />
                                      Tersalin!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-4 w-4 mr-2" />
                                      Salin Link Publik
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a href={publicUrl} target="_blank" rel="noreferrer">
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Buka Halaman Responden
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => handleDelete(form.id, form.name)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Hapus Formulir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIALOG BROADCAST WHATSAPP */}
      <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSendBroadcast}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <MessageSquare className="h-5 w-5" />
                Broadcast Link Kuesioner via WhatsApp
              </DialogTitle>
              <DialogDescription>
                Kirim pesan ajakan pengisian form langsung ke nomor WhatsApp responden, pelanggan, atau karyawan.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border text-xs space-y-1">
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  Formulir Target:
                </div>
                <div className="text-blue-600 font-medium truncate">
                  {broadcastForm?.name}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {baseUrl}/f/{broadcastForm?.slug}
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="phones" className="text-xs font-semibold">
                  Nomor WhatsApp Responden (Dukungan Banyak Nomor)
                </Label>
                <Textarea
                  id="phones"
                  placeholder={`Contoh:\n081234567890\n082198765432\n+6281355554444`}
                  value={broadcastPhones}
                  onChange={(e) => setBroadcastPhones(e.target.value)}
                  rows={4}
                  className="font-mono text-xs"
                  required
                />
                <span className="text-[11px] text-slate-400">
                  Pisahkan dengan baris baru (Enter), koma (,), atau titik koma (;).
                </span>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="waMessage" className="text-xs font-semibold">
                  Pesan Template WhatsApp
                </Label>
                <Textarea
                  id="waMessage"
                  value={broadcastCustomMessage}
                  onChange={(e) => setBroadcastCustomMessage(e.target.value)}
                  rows={5}
                  className="text-xs font-sans"
                />
                <span className="text-[11px] text-slate-400">
                  Format teks tebal (*kata*) dan miring (_kata_) didukung.
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBroadcastOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isBroadcasting}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                <Send className="h-4 w-4" />
                {isBroadcasting ? 'Mengirim...' : 'Kirim Broadcast'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}
