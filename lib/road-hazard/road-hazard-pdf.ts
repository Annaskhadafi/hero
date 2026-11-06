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
  if (!url) return null
  const trimmed = url.trim()
  if (trimmed.startsWith('data:image')) {
    return trimmed
  }

  try {
    const fullUrl =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : typeof window !== 'undefined'
        ? `${window.location.origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`
        : trimmed

    const res = await fetch(fullUrl)
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
  doc.setFillColor(15, 23, 42) // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.text('HERO • ROAD HAZARD AI INSPECTION', margin, 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184) // slate-400
  doc.text('Laporan Rekapitulasi Deteksi Kerusakan & Bahaya Jalan Tambang', margin, 18)
  doc.text(
    `KODE: ${data.sessionCode}  |  TANGGAL: ${data.dateStr}`,
    margin,
    23
  )

  // Severity pill
  const sevColor =
    data.severityLevel === 'CRITICAL'
      ? [225, 29, 72]
      : data.severityLevel === 'HIGH'
      ? [234, 88, 12]
      : data.severityLevel === 'MEDIUM'
      ? [202, 138, 4]
      : [16, 185, 129]

  doc.setFillColor(sevColor[0], sevColor[1], sevColor[2])
  doc.roundedRect(pageWidth - margin - 35, 7, 35, 12, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text(data.severityLevel, pageWidth - margin - 17.5, 14.5, { align: 'center' })

  let y = 35

  // --- Metadata Card ---
  doc.setFillColor(248, 250, 252) // slate-50
  doc.setDrawColor(226, 232, 240) // slate-200
  doc.roundedRect(margin, y, pageWidth - margin * 2, 26, 2, 2, 'FD')

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(71, 85, 105)
  doc.text('SITE / LOKASI:', margin + 4, y + 6)
  doc.text('INSPECTOR:', margin + 4, y + 13)
  doc.text('SEGMEN JALAN:', margin + 4, y + 20)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(15, 23, 42)
  const siteStr = data.customerName ? `${data.siteName} (${data.customerName})` : data.siteName
  doc.text(siteStr.slice(0, 40), margin + 30, y + 6)
  doc.text(data.inspectorName.slice(0, 40), margin + 30, y + 13)
  doc.text(data.roadSection.slice(0, 40), margin + 30, y + 20)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(71, 85, 105)
  doc.text('DURASI:', margin + 105, y + 6)
  doc.text('JARAK:', margin + 105, y + 13)
  doc.text('MODEL AI:', margin + 105, y + 20)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(15, 23, 42)
  doc.text(data.durationText, margin + 125, y + 6)
  doc.text(data.totalDistanceText || '-', margin + 125, y + 13)
  doc.text('Road hazard Dual Engine (YOLO/ONNX)', margin + 125, y + 20)

  y += 32

  // --- KPI Badges Row ---
  const boxWidth = (pageWidth - margin * 2 - 9) / 4
  const boxHeight = 16

  const stats = [
    { label: 'TOTAL KENDALA', val: data.totalHazards, color: [2, 132, 199], bg: [238, 242, 255] },
    { label: 'POTHOLES (LUBANG)', val: data.potholesCount, color: [225, 29, 72], bg: [255, 241, 242] },
    { label: 'CORRUGATION', val: data.corrugationCount, color: [234, 88, 12], bg: [255, 247, 237] },
    { label: 'RUTS (ALUR AMBLES)', val: data.rutsCount, color: [202, 138, 4], bg: [254, 252, 232] },
  ]

  stats.forEach((st, i) => {
    const bx = margin + i * (boxWidth + 3)
    doc.setFillColor(st.bg[0], st.bg[1], st.bg[2])
    doc.setDrawColor(st.color[0], st.color[1], st.color[2])
    doc.roundedRect(bx, y, boxWidth, boxHeight, 1.5, 1.5, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(st.color[0], st.color[1], st.color[2])
    doc.text(st.label, bx + boxWidth / 2, y + 5, { align: 'center' })

    doc.setFontSize(12)
    doc.text(String(st.val), bx + boxWidth / 2, y + 12, { align: 'center' })
  })

  y += boxHeight + 8

  // --- Summary Notes Section (if any) ---
  if (data.summaryNotes && data.summaryNotes.trim()) {
    doc.setFillColor(241, 245, 249)
    doc.setDrawColor(203, 213, 225)
    doc.roundedRect(margin, y, pageWidth - margin * 2, 14, 1.5, 1.5, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(51, 65, 85)
    doc.text('CATATAN / REKOMENDASI PERBAIKAN:', margin + 4, y + 5)

    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(71, 85, 105)
    const wrapped = doc.splitTextToSize(data.summaryNotes.trim(), pageWidth - margin * 2 - 8)
    doc.text(wrapped.slice(0, 2), margin + 4, y + 10)

    y += 18
  }

  // --- Snapshot Events Table / List ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text(`Daftar Snapshot & Temuan Kerusakan Jalan (${data.events.length})`, margin, y)
  y += 5

  if (data.events.length === 0) {
    doc.setFillColor(248, 250, 252)
    doc.rect(margin, y, pageWidth - margin * 2, 20, 'F')
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text('Tidak ada bahaya/kerusakan jalan yang terdeteksi selama sesi trip ini.', pageWidth / 2, y + 11, {
      align: 'center',
    })
    y += 24
  } else {
    const itemHeight = 36
    for (let i = 0; i < data.events.length; i++) {
      const ev = data.events[i]

      // Pagination check
      if (y + itemHeight > pageHeight - 35) {
        doc.addPage()
        y = 15
      }

      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(margin, y, pageWidth - margin * 2, itemHeight, 2, 2, 'FD')

      // Thumbnail column
      const rawPhotoUrl = ev.annotatedPhotoUrl || ev.photoUrl
      let hasPhoto = false
      if (rawPhotoUrl) {
        try {
          const imgData = await fetchImageBase64(rawPhotoUrl)
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
        doc.roundedRect(margin + 3, y + 3, 30, 30, 1, 1, 'F')
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
  }

  // --- Signatures Footer ---
  if (y + 35 > pageHeight) {
    doc.addPage()
    y = 20
  } else {
    y = Math.max(y + 8, pageHeight - 40)
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  doc.text('Dibuat secara otomatis oleh HERO Mobile AI Road Hazard System.', margin, y)

  y += 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(15, 23, 42)
  doc.text('Petugas Lapangan / Inspector:', margin, y)
  doc.text('Disetujui Safety / Road Dept:', margin + 110, y)

  y += 15
  doc.setDrawColor(203, 213, 225)
  doc.line(margin, y, margin + 55, y)
  doc.line(margin + 110, y, margin + 165, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(data.inspectorName, margin, y + 4)
  doc.text('HSE Supervisor', margin + 110, y + 4)

  return doc.output('blob')
}
