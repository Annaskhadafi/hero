'use client'

import {
  ArrowLeft,
  Check,
  Download,
  Eraser,
  Loader2,
  PenLine,
  Pencil,
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
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  getEmployees,
  getSites,
  getServiceFormUserContext,
  type ServiceFormUserContext,
} from '@/app/dashboard/360-service/service-form/actions'

export type InspectionItemStatus = 'baik' | 'tidak' | ''

export type InspectionCheckItem = {
  no: number
  name: string
  status: InspectionItemStatus
  keterangan: string
}

export type HourMeterRow = {
  start: string
  stop: string
  jam: string
  tempat: string
  keterangan: string
}

export type TyreHandlerHeader = {
  docNo: string
  tglTerbit: string
  revisi: string
  unitNumber: string
  operatorName: string
  operatorSn: string
  date: string
  shift: string
  siteName: string
}

export type TyreHandlerDraft = {
  header: TyreHandlerHeader
  unitItems: InspectionCheckItem[]
  attachmentItems: InspectionCheckItem[]
  hourMeterRows: HourMeterRow[]
  operatorSignature: string
  supervisorSignature: string
  operationNotes: string
  supervisorOpName: string
  supervisorOpSn: string
  supervisorOpSignature: string
  plantActionNotes: string
  plantSignerName: string
  plantSignerSn: string
  plantSignature: string
}

export type TyreHandlerRecord = TyreHandlerDraft & {
  id: string
  createdAt: string
  updatedAt: string
  createdByUserId?: string
  createdBySn?: string
  createdByName?: string
}

const STORAGE_KEY = 'hero-service-form-tyre-handler-history'
const CB_PREFIX = 'hero-th-combobox'

const INITIAL_UNIT_ITEMS: string[] = [
  'Oil Engine',
  'Oil Transmission',
  'Oil Hydraulic',
  'Steering',
  'Articulated',
  'Parking Brake',
  'Service Brake',
  'Control Panel',
  'Air Filter',
  'Wheel, Nut & Rim',
  'All Lamp',
  'Coolant Level',
  'Kaca Cabin & Spion',
  'Seat Belt',
  'Back Alarm',
  'Apar',
  'Komisioning',
  'Cylinder Hydraulic',
  'Radio',
]

const INITIAL_ATTACHMENT_ITEMS: string[] = [
  'Frame Handler',
  'Cylinder Hydraulic',
  'Hose Hydraulic',
  'Mounting Bolt',
  'Lock Pin Handler',
]

function defaultUnitItems(): InspectionCheckItem[] {
  return INITIAL_UNIT_ITEMS.map((name, index) => ({
    no: index + 1,
    name,
    status: '',
    keterangan: '',
  }))
}

function defaultAttachmentItems(): InspectionCheckItem[] {
  return INITIAL_ATTACHMENT_ITEMS.map((name, index) => ({
    no: index + 1,
    name,
    status: '',
    keterangan: '',
  }))
}

function defaultHourMeterRows(): HourMeterRow[] {
  return Array.from({ length: 4 }, () => ({
    start: '',
    stop: '',
    jam: '',
    tempat: '',
    keterangan: '',
  }))
}

function defaultDraft(): TyreHandlerDraft {
  return {
    header: {
      docNo: '',
      tglTerbit: '',
      revisi: '',
      unitNumber: '',
      operatorName: '',
      operatorSn: '',
      date: new Date().toISOString().slice(0, 10),
      shift: 'Pagi',
      siteName: '',
    },
    unitItems: defaultUnitItems(),
    attachmentItems: defaultAttachmentItems(),
    hourMeterRows: defaultHourMeterRows(),
    operatorSignature: '',
    supervisorSignature: '',
    operationNotes: '',
    supervisorOpName: '',
    supervisorOpSn: '',
    supervisorOpSignature: '',
    plantActionNotes: '',
    plantSignerName: '',
    plantSignerSn: '',
    plantSignature: '',
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

function removeCbOption(key: string, value: string) {
  const existing = loadCbOptions(key).filter((v) => v !== value)
  localStorage.setItem(`${CB_PREFIX}-${key}`, JSON.stringify(existing))
}

function sanitizeFilePart(v?: string): string {
  return (v || 'Unit').replace(/[^a-zA-Z0-9_-]/g, '_')
}

function formatPublishDate(d?: string): string {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length === 3) {
    const [year, month, day] = parts
    return `${parseInt(day, 10)}/${parseInt(month, 10)}/${year}`
  }
  return d
}

// Visual diagram of Tyre Handler Attachment with pointer callouts
function TyreHandlerDiagram({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn('relative flex items-center justify-center p-1', className)} style={style}>
      <img
        src="/service-forms/tyre-handler-attachment.png"
        alt="Diagram Attachment Tyre Handler"
        className="max-h-full max-w-full object-contain"
        style={{ maxHeight: '72mm', width: 'auto' }}
      />
    </div>
  )
}

// Cipta Kridatama (CK) Logo
function CkLogo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn('flex items-center justify-start', className)} style={style}>
      <img
        src="/brand/cipta-kridatama-logo.png"
        alt="Cipta Kridatama Logo"
        style={{ maxHeight: '24mm', maxWidth: '52mm', objectFit: 'contain' }}
      />
    </div>
  )
}

