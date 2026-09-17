'use client'

import {
  Check,
  CheckSquare,
  Download,
  Eraser,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MinimalTableShell } from '@/components/ui/minimal-table-shell'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { getDepartments, getEmployees, getSites } from '@/app/dashboard/360-service/service-form/actions'

export type CheckStatusVX = 'V' | 'X' | ''

// ==========================================
// 1. Form Kesiapan Bekerja Types & Defaults
// ==========================================
export type KesiapanBekerjaRow = {
  no: number
  name: string
  sn: string
  konsumsiObat: CheckStatusVX
  jamTidurMulai: string
  jamTidurBangun: string
  siapKerja: CheckStatusVX
  paraf: string
  verifikasiPengawas: CheckStatusVX
}

export type KesiapanBekerjaHeader = {
  docNo: string
  tglBerlaku: string
  departemen: string
  lokasi: string
  pembahasan: string
  tanggal: string
  shift: string
}

export type KesiapanBekerjaDraft = {
  header: KesiapanBekerjaHeader
  rows: KesiapanBekerjaRow[]
}

export type KesiapanBekerjaRecord = KesiapanBekerjaDraft & {
  id: string
  createdAt: string
  updatedAt: string
}

// ==========================================
// 2. Form Daftar Hadir Sosialisasi Types & Defaults
// ==========================================
export type DaftarHadirRow = {
  no: number
  name: string
  sn: string
  keterangan: string
}

export type DaftarHadirHeader = {
  departemen: string
  lokasi: string
  tanggal: string
  shift: string
}

export type DaftarHadirDraft = {
  header: DaftarHadirHeader
  rows: DaftarHadirRow[]
}

export type DaftarHadirRecord = DaftarHadirDraft & {
  id: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY_KB = 'hero-service-form-kesiapan-bekerja-history'
const STORAGE_KEY_DH = 'hero-service-form-daftar-hadir-history'
const CB_PREFIX = 'hero-sh-combobox'
const TOTAL_PDF_ROWS = 28

function emptyKbRow(no: number): KesiapanBekerjaRow {
  return {
    no,
    name: '',
    sn: '',
    konsumsiObat: '',
    jamTidurMulai: '',
    jamTidurBangun: '',
    siapKerja: '',
    paraf: '',
    verifikasiPengawas: '',
  }
}

function defaultKbRows(): KesiapanBekerjaRow[] {
  return Array.from({ length: TOTAL_PDF_ROWS }, (_, i) => emptyKbRow(i + 1))
}

function defaultKbDraft(): KesiapanBekerjaDraft {
  return {
    header: {
      docNo: '',
      tglBerlaku: '',
      departemen: '',
      lokasi: '',
      pembahasan: '',
      tanggal: new Date().toISOString().slice(0, 10),
      shift: 'Pagi',
    },
    rows: defaultKbRows(),
  }
}

function emptyDhRow(no: number): DaftarHadirRow {
  return {
    no,
    name: '',
    sn: '',
    keterangan: '',
  }
}

function defaultDhRows(): DaftarHadirRow[] {
  return Array.from({ length: TOTAL_PDF_ROWS }, (_, i) => emptyDhRow(i + 1))
}

function defaultDhDraft(): DaftarHadirDraft {
  return {
    header: {
      departemen: '',
      lokasi: '',
      tanggal: new Date().toISOString().slice(0, 10),
      shift: 'Pagi',
    },
    rows: defaultDhRows(),
  }
}

function loadCbOptions(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(`${CB_PREFIX}-${key}`) || '[]')
  } catch {
    return []
  }
}

function saveCbOption(key: string, value: string) {
  if (!value.trim()) return
  const existing = loadCbOptions(key)
  if (existing.includes(value)) return
  localStorage.setItem(`${CB_PREFIX}-${key}`, JSON.stringify([...existing, value]))
}

function formatPublishDate(d?: string): string {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length === 3) {
    const [year, month, day] = parts
    return `${parseInt(day, 10)}-${parseInt(month, 10)}-${year.slice(-2)}`
  }
  return d
}

function formatDateDisplay(d?: string): string {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length === 3) {
    const [year, month, day] = parts
    return `${day}/${month}/${year}`
  }
  return d
}

function formatDateTime(iso: string) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// Chitra Paratama Logo
function CpLogo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn('flex items-center justify-center', className)} style={style}>
      <img
        src="/brand/Chitra-Paratama.png"
        alt="Chitra Paratama Logo"
        style={{ maxHeight: '14mm', maxWidth: '35mm', objectFit: 'contain' }}
      />
    </div>
  )
}

// Cipta Kridatama (CK) Logo
function CkLogo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn('flex items-center justify-center', className)} style={style}>
      <img
        src="/brand/cipta-kridatama-logo.png"
        alt="Cipta Kridatama Logo"
        style={{ maxHeight: '14mm', maxWidth: '35mm', objectFit: 'contain' }}
      />
    </div>
  )
}

