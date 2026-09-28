import * as XLSX from 'xlsx'

export interface AttendanceExportEmployee {
  id: number
  name: string
  employeeSn?: string | null
  role?: string | null
  section?: string | null
  department?: string | null
}

export interface AttendanceExportCell {
  status: string
  clockIn?: string | null
  clockOut?: string | null
  overtimeMinutes?: number
  note?: string | null
}

export interface AttendanceExportRow {
  employee: AttendanceExportEmployee
  getAttendanceCell: (day: number) => AttendanceExportCell
  statusCounts?: {
    present?: number
    off?: number
    sick?: number
    leave?: number
    absent?: number
  }
  totalHours?: number
  totalOvertimeHours?: number
}

export interface ExportAttendanceExcelOptions {
  siteName: string
  period: string
  days: number[]
  mode: 'attendance' | 'checkin-checkout' | 'work-hours'
  rows: AttendanceExportRow[]
  weekdayLabel: (period: string, day: number) => string
  attendanceStatusLabel?: (status: any) => string
  holidaysByDay?: Map<number, { name?: string; localName?: string }>
}

function formatPeriodIndonesian(period: string): string {
  const [year, month] = period.split('-')
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  const monthIdx = Number(month) - 1
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${monthNames[monthIdx]} ${year}`
  }
  return period
}

export function exportAttendanceGridToExcel({
  siteName,
  period,
  days,
  mode,
  rows,
  weekdayLabel,
  attendanceStatusLabel = (s) => s,
  holidaysByDay = new Map(),
}: ExportAttendanceExcelOptions) {
  const wb = XLSX.utils.book_new()
  const periodLabel = formatPeriodIndonesian(period)

  const modeTitle = {
    attendance: 'STATUS KEHADIRAN (ROSTER & ATTENDANCE)',
    'checkin-checkout': 'CHECK-IN & CHECK-OUT (JAM MASUK & PULANG)',
    'work-hours': 'DURASI JAM KERJA AKTIF',
  }[mode]

  const wsData: any[][] = []

  // ── ROW 1-4: HEADER BANNER ──
  wsData.push(['PT CHITRA PARATAMA - HERO SYSTEM'])
  wsData.push([`LAPORAN REKAPITULASI KEHADIRAN KARYAWAN (${modeTitle})`])
  wsData.push([`Site / Project: ${siteName.toUpperCase()} | Periode: ${periodLabel} (${period}) | Total Karyawan: ${rows.length} Orang`])
  wsData.push([`Dicetak pada: ${new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}`])
  wsData.push([]) // Empty row for spacing

  // ── TABLE COLUMN HEADERS (2 ROWS) ──
  // Row 6 (Index 5 in aoa): Top Header Row
  const topHeader: any[] = [
    'No',
    'SN / NIK',
    'Nama Karyawan',
    'Section / Bagian',
    'Departemen',
    'Role / Jabatan',
  ]

  days.forEach((day) => {
    topHeader.push(`Tgl ${day}`)
  })

  // Summary Column Headers
  topHeader.push('Hadir (Hari)')
  topHeader.push('Off (Hari)')
  topHeader.push('Cuti/Izin (Hari)')
  topHeader.push('Sakit (Hari)')
  topHeader.push('Total Jam Kerja')
  topHeader.push('Total Overtime (Jam)')

  wsData.push(topHeader)

  // Row 7 (Index 6 in aoa): Sub-Header Row (Day of Week & Holiday markers)
  const subHeader: any[] = [
    '',
    '',
    '',
    '',
    '',
    '',
  ]

  days.forEach((day) => {
    const wday = weekdayLabel(period, day)
    const holiday = holidaysByDay.get(day)
    if (holiday) {
      subHeader.push(`${wday} (Libur)`)
    } else {
      subHeader.push(wday)
    }
  })

  subHeader.push('DS + NS')
  subHeader.push('OFF')
  subHeader.push('AL / I / C')
  subHeader.push('S / SD')
  subHeader.push('Jam')
  subHeader.push('SPL Jam')

  wsData.push(subHeader)

  // ── GROUP ROWS BY SECTION & DEPARTMENT (MATCHING WEBPAGE TABLE) ──
  const grouped = new Map<string, Map<string, AttendanceExportRow[]>>()

  for (const row of rows) {
    const section = row.employee.section || row.employee.role || 'General'
    const dept = row.employee.department || 'Tanpa Departemen'
    if (!grouped.has(section)) grouped.set(section, new Map())
    const secMap = grouped.get(section)!
    if (!secMap.has(dept)) secMap.set(dept, [])
    secMap.get(dept)!.push(row)
  }

  let rowNumber = 1
  const dailyPresentTotals: number[] = new Array(days.length).fill(0)
  const dailyHoursTotals: number[] = new Array(days.length).fill(0)
  let grandTotalPresent = 0
  let grandTotalOff = 0
  let grandTotalLeave = 0
  let grandTotalSick = 0
  let grandTotalHours = 0
  let grandTotalOtHours = 0

  const merges: XLSX.Range[] = [
    // Banner merges across the first 6 metadata columns
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
    // Merges for identity headers (No, SN, Name, Section, Dept, Role)
    { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } },
    { s: { r: 5, c: 1 }, e: { r: 6, c: 1 } },
    { s: { r: 5, c: 2 }, e: { r: 6, c: 2 } },
    { s: { r: 5, c: 3 }, e: { r: 6, c: 3 } },
    { s: { r: 5, c: 4 }, e: { r: 6, c: 4 } },
    { s: { r: 5, c: 5 }, e: { r: 6, c: 5 } },
  ]

  const totalTableColumns = 6 + days.length + 6

  Array.from(grouped.entries()).forEach(([section, depts]) => {
    // Section Group Header Row
    const sectionRowIdx = wsData.length
    const sectionRowData: any[] = [`SECTION: ${section.toUpperCase()}`]
    wsData.push(sectionRowData)
    merges.push({ s: { r: sectionRowIdx, c: 0 }, e: { r: sectionRowIdx, c: totalTableColumns - 1 } })

    Array.from(depts.entries()).forEach(([dept, deptRows]) => {
      // Department Sub-Group Row
      const deptRowIdx = wsData.length
      const deptRowData: any[] = [`  DEPARTEMEN: ${dept.toUpperCase()} (${deptRows.length} Karyawan)`]
      wsData.push(deptRowData)
      merges.push({ s: { r: deptRowIdx, c: 0 }, e: { r: deptRowIdx, c: totalTableColumns - 1 } })

      // Sort rows by SN or Name
      const sortedRows = deptRows.slice().sort((a, b) => {
        const snA = a.employee.employeeSn || ''
        const snB = b.employee.employeeSn || ''
        if (snA && snB) return snA.localeCompare(snB, undefined, { numeric: true })
        return a.employee.name.localeCompare(b.employee.name)
      })

      sortedRows.forEach((row) => {
        const emp = row.employee
        const rowData: any[] = [
          rowNumber++,
          emp.employeeSn || '-',
          emp.name,
          emp.section || '-',
          emp.department || '-',
          emp.role || '-',
        ]

        let empPresentCount = 0
        let empOffCount = 0
        let empLeaveCount = 0
        let empSickCount = 0
        let empTotalHours = 0
        let empTotalOtMinutes = 0

        days.forEach((day, dayIndex) => {
          const cell = row.getAttendanceCell(day)
          const rawStatus = (cell.status || '').toUpperCase()
          const clockIn = cell.clockIn || ''
          const clockOut = cell.clockOut || ''
          const otMinutes = cell.overtimeMinutes || 0

          empTotalOtMinutes += otMinutes

          // Count status classifications
          if (rawStatus === 'DS' || rawStatus === 'NS' || rawStatus === 'PRESENT' || rawStatus === 'HADIR' || rawStatus === 'D' || rawStatus === 'N') {
            empPresentCount++
            dailyPresentTotals[dayIndex]++
          } else if (rawStatus === 'OFF' || rawStatus === 'LIBUR' || rawStatus === 'O') {
            empOffCount++
          } else if (rawStatus === 'AL' || rawStatus === 'LEAVE' || rawStatus === 'CUTI' || rawStatus === 'I' || rawStatus === 'IZIN' || rawStatus === 'C' || rawStatus === 'DL') {
            empLeaveCount++
          } else if (rawStatus === 'S' || rawStatus === 'SICK' || rawStatus === 'SAKIT' || rawStatus === 'SD') {
            empSickCount++
          }

          // Calculate work hours
          let cellHours = 0
          if (clockIn && clockOut) {
            const [inH, inM] = clockIn.split(':').map(Number)
            const [outH, outM] = clockOut.split(':').map(Number)
            if (!isNaN(inH) && !isNaN(outH)) {
              let diff = (outH * 60 + (outM || 0)) - (inH * 60 + (inM || 0))
              if (diff < 0) diff += 1440 // Overnight shift
              cellHours = Math.round((diff / 60) * 10) / 10
            }
          } else if (rawStatus === 'DS' || rawStatus === 'NS' || rawStatus === 'PRESENT' || rawStatus === 'HADIR') {
            cellHours = 8.0 // Standard fallback shift hours
          }

          empTotalHours += cellHours
          dailyHoursTotals[dayIndex] += cellHours

          // Cell formatting based on mode
          if (mode === 'attendance') {
            const label = attendanceStatusLabel(cell.status)
            rowData.push(label || '-')
          } else if (mode === 'checkin-checkout') {
            if (clockIn || clockOut) {
              rowData.push(`${clockIn || '-'} - ${clockOut || '-'}`)
            } else {
              rowData.push(rawStatus && rawStatus !== 'EMPTY' ? rawStatus : '-')
            }
          } else if (mode === 'work-hours') {
            rowData.push(cellHours > 0 ? cellHours : 0)
          }
        })

        // Summary columns
        const finalPresent = row.statusCounts?.present ?? empPresentCount
        const finalOff = row.statusCounts?.off ?? empOffCount
        const finalLeave = row.statusCounts?.leave ?? empLeaveCount
        const finalSick = row.statusCounts?.sick ?? empSickCount
        const finalHours = row.totalHours ?? (Math.round(empTotalHours * 10) / 10)
        const finalOtHours = row.totalOvertimeHours ?? (Math.round((empTotalOtMinutes / 60) * 10) / 10)

        grandTotalPresent += finalPresent
        grandTotalOff += finalOff
        grandTotalLeave += finalLeave
        grandTotalSick += finalSick
        grandTotalHours += finalHours
        grandTotalOtHours += finalOtHours

        rowData.push(finalPresent)
        rowData.push(finalOff)
        rowData.push(finalLeave)
        rowData.push(finalSick)
        rowData.push(Number(finalHours.toFixed(1)))
        rowData.push(Number(finalOtHours.toFixed(1)))

        wsData.push(rowData)
      })
    })
  })

  // ── GRAND TOTAL / SUMMARY ROW ──
  const summaryRowData: any[] = [
    'TOTAL',
    '',
    `Total: ${rows.length} Karyawan`,
    '',
    '',
    '',
  ]

  days.forEach((_, dayIdx) => {
    if (mode === 'work-hours') {
      summaryRowData.push(Math.round(dailyHoursTotals[dayIdx] * 10) / 10)
    } else {
      summaryRowData.push(dailyPresentTotals[dayIdx])
    }
  })

  summaryRowData.push(grandTotalPresent)
  summaryRowData.push(grandTotalOff)
  summaryRowData.push(grandTotalLeave)
  summaryRowData.push(grandTotalSick)
  summaryRowData.push(Number(grandTotalHours.toFixed(1)))
  summaryRowData.push(Number(grandTotalOtHours.toFixed(1)))

  const summaryRowIdx = wsData.length
  wsData.push(summaryRowData)
  merges.push({ s: { r: summaryRowIdx, c: 0 }, e: { r: summaryRowIdx, c: 1 } })

  // ── BUILD MAIN WORKSHEET ──
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Configure Column Widths (Generous to prevent text truncation / overlap)
  const cols: XLSX.ColInfo[] = [
    { wch: 6 },  // No
    { wch: 14 }, // SN / NIK
    { wch: 28 }, // Nama Karyawan
    { wch: 20 }, // Section
    { wch: 22 }, // Departemen
    { wch: 22 }, // Jabatan / Role
  ]

  // Day columns width: Wider for checkin-checkout mode (e.g. 07:00 - 17:00)
  const dayColWidth = mode === 'checkin-checkout' ? 15 : 7
  days.forEach(() => {
    cols.push({ wch: dayColWidth })
  })

  // Summary column widths
  cols.push({ wch: 13 }) // Hadir
  cols.push({ wch: 11 }) // Off
  cols.push({ wch: 15 }) // Cuti/Izin
  cols.push({ wch: 12 }) // Sakit
  cols.push({ wch: 16 }) // Total Jam Kerja
  cols.push({ wch: 18 }) // Total Overtime

  ws['!cols'] = cols
  ws['!merges'] = merges

  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Kehadiran')

  // ── SHEET 2: PANDUAN & KETERANGAN (LEGEND) ──
  const legendData: any[][] = [
    ['PANDUAN & KETERANGAN KODE KEHADIRAN HERO SYSTEM'],
    ['PT CHITRA PARATAMA'],
    [],
    ['Kode Status', 'Keterangan Singkat', 'Deskripsi Operasional', 'Status Shift'],
    ['DS', 'Day Shift', 'Bekerja shift siang normal (sesuai jam kerja site)', 'Hadir'],
    ['NS', 'Night Shift', 'Bekerja shift malam (sesuai jam kerja site)', 'Hadir'],
    ['OFF', 'Off / Libur Roster', 'Jadwal hari libur / off kerja berkala', 'Libur'],
    ['AL', 'Annual Leave', 'Cuti tahunan yang telah disetujui', 'Cuti'],
    ['S', 'Sakit', 'Izin sakit dengan surat keterangan dokter', 'Sakit'],
    ['SD', 'Sakit di Camp/Site', 'Sakit dan beristirahat di mess/klinik site', 'Sakit'],
    ['I', 'Izin / Permission', 'Izin resmi tidak masuk kerja (keperluan keluarga/khusus)', 'Izin'],
    ['C', 'Cuti Khusus / Dispensasi', 'Cuti melahirkan, menikah, duka cita, ibadah', 'Cuti'],
    ['DL', 'Dinas Luar', 'Tugas kedinasan / perjalanan dinas ke luar site', 'Hadir'],
    ['GB', 'General Backup', 'Karyawan pengganti / relief shift roster', 'Hadir'],
    ['TRAIN', 'Training', 'Mengikuti pelatihan / sertifikasi operasional', 'Hadir'],
    ['-', 'Belum Ada Record', 'Data belum diisi / diverifikasi', '-'],
    [],
    ['CATATAN & KEBIJAKAN OPERASIONAL'],
    ['1. Perhitungan jam kerja efektif mengikuti shift operasional 22 jam kerja per hari (2 shift: DS & NS).'],
    ['2. Overtime / Lembur dihitung berdasarkan Surat Perintah Lembur (SPL) yang telah diapprove dan diverifikasi.'],
    ['3. Dokumen ini diekspor secara otomatis melalui HERO Portal System terintegrasi.'],
  ]

  const wsLegend = XLSX.utils.aoa_to_sheet(legendData)
  wsLegend['!cols'] = [
    { wch: 15 },
    { wch: 25 },
    { wch: 55 },
    { wch: 15 },
  ]
  wsLegend['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: 17, c: 0 }, e: { r: 17, c: 3 } },
    { s: { r: 18, c: 0 }, e: { r: 18, c: 3 } },
    { s: { r: 19, c: 0 }, e: { r: 19, c: 3 } },
    { s: { r: 20, c: 0 }, e: { r: 20, c: 3 } },
  ]

  XLSX.utils.book_append_sheet(wb, wsLegend, 'Panduan & Keterangan')

  // ── WRITE & DOWNLOAD FILE ──
  const safeSiteName = siteName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const fileName = `Attendance_Real_${safeSiteName}_${period}_${mode}.xlsx`
  XLSX.writeFile(wb, fileName)
}

export interface AttendanceLogExportItem {
  id: number
  employeeName: string
  employeeEmail?: string
  siteName: string
  workLocation: string
  eventTime: Date | string
  eventType: string
  operationalDetails?: string[]
  locationName?: string
  coordinates?: string | null
  hasPhoto?: boolean
}

export function exportAttendanceLogsToExcel(
  logs: AttendanceLogExportItem[],
  siteName?: string
) {
  const wb = XLSX.utils.book_new()
  const wsData: any[][] = []

  // Top header banner
  wsData.push(['PT CHITRA PARATAMA - HERO SYSTEM'])
  wsData.push(['LOG RECORD KEHADIRAN KARYAWAN (ATTENDANCE LOGS)'])
  wsData.push([`Site / Project: ${(siteName || 'Semua Site').toUpperCase()} | Total Log: ${logs.length} Record`])
  wsData.push([`Dicetak pada: ${new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}`])
  wsData.push([])

  // Column Headers
  wsData.push([
    'No',
    'Nama Karyawan',
    'Site',
    'Lokasi Kerja',
    'Waktu Record (Time)',
    'Tipe Kehadiran',
    'Shift & Catatan Lembur',
    'Nama Lokasi / Alamat',
    'Koordinat GPS',
    'Bukti Foto',
  ])

  logs.forEach((log, index) => {
    const timeStr = typeof log.eventTime === 'string'
      ? log.eventTime
      : new Date(log.eventTime).toLocaleString('id-ID')
    const typeLabel = log.eventType === 'checked-out' ? 'Clock Out / Jam Pulang' : 'Clock In / Jam Masuk'
    const detailsStr = log.operationalDetails && log.operationalDetails.length > 0
      ? log.operationalDetails.join(' | ')
      : '-'
    const photoStr = log.hasPhoto ? 'Tersedia' : 'Tidak Ada'

    wsData.push([
      index + 1,
      log.employeeName,
      log.siteName || '-',
      log.workLocation || '-',
      timeStr,
      typeLabel,
      detailsStr,
      log.locationName || '-',
      log.coordinates || '-',
      photoStr,
    ])
  })

  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 25 }, // Nama
    { wch: 18 }, // Site
    { wch: 20 }, // Lokasi Kerja
    { wch: 24 }, // Waktu
    { wch: 22 }, // Tipe
    { wch: 30 }, // Shift & Lembur
    { wch: 35 }, // Lokasi
    { wch: 22 }, // Koordinat
    { wch: 14 }, // Foto
  ]

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Log Attendance')
  XLSX.writeFile(wb, `Attendance_Logs_${(siteName || 'All').replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
