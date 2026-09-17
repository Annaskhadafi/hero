'use client'

import { Download, Loader2, Plus, RotateCcw, Trash2, CheckSquare } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { getSites } from '@/app/dashboard/360-service/service-form/actions'

export type CheckStatus = '' | 'sesuai' | 'tidak_sesuai'

export type TireInflationRow = {
  unitNumber: string
  // Pos 1 (6 steps)
  pos1_psi10: CheckStatus
  pos1_wait1: CheckStatus
  pos1_psi30: CheckStatus
  pos1_wait2: CheckStatus
  pos1_psi115: CheckStatus
  pos1_wait3: CheckStatus
  // Pos 2 (6 steps)
  pos2_psi10: CheckStatus
  pos2_wait1: CheckStatus
  pos2_psi30: CheckStatus
  pos2_wait2: CheckStatus
  pos2_psi115: CheckStatus
  pos2_wait3: CheckStatus
  // Pos 3 (3 steps: 30 Psi, 115 Psi, Waktu tunggu 3 Menit)
  pos3_psi30: CheckStatus
  pos3_psi115: CheckStatus
  pos3_wait: CheckStatus
  // Pos 4 (6 steps)
  pos4_psi10: CheckStatus
  pos4_wait1: CheckStatus
  pos4_psi30: CheckStatus
  pos4_wait2: CheckStatus
  pos4_psi115: CheckStatus
  pos4_wait3: CheckStatus
  // Pos 5 (6 steps)
  pos5_psi10: CheckStatus
  pos5_wait1: CheckStatus
  pos5_psi30: CheckStatus
  pos5_wait2: CheckStatus
  pos5_psi115: CheckStatus
  pos5_wait3: CheckStatus
  // Pos 6 (3 steps: 30 Psi, 115 Psi, Waktu tunggu 3 Menit)
  pos6_psi30: CheckStatus
  pos6_psi115: CheckStatus
  pos6_wait: CheckStatus
  // Signatures / names
  timeKeeper: string
  customerSupervisor: string
}

export type TireInflationHeader = {
  docNumber: string
  date: string
  workArea: string
}

export type TireInflationDraft = {
  header: TireInflationHeader
  rows: TireInflationRow[]
}

export type TireInflationRecord = {
  id: string
  header: TireInflationHeader
  rows: TireInflationRow[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'hero-service-form-tire-inflation-history'
const DEFAULT_DOC_NUMBER = ''

function emptyRow(): TireInflationRow {
  return {
    unitNumber: '',
    pos1_psi10: '',
    pos1_wait1: '',
    pos1_psi30: '',
    pos1_wait2: '',
    pos1_psi115: '',
    pos1_wait3: '',
    pos2_psi10: '',
    pos2_wait1: '',
    pos2_psi30: '',
    pos2_wait2: '',
    pos2_psi115: '',
    pos2_wait3: '',
    pos3_psi30: '',
    pos3_psi115: '',
    pos3_wait: '',
    pos4_psi10: '',
    pos4_wait1: '',
    pos4_psi30: '',
    pos4_wait2: '',
    pos4_psi115: '',
    pos4_wait3: '',
    pos5_psi10: '',
    pos5_wait1: '',
    pos5_psi30: '',
    pos5_wait2: '',
    pos5_psi115: '',
    pos5_wait3: '',
    pos6_psi30: '',
    pos6_psi115: '',
    pos6_wait: '',
    timeKeeper: '',
    customerSupervisor: '',
  }
}

function defaultRows(): TireInflationRow[] {
  return Array.from({ length: 10 }, () => emptyRow())
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

function cycleStatus(current: CheckStatus): CheckStatus {
  if (current === '') return 'sesuai'
  if (current === 'sesuai') return 'tidak_sesuai'
  return ''
}

function renderStatusSymbol(status: CheckStatus) {
  if (status === 'sesuai') return '☑'
  if (status === 'tidak_sesuai') return '☒'
  return ''
}

function StatusCellButton({
  status,
  onChange,
  className,
}: {
  status: CheckStatus
  onChange: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded border text-sm font-black transition-colors select-none',
        status === 'sesuai' && 'bg-emerald-50 text-emerald-700 border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700',
        status === 'tidak_sesuai' && 'bg-rose-50 text-rose-700 border-rose-400 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700',
        !status && 'bg-background text-muted-foreground/20 border-input hover:border-foreground/40',
        className
      )}
      title="Klik untuk ubah: Sesuai (☑) -> Tidak Sesuai (☒) -> Kosong"
    >
      {renderStatusSymbol(status)}
    </button>
  )
}

function PdfCell({ status }: { status: CheckStatus }) {
  return (
    <td
      style={{
        border: '1px solid #000000',
        backgroundColor: '#ffffff',
        color: '#000000',
        padding: 0,
        textAlign: 'center',
        verticalAlign: 'middle',
      }}
    >
      <div
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 900,
          color: '#000000',
          lineHeight: '1',
          userSelect: 'none',
        }}
      >
        {renderStatusSymbol(status)}
      </div>
    </td>
  )
}

