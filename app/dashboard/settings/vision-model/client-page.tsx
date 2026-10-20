'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowLeft,
  Check,
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  ExternalLink,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Server,
  Sliders,
  Star,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  type VisionModelSettings,
  type VisionModelEndpointPreset,
} from '@/lib/vision-model-settings'
import {
  syncEndpointsFromVisionAction,
  testVisionConnectionAction,
  updateVisionModelSettingsAction,
} from './actions'

interface VisionModelSettingsClientProps {
  initialSettings: VisionModelSettings
  canEdit: boolean
}

export function VisionModelSettingsClient({
  initialSettings,
  canEdit,
}: VisionModelSettingsClientProps) {
  const [settings, setSettings] = useState<VisionModelSettings>(initialSettings)
  const [showApiKey, setShowApiKey] = useState(false)
  const [saving, setSaving] = useState(false)

  // Test connection state
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{
    endpoint: string
    success: boolean
    statusCode?: number
    latencyMs?: number
    message: string
  } | null>(null)

  // Modal tambah preset
  const [modalOpen, setModalOpen] = useState(false)
  const [newPreset, setNewPreset] = useState<Partial<VisionModelEndpointPreset>>({
    name: '',
    endpoint: '',
    description: '',
  })

  // Handle save
  async function handleSave() {
    if (!canEdit) {
      toast.error('Anda tidak memiliki izin untuk mengubah pengaturan model.')
      return
    }

    if (!settings.baseUrl.trim()) {
      toast.error('Base URL Vision API tidak boleh kosong.')
      return
    }
    if (!settings.primaryEndpoint.trim()) {
      toast.error('Primary Endpoint tidak boleh kosong.')
      return
    }

    setSaving(true)
    try {
      const res = await updateVisionModelSettingsAction(settings)
      if (res.success) {
        toast.success('Pengaturan model vision berhasil disimpan ke database.')
      } else {
        toast.error(res.error || 'Gagal menyimpan pengaturan.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.')
    } finally {
      setSaving(false)
    }
  }

  // Handle test connection
  async function handleTestEndpoint(endpointSlug: string) {
    const slug = endpointSlug.trim()
    if (!slug) {
      toast.error('Tentukan nama slug endpoint terlebih dahulu.')
      return
    }

    setTestingEndpoint(slug)
    setTestResult(null)

    try {
      const res = await testVisionConnectionAction({
        baseUrl: settings.baseUrl,
        endpoint: slug,
        apiKey: settings.apiKey,
      })
      setTestResult({
        endpoint: slug,
        success: res.success,
        statusCode: res.statusCode,
        latencyMs: res.latencyMs,
        message: res.message,
      })

      if (res.success) {
        toast.success(`Koneksi endpoint "${slug}" berhasil (${res.latencyMs}ms)`)
      } else {
        toast.error(`Koneksi ke "${slug}" gagal: ${res.message}`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menguji endpoint.')
    } finally {
      setTestingEndpoint(null)
    }
  }

  // Handle add preset
  function handleAddPreset() {
    if (!newPreset.name?.trim() || !newPreset.endpoint?.trim()) {
      toast.error('Nama model dan slug endpoint wajib diisi.')
      return
    }

    const created: VisionModelEndpointPreset = {
      id: `custom-${Date.now()}`,
      name: newPreset.name.trim(),
      endpoint: newPreset.endpoint.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
      description: newPreset.description?.trim() || undefined,
      isDefault: false,
    }

    setSettings((prev) => ({
      ...prev,
      customEndpoints: [...prev.customEndpoints, created],
    }))

    setNewPreset({ name: '', endpoint: '', description: '' })
    setModalOpen(false)
    toast.success(`Preset model "${created.name}" berhasil ditambahkan.`)
  }

  // Handle set as primary / default model
  function handleSetAsPrimary(endpoint: string, name?: string) {
    if (!canEdit) {
      toast.error('Anda tidak memiliki izin untuk mengubah pengaturan model.')
      return
    }

    const cleanEndpoint = endpoint.trim().toLowerCase()
    setSettings((prev) => ({
      ...prev,
      primaryEndpoint: cleanEndpoint,
      customEndpoints: prev.customEndpoints.map((p) => ({
        ...p,
        isDefault: p.endpoint === cleanEndpoint,
      })),
    }))

    toast.success(
      `"${name || cleanEndpoint}" dipilih sebagai Model Utama (Default). Klik tombol "Simpan Pengaturan" untuk menerapkan perubahan.`
    )
  }

  // Handle delete preset
  function handleDeletePreset(id: string) {
    setSettings((prev) => ({
      ...prev,
      customEndpoints: prev.customEndpoints.filter((p) => p.id !== id),
    }))
    toast.success('Preset endpoint dihapus.')
  }

  // Handle live sync from Raray Vision API
  const [syncing, setSyncing] = useState(false)
  async function handleSyncFromVision() {
    setSyncing(true)
    try {
      const res = await syncEndpointsFromVisionAction({
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
      })

      if (!res.success || !res.endpoints) {
        toast.error(res.message || 'Gagal menyinkronkan endpoint.')
        return
      }

      if (res.endpoints.length === 0) {
        toast.info('Tidak ada endpoint aktif yang ditemukan di server Raray Vision.')
        return
      }

      const syncedPresets: VisionModelEndpointPreset[] = res.endpoints.map((ep) => ({
        id: `rv-${ep.id}-${ep.slug}`,
        name: ep.name || ep.slug,
        endpoint: ep.slug,
        description: ep.description || (ep.model_name ? `Model: ${ep.model_name} (${ep.model_version || 'v1'})` : undefined),
        isDefault: ep.slug === settings.primaryEndpoint,
      }))

      setSettings((prev) => ({
        ...prev,
        customEndpoints: syncedPresets,
      }))

      toast.success(
        `Berhasil menyinkronkan ${syncedPresets.length} endpoint langsung dari Raray Vision! Klik 'Simpan Pengaturan' untuk menyimpan ke database.`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyinkronkan endpoint.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/hero-genius/tire-damage"
              className="inline-flex size-8 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Kembali ke Deteksi Ban"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Cpu className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Pengaturan Model Vision AI</h1>
              <p className="text-xs text-muted-foreground">
                Konfigurasi URL endpoint, custom serving models, dan threshold inferensi deteksi kerusakan ban.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/hero-genius/tire-damage">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ExternalLink className="size-3.5" />
              Buka Halaman Deteksi
            </Button>
          </Link>
          {canEdit && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="gap-1.5 bg-[#003461] hover:bg-[#002647] text-white"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Simpan Pengaturan
            </Button>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          Mode hanya lihat (Read-Only). Anda memerlukan hak akses Administrator untuk memperbarui pengaturan model.
        </div>
      )}

      {/* Active Model Summary Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
            <Star className="size-5 fill-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm text-emerald-950 dark:text-emerald-100">
                Model Utama Aktif:
              </span>
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs py-0.5 px-2">
                {settings.customEndpoints.find((p) => p.endpoint === settings.primaryEndpoint)?.name ||
                  settings.primaryEndpoint}
              </Badge>
              <code className="font-mono text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded">
                {settings.primaryEndpoint}
              </code>
            </div>
            <p className="mt-1 text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
              Model ini otomatis disinkronkan dan digunakan sebagai default untuk seluruh sistem: <strong>HERO Mobile (/mobile/hse/tire-damage)</strong> dan <strong>HERO Genius Desktop</strong>.
            </p>
          </div>
        </div>
        {canEdit && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="shrink-0 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Simpan Pengaturan
          </Button>
        )}
      </div>

      {/* Grid: Core Config & Live Test */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Card 1: Core Configuration (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Server className="size-4 text-primary" />
                Koneksi Server Vision API
              </CardTitle>
              <Badge variant="outline" className="text-[11px] font-normal">
                Dinamis Database
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Alamat host backend dan endpoint utama yang akan dipanggil saat user melakukan analisis gambar atau video.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Base URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Vision Base URL</Label>
              <div className="flex gap-2">
                <Input
                  value={settings.baseUrl}
                  onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
                  placeholder="https://vision.chitraparatama.com"
                  disabled={!canEdit}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestEndpoint(settings.primaryEndpoint)}
                  disabled={testingEndpoint === settings.primaryEndpoint}
                  className="shrink-0 text-xs gap-1"
                >
                  {testingEndpoint === settings.primaryEndpoint ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Activity className="size-3 text-emerald-600" />
                  )}
                  Uji Koneksi
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Domain server microservice Raray Vision (misal Dokploy internal atau public domain).
              </p>
            </div>

            {/* Primary & Fallback Endpoints */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Star className="size-3.5 text-amber-500 fill-amber-500" />
                    Pilih Model Utama (Default)
                  </Label>
                  <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    Mobile & Desktop
                  </span>
                </div>

                <Select
                  value={settings.primaryEndpoint}
                  onValueChange={(val) => {
                    const preset = settings.customEndpoints.find((p) => p.endpoint === val)
                    handleSetAsPrimary(val, preset?.name)
                  }}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="text-xs font-medium">
                    <SelectValue placeholder="Pilih model utama..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {settings.customEndpoints.map((ep) => (
                      <SelectItem key={ep.id} value={ep.endpoint} className="text-xs">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            {ep.name}
                            {ep.endpoint === settings.primaryEndpoint && (
                              <span className="text-[10px] text-emerald-600 font-normal">
                                (Sedang Aktif)
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {ep.endpoint}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                    {!settings.customEndpoints.some((p) => p.endpoint === settings.primaryEndpoint) && (
                      <SelectItem value={settings.primaryEndpoint} className="text-xs font-mono">
                        {settings.primaryEndpoint} (Kustom)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                <div className="space-y-1 pt-0.5">
                  <span className="text-[10px] text-muted-foreground">Slug endpoint aktif:</span>
                  <Input
                    value={settings.primaryEndpoint}
                    onChange={(e) => {
                      const val = e.target.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
                      setSettings((prev) => ({
                        ...prev,
                        primaryEndpoint: val,
                        customEndpoints: prev.customEndpoints.map((p) => ({
                          ...p,
                          isDefault: p.endpoint === val,
                        })),
                      }))
                    }}
                    placeholder="tire-demage-onnx"
                    disabled={!canEdit}
                    className="font-mono text-xs"
                  />
                </div>
                <p className="text-[10.5px] text-muted-foreground">
                  Pilih dari dropdown model yang tersedia, atau ketik slug kustom bila ada model baru.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Pilih Model Cadangan (Fallback)</Label>
                  <span className="text-[10px] text-amber-600 font-medium">Cadangan Otomatis</span>
                </div>

                <Select
                  value={settings.fallbackEndpoint}
                  onValueChange={(val) => setSettings({ ...settings, fallbackEndpoint: val })}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="text-xs font-medium">
                    <SelectValue placeholder="Pilih model cadangan..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {settings.customEndpoints.map((ep) => (
                      <SelectItem key={ep.id} value={ep.endpoint} className="text-xs">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{ep.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {ep.endpoint}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                    {!settings.customEndpoints.some((p) => p.endpoint === settings.fallbackEndpoint) && (
                      <SelectItem value={settings.fallbackEndpoint} className="text-xs font-mono">
                        {settings.fallbackEndpoint} (Kustom)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                <div className="space-y-1 pt-0.5">
                  <span className="text-[10px] text-muted-foreground">Slug fallback aktif:</span>
                  <Input
                    value={settings.fallbackEndpoint}
                    onChange={(e) => setSettings({ ...settings, fallbackEndpoint: e.target.value })}
                    placeholder="tire-demage"
                    disabled={!canEdit}
                    className="font-mono text-xs"
                  />
                </div>
                <p className="text-[10.5px] text-muted-foreground">
                  Dipanggil otomatis oleh server HERO jika endpoint utama offline atau lambat.
                </p>
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Vision API Key (Opsional)</Label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.apiKey || ''}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  placeholder="rv_xxxxxxxxxxxxxxxxxxxxxxxx"
                  disabled={!canEdit}
                  className="font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Gunakan jika server Raray Vision membutuhkan header otentikasi X-API-Key atau Bearer Token.
              </p>
            </div>

            {/* Default Thresholds */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Sliders className="size-4 text-primary" />
                <h4 className="text-xs font-semibold">Default Hyperparameters</h4>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <Label className="text-xs">Confidence Threshold</Label>
                    <span className="font-mono font-semibold text-primary">{settings.defaultConfidence.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.95"
                    step="0.05"
                    value={settings.defaultConfidence}
                    onChange={(e) => setSettings({ ...settings, defaultConfidence: parseFloat(e.target.value) })}
                    disabled={!canEdit}
                    className="w-full accent-primary"
                  />
                  <p className="text-[10px] text-muted-foreground">Ambang minimal kepastian deteksi (0.05 - 0.95).</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <Label className="text-xs">IoU Threshold</Label>
                    <span className="font-mono font-semibold text-primary">{settings.defaultIou.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.95"
                    step="0.05"
                    value={settings.defaultIou}
                    onChange={(e) => setSettings({ ...settings, defaultIou: parseFloat(e.target.value) })}
                    disabled={!canEdit}
                    className="w-full accent-primary"
                  />
                  <p className="text-[10px] text-muted-foreground">Ambang overlap NMS bounding box (0.05 - 0.95).</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Quick Status & Connection Test (1 col) */}
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                Status & Tes Ping
              </CardTitle>
              <CardDescription className="text-xs">
                Periksa ketersediaan service model secara langsung.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Host:</span>
                  <span className="font-mono font-medium truncate max-w-[180px]">{settings.baseUrl}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Target Test:</span>
                  <span className="font-mono font-medium">{settings.primaryEndpoint}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Terakhir Diperbarui:</span>
                  <span className="text-[11px]">{settings.updatedAt ? new Date(settings.updatedAt).toLocaleString('id-ID') : 'Bawaan Sistem'}</span>
                </div>
              </div>

              {testResult && (
                <div
                  className={`rounded-lg border p-3 text-xs space-y-1.5 ${
                    testResult.success
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    {testResult.success ? (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    ) : (
                      <XCircle className="size-4 text-red-600" />
                    )}
                    <span>{testResult.success ? 'Koneksi Berhasil' : 'Koneksi Gagal'}</span>
                    {testResult.latencyMs !== undefined && (
                      <Badge variant="outline" className="ml-auto text-[10px]">
                        {testResult.latencyMs} ms
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed">{testResult.message}</p>
                </div>
              )}
            </CardContent>
          </div>

          <div className="p-6 pt-0">
            <Button
              type="button"
              variant="outline"
              className="w-full text-xs gap-1.5"
              onClick={() => handleTestEndpoint(settings.primaryEndpoint)}
              disabled={testingEndpoint !== null}
            >
              {testingEndpoint ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Uji Koneksi Endpoint Utama
            </Button>
          </div>
        </Card>
      </div>

      {/* Card 3: Custom Endpoints & Preset Models */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                Daftar Preset Custom Models & Endpoints
              </CardTitle>
              <CardDescription className="text-xs">
                Model-model yang didaftarkan di sini akan muncul pada dropdown selector di halaman deteksi desktop.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSyncFromVision}
                disabled={syncing}
                className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5"
              >
                {syncing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                Sinkronisasi dari Raray Vision
              </Button>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setModalOpen(true)}
                  className="gap-1.5 text-xs shrink-0"
                >
                  <Plus className="size-3.5" />
                  Tambah Manual
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Nama Model</TableHead>
                  <TableHead className="text-xs font-semibold">Endpoint Slug</TableHead>
                  <TableHead className="text-xs font-semibold">Deskripsi</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.customEndpoints.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                      Belum ada preset endpoint kustom. Klik tombol "Tambah Model Endpoint" di atas.
                    </TableCell>
                  </TableRow>
                ) : (
                  settings.customEndpoints.map((preset) => (
                    <TableRow key={preset.id}>
                      <TableCell className="font-medium text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{preset.name}</span>
                          {preset.endpoint === settings.primaryEndpoint ? (
                            <Badge className="bg-emerald-600 text-white text-[10px] py-0.5 px-2 font-medium flex items-center gap-1 shadow-xs">
                              <Star className="size-3 fill-white" />
                              Model Utama (Default)
                            </Badge>
                          ) : preset.endpoint === settings.fallbackEndpoint ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-[10px] py-0 px-1.5 font-normal">
                              Fallback
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {preset.endpoint}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {preset.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit && (
                            preset.endpoint === settings.primaryEndpoint ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled
                                className="h-7 text-xs px-2.5 gap-1 border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold cursor-default"
                              >
                                <Check className="size-3 text-emerald-600" />
                                Sedang Aktif
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetAsPrimary(preset.endpoint, preset.name)}
                                className="h-7 text-xs px-2.5 gap-1 border-emerald-300 hover:border-emerald-500 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 font-medium transition-colors"
                                title="Jadikan model ini sebagai default untuk Mobile & Desktop"
                              >
                                <Star className="size-3 text-amber-500 fill-amber-500" />
                                Jadikan Default
                              </Button>
                            )
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTestEndpoint(preset.endpoint)}
                            disabled={testingEndpoint === preset.endpoint}
                            className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                            title="Uji Endpoint"
                          >
                            {testingEndpoint === preset.endpoint ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Zap className="size-3 text-amber-500" />
                            )}
                            Test
                          </Button>
                          {canEdit && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePreset(preset.id)}
                              className="h-7 text-xs px-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                              title="Hapus Preset"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Dialog Tambah Preset */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Tambah Preset Model Endpoint</DialogTitle>
            <DialogDescription className="text-xs">
              Daftarkan slug endpoint model baru yang sudah aktif di server Raray Vision.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Model Tampilan</Label>
              <Input
                value={newPreset.name || ''}
                onChange={(e) => setNewPreset({ ...newPreset, name: e.target.value })}
                placeholder="Contoh: YOLO-26 Fine-Tuned v2"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Endpoint Slug</Label>
              <Input
                value={newPreset.endpoint || ''}
                onChange={(e) => setNewPreset({ ...newPreset, endpoint: e.target.value })}
                placeholder="tire-demage-yolo26"
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Sesuai dengan nama slug endpoint di menu API Hub Raray Vision.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Deskripsi (Opsional)</Label>
              <Input
                value={newPreset.description || ''}
                onChange={(e) => setNewPreset({ ...newPreset, description: e.target.value })}
                placeholder="Model dengan dataset tambahan site Sangatta..."
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} className="text-xs">
              Batal
            </Button>
            <Button size="sm" onClick={handleAddPreset} className="text-xs bg-[#003461] hover:bg-[#002647] text-white">
              Tambah Model
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
