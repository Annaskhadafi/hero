'use client'

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import {
  HcWorkspaceBanner,
  hcMutedPanelClassName,
  hcPrimaryActionClassName,
} from '@/components/hc/hc-workspace-banner'
import { getNextLetterNumber, saveHrSignature, saveLetter } from '@/app/actions/surat'
import { formatJabatan } from '@/app/dashboard/hc/surat/utils'
import { Archive, Printer } from 'lucide-react'
import Link from 'next/link'
import { Textarea } from '@/components/ui/textarea'

const LETTERHEAD_BACKGROUND_URL = '/ChitraParatama_Stationery_Letterhead_jkt.jpg'

type EmployeeForLetter = {
  id: number
  name: string
  employeeSn: string
  joinYear: number
  section: string
  jobTitle: string
  levelName: string | null
  employeeStatusType: string | null
}

type HrSigner = {
  id: number
  name: string
  employeeSn: string
  jobTitle: string
  signatureUrl: string
}

export function SuratPerubahanStatusClient({
  employees,
  hrSigners,
}: {
  employees: EmployeeForLetter[]
  hrSigners: HrSigner[]
}) {
  console.log('SPST loaded - v3');
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

  // Custom inputs for Surat Perubahan Status
  const [jabatanBaru, setJabatanBaru] = useState('')
  const [levelBaru, setLevelBaru] = useState('')
  const [sectionBaru, setSectionBaru] = useState('')
  const [statusKaryawanBaru, setStatusKaryawanBaru] = useState('')
  const [atasan, setAtasan] = useState('Leader')
  const [tembusan, setTembusan] = useState('1. Departemen/Section Terkait.')
  const [tanggalBerlaku, setTanggalBerlaku] = useState(() => {
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    nextMonth.setDate(1)
    return nextMonth.toLocaleDateString('id-ID', {
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

    getNextLetterNumber('surat_perubahan_status')
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
          <title>Cetak Surat Perubahan Status</title>
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
              body * {
                visibility: visible !important;
              }
            }
          </style>
        </head>
        <body>
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

  const handleSaveToArchive = async () => {
    if (!selectedEmp || !noSurat) {
      setSaveMessage('Error: Karyawan dan Nomor Surat harus diisi.')
      return
    }

    setSaving(true)
    setSaveMessage('')

    const contentData = {
      jabatanLama: selectedEmp.jobTitle,
      levelLama: selectedEmp.levelName || '-',
      sectionLama: selectedEmp.section,
      statusLama: selectedEmp.employeeStatusType || 'Permanen',
      jabatanBaru: jabatanBaru,
      levelBaru: levelBaru,
      sectionBaru: sectionBaru,
      statusKaryawanBaru: statusKaryawanBaru,
      atasan: atasan,
      tanggalBerlaku: tanggalBerlaku,
      tembusan: tembusan,
    }

    try {
      const result = await saveLetter({
        letterType: 'surat_perubahan_status',
        letterNumber: noSurat,
        employeeId: selectedEmp.id,
        employeeName: selectedEmp.name,
        subject: 'Perubahan Status Karyawan',
        content: JSON.stringify(contentData),
        issuedDate: new Date().toISOString(),
        issuedPlace: 'Balikpapan',
        signatoryName: selectedHrSigner?.name || '',
        signatoryTitle: selectedHrSigner?.jobTitle || '',
        status: 'published',
      })

      if (result.success) {
        setSaveMessage('Surat berhasil disimpan ke arsip.')
        getNextLetterNumber('surat_perubahan_status').then((num) => setNoSurat(num))
      } else {
        setSaveMessage(result.error || 'Gagal menyimpan surat.')
      }
    } catch (err) {
      console.error(err)
      setSaveMessage('Terjadi kesalahan pada sistem.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <HcWorkspaceBanner
        title="Surat Perubahan Status"
        description="Isi form untuk mencetak Surat Perubahan Status."
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
                          setJabatanBaru(emp.jobTitle || '')
                          setLevelBaru(emp.levelName || '')
                          setSectionBaru(emp.section || '')
                          setStatusKaryawanBaru(emp.employeeStatusType || '')
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
                    Karyawan tidak ditemukan
                  </div>
                )}
              </div>
            </div>


            <div className="space-y-4 border-t border-slate-100 pt-4">
              <Label className="text-xs font-semibold uppercase text-slate-500">Nomor Surat</Label>
              <Input
                value={noSurat}
                onChange={(e) => setNoSurat(e.target.value)}
                placeholder="000/HR- CHITRA/..."
                className="bg-white"
              />
            </div>

            <div className="space-y-4">
              <Label className="text-xs font-semibold uppercase text-slate-500">Ditetapkan Menjadi</Label>
              
              <div className="space-y-4 mt-2">
                <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Jabatan Baru</Label>
                  <Input 
                    value={jabatanBaru} 
                    onChange={e => setJabatanBaru(e.target.value)} 
                    placeholder="Contoh: Repairman" 
                    className="bg-white text-sm h-10" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Level Baru</Label>
                  <Input 
                    value={levelBaru} 
                    onChange={e => setLevelBaru(e.target.value)} 
                    placeholder="Contoh: Non Staff" 
                    className="bg-white text-sm h-10" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Section Baru</Label>
                  <Input 
                    value={sectionBaru} 
                    onChange={e => setSectionBaru(e.target.value)} 
                    placeholder="Contoh: Repair / Retread Operation" 
                    className="bg-white text-sm h-10" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Status Karyawan Baru</Label>
                  <Input 
                    value={statusKaryawanBaru} 
                    onChange={e => setStatusKaryawanBaru(e.target.value)} 
                    placeholder="Contoh: Kontrak" 
                    className="bg-white text-sm h-10" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Atasan Langsung</Label>
                  <select 
                    value={atasan}
                    onChange={e => setAtasan(e.target.value)}
                    className="border-input bg-white text-sm h-10 w-full rounded-md border px-3"
                  >
                    <option value="Leader">Leader</option>
                    <option value="Sub Leader">Sub Leader</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Manager">Manager</option>
                    <option value="Group Leader">Group Leader</option>
                    <option value="Site Manager">Site Manager</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-200">
              <Label className="text-xs font-semibold uppercase text-slate-500">Lain-lain</Label>
              <div className="space-y-4 mt-2">
                <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Tanggal Berlaku</Label>
                  <Input 
                    value={tanggalBerlaku} 
                    onChange={e => setTanggalBerlaku(e.target.value)} 
                    placeholder="Contoh: 01 Juni 2026" 
                    className="bg-white text-sm h-10" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Tembusan (pisahkan dgn enter)</Label>
                  <Textarea 
                    value={tembusan} 
                    onChange={e => setTembusan(e.target.value)} 
                    placeholder="Contoh: 1. Departemen/Section Terkait." 
                    className="bg-white text-sm min-h-[80px]" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-2">
              <Label className="text-xs font-semibold uppercase text-slate-500">Tanggal Buat</Label>
              <Input
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-slate-500">Penandatangan</Label>
              <select
                className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
                value={selectedHrSignerId}
                onChange={(e) => setSelectedHrSignerId(e.target.value)}
              >
                <option value="">-- Pilih Penandatangan --</option>
                {hrSigners.map((signer) => (
                  <option key={signer.id} value={signer.id}>
                    {signer.name} ({signer.jobTitle})
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

            <Button onClick={handlePrint} className={hcPrimaryActionClassName} variant="secondary">
              <Printer className="mr-2 size-4" />
              Cetak Surat
            </Button>

            <div className="space-y-2 pt-2">
              <Button
                onClick={handleSaveToArchive}
                disabled={saving || !selectedEmp || !noSurat}
                className="w-full bg-[#183d6a] text-white hover:bg-[#183d6a]/90 shadow-sm"
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
            
            <p className="text-center text-xs text-slate-400">
              Pastikan Anda mencetak surat terlebih dahulu sebelum menyimpannya ke arsip.
            </p>
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
              fontSize: '8.5pt',
              lineHeight: '1.25',
              color: 'black',
              paddingTop: '38mm',
              paddingBottom: '20mm',
              paddingLeft: '22mm',
              paddingRight: '22mm',
              minHeight: '297mm',
            }}
          >
          {/* Header/Title */}
          <div className="text-center mb-4">
            <h1 className="font-bold uppercase underline underline-offset-4 text-[11pt] tracking-wider mb-1">
              SURAT KEPUTUSAN
            </h1>
            <p className="font-bold">
              No. {noSurat || '_______/HR- CHITRA/___/____'}
            </p>
            <p className="font-bold mt-3 uppercase">
              TENTANG
            </p>
            <p className="font-bold uppercase mt-0.5">
              PERUBAHAN STATUS KARYAWAN
            </p>
          </div>

          <table className="w-full mb-3 border-collapse">
            <tbody>
              <tr>
                <td className="w-28 align-top font-bold pb-1">Menimbang</td>
                <td className="w-3 align-top pb-1">:</td>
                <td className="w-5 align-top pb-1">1.</td>
                <td className="align-top pb-1 text-justify">
                  Bahwa dalam rangka memperlancar kegiatan operasional perusahaan, dipandang perlu untuk melakukan perubahan status karyawan.
                </td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td className="align-top pb-1">2.</td>
                <td className="align-top pb-1 text-justify">
                  Bahwa dalam rangka tertib administrasi, maka perubahan status tersebut perlu dituangkan dalam Surat Keputusan Direksi PT. Chitra Paratama.
                </td>
              </tr>

              <tr>
                <td className="align-top font-bold pb-1 pt-1">Mengingat</td>
                <td className="align-top pb-1 pt-1">:</td>
                <td className="align-top pb-1 pt-1">1.</td>
                <td className="align-top pb-1 pt-1">
                  Kebijakan dan Prosedur Promosi / Transfer.
                </td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td className="align-top pb-1">2.</td>
                <td className="align-top pb-1">
                  Struktur Organisasi dan Standard Tenaga Kerja.
                </td>
              </tr>
            </tbody>
          </table>

          <div className="text-center font-bold mb-3 mt-3 uppercase">
            MEMUTUSKAN
          </div>

          <table className="w-full mb-3 border-collapse">
            <tbody>
              <tr>
                <td className="w-28 align-top font-bold pb-2">Menetapkan</td>
                <td className="w-3 align-top pb-2">:</td>
                <td colSpan={2}></td>
              </tr>
              
              {/* PERTAMA */}
              <tr>
                <td className="align-top font-bold">Pertama</td>
                <td className="align-top">:</td>
                <td className="w-32 align-top">Nama</td>
                <td className="align-top">: <span className="font-bold">{selectedEmp?.name || '______________________'}</span></td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td className="align-top">SN</td>
                <td className="align-top">: {selectedEmp?.employeeSn || '___________'}</td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td className="align-top">Jabatan</td>
                <td className="align-top">: {selectedEmp ? formatJabatan(selectedEmp.section, selectedEmp.jobTitle) : '___________________'}</td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td className="align-top">Level</td>
                <td className="align-top">: {selectedEmp?.levelName || '___________________'}</td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td className="align-top">Section</td>
                <td className="align-top">: {selectedEmp?.section || '___________________'}</td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td className="align-top pb-2">Status Karyawan</td>
                <td className="align-top pb-2">: {selectedEmp?.employeeStatusType || '___________________'}</td>
              </tr>

              {/* DITETAPKAN MENJADI */}
              <tr>
                <td></td>
                <td></td>
                <td colSpan={2} className="align-top pb-1">
                  <span className="font-bold underline">Ditetapkan</span> menjadi,
                </td>
              </tr>

              <tr>
                <td></td>
                <td></td>
                <td className="align-top">Jabatan baru</td>
                <td className="align-top">: {jabatanBaru || '___________________'}</td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td className="align-top">Level</td>
                <td className="align-top">: {levelBaru || '___________________'}</td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td className="align-top">Section</td>
                <td className="align-top">: {sectionBaru || '___________________'}</td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td className="align-top pb-3">Status Karyawan</td>
                <td className="align-top pb-3">: {statusKaryawanBaru || '___________________'}</td>
              </tr>

              {/* KEDUA */}
              <tr>
                <td className="align-top font-bold pb-1.5">Kedua</td>
                <td className="align-top pb-1.5">:</td>
                <td colSpan={2} className="align-top pb-1.5 text-justify">
                  Dalam melaksanakan tugas sehari-hari yang bersangkutan bertanggung jawab kepada <span className="font-bold">{atasan || 'Leader'} {sectionBaru || '___________________'}.</span>
                </td>
              </tr>

              {/* KETIGA */}
              <tr>
                <td className="align-top font-bold pb-1.5">Ketiga</td>
                <td className="align-top pb-1.5">:</td>
                <td colSpan={2} className="align-top pb-1.5 text-justify">
                  Yang bersangkutan diharapkan untuk dapat berkoordinasi dan bekerja sama dengan bagian lainnya agar pelaksanaan pekerjaan dapat berjalan lancar.
                </td>
              </tr>

              {/* KEEMPAT */}
              <tr>
                <td className="align-top font-bold pb-1.5">Keempat</td>
                <td className="align-top pb-1.5">:</td>
                <td colSpan={2} className="align-top pb-1.5 text-justify">
                  Semua surat keputusan yang pernah dikeluarkan sebelum ini dan bertentangan dengan isi surat keputusan ini, dinyatakan tidak berlaku lagi.
                </td>
              </tr>

              {/* KELIMA */}
              <tr>
                <td className="align-top font-bold pb-1.5">Kelima</td>
                <td className="align-top pb-1.5">:</td>
                <td colSpan={2} className="align-top pb-1.5 text-justify">
                  Jika dikemudian hari ternyata terdapat kekeliruan atau perubahan materi dalam Surat Keputusan ini, akan diperbaiki sebagaimana mestinya.
                </td>
              </tr>

              {/* KEENAM */}
              <tr>
                <td className="align-top font-bold pb-3">Keenam</td>
                <td className="align-top pb-3">:</td>
                <td colSpan={2} className="align-top pb-3 text-justify">
                  Surat keputusan ini mulai berlaku pada tanggal <span className="font-bold">{tanggalBerlaku || '___________________'}</span>.
                </td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-start w-full">
            <table className="mb-4">
              <tbody>
                <tr>
                  <td className="w-28 align-top">Ditetapkan di</td>
                  <td className="w-3 align-top">:</td>
                  <td className="align-top">Balikpapan</td>
                </tr>
                <tr>
                  <td className="align-top">Pada Tanggal</td>
                  <td className="align-top">:</td>
                  <td className="align-top">{tanggal || '_________________'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mb-4">
            {selectedSignatureUrl && (
              <div className="mb-1 h-14 opacity-90">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedSignatureUrl}
                  alt="Tanda Tangan HR"
                  className="h-full object-contain"
                />
              </div>
            )}
            {!selectedSignatureUrl && <div className="h-14" />}
            <p className="font-bold underline underline-offset-2">
              {selectedHrSigner?.name || '_____________________'}
            </p>
            <p>{selectedHrSigner?.jobTitle || 'Human Capital Manager'}</p>
          </div>

          <div className="text-[8pt]">
            <p className="font-bold underline mb-0.5">Salinan dari SK ini disampaikan kepada :</p>
            <div className="whitespace-pre-wrap leading-tight">{tembusan || '1. Departemen/Section Terkait.'}</div>
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
// trigger rebuild