// PDF Printable Template for A4 Portrait
function PdfPage({
  payload,
  pageRef,
}: {
  payload: TyreHandlerDraft
  pageRef: React.RefObject<HTMLDivElement | null>
}) {
  const {
    header,
    unitItems,
    attachmentItems,
    hourMeterRows,
    operatorSignature,
    supervisorSignature,
    operationNotes,
    supervisorOpName,
    supervisorOpSn,
    supervisorOpSignature,
    plantActionNotes,
    plantSignerName,
    plantSignerSn,
    plantSignature,
  } = payload

  return (
    <div
      ref={pageRef}
      style={{
        width: '210mm',
        height: '297mm',
        minHeight: '297mm',
        maxHeight: '297mm',
        padding: '7mm 10mm 7mm 10mm',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
      }}
    >
      {/* Top Classification Banner (Absolute Top Center) */}
      <div
        style={{
          position: 'absolute',
          top: '2.5mm',
          left: 0,
          right: 0,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontSize: '8pt', fontWeight: 'bold', color: '#eab308', letterSpacing: '0.2px' }}>
          Internal information - Yellow - Mahadasha Group
        </span>
      </div>

      {/* Top Header: Logo, Title, Document Box */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2.5mm' }}>
        {/* Logo */}
        <div style={{ width: '52mm' }}>
          <CkLogo />
        </div>

        {/* Title */}
        <div style={{ flex: 1, textAlign: 'center', paddingTop: '2mm' }}>
          <h1
            style={{
              fontSize: '11pt',
              fontWeight: 900,
              textTransform: 'uppercase',
              margin: 0,
              lineHeight: 1.25,
              letterSpacing: '0.2px',
              color: '#000000',
            }}
          >
            LAPORAN PEMERIKSAAN<br />HARIAN TYRE HANDLER
          </h1>
        </div>

        {/* Document Box */}
        <div
          style={{
            width: '56mm',
            border: '0.75px solid #000000',
            padding: '1.5mm 2.5mm',
            fontSize: '7.5pt',
            lineHeight: 1.4,
            fontWeight: 'bold',
            color: '#000000',
          }}
        >
          <div style={{ display: 'flex' }}>
            <span style={{ width: '18mm' }}>No</span>
            <span>: {header.docNo || ''}</span>
          </div>
          <div style={{ display: 'flex' }}>
            <span style={{ width: '18mm' }}>Tgl. Terbit</span>
            <span>: {formatPublishDate(header.tglTerbit)}</span>
          </div>
          <div style={{ display: 'flex' }}>
            <span style={{ width: '18mm' }}>Revisi</span>
            <span>: {header.revisi || ''}</span>
          </div>
        </div>
      </div>

      {/* Meta Info Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '7.5pt',
          fontWeight: 'bold',
          marginBottom: '2.5mm',
          color: '#000000',
        }}
      >
        <div style={{ width: '55%' }}>
          <div style={{ display: 'flex', marginBottom: '0.8mm' }}>
            <span style={{ width: '28mm' }}>NO UNIT</span>
            <span>: {header.unitNumber || '-'}</span>
          </div>
          <div style={{ display: 'flex', marginBottom: '0.8mm' }}>
            <span style={{ width: '28mm' }}>OPERATOR</span>
            <span>: {header.operatorName || '-'}</span>
          </div>
          <div style={{ display: 'flex' }}>
            <span style={{ width: '28mm' }}>SN OPERATOR</span>
            <span>: {header.operatorSn || '-'}</span>
          </div>
        </div>

        <div style={{ width: '40%' }}>
          <div style={{ display: 'flex', marginBottom: '0.8mm' }}>
            <span style={{ width: '22mm' }}>TANGGAL</span>
            <span>: {header.date || '-'}</span>
          </div>
          <div style={{ display: 'flex' }}>
            <span style={{ width: '22mm' }}>SHIFT</span>
            <span>: {header.shift || '-'}</span>
          </div>
        </div>
      </div>

      {/* 2-Column Main Section matching physical scan 1:1 */}
      <div style={{ display: 'flex', gap: '4mm', marginBottom: '2.5mm' }}>
        {/* Left Column (95mm): Table 1 (19 items) + Table 3 (Jam Kerja Unit) */}
        <div style={{ width: '95mm' }}>
          {/* Table 1: Unit Inspection (19 items) */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '0.6px solid #000000',
              fontSize: '6.5pt',
              color: '#000000',
              tableLayout: 'fixed',
              marginBottom: '2mm',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#ffffff' }}>
                <th style={{ border: '0.6px solid #000000', width: '7mm', padding: '1px', textAlign: 'center', fontWeight: 'bold' }}>NO</th>
                <th style={{ border: '0.6px solid #000000', width: '38mm', padding: '1px 3px', textAlign: 'left', fontWeight: 'bold' }}>Dafter Pemeriksaan</th>
                <th style={{ border: '0.6px solid #000000', width: '8mm', padding: '1px', textAlign: 'center', fontWeight: 'bold' }}>Baik</th>
                <th style={{ border: '0.6px solid #000000', width: '8mm', padding: '1px', textAlign: 'center', fontWeight: 'bold' }}>Tidak</th>
                <th style={{ border: '0.6px solid #000000', width: '34mm', padding: '1px 3px', textAlign: 'left', fontWeight: 'bold' }}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {unitItems.map((item) => (
                <tr key={item.no} style={{ height: '4.5mm' }}>
                  <td style={{ border: '0.6px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '0.5px' }}>{item.no}</td>
                  <td style={{ border: '0.6px solid #000000', padding: '0.5px 3px', whiteSpace: 'nowrap', overflow: 'hidden' }}>{item.name}</td>
                  <td style={{ border: '0.6px solid #000000', textAlign: 'center', fontWeight: '900', fontSize: '8.5pt', padding: '0' }}>
                    {item.status === 'baik' ? '☑' : ''}
                  </td>
                  <td style={{ border: '0.6px solid #000000', textAlign: 'center', fontWeight: '900', fontSize: '8.5pt', padding: '0' }}>
                    {item.status === 'tidak' ? '☒' : ''}
                  </td>
                  <td style={{ border: '0.6px solid #000000', padding: '0.5px 3px', fontSize: '6pt', overflow: 'hidden' }}>{item.keterangan || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Table 3: Jam Kerja Unit / Machine Hour Meter (directly below Table 1) */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '0.6px solid #000000',
              fontSize: '6.5pt',
              color: '#000000',
              tableLayout: 'fixed',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#ffffff', height: '10mm' }}>
                <th
                  colSpan={2}
                  style={{
                    border: '0.6px solid #000000',
                    width: '34mm',
                    padding: 0,
                    margin: 0,
                    verticalAlign: 'top',
                    height: '10mm',
                  }}
                >
                  <div
                    style={{
                      height: '5.5mm',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderBottom: '0.6px solid #000000',
                      padding: '0.5px',
                    }}
                  >
                    <div style={{ fontSize: '6.5pt', fontWeight: 'bold', lineHeight: 1 }}>Jam Kerja Unit</div>
                    <div style={{ fontSize: '5pt', fontWeight: 'normal', lineHeight: 1, marginTop: '1px' }}>Machine Hour Meter</div>
                  </div>
                  <div style={{ height: '4.5mm', display: 'flex', width: '100%' }}>
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRight: '0.6px solid #000000',
                        fontSize: '6pt',
                        fontWeight: 'bold',
                      }}
                    >
                      Start
                    </div>
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '6pt',
                        fontWeight: 'bold',
                      }}
                    >
                      Stop
                    </div>
                  </div>
                </th>
                <th
                  style={{
                    border: '0.6px solid #000000',
                    width: '14mm',
                    height: '10mm',
                    padding: '1px',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontWeight: 'bold',
                    fontSize: '6.5pt',
                  }}
                >
                  Jam
                </th>
                <th
                  style={{
                    border: '0.6px solid #000000',
                    width: '20mm',
                    height: '10mm',
                    padding: '1px',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontWeight: 'bold',
                    fontSize: '6.5pt',
                  }}
                >
                  Tempat
                </th>
                <th
                  style={{
                    border: '0.6px solid #000000',
                    width: '27mm',
                    height: '10mm',
                    padding: '1px',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontWeight: 'bold',
                    fontSize: '6.5pt',
                  }}
                >
                  Keterangan
                </th>
              </tr>
            </thead>
            <tbody>
              {hourMeterRows.map((row, idx) => (
                <tr key={idx} style={{ height: '4.5mm' }}>
                  <td style={{ border: '0.6px solid #000000', textAlign: 'center', padding: '0.5px' }}>{row.start || ''}</td>
                  <td style={{ border: '0.6px solid #000000', textAlign: 'center', padding: '0.5px' }}>{row.stop || ''}</td>
                  <td style={{ border: '0.6px solid #000000', textAlign: 'center', padding: '0.5px' }}>{row.jam || ''}</td>
                  <td style={{ border: '0.6px solid #000000', padding: '0.5px 2px' }}>{row.tempat || ''}</td>
                  <td style={{ border: '0.6px solid #000000', padding: '0.5px 2px' }}>{row.keterangan || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right Column (95mm): Table 2 (Attachment - 5 items) + Diagram */}
        <div style={{ width: '95mm' }}>
          {/* Table 2: Attachment Inspection (5 items) */}
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '0.6px solid #000000',
              fontSize: '6.5pt',
              color: '#000000',
              tableLayout: 'fixed',
              marginBottom: '2.5mm',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#ffffff' }}>
                <th style={{ border: '0.6px solid #000000', width: '7mm', padding: '1px', textAlign: 'center', fontWeight: 'bold' }}>No</th>
                <th style={{ border: '0.6px solid #000000', width: '38mm', padding: '1px 3px', textAlign: 'left', fontWeight: 'bold' }}>Daftar Pemeriksaan</th>
                <th style={{ border: '0.6px solid #000000', width: '8mm', padding: '1px', textAlign: 'center', fontWeight: 'bold' }}>Baik</th>
                <th style={{ border: '0.6px solid #000000', width: '8mm', padding: '1px', textAlign: 'center', fontWeight: 'bold' }}>Tidak</th>
                <th style={{ border: '0.6px solid #000000', width: '34mm', padding: '1px 3px', textAlign: 'left', fontWeight: 'bold' }}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {attachmentItems.map((item) => (
                <tr key={item.no} style={{ height: '4.5mm' }}>
                  <td style={{ border: '0.6px solid #000000', textAlign: 'center', fontWeight: 'bold', padding: '0.5px' }}>{item.no}</td>
                  <td style={{ border: '0.6px solid #000000', padding: '0.5px 3px', whiteSpace: 'nowrap', overflow: 'hidden' }}>{item.name}</td>
                  <td style={{ border: '0.6px solid #000000', textAlign: 'center', fontWeight: '900', fontSize: '8.5pt', padding: '0' }}>
                    {item.status === 'baik' ? '☑' : ''}
                  </td>
                  <td style={{ border: '0.6px solid #000000', textAlign: 'center', fontWeight: '900', fontSize: '8.5pt', padding: '0' }}>
                    {item.status === 'tidak' ? '☒' : ''}
                  </td>
                  <td style={{ border: '0.6px solid #000000', padding: '0.5px 3px', fontSize: '6pt', overflow: 'hidden' }}>{item.keterangan || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Diagram Container (clean image matching scan) */}
          <div
            style={{
              padding: '1mm',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ffffff',
              height: '82mm',
            }}
          >
            <TyreHandlerDiagram className="h-full w-full" />
          </div>
        </div>
      </div>

      {/* Middle Signatures: Operator & Pengawas with solid underline */}
      <div style={{ display: 'flex', justifyContent: 'space-around', margin: '2mm 0 2.5mm 0' }}>
        {/* Operator */}
        <div style={{ textAlign: 'center', width: '60mm' }}>
          <div style={{ height: '14mm', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1mm' }}>
            {operatorSignature ? (
              <img src={operatorSignature} alt="TTD Operator" style={{ maxHeight: '14mm', maxWidth: '45mm', objectFit: 'contain' }} />
            ) : null}
          </div>
          <div style={{ borderTop: '1px solid #000000', paddingTop: '1mm', fontSize: '7.5pt', fontWeight: 'bold', color: '#000000', width: '50mm', margin: '0 auto' }}>
            Operator {header.operatorName ? `(${header.operatorName})` : ''}
          </div>
        </div>

        {/* Pengawas */}
        <div style={{ textAlign: 'center', width: '60mm' }}>
          <div style={{ height: '14mm', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1mm' }}>
            {supervisorSignature ? (
              <img src={supervisorSignature} alt="TTD Pengawas" style={{ maxHeight: '14mm', maxWidth: '45mm', objectFit: 'contain' }} />
            ) : null}
          </div>
          <div style={{ borderTop: '1px solid #000000', paddingTop: '1mm', fontSize: '7.5pt', fontWeight: 'bold', color: '#000000', width: '50mm', margin: '0 auto' }}>
            Pengawas
          </div>
        </div>
      </div>

      {/* Bottom Feedback / Action Boxes */}
      <div style={{ border: '0.6px solid #000000', fontSize: '6.5pt', color: '#000000', marginBottom: '4mm' }}>
        {/* Box 1: Operation Notes */}
        <div style={{ display: 'flex', borderBottom: '0.6px solid #000000', minHeight: '16mm' }}>
          <div style={{ width: '65%', borderRight: '0.6px solid #000000', padding: '2mm' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '1mm' }}>
              Tambahan Catatan : Keluhan, Kejadian, Kerusakan oleh Departemen Operation
            </div>
            <div style={{ fontSize: '6.5pt', lineHeight: 1.3, whiteSpace: 'pre-wrap' }}>
              {operationNotes || '-'}
            </div>
          </div>
          <div style={{ flex: 1, padding: '2mm', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '6pt', fontWeight: 'bold' }}>
              Nama,SN,Tanda Tangan Pengawas:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1mm' }}>
              <div style={{ fontSize: '6pt' }}>
                <div>Nama: {supervisorOpName || '-'}</div>
                <div>SN: {supervisorOpSn || '-'}</div>
              </div>
              <div style={{ height: '10mm', width: '25mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {supervisorOpSignature ? (
                  <img src={supervisorOpSignature} alt="TTD Pengawas Op" style={{ maxHeight: '10mm', maxWidth: '25mm', objectFit: 'contain' }} />
                ) : (
                  <div style={{ borderBottom: '1px dashed #9ca3af', width: '22mm', height: '8mm' }} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Box 2: Plant Team Follow-up */}
        <div style={{ display: 'flex', minHeight: '16mm' }}>
          <div style={{ width: '65%', borderRight: '0.6px solid #000000', padding: '2mm' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '1mm' }}>
              Tindak Lanjut/Perbaikan/Komentar oleh tim Plant
            </div>
            <div style={{ fontSize: '6.5pt', lineHeight: 1.3, whiteSpace: 'pre-wrap' }}>
              {plantActionNotes || '-'}
            </div>
          </div>
          <div style={{ flex: 1, padding: '2mm', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '6pt', fontWeight: 'bold' }}>
              Nama,SN,Tanda Tangan Tim Plant:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1mm' }}>
              <div style={{ fontSize: '6pt' }}>
                <div>Nama: {plantSignerName || '-'}</div>
                <div>SN: {plantSignerSn || '-'}</div>
              </div>
              <div style={{ height: '10mm', width: '25mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {plantSignature ? (
                  <img src={plantSignature} alt="TTD Tim Plant" style={{ maxHeight: '10mm', maxWidth: '25mm', objectFit: 'contain' }} />
                ) : (
                  <div style={{ borderBottom: '1px dashed #9ca3af', width: '22mm', height: '8mm' }} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Classification Banner (Absolute Bottom Center) */}
      <div
        style={{
          position: 'absolute',
          bottom: '2.5mm',
          left: 0,
          right: 0,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontSize: '8pt', fontWeight: 'bold', color: '#eab308', letterSpacing: '0.2px' }}>
          Internal information - Yellow - Mahadasha Group
        </span>
      </div>
    </div>
  )
}

export function TyreHandlerInspectionForm({
  mobile = false,
  onBackToHub,
}: {
  mobile?: boolean
  onBackToHub?: () => void
}) {
  const [siteOptions, setSiteOptions] = useState<string[]>([])
  const [userContext, setUserContext] = useState<ServiceFormUserContext | null>(null)
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form')
  const [draft, setDraft] = useState<TyreHandlerDraft>(defaultDraft())
  const [records, setRecords] = useState<TyreHandlerRecord[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [pdfPayload, setPdfPayload] = useState<TyreHandlerDraft>(defaultDraft())
  const pdfRef = useRef<HTMLDivElement>(null)

  // Signature canvas modal state
  const [sigModalKey, setSigModalKey] = useState<string | null>(null)
  const sigCanvasRef = useRef<SignatureCanvas | null>(null)

  // Employees & Sites state
  const [employeesList, setEmployeesList] = useState<{ id: number; name: string; employeeSn: string }[]>([])
  const [operatorOptions, setOperatorOptions] = useState<string[]>([])

  // Fetch employees and user context
  useEffect(() => {
    getServiceFormUserContext().then((ctx) => {
      setUserContext(ctx)
    })

    let active = true
    getEmployees().then((res) => {
      if (!active || !res.success) return
      setEmployeesList(res.data)
      const dbNames = res.data.map((e) => e.name)
      const localNames = loadCbOptions('operator-name')
      const merged = Array.from(new Set([...dbNames, ...localNames])).filter(Boolean)
      setOperatorOptions(merged)
    })
    return () => {
      active = false
    }
  }, [])

  const canEditHistory = Boolean(userContext?.isSuperAdmin || userContext?.canEdit)

  const visibleRecords = useMemo(() => {
    const isGlobal = Boolean(userContext?.isSuperAdmin || userContext?.dataScope === 'global')
    const userName = (userContext?.name || '').trim().toLowerCase()
    const userSn = (userContext?.employeeSn || '').trim().toLowerCase()
    const userId = userContext?.userId

    return records.filter((r) => {
      if (isGlobal || !userContext) return true
      const recOperator = (r.header.operatorName || '').trim().toLowerCase()
      const recSupervisor = (r.supervisorOpName || '').trim().toLowerCase()
      const recPlant = (r.plantSignerName || '').trim().toLowerCase()
      const recCreator = (r.createdByName || '').trim().toLowerCase()
      return (
        (userName && (recOperator.includes(userName) || recSupervisor.includes(userName) || recPlant.includes(userName) || recCreator.includes(userName))) ||
        (userSn && (
          (r.createdBySn && r.createdBySn.toLowerCase() === userSn) ||
          (r.header.operatorSn && r.header.operatorSn.toLowerCase() === userSn)
        )) ||
        (userId && r.createdByUserId === userId)
      )
    })
  }, [records, userContext])

  // Fetch sites
  useEffect(() => {
    let active = true
    getSites().then((res) => {
      if (!active || !res.success) return
      const opts = res.data.map((s) => s.name)
      setSiteOptions(opts)
      if (opts.length > 0 && !draft.header.siteName) {
        setDraft((prev) => ({
          ...prev,
          header: { ...prev.header, siteName: opts[0] },
        }))
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

  // Save records to storage
  useEffect(() => {
    if (!hasLoaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    } catch {
      // ignore
    }
  }, [hasLoaded, records])

  // Handle header updates
  const updateHeader = useCallback(
    (field: keyof TyreHandlerHeader, value: string) => {
      setDraft((prev) => ({
        ...prev,
        header: { ...prev.header, [field]: value },
      }))
    },
    []
  )

  // Handle operator change with auto-fill SN
  const handleOperatorChange = useCallback(
    (value: string) => {
      const matched = employeesList.find(
        (e) => e.name.trim().toLowerCase() === value.trim().toLowerCase()
      )
      setDraft((prev) => ({
        ...prev,
        header: {
          ...prev.header,
          operatorName: value,
          operatorSn: matched ? matched.employeeSn : prev.header.operatorSn,
        },
      }))
      if (value.trim()) {
        saveCbOption('operator-name', value.trim())
      }
    },
    [employeesList]
  )

  // Toggle unit item status
  const handleToggleUnitStatus = useCallback((index: number, targetStatus: InspectionItemStatus) => {
    setDraft((prev) => {
      const next = [...prev.unitItems]
      const curr = next[index].status
      next[index] = {
        ...next[index],
        status: curr === targetStatus ? '' : targetStatus,
      }
      return { ...prev, unitItems: next }
    })
  }, [])

  const handleUnitKeteranganChange = useCallback((index: number, val: string) => {
    setDraft((prev) => {
      const next = [...prev.unitItems]
      next[index] = { ...next[index], keterangan: val }
      return { ...prev, unitItems: next }
    })
  }, [])

  // Toggle attachment item status
  const handleToggleAttachmentStatus = useCallback((index: number, targetStatus: InspectionItemStatus) => {
    setDraft((prev) => {
      const next = [...prev.attachmentItems]
      const curr = next[index].status
      next[index] = {
        ...next[index],
        status: curr === targetStatus ? '' : targetStatus,
      }
      return { ...prev, attachmentItems: next }
    })
  }, [])

  const handleAttachmentKeteranganChange = useCallback((index: number, val: string) => {
    setDraft((prev) => {
      const next = [...prev.attachmentItems]
      next[index] = { ...next[index], keterangan: val }
      return { ...prev, attachmentItems: next }
    })
  }, [])

  // Bulk status helpers
  const handleSetAllUnitStatus = useCallback((status: InspectionItemStatus) => {
    setDraft((prev) => ({
      ...prev,
      unitItems: prev.unitItems.map((item) => ({ ...item, status })),
    }))
  }, [])

  const handleSetAllAttachmentStatus = useCallback((status: InspectionItemStatus) => {
    setDraft((prev) => ({
      ...prev,
      attachmentItems: prev.attachmentItems.map((item) => ({ ...item, status })),
    }))
  }, [])

  // Hour meter updates
  const handleHourMeterChange = useCallback(
    (index: number, field: keyof HourMeterRow, value: string) => {
      setDraft((prev) => {
        const next = [...prev.hourMeterRows]
        next[index] = { ...next[index], [field]: value }
        return { ...prev, hourMeterRows: next }
      })
    },
    []
  )

  // Save record
  const saveRecord = useCallback(() => {
    if (!draft.header.unitNumber.trim()) {
      window.alert('Mohon isi No Unit terlebih dahulu.')
      return
    }

    if (draft.header.operatorName.trim()) {
      saveCbOption('operator-name', draft.header.operatorName.trim())
      const dbNames = employeesList.map((e) => e.name)
      const localNames = loadCbOptions('operator-name')
      setOperatorOptions(Array.from(new Set([...dbNames, ...localNames])).filter(Boolean))
    }

    const now = new Date().toISOString()
    if (editingId) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? {
                ...draft,
                id: editingId,
                createdAt: r.createdAt,
                updatedAt: now,
                createdByUserId: r.createdByUserId || userContext?.userId || undefined,
                createdBySn: r.createdBySn || userContext?.employeeSn || undefined,
                createdByName: r.createdByName || userContext?.name || undefined,
              }
            : r
        )
      )
      setEditingId(null)
    } else {
      const newRec: TyreHandlerRecord = {
        ...draft,
        id: `th-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
        createdByUserId: userContext?.userId || undefined,
        createdBySn: userContext?.employeeSn || undefined,
        createdByName: userContext?.name || undefined,
      }
      setRecords((prev) => [newRec, ...prev])
    }
    window.alert('Data Laporan Pemeriksaan Tyre Handler berhasil disimpan!')
  }, [draft, editingId, employeesList, userContext])

  // Reset form
  const resetForm = useCallback(() => {
    if (window.confirm('Reset semua input form ke awal?')) {
      setDraft(defaultDraft())
      setEditingId(null)
    }
  }, [])

  // Edit existing
  const editRecord = useCallback((record: TyreHandlerRecord) => {
    if (!canEditHistory) {
      window.alert('Anda hanya memiliki izin melihat riwayat dan tidak dapat mengedit data.')
      return
    }
    setDraft({
      header: { ...record.header },
      unitItems: record.unitItems.map((i) => ({ ...i })),
      attachmentItems: record.attachmentItems.map((i) => ({ ...i })),
      hourMeterRows: record.hourMeterRows.map((h) => ({ ...h })),
      operatorSignature: record.operatorSignature || '',
      supervisorSignature: record.supervisorSignature || '',
      operationNotes: record.operationNotes || '',
      supervisorOpName: record.supervisorOpName || '',
      supervisorOpSn: record.supervisorOpSn || '',
      supervisorOpSignature: record.supervisorOpSignature || '',
      plantActionNotes: record.plantActionNotes || '',
      plantSignerName: record.plantSignerName || '',
      plantSignerSn: record.plantSignerSn || '',
      plantSignature: record.plantSignature || '',
    })
    setEditingId(record.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [canEditHistory])

  // Delete record
  const deleteRecord = useCallback((id: string) => {
    if (!canEditHistory) {
      window.alert('Anda tidak memiliki izin menghapus data riwayat.')
      return
    }
    if (window.confirm('Hapus riwayat form ini?')) {
      setRecords((prev) => prev.filter((r) => r.id !== id))
    }
  }, [canEditHistory])

  // Generate PDF
  const downloadPdf = useCallback(async (dataToPrint = draft) => {
    setIsGenerating(true)
    setPdfPayload(dataToPrint)

    try {
      await new Promise((resolve) => setTimeout(resolve, 300))
      const node = pdfRef.current
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

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297)
      const fileName = `Pemeriksaan-Tyre-Handler-${sanitizeFilePart(dataToPrint.header.unitNumber)}-${dataToPrint.header.date || 'draft'}.pdf`
      pdf.save(fileName)
    } catch (err) {
      console.error('[tyre-handler] gagal membuat PDF:', err)
      window.alert('Gagal mendownload PDF. Silakan coba kembali.')
    } finally {
      setIsGenerating(false)
    }
  }, [draft])

  // Save modal signature
  const saveModalSignature = () => {
    if (!sigCanvasRef.current || !sigModalKey) return
    const dataUrl = sigCanvasRef.current.isEmpty() ? '' : sigCanvasRef.current.toDataURL('image/png')
    setDraft((prev) => ({
      ...prev,
      [sigModalKey]: dataUrl,
    }))
    setSigModalKey(null)
  }

  return (
    <>
      <div className={cn('space-y-4', mobile && 'pb-20')}>
        {/* Top Back & Header Bar */}
        {onBackToHub && (
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="dense"
              onClick={onBackToHub}
              className="h-8 gap-1.5 px-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="size-4" />
              Menu Hub
            </Button>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                Tyre Handler
              </span>
              {editingId && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  Edit
                </span>
              )}
            </div>
          </div>
        )}

        {/* Mobile Segmented Toggle */}
        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all',
              activeTab === 'form' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            )}
          >
            <Pencil className="size-3.5" />
            Isi Form
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg py-2 transition-all',
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            )}
          >
            <Save className="size-3.5" />
            Riwayat ({visibleRecords.length})
          </button>
        </div>

        {activeTab === 'form' && (
          <div className="space-y-6">
            {/* Header Info Card */}
            <div className={cn('rounded-xl border bg-card p-4 shadow-sm space-y-4', mobile && 'p-3')}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    Laporan Pemeriksaan Harian Tyre Handler
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Dokumen: {draft.header.docNo || '-'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={resetForm} className="h-8 text-xs">
                    <RotateCcw className="mr-1.5 size-3.5" />
                    Reset
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={saveRecord} className="h-8 px-3 text-xs font-semibold">
                    <Save className="mr-1.5 size-3.5" />
                    {editingId ? 'Update Form' : 'Submit Form'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => downloadPdf(draft)}
                    disabled={isGenerating}
                    className="h-8 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="mr-1.5 size-3.5" />
                        Download PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>

        {/* Document Metadata Inputs */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-700">No. Dokumen</Label>
            <Input
              value={draft.header.docNo}
              onChange={(e) => updateHeader('docNo', e.target.value)}
              placeholder="Contoh: CK-BIB-FM-MIN-01-01-(2)"
              className="h-8 text-xs font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-700">Tgl. Terbit</Label>
            <Input
              type="date"
              value={draft.header.tglTerbit}
              onChange={(e) => updateHeader('tglTerbit', e.target.value)}
              className="h-8 text-xs font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-gray-700">Revisi</Label>
            <Input
              value={draft.header.revisi}
              onChange={(e) => updateHeader('revisi', e.target.value)}
              placeholder="Contoh: 02"
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* Main Form Fields */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-base font-semibold">1. Identitas Unit & Operator</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {/* Unit No */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">No Unit *</Label>
              <Input
                value={draft.header.unitNumber}
                onChange={(e) => updateHeader('unitNumber', e.target.value.toUpperCase())}
                placeholder="Contoh: TH-01"
                className="h-9 text-xs uppercase"
              />
            </div>

            {/* Operator */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Nama Operator</Label>
              <Combobox
                options={operatorOptions}
                value={draft.header.operatorName}
                onChange={handleOperatorChange}
                placeholder="Cari / ketik nama operator..."
                emptyText="Operator tidak ditemukan."
                className="h-9 text-xs font-normal border-0 border-b-2 border-b-transparent ring-0 shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)] focus-visible:border-b-primary"
              />
            </div>

            {/* SN Operator */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">SN Operator</Label>
              <Input
                value={draft.header.operatorSn}
                onChange={(e) => updateHeader('operatorSn', e.target.value)}
                placeholder="SN Operator..."
                className="h-9 text-xs"
              />
            </div>

            {/* Tanggal */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Tanggal</Label>
              <Input
                type="date"
                value={draft.header.date}
                onChange={(e) => updateHeader('date', e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Shift */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Shift</Label>
              <Select
                value={draft.header.shift || 'Pagi'}
                onValueChange={(v) => updateHeader('shift', v)}
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
        </CardContent>
      </Card>

      {/* Two Column Layout: Table 1 (Unit) & Table 2 (Attachment) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Table 1 Unit Checklist (7 cols) */}
        <Card className="lg:col-span-7 rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-semibold">2. Pemeriksaan Unit (19 Item)</CardTitle>
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="dense"
                onClick={() => handleSetAllUnitStatus('baik')}
                className="text-emerald-700 hover:bg-emerald-50 text-xs"
              >
                <Check className="mr-1 size-3.5" />
                Semua Baik
              </Button>
              <Button
                type="button"
                variant="outline"
                size="dense"
                onClick={() => handleSetAllUnitStatus('')}
                className="text-gray-600 text-xs"
              >
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table className="text-xs">
                <TableHeader className="bg-gray-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-10 text-center">No</TableHead>
                    <TableHead className="w-44">Daftar Pemeriksaan</TableHead>
                    <TableHead className="w-24 text-center">Kondisi</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {draft.unitItems.map((item, idx) => (
                    <TableRow key={item.no} className="hover:bg-gray-50/80">
                      <TableCell className="text-center font-bold text-gray-500 py-2">
                        {item.no}
                      </TableCell>
                      <TableCell className="font-medium text-gray-900 py-2">
                        {item.name}
                      </TableCell>
                      <TableCell className="py-1">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleUnitStatus(idx, 'baik')}
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded border transition-colors font-bold',
                              item.status === 'baik'
                                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                                : 'border-gray-200 bg-white text-gray-400 hover:border-emerald-300'
                            )}
                            title="Kondisi Baik"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleUnitStatus(idx, 'tidak')}
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded border transition-colors font-bold',
                              item.status === 'tidak'
                                ? 'border-red-600 bg-red-600 text-white shadow-sm'
                                : 'border-gray-200 bg-white text-gray-400 hover:border-red-300'
                            )}
                            title="Kondisi Tidak Baik"
                          >
                            ✕
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="py-1">
                        <Input
                          value={item.keterangan}
                          onChange={(e) => handleUnitKeteranganChange(idx, e.target.value)}
                          placeholder="Catatan..."
                          className="h-7 text-xs"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Right: Table 2 Attachment Checklist & Diagram (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-100">
              <CardTitle className="text-base font-semibold">3. Attachment Tyre Handler</CardTitle>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="dense"
                  onClick={() => handleSetAllAttachmentStatus('baik')}
                  className="text-emerald-700 hover:bg-emerald-50 text-xs"
                >
                  <Check className="mr-1 size-3.5" />
                  Semua Baik
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="w-10 text-center">No</TableHead>
                      <TableHead className="w-36">Komponen</TableHead>
                      <TableHead className="w-24 text-center">Kondisi</TableHead>
                      <TableHead>Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draft.attachmentItems.map((item, idx) => (
                      <TableRow key={item.no} className="hover:bg-gray-50/80">
                        <TableCell className="text-center font-bold text-gray-500 py-2">
                          {item.no}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 py-2">
                          {item.name}
                        </TableCell>
                        <TableCell className="py-1">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleAttachmentStatus(idx, 'baik')}
                              className={cn(
                                'flex h-7 w-7 items-center justify-center rounded border transition-colors font-bold',
                                item.status === 'baik'
                                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                                  : 'border-gray-200 bg-white text-gray-400 hover:border-emerald-300'
                              )}
                              title="Kondisi Baik"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleAttachmentStatus(idx, 'tidak')}
                              className={cn(
                                'flex h-7 w-7 items-center justify-center rounded border transition-colors font-bold',
                                item.status === 'tidak'
                                  ? 'border-red-600 bg-red-600 text-white shadow-sm'
                                  : 'border-gray-200 bg-white text-gray-400 hover:border-red-300'
                              )}
                              title="Kondisi Tidak Baik"
                            >
                              ✕
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="py-1">
                          <Input
                            value={item.keterangan}
                            onChange={(e) => handleAttachmentKeteranganChange(idx, e.target.value)}
                            placeholder="Catatan..."
                            className="h-7 text-xs"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Attachment Diagram Card */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-2 border-b border-gray-100">
              <CardTitle className="text-sm font-semibold text-gray-700">
                Diagram Referensi Attachment
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-2">
                <TyreHandlerDiagram />
                <div className="mt-2 flex justify-around text-xs text-gray-600 font-medium">
                  <span>① Frame Handler / Gripper</span>
                  <span>② Cylinder Hydraulic</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Table 3: Machine Hour Meter */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-base font-semibold">4. Jam Kerja Unit (Machine Hour Meter)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-32 text-center">HM Start</TableHead>
                  <TableHead className="w-32 text-center">HM Stop</TableHead>
                  <TableHead className="w-28 text-center">Jam Kerja</TableHead>
                  <TableHead className="w-44">Tempat / Lokasi</TableHead>
                  <TableHead>Keterangan Aktivitas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.hourMeterRows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="p-2">
                      <Input
                        value={row.start}
                        onChange={(e) => handleHourMeterChange(idx, 'start', e.target.value)}
                        placeholder="Contoh: 12450.5"
                        className="h-8 text-xs text-center"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        value={row.stop}
                        onChange={(e) => handleHourMeterChange(idx, 'stop', e.target.value)}
                        placeholder="Contoh: 12458.0"
                        className="h-8 text-xs text-center"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        value={row.jam}
                        onChange={(e) => handleHourMeterChange(idx, 'jam', e.target.value)}
                        placeholder="Contoh: 07:00 - 15:00"
                        className="h-8 text-xs text-center"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        value={row.tempat}
                        onChange={(e) => handleHourMeterChange(idx, 'tempat', e.target.value)}
                        placeholder="Pit / Workshop..."
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        value={row.keterangan}
                        onChange={(e) => handleHourMeterChange(idx, 'keterangan', e.target.value)}
                        placeholder="Deskripsi pekerjaan..."
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

      {/* Signatures & Approvals */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Operator Signature */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-semibold">Tanda Tangan Operator</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="dense"
              onClick={() => setSigModalKey('operatorSignature')}
            >
              <PenLine className="mr-1 size-3.5" />
              {draft.operatorSignature ? 'Ubah TTD' : 'Tanda Tangan'}
            </Button>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col items-center justify-center min-h-[100px]">
            {draft.operatorSignature ? (
              <div className="relative group">
                <img
                  src={draft.operatorSignature}
                  alt="TTD Operator"
                  className="max-h-20 max-w-[180px] object-contain"
                />
                <button
                  type="button"
                  onClick={() => setDraft((p) => ({ ...p, operatorSignature: '' }))}
                  className="absolute -top-2 -right-2 rounded-full bg-red-100 p-1 text-red-600 hover:bg-red-200"
                  title="Hapus Tanda Tangan"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">Belum ada tanda tangan operator</span>
            )}
          </CardContent>
        </Card>

        {/* Supervisor Signature */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-semibold">Tanda Tangan Pengawas</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="dense"
              onClick={() => setSigModalKey('supervisorSignature')}
            >
              <PenLine className="mr-1 size-3.5" />
              {draft.supervisorSignature ? 'Ubah TTD' : 'Tanda Tangan'}
            </Button>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col items-center justify-center min-h-[100px]">
            {draft.supervisorSignature ? (
              <div className="relative group">
                <img
                  src={draft.supervisorSignature}
                  alt="TTD Pengawas"
                  className="max-h-20 max-w-[180px] object-contain"
                />
                <button
                  type="button"
                  onClick={() => setDraft((p) => ({ ...p, supervisorSignature: '' }))}
                  className="absolute -top-2 -right-2 rounded-full bg-red-100 p-1 text-red-600 hover:bg-red-200"
                  title="Hapus Tanda Tangan"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">Belum ada tanda tangan pengawas</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operation & Plant Feedback Notes */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Box 1: Operation Notes */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-semibold">
              Catatan Keluhan / Kerusakan (Departemen Operation)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <Textarea
              value={draft.operationNotes}
              onChange={(e) => setDraft((p) => ({ ...p, operationNotes: e.target.value }))}
              placeholder="Tulis keluhan, kejadian, atau kerusakan oleh Dept. Operation..."
              rows={3}
              className="text-xs"
            />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <Label className="text-xs text-gray-600">Nama Pengawas</Label>
                <Input
                  value={draft.supervisorOpName}
                  onChange={(e) => setDraft((p) => ({ ...p, supervisorOpName: e.target.value }))}
                  placeholder="Nama pengawas..."
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">SN Pengawas</Label>
                <Input
                  value={draft.supervisorOpSn}
                  onChange={(e) => setDraft((p) => ({ ...p, supervisorOpSn: e.target.value }))}
                  placeholder="SN pengawas..."
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-gray-500">Tanda Tangan Pengawas (Op):</span>
              <Button
                type="button"
                variant="outline"
                size="dense"
                onClick={() => setSigModalKey('supervisorOpSignature')}
              >
                <PenLine className="mr-1 size-3.5" />
                {draft.supervisorOpSignature ? 'Ubah TTD' : 'Tanda Tangan'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Box 2: Plant Action Notes */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-semibold">
              Tindak Lanjut / Perbaikan / Komentar (Tim Plant)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <Textarea
              value={draft.plantActionNotes}
              onChange={(e) => setDraft((p) => ({ ...p, plantActionNotes: e.target.value }))}
              placeholder="Tulis tindakan lanjut atau perbaikan oleh Tim Plant..."
              rows={3}
              className="text-xs"
            />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <Label className="text-xs text-gray-600">Nama Tim Plant</Label>
                <Input
                  value={draft.plantSignerName}
                  onChange={(e) => setDraft((p) => ({ ...p, plantSignerName: e.target.value }))}
                  placeholder="Nama tim plant..."
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">SN Tim Plant</Label>
                <Input
                  value={draft.plantSignerSn}
                  onChange={(e) => setDraft((p) => ({ ...p, plantSignerSn: e.target.value }))}
                  placeholder="SN tim plant..."
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-gray-500">Tanda Tangan Tim Plant:</span>
              <Button
                type="button"
                variant="outline"
                size="dense"
                onClick={() => setSigModalKey('plantSignature')}
              >
                <PenLine className="mr-1 size-3.5" />
                {draft.plantSignature ? 'Ubah TTD' : 'Tanda Tangan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

            {/* Bottom Action Bar */}
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3.5">
              <Button type="button" variant="outline" size="dense" onClick={resetForm} className="h-9 px-3 text-xs">
                <RotateCcw className="mr-1.5 size-3.5" />
                Reset
              </Button>
              <Button type="button" variant="outline" size="dense" onClick={saveRecord} className="h-9 px-4 text-xs font-semibold">
                <Save className="mr-1.5 size-3.5" />
                {editingId ? 'Update Form' : 'Submit Form'}
              </Button>
              <Button
                type="button"
                size="dense"
                onClick={() => downloadPdf(draft)}
                disabled={isGenerating}
                className="h-9 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="mr-1.5 size-3.5" />
                    Download PDF
                  </>
                )}
              </Button>
            </div>

            {/* Mobile Sticky Action Bar */}
            <div className="fixed bottom-[64px] inset-x-0 mx-auto max-w-[430px] z-50 p-2.5 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl flex items-center gap-2 sm:hidden">
              <Button
                type="button"
                variant="outline"
                size="dense"
                onClick={resetForm}
                className="h-10 px-3 text-xs"
              >
                <RotateCcw className="size-3.5 mr-1" />
                Reset
              </Button>
              <Button
                type="button"
                size="dense"
                variant="outline"
                onClick={saveRecord}
                className="flex-1 h-10 text-xs font-bold"
              >
                <Save className="size-3.5 mr-1.5" />
                {editingId ? 'Update Form' : 'Submit Form'}
              </Button>
              <Button
                type="button"
                size="dense"
                onClick={() => downloadPdf(draft)}
                disabled={isGenerating}
                className="flex-1 h-10 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isGenerating ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Download className="size-3.5 mr-1.5" />
                )}
                Download PDF
              </Button>
            </div>
          </div>
        )}

        {/* History Records View */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Riwayat Tyre Handler</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {visibleRecords.length} Data
              </span>
            </div>

            {visibleRecords.length === 0 ? (
              <p className="text-center py-8 text-xs text-muted-foreground">
                Belum ada riwayat form pemeriksaan Tyre Handler yang tersimpan.
              </p>
            ) : (
              <>
                {/* Mobile Cards View */}
                <div className="space-y-2.5 sm:hidden">
                  {visibleRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">
                          {rec.header.unitNumber || 'No Unit -'}
                        </span>
                        <span className="font-mono text-xs text-slate-500">
                          {rec.header.date || '-'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
                        <div>
                          <span className="text-slate-400">Operator:</span> {rec.header.operatorName || '-'}
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400">Shift:</span> {rec.header.shift || '-'}
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                        {canEditHistory && (
                          <Button
                            type="button"
                            variant="outline"
                            size="dense"
                            onClick={() => {
                              editRecord(rec)
                              setActiveTab('form')
                            }}
                            className="h-8 px-3 text-xs"
                          >
                            <Pencil className="mr-1 size-3.5" />
                            Edit
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="dense"
                          onClick={() => downloadPdf(rec)}
                          disabled={isGenerating}
                          className="h-8 px-3 text-xs bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <Download className="mr-1 size-3.5" />
                          PDF
                        </Button>
                        {canEditHistory && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="denseIcon"
                            onClick={() => deleteRecord(rec.id)}
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block">
                  <MinimalTableShell label="History Tyre Handler">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>No Unit</TableHead>
                          <TableHead>Operator</TableHead>
                          <TableHead>Shift</TableHead>
                          <TableHead>Terakhir Diubah</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleRecords.map((rec) => (
                          <TableRow key={rec.id}>
                            <TableCell className="font-medium whitespace-nowrap">{rec.header.date || '-'}</TableCell>
                            <TableCell className="font-bold text-gray-900">{rec.header.unitNumber || '-'}</TableCell>
                            <TableCell>{rec.header.operatorName || '-'}</TableCell>
                            <TableCell>{rec.header.shift || '-'}</TableCell>
                            <TableCell className="text-gray-500 text-xs whitespace-nowrap">
                              {new Date(rec.updatedAt).toLocaleString('id-ID')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1.5">
                                {canEditHistory && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="dense"
                                    onClick={() => {
                                      editRecord(rec)
                                      setActiveTab('form')
                                    }}
                                  >
                                    <Pencil className="size-3.5 mr-1" />
                                    Edit
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="dense"
                                  onClick={() => downloadPdf(rec)}
                                  disabled={isGenerating}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <Download className="size-3.5 mr-1" />
                                  PDF
                                </Button>
                                {canEditHistory && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="dense"
                                    onClick={() => deleteRecord(rec.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </MinimalTableShell>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Signature Canvas Modal Dialog */}
      <Dialog open={Boolean(sigModalKey)} onOpenChange={(open) => !open && setSigModalKey(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tanda Tangan Digital</DialogTitle>
            <DialogDescription>
              Tuliskan tanda tangan Anda pada bidang kanvas di bawah ini.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-gray-300 bg-white p-2">
              <SignatureCanvas
                ref={sigCanvasRef}
                canvasProps={{
                  className: 'w-full h-44 rounded bg-white',
                }}
              />
            </div>
            <div className="flex justify-between gap-2">
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
                  variant="outline"
                  size="sm"
                  onClick={() => setSigModalKey(null)}
                >
                  Batal
                </Button>
                <Button type="button" size="sm" onClick={saveModalSignature}>
                  Simpan Tanda Tangan
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Off-screen PDF Page for Html2Canvas render */}
      <div style={{ position: 'fixed', left: '-10000px', top: '-10000px', zIndex: -100 }}>
        <PdfPage payload={pdfPayload} pageRef={pdfRef} />
      </div>
    </>
  )
}
