"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Building2,
  CalendarDays,
  Eye,
  FileText,
  Search,
  Stethoscope,
  Users,
  X,
} from "lucide-react"

import { type SafetyInduction } from "@/db/schema/safety-induction"
import { Input } from "@/components/ui/input"

type Props = {
  inductions: SafetyInduction[]
}

function formatDate(value: Date | string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function MobileHseInductionClient({ inductions }: Props) {
  const [query, setQuery] = useState("")
  const [detail, setDetail] = useState<SafetyInduction | null>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const totalHariIni = inductions.filter((i) => new Date(i.createdAt) >= today).length
  const totalBulanIni = inductions.filter(
    (i) =>
      new Date(i.createdAt).getMonth() === today.getMonth() &&
      new Date(i.createdAt).getFullYear() === today.getFullYear(),
  ).length
  const uniqueCompanies = new Set(inductions.map((i) => i.companyOrigin)).size

  const filtered = inductions.filter((i) => {
    const q = query.toLowerCase()
    return (
      i.fullName.toLowerCase().includes(q) ||
      i.companyOrigin.toLowerCase().includes(q) ||
      i.phoneNumber.toLowerCase().includes(q) ||
      i.purpose.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="space-y-3">
        <div className="rounded-[1.3rem] bg-gradient-to-br from-[#5b21b6] to-[#7c3aed] p-4 text-white shadow-[0_18px_38px_rgba(91,33,182,0.24)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#d8bfff]">
                HSE Mobile
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight">Safety Induction</h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#e4d0ff]">
                Riwayat tamu & karyawan yang telah mengisi Safety Induction.
              </p>
            </div>
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/12">
              <Stethoscope className="size-5" />
            </span>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-[1.2rem] bg-[#5b21b6] p-3 text-white shadow-[0_16px_34px_rgba(91,33,182,0.22)]">
          <Users className="size-5" />
          <p className="mt-2 text-2xl font-black">{totalHariIni}</p>
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#d8bfff]">
            Hari Ini
          </p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-3 text-[#082033] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <CalendarDays className="size-5 text-[#5b21b6]" />
          <p className="mt-2 text-2xl font-black">{totalBulanIni}</p>
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#486275]">
            Bulan Ini
          </p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-3 text-[#082033] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <Building2 className="size-5 text-[#5b21b6]" />
          <p className="mt-2 text-2xl font-black">{uniqueCompanies}</p>
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#486275]">
            Instansi
          </p>
        </div>
      </section>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#486275]" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama, instansi, atau telepon..."
          className="h-12 w-full rounded-2xl border-0 bg-[#f2efff] pl-10 pr-4 text-sm font-semibold text-[#082033]"
        />
      </div>

      {/* List */}
      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">
          Riwayat Safety Induction ({filtered.length})
        </p>

        {filtered.length === 0 ? (
          <div className="rounded-[1.25rem] bg-white p-8 text-center shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <Stethoscope className="mx-auto size-8 text-[#9ab0bf]" />
            <p className="mt-3 text-sm font-black text-[#486275]">Belum ada data</p>
          </div>
        ) : (
          filtered.map((item) => (
            <article
              key={item.id}
              className="rounded-[1.25rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)] active:bg-[#f6fbff]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-black text-[#082033]">{item.fullName}</h2>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-[#486275]">
                    <Building2 className="size-3.5 shrink-0" />
                    <span className="truncate">{item.companyOrigin}</span>
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[#f2efff] px-3 py-1 text-[10px] font-black uppercase text-[#5b21b6]">
                  {item.phoneNumber}
                </span>
              </div>

              <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-[#486275]">
                {item.purpose}
              </p>

              <div className="mt-3 flex items-center justify-between border-t border-[#eef4f9] pt-3">
                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">
                  <CalendarDays className="size-3" />
                  {formatDate(item.createdAt)}
                </span>
                <button
                  type="button"
                  onClick={() => setDetail(item)}
                  className="flex h-8 items-center gap-1.5 rounded-xl bg-[#f2efff] px-3 text-[11px] font-black text-[#5b21b6] uppercase tracking-[0.06em]"
                >
                  <Eye className="size-3.5" />
                  Detail
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      {/* Back link */}
      <Link
        href="/mobile/hse"
        className="flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-black text-[#5b21b6] shadow-[0_14px_32px_rgba(8,32,51,0.08)]"
      >
        ← Kembali ke HSE
      </Link>

      {/* Detail Bottom Sheet */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40">
          <div className="mx-auto max-h-[85dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[1.5rem] bg-white p-5 shadow-[0_-24px_60px_rgba(8,32,51,0.18)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-black text-[#082033]">
                <FileText className="size-5 text-[#5b21b6]" />
                Detail Safety Induction
              </h2>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="flex size-8 items-center justify-center rounded-lg bg-[#eaf4fb] text-[#004b87]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nama */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">
                  Nama Lengkap
                </p>
                <p className="mt-1 text-base font-black text-[#082033]">{detail.fullName}</p>
              </div>

              {/* Instansi */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">
                  Instansi / Perusahaan
                </p>
                <p className="mt-1 text-sm font-semibold text-[#082033]">{detail.companyOrigin}</p>
              </div>

              {/* Telepon */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">
                  No. Telepon
                </p>
                <p className="mt-1 text-sm font-semibold text-[#082033]">{detail.phoneNumber}</p>
              </div>

              {/* Waktu Masuk */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">
                  Waktu Masuk
                </p>
                <p className="mt-1 text-sm font-semibold text-[#082033]">
                  {formatDate(detail.createdAt)}
                </p>
              </div>

              {/* Disetujui */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">
                  Disetujui Pada
                </p>
                <p className="mt-1 text-sm font-semibold text-[#082033]">
                  {formatDate(detail.agreedAt)}
                </p>
              </div>

              {/* Tujuan */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">
                  Tujuan Kunjungan
                </p>
                <div className="mt-1 rounded-xl bg-[#f6fbff] p-3">
                  <p className="text-sm font-semibold leading-6 text-[#082033]">{detail.purpose}</p>
                </div>
              </div>

              {/* Tanda Tangan */}
              <div className="border-t border-[#eef4f9] pt-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">
                  Tanda Tangan
                </p>
                <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-white p-3">
                  {detail.signatureUrl ? (
                    <div className="relative inline-block">
                      <Image
                        src={detail.signatureUrl}
                        alt="Signature"
                        width={280}
                        height={100}
                        className="h-auto w-auto max-h-24 object-contain"
                      />
                    </div>
                  ) : (
                    <p className="text-sm italic text-rose-500">Tidak ada tanda tangan</p>
                  )}
                </div>
                <p className="mt-2 text-[11px] font-semibold leading-5 text-[#486275]">
                  Dengan tanda tangan ini, yang bersangkutan menyatakan telah membaca dan akan
                  mematuhi seluruh peraturan K3L PT. Chitra Paratama.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
