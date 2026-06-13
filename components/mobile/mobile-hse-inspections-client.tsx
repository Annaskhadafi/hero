"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import {
  deleteSafetyInspection,
  type SafetyInspection,
  type SafetyInspectionInsert,
} from "@/app/actions/safety-inspections"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Props = {
  inspections: SafetyInspection[]
  categories: string[]
  pics: string[]
  currentUser: string
}

function formatDate(value: Date | string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

const statusColor: Record<string, string> = {
  Completed: "bg-emerald-50 text-emerald-700",
  "In Progress": "bg-sky-50 text-sky-700",
  Pending: "bg-amber-50 text-amber-700",
}

export function MobileHseInspectionsClient({ inspections, categories, pics, currentUser }: Props) {
  const [query, setQuery] = useState("")
  const [list, setList] = useState(inspections)
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState<SafetyInspection | null>(null)
  const [editing, setEditing] = useState<SafetyInspection | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState("")
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0])
  const [formLocation, setFormLocation] = useState("")
  const [formCategory, setFormCategory] = useState("")
  const [formFindings, setFormFindings] = useState("")
  const [formRecommendation, setFormRecommendation] = useState("")
  const [formStatus, setFormStatus] = useState("Pending")
  const [formScore, setFormScore] = useState("")
  const [formPic, setFormPic] = useState(currentUser)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filtered = list.filter((i) => {
    const q = query.toLowerCase()
    return (
      i.title.toLowerCase().includes(q) ||
      i.location.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      i.picName.toLowerCase().includes(q)
    )
  })

  const total = list.length
  const completed = list.filter((i) => i.status === "Completed").length
  const inProgress = list.filter((i) => i.status === "In Progress").length
  const pending = list.filter((i) => i.status === "Pending").length
  const avgScore =
    list.filter((i) => i.assessmentScore != null).length > 0
      ? Math.round(
          list.reduce((sum, i) => sum + (i.assessmentScore ?? 0), 0) /
            list.filter((i) => i.assessmentScore != null).length,
        )
      : 0

  function openCreate() {
    setEditing(null)
    setFormTitle("")
    setFormDate(new Date().toISOString().split("T")[0])
    setFormLocation("")
    setFormCategory("")
    setFormFindings("")
    setFormRecommendation("")
    setFormStatus("Pending")
    setFormScore("")
    setFormPic(currentUser)
    setShowForm(true)
  }

  function openEdit(item: SafetyInspection) {
    setEditing(item)
    setFormTitle(item.title)
    setFormDate(new Date(item.date).toISOString().split("T")[0])
    setFormLocation(item.location)
    setFormCategory(item.category)
    setFormFindings(item.findings)
    setFormRecommendation(item.recommendation)
    setFormStatus(item.status)
    setFormScore(item.assessmentScore?.toString() ?? "")
    setFormPic(item.picName)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formTitle.trim()) { toast.error("Judul inspeksi wajib diisi"); return }
    if (!formLocation.trim()) { toast.error("Lokasi wajib diisi"); return }

    setIsSubmitting(true)
    try {
      const payload: SafetyInspectionInsert = {
        title: formTitle.trim(),
        date: new Date(formDate),
        location: formLocation.trim(),
        category: formCategory,
        findings: formFindings,
        recommendation: formRecommendation,
        status: formStatus,
        assessmentScore: formScore ? parseInt(formScore) : null,
        picName: formPic,
        reportAttachmentUrl: editing?.reportAttachmentUrl ?? "",
        resultAttachmentUrl: editing?.resultAttachmentUrl ?? "",
      }

      const { createSafetyInspection, updateSafetyInspection } = await import("@/app/actions/safety-inspections")

      if (editing) {
        await updateSafetyInspection(editing.id, payload)
        toast.success("Inspeksi berhasil diupdate")
      } else {
        await createSafetyInspection(payload)
        toast.success("Inspeksi berhasil dibuat")
      }

      setShowForm(false)
      setEditing(null)
      // refresh list
      const { getSafetyInspections } = await import("@/app/actions/safety-inspections")
      const fresh = await getSafetyInspections()
      setList(fresh)
    } catch {
      toast.error("Gagal menyimpan inspeksi")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Yakin ingin menghapus inspeksi ini?")) return
    try {
      await deleteSafetyInspection(id)
      setList((prev) => prev.filter((i) => i.id !== id))
      toast.success("Inspeksi dihapus")
    } catch {
      toast.error("Gagal menghapus inspeksi")
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="space-y-3">
        <div className="rounded-[1.3rem] bg-gradient-to-br from-[#003f78] to-[#005fa3] p-4 text-white shadow-[0_18px_38px_rgba(0,63,120,0.24)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b9dff6]">HSE Mobile</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight">Safety Inspections</h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#cde6f7]">
                Daftar dan kelola inspeksi K3 lapangan.
              </p>
            </div>
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/12">
              <ClipboardCheck className="size-5" />
            </span>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.2rem] bg-[#003f78] p-4 text-white shadow-[0_16px_34px_rgba(0,63,120,0.22)]">
          <ShieldCheck className="size-5" />
          <p className="mt-3 text-3xl font-black">{total}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b9dff6]">Total</p>
        </div>
        <div className="rounded-[1.2rem] bg-emerald-50 p-4 text-emerald-800 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <CheckCircle2 className="size-5" />
          <p className="mt-3 text-3xl font-black">{completed}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Completed</p>
        </div>
        <div className="rounded-[1.2rem] bg-sky-50 p-4 text-sky-800 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <FileText className="size-5" />
          <p className="mt-3 text-3xl font-black">{inProgress}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-600">In Progress</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 text-[#082033] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <AlertTriangle className="size-5" />
          <p className="mt-3 text-3xl font-black">{pending}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7a4a32]">Pending</p>
        </div>
      </section>

      {/* Avg Score banner */}
      <div className="rounded-[1.2rem] bg-gradient-to-br from-[#f6fbff] to-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Rata-Rata Assessment Score</p>
        <p className="mt-1 text-3xl font-black text-[#003f78]">{avgScore}</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#486275]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari inspeksi..."
            className="h-12 w-full rounded-2xl border-0 bg-[#e9f6fd] pl-10 pr-4 text-sm font-semibold text-[#082033]"
          />
        </div>
        <Button
          onClick={openCreate}
          className="h-12 w-12 shrink-0 rounded-2xl bg-[#003f78] p-0 text-white"
        >
          <Plus className="size-5" />
        </Button>
      </div>

      {/* List */}
      <section className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-[1.25rem] bg-white p-8 text-center shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <ClipboardCheck className="mx-auto size-8 text-[#9ab0bf]" />
            <p className="mt-3 text-sm font-black text-[#486275]">Tidak ada inspeksi</p>
          </div>
        ) : (
          filtered.map((item) => (
            <article
              key={item.id}
              className="rounded-[1.25rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-black text-[#082033]">{item.title}</h2>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#486275]">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{item.location}</span>
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusColor[item.status] ?? "bg-slate-50 text-slate-600"}`}
                >
                  {item.status}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">
                <span className="rounded-md bg-[#f6fbff] px-2 py-1">{item.category}</span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3" />
                  {formatDate(item.date)}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-[#eef4f9] pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-xl bg-[#f6fbff] px-3 text-[11px] font-black text-[#003f78] uppercase tracking-[0.06em]"
                  onClick={() => setShowDetail(item)}
                >
                  <Eye className="mr-1.5 size-3.5" />
                  Detail
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-xl bg-[#f6fbff] px-3 text-[11px] font-black text-[#486275] uppercase tracking-[0.06em]"
                  onClick={() => openEdit(item)}
                >
                  <Pencil className="mr-1.5 size-3.5" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-8 rounded-xl bg-rose-50 px-3 text-[11px] font-black text-rose-600 uppercase tracking-[0.06em]"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="mr-1.5 size-3.5" />
                  Hapus
                </Button>
              </div>

              {item.assessmentScore != null && (
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#003f78] px-3 py-1.5">
                  <ShieldCheck className="size-3.5 text-[#b9dff6]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white">
                    Score: {item.assessmentScore}/100
                  </span>
                </div>
              )}
            </article>
          ))
        )}
      </section>

      {/* Back link */}
      <Link
        href="/mobile/hse"
        className="flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-black text-[#003f78] shadow-[0_14px_32px_rgba(8,32,51,0.08)]"
      >
        ← Kembali ke HSE
      </Link>

      {/* Form Dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40">
          <div className="mx-auto w-full max-w-[430px] rounded-t-[1.5rem] bg-[#f6fbff] p-5 shadow-[0_-24px_60px_rgba(8,32,51,0.18)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-[#082033]">
                {editing ? "Edit Inspeksi" : "Inspeksi Baru"}
              </h2>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditing(null) }}
                className="flex size-8 items-center justify-center rounded-lg bg-[#eaf4fb] text-[#004b87]"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="max-h-[70dvh] space-y-4 overflow-y-auto">
              <Label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Judul</span>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Judul inspeksi"
                  className="h-12 rounded-2xl border-0 bg-white px-4 text-sm font-semibold text-[#082033] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.08)]"
                />
              </Label>

              <div className="grid grid-cols-2 gap-3">
                <Label className="block space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Tanggal</span>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="h-12 rounded-2xl border-0 bg-white px-4 text-sm font-semibold text-[#082033] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.08)]"
                  />
                </Label>
                <Label className="block space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Lokasi</span>
                  <Input
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="Lokasi"
                    className="h-12 rounded-2xl border-0 bg-white px-4 text-sm font-semibold text-[#082033] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.08)]"
                  />
                </Label>
              </div>

              <Label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Kategori</span>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="h-12 w-full rounded-2xl border-0 bg-white px-4 text-sm font-semibold text-[#082033] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.08)]"
                >
                  <option value="">Pilih kategori</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Label>

              <Label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Temuan</span>
                <Textarea
                  value={formFindings}
                  onChange={(e) => setFormFindings(e.target.value)}
                  rows={3}
                  placeholder="Deskripsi temuan"
                  className="rounded-2xl border-0 bg-white px-4 py-3 text-sm font-semibold text-[#082033] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.08)]"
                />
              </Label>

              <Label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Rekomendasi</span>
                <Textarea
                  value={formRecommendation}
                  onChange={(e) => setFormRecommendation(e.target.value)}
                  rows={3}
                  placeholder="Rekomendasi perbaikan"
                  className="rounded-2xl border-0 bg-white px-4 py-3 text-sm font-semibold text-[#082033] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.08)]"
                />
              </Label>

              <div className="grid grid-cols-2 gap-3">
                <Label className="block space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Status</span>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="h-12 w-full rounded-2xl border-0 bg-white px-4 text-sm font-semibold text-[#082033] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.08)]"
                  >
                    <option>Pending</option>
                    <option>In Progress</option>
                    <option>Completed</option>
                  </select>
                </Label>
                <Label className="block space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Score</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formScore}
                    onChange={(e) => setFormScore(e.target.value)}
                    placeholder="0-100"
                    className="h-12 rounded-2xl border-0 bg-white px-4 text-sm font-semibold text-[#082033] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.08)]"
                  />
                </Label>
              </div>

              <Label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Inspektur (PIC)</span>
                <Input
                  value={formPic}
                  onChange={(e) => setFormPic(e.target.value)}
                  placeholder="Nama PIC"
                  className="h-12 rounded-2xl border-0 bg-white px-4 text-sm font-semibold text-[#082033] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.08)]"
                />
              </Label>

              <Button
                type="submit"
                className="h-14 w-full rounded-2xl bg-[#003f78] text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Menyimpan..." : editing ? "Update Inspeksi" : "Buat Inspeksi"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Preview Dialog */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40">
          <div className="mx-auto max-h-[80dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[1.5rem] bg-white p-5 shadow-[0_-24px_60px_rgba(8,32,51,0.18)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-[#082033]">Detail Inspeksi</h2>
              <button
                type="button"
                onClick={() => setShowDetail(null)}
                className="flex size-8 items-center justify-center rounded-lg bg-[#eaf4fb] text-[#004b87]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Judul</p>
                <p className="mt-1 text-base font-black text-[#082033]">{showDetail.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Status</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusColor[showDetail.status] ?? "bg-slate-50 text-slate-600"}`}
                  >
                    {showDetail.status}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Score</p>
                  <p className="mt-1 text-base font-black text-[#003f78]">
                    {showDetail.assessmentScore ?? "-"}/100
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Lokasi</p>
                <p className="mt-1 text-sm font-semibold text-[#082033]">{showDetail.location}</p>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Kategori</p>
                <p className="mt-1 text-sm font-semibold text-[#082033]">{showDetail.category}</p>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Tanggal</p>
                <p className="mt-1 text-sm font-semibold text-[#082033]">{formatDate(showDetail.date)}</p>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Inspektur (PIC)</p>
                <p className="mt-1 text-sm font-semibold text-[#082033]">{showDetail.picName}</p>
              </div>

              <div className="rounded-xl bg-[#f6fbff] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Temuan</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#082033]">{showDetail.findings}</p>
              </div>

              <div className="rounded-xl bg-[#f0f9ff] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#003f78]">Rekomendasi</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#082033]">{showDetail.recommendation}</p>
              </div>

              <Button
                onClick={() => {
                  setShowDetail(null)
                  openEdit(showDetail)
                }}
                className="h-12 w-full rounded-2xl bg-[#003f78] text-white"
              >
                <Pencil className="mr-2 size-4" />
                Edit Inspeksi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
