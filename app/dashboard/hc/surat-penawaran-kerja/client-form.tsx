'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  HcWorkspaceBanner,
  hcMutedPanelClassName,
  hcPrimaryActionClassName,
} from '@/components/hc/hc-workspace-banner'
import { getNextLetterNumber, saveLetter } from '@/app/actions/surat'
import { Printer, Archive } from 'lucide-react'
import Link from 'next/link'

const LETTERHEAD_BACKGROUND_URL = '/ChitraParatama_Stationery_Letterhead_jkt.jpg'

type CandidateForOffer = {
  id: number
  fullName: string
  email: string
  phone: string
  jobTitle: string | null
  department: string | null
  section: string | null
  location: string | null
}

type HrSigner = {
  id: number
  name: string
  employeeSn: string
  jobTitle: string
  signatureUrl: string
}

export function SuratPenawaranKerjaClient({
  candidates,
  hrSigners,
}: {
  candidates: CandidateForOffer[]
  hrSigners: HrSigner[]
}) {
  const [selectedCandidateId, setSelectedCandidateId] = useState('')
  const [candidateSearch, setCandidateSearch] = useState('')
  const [selectedHrSignerId, setSelectedHrSignerId] = useState(
    () => hrSigners[0]?.id.toString() ?? ''
  )
  const [noSurat, setNoSurat] = useState('')
  const [tanggal, setTanggal] = useState(() => {
    return new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  })

  const [jabatan, setJabatan] = useState('')
  const [atasanLangsung, setAtasanLangsung] = useState('')
  const [gajiPokok, setGajiPokok] = useState('')
  const [masaKontrak, setMasaKontrak] = useState('12')
  const [biayaRawatJalan, setBiayaRawatJalan] = useState('Penusahaan memberikan bantuan biaya pengobatan rawat jalan sebesar Rp 3.500.000,-')
  const [biayaRawatInap, setBiayaRawatInap] = useState('Penusahaan akan memberikan biaya penggatan/Pengobatan sepengetahuan bagi karyawan beserta istri & 3 (tiga) anak yang sah secara hukum, apabila telah ditanggung menjadi tanggungan karyawan tetap')
  const [biayaMelahirkan, setBiayaMelahirkan] = useState('Penusahaan akan memberikan bantuan sebesar Rp 8.000.000,-. Dan apabila dilakukan operasi caesar perusahaan akan mengganti biaya peralatan sebesar Rp 15.000.000, setelah ditanggung menjadi tanggungan karyawan tetap')
  const [asuransiKecelakaan, setAsuransiKecelakaan] = useState('Penusahaan akan menanggung premi asuransi sepengetahuannya')
  const [bpjsKetenagakerjaan, setBpjsKetenagakerjaan] = useState('Wajib berdasarkan Peraturan Pemerintah')
  const [bpjsKesehatan, setBpjsKesehatan] = useState('Wajib berdasarkan Peraturan Pemerintah')
  const [thr, setThr] = useState('Penusahaan akan memberikan THR setahun upah, dan apabila Saudara belum mencapai masa kerja 1 (satu) tahun tetapi sudah lebih dari 1 (satu) bulan, maka akan dihitung secara proporsional.')
  const [ketentuanLain, setKetentuanLain] = useState('Ketentuan-ketentuan lain yang tidak secara khusus diatur dalam penawaran diatas (Biaya Perjalanan Dinas, Bantuan dan fasilitas lain dan perusahaan) akan tunduk pada peraturan/perjanjian karyawan yang berlaku. Pokok-pokok Musyawarah serta tetapkan pelaksanaan perusahaan')
  const [tanggalBekerja, setTanggalBekerja] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const letterNumberFetched = useRef(false)

  const visibleCandidateResults = candidates.filter((c) => {
    const q = candidateSearch.trim().toLowerCase()
    if (!q) return true
    return [c.fullName, c.jobTitle, c.department, c.section].filter(Boolean).join(' ').toLowerCase().includes(q)
  }).slice(0, 8)

  const selectedCandidate = candidates.find((c) => c.id.toString() === selectedCandidateId)
  const selectedHrSigner = hrSigners.find((s) => s.id.toString() === selectedHrSignerId)
  const selectedSignatureUrl = selectedHrSigner?.signatureUrl || ''

  useEffect(() => {
    if (!letterNumberFetched.current) {
      letterNumberFetched.current = true
      getNextLetterNumber('surat_penawaran_kerja').then((num) => setNoSurat(num))
    }
  }, [])

  useEffect(() => {
    if (selectedCandidate) {
      setJabatan(selectedCandidate.jobTitle || '')
    }
  }, [selectedCandidate])

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Mohon izinkan pop-up untuk mencetak surat.')
      return
    }

    const letterheadUrl = LETTERHEAD_BACKGROUND_URL
    const contentHtml = document.querySelector('.pdf-wrapper-content')?.outerHTML || ''

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Surat Penawaran Kerja</title>
          <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            body { margin: 0; background: #f5f7fb; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              background-image: url("${letterheadUrl}");
              background-size: 210mm 297mm;
              background-position: center top;
              background-repeat: no-repeat;
              color: black;
            }
            table { width: 100%; border-collapse: collapse; }
            .text-center { text-align: center; }
            .text-justify { text-align: justify; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .underline { text-decoration: underline; }
            .uppercase { text-transform: uppercase; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mb-8 { margin-bottom: 2rem; }
            .mt-8 { margin-top: 2rem; }
            .mt-16 { margin-top: 4rem; }
            .ml-6 { margin-left: 1.5rem; }
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .w-4 { width: 1rem; }
            .w-32 { width: 8rem; }
            .w-48 { width: 12rem; }
            .flex { display: flex; }
            .justify-end { justify-content: flex-end; }
            h1 { font-size: 1.25rem; line-height: 1.75rem; margin: 0; }
            p { margin-top: 0; }
          </style>
        </head>
        <body>
          <main class="page">${contentHtml}</main>
          <script>
            const closeAfterPrint = () => setTimeout(() => window.close(), 250);
            window.addEventListener("afterprint", closeAfterPrint);
            window.addEventListener("load", () => {
              const backgroundImage = new Image();
              backgroundImage.onload = () => setTimeout(() => window.print(), 150);
              backgroundImage.onerror = () => setTimeout(() => window.print(), 150);
              backgroundImage.src = "${letterheadUrl}";
            });
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleSaveToArchive = useCallback(async () => {
    if (!selectedCandidate) {
      setSaveMessage('Pilih kandidat terlebih dahulu.')
      return
    }

    setSaving(true)
    setSaveMessage('')

    try {
      const today = new Date().toISOString().split('T')[0]
      const contentHtml = document.querySelector('.pdf-wrapper-content')?.innerHTML || ''

      const result = await saveLetter({
        letterType: 'surat_penawaran_kerja',
        letterNumber: noSurat,
        employeeId: selectedCandidate.id,
        employeeName: selectedCandidate.fullName,
        subject: 'Surat Penawaran Kerja',
        content: contentHtml,
        destination: selectedCandidate.fullName,
        purpose: jabatan,
        issuedDate: today,
        issuedPlace: 'Balikpapan',
        signatoryName: selectedHrSigner?.name || '',
        signatoryTitle: selectedHrSigner?.jobTitle || 'HR-GA Supervisor',
        status: 'draft',
      })

      if (result.success) {
        setSaveMessage('Surat berhasil disimpan ke arsip.')
        const nextNum = await getNextLetterNumber('surat_penawaran_kerja')
        setNoSurat(nextNum)
      } else {
        setSaveMessage(result.error || 'Gagal menyimpan surat.')
      }
    } catch (error) {
      console.error('Error saving letter:', error)
      setSaveMessage('Terjadi kesalahan saat menyimpan.')
    } finally {
      setSaving(false)
    }
  }, [selectedCandidate, selectedHrSigner, noSurat, jabatan])

  return (
    <div className="space-y-6">
      <HcWorkspaceBanner
        title="Surat Penawaran Kerja"
        description="Buat surat penawaran kerja untuk kandidat yang telah lolos seleksi."
        items={[
          { label: 'Kandidat', value: candidates.length, tone: 'slate' },
          { label: 'Penandatangan', value: hrSigners.length, tone: 'slate' },
        ]}
      />

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/hc/surat?tab=archive">Lihat Arsip Surat</Link>
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Form */}
        <div className="flex-1 space-y-4">
          <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>No. Surat</Label>
                <Input value={noSurat} onChange={(e) => setNoSurat(e.target.value)} placeholder="Nomor surat" />
              </div>
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Kandidat / Calon Karyawan *</Label>
              <Input
                placeholder="Cari nama kandidat..."
                value={candidateSearch}
                onChange={(e) => { setCandidateSearch(e.target.value); setSelectedCandidateId('') }}
              />
              {candidateSearch && !selectedCandidateId && (
                <div className="border rounded-lg bg-white shadow-sm max-h-48 overflow-y-auto">
                  {visibleCandidateResults.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">Tidak ada kandidat ditemukan</div>
                  ) : (
                    visibleCandidateResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b last:border-0 text-sm"
                        onClick={() => {
                          setSelectedCandidateId(c.id.toString())
                          setCandidateSearch(c.fullName)
                        }}
                      >
                        <span className="font-medium">{c.fullName}</span>
                        <span className="text-muted-foreground ml-2">— {c.jobTitle || c.section || '-'}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
              {selectedCandidate && (
                <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
                  {selectedCandidate.fullName} · {selectedCandidate.jobTitle || '-'} · {selectedCandidate.section || '-'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Penandatangan</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedHrSignerId}
                onChange={(e) => setSelectedHrSignerId(e.target.value)}
              >
                {hrSigners.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.jobTitle}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Terms Form */}
          <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
            <h3 className="font-bold text-sm uppercase border-b pb-2">Detail Penawaran</h3>

            <div className="space-y-2">
              <Label>1. Jabatan / Level / POH</Label>
              <Input value={jabatan} onChange={(e) => setJabatan(e.target.value)} placeholder="Contoh: HSE Officer / Staff / Balikpapan" />
            </div>

            <div className="space-y-2">
              <Label>2. Atasan Langsung</Label>
              <Input value={atasanLangsung} onChange={(e) => setAtasanLangsung(e.target.value)} placeholder="Nama atasan langsung" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>3. Gaji Pokok</Label>
                <Input value={gajiPokok} onChange={(e) => setGajiPokok(e.target.value)} placeholder="Contoh: Rp. 8.000.000,-" />
              </div>
              <div className="space-y-2">
                <Label>4. Masa Kontrak (bulan)</Label>
                <Input value={masaKontrak} onChange={(e) => setMasaKontrak(e.target.value)} placeholder="12" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>5. Biaya Rawat Jalan</Label>
              <Textarea rows={2} value={biayaRawatJalan} onChange={(e) => setBiayaRawatJalan(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>6. Biaya Rawat Inap</Label>
              <Textarea rows={2} value={biayaRawatInap} onChange={(e) => setBiayaRawatInap(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>7. Biaya Melahirkan</Label>
              <Textarea rows={2} value={biayaMelahirkan} onChange={(e) => setBiayaMelahirkan(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>8. Asuransi Kecelakaan</Label>
              <Textarea rows={2} value={asuransiKecelakaan} onChange={(e) => setAsuransiKecelakaan(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>9. BPJS Ketenagakerjaan</Label>
              <Input value={bpjsKetenagakerjaan} onChange={(e) => setBpjsKetenagakerjaan(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>10. BPJS Kesehatan</Label>
              <Input value={bpjsKesehatan} onChange={(e) => setBpjsKesehatan(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>11. THR</Label>
              <Textarea rows={2} value={thr} onChange={(e) => setThr(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>12. Ketentuan-ketentuan Lain</Label>
              <Textarea rows={3} value={ketentuanLain} onChange={(e) => setKetentuanLain(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Mulai Bekerja (tanggal)</Label>
              <Input type="date" value={tanggalBekerja} onChange={(e) => setTanggalBekerja(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="flex-1">
          <div className="sticky top-4">
            <div className="flex gap-2 mb-3">
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" /> Cetak
              </Button>
              <Button onClick={handleSaveToArchive} disabled={saving} size="sm" className={hcPrimaryActionClassName}>
                <Archive className="w-4 h-4 mr-2" />
                {saving ? 'Menyimpan...' : 'Simpan ke Arsip'}
              </Button>
            </div>
            {saveMessage && (
              <p className={`text-sm mb-2 ${saveMessage.includes('berhasil') ? 'text-green-600' : 'text-red-600'}`}>{saveMessage}</p>
            )}

            <div
              className="pdf-wrapper relative mx-auto min-h-[297mm] w-[210mm] max-w-full overflow-hidden bg-white bg-[length:210mm_297mm] bg-top bg-no-repeat shadow-sm print:m-0 print:h-[297mm] print:w-[210mm] print:max-w-none print:shadow-none"
              style={{ backgroundImage: `url(${LETTERHEAD_BACKGROUND_URL})` }}
            >
              <div
                className="pdf-wrapper-content relative z-10 outline-none"
                style={{
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '10pt',
                  lineHeight: '1.4',
                  color: 'black',
                  paddingTop: '45mm',
                  paddingBottom: '20mm',
                  paddingLeft: '22mm',
                  paddingRight: '22mm',
                  minHeight: '297mm',
                }}
              >
                {/* No. Surat & Perihal */}
                <table className="mb-4 w-full">
                  <tbody>
                    <tr>
                      <td className="w-32 align-top font-semibold">No.</td>
                      <td className="w-4 align-top">:</td>
                      <td className="align-top">{noSurat || '______________________'}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Kepada Yth */}
                <div className="mb-4">
                  <p>Kepada Yth.</p>
                  <p className="font-bold underline">{selectedCandidate?.fullName || '______________________'}</p>
                  <p className="text-muted-foreground">Di Tempat</p>
                </div>

                {/* Perihal */}
                <p className="mb-4 underline font-semibold">Perihal : Penawaran Kerja</p>

                {/* Opening */}
                <p className="mb-4 text-justify">Dengan hormat,</p>
                <p className="mb-4 text-justify">
                  Bersama ini kami sampaikan penawaran kerja untuk saudara sebagai berikut :
                </p>

                {/* Terms Table */}
                <table className="mb-6 w-full text-sm">
                  <tbody>
                    <tr className="align-top">
                      <td className="w-8 py-1">1.</td>
                      <td className="w-44 py-1 font-semibold">Jabatan/Level/POH</td>
                      <td className="w-4 py-1">:</td>
                      <td className="py-1">{jabatan || '______________________'}</td>
                    </tr>
                    <tr className="align-top">
                      <td className="py-1">2.</td>
                      <td className="py-1 font-semibold">Atasan langsung</td>
                      <td className="py-1">:</td>
                      <td className="py-1">{atasanLangsung || '______________________'}</td>
                    </tr>
                    <tr className="align-top">
                      <td className="py-1">3.</td>
                      <td className="py-1 font-semibold">Gaji Pokok</td>
                      <td className="py-1">:</td>
                      <td className="py-1">{gajiPokok || '______________________'}</td>
                    </tr>
                    <tr className="align-top">
                      <td className="py-1">4.</td>
                      <td className="py-1 font-semibold">Masa kontrak</td>
                      <td className="py-1">:</td>
                      <td className="py-1">{masaKontrak} (dua belas) bulan</td>
                    </tr>
                    <tr className="align-top">
                      <td className="py-1">5.</td>
                      <td className="py-1 font-semibold">Biaya Rawat Jalan</td>
                      <td className="py-1">:</td>
                      <td className="py-1 text-justify">{biayaRawatJalan}</td>
                    </tr>
                    <tr className="align-top">
                      <td className="py-1">6.</td>
                      <td className="py-1 font-semibold">Biaya Rawat Inap</td>
                      <td className="py-1">:</td>
                      <td className="py-1 text-justify">{biayaRawatInap}</td>
                    </tr>
                    <tr className="align-top">
                      <td className="py-1">7.</td>
                      <td className="py-1 font-semibold">Biaya Melahirkan</td>
                      <td className="py-1">:</td>
                      <td className="py-1 text-justify">{biayaMelahirkan}</td>
                    </tr>
                    <tr className="align-top">
                      <td className="py-1">8.</td>
                      <td className="py-1 font-semibold">Asuransi Kecelakaan</td>
                      <td className="py-1">:</td>
                      <td className="py-1 text-justify">{asuransiKecelakaan}</td>
                    </tr>
                    <tr className="align-top">
                      <td className="py-1">9.</td>
                      <td className="py-1 font-semibold">BPJS Ketenagakerjaan</td>
                      <td className="py-1">:</td>
                      <td className="py-1">{bpjsKetenagakerjaan}</td>
                    </tr>
                    <tr className="align-top">
                      <td className="py-1">10.</td>
                      <td className="py-1 font-semibold">BPJS Kesehatan</td>
                      <td className="py-1">:</td>
                      <td className="py-1">{bpjsKesehatan}</td>
                    </tr>
                    <tr className="align-top">
                      <td className="py-1">11.</td>
                      <td className="py-1 font-semibold">THR</td>
                      <td className="py-1">:</td>
                      <td className="py-1 text-justify">{thr}</td>
                    </tr>
                    <tr className="align-top">
                      <td className="py-1">12.</td>
                      <td className="py-1 font-semibold">Ketentuan-ketentuan lain</td>
                      <td className="py-1">:</td>
                      <td className="py-1 text-justify">{ketentuanLain}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Closing */}
                <p className="mb-4 text-justify">
                  Bila saudara menyepakati penawaran tersebut diatas dan juga hasil medical check-up yang memenuhi syarat maka perusahaan
                  akan menyiapkan perjanjian kerja untuk ditandatangani kedua pihak dan mulai bekerja tanggal <span className="font-bold underline">{tanggalBekerja ? new Date(tanggalBekerja).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '___'}</span>
                </p>

                <p className="mb-8 text-justify">
                  Demikianlah surat penawaran kami, atas perhatian Saudara kami ucapkan terima kasih.
                </p>

                {/* Signature */}
                <div className="flex justify-between items-start">
                  <div>
                    <p>Balikpapan, {tanggal}</p>
                  </div>
                  <div className="text-center">
                    <p>Menerima/Menyetujui,</p>
                    <div className="mt-2" style={{ minHeight: '60px', minWidth: '160px' }}>
                      {selectedSignatureUrl ? (
                        <img src={selectedSignatureUrl} alt={`TTD ${selectedHrSigner?.name || 'HR'}`} className="h-16 object-contain" />
                      ) : (
                        <div className="h-16" />
                      )}
                    </div>
                    <p className="font-bold underline">{selectedHrSigner?.name || '_________________________'}</p>
                    <p className="text-sm">{selectedHrSigner?.jobTitle || 'HR-GA Supervisor'}</p>
                  </div>
                  <div className="text-center">
                    <div className="mb-2">
                      <p>{selectedCandidate?.fullName || '_________________________'}</p>
                      <p className="font-bold">Calon Karyawan</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 border-t pt-4 text-[8pt] text-muted-foreground">
                  <p className="font-bold text-black">PT Chitra Paratama</p>
                  <p>Jl. AMD RT. 46 No. 6 Kelurahan Graha Indah Balikpapan Utara 76126</p>
                  <p>P +62 542 7908100 | F +62 542 7908100</p>
                  <p>www.chitraparatama.co.id</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