function PdfPage({
  header,
  rows,
}: {
  header: TireInflationHeader
  rows: TireInflationRow[]
}) {
  // Ensure exactly at least 10 rows for print
  const printRows = [...rows]
  while (printRows.length < 10) {
    printRows.push(emptyRow())
  }

  return (
    <div
      className="tire-inflation-pdf-page relative overflow-hidden font-sans"
      style={{
        width: '297mm',
        minHeight: '210mm',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: '#000000',
        padding: '8mm',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid #000000',
          paddingBottom: '2.5mm',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Logo Left */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src="/cp_logo-removebg-preview.png"
            alt="Chitra Paratama Logo"
            style={{ height: '14mm', width: 'auto', objectFit: 'contain' }}
          />
        </div>

        {/* Right Metadata */}
        <div style={{ fontSize: '8.5px', fontWeight: 'bold', color: '#000000' }}>
          <div style={{ display: 'flex', gap: '1.5mm', marginBottom: '1.2mm' }}>
            <span style={{ width: '28mm' }}>NO. DOKUMEN</span>
            <span>:</span>
            <span>{header.docNumber || ''}</span>
          </div>
          <div style={{ display: 'flex', gap: '1.5mm', marginBottom: '1.2mm' }}>
            <span style={{ width: '28mm' }}>TANGGAL</span>
            <span>:</span>
            <span>{header.date || '-'}</span>
          </div>
          <div style={{ display: 'flex', gap: '1.5mm' }}>
            <span style={{ width: '28mm' }}>AREA KERJA</span>
            <span>:</span>
            <span>{header.workArea || '-'}</span>
          </div>
        </div>
      </div>

      {/* Form Title */}
      <div style={{ margin: '3.5mm 0', textAlign: 'center', backgroundColor: '#ffffff' }}>
        <h1 style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#000000', margin: 0 }}>
          FORM CEK-LIST TAHAPAN PENGISIAN ANGIN BAN
        </h1>
      </div>

      {/* Main Table */}
      <table
        style={{
          width: '281mm',
          borderCollapse: 'collapse',
          border: '1px solid #000000',
          fontSize: '6.5px',
          tableLayout: 'fixed',
          backgroundColor: '#ffffff',
          color: '#000000',
        }}
      >
        <colgroup>
          <col style={{ width: '7mm' }} />
          <col style={{ width: '18mm' }} />
          {/* Pos 1 */}
          <col style={{ width: '7mm' }} />
          <col style={{ width: '7mm' }} />
          <col style={{ width: '7mm' }} />
          <col style={{ width: '7mm' }} />
          <col style={{ width: '7mm' }} />
          <col style={{ width: '7mm' }} />
          {/* Pos 2 */}
          <col style={{ width: '7mm' }} />
          <col style={{ width: '7mm' }} />
          <col style={{ width: '7mm' }} />
          <col style={{ width: '7mm' }} />
          <col style={{ width: '7mm' }} />
          <col style={{ width: '7mm' }} />
          {/* Pos 3 */}
          <col style={{ width: '8mm' }} />
          <col style={{ width: '8mm' }} />
          <col style={{ width: '8mm' }} />
          {/* Pos 4 */}
          <col style={{ width: '7mm' }} />
          <col style={{ width: '7mm' }} />
          <col style={{ width: '7mm' }} />
          <col style={{ width: '7mm' }} />
          <col style={{ width: '7mm' }} />
          <col style={{ width: '7mm' }} />
          {/* Pos 5 */}
          <col style={{ width: '7mm' }} />
          <col style={{ width: '7mm' }} />
          <col style={{ width: '7mm' }} />
          <col style={{ width: '7mm' }} />
          <col style={{ width: '7mm' }} />
          <col style={{ width: '7mm' }} />
          {/* Pos 6 */}
          <col style={{ width: '8mm' }} />
          <col style={{ width: '8mm' }} />
          <col style={{ width: '8mm' }} />
          {/* End cols */}
          <col style={{ width: '18mm' }} />
          <col style={{ width: '22mm' }} />
        </colgroup>
        <thead>
          <tr style={{ backgroundColor: '#ffffff', height: '14mm' }}>
            <th
              style={{
                border: '1px solid #000000',
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: '2px',
                textAlign: 'center',
                verticalAlign: 'middle',
                height: '14mm',
              }}
            >
              <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#000000' }}>
                No
              </div>
            </th>

            <th
              style={{
                border: '1px solid #000000',
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: '2px',
                textAlign: 'center',
                verticalAlign: 'middle',
                height: '14mm',
              }}
            >
              <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#000000' }}>
                No Unit
              </div>
            </th>

            {/* Ban Position 1 */}
            <th
              colSpan={6}
              style={{
                border: '1px solid #000000',
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: 0,
                margin: 0,
                verticalAlign: 'top',
                height: '14mm',
              }}
            >
              <div style={{ height: '7mm', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #000000', fontSize: '7.5px', fontWeight: 'bold', color: '#000000' }}>
                Ban Position 1
              </div>
              <div style={{ height: '7mm', display: 'flex', width: '100%' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', borderRight: '1px solid #000000', padding: '1px' }}>10 Psi</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', lineHeight: 1.05, borderRight: '1px solid #000000', padding: '1px' }}>Waktu tunggu 3 Menit</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', borderRight: '1px solid #000000', padding: '1px' }}>30 Psi</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', lineHeight: 1.05, borderRight: '1px solid #000000', padding: '1px' }}>Waktu tunggu 3 Menit</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', borderRight: '1px solid #000000', padding: '1px' }}>115 Psi</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', lineHeight: 1.05, padding: '1px' }}>Waktu tunggu 3 Menit</div>
              </div>
            </th>

            {/* Ban Position 2 */}
            <th
              colSpan={6}
              style={{
                border: '1px solid #000000',
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: 0,
                margin: 0,
                verticalAlign: 'top',
                height: '14mm',
              }}
            >
              <div style={{ height: '7mm', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #000000', fontSize: '7.5px', fontWeight: 'bold', color: '#000000' }}>
                Ban Position 2
              </div>
              <div style={{ height: '7mm', display: 'flex', width: '100%' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', borderRight: '1px solid #000000', padding: '1px' }}>10 Psi</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', lineHeight: 1.05, borderRight: '1px solid #000000', padding: '1px' }}>Waktu tunggu 3 Menit</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', borderRight: '1px solid #000000', padding: '1px' }}>30 Psi</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', lineHeight: 1.05, borderRight: '1px solid #000000', padding: '1px' }}>Waktu tunggu 3 Menit</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', borderRight: '1px solid #000000', padding: '1px' }}>115 Psi</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', lineHeight: 1.05, padding: '1px' }}>Waktu tunggu 3 Menit</div>
              </div>
            </th>

            {/* Ban Position 3 */}
            <th
              colSpan={3}
              style={{
                border: '1px solid #000000',
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: 0,
                margin: 0,
                verticalAlign: 'top',
                height: '14mm',
              }}
            >
              <div style={{ height: '7mm', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #000000', fontSize: '7.5px', fontWeight: 'bold', color: '#000000' }}>
                Ban Position 3
              </div>
              <div style={{ height: '7mm', display: 'flex', width: '100%' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', borderRight: '1px solid #000000', padding: '1px' }}>30 Psi</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', borderRight: '1px solid #000000', padding: '1px' }}>115 Psi</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', lineHeight: 1.05, padding: '1px' }}>Waktu tunggu 3 Menit</div>
              </div>
            </th>

            {/* Ban Position 4 */}
            <th
              colSpan={6}
              style={{
                border: '1px solid #000000',
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: 0,
                margin: 0,
                verticalAlign: 'top',
                height: '14mm',
              }}
            >
              <div style={{ height: '7mm', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #000000', fontSize: '7.5px', fontWeight: 'bold', color: '#000000' }}>
                Ban Position 4
              </div>
              <div style={{ height: '7mm', display: 'flex', width: '100%' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', borderRight: '1px solid #000000', padding: '1px' }}>10 Psi</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', lineHeight: 1.05, borderRight: '1px solid #000000', padding: '1px' }}>Waktu tunggu 3 Menit</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', borderRight: '1px solid #000000', padding: '1px' }}>30 Psi</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', lineHeight: 1.05, borderRight: '1px solid #000000', padding: '1px' }}>Waktu tunggu 3 Menit</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', borderRight: '1px solid #000000', padding: '1px' }}>115 Psi</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', lineHeight: 1.05, padding: '1px' }}>Waktu tunggu 3 Menit</div>
              </div>
            </th>

            {/* Ban Position 5 */}
            <th
              colSpan={6}
              style={{
                border: '1px solid #000000',
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: 0,
                margin: 0,
                verticalAlign: 'top',
                height: '14mm',
              }}
            >
              <div style={{ height: '7mm', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #000000', fontSize: '7.5px', fontWeight: 'bold', color: '#000000' }}>
                Ban Position 5
              </div>
              <div style={{ height: '7mm', display: 'flex', width: '100%' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', borderRight: '1px solid #000000', padding: '1px' }}>10 Psi</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', lineHeight: 1.05, borderRight: '1px solid #000000', padding: '1px' }}>Waktu tunggu 3 Menit</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', borderRight: '1px solid #000000', padding: '1px' }}>30 Psi</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', lineHeight: 1.05, borderRight: '1px solid #000000', padding: '1px' }}>Waktu tunggu 3 Menit</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', borderRight: '1px solid #000000', padding: '1px' }}>115 Psi</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', lineHeight: 1.05, padding: '1px' }}>Waktu tunggu 3 Menit</div>
              </div>
            </th>

            {/* Ban Position 6 */}
            <th
              colSpan={3}
              style={{
                border: '1px solid #000000',
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: 0,
                margin: 0,
                verticalAlign: 'top',
                height: '14mm',
              }}
            >
              <div style={{ height: '7mm', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #000000', fontSize: '7.5px', fontWeight: 'bold', color: '#000000' }}>
                Ban Position 6
              </div>
              <div style={{ height: '7mm', display: 'flex', width: '100%' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', borderRight: '1px solid #000000', padding: '1px' }}>30 Psi</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', borderRight: '1px solid #000000', padding: '1px' }}>115 Psi</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '5.5px', fontWeight: 'bold', lineHeight: 1.05, padding: '1px' }}>Waktu tunggu 3 Menit</div>
              </div>
            </th>

            <th
              style={{
                border: '1px solid #000000',
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: '2px',
                textAlign: 'center',
                verticalAlign: 'middle',
                height: '14mm',
              }}
            >
              <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#000000' }}>
                Time Keeper
              </div>
            </th>

            <th
              style={{
                border: '1px solid #000000',
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: '2px',
                textAlign: 'center',
                verticalAlign: 'middle',
                height: '14mm',
              }}
            >
              <div style={{ fontSize: '6.5px', fontWeight: 'bold', lineHeight: 1.15, color: '#000000' }}>
                PARAF PENGAWAS<br />PELANGGAN
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {printRows.map((row, idx) => (
            <tr key={idx} style={{ height: '10.5mm', backgroundColor: '#ffffff' }}>
              <td style={{ border: '1px solid #000000', backgroundColor: '#ffffff', color: '#000000', textAlign: 'center', fontWeight: 'bold', fontSize: '7.5px' }}>{idx + 1}</td>
              <td style={{ border: '1px solid #000000', backgroundColor: '#ffffff', color: '#000000', textAlign: 'center', fontWeight: 'bold', fontSize: '7.5px', padding: '0 2px' }}>{row.unitNumber}</td>

              {/* Pos 1 */}
              <PdfCell status={row.pos1_psi10} />
              <PdfCell status={row.pos1_wait1} />
              <PdfCell status={row.pos1_psi30} />
              <PdfCell status={row.pos1_wait2} />
              <PdfCell status={row.pos1_psi115} />
              <PdfCell status={row.pos1_wait3} />

              {/* Pos 2 */}
              <PdfCell status={row.pos2_psi10} />
              <PdfCell status={row.pos2_wait1} />
              <PdfCell status={row.pos2_psi30} />
              <PdfCell status={row.pos2_wait2} />
              <PdfCell status={row.pos2_psi115} />
              <PdfCell status={row.pos2_wait3} />

              {/* Pos 3 */}
              <PdfCell status={row.pos3_psi30} />
              <PdfCell status={row.pos3_psi115} />
              <PdfCell status={row.pos3_wait} />

              {/* Pos 4 */}
              <PdfCell status={row.pos4_psi10} />
              <PdfCell status={row.pos4_wait1} />
              <PdfCell status={row.pos4_psi30} />
              <PdfCell status={row.pos4_wait2} />
              <PdfCell status={row.pos4_psi115} />
              <PdfCell status={row.pos4_wait3} />

              {/* Pos 5 */}
              <PdfCell status={row.pos5_psi10} />
              <PdfCell status={row.pos5_wait1} />
              <PdfCell status={row.pos5_psi30} />
              <PdfCell status={row.pos5_wait2} />
              <PdfCell status={row.pos5_psi115} />
              <PdfCell status={row.pos5_wait3} />

              {/* Pos 6 */}
              <PdfCell status={row.pos6_psi30} />
              <PdfCell status={row.pos6_psi115} />
              <PdfCell status={row.pos6_wait} />

              {/* Names / Signatures */}
              <td style={{ border: '1px solid #000000', backgroundColor: '#ffffff', color: '#000000', textAlign: 'center', fontWeight: '600', fontSize: '7.5px', padding: '0 2px' }}>{row.timeKeeper}</td>
              <td style={{ border: '1px solid #000000', backgroundColor: '#ffffff', color: '#000000', textAlign: 'center', fontWeight: '600', fontSize: '7.5px', padding: '0 2px' }}>{row.customerSupervisor}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend Bottom Right */}
      <div style={{ marginTop: '3.5mm', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#ffffff' }}>
        <div style={{ fontSize: '8.5px', fontWeight: 'bold', color: '#000000' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2mm', marginBottom: '1.5mm' }}>
            <span style={{ fontSize: '13px', fontWeight: 900, lineHeight: 1, color: '#000000' }}>☑</span>
            <span>Jika sesuai</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
            <span style={{ fontSize: '13px', fontWeight: 900, lineHeight: 1, color: '#000000' }}>☒</span>
            <span>Jika tidak sesuai</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TireInflationForm({ mobile = false }: { mobile?: boolean }) {
  const [siteOptions, setSiteOptions] = useState<string[]>([])
  const [header, setHeader] = useState<TireInflationHeader>({
    docNumber: '',
    date: new Date().toISOString().slice(0, 10),
    workArea: '',
  })
  const [rows, setRows] = useState<TireInflationRow[]>(defaultRows())
  const [records, setRecords] = useState<TireInflationRecord[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const pdfRef = useRef<HTMLDivElement>(null)

  // Fetch sites
  useEffect(() => {
    let active = true
    getSites().then((res) => {
      if (!active || !res.success) return
      const opts = res.data.map((s) => s.name)
      setSiteOptions(opts)
      if (opts.length > 0 && !header.workArea) {
        setHeader((prev) => ({ ...prev, workArea: opts[0] }))
      }
    })
    return () => {
      active = false
    }
  }, [])

  const [hasLoaded, setHasLoaded] = useState(false)

  // Load records from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setRecords(parsed)
      }
    } catch {
      // ignore
    } finally {
      setHasLoaded(true)
    }
  }, [])

  // Save records to localStorage
  useEffect(() => {
    if (!hasLoaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    } catch {
      // ignore
    }
  }, [hasLoaded, records])

  const handleRowChange = useCallback(
    (index: number, field: keyof TireInflationRow, value: any) => {
      setRows((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], [field]: value }
        return next
      })
    },
    []
  )

  const handleCycleStatus = useCallback(
    (rowIndex: number, field: keyof TireInflationRow) => {
      setRows((prev) => {
        const next = [...prev]
        const current = next[rowIndex][field] as CheckStatus
        next[rowIndex] = { ...next[rowIndex], [field]: cycleStatus(current) }
        return next
      })
    },
    []
  )

  const handleAddRow = () => {
    setRows((prev) => [...prev, emptyRow()])
  }

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const handleQuickCheckAllRow = (index: number, status: CheckStatus) => {
    setRows((prev) => {
      const next = [...prev]
      const row = { ...next[index] }
      const checkKeys: (keyof TireInflationRow)[] = [
        'pos1_psi10', 'pos1_wait1', 'pos1_psi30', 'pos1_wait2', 'pos1_psi115', 'pos1_wait3',
        'pos2_psi10', 'pos2_wait1', 'pos2_psi30', 'pos2_wait2', 'pos2_psi115', 'pos2_wait3',
        'pos3_psi30', 'pos3_psi115', 'pos3_wait',
        'pos4_psi10', 'pos4_wait1', 'pos4_psi30', 'pos4_wait2', 'pos4_psi115', 'pos4_wait3',
        'pos5_psi10', 'pos5_wait1', 'pos5_psi30', 'pos5_wait2', 'pos5_psi115', 'pos5_wait3',
        'pos6_psi30', 'pos6_psi115', 'pos6_wait',
      ]
      for (const k of checkKeys) {
        ;(row as any)[k] = status
      }
      next[index] = row
      return next
    })
  }

  const handleReset = () => {
    if (window.confirm('Reset seluruh isi form?')) {
      setHeader({
        docNumber: '',
        date: new Date().toISOString().slice(0, 10),
        workArea: siteOptions[0] || '',
      })
      setRows(defaultRows())
      setEditingId(null)
    }
  }

  const handleSaveDraft = () => {
    const now = new Date().toISOString()
    if (editingId) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? { ...r, header: { ...header }, rows: [...rows], updatedAt: now }
            : r
        )
      )
      window.alert('Draft berhasil diperbarui.')
      return
    }

    const newId = `tire-infl-${Date.now()}`
    setEditingId(newId)
    setRecords((prev) => [
      {
        id: newId,
        header: { ...header },
        rows: [...rows],
        createdAt: now,
        updatedAt: now,
      },
      ...prev,
    ])
    window.alert('Draft berhasil disimpan.')
  }

  const handleEditRecord = (record: TireInflationRecord) => {
    setEditingId(record.id)
    setHeader({ ...record.header })
    setRows(record.rows.map((r) => ({ ...r })))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteRecord = (id: string) => {
    if (!window.confirm('Hapus riwayat form ini?')) return
    setRecords((prev) => prev.filter((r) => r.id !== id))
    if (editingId === id) setEditingId(null)
  }

  const handleDownloadPdf = async (targetHeader = header, targetRows = rows) => {
    const el = pdfRef.current
    if (!el) return
    setIsGenerating(true)
    try {
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      const images = Array.from(el.querySelectorAll('img'))
      await Promise.all(
        images.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((res) => {
                img.onload = () => res()
                img.onerror = () => res()
              })
        )
      )
      await document.fonts?.ready

      const { default: html2canvas } = await import('html2canvas-pro')
      const { jsPDF } = await import('jspdf')

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      })

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      pdf.addImage(canvas.toDataURL('image/jpeg', 1), 'JPEG', 0, 0, 297, 210)
      const fileName = `Form-Pengisian-Angin-Ban_${targetHeader.workArea || 'Site'}_${targetHeader.date || 'draft'}.pdf`
      pdf.save(fileName)
    } catch (err) {
      console.error('[tire-inflation] PDF generation error:', err)
      window.alert('Gagal mengunduh PDF. Silakan coba kembali.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Info Card */}
      <div className={cn('rounded-xl border bg-card p-4 shadow-sm space-y-4', mobile && 'p-3')}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Form Cek-List Tahapan Pengisian Angin Ban
            </h2>
            <p className="text-xs text-muted-foreground">
              Dokumen: {header.docNumber || '-'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="dense"
              onClick={handleReset}
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
            <Button
              type="button"
              variant="outline"
              size="dense"
              onClick={handleSaveDraft}
            >
              Simpan Draft
            </Button>
            <Button
              type="button"
              size="dense"
              onClick={() => handleDownloadPdf()}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Download PDF
            </Button>
          </div>
        </div>

        {/* Metadata Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">No. Dokumen</Label>
            <Input
              value={header.docNumber}
              onChange={(e) => setHeader((p) => ({ ...p, docNumber: e.target.value }))}
              placeholder="Contoh: CP-CK-BIB-SVC-SEM-FORM-002"
              className="h-8 text-xs font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tanggal</Label>
            <Input
              type="date"
              value={header.date}
              onChange={(e) => setHeader((p) => ({ ...p, date: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Area Kerja / Site</Label>
            <Combobox
              options={siteOptions}
              value={header.workArea}
              onChange={(val: string) => setHeader((p) => ({ ...p, workArea: val }))}
              placeholder="Pilih Area Kerja / Site"
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Legend / Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground border">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-foreground">Keterangan Klik Sel:</span>
          <span className="flex items-center gap-1">
            <span className="font-bold text-emerald-600">☑</span> = Sesuai
          </span>
          <span className="flex items-center gap-1">
            <span className="font-bold text-rose-600">☒</span> = Tidak Sesuai
          </span>
          <span>(Klik berulang untuk toggle)</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="dense"
            onClick={handleAddRow}
            className="h-7 text-xs"
          >
            <Plus className="size-3" />
            Tambah Baris Unit
          </Button>
        </div>
      </div>

      {/* Grid Table Container */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              {/* Row 1 */}
              <tr className="bg-muted/80 text-foreground border-b text-[11px]">
                <th rowSpan={2} className="border-r px-2 py-2 text-center font-bold w-10">
                  No
                </th>
                <th rowSpan={2} className="border-r px-2 py-2 text-left font-bold min-w-[120px]">
                  No Unit
                </th>
                <th colSpan={6} className="border-r px-2 py-1 text-center font-bold bg-muted/60">
                  Ban Position 1
                </th>
                <th colSpan={6} className="border-r px-2 py-1 text-center font-bold bg-muted/40">
                  Ban Position 2
                </th>
                <th colSpan={3} className="border-r px-2 py-1 text-center font-bold bg-muted/60">
                  Ban Position 3
                </th>
                <th colSpan={6} className="border-r px-2 py-1 text-center font-bold bg-muted/40">
                  Ban Position 4
                </th>
                <th colSpan={6} className="border-r px-2 py-1 text-center font-bold bg-muted/60">
                  Ban Position 5
                </th>
                <th colSpan={3} className="border-r px-2 py-1 text-center font-bold bg-muted/40">
                  Ban Position 6
                </th>
                <th rowSpan={2} className="border-r px-2 py-2 text-left font-bold min-w-[130px]">
                  Time Keeper
                </th>
                <th rowSpan={2} className="border-r px-2 py-2 text-left font-bold min-w-[150px]">
                  Paraf Pengawas Pelanggan
                </th>
                <th rowSpan={2} className="px-2 py-2 text-center font-bold w-20">
                  Aksi
                </th>
              </tr>

              {/* Row 2 Subheaders */}
              <tr className="bg-muted/60 text-[10px] text-muted-foreground border-b leading-tight">
                {/* Pos 1 */}
                <th className="border-r px-1 py-1 text-center font-medium">10 Psi</th>
                <th className="border-r px-1 py-1 text-center font-medium">Wait 3m</th>
                <th className="border-r px-1 py-1 text-center font-medium">30 Psi</th>
                <th className="border-r px-1 py-1 text-center font-medium">Wait 3m</th>
                <th className="border-r px-1 py-1 text-center font-medium">115 Psi</th>
                <th className="border-r px-1 py-1 text-center font-medium">Wait 3m</th>

                {/* Pos 2 */}
                <th className="border-r px-1 py-1 text-center font-medium">10 Psi</th>
                <th className="border-r px-1 py-1 text-center font-medium">Wait 3m</th>
                <th className="border-r px-1 py-1 text-center font-medium">30 Psi</th>
                <th className="border-r px-1 py-1 text-center font-medium">Wait 3m</th>
                <th className="border-r px-1 py-1 text-center font-medium">115 Psi</th>
                <th className="border-r px-1 py-1 text-center font-medium">Wait 3m</th>

                {/* Pos 3 */}
                <th className="border-r px-1 py-1 text-center font-medium">30 Psi</th>
                <th className="border-r px-1 py-1 text-center font-medium">115 Psi</th>
                <th className="border-r px-1 py-1 text-center font-medium">Wait 3m</th>

                {/* Pos 4 */}
                <th className="border-r px-1 py-1 text-center font-medium">10 Psi</th>
                <th className="border-r px-1 py-1 text-center font-medium">Wait 3m</th>
                <th className="border-r px-1 py-1 text-center font-medium">30 Psi</th>
                <th className="border-r px-1 py-1 text-center font-medium">Wait 3m</th>
                <th className="border-r px-1 py-1 text-center font-medium">115 Psi</th>
                <th className="border-r px-1 py-1 text-center font-medium">Wait 3m</th>

                {/* Pos 5 */}
                <th className="border-r px-1 py-1 text-center font-medium">10 Psi</th>
                <th className="border-r px-1 py-1 text-center font-medium">Wait 3m</th>
                <th className="border-r px-1 py-1 text-center font-medium">30 Psi</th>
                <th className="border-r px-1 py-1 text-center font-medium">Wait 3m</th>
                <th className="border-r px-1 py-1 text-center font-medium">115 Psi</th>
                <th className="border-r px-1 py-1 text-center font-medium">Wait 3m</th>

                {/* Pos 6 */}
                <th className="border-r px-1 py-1 text-center font-medium">30 Psi</th>
                <th className="border-r px-1 py-1 text-center font-medium">115 Psi</th>
                <th className="border-r px-1 py-1 text-center font-medium">Wait 3m</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                  <td className="border-r p-1 text-center font-semibold text-muted-foreground">
                    {idx + 1}
                  </td>
                  <td className="border-r p-1">
                    <Input
                      value={row.unitNumber}
                      onChange={(e) => handleRowChange(idx, 'unitNumber', e.target.value)}
                      placeholder={`Unit ${idx + 1}`}
                      className="h-7 text-xs font-semibold"
                    />
                  </td>

                  {/* Pos 1 */}
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos1_psi10} onChange={() => handleCycleStatus(idx, 'pos1_psi10')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos1_wait1} onChange={() => handleCycleStatus(idx, 'pos1_wait1')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos1_psi30} onChange={() => handleCycleStatus(idx, 'pos1_psi30')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos1_wait2} onChange={() => handleCycleStatus(idx, 'pos1_wait2')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos1_psi115} onChange={() => handleCycleStatus(idx, 'pos1_psi115')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos1_wait3} onChange={() => handleCycleStatus(idx, 'pos1_wait3')} />
                  </td>

                  {/* Pos 2 */}
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos2_psi10} onChange={() => handleCycleStatus(idx, 'pos2_psi10')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos2_wait1} onChange={() => handleCycleStatus(idx, 'pos2_wait1')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos2_psi30} onChange={() => handleCycleStatus(idx, 'pos2_psi30')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos2_wait2} onChange={() => handleCycleStatus(idx, 'pos2_wait2')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos2_psi115} onChange={() => handleCycleStatus(idx, 'pos2_psi115')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos2_wait3} onChange={() => handleCycleStatus(idx, 'pos2_wait3')} />
                  </td>

                  {/* Pos 3 */}
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos3_psi30} onChange={() => handleCycleStatus(idx, 'pos3_psi30')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos3_psi115} onChange={() => handleCycleStatus(idx, 'pos3_psi115')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos3_wait} onChange={() => handleCycleStatus(idx, 'pos3_wait')} />
                  </td>

                  {/* Pos 4 */}
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos4_psi10} onChange={() => handleCycleStatus(idx, 'pos4_psi10')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos4_wait1} onChange={() => handleCycleStatus(idx, 'pos4_wait1')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos4_psi30} onChange={() => handleCycleStatus(idx, 'pos4_psi30')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos4_wait2} onChange={() => handleCycleStatus(idx, 'pos4_wait2')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos4_psi115} onChange={() => handleCycleStatus(idx, 'pos4_psi115')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos4_wait3} onChange={() => handleCycleStatus(idx, 'pos4_wait3')} />
                  </td>

                  {/* Pos 5 */}
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos5_psi10} onChange={() => handleCycleStatus(idx, 'pos5_psi10')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos5_wait1} onChange={() => handleCycleStatus(idx, 'pos5_wait1')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos5_psi30} onChange={() => handleCycleStatus(idx, 'pos5_psi30')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos5_wait2} onChange={() => handleCycleStatus(idx, 'pos5_wait2')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos5_psi115} onChange={() => handleCycleStatus(idx, 'pos5_psi115')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos5_wait3} onChange={() => handleCycleStatus(idx, 'pos5_wait3')} />
                  </td>

                  {/* Pos 6 */}
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos6_psi30} onChange={() => handleCycleStatus(idx, 'pos6_psi30')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos6_psi115} onChange={() => handleCycleStatus(idx, 'pos6_psi115')} />
                  </td>
                  <td className="border-r p-1 text-center">
                    <StatusCellButton status={row.pos6_wait} onChange={() => handleCycleStatus(idx, 'pos6_wait')} />
                  </td>

                  {/* Names */}
                  <td className="border-r p-1">
                    <Input
                      value={row.timeKeeper}
                      onChange={(e) => handleRowChange(idx, 'timeKeeper', e.target.value)}
                      placeholder="Nama / Initial"
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="border-r p-1">
                    <Input
                      value={row.customerSupervisor}
                      onChange={(e) => handleRowChange(idx, 'customerSupervisor', e.target.value)}
                      placeholder="Paraf / Nama"
                      className="h-7 text-xs"
                    />
                  </td>

                  {/* Quick Row Actions */}
                  <td className="p-1">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleQuickCheckAllRow(idx, 'sesuai')}
                        className="rounded p-1 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                        title="Centang semua 'Sesuai' di baris ini"
                      >
                        <CheckSquare className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickCheckAllRow(idx, '')}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                        title="Kosongkan centang di baris ini"
                      >
                        <RotateCcw className="size-3.5" />
                      </button>
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="rounded p-1 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                          title="Hapus baris ini"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Table Card */}
      <div className={cn('rounded-xl border bg-card p-4 shadow-sm space-y-3', mobile && 'p-3')}>
        <h3 className="text-sm font-bold text-foreground">Riwayat Form Pengisian Angin Ban</h3>
        {records.length === 0 ? (
          <p className="text-xs text-muted-foreground">Belum ada riwayat tersimpan.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>No. Dokumen</TableHead>
                  <TableHead>Area Kerja</TableHead>
                  <TableHead>Jumlah Unit</TableHead>
                  <TableHead>Terakhir Diubah</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium whitespace-nowrap">{r.header.date || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{r.header.docNumber || '-'}</TableCell>
                    <TableCell>{r.header.workArea || '-'}</TableCell>
                    <TableCell>{r.rows.filter((row) => row.unitNumber.trim()).length} unit</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(r.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="dense"
                          onClick={() => handleEditRecord(r)}
                          className="h-7 text-xs"
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="dense"
                          onClick={() => handleDownloadPdf(r.header, r.rows)}
                          disabled={isGenerating}
                          className="h-7 text-xs"
                        >
                          <Download className="size-3" />
                          PDF
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="dense"
                          onClick={() => handleDeleteRecord(r.id)}
                          className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Off-screen PDF Render Template Container */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: -10000,
          opacity: 1,
          pointerEvents: 'none',
          zIndex: -999,
        }}
        aria-hidden="true"
      >
        <div ref={pdfRef} style={{ width: '297mm', backgroundColor: '#ffffff' }}>
          <PdfPage header={header} rows={rows} />
        </div>
      </div>
    </div>
  )
}
