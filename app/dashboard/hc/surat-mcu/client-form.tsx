'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import { AdminPageShell } from '@/components/admin-page-shell'
import {
  HcWorkspaceBanner,
  hcMutedPanelClassName,
  hcPrimaryActionClassName,
} from '@/components/hc/hc-workspace-banner'
import { getNextLetterNumber, saveLetter } from '@/app/actions/surat'
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

export function SuratMcuClient({
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

  // Custom inputs for Surat MCU
  const [klinik, setKlinik] = useState('')
  const [kota, setKota] = useState('')
  const [paketMcu, setPaketMcu] = useState('')

  const [klinikHistory, setKlinikHistory] = useState<string[]>([])
  const [kotaHistory, setKotaHistory] = useState<string[]>([])
  const [paketHistory, setPaketHistory] = useState<string[]>([])

  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const letterNumberFetched = useRef(false)

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
  const selectedHrSigner = hrSigners.find((signer) => signer.id.toString() === selectedHrSignerId)
  const selectedSignatureUrl = selectedHrSigner
    ? uploadedSignatures[selectedHrSigner.name] || selectedHrSigner.signatureUrl
    : ''

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('hero-hr-signatures')
      if (raw) setUploadedSignatures(JSON.parse(raw) as Record<string, string>)
      
      const k = window.localStorage.getItem('hero-mcu-klinik')
      if (k) setKlinikHistory(JSON.parse(k))
      const t = window.localStorage.getItem('hero-mcu-kota')
      if (t) setKotaHistory(JSON.parse(t))
      const p = window.localStorage.getItem('hero-mcu-paket')
      if (p) setPaketHistory(JSON.parse(p))
    } catch (error) {
      console.error('Failed to load local storage data:', error)
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

    getNextLetterNumber('surat_mcu')
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
          <title>Surat Pengantar MCU</title>
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
            .mb-12 { margin-bottom: 3rem; }
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
            .pic-list { margin-top: 3rem; font-size: 8pt; font-style: italic; }
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

  const saveToHistory = (key: string, value: string, history: string[], setHistory: (v: string[]) => void) => {
    if (!value) return
    const newHistory = Array.from(new Set([value, ...history])).slice(0, 20)
    setHistory(newHistory)
    window.localStorage.setItem(key, JSON.stringify(newHistory))
  }

  const handleSaveToArchive = useCallback(async () => {
    if (!selectedEmp) {
      setSaveMessage('Pilih karyawan terlebih dahulu.')
      return
    }

    setSaving(true)
    setSaveMessage('')

    saveToHistory('hero-mcu-klinik', klinik, klinikHistory, setKlinikHistory)
    saveToHistory('hero-mcu-kota', kota, kotaHistory, setKotaHistory)
    saveToHistory('hero-mcu-paket', paketMcu, paketHistory, setPaketHistory)

    try {
      const today = new Date().toISOString().split('T')[0]
      const contentHtml = document.querySelector('.pdf-wrapper')?.innerHTML || ''

      const result = await saveLetter({
        letterType: 'surat_mcu',
        letterNumber: noSurat,
        employeeId: selectedEmp.id,
        employeeName: selectedEmp.name,
        subject: 'Surat Pengantar Medical Check Up Karyawan',
        content: contentHtml,
        destination: klinik,
        purpose: paketMcu,
        issuedDate: today,
        issuedPlace: 'Balikpapan',
        signatoryName: selectedHrSigner?.name || '',
        signatoryTitle: selectedHrSigner?.jobTitle || 'HR-GA Admin',
        status: 'draft',
      })

      if (result.success) {
        setSaveMessage('Surat berhasil disimpan ke arsip.')
        // Refresh letter number for next use
        const nextNum = await getNextLetterNumber('surat_mcu')
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
  }, [selectedEmp, noSurat, klinik, kota, paketMcu, klinikHistory, kotaHistory, paketHistory])

  return (
    <div className="space-y-4">
      <HcWorkspaceBanner
        title="Surat Pengantar MCU"
        description="Formulir pembuatan Surat Pengantar Medical Check Up Karyawan."
        items={[
          { label: 'Karyawan', value: employees.length, tone: 'slate' },
          {
            label: 'Dipilih',
            value: selectedEmp ? 'Siap' : 'Belum',
            tone: selectedEmp ? 'emerald' : 'amber',
          },
          {
            label: 'Klinik',
            value: klinik ? 'Terisi' : 'Kosong',
            tone: klinik ? 'sky' : 'amber',
          },
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
                placeholder="Ketik nama, NIK, jabatan, section..."
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
                placeholder="Contoh: 001/HR-CPBPN/VI/2026"
              />
            </div>
            <div>
              <Label className="mb-2 block">Tanggal Surat</Label>
              <Input value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <div className="mt-2 border-t pt-4">
              <h4 className="mb-3 text-sm font-semibold">Detail MCU</h4>
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Klinik</Label>
                  <Combobox
                    value={klinik}
                    onChange={setKlinik}
                    options={klinikHistory}
                    placeholder="Contoh: Klinik Pramita"
                    allowCustom={true}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Kota</Label>
                  <Combobox
                    value={kota}
                    onChange={setKota}
                    options={kotaHistory}
                    placeholder="Contoh: Balikpapan"
                    allowCustom={true}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Paket MCU</Label>
                  <Combobox
                    value={paketMcu}
                    onChange={setPaketMcu}
                    options={paketHistory}
                    placeholder="Contoh: Paket Executive"
                    allowCustom={true}
                  />
                </div>
              </div>
            </div>
            <div className="mt-2 border-t pt-4">
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
                paddingTop: '45mm',
                paddingBottom: '20mm',
                paddingLeft: '22mm',
                paddingRight: '22mm',
                minHeight: '297mm',
              }}
            >
              <table className="mb-3 w-full">
                <tbody>
                  <tr>
                    <td className="w-32 align-top">No</td>
                    <td className="w-4 align-top">:</td>
                    <td className="align-top">{noSurat || '______________________'}</td>
                  </tr>
                  <tr>
                    <td className="w-32 align-top">Perihal</td>
                    <td className="w-4 align-top">:</td>
                    <td className="align-top">Surat Pengantar Medical Check Up Karyawan</td>
                  </tr>
                </tbody>
              </table>

              <div className="mb-3">
                <p>Kepada Yth.</p>
                <p className="font-bold">{klinik || '______________________'}</p>
                <p className="font-bold">{kota || '______________________'}</p>
              </div>

              <p className="mb-2">Dengan Hormat,</p>

              <p className="mb-2">Kami memberitahukan bahwa nama dibawah ini adalah karyawan dari kami :</p>

              <table className="mb-3 ml-6 w-full">
                <tbody>
                  <tr>
                    <td className="w-40 pb-1">Nama</td>
                    <td className="w-4 pb-1">:</td>
                    <td className="font-bold pb-1">{selectedEmp?.name || '______________________'}</td>
                  </tr>
                  <tr>
                    <td className="pb-1">SN</td>
                    <td className="pb-1">:</td>
                    <td className="font-bold pb-1">{selectedEmp?.employeeSn || '______________________'}</td>
                  </tr>
                  <tr>
                    <td className="pb-1">Section</td>
                    <td className="pb-1">:</td>
                    <td className="font-bold pb-1">{selectedEmp?.section || '______________________'}</td>
                  </tr>
                  <tr>
                    <td className="pb-1">Paket MCU</td>
                    <td className="pb-1">:</td>
                    <td className="font-bold pb-1">{paketMcu || '______________________'}</td>
                  </tr>
                </tbody>
              </table>

              <p className="mb-3 text-justify">
                Kami mohon bantuannya untuk melakukan <span className="font-bold underline">Medical Check Up</span> atas nama pasien diatas. Segala biaya yang timbul menjadi tanggungan PT Chitra Paratama (a Member of Mahadasha Group) dengan melampirkan Surat Jaminan ini.
              </p>

              <div className="mb-3">
                <p>Mohon tagihan dikirimkan kepada:</p>
                <p className="font-bold">PT Chitra Paratama (a Member of Mahadasha Group)</p>
                <p className="font-bold">Jl AMD RT 46 No 69 Kelurahan Graha Indah, Balikpapan.</p>
                <p className="font-bold">Attn : Muhammad Iqbal</p>
              </div>

              <p className="mb-4">Atas kerja sama yang baik kami ucapkan terima kasih.</p>

              <div className="mt-4 flex justify-start">
                <div>
                  <p className="mb-1">Balikpapan , {tanggal || '_________________'}</p>
                  {selectedSignatureUrl ? (
                    <img
                      src={selectedSignatureUrl}
                      alt={`TTD ${selectedHrSigner?.name || 'HR'}`}
                      className="mb-1 object-contain"
                      style={{ height: '60px', width: '160px', objectPosition: 'left' }}
                    />
                  ) : (
                    <div className="mb-1" style={{ height: '60px', width: '160px' }} />
                  )}
                  
                  <p className="font-bold underline">
                    {selectedHrSigner?.name || '_________________________'}
                  </p>
                  <p className="font-bold">{selectedHrSigner?.jobTitle || 'HR-GA Admin'}</p>
                </div>
              </div>

              <div className="mt-4 text-[8pt] italic">
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="w-12 align-top italic">PIC</td>
                      <td className="w-4 align-top italic">:</td>
                      <td className="w-4 align-top italic">-</td>
                      <td className="align-top italic">Muhammad Iqbal : 0812-53369994</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td></td>
                      <td className="align-top italic">-</td>
                      <td className="align-top italic">Adila Tri Arizona : 0897-9767997</td>
                    </tr>
                    <tr>
                      <td></td>
                      <td></td>
                      <td className="align-top italic">-</td>
                      <td className="align-top italic">Kesuma Bagaskara : 0896-86176545</td>
                    </tr>
                  </tbody>
                </table>
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
