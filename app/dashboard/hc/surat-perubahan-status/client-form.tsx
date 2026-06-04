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
    const contentHtml = document.querySelector('.pdf-wrapper-content')?.innerHTML || ''
    const letterheadUrl = new URL(LETTERHEAD_BACKGROUND_URL, window.location.origin).toString()
    const printWindow = window.open('', '_blank', 'width=900,height=1200')

    if (!printWindow) {
      alert('Mohon izinkan pop-up untuk mencetak surat.')
      return
    }

    const printDocument = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Surat Perubahan Status</title>
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
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
              overflow: hidden;
            }
            .content-area {
              position: absolute;
              top: 48mm;
              left: 20mm;
              right: 20mm;
              bottom: 25mm;
              font-size: 10pt;
              line-height: 1.5;
              color: #000;
              background: transparent;
            }
            @media print {
              .no-print { display: none !important; }
              html, body {
                width: 210mm;
                height: 297mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="content-area">
              ${contentHtml}
            </div>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 500);
            }
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
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex w-full flex-col gap-4 lg:w-[400px] lg:shrink-0">
        <HcWorkspaceBanner
          title="Surat Perubahan Status"
          subtitle="Isi form untuk mencetak Surat Perubahan Status."
        />

        <Card className={hcMutedPanelClassName}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-slate-500">
                Pilih Karyawan
              </Label>
              <Combobox
                value={selectedEmpId}
                onValueChange={(val) => {
                  setSelectedEmpId(val)
                  setEmployeeSearch('')
                }}
                searchValue={employeeSearch}
                onSearchChange={setEmployeeSearch}
                options={visibleEmployeeResults.map((emp) => ({
                  value: emp.id.toString(),
                  label: \`\${emp.name} (\${emp.employeeSn})\`,
                  description: \`\${emp.jobTitle} - \${emp.section}\`,
                }))}
                placeholder="Cari nama atau SN..."
                emptyText="Karyawan tidak ditemukan"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-slate-500">Nomor Surat</Label>
              <Input
                value={noSurat}
                onChange={(e) => setNoSurat(e.target.value)}
                placeholder="000/HR- CHITRA/..."
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-slate-500">Ditetapkan Menjadi</Label>
              
              <div className="space-y-3 mt-2">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Jabatan Baru</Label>
                  <Input 
                    value={jabatanBaru} 
                    onChange={e => setJabatanBaru(e.target.value)} 
                    placeholder="Contoh: Repairman" 
                    className="bg-white text-sm" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Level Baru</Label>
                  <Input 
                    value={levelBaru} 
                    onChange={e => setLevelBaru(e.target.value)} 
                    placeholder="Contoh: Non Staff" 
                    className="bg-white text-sm" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Section Baru</Label>
                  <Input 
                    value={sectionBaru} 
                    onChange={e => setSectionBaru(e.target.value)} 
                    placeholder="Contoh: Repair / Retread Operation" 
                    className="bg-white text-sm" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Status Karyawan Baru</Label>
                  <Input 
                    value={statusKaryawanBaru} 
                    onChange={e => setStatusKaryawanBaru(e.target.value)} 
                    placeholder="Contoh: Kontrak" 
                    className="bg-white text-sm" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200">
              <Label className="text-xs font-semibold uppercase text-slate-500">Lain-lain</Label>
              <div className="space-y-3 mt-2">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Tanggal Berlaku</Label>
                  <Input 
                    value={tanggalBerlaku} 
                    onChange={e => setTanggalBerlaku(e.target.value)} 
                    placeholder="Contoh: 01 Juni 2026" 
                    className="bg-white text-sm" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Tembusan (pisahkan dgn enter)</Label>
                  <Textarea 
                    value={tembusan} 
                    onChange={e => setTembusan(e.target.value)} 
                    placeholder="Contoh: 1. Departemen/Section Terkait." 
                    className="bg-white text-sm min-h-[60px]" 
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
              <Combobox
                value={selectedHrSignerId}
                onValueChange={setSelectedHrSignerId}
                options={hrSigners.map((s) => ({
                  value: s.id.toString(),
                  label: s.name,
                  description: s.jobTitle,
                }))}
                placeholder="Pilih Penandatangan..."
                emptyText="Penandatangan tidak ditemukan"
              />
              
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
                  className={\`text-center text-sm font-medium \${
                    saveMessage.includes('berhasil') ? 'text-emerald-600' : 'text-red-600'
                  }\`}
                >
                  {saveMessage}
                </p>
              )}
            </div>
            
            <p className="text-center text-xs text-slate-400">
              Pastikan Anda mencetak surat terlebih dahulu sebelum menyimpannya ke arsip.
            </p>
          </div>
        </Card>
      </div>

      <Card className="min-h-[800px] flex-1 overflow-hidden rounded-[1rem] bg-[#f8fafc] p-6 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
        <div className="pdf-wrapper-content mx-auto w-full max-w-[800px] bg-white p-12 text-[10pt] text-black shadow-sm font-arial">
          {/* Header/Title */}
          <div className="text-center mb-8">
            <h1 className="font-bold uppercase underline underline-offset-4 text-[12pt] tracking-wider mb-1">
              SURAT KEPUTUSAN
            </h1>
            <p className="font-bold">
              No. {noSurat || '_______/HR- CHITRA/___/____'}
            </p>
            <p className="font-bold mt-4 uppercase">
              TENTANG
            </p>
            <p className="font-bold uppercase mt-1">
              PERUBAHAN STATUS KARYAWAN
            </p>
          </div>

          <table className="w-full mb-6 border-collapse">
            <tbody>
              <tr>
                <td className="w-32 align-top font-bold pb-2">Menimbang</td>
                <td className="w-4 align-top pb-2">:</td>
                <td className="w-6 align-top pb-2">1.</td>
                <td className="align-top pb-2 text-justify">
                  Bahwa dalam rangka memperlancar kegiatan operasional perusahaan, dipandang perlu untuk melakukan perubahan status karyawan.
                </td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td className="align-top pb-2">2.</td>
                <td className="align-top pb-2 text-justify">
                  Bahwa dalam rangka tertib administrasi, maka perubahan status tersebut perlu dituangkan dalam Surat Keputusan Direksi PT. Chitra Paratama.
                </td>
              </tr>

              <tr>
                <td className="align-top font-bold pb-2 pt-2">Mengingat</td>
                <td className="align-top pb-2 pt-2">:</td>
                <td className="align-top pb-2 pt-2">1.</td>
                <td className="align-top pb-2 pt-2">
                  Kebijakan dan Prosedur Promosi / Transfer.
                </td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td className="align-top pb-2">2.</td>
                <td className="align-top pb-2">
                  Struktur Organisasi dan Standard Tenaga Kerja.
                </td>
              </tr>
            </tbody>
          </table>

          <div className="text-center font-bold mb-6 mt-4 uppercase">
            MEMUTUSKAN
          </div>

          <table className="w-full mb-4 border-collapse">
            <tbody>
              <tr>
                <td className="w-32 align-top font-bold pb-4">Menetapkan</td>
                <td className="w-4 align-top pb-4">:</td>
                <td colSpan={2}></td>
              </tr>
              
              {/* PERTAMA */}
              <tr>
                <td className="align-top font-bold">Pertama</td>
                <td className="align-top">:</td>
                <td className="w-40 align-top">Nama</td>
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
                <td className="align-top">Jabatan lama</td>
                <td className="align-top">: {selectedEmp?.jobTitle || '___________________'}</td>
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
                <td className="align-top pb-4">Status Karyawan</td>
                <td className="align-top pb-4">: {selectedEmp?.employeeStatusType || '___________________'}</td>
              </tr>

              {/* DITETAPKAN MENJADI */}
              <tr>
                <td></td>
                <td></td>
                <td colSpan={2} className="align-top pb-4">
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
                <td className="align-top pb-6">Status Karyawan</td>
                <td className="align-top pb-6">: {statusKaryawanBaru || '___________________'}</td>
              </tr>

              {/* KEDUA */}
              <tr>
                <td className="align-top font-bold pb-2">Kedua</td>
                <td className="align-top pb-2">:</td>
                <td colSpan={2} className="align-top pb-2 text-justify">
                  Dalam melaksanakan tugas sehari-hari yang bersangkutan bertanggung jawab kepada <span className="font-bold">Leader {sectionBaru || '___________________'}.</span>
                </td>
              </tr>

              {/* KETIGA */}
              <tr>
                <td className="align-top font-bold pb-2">Ketiga</td>
                <td className="align-top pb-2">:</td>
                <td colSpan={2} className="align-top pb-2 text-justify">
                  Yang bersangkutan diharapkan untuk dapat berkoordinasi dan bekerja sama dengan bagian lainnya agar pelaksanaan pekerjaan dapat berjalan lancar.
                </td>
              </tr>

              {/* KEEMPAT */}
              <tr>
                <td className="align-top font-bold pb-2">Keempat</td>
                <td className="align-top pb-2">:</td>
                <td colSpan={2} className="align-top pb-2 text-justify">
                  Semua surat keputusan yang pernah dikeluarkan sebelum ini dan bertentangan dengan isi surat keputusan ini, dinyatakan tidak berlaku lagi.
                </td>
              </tr>

              {/* KELIMA */}
              <tr>
                <td className="align-top font-bold pb-2">Kelima</td>
                <td className="align-top pb-2">:</td>
                <td colSpan={2} className="align-top pb-2 text-justify">
                  Jika dikemudian hari ternyata terdapat kekeliruan atau perubahan materi dalam Surat Keputusan ini, akan diperbaiki sebagaimana mestinya.
                </td>
              </tr>

              {/* KEENAM */}
              <tr>
                <td className="align-top font-bold pb-6">Keenam</td>
                <td className="align-top pb-6">:</td>
                <td colSpan={2} className="align-top pb-6 text-justify">
                  Surat keputusan ini mulai berlaku pada tanggal <span className="font-bold">{tanggalBerlaku || '___________________'}</span>.
                </td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-start w-full">
            <table className="mb-8">
              <tbody>
                <tr>
                  <td className="w-32 align-top">Ditetapkan di</td>
                  <td className="w-4 align-top">:</td>
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

          <div className="mb-12">
            {selectedSignatureUrl && (
              <div className="mb-2 h-16 opacity-90">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedSignatureUrl}
                  alt="Tanda Tangan HR"
                  className="h-full object-contain"
                />
              </div>
            )}
            {!selectedSignatureUrl && <div className="h-20" />}
            <p className="font-bold underline underline-offset-2">
              {selectedHrSigner?.name || '_____________________'}
            </p>
            <p>{selectedHrSigner?.jobTitle || 'Human Capital Manager'}</p>
          </div>

          <div className="text-[9pt]">
            <p className="font-bold underline mb-1">Salinan dari SK ini disampaikan kepada :</p>
            <div className="whitespace-pre-wrap leading-tight">{tembusan || '1. Departemen/Section Terkait.'}</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
