"use client";

import * as React from "react";
import { Download, Printer, MapPin, ArrowLeft, ImageOff } from "lucide-react";
import { resolveUploadUrl } from "@/lib/resolve-upload-url";
import {
  HSE_OSM_RISK_CONFIG,
  HSE_OSM_STATUS_CONFIG,
  type HseOsmRiskLevel,
  type HseOsmFindingStatus,
} from "@/lib/hse-osm-constants";

interface ResilientPrintPhotoProps {
  src: string;
  alt: string;
  label: string;
  accentColor?: string;
  badgeBg?: string;
}

function ResilientPrintPhoto({
  src,
  alt,
  label,
  accentColor = "#0f172a",
  badgeBg = "#f1f5f9",
}: ResilientPrintPhotoProps) {
  const [hasError, setHasError] = React.useState(false);

  return (
    <div style={{ textAlign: "center", display: "inline-block", margin: "2px 4px" }}>
      {!hasError && src ? (
        <img
          src={src}
          alt={alt}
          loading="eager"
          crossOrigin="anonymous"
          onError={() => setHasError(true)}
          style={{
            maxWidth: "155px",
            maxHeight: "100px",
            width: "auto",
            height: "auto",
            objectFit: "cover",
            borderRadius: "4px",
            border: `1px solid ${accentColor === "#166534" ? "#86efac" : "#cbd5e1"}`,
            display: "block",
            margin: "0 auto",
            backgroundColor: "#ffffff",
          }}
        />
      ) : (
        <div
          style={{
            width: "140px",
            height: "85px",
            borderRadius: "4px",
            border: "1px dashed #cbd5e1",
            backgroundColor: "#f8fafc",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px",
            color: "#64748b",
            fontSize: "6.5pt",
            margin: "0 auto",
          }}
        >
          <ImageOff style={{ width: "16px", height: "16px", marginBottom: "3px", color: "#94a3b8" }} />
          <span style={{ fontWeight: 600 }}>Foto Tidak Tersedia</span>
          <span style={{ fontSize: "5.5pt", color: "#94a3b8" }}>Lampiran tidak ditemukan</span>
        </div>
      )}
      <div
        style={{
          fontSize: "6.5pt",
          color: accentColor,
          backgroundColor: badgeBg,
          padding: "1px 5px",
          borderRadius: "3px",
          marginTop: "2px",
          fontWeight: 600,
          display: "inline-block",
        }}
      >
        {label}
      </div>
    </div>
  );
}

interface OsmPrintViewProps {
  session: any;
  googleMapsUrl: string | null;
}

