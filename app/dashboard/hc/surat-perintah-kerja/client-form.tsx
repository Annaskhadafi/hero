'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AdminPageShell } from '@/components/admin-page-shell'
import {
  HcWorkspaceBanner,
  hcMutedPanelClassName,
  hcPrimaryActionClassName,
} from '@/components/hc/hc-workspace-banner'
import { getNextLetterNumber, saveHrSignature, saveLetter } from '@/app/actions/surat'
import { formatJabatan } from '@/app/dashboard/hc/surat/utils'
import { Archive, Printer } from 'lucide-react'
import Link from 'next/link'

const LETTERHEAD_BACKGROUND_URL = '/ChitraParatama_Stationery_Letterhead_jkt.jpg'

type EmployeeForLetter = {
  id: number
  name: string
  employeeSn: string
  joinYear: number
  section: string
  jobTitle: string
}

type HrSigner = {
  id: number
  name: string
  employeeSn: string
  jobTitle: string
  signatureUrl: string
}

export function SuratPerintahKerjaClient({
  employees,
  hrSigners,
}: {
  employees: EmployeeForLetter[]
  hrSigners: HrSigner[]
}) {
  const [selectedHrSignerId, setSelectedHrSignerId] = useState<string>(
    () => hrSigners[0]?.id.toString() ?? ''
  )
  const [uploadedSignatures, setUploadedSignatures] = useState<Record<string, string>>({})
  const [noSurat, setNoSurat] = useState('')
  const [tanggal, setTanggal] = useState(() => {
    return new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  })

  // Custom inputs for Surat Perintah Kerja
  const [selectedEmpId, setSelectedEmpId] = useState<string>('')
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [jobDate, setJobDate] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const letterNumberFetched = useRef(false)

  const selectedHrSigner = hrSigners.find((signer) => signer.id.toString() === selectedHrSignerId)
  const selectedSignatureUrl = selectedHrSigner
    ? uploadedSignatures[selectedHrSigner.name] || selectedHrSigner.signatureUrl
    : ''

  const normalizedEmployeeSearch = employeeSearch.trim().toLowerCase()
  const filteredEmployees = normalizedEmployeeSearch
    ? employees.filter((employee) =>
        [employee.employeeSn, employee.name, employee.jobTitle, employee.section]
          .join(' ')
          .toLowerCase()
          .includes(normalizedEmployeeSearch)
      )
    : employees
  const visibleEmployeeResults = filteredEmployees.slice(0, 8)
  const selectedEmp = employees.find((e) => e.id.toString() === selectedEmpId)

  const formattedJobDate = jobDate
    ? new Date(jobDate).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : ''

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('hero-hr-signatures')
      if (raw) setUploadedSignatures(JSON.parse(raw) as Record<string, string>)
    } catch (error) {
      console.error('Failed to load HR signatures:', error)
    }
  }, [])

  const handleSignatureUpload = (file: File | undefined) => {
    if (!file || !selectedHrSigner) return

    const reader = new FileReader()
    reader.onload = () => {
      const signatureDataUrl = String(reader.result || '')
      setUploadedSignatures((current) => {
        const next = { ...current, [selectedHrSigner.name]: signatureDataUrl }
        window.localStorage.setItem('hero-hr-signatures', JSON.stringify(next))
        return next
      })
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    if (letterNumberFetched.current) return
    letterNumberFetched.current = true

    getNextLetterNumber('surat_perintah_kerja')
      .then((num) => {
        setNoSurat(num)
      })
      .catch((err) => {
        console.error('Failed to generate letter number:', err)
      })
  }, [])

  const handleSignatureDelete = () => {
    if (!selectedHrSigner) return

    setUploadedSignatures((current) => {
      const next = { ...current }
      delete next[selectedHrSigner.name]
      window.localStorage.setItem('hero-hr-signatures', JSON.stringify(next))
      return next
    })
  }

  const handlePrint = () => {
    const contentHtml = document.querySelector('.pdf-wrapper-content')?.outerHTML || ''
    const letterheadUrl = new URL(LETTERHEAD_BACKGROUND_URL, window.location.origin).toString()
    const printWindow = window.open('', '_blank', 'width=900,height=1200')

    if (!printWindow) {
      window.print()
      return
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Surat Perintah Kerja</title>
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
            td { vertical-align: top; }
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
            .mb-12 { margin-bottom: 3rem; }
            .mb-20 { margin-bottom: 5rem; }
            .mt-12 { margin-top: 3rem; }
            .mt-16 { margin-top: 4rem; }
            .ml-4 { margin-left: 1rem; }
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .w-4 { width: 1rem; }
            .w-48 { width: 12rem; }
            .flex { display: flex; }
            .justify-start { justify-content: flex-start; }
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
    if (!selectedEmp && !employeeSearch) {
      setSaveMessage('Isi nama penerima perintah terlebih dahulu.')
      return
    }

    setSaving(true)
    setSaveMessage('')

    try {
      const today = new Date().toISOString().split('T')[0]
      const contentHtml = document.querySelector('.pdf-wrapper')?.innerHTML || ''
      const finalName = selectedEmp ? selectedEmp.name : employeeSearch

      const result = await saveLetter({
        letterType: 'surat_perintah_kerja',
        letterNumber: noSurat,
        employeeId: selectedEmp?.id,
        employeeName: finalName,
        subject: jobDescription || 'Surat Perintah Kerja',
        content: contentHtml,
        purpose: jobDescription,
        issuedDate: today,
        issuedPlace: 'Balikpapan',
        signatoryName: selectedHrSigner?.name || '',
        signatoryTitle: selectedHrSigner?.jobTitle || 'HR Operation & IR',
        status: 'draft',
      })

      if (result.success) {
        setSaveMessage('Surat berhasil disimpan ke arsip.')
        const nextNum = await getNextLetterNumber('surat_perintah_kerja')
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
  }, [selectedEmp, employeeSearch, noSurat, jobDescription, selectedHrSigner])

  return (
    <AdminPageShell
      eyebrow="HC • Surat Perintah Kerja"
      title="Generate Surat Perintah Kerja"
      description="Buat dan cetak surat perintah kerja untuk vendor atau pihak eksternal."
    >
      <HcWorkspaceBanner
        title="SPK Composer"
        description="Lengkapi detail surat perintah kerja, lalu cek preview dokumen yang siap dicetak."
        items={[
          { label: 'Karyawan', value: employees.length, tone: 'slate' },
          { label: 'Penerima', value: selectedEmp || employeeSearch ? 'Terisi' : 'Kosong', tone: selectedEmp || employeeSearch ? 'emerald' : 'amber' },
          { label: 'Pekerjaan', value: jobDescription ? 'Terisi' : 'Kosong', tone: jobDescription ? 'sky' : 'amber' },
          { label: 'HR Signer', value: selectedHrSigner ? 'Siap' : 'Belum', tone: selectedHrSigner ? 'emerald' : 'amber' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        <div className="flex flex-col gap-4 print:hidden">
          <Card className={`space-y-4 p-4 ${hcMutedPanelClassName}`}>
            <div>
              <Label className="mb-2 block">No Surat</Label>
              <Input
                value={noSurat}
                onChange={(e) => setNoSurat(e.target.value)}
                placeholder="Contoh: 024/GA-CHITRABPN/IV/2026"
              />
            </div>
            <div>
              <Label className="mb-2 block">Tanggal Dibuat</Label>
              <Input value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">Yang Bertanda Tangan (HR)</Label>
              <select
                className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
                value={selectedHrSignerId}
                onChange={(e) => setSelectedHrSignerId(e.target.value)}
              >
                <option value="">-- Pilih HR GA --</option>
                {hrSigners.map((signer) => (
                  <option key={signer.id} value={signer.id}>
                    {signer.name} - {signer.jobTitle}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-2 block">Upload TTD</Label>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => handleSignatureUpload(event.target.files?.[0])}
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Upload TTD disimpan ke public sesuai nama HR terpilih.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-2 h-8 rounded-lg px-3 text-xs"
                disabled={!selectedHrSigner || !uploadedSignatures[selectedHrSigner.name]}
                onClick={handleSignatureDelete}
              >
                Hapus Upload TTD
              </Button>
            </div>

            <div className="mt-2 border-t pt-4">
              <h4 className="mb-3 text-sm font-semibold">Penerima Perintah (Pihak Kedua)</h4>
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Karyawan / Nama Pihak Kedua</Label>
                  <Input
                    value={employeeSearch}
                    onChange={(e) => {
                      setEmployeeSearch(e.target.value)
                      setSelectedEmpId('')
                    }}
                    placeholder="Ketik nama, NIK, jabatan..."
                  />
                  <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                    {visibleEmployeeResults.length > 0 ? (
                      visibleEmployeeResults.map((emp) => {
                        const isSelected = emp.id.toString() === selectedEmpId
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            className={`w-full border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50 ${
                              isSelected ? 'text-primary bg-slate-100 font-semibold' : 'text-slate-700'
                            }`}
                            onClick={() => {
                              setSelectedEmpId(emp.id.toString())
                              setEmployeeSearch(`${emp.name}`)
                            }}
                          >
                            <span className="block font-medium">
                              {emp.employeeSn} - {emp.name}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {emp.jobTitle} • {emp.section}
                            </span>
                          </button>
                        )
                      })
                    ) : (
                      <div className="text-muted-foreground px-3 py-2 text-sm">
                        Ketik manual jika bukan karyawan
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Untuk Mengerjakan</Label>
                  <Input
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Contoh: Pergantian Ignition Transformer..."
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Waktu Pengerjaan</Label>
                  <Input
                    type="date"
                    value={jobDate}
                    onChange={(e) => setJobDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-2">
            <Button onClick={handlePrint} className={`w-full ${hcPrimaryActionClassName}`}>
              <Printer className="size-4" />
              Print Surat
            </Button>
            <Button
              onClick={handleSaveToArchive}
              variant="outline"
              className="w-full gap-2 rounded-xl"
              disabled={saving}
            >
              <Archive className="size-4" />
              {saving ? 'Menyimpan...' : 'Simpan ke Arsip'}
            </Button>
            {saveMessage && (
              <p
                className={`text-center text-xs ${
                  saveMessage.includes('berhasil') ? 'text-emerald-600' : 'text-destructive'
                }`}
              >
                {saveMessage}
              </p>
            )}
            <Link
              href="/dashboard/hc/surat?tab=archive"
              className="text-primary hover:text-primary/80 text-center text-xs underline underline-offset-4"
            >
              Lihat Arsip Surat
            </Link>
          </div>
        </div>

        <div className="rounded-[1.1rem] bg-slate-100 p-4 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_14px_32px_rgba(15,23,42,0.06)] print:m-0 print:bg-transparent print:p-0 print:shadow-none">
          <div
            className="pdf-wrapper relative mx-auto min-h-[297mm] w-[210mm] max-w-full overflow-hidden bg-white bg-[length:210mm_297mm] bg-top bg-no-repeat shadow-sm print:m-0 print:h-[297mm] print:w-[210mm] print:max-w-none print:shadow-none"
            style={{ backgroundImage: `url(${LETTERHEAD_BACKGROUND_URL})` }}
          >
            <div
              contentEditable
              suppressContentEditableWarning
              className="pdf-wrapper-content relative z-10 outline-none"
              style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: '9.5pt',
                lineHeight: '1.3',
                color: 'black',
                paddingTop: '38mm',
                paddingBottom: '20mm',
                paddingLeft: '22mm',
                paddingRight: '22mm',
                minHeight: '297mm',
              }}
            >
              <div className="mb-6 text-center">
                <h1 className="mb-0 text-xl font-bold uppercase underline">Surat Perintah Kerja</h1>
                <p>No. {noSurat || '______________________'}</p>
              </div>

              <p className="mb-2 font-bold">Yang bertanda tangan dibawah ini :</p>

              <table className="mb-4 ml-4 w-full">
                <tbody>
                  <tr>
                    <td className="w-40 pb-1">Nama</td>
                    <td className="w-4 pb-1">:</td>
                    <td className="pb-1">{selectedHrSigner?.name || '______________________'}</td>
                  </tr>
                  <tr>
                    <td className="pb-1">Jabatan</td>
                    <td className="pb-1">:</td>
                    <td className="pb-1">{selectedHrSigner?.jobTitle || '______________________'}</td>
                  </tr>
                  <tr>
                    <td className="pb-1">Perusahaan</td>
                    <td className="pb-1">:</td>
                    <td className="pb-1">PT Chitra Paratama</td>
                  </tr>
                  <tr>
                    <td className="pb-1">Alamat</td>
                    <td className="pb-1">:</td>
                    <td className="pb-1">Jl. AMD No.69 RT 46 Kel Graha Indah Balikpapan</td>
                  </tr>
                </tbody>
              </table>

              <p className="mb-2 font-bold">Dengan ini memberikan perintah kerja kepada :</p>

              <table className="mb-6 ml-4 w-full">
                <tbody>
                  <tr>
                    <td className="w-40 pb-1">Nama</td>
                    <td className="w-4 pb-1">:</td>
                    <td className="font-bold pb-1">{selectedEmp?.name || employeeSearch || '______________________'}</td>
                  </tr>
                  {selectedEmp && (
                    <>
                      <tr>
                        <td className="pb-1">NIK</td>
                        <td className="pb-1">:</td>
                        <td className="pb-1">{selectedEmp.employeeSn}</td>
                      </tr>
                      <tr>
                        <td className="pb-1">Jabatan</td>
                        <td className="pb-1">:</td>
                        <td className="pb-1">{formatJabatan(selectedEmp.section, selectedEmp.jobTitle)}</td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td className="pb-1">Untuk Mengerjakan</td>
                    <td className="pb-1">:</td>
                    <td className="pb-1">{jobDescription || '______________________'}</td>
                  </tr>
                  <tr>
                    <td className="pb-1">Waktu Pengerjaan</td>
                    <td className="pb-1">:</td>
                    <td className="pb-1">{formattedJobDate || '______________________'}</td>
                  </tr>
                </tbody>
              </table>

              <p className="mb-6 text-justify">
                Demikian surat perintah kerja ini dibuat untuk dipergunakan sebagaimana mestinya.
              </p>

              <div className="mt-6 flex justify-start">
                <div>
                  <p className="mb-1">Balikpapan, {tanggal || '_________________'}</p>
                  <p className="mb-2">Hormat Kami,</p>
                  
                  {/* TTD + Stempel area */}
                  <div className="relative mb-1 w-48">
                    {/* Stempel image placed behind signature */}
                    <div className="absolute top-1/2 left-0 -translate-y-1/2 opacity-70" style={{ pointerEvents: 'none' }}>
                       {/* You can add a company stamp image here if available, currently mimicking the layout */}
                    </div>
                    
                    {selectedSignatureUrl ? (
                      <img
                        src={selectedSignatureUrl}
                        alt={`TTD ${selectedHrSigner?.name || 'HR'}`}
                        className="relative z-10 mb-1 object-contain"
                        style={{ height: '60px', width: 'auto', minWidth: '120px' }}
                      />
                    ) : (
                      <div className="mb-1" style={{ height: '60px', width: '120px' }} />
                    )}
                  </div>

                  <p className="font-bold underline">
                    {selectedHrSigner?.name || '_________________________'}
                  </p>
                  <p>{selectedHrSigner?.jobTitle || 'HR Operation & IR'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            @page { size: A4; margin: 0; }
            body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body * { visibility: hidden; }
            .pdf-wrapper, .pdf-wrapper * { visibility: visible; }
            .pdf-wrapper { position: fixed; inset: 0; background-size: 210mm 297mm !important; }
          }
        `,
        }}
      />
    </AdminPageShell>
  )
}
