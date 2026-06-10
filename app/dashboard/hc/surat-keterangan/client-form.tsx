'use client'

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

export function SuratKeteranganClient({
  employees,
  hrSigners,
}: {
  employees: EmployeeForLetter[]
  hrSigners: HrSigner[]
}) {
  const [selectedEmpId, setSelectedEmpId] = useState<string>('')
  const [employeeSearch, setEmployeeSearch] = useState('')
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
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const letterNumberFetched = useRef(false)

  const visibleEmployeeResults = useMemo(() => {
    const normalized = employeeSearch.trim().toLowerCase();
    if (!normalized) return employees.slice(0, 8);
    return employees.filter(e => {
      const vals = [e.name, e.employeeSn, e.jobTitle, e.section, (e as any).levelName, (e as any).employeeStatusType];
      return vals.filter(Boolean).join(' ').toLowerCase().includes(normalized);
    }).slice(0, 8);
  }, [employees, employeeSearch]);
  const selectedEmp = employees.find((e) => e.id.toString() === selectedEmpId)
  const selectedHrSigner = hrSigners.find((signer) => signer.id.toString() === selectedHrSignerId)
  const selectedSignatureUrl = selectedHrSigner
    ? uploadedSignatures[selectedHrSigner.name] || selectedHrSigner.signatureUrl
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
  // Auto-generate letter number on mount
  useEffect(() => {
    if (letterNumberFetched.current) return
    letterNumberFetched.current = true

    getNextLetterNumber('surat_keterangan')
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
    const contentHtml = document.querySelector('.pdf-wrapper-content')?.innerHTML || ''
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
          <title>Surat Keterangan Bekerja</title>
          <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            body { margin: 0; background: #f5f7fb; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 55mm 25mm 30mm;
              background-image: url("${letterheadUrl}");
              background-size: 210mm 297mm;
              background-position: center top;
              background-repeat: no-repeat;
              color: black;
              font-family: Arial, sans-serif;
              font-size: 12pt;
              line-height: 1.5;
            }
            table { width: 100%; border-collapse: collapse; }
            .text-center { text-align: center; }
            .text-justify { text-align: justify; }
            .font-bold { font-weight: 700; }
            .font-medium { font-weight: 500; }
            .underline { text-decoration: underline; }
            .uppercase { text-transform: uppercase; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mb-8 { margin-bottom: 2rem; }
            .mb-12 { margin-bottom: 3rem; }
            .mb-20 { margin-bottom: 5rem; }
            .mt-16 { margin-top: 4rem; }
            .ml-6 { margin-left: 1.5rem; }
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .w-4 { width: 1rem; }
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
          <\/script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleSaveToArchive = useCallback(async () => {
    if (!selectedEmp) {
      setSaveMessage('Pilih karyawan terlebih dahulu.')
      return
    }

    setSaving(true)
    setSaveMessage('')

    try {
      const today = new Date().toISOString().split('T')[0]
      const contentHtml = document.querySelector('.pdf-wrapper')?.innerHTML || ''

      const result = await saveLetter({
        letterType: 'surat_keterangan',
        letterNumber: noSurat,
        employeeId: selectedEmp.id,
        employeeName: selectedEmp.name,
        subject: 'Surat Keterangan Bekerja',
        content: contentHtml,
        issuedDate: today,
        issuedPlace: 'Balikpapan',
        signatoryName: selectedHrSigner?.name || '',
        signatoryTitle: selectedHrSigner?.jobTitle || 'HR & GA Dept. Head',
        status: 'draft',
      })

      if (result.success) {
        setSaveMessage('Surat berhasil disimpan ke arsip.')
        // Refresh letter number for next use
        const nextNum = await getNextLetterNumber('surat_keterangan')
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
  }, [selectedEmp, noSurat, selectedHrSigner])

  return (
    <div className="space-y-4">
      <HcWorkspaceBanner
        title="Employment Letter Composer"
        description="Kontrol surat dipisah dari preview dokumen agar HC bisa pilih karyawan, cek autofill, cetak, dan arsip tanpa visual ramai."
        items={[
          { label: 'Karyawan', value: employees.length, tone: 'slate' },
          {
            label: 'Dipilih',
            value: selectedEmp ? 'Siap' : 'Belum',
            tone: selectedEmp ? 'emerald' : 'amber',
          },
          {
            label: 'HR Signer',
            value: selectedHrSigner ? 'Siap' : 'Belum',
            tone: selectedHrSigner ? 'emerald' : 'amber',
          },
          { label: 'Nomor', value: noSurat ? 'Auto' : 'Manual', tone: 'sky' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        <div className="flex flex-col gap-4 print:hidden">
          <Card className={`space-y-4 p-4 ${hcMutedPanelClassName}`}>
            <div>
              <Label className="mb-2 block">Karyawan</Label>
              <Input
                value={employeeSearch}
                onChange={(e) => {
                  setEmployeeSearch(e.target.value)
                  setSelectedEmpId('')
                }}
                placeholder="Ketik nama, SN, jabatan, section..."
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
                          setEmployeeSearch(`${emp.employeeSn} ${emp.name}`)
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
                    Tidak ada karyawan cocok
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">No Surat</Label>
              <Input
                value={noSurat}
                onChange={(e) => setNoSurat(e.target.value)}
                placeholder="Contoh: 012/HR/VI/2026"
              />
            </div>
            <div>
              <Label className="mb-2 block">Tanggal</Label>
              <Input value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">HR Penandatangan</Label>
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
          </Card>

          <Card
            className={`space-y-4 border-amber-200/60 bg-amber-50/70 p-4 ${hcMutedPanelClassName}`}
          >
            <h3 className="text-sm font-semibold">Data Autofill</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SN</span>
                <span className="font-medium">{selectedEmp?.employeeSn || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nama</span>
                <span className="font-medium">{selectedEmp?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Section</span>
                <span className="font-medium">{selectedEmp?.section || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mulai Bekerja</span>
                <span className="font-medium">{selectedEmp?.joinYear || '-'}</span>
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
            className="pdf-wrapper relative mx-auto min-h-[297mm] w-[210mm] max-w-full overflow-hidden bg-white bg-cover bg-top bg-no-repeat shadow-sm print:m-0 print:h-[297mm] print:w-[210mm] print:max-w-none print:shadow-none"
            style={{ backgroundImage: `url(${LETTERHEAD_BACKGROUND_URL})` }}
          >
            <div
              contentEditable
              suppressContentEditableWarning
              className="pdf-wrapper-content relative z-10 outline-none"
              style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: '12pt',
                lineHeight: '1.5',
                color: 'black',
                paddingTop: '55mm',
                paddingBottom: '30mm',
                paddingLeft: '25mm',
                paddingRight: '25mm',
                minHeight: '297mm',
              }}
            >
              <div className="mb-8 text-center">
                <h1 className="mb-1 text-xl font-bold uppercase underline">
                  Surat Keterangan Bekerja
                </h1>
                <p>No: {noSurat || '______________________'}</p>
              </div>

              <p className="mb-6">Yang bertanda tangan di bawah ini, menerangkan bahwa:</p>

              <table className="mb-6 ml-6 w-full">
                <tbody>
                  <tr>
                    <td className="w-48 py-1">Nama</td>
                    <td className="w-4">:</td>
                    <td className="font-bold">{selectedEmp?.name || '______________________'}</td>
                  </tr>
                  <tr>
                    <td className="py-1">SN</td>
                    <td>:</td>
                    <td>{selectedEmp?.employeeSn || '______________________'}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Jabatan / Section</td>
                    <td>:</td>
                    <td>
                      {selectedEmp ? formatJabatan(selectedEmp.section, selectedEmp.jobTitle) : '________________'} /{' '}
                      {selectedEmp?.section || '________________'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1">Tahun Masuk</td>
                    <td>:</td>
                    <td>{selectedEmp?.joinYear || '______________________'}</td>
                  </tr>
                </tbody>
              </table>

              <p className="mb-6 text-justify">
                Adalah benar karyawan kami dan masih aktif bekerja di PT Chitra Paratama terhitung
                sejak tahun {selectedEmp?.joinYear || '____'} hingga surat ini dikeluarkan. Selama
                bekerja yang bersangkutan menunjukkan dedikasi dan kinerja yang baik.
              </p>

              <p className="mb-12 text-justify">
                Demikian surat keterangan kerja ini dibuat agar dapat dipergunakan sebagaimana
                mestinya.
              </p>

              <div className="mt-16 flex justify-end text-center">
                <div>
                  <p className="mb-1">Balikpapan, {tanggal || '_________________'}</p>
                  <p className="mb-8 font-bold">PT Chitra Paratama</p>
                  {selectedSignatureUrl ? (
                    <img
                      src={selectedSignatureUrl}
                      alt={`TTD ${selectedHrSigner?.name || 'HR'}`}
                      className="mx-auto mb-2 object-contain"
                      style={{ height: '80px', width: '160px' }}
                    />
                  ) : (
                    <div className="mx-auto mb-2" style={{ height: '80px', width: '160px' }} />
                  )}

                  <p className="font-bold underline">
                    {selectedHrSigner?.name || '_________________________'}
                  </p>
                  <p>{selectedHrSigner?.jobTitle || 'HR & GA Dept. Head'}</p>
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
    </div>
  )
}
