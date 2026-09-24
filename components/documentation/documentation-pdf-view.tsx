'use client'

import React from 'react'
import {
  HERO_DOCUMENTATION_METADATA,
  HERO_DOCUMENTATION_CHAPTERS,
  HERO_PAGE_SPECIFICATIONS,
  type DocChapter,
} from './documentation-data'
import {
  BookOpen,
  CheckCircle2,
  FileCode,
  Shield,
  Layers,
  Database,
  Workflow,
  Server,
  AlertTriangle,
  Info,
} from 'lucide-react'

interface DocumentationPdfViewProps {
  selectedChapterId?: string | null
  activeChapters?: DocChapter[]
}

export const DocumentationPdfView = React.forwardRef<HTMLDivElement, DocumentationPdfViewProps>(
  ({ selectedChapterId, activeChapters }, ref) => {
    const chaptersToRender = activeChapters
      ? activeChapters
      : selectedChapterId
      ? HERO_DOCUMENTATION_CHAPTERS.filter((c) => c.id === selectedChapterId)
      : HERO_DOCUMENTATION_CHAPTERS

    const isFullBlueprint = !selectedChapterId || chaptersToRender.length > 1

    return (
      <div
        ref={ref}
        className="pdf-wrapper bg-white text-slate-900 mx-auto"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '12mm 15mm 15mm 15mm',
          fontFamily: "'Manrope', 'Inter', Arial, sans-serif",
          fontSize: '9.5pt',
          lineHeight: '1.45',
          color: '#0f172a',
          boxSizing: 'border-box',
        }}
      >
        {/* Style tag for print media rules */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 12mm 14mm 14mm 14mm;
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
            .page-break-inside-avoid {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .no-print {
              display: none !important;
            }
          }
        ` }} />

        {/* ============================================================ */}
        {/* HALAMAN SAMPUL / COVER RESMI (HANYA DITAMPILKAN JIKA CETAK LENGKAP) */}
        {/* ============================================================ */}
        {isFullBlueprint && (
          <div
            className="flex flex-col justify-between border-4 border-slate-900 p-8 rounded-xl bg-gradient-to-b from-slate-50 via-white to-slate-100 page-break-inside-avoid"
            style={{ minHeight: '265mm', marginBottom: '20mm' }}
          >
            {/* Header Sampul */}
            <div>
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-xl tracking-wider">
                    H
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">PT CHITRA PARATAMA</h2>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                      Engineering & Systems Architecture Division
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-amber-100 text-amber-900 text-[10px] font-extrabold px-3 py-1 rounded-full border border-amber-300 uppercase tracking-wider">
                    {HERO_DOCUMENTATION_METADATA.classification}
                  </span>
                </div>
              </div>

              {/* Judul Utama */}
              <div className="mt-16 mb-12">
                <div className="inline-block px-3 py-1 bg-slate-900 text-white rounded text-[11px] font-bold uppercase tracking-widest mb-4">
                  OFFICIAL HANDOVER BLUEPRINT
                </div>
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
                  HERO SYSTEM BLUEPRINT &amp; DOKUMEN SERAH TERIMA
                </h1>
                <p className="text-base text-slate-600 font-medium leading-relaxed max-w-xl">
                  Buku Panduan Teknis Komprehensif, Cetak Biru Arsitektur, Tata Kelola Keamanan, ERD Database, dan SOP Pemeliharaan Sistem HERO.
                </p>
              </div>

              {/* Highlight Modul */}
              <div className="grid grid-cols-3 gap-3 my-8">
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <div className="text-xs font-bold text-slate-500 uppercase">Framework</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-1">Next.js 15 App Router</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Fullstack Monolith</div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <div className="text-xs font-bold text-slate-500 uppercase">Database &amp; ORM</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-1">PostgreSQL + Drizzle</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Strict SSoT Architecture</div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <div className="text-xs font-bold text-slate-500 uppercase">Deployment</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-1">Dokploy Production</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Persistent Mounts</div>
                </div>
              </div>
            </div>

            {/* Footer Sampul / Metadata Handover */}
            <div className="border-t-2 border-slate-900 pt-6 mt-8">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-500 font-semibold">Dokumen Versi:</p>
                  <p className="font-bold text-slate-900">{HERO_DOCUMENTATION_METADATA.version}</p>
                  <p className="text-slate-500 font-semibold mt-2">Tanggal Terbit:</p>
                  <p className="font-bold text-slate-900">{HERO_DOCUMENTATION_METADATA.lastUpdated}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold">Penyusun / Architect:</p>
                  <p className="font-bold text-slate-900">{HERO_DOCUMENTATION_METADATA.authorRole}</p>
                  <p className="text-slate-500 font-semibold mt-2">Target Pengguna:</p>
                  <p className="font-bold text-slate-900">{HERO_DOCUMENTATION_METADATA.targetAudience}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* DAFTAR ISI RESMI (TABLE OF CONTENTS) */}
        {/* ============================================================ */}
        {isFullBlueprint && (
          <div className="page-break-before page-break-inside-avoid pb-8 mb-8 border-b-2 border-slate-200">
            <div className="flex items-center justify-between border-b pb-3 mb-6">
              <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-slate-700" />
                Daftar Isi Cetak Biru (Blueprint Contents)
              </h2>
              <span className="text-xs text-slate-500 font-semibold">HERO Enterprise Edition</span>
            </div>

            <div className="space-y-4">
              {HERO_DOCUMENTATION_CHAPTERS.map((chap) => (
                <div key={chap.id} className="border-b border-slate-100 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">
                      {chap.title}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                      {chap.badge}
                    </span>
                  </div>
                  <div className="mt-1 pl-4 space-y-1">
                    {chap.sections.map((sec) => (
                      <div key={sec.id} className="text-xs text-slate-600 flex items-center justify-between">
                        <span>• {sec.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* KONTEN UTAMA SETIAP BAB DOKUMENTASI */}
        {/* ============================================================ */}
        {chaptersToRender.map((chapter, chapIdx) => (
          <div
            key={chapter.id}
            className={`${chapIdx > 0 || isFullBlueprint ? 'page-break-before' : ''} mb-12`}
          >
            {/* Header Bab */}
            <div className="border-b-2 border-slate-900 pb-3 mb-6">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                  {HERO_DOCUMENTATION_METADATA.systemName}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-900 text-white rounded">
                  {chapter.badge}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {chapter.title}
              </h2>
              <p className="text-xs text-slate-600 mt-1 font-medium">{chapter.description}</p>
            </div>

            {/* Seksi-seksi di dalam bab */}
            <div className="space-y-8">
              {chapter.sections.map((section) => (
                <div key={section.id} className="page-break-inside-avoid">
                  {/* Judul Seksi */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-900 inline-block" />
                      {section.title}
                    </h3>
                    {section.badge && (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {section.badge}
                      </span>
                    )}
                  </div>

                  {/* Teks Konten (Markdown-like rendering) */}
                  <div className="text-xs text-slate-700 leading-relaxed space-y-2 whitespace-pre-line font-normal">
                    {section.content}
                  </div>

                  {/* Highlights / KPI Cards jika ada */}
                  {section.highlights && section.highlights.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 my-4">
                      {section.highlights.map((h, i) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="text-[10px] font-bold text-slate-500 uppercase">{h.label}</div>
                          <div className="text-sm font-extrabold text-slate-900 mt-0.5">{h.value}</div>
                          {h.desc && <div className="text-[10px] text-slate-500 mt-0.5">{h.desc}</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tabel Data jika ada */}
                  {section.tables && section.tables.length > 0 && (
                    <div className="my-4 space-y-3">
                      {section.tables.map((t, tIdx) => (
                        <div key={tIdx} className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className="bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800 border-b border-slate-200">
                            {t.title}
                          </div>
                          <table className="w-full text-[10px] text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                              <tr>
                                {t.headers.map((h, hIdx) => (
                                  <th key={hIdx} className="px-3 py-1.5">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {t.rows.map((row, rIdx) => (
                                <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-3 py-1.5 text-slate-800 font-mono text-[9px]">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Code Snippets jika ada */}
                  {section.codeSnippets && section.codeSnippets.length > 0 && (
                    <div className="my-3 space-y-2">
                      {section.codeSnippets.map((cs, csIdx) => (
                        <div key={csIdx} className="border border-slate-300 rounded-md overflow-hidden bg-slate-900 text-slate-100">
                          <div className="px-3 py-1 bg-slate-800 text-[10px] font-bold text-slate-300 border-b border-slate-700 flex justify-between items-center">
                            <span>{cs.title}</span>
                            <span className="uppercase text-[9px] text-slate-400">{cs.language}</span>
                          </div>
                          <pre className="p-3 text-[9px] font-mono leading-tight overflow-x-auto whitespace-pre">
                            <code>{cs.code}</code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* ============================================================ */}
              {/* HALAMAN SPESIFIKASI TEKNIS RINCI (7-ROW TABLE) KHUSUS BAB 7 */}
              {/* ============================================================ */}
              {chapter.id === 'page-specifications' && (
                <div className="space-y-6 pt-4">
                  <div className="border-b-2 border-slate-900 pb-2 mb-6 page-break-before">
                    <h3 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
                      7.3 Lembar Spesifikasi Teknis Rinci Setiap Halaman (Detailed Page Specifications)
                    </h3>
                    <p className="text-[10px] text-slate-600">
                      Spesifikasi lengkap setiap antarmuka HERO: file sumber, izin role, tabel database (PostgreSQL/Drizzle), fitur kontrol, dan fungsi operasional.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {HERO_PAGE_SPECIFICATIONS.map((page, pIdx) => (
                      <div
                        key={page.id}
                        className="border border-slate-300 rounded-lg overflow-hidden page-break-inside-avoid shadow-xs"
                      >
                        {/* Judul Halaman */}
                        <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between border-b border-slate-800">
                          <div className="font-bold text-xs flex items-center gap-2">
                            <span>{pIdx + 1}. {page.title}</span>
                            <span className="font-mono text-[10px] text-sky-300">
                              ({page.route})
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 font-semibold">
                            Resource: {page.rbacResource}
                          </span>
                        </div>

                        {/* Tabel 7-Baris Spesifikasi Persis Format Blueprint One Chitra */}
                        <table className="w-full text-[10px] text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-800 text-white font-bold border-b border-slate-700">
                              <th className="px-3 py-1.5 w-1/4 border-r border-slate-700">Specification Field</th>
                              <th className="px-3 py-1.5 w-3/4">Technical &amp; Business Detail</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            <tr className="bg-slate-50">
                              <td className="px-3 py-1.5 font-bold text-slate-900 border-r border-slate-200">
                                Category &amp; Resource
                              </td>
                              <td className="px-3 py-1.5 text-slate-800">
                                <span className="font-semibold">{page.category}</span> | Resource:{" "}
                                <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[9.5px] font-bold text-slate-900">
                                  {page.rbacResource}
                                </code>
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-1.5 font-bold text-slate-900 border-r border-slate-200">
                                Source File
                              </td>
                              <td className="px-3 py-1.5 font-mono text-[9.5px] text-slate-800">
                                app{page.route}/page.tsx | Action:{" "}
                                {page.dataSources.serverActions?.[0] || 'app/actions/default.ts'}
                              </td>
                            </tr>
                            <tr className="bg-slate-50">
                              <td className="px-3 py-1.5 font-bold text-slate-900 border-r border-slate-200">
                                Allowed Roles
                              </td>
                              <td className="px-3 py-1.5 text-slate-800">
                                All Logged-in Users (Tergantung Matriks Izin Role RBAC)
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-1.5 font-bold text-slate-900 border-r border-slate-200">
                                1. Fungsi &amp; Peran Bisnis
                              </td>
                              <td className="px-3 py-1.5 text-slate-800 leading-snug">
                                {page.purpose}
                              </td>
                            </tr>
                            <tr className="bg-slate-50">
                              <td className="px-3 py-1.5 font-bold text-slate-900 border-r border-slate-200">
                                2. Sumber Data
                              </td>
                              <td className="px-3 py-1.5 text-slate-800">
                                <div className="flex flex-wrap gap-1 font-mono text-[9px]">
                                  {page.dataSources.tablesRead.map((tbl) => (
                                    <span
                                      key={tbl}
                                      className="bg-white px-1.5 py-0.5 rounded border border-slate-300 text-slate-900 font-semibold"
                                    >
                                      {tbl}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td className="px-3 py-1.5 font-bold text-slate-900 border-r border-slate-200">
                                3. Fitur-Fitur Utama
                              </td>
                              <td className="px-3 py-1.5 text-slate-800">
                                <ul className="space-y-0.5">
                                  {page.features.map((feat, fIdx) => (
                                    <li key={fIdx} className="flex items-start gap-1">
                                      <span className="text-emerald-700 font-bold">✓</span>
                                      <span>{feat}</span>
                                    </li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Footer Dokumen Cetak */}
        <div className="border-t-2 border-slate-200 pt-4 mt-8 flex items-center justify-between text-[10px] text-slate-500 font-semibold page-break-inside-avoid">
          <div>PT Chitra Paratama • HERO System Blueprint &amp; Handover Document</div>
          <div>Dokumen Internal Rahasia • Halaman Cetak Standar A4</div>
        </div>
      </div>
    )
  }
)

DocumentationPdfView.displayName = 'DocumentationPdfView'
