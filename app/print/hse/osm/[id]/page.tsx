import { notFound } from "next/navigation";
import { getHseOsmSessionById } from "@/app/actions/hse-osm";
import { resolveUploadUrl } from "@/lib/resolve-upload-url";
import { HSE_OSM_RISK_CONFIG, HSE_OSM_STATUS_CONFIG, type HseOsmRiskLevel, type HseOsmFindingStatus } from "@/lib/hse-osm-constants";
import { OsmPrintAction } from "./print-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PrintHseOsmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = Number(id);
  if (isNaN(sessionId)) notFound();

  const res = await getHseOsmSessionById(sessionId);
  if (!res.success || !res.data) notFound();

  const s = res.data;
  const teamMembers = s.teamMembers || [];
  const findings = s.findings || [];

  const googleMapsUrl =
    s.latitude && s.longitude
      ? `https://www.google.com/maps?q=${s.latitude},${s.longitude}`
      : null;

  return (
    <>
      <OsmPrintAction googleMapsUrl={googleMapsUrl} />
      <div
        className="pdf-wrapper"
        style={{
          backgroundImage: "url('/ChitraParatama_Stationery_Letterhead_jkt.jpg')",
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
        }}
      >
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .pdf-wrapper {
            box-shadow: none !important;
            margin: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            background-image: url('/ChitraParatama_Stationery_Letterhead_jkt.jpg') !important;
            background-size: 100% 100% !important;
            background-repeat: no-repeat !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-after: avoid !important;
          }
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #0f172a;
          line-height: 1.35;
          background-color: #525659;
          margin: 0;
          padding: 24px 0;
        }
        .pdf-wrapper {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background-color: #fff;
          background-image: url('/ChitraParatama_Stationery_Letterhead_jkt.jpg');
          background-size: 100% 100%;
          background-repeat: no-repeat;
          padding: 38mm 18mm 32mm 18mm;
          box-sizing: border-box;
          box-shadow: 0 6px 24px rgba(0,0,0,0.25);
          position: relative;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #94a3b8;
          padding: 4.5px 7px;
          font-size: 8pt;
        }
        th {
          background-color: #f1f5f9;
          font-weight: bold;
          text-align: left;
        }
      `}</style>

      {/* Header Judul Dokumen (Kop & Logo sudah tertera pada background A4 letterhead) */}
      <div style={{ textAlign: "center", marginBottom: "14px" }}>
        <h1 style={{ fontSize: "12.5pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", color: "#000", margin: "0 0 3px 0" }}>
          LAPORAN ON THE SPOT MONITORING (OSM)
        </h1>
        <div style={{ fontSize: "8pt", color: "#475569", fontWeight: "bold", letterSpacing: "0.5px" }}>
          HEALTH, SAFETY &amp; ENVIRONMENT (HSE) • SISTEM PEMANTAUAN K3 OPERASIONAL
        </div>
      </div>

      {/* Section 1: Details & Monitoring Profile (4 Columns Table matching Daily Activity DAR format) */}
      <table style={{ marginBottom: "10px" }}>
        <tbody>
          <tr>
            <td colSpan={4} style={{ fontWeight: "bold", backgroundColor: "#e2e8f0", color: "#0f172a", fontSize: "8.5pt" }}>
              Details &amp; Monitoring Profile
            </td>
          </tr>
          <tr>
            <td style={{ width: "22%", fontWeight: "bold", backgroundColor: "#f8fafc" }}>Kode Sesi Dokumen</td>
            <td style={{ width: "28%", fontFamily: "monospace", fontWeight: "bold", color: "#0369a1" }}>{s.sessionNumber}</td>
            <td style={{ width: "22%", fontWeight: "bold", backgroundColor: "#f8fafc" }}>Status Dokumen</td>
            <td style={{ width: "28%" }}>
              <strong style={{ color: s.status === "CLOSED" ? "#047857" : s.status === "IN_PROGRESS" ? "#d97706" : "#b91c1c" }}>
                {s.status}
              </strong>
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>Tanggal &amp; Waktu</td>
            <td>{s.inspectionDate} • {s.inspectionTime} WITA</td>
            <td style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>Customer / Site</td>
            <td><strong>{s.siteName || "Head Office / Central"}</strong></td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>Fokus Monitoring</td>
            <td><strong style={{ color: "#d97706" }}>{s.focusItemName}</strong></td>
            <td style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>Area Lokasi</td>
            <td><strong>{s.locationArea}</strong></td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>Detail Lokasi Spesifik</td>
            <td>{s.locationDetail || "—"}</td>
            <td style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>Inisiator / Leader</td>
            <td>{s.leadEmployeeName} ({s.leadBadgeNumber})</td>
          </tr>
          <tr>
            <td style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>Departemen / Jabatan</td>
            <td>{[s.leadDepartment, s.leadRole].filter(Boolean).join(" • ") || "HSE Operation"}</td>
            <td style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>Koordinat GPS Presisi</td>
            <td>
              {s.latitude && s.longitude ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "4px" }}>
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
                        fontSize: "7.5pt",
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
                {teamMembers.map((m: any) => `${m.name} (${m.badgeNumber || m.department || "Tim"})`).join(", ")}
              </td>
            </tr>
          )}
          {s.notes && (
            <tr>
              <td style={{ fontWeight: "bold", backgroundColor: "#f8fafc" }}>Catatan Sesi</td>
              <td colSpan={3} style={{ fontStyle: "italic", color: "#334155" }}>{s.notes}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Section 2: Daftar Temuan Lapangan & Foto Before-After */}
      <div style={{ fontSize: "8.5pt", fontWeight: "bold", marginBottom: "4px", color: "#022744" }}>
        Daftar Temuan Lapangan &amp; Bukti Tindakan Perbaikan ({findings.length} Temuan)
      </div>

      {findings.length === 0 ? (
        <div style={{ padding: "14px", textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: "6px", fontSize: "8pt", color: "#64748b", marginBottom: "12px" }}>
          Tidak ada kondisi bahaya atau temuan yang dicatat pada sesi pemantauan ini (Kondisi Lapangan Terverifikasi Aman).
        </div>
      ) : (
        <div style={{ marginBottom: "12px" }}>
          {findings.map((f: any, idx: number) => {
            const risk = HSE_OSM_RISK_CONFIG[f.riskLevel as HseOsmRiskLevel] || HSE_OSM_RISK_CONFIG.MEDIUM;
            const status = HSE_OSM_STATUS_CONFIG[f.status as HseOsmFindingStatus] || HSE_OSM_STATUS_CONFIG.OPEN;

            return (
              <div
                key={idx}
                style={{
                  border: "1px solid #94a3b8",
                  borderRadius: "4px",
                  marginBottom: "8px",
                  padding: "6px 8px",
                  pageBreakInside: "avoid",
                  backgroundColor: "#ffffff",
                }}
              >
                {/* Header Kartu Temuan */}
                <table style={{ border: "none", marginBottom: "4px" }}>
                  <tbody>
                    <tr>
                      <td style={{ border: "none", width: "65%", padding: "0" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: "bold", background: "#f1f5f9", padding: "1.5px 5px", borderRadius: "3px", fontSize: "8pt" }}>
                          #{idx + 1} {f.findingNumber}
                        </span>
                        <span style={{ marginLeft: "6px", fontWeight: "bold", fontSize: "8.5pt", color: "#0f172a" }}>
                          {f.classificationName}
                        </span>
                      </td>
                      <td style={{ border: "none", width: "35%", textAlign: "right", padding: "0" }}>
                        <span style={{ fontSize: "7.5pt", fontWeight: "bold", marginRight: "6px", color: f.riskLevel === "CRITICAL" || f.riskLevel === "HIGH" ? "#b91c1c" : "#b45309" }}>
                          [{risk.label}]
                        </span>
                        <span
                          style={{
                            fontSize: "7.5pt",
                            fontWeight: "bold",
                            padding: "1.5px 7px",
                            borderRadius: "10px",
                            background: f.status === "CLOSED" ? "#ecfdf5" : f.status === "PROCESSED" ? "#fffbeb" : "#fef2f2",
                            color: f.status === "CLOSED" ? "#047857" : f.status === "PROCESSED" ? "#b45309" : "#b91c1c",
                            border: `1px solid ${f.status === "CLOSED" ? "#a7f3d0" : f.status === "PROCESSED" ? "#fde68a" : "#fecaca"}`,
                          }}
                        >
                          STATUS: {status.label}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Deskripsi Masalah & Rekomendasi */}
                <table style={{ marginBottom: "6px" }}>
                  <tbody>
                    <tr>
                      <th style={{ width: "20%", verticalAlign: "top", backgroundColor: "#f8fafc" }}>Deskripsi Temuan K3</th>
                      <td style={{ width: "80%", whiteSpace: "pre-line" }}>{f.description}</td>
                    </tr>
                    {f.actionRequired && (
                      <tr>
                        <th style={{ verticalAlign: "top", backgroundColor: "#f8fafc" }}>Rekomendasi Tindakan</th>
                        <td>{f.actionRequired}</td>
                      </tr>
                    )}
                    {f.actionTaken && (
                      <tr>
                        <th style={{ verticalAlign: "top", backgroundColor: "#f0fdf4", color: "#166534" }}>Tindakan Perbaikan Diambil</th>
                        <td style={{ backgroundColor: "#f0fdf4" }}>
                          <strong>{f.actionTaken}</strong>{" "}
                          {f.actionSubmittedBy && <span style={{ color: "#475569" }}>(Oleh: {f.actionSubmittedBy})</span>}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* FOTO BEFORE & AFTER (BERDAMPINGAN / SIDE-BY-SIDE) */}
                <table style={{ border: "1px solid #cbd5e1", width: "100%", backgroundColor: "#f8fafc" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "50%", backgroundColor: "#fee2e2", color: "#991b1b", fontSize: "7.5pt", textAlign: "center", borderBottom: "1px solid #cbd5e1" }}>
                        🔴 FOTO BEFORE (Kondisi Temuan Awal)
                      </th>
                      <th style={{ width: "50%", backgroundColor: "#dcfce7", color: "#166534", fontSize: "7.5pt", textAlign: "center", borderBottom: "1px solid #cbd5e1" }}>
                        🟢 FOTO AFTER (Bukti Selesai Perbaikan)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {/* Kolom BEFORE */}
                      <td style={{ width: "50%", verticalAlign: "top", padding: "6px", backgroundColor: "#fff" }}>
                        {f.photoUrls && f.photoUrls.length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
                            {f.photoUrls.map((pUrl: string, pIdx: number) => (
                              <div key={pIdx} style={{ textAlign: "center" }}>
                                <img
                                  src={resolveUploadUrl(pUrl, { absolute: true })}
                                  alt="Foto Temuan (Before)"
                                  style={{
                                    maxWidth: "160px",
                                    maxHeight: "110px",
                                    width: "auto",
                                    height: "auto",
                                    objectFit: "cover",
                                    borderRadius: "4px",
                                    border: "1px solid #cbd5e1",
                                    display: "block",
                                  }}
                                />
                                <span style={{ fontSize: "6.5pt", color: "#64748b" }}>Foto #{pIdx + 1} (Before)</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ padding: "20px 8px", textAlign: "center", fontSize: "7.5pt", color: "#94a3b8", fontStyle: "italic" }}>
                            Tidak ada foto temuan awal
                          </div>
                        )}
                      </td>

                      {/* Kolom AFTER */}
                      <td style={{ width: "50%", verticalAlign: "top", padding: "6px", backgroundColor: "#fff" }}>
                        {f.actionPhotoUrls && f.actionPhotoUrls.length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
                            {f.actionPhotoUrls.map((apUrl: string, apIdx: number) => (
                              <div key={apIdx} style={{ textAlign: "center" }}>
                                <img
                                  src={resolveUploadUrl(apUrl, { absolute: true })}
                                  alt="Foto Perbaikan (After)"
                                  style={{
                                    maxWidth: "160px",
                                    maxHeight: "110px",
                                    width: "auto",
                                    height: "auto",
                                    objectFit: "cover",
                                    borderRadius: "4px",
                                    border: "1px solid #86efac",
                                    display: "block",
                                  }}
                                />
                                <span style={{ fontSize: "6.5pt", color: "#166534" }}>Foto #{apIdx + 1} (After)</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ padding: "20px 8px", textAlign: "center", fontSize: "7.5pt", color: "#94a3b8", fontStyle: "italic" }}>
                            {f.status === "OPEN" ? "Belum ada tindakan perbaikan (Status OPEN)" : "Tidak ada lampiran foto perbaikan"}
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

      {/* Lembar Tanda Tangan Resmi (Format Daily Activity HERO) */}
      <div style={{ marginTop: "14px", pageBreakInside: "avoid" }}>
        <table style={{ border: "none", textAlign: "center", width: "100%" }}>
          <tbody>
            <tr>
              <td style={{ border: "none", width: "33.3%", verticalAlign: "top" }}>
                <div style={{ fontSize: "8pt", fontWeight: "bold", marginBottom: "45px" }}>
                  Disiapkan Oleh (Leader OSM),
                </div>
                <div style={{ fontSize: "8.5pt", fontWeight: "bold", borderBottom: "1px solid #0f172a", width: "80%", margin: "0 auto 3px auto" }}>
                  {s.leadEmployeeName}
                </div>
                <div style={{ fontSize: "7pt", color: "#475569" }}>
                  SN: {s.leadBadgeNumber} • {s.leadDepartment || "Inisiator Lapangan"}
                </div>
              </td>

              <td style={{ border: "none", width: "33.3%", verticalAlign: "top" }}>
                <div style={{ fontSize: "8pt", fontWeight: "bold", marginBottom: "45px" }}>
                  Ditindaklanjuti Oleh,
                </div>
                <div style={{ fontSize: "8.5pt", fontWeight: "bold", borderBottom: "1px solid #0f172a", width: "80%", margin: "0 auto 3px auto" }}>
                  ...............................................
                </div>
                <div style={{ fontSize: "7pt", color: "#475569" }}>
                  PIC / Pengawas Lapangan
                </div>
              </td>

              <td style={{ border: "none", width: "33.3%", verticalAlign: "top" }}>
                <div style={{ fontSize: "8pt", fontWeight: "bold", marginBottom: "45px" }}>
                  Diketahui &amp; Diverifikasi,
                </div>
                <div style={{ fontSize: "8.5pt", fontWeight: "bold", borderBottom: "1px solid #0f172a", width: "80%", margin: "0 auto 3px auto" }}>
                  ...............................................
                </div>
                <div style={{ fontSize: "7pt", color: "#475569" }}>
                  HSE Officer / PJO Site
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Info & Koordinat Map */}
      <div
        style={{
          borderTop: "1px solid #cbd5e1",
          paddingTop: "6px",
          marginTop: "16px",
          fontSize: "6.8pt",
          color: "#94a3b8",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Dicetak secara otomatis dari Sistem HERO HSE PT Chitra Paratama</span>
        {googleMapsUrl ? (
          <span style={{ fontFamily: "monospace", color: "#0284c7" }}>
            Koordinat: {s.latitude}, {s.longitude}
          </span>
        ) : null}
        <span>Dokumen Kontrol Keselamatan Tambang Standard</span>
      </div>
    </div>
    </>
  );
}
