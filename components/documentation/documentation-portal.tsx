'use client'

import React, { useState, useRef, useMemo } from 'react'
import Link from 'next/link'
import {
  HERO_DOCUMENTATION_METADATA,
  HERO_DOCUMENTATION_CHAPTERS,
  HERO_PAGE_SPECIFICATIONS,
  type DocChapter,
  type DocSection,
  type PageSpecItem,
} from './documentation-data'
import { DocumentationPdfView } from './documentation-pdf-view'
import {
  BookOpen,
  Download,
  Printer,
  Search,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Database,
  Workflow,
  Server,
  Sparkles,
  Layers,
  FileText,
  Clock,
  ArrowRight,
  Eye,
  Loader2,
  Share2,
  TableProperties,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useReactToPrint } from 'react-to-print'
import { toast } from 'sonner'
import { downloadElementAsPdf } from '@/lib/pdf-download'

interface DocumentationPortalProps {
  currentUser?: {
    name?: string | null
    email?: string | null
    role?: string | null
  }
}

export function DocumentationPortal({ currentUser }: DocumentationPortalProps) {
  const [selectedChapterId, setSelectedChapterId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [pageCategoryFilter, setPageCategoryFilter] = useState<string>('all')
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false)
  const [pdfScope, setPdfScope] = useState<'all' | 'current'>('all')
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false)

  const printSheetRef = useRef<HTMLDivElement>(null)

  // Filtered chapters based on search query
  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) {
      if (selectedChapterId === 'all') return HERO_DOCUMENTATION_CHAPTERS
      return HERO_DOCUMENTATION_CHAPTERS.filter((c) => c.id === selectedChapterId)
    }

    const q = searchQuery.toLowerCase()
    return HERO_DOCUMENTATION_CHAPTERS.map((chap) => {
      const matchingSections = chap.sections.filter(
        (sec) =>
          sec.title.toLowerCase().includes(q) ||
          sec.content.toLowerCase().includes(q) ||
          sec.badge?.toLowerCase().includes(q) ||
          sec.tables?.some((t) => t.title.toLowerCase().includes(q) || t.headers.some((h) => h.toLowerCase().includes(q))) ||
          sec.codeSnippets?.some((c) => c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
      )
      return {
        ...chap,
        sections: matchingSections,
      }
    }).filter((chap) => chap.sections.length > 0)
  }, [selectedChapterId, searchQuery])

  // Setup React-to-Print
  const handlePrint = useReactToPrint({
    contentRef: printSheetRef,
    documentTitle: `HERO-System-Blueprint-Handover-${pdfScope === 'all' ? 'Full' : selectedChapterId}`,
    pageStyle: `
      @page {
        size: A4 portrait !important;
        margin: 12mm 14mm 14mm 14mm !important;
      }
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background-color: #ffffff !important;
      }
      .page-break-before {
        page-break-before: always !important;
        break-before: page !important;
      }
    `,
  })

  // Download PDF file directly using jsPDF + html2canvas
  const handleDownloadPdf = async () => {
    if (!printSheetRef.current) return
    setIsDownloadingPdf(true)
    const toastId = toast.loading('Memproses dokumen Blueprint PDF (A4)...')
    try {
      await downloadElementAsPdf(
        printSheetRef.current,
        `HERO-System-Blueprint-Handover-${pdfScope === 'all' ? 'Complete' : selectedChapterId}.pdf`,
        { orientation: 'portrait' }
      )
      toast.success('Blueprint PDF berhasil diunduh!', { id: toastId })
    } catch (err: any) {
      console.error('PDF download error:', err)
      toast.error('Gagal mengunduh PDF: ' + (err.message || 'Error tidak diketahui'), { id: toastId })
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  const handleCopyHandoverSummary = () => {
    const summary = `HERO SYSTEM BLUEPRINT & HANDOVER SUMMARY
- Sistem: ${HERO_DOCUMENTATION_METADATA.systemName}
- Versi: ${HERO_DOCUMENTATION_METADATA.version}
- Perusahaan: ${HERO_DOCUMENTATION_METADATA.companyName}
- Database: PostgreSQL + Drizzle ORM (Single Source of Truth: hero_employees)
- Deployment: Dokploy (Persistent Bind Mount: /mnt/data/one-chitra/uploads)
- Akses Dokumentasi Lengkap: https://hero.chitraparatama.co.id/dashboard/documentation
- Kredensial & Kontak: Hubungi Lead Systems Architect / HC IT Administrator.`

    navigator.clipboard.writeText(summary)
    toast.success('Ringkasan Serah Terima berhasil disalin ke clipboard!')
  }

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* BANNER HEADER PORTAL DOKUMENTASI */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-sky-500/20 text-sky-300 border-sky-400/30 hover:bg-sky-500/30 text-xs px-2.5 py-0.5">
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Handover &amp; Blueprint Edition
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 hover:bg-emerald-500/30 text-xs px-2.5 py-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                {HERO_DOCUMENTATION_METADATA.version}
              </Badge>
              <span className="text-xs text-slate-400 font-medium">
                Pembaruan: {HERO_DOCUMENTATION_METADATA.lastUpdated}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl font-display">
              Portal Dokumentasi, Cetak Biru &amp; Handover Sistem HERO
            </h1>

            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Panduan arsitektur sistem komprehensif, standar tata kelola keamanan &amp; RBAC, relasi database (ERD), alur kerja operasional, serta SOP pemeliharaan untuk serah terima pengembang baru.
            </p>
          </div>

          {/* Action Buttons Header */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            <Button
              onClick={() => {
                setPdfScope('all')
                setIsPreviewOpen(true)
              }}
              className="bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs h-9 px-4 shadow-lg shadow-sky-500/20 gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Cetak / Ekspor Blueprint PDF
            </Button>

            <Button
              asChild
              variant="outline"
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 text-xs h-9 px-3.5 gap-1.5 font-semibold shadow-md shadow-emerald-950/20"
            >
              <a href="/api/documentation/download-docx" download="HERO_System_Blueprint_Handover.docx">
                <FileText className="w-4 h-4" />
                Unduh Blueprint DOCX
              </a>
            </Button>

            <Button
              variant="outline"
              onClick={handleCopyHandoverSummary}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-9 px-3 gap-1.5"
            >
              <Copy className="w-4 h-4" />
              Salin Ringkasan
            </Button>

            <Button
              variant="outline"
              asChild
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-9 px-3 gap-1.5"
            >
              <Link href="/dashboard/feature-map">
                <Layers className="w-4 h-4" />
                Peta Fitur
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* ============================================================ */}
      {/* COMMAND BAR: PENCARIAN & FILTER BAB */}
      {/* ============================================================ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card rounded-xl p-3 border border-border/80 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari topik, tabel, skema, atau kata kunci..."
            className="pl-9 h-9 text-xs bg-background"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Chapter Counter & Scope Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Menampilkan <strong className="text-foreground">{filteredChapters.length}</strong> Bab
          </span>
          {searchQuery && (
            <Badge variant="outline" className="text-[10px]">
              Filter aktif: &quot;{searchQuery}&quot;
            </Badge>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB NAVIGASI BAB (HORIZONTAL BADGES / PILLS) */}
      {/* ============================================================ */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <Button
          size="sm"
          variant={selectedChapterId === 'all' && !searchQuery ? 'default' : 'outline'}
          onClick={() => {
            setSelectedChapterId('all')
            setSearchQuery('')
          }}
          className="h-8 text-xs shrink-0 rounded-lg gap-1.5"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Semua Bab (Lengkap)
        </Button>

        {HERO_DOCUMENTATION_CHAPTERS.map((chap) => {
          const isSelected = selectedChapterId === chap.id && !searchQuery
          return (
            <Button
              key={chap.id}
              size="sm"
              variant={isSelected ? 'default' : 'outline'}
              onClick={() => {
                setSelectedChapterId(chap.id)
                setSearchQuery('')
              }}
              className="h-8 text-xs shrink-0 rounded-lg gap-1.5"
            >
              <span>Bab {chap.number}:</span>
              <span>{chap.shortTitle}</span>
            </Button>
          )
        })}
      </div>

      {/* ============================================================ */}
      {/* MAIN CONTENT AREA: BAB & SEKSI DOKUMENTASI */}
      {/* ============================================================ */}
      <div className="space-y-8">
        {filteredChapters.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-dashed p-8">
            <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="text-base font-bold text-foreground">Tidak Ditemukan Topik Terkait</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Tidak ada bagian dokumentasi yang cocok dengan kata kunci &quot;{searchQuery}&quot;. Coba gunakan kata kunci lain seperti &quot;hero_employees&quot;, &quot;Dokploy&quot;, atau &quot;RBAC&quot;.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="mt-4 text-xs"
            >
              Reset Pencarian
            </Button>
          </div>
        ) : (
          filteredChapters.map((chapter) => (
            <div
              key={chapter.id}
              id={chapter.id}
              className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm transition-all"
            >
              {/* Header Kartu Bab */}
              <div className="bg-muted/40 px-5 py-4 border-b border-border/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">
                      {chapter.badge}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {chapter.sections.length} Sub-bagian
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                    {chapter.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{chapter.description}</p>
                </div>

                {/* Quick Print This Chapter Button */}
                <div className="shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedChapterId(chapter.id)
                      setPdfScope('current')
                      setIsPreviewOpen(true)
                    }}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Cetak Bab {chapter.number}
                  </Button>
                </div>
              </div>

              {/* Seksi-seksi di dalam bab */}
              <div className="p-5 space-y-8 divide-y divide-border/50">
                {chapter.sections.map((section, secIdx) => (
                  <div key={section.id} className={secIdx > 0 ? 'pt-8' : ''}>
                    {/* Header Seksi */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                        {section.title}
                      </h3>
                      {section.badge && (
                        <Badge variant="outline" className="text-[10px]">
                          {section.badge}
                        </Badge>
                      )}
                    </div>

                    {/* Teks Konten */}
                    <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line font-normal space-y-2">
                      {section.content}
                    </div>

                    {/* Highlights Cards jika ada */}
                    {section.highlights && section.highlights.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
                        {section.highlights.map((h, i) => (
                          <div
                            key={i}
                            className="p-3.5 rounded-lg border border-border/70 bg-muted/20"
                          >
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              {h.label}
                            </div>
                            <div className="text-sm font-extrabold text-foreground mt-1">
                              {h.value}
                            </div>
                            {h.desc && (
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {h.desc}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tabel Data jika ada */}
                    {section.tables && section.tables.length > 0 && (
                      <div className="my-5 space-y-4">
                        {section.tables.map((tbl, tIdx) => (
                          <div
                            key={tIdx}
                            className="rounded-lg border border-border/80 overflow-hidden shadow-xs"
                          >
                            <div className="bg-muted/60 px-4 py-2 text-xs font-bold text-foreground border-b border-border/80">
                              {tbl.title}
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-muted/30 border-b border-border text-muted-foreground font-semibold">
                                  <tr>
                                    {tbl.headers.map((hdr, hIdx) => (
                                      <th key={hIdx} className="px-3.5 py-2 whitespace-nowrap">
                                        {hdr}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                  {tbl.rows.map((row, rIdx) => (
                                    <tr
                                      key={rIdx}
                                      className={rIdx % 2 === 0 ? 'bg-card' : 'bg-muted/10'}
                                    >
                                      {row.map((cell, cIdx) => (
                                        <td
                                          key={cIdx}
                                          className={`px-3.5 py-2 font-mono text-[11px] ${
                                            cIdx === 0
                                              ? 'font-bold text-foreground'
                                              : 'text-foreground/80'
                                          }`}
                                        >
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Code Snippets jika ada */}
                    {section.codeSnippets && section.codeSnippets.length > 0 && (
                      <div className="my-4 space-y-3">
                        {section.codeSnippets.map((cs, cIdx) => (
                          <div
                            key={cIdx}
                            className="rounded-lg border border-border overflow-hidden bg-slate-950 text-slate-100 shadow-md"
                          >
                            <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-200">{cs.title}</span>
                              <div className="flex items-center gap-2">
                                <span className="uppercase text-[10px] text-slate-400 font-mono">
                                  {cs.language}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(cs.code)
                                    toast.success('Kode berhasil disalin!')
                                  }}
                                  className="h-6 px-2 text-[10px] text-slate-300 hover:text-white hover:bg-slate-800"
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Salin
                                </Button>
                              </div>
                            </div>
                            <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre text-slate-200">
                              <code>{cs.code}</code>
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* ============================================================ */}
                {/* INTERACTIVE PAGE SPECIFICATION CARDS KHUSUS BAB 7 */}
                {/* ============================================================ */}
                {chapter.id === 'page-specifications' && (
                  <div className="pt-8 border-t border-border/80 space-y-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-muted/40 p-4 rounded-xl border border-border/80">
                      <div>
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <TableProperties className="w-4 h-4 text-sky-500" />
                          Kartu Spesifikasi Halaman Interaktif (Page Inspector)
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Saring halaman berdasarkan domain untuk melihat rute URL, tabel database (PostgreSQL/Drizzle), fitur kontrol, dan alur kerjanya.
                        </p>
                      </div>

                      {/* Filter Kategori Domain */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[
                          'all',
                          'Human Capital & Kepegawaian',
                          'Timesheet & Kehadiran',
                          'Approval Engine',
                          'HSE & K3',
                          'Central Service & Logistik',
                          'Sistem & Keamanan',
                        ].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setPageCategoryFilter(cat)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                              pageCategoryFilter === cat
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60'
                            }`}
                          >
                            {cat === 'all' ? 'Semua Domain' : cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Daftar Spesifikasi Halaman Persis Seperti One Chitra Blueprint */}
                    <div className="space-y-6">
                      {HERO_PAGE_SPECIFICATIONS.filter(
                        (p) => pageCategoryFilter === 'all' || p.category === pageCategoryFilter
                      )
                        .filter(
                          (p) =>
                            !searchQuery ||
                            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.dataSources.tablesRead.some((t) =>
                              t.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                        )
                        .map((page, idx) => (
                          <div
                            key={page.id}
                            className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs space-y-0"
                          >
                            {/* Header Judul Halaman */}
                            <div className="bg-slate-900 px-4 py-3 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-xs sm:text-sm text-white">
                                  {idx + 1}. {page.title}
                                </span>
                                <span className="font-mono text-[11px] text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800">
                                  ({page.route})
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="h-7 px-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 self-start sm:self-auto"
                              >
                                <Link href={page.route} target="_blank">
                                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                  Buka Halaman
                                </Link>
                              </Button>
                            </div>

                            {/* Tabel 7-Baris Spesifikasi Persis Template One Chitra */}
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs text-left">
                                <thead>
                                  <tr className="bg-slate-950 text-white font-bold border-b border-slate-800">
                                    <th className="px-4 py-2 w-1/3 sm:w-1/4">Specification Field</th>
                                    <th className="px-4 py-2 w-2/3 sm:w-3/4">Technical &amp; Business Detail</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  <tr className="bg-muted/30">
                                    <td className="px-4 py-2.5 font-bold text-foreground">Category &amp; Resource</td>
                                    <td className="px-4 py-2.5 text-foreground/90">
                                      <span className="font-semibold">{page.category}</span> | Resource:{' '}
                                      <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] text-primary font-bold">
                                        {page.rbacResource}
                                      </code>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="px-4 py-2.5 font-bold text-foreground">Source File</td>
                                    <td className="px-4 py-2.5 font-mono text-[11px] text-foreground/90">
                                      app{page.route}/page.tsx | Action:{' '}
                                      {page.dataSources.serverActions?.[0] || 'app/actions/default.ts'}
                                    </td>
                                  </tr>
                                  <tr className="bg-muted/30">
                                    <td className="px-4 py-2.5 font-bold text-foreground">Allowed Roles</td>
                                    <td className="px-4 py-2.5 text-foreground/90">
                                      All Logged-in Users (Tergantung Matriks Izin Role RBAC)
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="px-4 py-2.5 font-bold text-foreground">1. Fungsi &amp; Peran Bisnis</td>
                                    <td className="px-4 py-2.5 text-foreground/90 leading-relaxed">
                                      {page.purpose}
                                    </td>
                                  </tr>
                                  <tr className="bg-muted/30">
                                    <td className="px-4 py-2.5 font-bold text-foreground">2. Sumber Data</td>
                                    <td className="px-4 py-2.5 text-foreground/90">
                                      <div className="flex flex-wrap gap-1">
                                        {page.dataSources.tablesRead.map((t) => (
                                          <span
                                            key={t}
                                            className="font-mono text-[11px] bg-background px-1.5 py-0.5 rounded border border-border font-medium"
                                          >
                                            {t}
                                          </span>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="px-4 py-2.5 font-bold text-foreground">3. Fitur-Fitur Utama</td>
                                    <td className="px-4 py-2.5 text-foreground/90">
                                      <ul className="space-y-1">
                                        {page.features.map((f, fIdx) => (
                                          <li key={fIdx} className="flex items-start gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                            <span>{f}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL PREVIEW CETAK / PDF BLUEPRINT (HIGH-WIDTH A4 PREVIEW) */}
      {/* ============================================================ */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-7xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30 shrink-0 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Printer className="w-4 h-4 text-primary" />
                Preview Cetak Blueprint PDF (Standar A4 WYSIWYG)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Format dokumen resmi berstandar korporat dengan sampul, daftar isi, dan layout siap cetak/unduh.
              </DialogDescription>
            </div>

            {/* Scope Selection & Action in Modal Header */}
            <div className="flex items-center gap-2 pr-6">
              <div className="flex items-center rounded-lg border bg-background p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPdfScope('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    pdfScope === 'all'
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Seluruh Blueprint (Lengkap)
                </button>
                <button
                  type="button"
                  onClick={() => setPdfScope('current')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    pdfScope === 'current'
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Bab Aktif Saja
                </button>
              </div>

              <Button
                onClick={() => handlePrint()}
                size="sm"
                className="h-8 text-xs gap-1.5 font-semibold"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Dokumen
              </Button>

              <Button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 font-semibold"
              >
                {isDownloadingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Unduh PDF
              </Button>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 font-semibold border-emerald-600 text-emerald-700 hover:bg-emerald-50"
              >
                <a href="/api/documentation/download-docx" download="HERO_System_Blueprint_Handover.docx">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  Unduh DOCX
                </a>
              </Button>
            </div>
          </DialogHeader>

          {/* Document Viewport Container */}
          <div className="flex-1 overflow-y-auto bg-slate-100 p-6 flex justify-center">
            <div className="shadow-2xl rounded-sm overflow-hidden bg-white">
              <DocumentationPdfView
                ref={printSheetRef}
                selectedChapterId={pdfScope === 'current' && selectedChapterId !== 'all' ? selectedChapterId : null}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
