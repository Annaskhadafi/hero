'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileVideo, Loader2, Play, Save, ScanSearch, Settings2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

type Settings = { apiUrl: string; modelEndpoint: string }
type Damage = { label: string; confidence: number | null }
type Prediction = { success?: boolean; result?: unknown; error?: string }

const DEFAULT_SETTINGS: Settings = { apiUrl: '', modelEndpoint: 'tire-demage-onnx' }
const ACCEPTED_MEDIA = 'image/jpeg,image/png,image/webp,video/mp4,video/x-msvideo,video/quicktime'

function findDamages(value: unknown): Damage[] {
  if (!value || typeof value !== 'object') return []
  const object = value as Record<string, unknown>
  for (const key of ['detections', 'predictions', 'damages', 'results']) {
    if (!Array.isArray(object[key])) continue
    const found = object[key].flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const row = item as Record<string, unknown>
      const label = [row.class_name, row.class, row.label, row.name].find((v) => typeof v === 'string' && v.trim())
      if (typeof label !== 'string') return []
      const raw = [row.confidence, row.score, row.conf].find((v) => typeof v === 'number')
      const confidence = typeof raw === 'number' ? (raw > 1 ? raw / 100 : raw) : null
      return [{ label, confidence }]
    })
    if (found.length) return found
  }
  return findDamages(object.data) || findDamages(object.result)
}

function findAnnotatedUrl(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const object = value as Record<string, unknown>
  for (const key of ['annotated_url', 'annotated_image_url', 'image_url', 'output_url']) {
    if (typeof object[key] === 'string' && object[key]) return object[key]
  }
  return findAnnotatedUrl(object.data) || findAnnotatedUrl(object.result)
}

