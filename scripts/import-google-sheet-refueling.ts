import { db } from '../db'
import { centralServiceRefuelingLogs } from '../db/schema/central-service'
import { count } from 'drizzle-orm'
import https from 'https'

function fetchCsv(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Follow redirects if any
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchCsv(res.headers.location).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => resolve(data))
    }).on('error', reject)
  })
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim())
      cur = ''
    } else {
      cur += char
    }
  }
  result.push(cur.trim())
  return result
}

function parseCsv(csvText: string): string[][] {
  const lines: string[] = []
  let curLine = ''
  let inQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    if (char === '"') {
      if (inQuotes && csvText[i + 1] === '"') {
        curLine += '""'
        i++
      } else {
        inQuotes = !inQuotes
        curLine += '"'
      }
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (curLine.trim()) {
        lines.push(curLine)
      }
      curLine = ''
    } else {
      curLine += char
    }
  }
  if (curLine.trim()) {
    lines.push(curLine)
  }

  return lines.map(parseCsvLine)
}

function parseDateStr(str: string): string {
  if (!str) return new Date().toISOString().split('T')[0]
  const parts = str.split('/')
  if (parts.length === 3) {
    const m = parts[0].padStart(2, '0')
    const d = parts[1].padStart(2, '0')
    const y = parts[2]
    return `${y}-${m}-${d}`
  }
  return str
}

async function main() {
  console.log('Fetching Google Sheet CSV...')
  const sheetUrl = 'https://docs.google.com/spreadsheets/d/1t8mipVjNjrpDnhLak3drJOb9rnSDwtSV9I5SEJlFd3s/gviz/tq?tqx=out:csv'
  const csvText = await fetchCsv(sheetUrl)

  const rows = parseCsv(csvText)
  console.log(`Parsed ${rows.length} total rows (including header)`)

  if (rows.length <= 1) {
    console.log('No data rows found.')
    return
  }

  const recordsToInsert = []

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.length < 5) continue

    const [
      timestampRaw,
      siteNameRaw,
      driverNameRaw,
      refuelDateRaw,
      unitNumberRaw,
      odometerRaw,
      litersRaw,
      fuelmanRaw,
      odometerPhotoRaw,
      flowmeterPhotoRaw,
      expenditureTypeRaw,
      remarksRaw,
    ] = r

    let parsedTimestamp = new Date()
    if (timestampRaw) {
      const dt = new Date(timestampRaw)
      if (!isNaN(dt.getTime())) {
        parsedTimestamp = dt
      }
    }

    const litersClean = (litersRaw || '0').replace(',', '.')
    const numericLiters = isNaN(Number(litersClean)) ? '0' : Number(litersClean).toFixed(2)
    const odometerNum = Math.round(Number((odometerRaw || '0').replace(/[^0-9]/g, '')) || 0)

    recordsToInsert.push({
      timestamp: parsedTimestamp,
      siteName: (siteNameRaw || 'Unknown').trim(),
      driverName: (driverNameRaw || '-').trim(),
      refuelDate: parseDateStr(refuelDateRaw?.trim() || ''),
      unitNumber: (unitNumberRaw || '-').trim(),
      odometerKm: odometerNum,
      fuelExpenditureType: (expenditureTypeRaw || 'Operational Site (Rutin)').trim() || 'Operational Site (Rutin)',
      fuelAmountLiters: numericLiters,
      fuelmanName: (fuelmanRaw || '-').trim(),
      odometerPhotoUrl: (odometerPhotoRaw || '').trim() || null,
      flowmeterPhotoUrl: (flowmeterPhotoRaw || '').trim() || null,
      remarks: (remarksRaw || '').trim(),
    })
  }

  console.log(`Ready to insert ${recordsToInsert.length} records into hero_central_service_refueling_logs...`)

  // Check current count
  const [existing] = await db.select({ count: count() }).from(centralServiceRefuelingLogs)
  console.log(`Current DB records count: ${existing?.count || 0}`)

  // Batch insert in chunks of 100
  const chunkSize = 100
  for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
    const chunk = recordsToInsert.slice(i, i + chunkSize)
    await db.insert(centralServiceRefuelingLogs).values(chunk)
    console.log(`Inserted chunk ${i / chunkSize + 1} (${chunk.length} rows)`)
  }

  const [after] = await db.select({ count: count() }).from(centralServiceRefuelingLogs)
  console.log(`Done! Total DB records count now: ${after?.count || 0}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Import failed:', err)
    process.exit(1)
  })
