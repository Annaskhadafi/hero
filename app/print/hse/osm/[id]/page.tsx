import { notFound } from "next/navigation";
import { getHseOsmSessionById } from "@/app/actions/hse-osm";
import { resolveUploadUrl } from "@/lib/resolve-upload-url";
import { HSE_OSM_RISK_CONFIG, HSE_OSM_STATUS_CONFIG, type HseOsmRiskLevel, type HseOsmFindingStatus } from "@/lib/hse-osm-constants";

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

  return (
    <div className="pdf-wrapper">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 12mm 10mm 12mm 10mm;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: #fff !important;
            font-size: 9pt;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #0f172a;
          line-height: 1.4;
          background-color: #f8fafc;
        }
        .pdf-wrapper {
          max-width: 210mm;
          margin: 0 auto;
          background: #fff;
          padding: 12mm 12mm;
          min-height: 297mm;
          box-sizing: border-box;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #cbd5e1;
          padding: 5px 8px;
          font-size: 8.5pt;
        }
        th {
          background-color: #f1f5f9;
          font-weight: bold;
          text-align: left;
        }
      `}</style>

      {/* Floating Action Header (Only on Screen) */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", padding: "10px 14px", background: "#0f172a", borderRadius: "8px", color: "#fff" }}>
        <div style={{ fontSize: "11pt", fontWeight: "bold" }}>
          Preview Cetak Dokumen OSM: {s.sessionNumber}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <button
            onClick={() => {}}
            // @ts-ignore
            id="print-btn"
            style={{ padding: "6px 16px", background: "#0d9488", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "9pt" }}
          >
            Cetak Dokumen (Ctrl+P)
          </button>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', function() {
              var btn = document.getElementById('print-btn');
              if (btn) btn.onclick = function() { window.print(); };
            });
          `,
        }}
      />

      {/* Kop Dokumen Resmi PT Chitra Paratama */}
      <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: "8px", marginBottom: "14px" }}>
        <table style={{ border: "none", width: "100%" }}>
          <tbody>
            <tr>
              <td style={{ border: "none", width: "25%", verticalAlign: "middle" }}>
                <div style={{ fontSize: "14pt", fontWeight: "900", color: "#0f172a", letterSpacing: "1px" }}>
                  CHITRA
                </div>
                <div style={{ fontSize: "8pt", color: "#0d9488", fontWeight: "bold", letterSpacing: "2px" }}>
                  PARATAMA
                </div>
              </td>
              <td style={{ border: "none", width: "50%", textAlign: "center", verticalAlign: "middle" }}>
                <div style={{ fontSize: "12pt", fontWeight: "bold", textTransform: "uppercase" }}>
                  LAPORAN ON THE SPOT MONITORING (OSM)
                </div>
                <div style={{ fontSize: "8pt", color: "#475569" }}>
                  Quality, Health, Safety & Environment (QHSE) Department
                </div>
                <div style={{ fontSize: "7.5pt", color: "#64748b" }}>
                  Standar Pelaporan Keselamatan Kerja Tambang • Benchmarking KPC
                </div>
              </td>
              <td style={{ border: "none", width: "25%", textAlign: "right", verticalAlign: "middle" }}>
                <div style={{ fontSize: "8pt", fontWeight: "bold", color: "#0f172a" }}>
                  No. Dokumen:
                </div>
                <div style={{ fontSize: "8pt", fontFamily: "monospace", fontWeight: "bold", color: "#0d9488" }}>
                  {s.sessionNumber}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Grid Informasi Sesi & Lokasi */}
      <table style={{ marginBottom: "12px", width: "100%" }}>
        <tbody>
          <tr>
            <th style={{ width: "18%" }}>Tanggal & Jam</th>
            <td style={{ width: "32%" }}>{s.inspectionDate} • {s.inspectionTime} WITA</td>
            <th style={{ width: "18%" }}>Site Kerja</th>
            <td style={{ width: "32%" }}>{s.siteName || "Head Office / Central"}</td>
          </tr>
          <tr>
            <th>Area Lokasi</th>
            <td><strong>{s.locationArea}</strong></td>
            <th>Fokus Monitoring</th>
            <td><strong style={{ color: "#b45309" }}>{s.focusItemName}</strong></td>
          </tr>
          <tr>
            <th>Koordinat GPS</th>
            <td style={{ fontFamily: "monospace" }}>
              {s.latitude && s.longitude ? `${s.latitude}, ${s.longitude} (${s.gpsAccuracy || "GPS"})` : "Tidak Terekam"}
            </td>
            <th>Inisiator / Leader</th>
            <td>{s.leadEmployeeName} ({s.leadBadgeNumber}) — {s.leadDepartment}</td>
          </tr>
          {s.notes && (
            <tr>
              <th>Catatan Sesi</th>
              <td colSpan={3} style={{ fontStyle: "italic", color: "#334155" }}>{s.notes}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Tabel Anggota Tim Inspeksi */}
      <div style={{ fontSize: "9pt", fontWeight: "bold", marginBottom: "4px", color: "#0f172a" }}>
        I. TIM INSPEKSI MONITORING LAPANGAN ({teamMembers.length} Personil)
      </div>
      <table style={{ marginBottom: "14px", width: "100%" }}>
        <thead>
          <tr style={{ backgroundColor: "#f8fafc" }}>
            <th style={{ width: "5%", textAlign: "center" }}>No</th>
            <th style={{ width: "35%" }}>Nama Personil</th>
            <th style={{ width: "20%" }}>NRP / Badge</th>
            <th style={{ width: "25%" }}>Divisi / Departemen</th>
            <th style={{ width: "15%", textAlign: "center" }}>Peran Tim</th>
          </tr>
        </thead>
        <tbody>
          {teamMembers.map((m: any, idx: number) => (
            <tr key={idx}>
              <td style={{ textAlign: "center" }}>{idx + 1}</td>
              <td><strong>{m.name}</strong></td>
              <td style={{ fontFamily: "monospace" }}>{m.badgeNumber}</td>
              <td>{m.department} ({m.company})</td>
              <td style={{ textAlign: "center" }}>
                {m.isTeamLeader ? (
                  <strong style={{ color: "#b45309" }}>Team Leader</strong>
                ) : (
                  "Anggota Tim"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Matriks Temuan Lapangan */}
      <div style={{ fontSize: "9pt", fontWeight: "bold", marginBottom: "4px", color: "#0f172a" }}>
        II. DAFTAR TEMUAN LAPANGAN & TINDAKAN KOREKTIF ({findings.length} Tiket)
      </div>

      {findings.length === 0 ? (
        <div style={{ padding: "16px", textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: "6px", fontSize: "8.5pt", color: "#64748b", marginBottom: "16px" }}>
          Tidak ada kondisi bahaya atau temuan yang dicatat pada sesi pemantauan ini (Kondisi Lapangan Aman).
        </div>
      ) : (
        <div style={{ marginBottom: "16px" }}>
          {findings.map((f: any, idx: number) => {
            const risk = HSE_OSM_RISK_CONFIG[f.riskLevel as HseOsmRiskLevel] || HSE_OSM_RISK_CONFIG.MEDIUM;
            const status = HSE_OSM_STATUS_CONFIG[f.status as HseOsmFindingStatus] || HSE_OSM_STATUS_CONFIG.OPEN;

            return (
              <div key={idx} style={{ border: "1px solid #cbd5e1", borderRadius: "6px", marginBottom: "10px", padding: "8px 10px", pageBreakInside: "avoid" }}>
                <table style={{ border: "none", marginBottom: "6px" }}>
                  <tbody>
                    <tr>
                      <td style={{ border: "none", width: "60%" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: "bold", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                          {f.findingNumber}
                        </span>
                        <span style={{ marginLeft: "8px", fontWeight: "bold", fontSize: "9pt" }}>
                          {f.classificationName}
                        </span>
                      </td>
                      <td style={{ border: "none", width: "40%", textAlign: "right" }}>
                        <span style={{ fontSize: "8pt", fontWeight: "bold", marginRight: "6px", color: f.riskLevel === "CRITICAL" || f.riskLevel === "HIGH" ? "#b91c1c" : "#b45309" }}>
                          [{risk.label}]
                        </span>
                        <span style={{ fontSize: "8pt", fontWeight: "bold", padding: "2px 8px", borderRadius: "10px", background: f.status === "CLOSED" ? "#ecfdf5" : f.status === "PROCESSED" ? "#fffbeb" : "#fef2f2", color: f.status === "CLOSED" ? "#047857" : f.status === "PROCESSED" ? "#b45309" : "#b91c1c" }}>
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
                      <th style={{ width: "20%", verticalAlign: "top" }}>Deskripsi Temuan</th>
                      <td style={{ width: "80%", whiteSpace: "pre-line" }}>{f.description}</td>
                    </tr>
                    {f.actionRequired && (
                      <tr>
                        <th style={{ verticalAlign: "top" }}>Rekomendasi</th>
                        <td>{f.actionRequired}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Foto Temuan & Foto Bukti Perbaikan side-by-side */}
                <table style={{ border: "none", marginBottom: "4px" }}>
                  <tbody>
                    <tr>
                      {/* Foto Temuan */}
                      <td style={{ border: "none", width: "50%", verticalAlign: "top", paddingRight: "6px" }}>
                        <div style={{ fontSize: "7.5pt", fontWeight: "bold", color: "#475569", marginBottom: "2px" }}>
                          Foto Kondisi Temuan:
                        </div>
                        {f.photoUrls && f.photoUrls.length > 0 ? (
                          <div style={{ display: "flex", gap: "6px" }}>
                            {f.photoUrls.map((pUrl: string, pIdx: number) => (
                              <img
                                key={pIdx}
                                src={resolveUploadUrl(pUrl, { absolute: true })}
                                alt="Foto Temuan"
                                style={{ width: "70px", height: "55px", objectFit: "cover", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: "7.5pt", color: "#94a3b8", fontStyle: "italic" }}>Tidak ada foto</div>
                        )}
                      </td>

                      {/* Foto Perbaikan */}
                      <td style={{ border: "none", width: "50%", verticalAlign: "top", paddingLeft: "6px" }}>
                        <div style={{ fontSize: "7.5pt", fontWeight: "bold", color: "#047857", marginBottom: "2px" }}>
                          Foto Bukti Selesai Perbaikan:
                        </div>
                        {f.actionPhotoUrls && f.actionPhotoUrls.length > 0 ? (
                          <div style={{ display: "flex", gap: "6px" }}>
                            {f.actionPhotoUrls.map((apUrl: string, apIdx: number) => (
                              <img
                                key={apIdx}
                                src={resolveUploadUrl(apUrl, { absolute: true })}
                                alt="Foto Bukti"
                                style={{ width: "70px", height: "55px", objectFit: "cover", borderRadius: "4px", border: "1px solid #10b981" }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: "7.5pt", color: "#94a3b8", fontStyle: "italic" }}>
                            {f.status === "OPEN" ? "Belum ada tindakan" : "Tidak ada foto bukti"}
                          </div>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Tindakan Korektif text */}
                {f.actionTaken && (
                  <div style={{ background: "#f8fafc", padding: "4px 8px", borderRadius: "4px", fontSize: "8pt", marginTop: "4px" }}>
                    <strong>Tindakan yang telah diambil:</strong> {f.actionTaken}{" "}
                    {f.actionSubmittedBy && <span style={{ color: "#64748b" }}>(Oleh: {f.actionSubmittedBy})</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lembar Tanda Tangan Resmi */}
      <div style={{ marginTop: "20px", pageBreakInside: "avoid" }}>
        <table style={{ border: "none", textAlign: "center" }}>
          <tbody>
            <tr>
              <td style={{ border: "none", width: "33.3%", verticalAlign: "top" }}>
                <div style={{ fontSize: "8.5pt", fontWeight: "bold", marginBottom: "50px" }}>
                  Disiapkan Oleh,
                </div>
                <div style={{ fontSize: "8.5pt", fontWeight: "bold", borderBottom: "1px solid #0f172a", width: "80%", margin: "0 auto 4px auto" }}>
                  {s.leadEmployeeName}
                </div>
                <div style={{ fontSize: "7.5pt", color: "#475569" }}>
                  Leader Tim Inspeksi OSM
                </div>
              </td>

              <td style={{ border: "none", width: "33.3%", verticalAlign: "top" }}>
                <div style={{ fontSize: "8.5pt", fontWeight: "bold", marginBottom: "50px" }}>
                  Ditindaklanjuti Oleh,
                </div>
                <div style={{ fontSize: "8.5pt", fontWeight: "bold", borderBottom: "1px solid #0f172a", width: "80%", margin: "0 auto 4px auto" }}>
                  ...............................................
                </div>
                <div style={{ fontSize: "7.5pt", color: "#475569" }}>
                  PIC / Pengawas Lapangan
                </div>
              </td>

              <td style={{ border: "none", width: "33.3%", verticalAlign: "top" }}>
                <div style={{ fontSize: "8.5pt", fontWeight: "bold", marginBottom: "50px" }}>
                  Diketahui & Diverifikasi,
                </div>
                <div style={{ fontSize: "8.5pt", fontWeight: "bold", borderBottom: "1px solid #0f172a", width: "80%", margin: "0 auto 4px auto" }}>
                  ...............................................
                </div>
                <div style={{ fontSize: "7.5pt", color: "#475569" }}>
                  HSE Officer / PJO Site
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px", marginTop: "24px", fontSize: "7pt", color: "#94a3b8", display: "flex", justifyContent: "space-between" }}>
        <span>Dicetak secara otomatis dari Sistem HERO HSE PT Chitra Paratama</span>
        <span>Dokumen Kontrol K3 KPC Standard</span>
      </div>
    </div>
  );
}
