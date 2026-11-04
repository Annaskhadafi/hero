import jsPDF from 'jspdf'

export interface RoadHazardPdfEvent {
  hazardType: string
  confidence: number
  latitude?: number | string | null
  longitude?: number | string | null
  speedKmh?: number | string | null
  photoUrl?: string | null
  annotatedPhotoUrl?: string | null
  notes?: string | null
  createdAt?: string | null
}

export interface RoadHazardPdfData {
  sessionCode: string
  siteName: string
  customerName?: string
  inspectorName: string
  roadSection: string
  dateStr: string
  durationText: string
  totalDistanceText?: string
  totalHazards: number
  potholesCount: number
  corrugationCount: number
  rutsCount: number
  severityLevel: string
  summaryNotes?: string
  events: RoadHazardPdfEvent[]
}

async function fetchImageBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function generateRoadHazardPdf(data: RoadHazardPdfData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = 210
  const pageHeight = 297
  const margin = 14

  // --- Header Banner ---
  doc.setFillColor(15, 23, 42) // Primary dark #0f172a
  doc.rect(0, 0, pageWidth, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('HERO • ROAD HAZARD AI INSPECTION', margin, 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(203, 213, 225)
  doc.text('Laporan Rekapitulasi Deteksi Kerusakan & Bahaya Jalan Tambang', margin, 18)
  doc.text(`KODE: ${data.sessionCode}  |  TANGGAL: ${data.dateStr}`, margin, 24)

  // Status Badge in header
  const severityColor =
    data.severityLevel === 'CRITICAL'
      ? [225, 29, 72] // rose-600
      : data.severityLevel === 'HIGH'
      ? [234, 88, 12] // amber-600
      : data.severityLevel === 'MEDIUM'
      ? [202, 138, 4] // yellow-600
      : [16, 185, 129] // emerald-500

  doc.setFillColor(severityColor[0], severityColor[1], severityColor[2])
  doc.roundedRect(pageWidth - margin - 35, 8, 35, 12, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text(data.severityLevel, pageWidth - margin - 17.5, 15.5, { align: 'center' })

  let y = 35

  // --- Metadata Info Card ---
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, y, pageWidth - margin * 2, 24, 2, 2, 'FD')

  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'bold')
  doc.text('SITE / LOKASI:', margin + 4, y + 6)
  doc.text('INSPECTOR:', margin + 4, y + 12)
  doc.text('SEGMEN JALAN:', margin + 4, y + 18)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(15, 23, 42)
  doc.text(`${data.siteName} ${data.customerName ? `(${data.customerName})` : ''}`, margin + 30, y + 6)
  doc.text(data.inspectorName || '-', margin + 30, y + 12)
  doc.text(data.roadSection || 'Hauling Road KM 00', margin + 30, y + 18)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 116, 139)
  doc.text('DURASI:', margin + 105, y + 6)
  doc.text('JARAK:', margin + 105, y + 12)
  doc.text('MODEL AI:', margin + 105, y + 18)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(15, 23, 42)
  doc.text(data.durationText || '-', margin + 125, y + 6)
  doc.text(data.totalDistanceText || '-', margin + 125, y + 12)
  doc.text('Road hazard PPA BA (v1 YOLO)', margin + 125, y + 18)

  y += 30

  // --- KPI Scorecards ---
  const cardWidth = (pageWidth - margin * 2 - 9) / 4
  const kpis = [
    { label: 'TOTAL KENDALA', val: String(data.totalHazards), bg: [239, 246, 255], border: [147, 197, 253], text: [29, 78, 216] },
    { label: 'POTHOLES (LUBANG)', val: String(data.potholesCount), bg: [255, 241, 242], border: [254, 205, 211], text: [225, 29, 72] },
    { label: 'CORRUGATION', val: String(data.corrugationCount), bg: [255, 247, 237], border: [254, 215, 170], text: [194, 65, 12] },
    { label: 'RUTS (ALUR AMBLES)', val: String(data.rutsCount), bg: [254, 252, 232], border: [254, 240, 138], text: [161, 98, 7] },
  ]

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (cardWidth + 3)
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2])
    doc.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2])
    doc.roundedRect(x, y, cardWidth, 18, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2])
    doc.text(kpi.label, x + cardWidth / 2, y + 5.5, { align: 'center' })

    doc.setFontSize(14)
    doc.text(kpi.val, x + cardWidth / 2, y + 13.5, { align: 'center' })
  })

  y += 24

  // Summary notes if present
  if (data.summaryNotes) {
    doc.setFillColor(241, 245, 249)
    doc.setDrawColor(203, 213, 225)
    doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 1.5, 1.5, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(71, 85, 105)
    doc.text('CATATAN LAPORAN:', margin + 3, y + 4.5)
    doc.setFont('helvetica', 'normal')
    doc.text(data.summaryNotes.slice(0, 130), margin + 3, y + 9)
    y += 16
  }

  // --- Section: Daftar Titik Temuan Kerusakan ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text(`Daftar Snapshot & Temuan Kerusakan Jalan (${data.events.length})`, margin, y + 4)
  y += 7

  // Iterate over events
  for (let i = 0; i < data.events.length; i++) {
    const ev = data.events[i]
    const itemHeight = 36

    // Page overflow check
    if (y + itemHeight > pageHeight - 25) {
      doc.addPage()
      y = 15
    }

    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(margin, y, pageWidth - margin * 2, itemHeight, 2, 2, 'FD')

    // Thumbnail column
    const photoUrl = ev.annotatedPhotoUrl || ev.photoUrl
    let hasPhoto = false
    if (photoUrl) {
      try {
        const fullUrl = photoUrl.startsWith('http') ? photoUrl : `${window.location.origin}${photoUrl}`
        const imgData = await fetchImageBase64(fullUrl)
        if (imgData) {
          doc.addImage(imgData, 'JPEG', margin + 3, y + 3, 30, 30)
          hasPhoto = true
        }
      } catch {
        // fallback to placeholder
      }
    }

    if (!hasPhoto) {
      doc.setFillColor(241, 245, 249)
      doc.rect(margin + 3, y + 3, 30, 30, 'F')
      doc.setFontSize(7)
      doc.setTextColor(148, 163, 184)
      doc.text('No Photo', margin + 18, y + 18, { align: 'center' })
    }

    const textX = margin + 37

    // Hazard Type Badge
    const badgeColor =
      ev.hazardType === 'Potholes'
        ? [225, 29, 72]
        : ev.hazardType === 'Corragation'
        ? [234, 88, 12]
        : [202, 138, 4]

    doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2])
    doc.roundedRect(textX, y + 4, 32, 6, 1, 1, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(255, 255, 255)
    doc.text(ev.hazardType.toUpperCase(), textX + 16, y + 8, { align: 'center' })

    // Confidence
    const confPct = Math.round(Number(ev.confidence || 0) * 100)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(71, 85, 105)
    doc.text(`Keyakinan AI: ${confPct}%`, textX + 36, y + 8)

    // Geolocation & speed
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(51, 65, 85)
    const latStr = ev.latitude ? Number(ev.latitude).toFixed(6) : '-'
    const lngStr = ev.longitude ? Number(ev.longitude).toFixed(6) : '-'
    doc.text(`GPS Koordinat: ${latStr}, ${lngStr}`, textX, y + 15)
    doc.text(`Kecepatan Saat Deteksi: ${ev.speedKmh ? `${ev.speedKmh} km/h` : 'N/A'}`, textX, y + 21)

    if (ev.notes) {
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(100, 116, 139)
      doc.text(`Catatan: ${ev.notes.slice(0, 75)}`, textX, y + 27)
    }

    y += itemHeight + 4
  }

  // --- Signature Footer on last page ---
  if (y + 35 > pageHeight - 15) {
    doc.addPage()
    y = 20
  } else {
    y += 10
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(71, 85, 105)
  doc.text('Dibuat secara otomatis oleh HERO Mobile AI Road Hazard System.', margin, y)

  const sigY = y + 10
  doc.setFont('helvetica', 'bold')
  doc.text('Petugas Lapangan / Inspector:', margin + 10, sigY)
  doc.text('Disetujui Safety / Road Dept:', pageWidth - margin - 60, sigY)

  doc.line(margin + 10, sigY + 18, margin + 65, sigY + 18)
  doc.line(pageWidth - margin - 60, sigY + 18, pageWidth - margin - 5, sigY + 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(data.inspectorName || 'Inspector', margin + 10, sigY + 22)
  doc.text('HSE Supervisor', pageWidth - margin - 60, sigY + 22)

  return doc.output('blob')
}