export default function TireDamageDesktopClient({ canEdit }: { canEdit: boolean }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [draft, setDraft] = useState<Settings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('hero.tireDamage.settings')
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Settings>
        const next = { ...DEFAULT_SETTINGS, ...parsed }
        setSettings(next)
        setDraft(next)
      }
    } catch {
      // Ignore malformed local preferences.
    }
  }, [])

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const damages = useMemo(() => findDamages(result), [result])
  const annotatedUrl = useMemo(() => findAnnotatedUrl(result), [result])

  function chooseFile(next: File | undefined) {
    if (!next) return
    const isVideo = next.type.startsWith('video/')
    if (!ACCEPTED_MEDIA.split(',').includes(next.type)) return toast.error('Gunakan JPG, PNG, WebP, MP4, AVI, atau MOV.')
    if (next.size > (isVideo ? 100 : 15) * 1024 * 1024) return toast.error('Ukuran file melebihi batas.')
    if (preview) URL.revokeObjectURL(preview)
    setFile(next)
    setPreview(URL.createObjectURL(next))
    setResult(null)
  }

  function saveSettings() {
    const modelEndpoint = draft.modelEndpoint.trim()
    if (!/^[a-zA-Z0-9._-]{1,80}$/.test(modelEndpoint)) return toast.error('Nama model hanya boleh berisi huruf, angka, titik, garis bawah, atau strip.')
    if (draft.apiUrl.trim()) {
      try {
        const url = new URL(draft.apiUrl.trim())
        if (url.protocol !== 'https:' && !(url.hostname === 'localhost' && url.protocol === 'http:')) throw new Error()
        setDraft({ apiUrl: url.toString().replace(/\/$/, ''), modelEndpoint })
      } catch {
        return toast.error('URL API harus HTTPS (HTTP hanya di localhost).')
      }
    }
    const next = { apiUrl: draft.apiUrl.trim().replace(/\/$/, ''), modelEndpoint }
    localStorage.setItem('hero.tireDamage.settings', JSON.stringify(next))
    setSettings(next)
    setDraft(next)
    setShowSettings(false)
    toast.success('Pengaturan model tersimpan di browser ini.')
  }

  async function predict() {
    if (!file || loading) return
    setLoading(true)
    setResult(null)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('model_endpoint', settings.modelEndpoint)
      if (settings.apiUrl) body.append('api_url', settings.apiUrl)
      const response = await fetch('/api/mobile/tire-damage/predict', { method: 'POST', body })
      const payload = (await response.json()) as Prediction
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Deteksi kerusakan gagal.')
      setResult(payload.result)
      toast.success('Analisis selesai.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Deteksi kerusakan gagal.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-full bg-[#f3f7fa] p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1d7aa8]">HSE • AI Inspection</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-[#082033]">Analisis Kerusakan Ban</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-[#486275]">Uji foto atau video ban dengan Vision AI. Pilih model dan endpoint tanpa mengubah source code.</p>
          </div>
          {canEdit ? <button type="button" onClick={() => setShowSettings((value) => !value)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#bcd6e7] bg-white px-4 text-sm font-bold text-[#003f78] shadow-sm"><Settings2 className="size-4" /> Pengaturan AI</button> : null}
        </header>

        {showSettings && canEdit ? (
          <section className="rounded-2xl border border-[#bcd6e7] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="font-black text-[#082033]">Konfigurasi Vision AI</h2><p className="text-xs font-medium text-[#486275]">API key tetap berada di server; hanya URL dan nama model yang disimpan di browser.</p></div><button type="button" aria-label="Tutup pengaturan" onClick={() => setShowSettings(false)}><X className="size-5 text-slate-500" /></button></div>
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <label className="text-xs font-bold text-[#486275]">URL API<input value={draft.apiUrl} onChange={(event) => setDraft({ ...draft, apiUrl: event.target.value })} placeholder="Kosongkan untuk URL server default" className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-800 outline-none focus:border-[#1d7aa8]" /></label>
              <label className="text-xs font-bold text-[#486275]">Model endpoint<input value={draft.modelEndpoint} onChange={(event) => setDraft({ ...draft, modelEndpoint: event.target.value })} placeholder="tire-demage-onnx" className="mt-1 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-800 outline-none focus:border-[#1d7aa8]" /></label>
              <button type="button" onClick={saveSettings} className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#003f78] px-4 text-sm font-bold text-white"><Save className="size-4" /> Simpan</button>
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#bcd6e7] bg-[#f8fcfe] p-6 text-center">
              {preview ? (file?.type.startsWith('video/') ? <video src={preview} controls className="max-h-[330px] w-full rounded-lg object-contain" /> : <img src={preview} alt="Pratinjau ban" className="max-h-[330px] w-full rounded-lg object-contain" />) : <><Upload className="size-10 text-[#1d7aa8]" /><span className="mt-3 text-base font-black text-[#082033]">Unggah foto atau video ban</span><span className="mt-1 text-xs font-medium text-[#486275]">JPG, PNG, WebP sampai 15MB • MP4, AVI, MOV sampai 100MB</span></>}
              <input type="file" className="hidden" accept={ACCEPTED_MEDIA} onChange={(event) => chooseFile(event.target.files?.[0])} />
            </label>
            {file ? <div className="mt-3 flex items-center justify-between rounded-lg bg-[#eaf4fb] px-3 py-2 text-xs font-bold text-[#153249]"><span className="flex min-w-0 items-center gap-2 truncate">{file.type.startsWith('video/') ? <FileVideo className="size-4 shrink-0" /> : <Upload className="size-4 shrink-0" />}{file.name}</span><button type="button" aria-label="Hapus file" onClick={() => { setFile(null); if (preview) URL.revokeObjectURL(preview); setPreview(null); setResult(null) }}><X className="size-4" /></button></div> : null}
            <button type="button" disabled={!file || loading} onClick={() => void predict()} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#003f78] text-sm font-black text-white disabled:opacity-50">{loading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}{loading ? 'Menganalisis...' : 'Mulai Analisis'}</button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><ScanSearch className="size-5 text-[#1d7aa8]" /><h2 className="font-black text-[#082033]">Hasil Vision AI</h2></div>
            {!result ? <p className="mt-10 text-center text-sm font-medium text-[#486275]">Hasil analisis akan tampil di sini.</p> : <div className="mt-5 space-y-4">{annotatedUrl ? <img src={`/api/mobile/tire-damage/download?url=${encodeURIComponent(annotatedUrl)}`} alt="Hasil anotasi kerusakan ban" className="max-h-64 w-full rounded-lg bg-slate-100 object-contain" /> : null}<div className="rounded-xl bg-[#f3f7fa] p-4"><p className="text-xs font-black uppercase tracking-wider text-[#486275]">Temuan</p>{damages.length ? <ul className="mt-2 space-y-2">{damages.map((damage, index) => <li key={`${damage.label}-${index}`} className="flex items-center justify-between text-sm font-bold text-[#082033]"><span>{damage.label}</span><span className="text-[#1d7aa8]">{damage.confidence === null ? '-' : `${Math.round(damage.confidence * 100)}%`}</span></li>)}</ul> : <p className="mt-2 text-sm font-medium text-[#486275]">Tidak ada detail terstruktur dari model.</p>}</div></div>}
          </div>
        </section>
      </div>
    </main>
  )
}
