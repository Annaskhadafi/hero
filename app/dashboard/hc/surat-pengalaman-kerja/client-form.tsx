'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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

export function SuratPengalamanKerjaClient({
  employees,
  hrSigners,
}: {
  employees: EmployeeForLetter[]
  hrSigners: HrSigner[]
}) {
  const formatDateEng = (dateStr: string) => {
    if (!dateStr) return '________________'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr // fallback
    const day = d.getDate()
    const nth = (d) => {
      if (d > 3 && d < 21) return 'th'
      switch (d % 10) {
        case 1:  return 'st'
        case 2:  return 'nd'
        case 3:  return 'rd'
        default: return 'th'
      }
    }
    const dayStr = String(day).padStart(2, '0') + nth(day)
    const monthStr = d.toLocaleDateString('en-GB', { month: 'long' })
    const yearStr = d.getFullYear()
    return `${dayStr} ${monthStr} ${yearStr}`
  }

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
  
  // Custom states
  const [panggilan, setPanggilan] = useState('Mr.')
  const [alasanKeluar, setAlasanKeluar] = useState('contract complete')
  const [tanggalMulai, setTanggalMulai] = useState('')
  const [tanggalSelesai, setTanggalSelesai] = useState('')

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

    getNextLetterNumber('surat_pengalaman_kerja')
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
      alert('Mohon izinkan pop-up untuk mencetak surat.')
      return
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(node => node.outerHTML)
      .join('\n');

    const printDocument = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Surat Pengalaman Kerja</title>
          ${styles}
          <style>
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background-color: white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              font-family: Arial, sans-serif;
            }
            .page-container {
              position: relative;
              width: 210mm;
              min-height: 297mm;
              background-image: url('${letterheadUrl}');
              background-size: 210mm 297mm;
              background-position: center top;
              background-repeat: no-repeat;
              overflow: hidden;
              margin: 0 auto;
            }
            @media print {
              html, body {
                width: 210mm;
                height: 297mm;
              }
            }
          </style>
        </head>
        <body class="bg-white">
          <div class="page-container">
            ${contentHtml}
          </div>
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
    `

    printWindow.document.open()
    printWindow.document.write(printDocument)
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
      const contentData = {
        panggilan: panggilan,
        alasanKeluar: alasanKeluar,
        tanggalMulai: tanggalMulai,
        tanggalSelesai: tanggalSelesai,
      }

      const result = await saveLetter({
        letterType: 'surat_pengalaman_kerja',
        letterNumber: noSurat,
        employeeId: selectedEmp.id,
        employeeName: selectedEmp.name,
        subject: 'Surat Pengalaman Kerja',
        content: JSON.stringify(contentData),
        issuedDate: today,
        issuedPlace: 'Balikpapan',
        signatoryName: selectedHrSigner?.name || '',
        signatoryTitle: selectedHrSigner?.jobTitle || 'HR & GA Dept. Head',
        status: 'published', // Make it auto published like SPST
      })

      if (result.success) {
        setSaveMessage('Surat berhasil disimpan ke arsip.')
        const nextNum = await getNextLetterNumber('surat_pengalaman_kerja')
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
  }, [selectedEmp, noSurat, selectedHrSigner, panggilan, alasanKeluar, tanggalMulai, tanggalSelesai])

  return (
    <div className="space-y-4">
      <HcWorkspaceBanner
        title="Surat Pengalaman Kerja"
        description="Composer untuk menerbitkan Certificate of Employment / Surat Pengalaman Kerja."
        items={[
          { label: 'Karyawan', value: employees.length, tone: 'slate' },
          {
            label: 'Dipilih',
            value: selectedEmp ? 'Siap' : 'Belum',
            tone: selectedEmp ? 'emerald' : 'amber',
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
                className="bg-white"
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

            <div className="space-y-4 border-t border-slate-100 pt-4">
              <Label className="text-xs font-semibold uppercase text-slate-500">Nomor Surat</Label>
              <Input
                value={noSurat}
                onChange={(e) => setNoSurat(e.target.value)}
                placeholder="Contoh: 660 / HR-CHITRA / VI / 2026"
                className="bg-white"
              />
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-4">
              <Label className="text-xs font-semibold uppercase text-slate-500">Detail Surat</Label>
              
              <div className="space-y-4 mt-2">
                <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Panggilan</Label>
                  <select 
                    value={panggilan}
                    onChange={e => setPanggilan(e.target.value)}
                    className="border-input bg-white text-sm h-10 w-full rounded-md border px-3"
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Mrs.">Mrs.</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Tanggal Mulai (Eng)</Label>
                  <Input 
                    type="date"
                    value={tanggalMulai} 
                    onChange={e => setTanggalMulai(e.target.value)} 
                    className="bg-white text-sm h-10" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Tanggal Selesai (Eng)</Label>
                  <Input 
                    type="date"
                    value={tanggalSelesai} 
                    onChange={e => setTanggalSelesai(e.target.value)} 
                    className="bg-white text-sm h-10" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Alasan Keluar (Eng)</Label>
                  <Input 
                    value={alasanKeluar} 
                    onChange={e => setAlasanKeluar(e.target.value)} 
                    placeholder="e.g. contract complete" 
                    className="bg-white text-sm h-10" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Tanggal Surat (Id)</Label>
                  <Input value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="bg-white" />
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-4">
              <Label className="text-xs font-semibold uppercase text-slate-500">Penandatangan</Label>
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

              {selectedHrSigner && (
                <div className="mt-2 text-xs">
                  {selectedSignatureUrl ? (
                    <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="text-slate-600">TTD Tersedia</span>
                      <button
                        onClick={handleSignatureDelete}
                        className="text-red-500 hover:underline font-medium"
                      >
                        Hapus TTD Lokal
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-slate-500">TTD Belum Tersedia.</span>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleSignatureUpload(e.target.files?.[0])}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button onClick={handlePrint} className={`w-full ${hcPrimaryActionClassName}`} variant="secondary">
              <Printer className="mr-2 size-4" />
              Cetak Surat
            </Button>
            
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <Button
                onClick={handleSaveToArchive}
                disabled={saving || !selectedEmp || !noSurat}
                className="w-full bg-[#183d6a] text-white hover:bg-[#183d6a]/90 shadow-sm rounded-xl"
              >
                <Archive className="mr-2 size-4" />
                {saving ? 'Menyimpan...' : 'Simpan ke Arsip'}
              </Button>
              {saveMessage && (
                <p
                  className={`text-center text-sm font-medium ${
                    saveMessage.includes('berhasil') ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {saveMessage}
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="rounded-[1.1rem] bg-slate-100 p-4 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_14px_32px_rgba(15,23,42,0.06)] print:m-0 print:bg-transparent print:p-0 print:shadow-none">
          <div
            className="pdf-wrapper relative mx-auto min-h-[297mm] w-[210mm] max-w-full overflow-hidden bg-white bg-[length:210mm_297mm] bg-top bg-no-repeat shadow-sm print:m-0 print:h-[297mm] print:w-[210mm] print:max-w-none print:shadow-none"
            style={{ backgroundImage: `url('${LETTERHEAD_BACKGROUND_URL}')` }}
          >
            <div
              contentEditable
              suppressContentEditableWarning
              className="pdf-wrapper-content relative z-10 outline-none"
              style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: '11pt',
                lineHeight: '1.8',
                color: 'black',
                paddingTop: '65mm',
                paddingBottom: '30mm',
                paddingLeft: '30mm',
                paddingRight: '30mm',
                minHeight: '297mm',
              }}
            >
              <div className="mb-14 text-center mt-2">
                <h1 className="text-[14pt] font-bold uppercase underline underline-offset-4 tracking-wider mb-1">
                  TO WHOM IT MAY CONCERN
                </h1>
                <p className="font-medium text-[11pt]">
                  No. {noSurat || '_______ / HR-CHITRA / ___ / ____'}
                </p>
              </div>

              <p className="mb-8">This certifies that:</p>

              <div className="text-center mb-10">
                <h2 className="text-[18pt] font-medium" style={{letterSpacing: '0.5px'}}>
                  {panggilan} {selectedEmp?.name || '__________________________'}
                </h2>
              </div>

              <p className="text-justify mb-5" style={{wordSpacing: '1px'}}>
                Has been employed by PT. Chitra Paratama as {selectedEmp ? formatJabatan(selectedEmp.section, selectedEmp.jobTitle) : '_________________'}. During the period of {formatDateEng(tanggalMulai)} through {formatDateEng(tanggalSelesai)}. During his employment, he had performed his duties satisfactorily.
                <br/>
                This certification letter is granted on his leaving our company due to {alasanKeluar || '_________________'}.
              </p>

              <p className="mb-20">
                We wish {panggilan} {selectedEmp?.name || '______________________'} all the best in his future endeavourer.
              </p>

              <div className="mt-12 flex justify-start">
                <div>
                  <p className="mb-1">Balikpapan, {tanggal || '_________________'}</p>
                  
                  {selectedSignatureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedSignatureUrl}
                      alt={`TTD ${selectedHrSigner?.name || 'HR'}`}
                      className="mb-1 object-contain -ml-2"
                      style={{ height: '80px', width: '160px', mixBlendMode: 'multiply' }}
                    />
                  ) : (
                    <div className="mb-2" style={{ height: '80px', width: '160px' }} />
                  )}

                  <p className="font-bold underline underline-offset-2">
                    {selectedHrSigner?.name || '_________________________'}
                  </p>
                  <p>{selectedHrSigner?.jobTitle || 'HR-GA Supervisor'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: '@media print { @page { size: A4; margin: 0; } body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } body * { visibility: hidden; } .pdf-wrapper, .pdf-wrapper * { visibility: visible; } .pdf-wrapper { position: fixed; inset: 0; margin: 0; padding: 0; background-size: 210mm 297mm !important; } }'
        }}
      />
    </div>
  )
}