// ==========================================
// PDF Template: Form Kesiapan Bekerja
// ==========================================
function PdfPageKesiapanBekerja({
  payload,
  pageRef,
}: {
  payload: KesiapanBekerjaDraft
  pageRef: React.RefObject<HTMLDivElement | null>
}) {
  const { header, rows } = payload

  const printRows: KesiapanBekerjaRow[] = Array.from({ length: TOTAL_PDF_ROWS }, (_, i) => {
    return rows[i] || emptyKbRow(i + 1)
  })

  return (
    <div
      ref={pageRef}
      style={{
        width: '210mm',
        height: '297mm',
        minHeight: '297mm',
        maxHeight: '297mm',
        padding: '7mm 8mm',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          border: '1px solid #000000',
          width: '100%',
          height: '281mm',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        {/* Top Header Block */}
        <div style={{ display: 'flex', borderBottom: '1px solid #000000', height: '14mm', boxSizing: 'border-box' }}>
          <div
            style={{
              width: '42mm',
              borderRight: '1px solid #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5mm 2mm',
              boxSizing: 'border-box',
            }}
          >
            <CpLogo />
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5mm 2mm',
              boxSizing: 'border-box',
            }}
          >
            <h1
              style={{
                fontSize: '13pt',
                fontWeight: 'bold',
                letterSpacing: '0.8px',
                margin: 0,
                textAlign: 'center',
                color: '#000000',
              }}
            >
              FORM KESIAPAN BEKERJA
            </h1>
          </div>
        </div>

        {/* Sub Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1mm 2.5mm',
            borderBottom: '1px solid #000000',
            fontSize: '7pt',
            fontWeight: 'bold',
            color: '#000000',
            backgroundColor: '#ffffff',
            height: '6.5mm',
            boxSizing: 'border-box',
          }}
        >
          <div>No : {header.docNo || ''}</div>
          <div>Tgl. Berlaku : {formatPublishDate(header.tglBerlaku)}</div>
        </div>

        {/* Metadata Section */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '1.2mm 2.5mm',
            fontSize: '7pt',
            fontWeight: 'bold',
            color: '#000000',
            borderBottom: '1px solid #000000',
            height: '14mm',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ width: '60%' }}>
            <div style={{ display: 'flex', marginBottom: '0.6mm' }}>
              <span style={{ width: '22mm' }}>Departemen</span>
              <span>: {header.departemen || ''}</span>
            </div>
            <div style={{ display: 'flex', marginBottom: '0.6mm' }}>
              <span style={{ width: '22mm' }}>Lokasi</span>
              <span>: {header.lokasi || ''}</span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ width: '22mm' }}>Pembahasan</span>
              <span>: {header.pembahasan || ''}</span>
            </div>
          </div>

          <div style={{ width: '35%' }}>
            <div style={{ display: 'flex', marginBottom: '0.6mm' }}>
              <span style={{ width: '18mm' }}>Tanggal</span>
              <span>: {formatDateDisplay(header.tanggal)}</span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ width: '18mm' }}>Shift</span>
              <span>: {header.shift || ''}</span>
            </div>
          </div>
        </div>

        {/* Main Table */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '6.5pt',
            color: '#000000',
            tableLayout: 'fixed',
            boxSizing: 'border-box',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#ffffff', textAlign: 'center', fontWeight: 'bold', height: '10.5mm' }}>
              <th style={{ borderRight: '0.6px solid #000000', borderBottom: '1px solid #000000', width: '7mm', padding: '1px', verticalAlign: 'middle', fontSize: '6.5pt' }}>
                NO
              </th>
              <th style={{ borderRight: '0.6px solid #000000', borderBottom: '1px solid #000000', width: '52mm', padding: '1px 3px', textAlign: 'center', verticalAlign: 'middle', fontSize: '6.5pt' }}>
                Nama
              </th>
              <th style={{ borderRight: '0.6px solid #000000', borderBottom: '1px solid #000000', width: '18mm', padding: '1px', verticalAlign: 'middle', fontSize: '6.5pt' }}>
                SN
              </th>
              <th style={{ borderRight: '0.6px solid #000000', borderBottom: '1px solid #000000', width: '22mm', padding: '1px', verticalAlign: 'middle' }}>
                <div style={{ fontSize: '5pt', borderBottom: '0.5px solid #000000', paddingBottom: '0.4mm', marginBottom: '0.4mm' }}>
                  Kesiapan Bekerja
                </div>
                <div style={{ fontSize: '5.2pt', lineHeight: 1.1 }}>
                  Konsumsi Obat<br />Flu/Alergi (V/X)
                </div>
              </th>
              <th style={{ borderRight: '0.6px solid #000000', borderBottom: '1px solid #000000', width: '15mm', padding: '1px', verticalAlign: 'middle' }}>
                <div style={{ fontSize: '5pt', borderBottom: '0.5px solid #000000', paddingBottom: '0.4mm', marginBottom: '0.4mm' }}>
                  Kesiapan Bekerja
                </div>
                <div style={{ fontSize: '5.2pt', lineHeight: 1.1 }}>
                  Jam Tidur<br />Mulai
                </div>
              </th>
              <th style={{ borderRight: '0.6px solid #000000', borderBottom: '1px solid #000000', width: '15mm', padding: '1px', verticalAlign: 'middle' }}>
                <div style={{ fontSize: '5pt', borderBottom: '0.5px solid #000000', paddingBottom: '0.4mm', marginBottom: '0.4mm' }}>
                  Kesiapan Bekerja
                </div>
                <div style={{ fontSize: '5.2pt', lineHeight: 1.1 }}>
                  Jam Tidur<br />Bangun
                </div>
              </th>
              <th style={{ borderRight: '0.6px solid #000000', borderBottom: '1px solid #000000', width: '16mm', padding: '1px', verticalAlign: 'middle' }}>
                <div style={{ fontSize: '5pt', borderBottom: '0.5px solid #000000', paddingBottom: '0.4mm', marginBottom: '0.4mm' }}>
                  Kesiapan Bekerja
                </div>
                <div style={{ fontSize: '5.2pt', lineHeight: 1.1 }}>
                  Siap Kerja<br />(V/X)
                </div>
              </th>
              <th style={{ borderRight: '0.6px solid #000000', borderBottom: '1px solid #000000', width: '20mm', padding: '1px', verticalAlign: 'middle', fontSize: '6.5pt' }}>
                Paraf
              </th>
              <th style={{ borderBottom: '1px solid #000000', width: '25mm', padding: '1px', lineHeight: 1.1, fontSize: '5.5pt', verticalAlign: 'middle' }}>
                Verifikasi<br />Pengawas<br />(V/X)
              </th>
            </tr>
          </thead>
          <tbody>
            {printRows.map((r, idx) => {
              const isLast = idx === 27
              return (
                <tr key={idx} style={{ height: '8.35mm', backgroundColor: '#ffffff', boxSizing: 'border-box' }}>
                  <td style={{ borderRight: '0.6px solid #000000', borderBottom: isLast ? 'none' : '0.6px solid #000000', textAlign: 'center', fontWeight: 'bold', fontSize: '6.5pt', padding: '1px' }}>
                    {idx + 1}
                  </td>
                  <td style={{ borderRight: '0.6px solid #000000', borderBottom: isLast ? 'none' : '0.6px solid #000000', padding: '1px 3px', fontSize: '6.5pt', fontWeight: r.name ? 'bold' : 'normal', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {r.name}
                  </td>
                  <td style={{ borderRight: '0.6px solid #000000', borderBottom: isLast ? 'none' : '0.6px solid #000000', textAlign: 'center', fontSize: '6.5pt', padding: '1px' }}>
                    {r.sn}
                  </td>
                  <td style={{ borderRight: '0.6px solid #000000', borderBottom: isLast ? 'none' : '0.6px solid #000000', textAlign: 'center', fontSize: '7pt', fontWeight: 'bold', padding: '1px', color: r.konsumsiObat === 'V' ? '#16a34a' : r.konsumsiObat === 'X' ? '#dc2626' : '#000000' }}>
                    {r.konsumsiObat}
                  </td>
                  <td style={{ borderRight: '0.6px solid #000000', borderBottom: isLast ? 'none' : '0.6px solid #000000', textAlign: 'center', fontSize: '6pt', padding: '1px' }}>
                    {r.jamTidurMulai}
                  </td>
                  <td style={{ borderRight: '0.6px solid #000000', borderBottom: isLast ? 'none' : '0.6px solid #000000', textAlign: 'center', fontSize: '6pt', padding: '1px' }}>
                    {r.jamTidurBangun}
                  </td>
                  <td style={{ borderRight: '0.6px solid #000000', borderBottom: isLast ? 'none' : '0.6px solid #000000', textAlign: 'center', fontSize: '7pt', fontWeight: 'bold', padding: '1px', color: r.siapKerja === 'V' ? '#16a34a' : r.siapKerja === 'X' ? '#dc2626' : '#000000' }}>
                    {r.siapKerja}
                  </td>
                  <td style={{ borderRight: '0.6px solid #000000', borderBottom: isLast ? 'none' : '0.6px solid #000000', textAlign: 'center', padding: '0.5mm', verticalAlign: 'middle' }}>
                    {r.paraf ? (
                      <img src={r.paraf} alt="Paraf" style={{ maxHeight: '6.5mm', maxWidth: '16mm', objectFit: 'contain' }} />
                    ) : (
                      ''
                    )}
                  </td>
                  <td style={{ borderBottom: isLast ? 'none' : '0.6px solid #000000', textAlign: 'center', fontSize: '7pt', fontWeight: 'bold', padding: '1px', color: r.verifikasiPengawas === 'V' ? '#16a34a' : r.verifikasiPengawas === 'X' ? '#dc2626' : '#000000' }}>
                    {r.verifikasiPengawas}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ==========================================
// PDF Template: Form Daftar Hadir Sosialisasi
// ==========================================
function PdfPageDaftarHadir({
  payload,
  pageRef,
}: {
  payload: DaftarHadirDraft
  pageRef: React.RefObject<HTMLDivElement | null>
}) {
  const { header, rows } = payload

  const printRows: DaftarHadirRow[] = Array.from({ length: TOTAL_PDF_ROWS }, (_, i) => {
    return rows[i] || emptyDhRow(i + 1)
  })

  return (
    <div
      ref={pageRef}
      style={{
        width: '210mm',
        height: '297mm',
        minHeight: '297mm',
        maxHeight: '297mm',
        padding: '8mm 8mm',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          border: '1px solid #000000',
          width: '100%',
          height: '281mm',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        {/* Top Header Block */}
        <div style={{ display: 'flex', borderBottom: '1px solid #000000', height: '15mm', boxSizing: 'border-box' }}>
          <div
            style={{
              width: '42mm',
              borderRight: '1px solid #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1mm 2mm',
              boxSizing: 'border-box',
            }}
          >
            <CkLogo />
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1mm 2mm',
              boxSizing: 'border-box',
            }}
          >
            <h1
              style={{
                fontSize: '13pt',
                fontWeight: 'bold',
                letterSpacing: '0.8px',
                margin: 0,
                textAlign: 'center',
                color: '#000000',
              }}
            >
              DAFTAR HADIR SOSIALISASI
            </h1>
          </div>
        </div>

        {/* Metadata Section */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '2mm 3mm',
            fontSize: '7.5pt',
            fontWeight: 'bold',
            color: '#000000',
            borderBottom: '1px solid #000000',
            height: '13mm',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ width: '55%' }}>
            <div style={{ display: 'flex', marginBottom: '1mm' }}>
              <span style={{ width: '25mm' }}>Departemen</span>
              <span>: {header.departemen || ''}</span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ width: '25mm' }}>Lokasi</span>
              <span>: {header.lokasi || ''}</span>
            </div>
          </div>

          <div style={{ width: '40%' }}>
            <div style={{ display: 'flex', marginBottom: '1mm' }}>
              <span style={{ width: '20mm' }}>Tanggal</span>
              <span>: {formatDateDisplay(header.tanggal)}</span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ width: '20mm' }}>Shift</span>
              <span>: {header.shift || ''}</span>
            </div>
          </div>
        </div>

        {/* Main Table (28 Rows) */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '7.5pt',
            color: '#000000',
            tableLayout: 'fixed',
            boxSizing: 'border-box',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#ffffff', textAlign: 'center', fontWeight: 'bold', height: '6.5mm' }}>
              <th
                style={{
                  borderRight: '0.6px solid #000000',
                  borderBottom: '1px solid #000000',
                  width: '10mm',
                  padding: '1px',
                  verticalAlign: 'middle',
                }}
              >
                NO
              </th>
              <th
                style={{
                  borderRight: '0.6px solid #000000',
                  borderBottom: '1px solid #000000',
                  width: '80mm',
                  padding: '1px 4px',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                }}
              >
                Nama
              </th>
              <th
                style={{
                  borderRight: '0.6px solid #000000',
                  borderBottom: '1px solid #000000',
                  width: '45mm',
                  padding: '1px',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                }}
              >
                SN
              </th>
              <th
                style={{
                  borderBottom: '1px solid #000000',
                  padding: '1px 4px',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                }}
              >
                KETERANGAN
              </th>
            </tr>
          </thead>
          <tbody>
            {printRows.map((r, idx) => {
              const isLast = idx === 27
              return (
                <tr key={idx} style={{ height: '8.75mm', backgroundColor: '#ffffff', boxSizing: 'border-box' }}>
                  <td
                    style={{
                      borderRight: '0.6px solid #000000',
                      borderBottom: isLast ? 'none' : '0.6px solid #000000',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontSize: '7.5pt',
                      padding: '1px',
                    }}
                  >
                    {idx + 1}
                  </td>
                  <td
                    style={{
                      borderRight: '0.6px solid #000000',
                      borderBottom: isLast ? 'none' : '0.6px solid #000000',
                      padding: '1px 4px',
                      fontSize: '7.5pt',
                      fontWeight: r.name ? 'bold' : 'normal',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {r.name}
                  </td>
                  <td
                    style={{
                      borderRight: '0.6px solid #000000',
                      borderBottom: isLast ? 'none' : '0.6px solid #000000',
                      textAlign: 'center',
                      fontSize: '7.5pt',
                      padding: '1px',
                    }}
                  >
                    {r.sn}
                  </td>
                  <td
                    style={{
                      borderBottom: isLast ? 'none' : '0.6px solid #000000',
                      padding: '1px 4px',
                      fontSize: '7pt',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {r.keterangan}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const DEFAULT_DEPARTMENT_OPTIONS = [
  'Operation',
  'Plant Maintenance',
  'Plant Tyre',
  'SHE / HSE',
  'Human Capital',
  'Engineering',
  'Logistics / Warehouse',
  'Finance & Accounting',
  'External Relations',
  'General Affairs',
]

export function SiapHadirForm({ mobile = false }: { mobile?: boolean }) {
  const [activeSubTab, setActiveSubTab] = useState<'kesiapan-bekerja' | 'daftar-hadir'>('kesiapan-bekerja')

  // Employees & Sites state
  const [employeesList, setEmployeesList] = useState<{ id: number; name: string; employeeSn: string }[]>([])
  const [operatorOptions, setOperatorOptions] = useState<string[]>([])
  const [siteOptions, setSiteOptions] = useState<string[]>([])
  const [departmentOptions, setDepartmentOptions] = useState<string[]>(DEFAULT_DEPARTMENT_OPTIONS)

  // ==========================================
  // Form 1: Kesiapan Bekerja State
  // ==========================================
  const [kbDraft, setKbDraft] = useState<KesiapanBekerjaDraft>(defaultKbDraft())
  const [kbRecords, setKbRecords] = useState<KesiapanBekerjaRecord[]>([])
  const [kbEditingId, setKbEditingId] = useState<string | null>(null)
  const [isKbGenerating, setIsKbGenerating] = useState(false)
  const [kbPdfPayload, setKbPdfPayload] = useState<KesiapanBekerjaDraft>(defaultKbDraft())
  const kbPdfRef = useRef<HTMLDivElement>(null)

  // Signature canvas modal state
  const [sigModalRowIndex, setSigModalRowIndex] = useState<number | null>(null)
  const sigCanvasRef = useRef<SignatureCanvas | null>(null)

  // ==========================================
  // Form 2: Daftar Hadir Sosialisasi State
  // ==========================================
  const [dhDraft, setDhDraft] = useState<DaftarHadirDraft>(defaultDhDraft())
  const [dhRecords, setDhRecords] = useState<DaftarHadirRecord[]>([])
  const [dhEditingId, setDhEditingId] = useState<string | null>(null)
  const [isDhGenerating, setIsDhGenerating] = useState(false)
  const [dhPdfPayload, setDhPdfPayload] = useState<DaftarHadirDraft>(defaultDhDraft())
  const dhPdfRef = useRef<HTMLDivElement>(null)

  // Fetch employees
  useEffect(() => {
    let active = true
    getEmployees().then((res) => {
      if (!active || !res.success) return
      setEmployeesList(res.data)
      const dbNames = res.data.map((e) => e.name)
      const localNames = loadCbOptions('employee-name')
      const merged = Array.from(new Set([...dbNames, ...localNames])).filter(Boolean)
      setOperatorOptions(merged)
    })
    return () => {
      active = false
    }
  }, [])

  // Fetch departments
  useEffect(() => {
    let active = true
    getDepartments().then((res) => {
      if (!active || !res.success) return
      const dbNames = res.data.map((d) => d.name)
      const merged = Array.from(new Set([...dbNames, ...DEFAULT_DEPARTMENT_OPTIONS])).filter(Boolean)
      setDepartmentOptions(merged)
    })
    return () => {
      active = false
    }
  }, [])

  // Fetch sites
  useEffect(() => {
    let active = true
    getSites().then((res) => {
      if (!active || !res.success) return
      const opts = res.data.map((s) => s.name)
      setSiteOptions(opts)
      if (opts.length > 0) {
        if (!kbDraft.header.lokasi) {
          setKbDraft((prev) => ({ ...prev, header: { ...prev.header, lokasi: opts[0] } }))
        }
        if (!dhDraft.header.lokasi) {
          setDhDraft((prev) => ({ ...prev, header: { ...prev.header, lokasi: opts[0] } }))
        }
      }
    })
    return () => {
      active = false
    }
  }, [])

  const [hasLoaded, setHasLoaded] = useState(false)

  // Load records from storage
  useEffect(() => {
    try {
      const rawKb = localStorage.getItem(STORAGE_KEY_KB)
      if (rawKb) {
        const parsed = JSON.parse(rawKb)
        if (Array.isArray(parsed)) setKbRecords(parsed)
      }
      const rawDh = localStorage.getItem(STORAGE_KEY_DH)
      if (rawDh) {
        const parsed = JSON.parse(rawDh)
        if (Array.isArray(parsed)) setDhRecords(parsed)
      }
    } catch {
      // ignore
    } finally {
      setHasLoaded(true)
    }
  }, [])

  // Save records to storage
  useEffect(() => {
    if (!hasLoaded) return
    try {
      localStorage.setItem(STORAGE_KEY_KB, JSON.stringify(kbRecords))
    } catch {
      // ignore
    }
  }, [hasLoaded, kbRecords])

  useEffect(() => {
    if (!hasLoaded) return
    try {
      localStorage.setItem(STORAGE_KEY_DH, JSON.stringify(dhRecords))
    } catch {
      // ignore
    }
  }, [hasLoaded, dhRecords])

  // ==========================================
  // Form 1 Handlers: Kesiapan Bekerja
  // ==========================================
  const updateKbHeader = useCallback(
    (field: keyof KesiapanBekerjaHeader, value: string) => {
      setKbDraft((prev) => ({
        ...prev,
        header: { ...prev.header, [field]: value },
      }))
    },
    []
  )

  const handleKbRowNameChange = useCallback(
    (index: number, name: string) => {
      const matched = employeesList.find(
        (e) => e.name.trim().toLowerCase() === name.trim().toLowerCase()
      )
      setKbDraft((prev) => {
        const next = [...prev.rows]
        next[index] = {
          ...next[index],
          name,
          sn: matched ? matched.employeeSn : next[index].sn,
        }
        return { ...prev, rows: next }
      })
      if (name.trim()) {
        saveCbOption('employee-name', name.trim())
      }
    },
    [employeesList]
  )

  const handleKbRowFieldChange = useCallback(
    (index: number, field: keyof KesiapanBekerjaRow, value: string) => {
      setKbDraft((prev) => {
        const next = [...prev.rows]
        next[index] = { ...next[index], [field]: value }
        return { ...prev, rows: next }
      })
    },
    []
  )

  const handleKbCycleStatus = useCallback(
    (index: number, field: 'konsumsiObat' | 'siapKerja' | 'verifikasiPengawas') => {
      setKbDraft((prev) => {
        const next = [...prev.rows]
        const curr = next[index][field]
        const nextVal: CheckStatusVX = curr === 'V' ? 'X' : curr === 'X' ? '' : 'V'
        next[index] = { ...next[index], [field]: nextVal }
        return { ...prev, rows: next }
      })
    },
    []
  )

  const handleKbBulkSetSiapKerja = useCallback((status: CheckStatusVX) => {
    setKbDraft((prev) => {
      const allMatches = prev.rows.every((r) => r.siapKerja === status)
      const target = allMatches ? '' : status
      return {
        ...prev,
        rows: prev.rows.map((r) => ({ ...r, siapKerja: target })),
      }
    })
  }, [])

  const handleKbBulkSetObat = useCallback((status: CheckStatusVX) => {
    setKbDraft((prev) => {
      const allMatches = prev.rows.every((r) => r.konsumsiObat === status)
      const target = allMatches ? '' : status
      return {
        ...prev,
        rows: prev.rows.map((r) => ({ ...r, konsumsiObat: target })),
      }
    })
  }, [])

  const handleKbBulkSetVerifikasi = useCallback((status: CheckStatusVX) => {
    setKbDraft((prev) => {
      const allMatches = prev.rows.every((r) => r.verifikasiPengawas === status)
      const target = allMatches ? '' : status
      return {
        ...prev,
        rows: prev.rows.map((r) => ({ ...r, verifikasiPengawas: target })),
      }
    })
  }, [])

  const handleSaveSignature = () => {
    if (sigModalRowIndex === null) return
    const canvas = sigCanvasRef.current
    if (!canvas || canvas.isEmpty()) {
      window.alert('Mohon bubuhkan tanda tangan/paraf terlebih dahulu.')
      return
    }
    const dataUrl = canvas.getTrimmedCanvas().toDataURL('image/png')
    setKbDraft((prev) => {
      const next = [...prev.rows]
      next[sigModalRowIndex] = { ...next[sigModalRowIndex], paraf: dataUrl }
      return { ...prev, rows: next }
    })
    setSigModalRowIndex(null)
  }

  const handleClearSignature = (index: number) => {
    setKbDraft((prev) => {
      const next = [...prev.rows]
      next[index] = { ...next[index], paraf: '' }
      return { ...prev, rows: next }
    })
  }

  const saveKbRecord = useCallback(() => {
    const filledCount = kbDraft.rows.filter((r) => r.name.trim()).length
    if (filledCount === 0) {
      window.alert('Mohon isi minimal 1 baris nama karyawan.')
      return
    }

    const now = new Date().toISOString()
    if (kbEditingId) {
      setKbRecords((prev) =>
        prev.map((r) =>
          r.id === kbEditingId ? { ...kbDraft, id: kbEditingId, createdAt: r.createdAt, updatedAt: now } : r
        )
      )
      setKbEditingId(null)
    } else {
      const newRec: KesiapanBekerjaRecord = {
        ...kbDraft,
        id: `kb-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      }
      setKbRecords((prev) => [newRec, ...prev])
    }
    window.alert('Data Form Kesiapan Bekerja berhasil disimpan!')
  }, [kbDraft, kbEditingId])

  const resetKbForm = useCallback(() => {
    if (window.confirm('Reset seluruh isi form kesiapan bekerja?')) {
      setKbDraft(defaultKbDraft())
      setKbEditingId(null)
    }
  }, [])

  const editKbRecord = useCallback((record: KesiapanBekerjaRecord) => {
    setKbDraft({
      header: { ...record.header },
      rows: record.rows.map((r) => ({ ...r })),
    })
    setKbEditingId(record.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const deleteKbRecord = useCallback((id: string) => {
    if (window.confirm('Hapus riwayat form ini?')) {
      setKbRecords((prev) => prev.filter((r) => r.id !== id))
    }
  }, [])

  const downloadKbPdf = useCallback(async (dataToPrint = kbDraft) => {
    setIsKbGenerating(true)
    setKbPdfPayload(dataToPrint)

    try {
      await new Promise((resolve) => setTimeout(resolve, 300))
      const node = kbPdfRef.current
      if (!node) throw new Error('PDF render node tidak ditemukan')

      const { default: html2canvas } = await import('html2canvas-pro')
      const { jsPDF } = await import('jspdf')

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: node.scrollWidth,
        windowHeight: node.scrollHeight,
      })

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, 210, 297)
      pdf.save(
        `Form-Kesiapan-Bekerja-${dataToPrint.header.tanggal || 'Doc'}-${dataToPrint.header.shift || 'Shift'}.pdf`
      )
    } catch (err) {
      console.error('[SiapHadir] PDF generation failed:', err)
      window.alert('Gagal mendownload PDF. Silakan coba lagi.')
    } finally {
      setIsKbGenerating(false)
    }
  }, [kbDraft])

  // ==========================================
  // Form 2 Handlers: Daftar Hadir Sosialisasi
  // ==========================================
  const updateDhHeader = useCallback(
    (field: keyof DaftarHadirHeader, value: string) => {
      setDhDraft((prev) => ({
        ...prev,
        header: { ...prev.header, [field]: value },
      }))
    },
    []
  )

  const handleDhRowNameChange = useCallback(
    (index: number, name: string) => {
      const matched = employeesList.find(
        (e) => e.name.trim().toLowerCase() === name.trim().toLowerCase()
      )
      setDhDraft((prev) => {
        const next = [...prev.rows]
        next[index] = {
          ...next[index],
          name,
          sn: matched ? matched.employeeSn : next[index].sn,
        }
        return { ...prev, rows: next }
      })
      if (name.trim()) {
        saveCbOption('employee-name', name.trim())
      }
    },
    [employeesList]
  )

  const handleDhRowFieldChange = useCallback(
    (index: number, field: keyof DaftarHadirRow, value: string) => {
      setDhDraft((prev) => {
        const next = [...prev.rows]
        next[index] = { ...next[index], [field]: value }
        return { ...prev, rows: next }
      })
    },
    []
  )

  const saveDhRecord = useCallback(() => {
    const filledCount = dhDraft.rows.filter((r) => r.name.trim()).length
    if (filledCount === 0) {
      window.alert('Mohon isi minimal 1 baris nama karyawan.')
      return
    }

    const now = new Date().toISOString()
    if (dhEditingId) {
      setDhRecords((prev) =>
        prev.map((r) =>
          r.id === dhEditingId ? { ...dhDraft, id: dhEditingId, createdAt: r.createdAt, updatedAt: now } : r
        )
      )
      setDhEditingId(null)
    } else {
      const newRec: DaftarHadirRecord = {
        ...dhDraft,
        id: `dh-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      }
      setDhRecords((prev) => [newRec, ...prev])
    }
    window.alert('Data Form Daftar Hadir Sosialisasi berhasil disimpan!')
  }, [dhDraft, dhEditingId])

  const resetDhForm = useCallback(() => {
    if (window.confirm('Reset seluruh isi form daftar hadir?')) {
      setDhDraft(defaultDhDraft())
      setDhEditingId(null)
    }
  }, [])

  const editDhRecord = useCallback((record: DaftarHadirRecord) => {
    setDhDraft({
      header: { ...record.header },
      rows: record.rows.map((r) => ({ ...r })),
    })
    setDhEditingId(record.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const deleteDhRecord = useCallback((id: string) => {
    if (window.confirm('Hapus riwayat form ini?')) {
      setDhRecords((prev) => prev.filter((r) => r.id !== id))
    }
  }, [])

  const downloadDhPdf = useCallback(async (dataToPrint = dhDraft) => {
    setIsDhGenerating(true)
    setDhPdfPayload(dataToPrint)

    try {
      await new Promise((resolve) => setTimeout(resolve, 300))
      const node = dhPdfRef.current
      if (!node) throw new Error('PDF render node tidak ditemukan')

      const { default: html2canvas } = await import('html2canvas-pro')
      const { jsPDF } = await import('jspdf')

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: node.scrollWidth,
        windowHeight: node.scrollHeight,
      })

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, 210, 297)
      pdf.save(
        `Daftar-Hadir-Sosialisasi-${dataToPrint.header.tanggal || 'Doc'}-${dataToPrint.header.shift || 'Shift'}.pdf`
      )
    } catch (err) {
      console.error('[SiapHadir] PDF generation failed:', err)
      window.alert('Gagal mendownload PDF. Silakan coba lagi.')
    } finally {
      setIsDhGenerating(false)
    }
  }, [dhDraft])

  return (
    <div className="space-y-6">
      {/* Sub-tabs switcher */}
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={activeSubTab === 'kesiapan-bekerja' ? 'default' : 'outline'}
            size="dense"
            onClick={() => setActiveSubTab('kesiapan-bekerja')}
            className={cn(
              activeSubTab === 'kesiapan-bekerja' &&
                'bg-blue-600 text-white hover:bg-blue-700'
            )}
          >
            Form Kesiapan Bekerja
          </Button>
          <Button
            type="button"
            variant={activeSubTab === 'daftar-hadir' ? 'default' : 'outline'}
            size="dense"
            onClick={() => setActiveSubTab('daftar-hadir')}
            className={cn(
              activeSubTab === 'daftar-hadir' &&
                'bg-blue-600 text-white hover:bg-blue-700'
            )}
          >
            Form Daftar Hadir Sosialisasi
          </Button>
        </div>
      </div>

      {activeSubTab === 'daftar-hadir' ? (
        /* ==========================================
           2. Form Daftar Hadir Sosialisasi
           ========================================== */
        <div className="space-y-6">
          {/* Header Info Card */}
          <div className={cn('rounded-xl border bg-card p-4 shadow-sm space-y-4', mobile && 'p-3')}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Daftar Hadir Sosialisasi
                </h2>
                <p className="text-xs text-muted-foreground">
                  Departemen: {dhDraft.header.departemen || '-'} | Lokasi: {dhDraft.header.lokasi || '-'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={resetDhForm}>
                  <RotateCcw className="mr-1.5 size-4" />
                  Reset
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={saveDhRecord}>
                  <Save className="mr-1.5 size-4" />
                  {dhEditingId ? 'Update Riwayat' : 'Simpan Draft'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => downloadDhPdf(dhDraft)}
                  disabled={isDhGenerating}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isDhGenerating ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="mr-1.5 size-4" />
                      Download PDF
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Document Metadata Inputs */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Departemen</Label>
                <Combobox
                  options={departmentOptions}
                  value={dhDraft.header.departemen}
                  onChange={(v) => updateDhHeader('departemen', v)}
                  placeholder="Pilih departemen..."
                  className="h-9 text-xs font-normal border-0 border-b-2 border-b-transparent ring-0 shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)] focus-visible:border-b-primary"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Lokasi / Site</Label>
                <Combobox
                  options={siteOptions}
                  value={dhDraft.header.lokasi}
                  onChange={(v) => updateDhHeader('lokasi', v)}
                  placeholder="Pilih lokasi..."
                  className="h-9 text-xs font-normal border-0 border-b-2 border-b-transparent ring-0 shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)] focus-visible:border-b-primary"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Tanggal</Label>
                <Input
                  type="date"
                  value={dhDraft.header.tanggal}
                  onChange={(e) => updateDhHeader('tanggal', e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Shift</Label>
                <Select
                  value={dhDraft.header.shift || 'Pagi'}
                  onValueChange={(v) => updateDhHeader('shift', v)}
                >
                  <SelectTrigger className="!h-9 data-[size=default]:!h-9 data-[size=sm]:!h-9 w-full text-xs px-4">
                    <SelectValue placeholder="Pilih Shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pagi">Pagi</SelectItem>
                    <SelectItem value="Malam">Malam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Table Card (28 Rows) */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-100">
              <CardTitle className="text-base font-semibold">
                Daftar Hadir Karyawan (28 Baris)
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                Terisi: {dhDraft.rows.filter((r) => r.name.trim()).length} / 28 Karyawan
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/75 text-xs text-gray-700 font-bold">
                      <TableHead className="w-12 text-center">No</TableHead>
                      <TableHead className="min-w-[240px]">Nama Karyawan</TableHead>
                      <TableHead className="w-36 text-center">SN</TableHead>
                      <TableHead className="min-w-[200px]">Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dhDraft.rows.map((row, idx) => (
                      <TableRow key={idx} className="hover:bg-gray-50/50">
                        <TableCell className="text-center font-bold text-xs text-gray-600">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="p-2">
                          <Combobox
                            options={operatorOptions}
                            value={row.name}
                            onChange={(val) => handleDhRowNameChange(idx, val)}
                            placeholder={`Karyawan #${idx + 1}...`}
                            emptyText="Karyawan tidak ditemukan."
                            className="h-8 text-xs font-normal border-0 border-b-2 border-b-transparent ring-0 shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)] focus-visible:border-b-primary"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            value={row.sn}
                            onChange={(e) => handleDhRowFieldChange(idx, 'sn', e.target.value)}
                            placeholder="SN..."
                            className="h-8 text-xs text-center font-mono"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            value={row.keterangan}
                            onChange={(e) => handleDhRowFieldChange(idx, 'keterangan', e.target.value)}
                            placeholder="Keterangan kehadiran / catatan..."
                            className="h-8 text-xs"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* History Records Table */}
          <Card className={cn(mobile && 'rounded-2xl bg-white shadow-sm')}>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-100">
              <CardTitle className="text-base font-semibold">Riwayat Form Daftar Hadir</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <MinimalTableShell label="History Daftar Hadir">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead>Departemen</TableHead>
                      <TableHead>Jumlah Hadir</TableHead>
                      <TableHead>Diupdate</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dhRecords.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="whitespace-nowrap font-medium">
                          {formatDateDisplay(rec.header.tanggal)}
                        </TableCell>
                        <TableCell>{rec.header.shift || '-'}</TableCell>
                        <TableCell>{rec.header.lokasi || '-'}</TableCell>
                        <TableCell>{rec.header.departemen || '-'}</TableCell>
                        <TableCell className="font-semibold">
                          {rec.rows.filter((r) => r.name.trim()).length} Karyawan
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(rec.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="dense"
                              onClick={() => editDhRecord(rec)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="dense"
                              onClick={() => downloadDhPdf(rec)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Download className="mr-1 size-3.5" />
                              PDF
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="denseIcon"
                              onClick={() => deleteDhRecord(rec.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {dhRecords.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-muted-foreground py-8 text-center text-xs">
                          Belum ada riwayat form daftar hadir.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </MinimalTableShell>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ==========================================
           1. Form Kesiapan Bekerja
           ========================================== */
        <div className="space-y-6">
          {/* Header Info Card */}
          <div className={cn('rounded-xl border bg-card p-4 shadow-sm space-y-4', mobile && 'p-3')}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Form Kesiapan Bekerja
                </h2>
                <p className="text-xs text-muted-foreground">
                  Dokumen: {kbDraft.header.docNo || '-'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={resetKbForm}>
                  <RotateCcw className="mr-1.5 size-4" />
                  Reset
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={saveKbRecord}>
                  <Save className="mr-1.5 size-4" />
                  {kbEditingId ? 'Update Riwayat' : 'Simpan Draft'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => downloadKbPdf(kbDraft)}
                  disabled={isKbGenerating}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isKbGenerating ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="mr-1.5 size-4" />
                      Download PDF
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Document Metadata Inputs */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">No. Dokumen</Label>
                <Input
                  value={kbDraft.header.docNo}
                  onChange={(e) => updateKbHeader('docNo', e.target.value)}
                  placeholder="Contoh: HSE-01-08-(0)"
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Tgl. Berlaku</Label>
                <Input
                  type="date"
                  value={kbDraft.header.tglBerlaku}
                  onChange={(e) => updateKbHeader('tglBerlaku', e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Departemen</Label>
                <Combobox
                  options={departmentOptions}
                  value={kbDraft.header.departemen}
                  onChange={(v) => updateKbHeader('departemen', v)}
                  placeholder="Pilih departemen..."
                  className="h-9 text-xs font-normal border-0 border-b-2 border-b-transparent ring-0 shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)] focus-visible:border-b-primary"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Lokasi / Site</Label>
                <Combobox
                  options={siteOptions}
                  value={kbDraft.header.lokasi}
                  onChange={(v) => updateKbHeader('lokasi', v)}
                  placeholder="Pilih lokasi..."
                  className="h-9 text-xs font-normal border-0 border-b-2 border-b-transparent ring-0 shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)] focus-visible:border-b-primary"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Pembahasan</Label>
                <Input
                  value={kbDraft.header.pembahasan}
                  onChange={(e) => updateKbHeader('pembahasan', e.target.value)}
                  placeholder="Contoh: P5M / Kesiapan Kerja"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Tanggal</Label>
                <Input
                  type="date"
                  value={kbDraft.header.tanggal}
                  onChange={(e) => updateKbHeader('tanggal', e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Shift</Label>
                <Select
                  value={kbDraft.header.shift || 'Pagi'}
                  onValueChange={(v) => updateKbHeader('shift', v)}
                >
                  <SelectTrigger className="!h-9 data-[size=default]:!h-9 data-[size=sm]:!h-9 w-full text-xs px-4">
                    <SelectValue placeholder="Pilih Shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pagi">Pagi</SelectItem>
                    <SelectItem value="Malam">Malam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-3 shadow-sm text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Quick Fill:</span>
              <Button
                type="button"
                variant="outline"
                size="dense"
                onClick={() => handleKbBulkSetSiapKerja('V')}
                className="text-[11px] text-green-700 hover:bg-green-50"
              >
                <Check className="mr-1 size-3" />
                Semua Siap Kerja (V)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="dense"
                onClick={() => handleKbBulkSetObat('X')}
                className="text-[11px] text-blue-700 hover:bg-blue-50"
              >
                <X className="mr-1 size-3" />
                Semua Obat Bebas (X)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="dense"
                onClick={() => handleKbBulkSetVerifikasi('V')}
                className="text-[11px] text-emerald-700 hover:bg-emerald-50"
              >
                <CheckSquare className="mr-1 size-3" />
                Semua Verifikasi (V)
              </Button>
            </div>
            <div className="text-muted-foreground text-[11px]">
              Klik tombol status (V/X) untuk toggle cepat: <b>V</b> (Ya/Sesuai) &rarr; <b>X</b> (Tidak) &rarr; Kosong.
            </div>
          </div>

          {/* Main Inspection Table Card */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-100">
              <CardTitle className="text-base font-semibold">
                Daftar Karyawan & Kesiapan Bekerja (28 Baris)
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                Terisi: {kbDraft.rows.filter((r) => r.name.trim()).length} / 28 Karyawan
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/75 text-xs text-gray-700 font-bold">
                      <TableHead className="w-12 text-center">No</TableHead>
                      <TableHead className="min-w-[200px]">Nama Karyawan</TableHead>
                      <TableHead className="w-28 text-center">SN</TableHead>
                      <TableHead className="w-32 text-center">
                        Konsumsi Obat
                        <br />
                        <span className="font-normal text-[10px] text-muted-foreground">Flu/Alergi (V/X)</span>
                      </TableHead>
                      <TableHead className="w-28 text-center">
                        Mulai Tidur
                        <br />
                        <span className="font-normal text-[10px] text-muted-foreground">Jam</span>
                      </TableHead>
                      <TableHead className="w-28 text-center">
                        Bangun
                        <br />
                        <span className="font-normal text-[10px] text-muted-foreground">Jam</span>
                      </TableHead>
                      <TableHead className="w-28 text-center">
                        Siap Kerja
                        <br />
                        <span className="font-normal text-[10px] text-muted-foreground">(V/X)</span>
                      </TableHead>
                      <TableHead className="w-28 text-center">Paraf</TableHead>
                      <TableHead className="w-32 text-center">
                        Verifikasi
                        <br />
                        <span className="font-normal text-[10px] text-muted-foreground">Pengawas (V/X)</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kbDraft.rows.map((row, idx) => (
                      <TableRow key={idx} className="hover:bg-gray-50/50">
                        <TableCell className="text-center font-bold text-xs text-gray-600">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="p-2">
                          <Combobox
                            options={operatorOptions}
                            value={row.name}
                            onChange={(val) => handleKbRowNameChange(idx, val)}
                            placeholder={`Karyawan #${idx + 1}...`}
                            emptyText="Karyawan tidak ditemukan."
                            className="h-8 text-xs font-normal border-0 border-b-2 border-b-transparent ring-0 shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)] focus-visible:border-b-primary"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            value={row.sn}
                            onChange={(e) => handleKbRowFieldChange(idx, 'sn', e.target.value)}
                            placeholder="SN..."
                            className="h-8 text-xs text-center font-mono"
                          />
                        </TableCell>
                        <TableCell className="text-center p-2">
                          <Button
                            type="button"
                            size="dense"
                            variant="outline"
                            onClick={() => handleKbCycleStatus(idx, 'konsumsiObat')}
                            className={cn(
                              'h-8 w-16 text-xs font-bold transition-all',
                              row.konsumsiObat === 'V' && 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200',
                              row.konsumsiObat === 'X' && 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200',
                              !row.konsumsiObat && 'text-gray-400'
                            )}
                          >
                            {row.konsumsiObat || '-'}
                          </Button>
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="time"
                            value={row.jamTidurMulai}
                            onChange={(e) => handleKbRowFieldChange(idx, 'jamTidurMulai', e.target.value)}
                            className="h-8 text-xs text-center"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="time"
                            value={row.jamTidurBangun}
                            onChange={(e) => handleKbRowFieldChange(idx, 'jamTidurBangun', e.target.value)}
                            className="h-8 text-xs text-center"
                          />
                        </TableCell>
                        <TableCell className="text-center p-2">
                          <Button
                            type="button"
                            size="dense"
                            variant="outline"
                            onClick={() => handleKbCycleStatus(idx, 'siapKerja')}
                            className={cn(
                              'h-8 w-16 text-xs font-bold transition-all',
                              row.siapKerja === 'V' && 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200',
                              row.siapKerja === 'X' && 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200',
                              !row.siapKerja && 'text-gray-400'
                            )}
                          >
                            {row.siapKerja || '-'}
                          </Button>
                        </TableCell>
                        <TableCell className="text-center p-2">
                          {row.paraf ? (
                            <div className="flex items-center justify-center gap-1">
                              <img
                                src={row.paraf}
                                alt="Paraf"
                                className="h-7 max-w-[50px] object-contain border rounded bg-white"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="denseIcon"
                                onClick={() => handleClearSignature(idx)}
                                title="Hapus paraf"
                                className="h-6 w-6 text-red-500"
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="dense"
                              onClick={() => setSigModalRowIndex(idx)}
                              className="h-8 text-[11px] text-blue-600"
                            >
                              Paraf
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-center p-2">
                          <Button
                            type="button"
                            size="dense"
                            variant="outline"
                            onClick={() => handleKbCycleStatus(idx, 'verifikasiPengawas')}
                            className={cn(
                              'h-8 w-16 text-xs font-bold transition-all',
                              row.verifikasiPengawas === 'V' && 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200',
                              row.verifikasiPengawas === 'X' && 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200',
                              !row.verifikasiPengawas && 'text-gray-400'
                            )}
                          >
                            {row.verifikasiPengawas || '-'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* History Records Table */}
          <Card className={cn(mobile && 'rounded-2xl bg-white shadow-sm')}>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-100">
              <CardTitle className="text-base font-semibold">Riwayat Form Kesiapan Bekerja</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <MinimalTableShell label="History Kesiapan Bekerja">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead>Departemen</TableHead>
                      <TableHead>Jumlah Karyawan</TableHead>
                      <TableHead>Diupdate</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kbRecords.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="whitespace-nowrap font-medium">
                          {formatDateDisplay(rec.header.tanggal)}
                        </TableCell>
                        <TableCell>{rec.header.shift || '-'}</TableCell>
                        <TableCell>{rec.header.lokasi || '-'}</TableCell>
                        <TableCell>{rec.header.departemen || '-'}</TableCell>
                        <TableCell className="font-semibold">
                          {rec.rows.filter((r) => r.name.trim()).length} Karyawan
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(rec.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="dense"
                              onClick={() => editKbRecord(rec)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="dense"
                              onClick={() => downloadKbPdf(rec)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Download className="mr-1 size-3.5" />
                              PDF
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="denseIcon"
                              onClick={() => deleteKbRecord(rec.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {kbRecords.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-muted-foreground py-8 text-center text-xs">
                          Belum ada riwayat form kesiapan bekerja.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </MinimalTableShell>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Signature Modal */}
      <Dialog open={sigModalRowIndex !== null} onOpenChange={(open) => !open && setSigModalRowIndex(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bubuhkan Paraf / Tanda Tangan</DialogTitle>
            <DialogDescription>
              Gunakan mouse atau sentuhan layar untuk memparaf baris #{sigModalRowIndex !== null ? sigModalRowIndex + 1 : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-md bg-white p-2 flex justify-center">
            <SignatureCanvas
              ref={sigCanvasRef}
              penColor="black"
              canvasProps={{
                width: 380,
                height: 180,
                className: 'border border-dashed rounded bg-gray-50',
              }}
            />
          </div>
          <div className="flex justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => sigCanvasRef.current?.clear()}
            >
              <Eraser className="mr-1.5 size-4" />
              Hapus
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSigModalRowIndex(null)}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveSignature}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Check className="mr-1.5 size-4" />
                Simpan Paraf
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Offscreen PDF render container for Kesiapan Bekerja */}
      <div
        style={{
          position: 'fixed',
          top: '-10000px',
          left: '-10000px',
          zIndex: -999,
          pointerEvents: 'none',
        }}
      >
        <PdfPageKesiapanBekerja payload={kbPdfPayload} pageRef={kbPdfRef} />
      </div>

      {/* Offscreen PDF render container for Daftar Hadir */}
      <div
        style={{
          position: 'fixed',
          top: '-10000px',
          left: '-10000px',
          zIndex: -999,
          pointerEvents: 'none',
        }}
      >
        <PdfPageDaftarHadir payload={dhPdfPayload} pageRef={dhPdfRef} />
      </div>
    </div>
  )
}
