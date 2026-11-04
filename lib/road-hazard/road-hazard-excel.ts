import * as XLSX from 'xlsx'

export interface RoadHazardExcelData {
  sessionCode: string
  siteName: string
  customerName?: string
  inspectorName: string
  roadSection: string
  dateStr: string
  durationText: string
  totalDistanceText: string
  totalHazards: number
  potholesCount: number
  corrugationCount: number
  rutsCount: number
  severityLevel: string
  summaryNotes?: string
  events: Array<{
    hazardType: string
    confidence: number
    latitude: number | null
    longitude: number | null
    speedKmh: number | null
    photoUrl?: string
    notes?: string
    timestamp?: string
    isManualSnap?: boolean
  }>
}

export function generateRoadHazardExcel(data: RoadHazardExcelData): Blob {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Ringkasan Sesi Inspeksi
  const summaryRows = [
    ['LAPORAN ROAD HAZARD LIVE AI - HERO HSE SYSTEM'],
    ['KODE SESI', data.sessionCode || 'DRAFT'],
    ['SITE OPERASIONAL', data.siteName],
    ['CUSTOMER / OWNER', data.customerName || '-'],
    ['SEGMEN JALUR / RUTE', data.roadSection || 'Hauling Road'],
    ['PETUGAS INSPEKTUR', data.inspectorName],
    ['TANGGAL INSPEKSI', data.dateStr],
    ['DURASI PERJALANAN', data.durationText],
    ['ESTIMASI JARAK TEMPUH', data.totalDistanceText],
    ['LEVEL RISIKO KESELURUHAN', `${data.severityLevel} RISK`],
    [],
    ['RINGKASAN TEMUAN KERUSAKAN JALAN'],
    ['Jenis Kendala', 'Jumlah Titik', 'Tingkat Keparahan'],
    ['Potholes (Lubang Jalan)', data.potholesCount, data.potholesCount >= 5 ? 'KRITIS' : data.potholesCount >= 2 ? 'TINGGI' : 'RENDAH'],
    ['Corrugation (Jalan Keriting)', data.corrugationCount, data.corrugationCount >= 4 ? 'TINGGI' : 'SEDANG'],
    ['Ruts (Alur Roda Ambles)', data.rutsCount, data.rutsCount >= 3 ? 'TINGGI' : 'SEDANG'],
    ['TOTAL TITIK BAHAYA', data.totalHazards, data.severityLevel],
    [],
    ['CATATAN & REKOMENDASI TINDAKAN:'],
    [data.summaryNotes || 'Perlu perataan (grading) dan penimbunan batu agregat pada titik lubang aktif.'],
  ]

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 35 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Eksekutif')

  // Sheet 2: Detail Koordinat Titik Bahaya (Untuk Tim Road Maintenance / Grader)
  const detailHeaders = [
    'No',
    'Waktu',
    'Jenis Bahaya',
    'Akurasi AI (%)',
    'Kecepatan (km/h)',
    'Latitude',
    'Longitude',
    'Google Maps URL',
    'Tipe Snap',
    'Catatan / Rekomendasi Titik',
  ]

  const detailRows = data.events.map((ev, idx) => {
    const lat = ev.latitude != null ? Number(ev.latitude).toFixed(6) : '-'
    const lng = ev.longitude != null ? Number(ev.longitude).toFixed(6) : '-'
    const gmapsUrl =
      ev.latitude && ev.longitude
        ? `https://www.google.com/maps?q=${ev.latitude},${ev.longitude}`
        : '-'

    return [
      idx + 1,
      ev.timestamp || '-',
      ev.hazardType,
      `${Math.round(ev.confidence * 100)}%`,
      ev.speedKmh ? `${Number(ev.speedKmh).toFixed(1)} km/h` : '0.0 km/h',
      lat,
      lng,
      gmapsUrl,
      ev.isManualSnap ? 'Manual Snap' : 'Auto Detection AI',
      ev.notes || '-',
    ]
  })

  const wsDetails = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows])
  wsDetails['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 22 },
    { wch: 15 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 45 },
    { wch: 18 },
    { wch: 35 },
  ]
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Data Titik Maintenance')

  // Generate buffer array and Blob
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