export function OsmPrintView({ session: s, googleMapsUrl }: OsmPrintViewProps) {
  const teamMembers = s.teamMembers || [];
  const findings: any[] = s.findings || [];

  // Pagination calculation:
  // - If 0 or 1 findings: exactly 1 page (Profile + finding[0] + Signatures)
  // - If >= 2 findings:
  //   Page 1: Profile + finding[0]
  //   Subsequent pages: group remaining findings in chunks of 2.
  //   The last page holds remaining findings + Signatures block.
  const pages: {
    pageIndex: number;
    totalPages: number;
    isFirstPage: boolean;
    isLastPage: boolean;
    pageFindings: any[];
  }[] = React.useMemo(() => {
    if (findings.length <= 1) {
      return [
        {
          pageIndex: 1,
          totalPages: 1,
          isFirstPage: true,
          isLastPage: true,
          pageFindings: findings,
        },
      ];
    }

    const firstPageFindings = [findings[0]];
    const remaining = findings.slice(1);
    const subsequentChunks: any[][] = [];

    for (let i = 0; i < remaining.length; i += 2) {
      subsequentChunks.push(remaining.slice(i, i + 2));
    }

    const totalPages = 1 + subsequentChunks.length;

    const result = [
      {
        pageIndex: 1,
        totalPages,
        isFirstPage: true,
        isLastPage: false,
        pageFindings: firstPageFindings,
      },
    ];

    subsequentChunks.forEach((chunk, idx) => {
      const pageIndex = 2 + idx;
      result.push({
        pageIndex,
        totalPages,
        isFirstPage: false,
        isLastPage: pageIndex === totalPages,
        pageFindings: chunk,
      });
    });

    return result;
  }, [findings]);

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    if (window.opener) {
      window.close();
    } else {
      window.history.back();
    }
  };

  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, .no-print-toolbar {
            display: none !important;
          }
          .a4-page-container {
            padding: 0 !important;
            margin: 0 !important;
          }
          .a4-page {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 46mm 16mm 30mm 16mm !important;
            box-sizing: border-box !important;
            position: relative !important;
            overflow: hidden !important;
            background-color: #ffffff !important;
            background-image: url('/ChitraParatama_Stationery_Letterhead_jkt.jpg') !important;
            background-size: 210mm 297mm !important;
            background-repeat: no-repeat !important;
            background-position: top center !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-after: always !important;
            break-after: page !important;
            box-shadow: none !important;
          }
          .a4-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #0f172a;
          line-height: 1.35;
          background-color: #525659;
          margin: 0;
          padding: 0;
        }
        .a4-page {
          width: 210mm;
          min-height: 297mm;
          height: 297mm;
          margin: 20px auto;
          background-color: #ffffff;
          background-image: url('/ChitraParatama_Stationery_Letterhead_jkt.jpg');
          background-size: 210mm 297mm;
          background-repeat: no-repeat;
          background-position: top center;
          padding: 46mm 16mm 30mm 16mm;
          box-sizing: border-box;
          box-shadow: 0 6px 24px rgba(0,0,0,0.3);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #94a3b8;
          padding: 4px 6.5px;
          font-size: 7.8pt;
        }
        th {
          background-color: #f1f5f9;
          font-weight: bold;
          text-align: left;
        }
      `}</style>

      {/* Floating Action Toolbar */}
      <div className="no-print-toolbar sticky top-0 z-50 flex items-center justify-between border-b bg-white/95 px-6 py-2.5 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </button>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-900">
              Laporan OSM — {s.sessionNumber}
            </span>
            <span className="text-[10px] text-slate-500">
              {s.siteName} • {s.inspectionDate} • {findings.length} Temuan • {pages.length} Halaman A4
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-all"
            >
              <MapPin className="w-3.5 h-3.5 text-sky-600" />
              <span>Google Maps</span>
            </a>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-md transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <Printer className="w-3.5 h-3.5 opacity-80" />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>
      </div>

      {/* A4 Printable Pages */}
      <div className="a4-page-container">
        {pages.map((p) => {
          return (
            <div key={p.pageIndex} className="a4-page">
              {/* Top Page Content */}
              <div style={{ flex: "1 0 auto" }}>
                {p.isFirstPage ? (
                  <>
                    {/* Header Dokumen Halaman 1 */}
                    <div style={{ textAlign: "center", marginBottom: "10px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "2px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "6.5pt",
                            color: "#64748b",
                            fontFamily: "monospace",
                            fontWeight: "bold",
                          }}
                        >
                          DOC-REF: {s.sessionNumber}
                        </span>
                        <span
                          style={{
                            fontSize: "6.8pt",
                            fontWeight: "bold",
                            color: "#0369a1",
                            backgroundColor: "#e0f2fe",
                            padding: "1px 6px",
                            borderRadius: "10px",
                          }}
                        >
                          Halaman {p.pageIndex} dari {p.totalPages}
                        </span>
                      </div>
                      <h1
                        style={{
                          fontSize: "12pt",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: "#0f172a",
                          margin: "0 0 2px 0",
                        }}
                      >
                        LAPORAN ON THE SPOT MONITORING (OSM)
                      </h1>
                      <div
                        style={{
                          fontSize: "7.5pt",
                          color: "#475569",
                          fontWeight: "bold",
                          letterSpacing: "0.4px",
                        }}
                      >
                        HEALTH, SAFETY &amp; ENVIRONMENT (HSE) • SISTEM PEMANTAUAN K3 OPERASIONAL
                      </div>
                    </div>

                    {/* Section 1: Details & Monitoring Profile */}
                    <table style={{ marginBottom: "8px" }}>
                      <tbody>
                        <tr>
                          <td
                            colSpan={4}
                            style={{
                              fontWeight: "bold",
                              backgroundColor: "#e2e8f0",
                              color: "#0f172a",
                              fontSize: "8pt",
                              padding: "3.5px 6px",
                            }}
                          >
                            Details &amp; Monitoring Profile
                          </td>
                        </tr>
                        <tr>
                          <td style={{ width: "20%", fontWeight: "bold", backgroundColor: "#f8fafc" }}>
                            Kode Sesi Dokumen
                          </td>
                          <td style={{ width: "30%", fontFamily: "monospace", fontWeight: "bold", color: "#0369a1" }}>
                            {s.sessionNumber}
                          </td>
                          <td style={{ width: "20%", fontWeight: "bold", backgroundColor: "#f8fafc" }}>
                            Status Dokumen
                          </td>
                          <td style={{ width: "30%" }}>
                            <strong
                              style={{
                                color:
                                  s.status === "CLOSED"
                                    ? "#047857"
                                    : s.status === "IN_PROGRESS"
                                    ? "#d97706"
                                    : "#b91c1c",
                              }}
                            >
                              {s.status}
                            </strong>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>Tanggal &amp; Waktu</td>
                          <td>
                            {s.inspectionDate} • {s.inspectionTime} WITA
                          </td>
                          <td style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>Customer / Site</td>
                          <td>
                            <strong>{s.siteName || "Head Office / Central"}</strong>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>Fokus Monitoring</td>
                          <td>
                            <strong style={{ color: "#d97706" }}>{s.focusItemName}</strong>
                          </td>
                          <td style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>Area Lokasi</td>
                          <td>
                            <strong>{s.locationArea}</strong>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>Detail Lokasi Spesifik</td>
                          <td>{s.locationDetail || "—"}</td>
                          <td style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>Inisiator / Leader</td>
                          <td>
                            {s.leadEmployeeName} ({s.leadBadgeNumber})
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>Departemen / Jabatan</td>
                          <td>{[s.leadDepartment, s.leadRole].filter(Boolean).join(" • ") || "HSE Operation"}</td>
                          <td style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>Koordinat GPS Presisi</td>
                          <td>
                            {s.latitude && s.longitude ? (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  flexWrap: "wrap",
                                  gap: "4px",
                                }}
                              >
                                <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>
                                  📍 {s.latitude}, {s.longitude}
                                </span>
                                {googleMapsUrl && (
                                  <a
                                    href={googleMapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      color: "#0284c7",
                                      textDecoration: "underline",
                                      fontWeight: "bold",
                                      fontSize: "7.2pt",
                                    }}
                                  >
                                    Buka Google Maps ↗
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Koordinat tidak terekam</span>
                            )}
                          </td>
                        </tr>
                        {teamMembers.length > 0 && (
                          <tr>
                            <td style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>Anggota Tim Inspeksi</td>
                            <td colSpan={3}>
                              {teamMembers
                                .map((m: any) => `${m.name} (${m.badgeNumber || m.department || "Tim"})`)
                                .join(", ")}
                            </td>
                          </tr>
                        )}
                        {s.notes && (
                          <tr>
                            <td style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>Catatan Sesi</td>
                            <td colSpan={3} style={{ fontStyle: "italic", color: "#334155" }}>
                              {s.notes}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Section 2: Daftar Temuan Title */}
                    <div
                      style={{
                        fontSize: "8.2pt",
                        fontWeight: "bold",
                        marginBottom: "4px",
                        color: "#022744",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>
                        Daftar Temuan Lapangan &amp; Bukti Tindakan ({findings.length} Temuan)
                      </span>
                      {p.totalPages > 1 && (
                        <span style={{ fontSize: "7pt", fontWeight: "normal", color: "#64748b" }}>
                          (Menampilkan Temuan Bagian 1)
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Sub-header Halaman Lanjutan */}
                    <div
                      style={{
                        borderBottom: "1.5px solid #0284c7",
                        paddingBottom: "4px",
                        marginBottom: "8px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-end",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "9.5pt",
                            fontWeight: "bold",
                            color: "#0f172a",
                            textTransform: "uppercase",
                          }}
                        >
                          LAPORAN ON THE SPOT MONITORING (OSM) — LANJUTAN TEMUAN
                        </div>
                        <div style={{ fontSize: "7pt", color: "#64748b" }}>
                          Kode: <strong style={{ color: "#0369a1" }}>{s.sessionNumber}</strong> • Site:{" "}
                          <strong>{s.siteName || "Head Office"}</strong> • Tanggal: {s.inspectionDate}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "6.8pt",
                          fontWeight: "bold",
                          color: "#0369a1",
                          backgroundColor: "#e0f2fe",
                          padding: "1px 6px",
                          borderRadius: "10px",
                        }}
                      >
                        Halaman {p.pageIndex} dari {p.totalPages}
                      </span>
                    </div>
                  </>
                )}

                {/* Render Findings on this Page */}
                {p.pageFindings.length === 0 ? (
                  <div
                    style={{
                      padding: "14px",
                      textAlign: "center",
                      border: "1px dashed #cbd5e1",
                      borderRadius: "6px",
                      fontSize: "7.8pt",
                      color: "#64748b",
                      marginBottom: "10px",
                    }}
                  >
                    Tidak ada kondisi bahaya atau temuan yang dicatat pada sesi pemantauan ini (Kondisi Lapangan Terverifikasi Aman).
                  </div>
                ) : (
                  <div>
                    {p.pageFindings.map((f: any) => {
                      const overallIdx = findings.findIndex((item) => item.id === f.id || item.findingNumber === f.findingNumber);
                      const displayIdx = overallIdx >= 0 ? overallIdx + 1 : 1;
                      const risk = HSE_OSM_RISK_CONFIG[f.riskLevel as HseOsmRiskLevel] || HSE_OSM_RISK_CONFIG.MEDIUM;
                      const status = HSE_OSM_STATUS_CONFIG[f.status as HseOsmFindingStatus] || HSE_OSM_STATUS_CONFIG.OPEN;

                      return (
                        <div
                          key={f.id || displayIdx}
                          style={{
                            border: "1px solid #94a3b8",
                            borderRadius: "4px",
                            marginBottom: "6px",
                            padding: "5px 7px",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          {/* Finding Card Header */}
                          <table style={{ border: "none", marginBottom: "3px" }}>
                            <tbody>
                              <tr>
                                <td style={{ border: "none", width: "65%", padding: "0" }}>
                                  <span
                                    style={{
                                      fontFamily: "monospace",
                                      fontWeight: "bold",
                                      background: "#f1f5f9",
                                      padding: "1.5px 5px",
                                      borderRadius: "3px",
                                      fontSize: "7.5pt",
                                    }}
                                  >
                                    #{displayIdx} {f.findingNumber}
                                  </span>
                                  <span
                                    style={{
                                      marginLeft: "6px",
                                      fontWeight: "bold",
                                      fontSize: "8pt",
                                      color: "#0f172a",
                                    }}
                                  >
                                    {f.classificationName}
                                  </span>
                                </td>
                                <td style={{ border: "none", width: "35%", textAlign: "right", padding: "0" }}>
                                  <span
                                    style={{
                                      fontSize: "7.2pt",
                                      fontWeight: "bold",
                                      marginRight: "6px",
                                      color:
                                        f.riskLevel === "CRITICAL" || f.riskLevel === "HIGH"
                                          ? "#b91c1c"
                                          : "#b45309",
                                    }}
                                  >
                                    [{risk.label}]
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "7.2pt",
                                      fontWeight: "bold",
                                      padding: "1px 6px",
                                      borderRadius: "10px",
                                      background:
                                        f.status === "CLOSED"
                                          ? "#ecfdf5"
                                          : f.status === "PROCESSED"
                                          ? "#fffbeb"
                                          : "#fef2f2",
                                      color:
                                        f.status === "CLOSED"
                                          ? "#047857"
                                          : f.status === "PROCESSED"
                                          ? "#b45309"
                                          : "#b91c1c",
                                      border: `1px solid ${
                                        f.status === "CLOSED"
                                          ? "#a7f3d0"
                                          : f.status === "PROCESSED"
                                          ? "#fde68a"
                                          : "#fecaca"
                                      }`,
                                    }}
                                  >
                                    STATUS: {status.label}
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Problem Description & Recommendation */}
                          <table style={{ marginBottom: "5px" }}>
                            <tbody>
                              <tr>
                                <th style={{ width: "20%", verticalAlign: "top", backgroundColor: "#f8fafc" }}>
                                  Deskripsi Temuan K3
                                </th>
                                <td style={{ width: "80%", whiteSpace: "pre-line" }}>{f.description}</td>
                              </tr>
                              {f.actionRequired && (
                                <tr>
                                  <th style={{ verticalAlign: "top", backgroundColor: "#f8fafc" }}>
                                    Rekomendasi Tindakan
                                  </th>
                                  <td>{f.actionRequired}</td>
                                </tr>
                              )}
                              {f.actionTaken && (
                                <tr>
                                  <th style={{ verticalAlign: "top", backgroundColor: "#f0fdf4", color: "#166534" }}>
                                    Tindakan Perbaikan
                                  </th>
                                  <td style={{ backgroundColor: "#f0fdf4" }}>
                                    <strong>{f.actionTaken}</strong>{" "}
                                    {f.actionSubmittedBy && (
                                      <span style={{ color: "#475569" }}>(Oleh: {f.actionSubmittedBy})</span>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>

                          {/* Side-by-side Before & After Photos */}
                          <table style={{ border: "1px solid #cbd5e1", width: "100%", backgroundColor: "#f8fafc" }}>
                            <thead>
                              <tr>
                                <th
                                  style={{
                                    width: "50%",
                                    backgroundColor: "#fee2e2",
                                    color: "#991b1b",
                                    fontSize: "7.2pt",
                                    textAlign: "center",
                                    borderBottom: "1px solid #cbd5e1",
                                    padding: "2.5px",
                                  }}
                                >
                                  🔴 FOTO BEFORE (Kondisi Temuan Awal)
                                </th>
                                <th
                                  style={{
                                    width: "50%",
                                    backgroundColor: "#dcfce7",
                                    color: "#166534",
                                    fontSize: "7.2pt",
                                    textAlign: "center",
                                    borderBottom: "1px solid #cbd5e1",
                                    padding: "2.5px",
                                  }}
                                >
                                  🟢 FOTO AFTER (Bukti Selesai Perbaikan)
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                {/* BEFORE Column */}
                                <td
                                  style={{
                                    width: "50%",
                                    verticalAlign: "top",
                                    padding: "4px",
                                    backgroundColor: "#fff",
                                  }}
                                >
                                  {f.photoUrls && f.photoUrls.length > 0 ? (
                                    <div
                                      style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: "4px",
                                        justifyContent: "center",
                                      }}
                                    >
                                      {f.photoUrls.map((pUrl: string, pIdx: number) => {
                                        const cleanSrc = resolveUploadUrl(pUrl);
                                        return (
                                          <ResilientPrintPhoto
                                            key={pIdx}
                                            src={cleanSrc}
                                            alt={`Foto Temuan Before #${pIdx + 1}`}
                                            label={`Foto #${pIdx + 1} (Before)`}
                                            accentColor="#991b1b"
                                            badgeBg="#fef2f2"
                                          />
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div
                                      style={{
                                        padding: "16px 6px",
                                        textAlign: "center",
                                        fontSize: "7.2pt",
                                        color: "#94a3b8",
                                        fontStyle: "italic",
                                      }}
                                    >
                                      Tidak ada foto temuan awal
                                    </div>
                                  )}
                                </td>

                                {/* AFTER Column */}
                                <td
                                  style={{
                                    width: "50%",
                                    verticalAlign: "top",
                                    padding: "4px",
                                    backgroundColor: "#fff",
                                  }}
                                >
                                  {f.actionPhotoUrls && f.actionPhotoUrls.length > 0 ? (
                                    <div
                                      style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: "4px",
                                        justifyContent: "center",
                                      }}
                                    >
                                      {f.actionPhotoUrls.map((apUrl: string, apIdx: number) => {
                                        const cleanSrc = resolveUploadUrl(apUrl);
                                        return (
                                          <ResilientPrintPhoto
                                            key={apIdx}
                                            src={cleanSrc}
                                            alt={`Foto Perbaikan After #${apIdx + 1}`}
                                            label={`Foto #${apIdx + 1} (After)`}
                                            accentColor="#166534"
                                            badgeBg="#f0fdf4"
                                          />
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div
                                      style={{
                                        padding: "16px 6px",
                                        textAlign: "center",
                                        fontSize: "7.2pt",
                                        color: "#94a3b8",
                                        fontStyle: "italic",
                                      }}
                                    >
                                      {f.status === "OPEN"
                                        ? "Belum ada tindakan perbaikan (Status OPEN)"
                                        : "Tidak ada lampiran foto perbaikan"}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Page Content (Signatures on Last Page, or Continuation Indicator) */}
              <div style={{ flex: "0 0 auto", marginTop: "6px" }}>
                {p.isLastPage ? (
                  <>
                    {/* Official Signatures Section */}
                    <div style={{ marginTop: "6px", pageBreakInside: "avoid" }}>
                      <table style={{ border: "none", textAlign: "center", width: "100%" }}>
                        <tbody>
                          <tr>
                            <td style={{ border: "none", width: "33.3%", verticalAlign: "top", padding: "0 4px" }}>
                              <div style={{ fontSize: "7.5pt", fontWeight: "bold", marginBottom: "38px" }}>
                                Disiapkan Oleh (Leader OSM),
                              </div>
                              <div
                                style={{
                                  fontSize: "8pt",
                                  fontWeight: "bold",
                                  borderBottom: "1px solid #0f172a",
                                  width: "80%",
                                  margin: "0 auto 2px auto",
                                }}
                              >
                                {s.leadEmployeeName}
                              </div>
                              <div style={{ fontSize: "6.8pt", color: "#475569" }}>
                                SN: {s.leadBadgeNumber} • {s.leadDepartment || "Inisiator Lapangan"}
                              </div>
                            </td>

                            <td style={{ border: "none", width: "33.3%", verticalAlign: "top", padding: "0 4px" }}>
                              <div style={{ fontSize: "7.5pt", fontWeight: "bold", marginBottom: "38px" }}>
                                Ditindaklanjuti Oleh,
                              </div>
                              <div
                                style={{
                                  fontSize: "8pt",
                                  fontWeight: "bold",
                                  borderBottom: "1px solid #0f172a",
                                  width: "80%",
                                  margin: "0 auto 2px auto",
                                }}
                              >
                                ...............................................
                              </div>
                              <div style={{ fontSize: "6.8pt", color: "#475569" }}>
                                PIC / Pengawas Lapangan
                              </div>
                            </td>

                            <td style={{ border: "none", width: "33.3%", verticalAlign: "top", padding: "0 4px" }}>
                              <div style={{ fontSize: "7.5pt", fontWeight: "bold", marginBottom: "38px" }}>
                                Diketahui &amp; Diverifikasi,
                              </div>
                              <div
                                style={{
                                  fontSize: "8pt",
                                  fontWeight: "bold",
                                  borderBottom: "1px solid #0f172a",
                                  width: "80%",
                                  margin: "0 auto 2px auto",
                                }}
                              >
                                ...............................................
                              </div>
                              <div style={{ fontSize: "6.8pt", color: "#475569" }}>
                                HSE Officer / PJO Site
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Document Verification & System Stamp Footnote */}
                    <div
                      style={{
                        borderTop: "1px solid #cbd5e1",
                        paddingTop: "4px",
                        marginTop: "8px",
                        fontSize: "6.5pt",
                        color: "#64748b",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>Dicetak otomatis dari HERO HSE • PT Chitra Paratama</span>
                      {googleMapsUrl ? (
                        <span style={{ fontFamily: "monospace", color: "#0284c7" }}>
                          GPS: {s.latitude}, {s.longitude}
                        </span>
                      ) : null}
                      <span>Dokumen Kontrol Keselamatan Standard (Akhir Laporan)</span>
                    </div>
                  </>
                ) : (
                  /* Continuation Footer on Non-Last Pages */
                  <div
                    style={{
                      borderTop: "1px dashed #cbd5e1",
                      paddingTop: "4px",
                      marginTop: "6px",
                      fontSize: "6.8pt",
                      color: "#64748b",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>HERO HSE • Dokumen Pemantauan Lapangan (OSM)</span>
                    <span style={{ fontStyle: "italic", fontWeight: "bold", color: "#0369a1" }}>
                      Bersambung ke Halaman {p.pageIndex + 1} ↘
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
