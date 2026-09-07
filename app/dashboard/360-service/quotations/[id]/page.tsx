import { getQuotationById } from "@/app/actions/service360"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { PrintButton } from "./print-button"
import { Suspense } from "react"
import { resolveUploadUrl } from "@/lib/s3-storage"
import { calculateStartMonthProrateFactor } from "@/lib/service360-quotation-prorate"
import { calculateQuotationTotal } from "@/lib/service360-quotation-total"
import { db } from "@/db"
import { sites, employees } from "@/db/schema"
import { timesheetSchedulingPlansV2 } from "@/db/schema/timesheet"
import { eq, or, ilike, and, inArray } from "drizzle-orm"

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const MONTH_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

function abbreviatePeriod(period: string | null) {
  if (!period) return '-'
  return period.replace(
    /(\d{4})-(\d{2})-(\d{2})/g,
    (_, y, m, d) => `${Number(d)} ${SHORT_MONTHS[Number(m) - 1]} ${y}`
  )
}

export const dynamic = "force-dynamic"

import { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id)
  if (isNaN(id)) return { title: 'Quotation Preview' }
  
  const quotation = await getQuotationById(id)
  if (!quotation) return { title: 'Quotation Preview' }

  const dateStr = new Date(quotation.quotationDate);
  const bulan = `${MONTH_NAMES[dateStr.getMonth()]} ${dateStr.getFullYear()}`;
  const site = quotation.projectName || 'Site';
  const safeQuotationNum = quotation.quotationNumber.replace(/\//g, '-');
  
  return {
    title: `${safeQuotationNum}-${site}-${bulan}`,
  }
}

export default async function QuotationPrintPreview({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id)
  if (isNaN(id)) {
    return notFound()
  }
  
  const quotation = await getQuotationById(id)
  
  if (!quotation) {
    return notFound()
  }

  const quotationTotals = calculateQuotationTotal(
    Number(quotation.subTotal),
    Number(quotation.taxRate),
    quotation.discountType,
    Number(quotation.discountValue),
  )
  const hasDiscount = Boolean(quotation.discountType) && Number(quotation.discountValue) > 0

  const signatureUrl = quotation.fromSignatureUrl ? resolveUploadUrl(quotation.fromSignatureUrl) : null;

  // Helper to determine row color based on description
  const getRowIndexBg = (desc: string) => {
    if (desc && desc.toLowerCase().includes("accomodation") || desc.toLowerCase().includes("accommodation")) {
      return "bg-[#FCD5B4]" // Orange-ish
    }
    return "bg-[#92D050]" // Green
  }

  const calculateDays = (start: Date | string | null, end: Date | string | null) => {
    if (!start || !end) return 31;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  }

  // Parse total days from a monthPeriod string like "01 Jun 2026 - 10 Jun 2026 & 21 Jun 2026 - 30 Jun 2026"
  const parseDaysFromMonthPeriod = (periodStr: string): number => {
    if (!periodStr) return 0;
    const ranges = periodStr.split(" & ");
    let total = 0;
    for (const range of ranges) {
      const parts = range.trim().split(" - ");
      if (parts.length === 2) {
        const start = new Date(parts[0].trim());
        const end = new Date(parts[1].trim());
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          total += calculateDays(start, end);
        }
      }
    }
    return total;
  }

  const dateStr = new Date(quotation.quotationDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const formattedDate = dateStr // "June, 2026" based on the image format

  const rentalItems = quotation.items.filter(i => {
    const cat = i.item?.category || '';
    const desc = (i.quotationItem.customDescription || '').toLowerCase();
    return cat === "Rental" || cat === "Rental & Tools" || desc.includes("rental");
  });
  let totalRental = 0;
  rentalItems.forEach(item => {
    let backupProrate = 0;
    if (item.quotationItem.isBackup) {
      const billingStart = item.quotationItem.monthPeriod?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
      backupProrate = calculateStartMonthProrateFactor(
        item.quotationItem.backupStartDate,
        item.quotationItem.backupEndDate,
        billingStart || item.quotationItem.backupStartDate,
      ) * (Number(item.quotationItem.backupPrice) || 0) * Number(item.quotationItem.quantity);
    }
    const primaryProrate = Number(item.quotationItem.subtotal) - backupProrate;
    totalRental += quotation.hideBackupPrice ? (primaryProrate + backupProrate) : primaryProrate;
    if (item.quotationItem.isBackup && !quotation.hideBackupPrice) {
      totalRental += backupProrate;
    }
  });

  const getDayName = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return days[new Date(dateStr).getDay()];
  };

  const getDayNumber = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).getDate().toString();
  };

  const getMonthName = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return months[new Date(dateStr).getMonth()];
  };

  const getYearName = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).getFullYear().toString();
  };

  // -------------------------------------------------------------
  // DATA SINKRONISASI JADWAL ROSTER & SCHEDULE V2
  // -------------------------------------------------------------
  let matchedSite: { id: number; name: string } | null = null
  if (quotation.projectName) {
    const siteRows = await db
      .select({ id: sites.id, name: sites.name })
      .from(sites)
      .where(or(
        eq(sites.name, quotation.projectName),
        ilike(sites.name, `%${quotation.projectName}%`)
      ))
      .limit(1)
    if (siteRows[0]) matchedSite = siteRows[0]
  }

  let rosterStartDateStr = ""
  let rosterEndDateStr = ""
  if (quotation.poPeriod) {
    const matchedDates = quotation.poPeriod.match(/\d{4}-\d{2}-\d{2}/g)
    if (matchedDates && matchedDates.length >= 2) {
      rosterStartDateStr = matchedDates[0]
      rosterEndDateStr = matchedDates[1]
    }
  }
  if (!rosterStartDateStr || !rosterEndDateStr) {
    const qDate = new Date(quotation.quotationDate)
    const validD = isNaN(qDate.getTime()) ? new Date() : qDate
    const y = validD.getFullYear()
    const m = String(validD.getMonth() + 1).padStart(2, "0")
    const lastDay = new Date(y, validD.getMonth() + 1, 0).getDate()
    rosterStartDateStr = `${y}-${m}-01`
    rosterEndDateStr = `${y}-${m}-${String(lastDay).padStart(2, "0")}`
  }

  const DAY_LETTERS = ["M", "S", "S", "R", "K", "J", "S"]
  const rosterDates: {
    iso: string
    day: number
    month: number
    year: number
    dayLetter: string
    isSunday: boolean
  }[] = []

  const [sY, sM, sD] = rosterStartDateStr.split("-").map(Number)
  const [eY, eM, eD] = rosterEndDateStr.split("-").map(Number)
  const cursorDate = new Date(Date.UTC(sY, sM - 1, sD))
  const endCursorDate = new Date(Date.UTC(eY, eM - 1, eD))

  while (cursorDate <= endCursorDate) {
    const y = cursorDate.getUTCFullYear()
    const m = cursorDate.getUTCMonth() + 1
    const d = cursorDate.getUTCDate()
    const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    const dayOfWeek = cursorDate.getUTCDay()
    rosterDates.push({
      iso,
      day: d,
      month: m,
      year: y,
      dayLetter: DAY_LETTERS[dayOfWeek],
      isSunday: dayOfWeek === 0,
    })
    cursorDate.setUTCDate(cursorDate.getUTCDate() + 1)
  }

  const uniqueRosterPeriods = [...new Set(rosterDates.map(r => r.iso.slice(0, 7)))]

  // Query Schedule V2
  const scheduleByEmpAndPeriod = new Map<string, string[]>()
  if (matchedSite?.id && uniqueRosterPeriods.length > 0) {
    const plans = await db
      .select({
        period: timesheetSchedulingPlansV2.period,
        activeSchedule: timesheetSchedulingPlansV2.activeSchedule,
        draftSchedule: timesheetSchedulingPlansV2.draftSchedule,
      })
      .from(timesheetSchedulingPlansV2)
      .where(and(
        eq(timesheetSchedulingPlansV2.siteId, matchedSite.id),
        inArray(timesheetSchedulingPlansV2.period, uniqueRosterPeriods)
      ))

    for (const plan of plans) {
      const list = ((plan.activeSchedule as any[])?.length ? plan.activeSchedule : plan.draftSchedule) as any[]
      if (Array.isArray(list)) {
        for (const row of list) {
          if (row.employeeId && Array.isArray(row.schedule)) {
            scheduleByEmpAndPeriod.set(`${row.employeeId}:${plan.period}`, row.schedule)
          }
        }
      }
    }
  }

  // Query Employee Data untuk SN dan Nama
  const allEmployees = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
    })
    .from(employees)
    .where(eq(employees.isActive, true))

  const empMapByName = new Map<string, { id: number; sn: string; name: string }>()
  for (const emp of allEmployees) {
    if (emp.name) {
      empMapByName.set(emp.name.trim().toLowerCase(), {
        id: emp.id,
        sn: emp.employeeSn || "-",
        name: emp.name,
      })
    }
  }

  // Bangun data baris personil roster
  const rosterRows: {
    no: number
    sn: string
    level: string
    name: string
    shifts: { dateIso: string; code: string; isOff?: boolean; isSunday: boolean }[]
    workingDays: number
  }[] = []

  let rosterRowIndex = 1
  for (const item of quotation.items) {
    const rawDesc = item.quotationItem.customDescription || item.item?.name || item.item?.jobTitle || `Personil ${rosterRowIndex}`
    let cleanPersonName = rawDesc.replace(/^Labour\s*cost\s*/i, '').trim()
    const matchParen = rawDesc.match(/\(([^)]+)\)/)
    if (matchParen && matchParen[1]) {
      cleanPersonName = matchParen[1].trim()
    }

    const level = item.quotationItem.level || item.item?.jobTitle || "1"

    let matchedEmp: { id: number; sn: string; name: string } | null = null
    if (cleanPersonName) {
      matchedEmp = empMapByName.get(cleanPersonName.toLowerCase()) || null
      if (!matchedEmp) {
        for (const [k, v] of empMapByName.entries()) {
          if (k.includes(cleanPersonName.toLowerCase()) || cleanPersonName.toLowerCase().includes(k)) {
            matchedEmp = v
            break
          }
        }
      }
    }

    const sn = matchedEmp?.sn && matchedEmp.sn !== "" ? matchedEmp.sn : "-"
    const empId = matchedEmp?.id || null

    let workingDaysCount = 0
    const shifts = rosterDates.map((dateObj) => {
      const periodStr = dateObj.iso.slice(0, 7)
      const dayIndex = dateObj.day - 1
      let code = "11"
      let isOff = false

      if (empId) {
        const sched = scheduleByEmpAndPeriod.get(`${empId}:${periodStr}`)
        if (sched && sched[dayIndex]) {
          const rawCode = sched[dayIndex].trim().toUpperCase()
          if (rawCode === "FB" || rawCode === "RR") {
            code = "FB"
          } else if (rawCode === "OFF" || rawCode === "LIBUR") {
            code = "11"
            isOff = true
          } else if (rawCode === "DS" || rawCode === "NS" || rawCode === "ST" || rawCode === "11") {
            code = "11"
          }
        }
      }

      if (code === "11") {
        workingDaysCount++
      }

      return {
        dateIso: dateObj.iso,
        code,
        isOff,
        isSunday: dateObj.isSunday,
      }
    })

    rosterRows.push({
      no: rosterRowIndex++,
      sn,
      level,
      name: (matchedEmp?.name || cleanPersonName).toUpperCase(),
      shifts,
      workingDays: workingDaysCount,
    })
  }

  const startMonthName = MONTH_NAMES[sM - 1] || "Bulan"
  const endMonthName = MONTH_NAMES[eM - 1] || "Bulan"
  const rosterHeaderTitle = sM === eM && sY === eY
    ? `ROSTER ${startMonthName.toUpperCase()} ${sY}`
    : `ROSTER PERIODE ${sD} ${startMonthName.toUpperCase()} - ${eD} ${endMonthName.toUpperCase()} ${eY}`

  const bastClosing = (
    <div data-bast-closing className="mt-4 text-[9pt]">
      <div className="leading-relaxed mb-4">
        Demikian Berita Acara ini dibuat dan ditanda tangani oleh kedua belah pihak.<br/>
        Sebagai dasar lampiran invoice untuk tagihan rental Bulan <span className="font-bold">{abbreviatePeriod(quotation.poPeriod)}</span><br/>
        <span className="font-bold">Reff PO {quotation.poNumber || '-'}</span>
      </div>

      <div className="flex justify-between w-full pt-4 text-[8.5pt]">
        <div className="flex flex-col items-center w-[250px] text-center">
          <p className="mb-12">Yang menerima,<br/>Untuk dan Atas Nama<br/><span className="font-bold">{quotation.customer?.customerName || '-'}</span></p>
          <div className="border-b border-slate-800 w-full mb-1 border-dashed"></div>
          <p className="font-bold">( {quotation.attn || "Nama Tanda tangan & Cap"} )</p>
        </div>
        <div className="flex flex-col items-center w-[250px] text-center">
          <p className="mb-12">Yang menyerahkan,<br/>Untuk dan Atas Nama<br/><span className="font-bold">PT. Chitra Paratama</span></p>
          <div className="border-b border-slate-800 w-full mb-1 border-dashed relative">
            {signatureUrl && (
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-28 h-20 flex items-end justify-center pointer-events-none">
                <img src={signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain mix-blend-multiply" />
              </div>
            )}
          </div>
          <p className="font-bold">( {quotation.fromName || "Nama Tanda tangan & Cap"} )</p>
        </div>
      </div>
    </div>
  )


  // Pagination: A4 page capacity estimates
  // First page has a tall header so fewer row units fit.
  // ponytail: estimate wrapped row height server-side; use DOM measurement only if item content becomes arbitrary rich text.
  const ITEM_UNITS_FIRST_PAGE = 6
  const ITEM_UNITS_NEXT_PAGE = 11
  const FOOTER_UNITS = 4
  const getItemPageUnits = (item: (typeof quotation.items)[number]) => {
    const description = item.quotationItem.customDescription || item.item?.name || ''
    const period = item.quotationItem.monthPeriod || ''
    const wrappedLines = Math.max(
      1,
      Math.ceil(description.length / 55),
      quotation.hideMonthColumn ? 1 : Math.ceil(period.length / 32),
    )
    return wrappedLines + (item.quotationItem.isBackup ? 1 : 0)
  }
  const getPageUnits = (items: typeof quotation.items) =>
    items.reduce((total, item) => total + getItemPageUnits(item), 0)

  const chunks: any[][] = [];
  let remaining = [...quotation.items];
  let pageIndexCounter = 0;

  while (remaining.length > 0 || pageIndexCounter === 0) {
    const isFirstPage = pageIndexCounter === 0;
    const maxUnits = isFirstPage ? ITEM_UNITS_FIRST_PAGE : ITEM_UNITS_NEXT_PAGE
    const maxUnitsWithFooter = maxUnits - FOOTER_UNITS

    if (remaining.length === 0) {
      // No items left but we need at least one page
      chunks.push([]);
      break;
    }

    const remainingUnits = getPageUnits(remaining)

    if (remainingUnits <= maxUnits) {
      if (remainingUnits <= maxUnitsWithFooter) {
        // Fits with footer on same page
        chunks.push(remaining);
        remaining = [];
      } else {
        // Items fit but no room for footer — push items, then empty footer page
        chunks.push(remaining);
        remaining = [];
        chunks.push([]); // dedicated footer page
      }
    } else {
      // More pages needed: keep each item intact and repeat the table header on the next page.
      let pageUnits = 0
      let takeCount = 0
      while (takeCount < remaining.length) {
        const itemUnits = getItemPageUnits(remaining[takeCount])
        if (takeCount > 0 && pageUnits + itemUnits > maxUnits) break
        pageUnits += itemUnits
        takeCount++
      }
      chunks.push(remaining.slice(0, takeCount))
      remaining = remaining.slice(takeCount)
    }
    pageIndexCounter++;
  }

  // Pre-calculate global indices
  let runningIndex = 0;
  const chunkStartIndices = chunks.map(chunk => {
    const start = runningIndex;
    runningIndex += chunk.length;
    return start;
  });

  return (
    <div className="w-full p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4 no-print bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/360-service/quotations">
            <Button variant="outline" size="sm">Back</Button>
          </Link>
          <Link href={`/dashboard/360-service/quotations/${quotation.id}/edit`}>
            <Button variant="outline" size="sm">Edit</Button>
          </Link>
          <h1 className="text-lg font-bold tracking-tight text-slate-800 ml-2">Quotation Preview</h1>
        </div>
        <div className="flex items-center gap-2">
          <Suspense fallback={<Button disabled className="bg-teal-600 text-white">Loading...</Button>}>
            <PrintButton 
              quotationId={quotation.id}
              initialIncludeBast={quotation.includeBast}
              initialIncludeRoster={quotation.includeRoster}
            />
          </Suspense>
        </div>
      </div>

      <div className="flex flex-col items-center overflow-auto p-4 bg-muted rounded-xl gap-8 print:p-0 print:bg-white print:gap-0">
        {chunks.map((chunk, pageIndex) => (
          <div key={pageIndex} data-quotation-page className="pdf-wrapper relative bg-white shadow-xl w-[210mm] h-[297mm] overflow-hidden text-[10pt] font-sans text-black shrink-0">
            
            {/* Background Image for Letterhead */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              <Image 
                src="/ChitraParatama_Stationery_Letterhead_jkt.jpg" 
                alt="Letterhead" 
                fill 
                className="object-cover"
                priority={true}
              />
            </div>

            {/* Document Content */}
            <div data-quotation-content className={`relative z-10 px-[15mm] pt-[35mm] pb-[50mm] h-full flex flex-col font-sans text-slate-800 ${chunk.length === 0 ? 'justify-start' : 'justify-between'}`}>
              <div data-quotation-main>
                {pageIndex > 0 && (
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 text-slate-400 text-[8pt] uppercase tracking-wider font-semibold">
                    <span>Ref: {quotation.quotationNumber}</span>
                    <span data-quotation-page-counter className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Page {pageIndex + 1} of {chunks.length}</span>
                  </div>
                )}

                {pageIndex === 0 && (
                  <>
                    <div className="flex justify-between items-start mb-6 mt-8">
                      <div className="flex gap-4 text-[8pt] flex-1 mr-6">
                        <div className="flex-1 border border-teal-100/60 bg-teal-50/20 rounded-lg p-3 shadow-sm">
                          <p className="font-bold text-teal-700 uppercase tracking-wider mb-2 text-[7pt] flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-teal-500"></span>
                            Customer Details
                          </p>
                          <table className="leading-tight w-full">
                            <tbody>
                              <tr>
                                <td className="w-[30px] text-slate-500 font-medium align-top py-0.5">To</td>
                                <td className="w-[10px] text-slate-300 align-top py-0.5">:</td>
                                <td className="font-bold text-slate-800 align-top py-0.5">{quotation.customer?.customerName}</td>
                              </tr>
                              <tr>
                                <td className="text-slate-500 font-medium align-top py-0.5">Attn</td>
                                <td className="text-slate-300 align-top py-0.5">:</td>
                                <td className="font-semibold text-slate-700 align-top py-0.5">{quotation.attn || '-'}</td>
                              </tr>
                              <tr>
                                <td className="text-slate-500 font-medium align-top py-0.5">Cc</td>
                                <td className="text-slate-300 align-top py-0.5">:</td>
                                <td className="font-semibold text-slate-700 align-top py-0.5">{quotation.cc || '-'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        
                        <div className="flex-1 border border-teal-100/60 bg-teal-50/20 rounded-lg p-3 shadow-sm">
                          <p className="font-bold text-teal-700 uppercase tracking-wider mb-2 text-[7pt] flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-teal-500"></span>
                            Project Details
                          </p>
                          <table className="leading-tight w-full">
                            <tbody>
                              <tr>
                                <td className="w-[45px] text-slate-500 font-medium align-top py-0.5">From</td>
                                <td className="w-[10px] text-slate-300 align-top py-0.5">:</td>
                                <td className="font-bold text-slate-800 align-top py-0.5">{quotation.fromName || '-'}</td>
                              </tr>
                              <tr>
                                <td className="text-slate-500 font-medium align-top py-0.5">Subject</td>
                                <td className="text-slate-300 align-top py-0.5">:</td>
                                <td className="font-semibold text-slate-700 align-top py-0.5">{quotation.subject || '-'}</td>
                              </tr>
                              <tr>
                                <td className="text-slate-500 font-medium align-top py-0.5">PO Num</td>
                                <td className="text-slate-300 align-top py-0.5">:</td>
                                <td className="font-semibold text-slate-700 align-top py-0.5">{quotation.poNumber || '-'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="text-right shrink-0 border border-slate-200/60 bg-slate-50/50 rounded-lg p-3 shadow-sm min-w-[160px]">
                        <h2 className="text-2xl font-black tracking-tighter text-teal-700 uppercase mb-1">Quotation</h2>
                        <p className="text-[9pt] font-bold text-slate-800">Ref: {quotation.quotationNumber}</p>
                        <p className="text-[8pt] font-medium text-slate-500">{formattedDate}</p>
                        {chunks.length > 1 && (
                          <div data-quotation-page-counter className="mt-2 inline-block bg-teal-100/80 text-teal-800 px-2 py-0.5 rounded text-[7.5pt] font-bold uppercase">
                            Page 1 of {chunks.length}
                          </div>
                        )}
                      </div>
                    </div>

                    {quotation.showIntro !== false && (
                      <div className="text-[9.5pt] mb-6 text-justify leading-relaxed text-slate-600 whitespace-pre-wrap">
                        {quotation.customIntro ? (
                          quotation.customIntro
                        ) : (
                          <>
                            <p className="mb-3 font-medium text-slate-800">Dear Mr. {quotation.attn || '-'} / Mr. {quotation.cc || '-'},</p>
                            <p>
                              As you are aware, <span className="font-semibold text-slate-800">Tire Maintenance</span> is performing services at <span className="font-semibold text-slate-800">{quotation.projectName || '[Project Name]'}</span>. Could you please raise a Purchase Order (PO) for the period of <span className="font-semibold text-teal-700">{abbreviatePeriod(quotation.poPeriod)}</span> 
                            </p>
                            <p className="mt-2">
                              We are pleased to quote you the labor price for our Tire Maintenance services as follows:
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}

                {chunk.length > 0 && (
                  <div data-quotation-table className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    <table className="w-full border-collapse text-[9pt]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[7.5pt]">
                          <th className="border-b border-r border-slate-200 py-2 px-2 w-[40px] font-bold">No</th>
                          {!quotation.hideMonthColumn && <th className="border-b border-r border-slate-200 py-2 px-2 w-[160px] font-bold">Month</th>}
                          <th className="border-b border-r border-slate-200 py-2 px-3 font-bold text-left">Description</th>
                          {quotation.showLevel !== false && <th className="border-b border-r border-slate-200 py-2 px-2 w-[60px] font-bold text-center">Level</th>}
                          {quotation.showQty && <th className="border-b border-r border-slate-200 py-2 px-2 w-[40px] font-bold text-center">Qty</th>}
                          <th className="border-b border-r border-slate-200 py-2 px-2 w-[110px] font-bold text-right">Price/Mo</th>
                          <th className="border-b border-slate-200 py-2 px-2 w-[110px] font-bold text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody data-quotation-items className="bg-white">
                        {chunk.map((item: any, idx: number) => {
                          const desc = item.quotationItem.customDescription || item.item?.name || ''
                          const isAccomodation = desc.toLowerCase().includes("accomodation") || desc.toLowerCase().includes("accommodation")
                          
                          const globalIndex = chunkStartIndices[pageIndex] + idx;
                          const isEven = idx % 2 === 0;

                          const PRORATE_CATS = ["Labour Cost", "Rental & Tools", "Rental", "Tools"];
                          const itemCategory = item.item?.category || "";
                          const isProrateEligible = PRORATE_CATS.includes(itemCategory) || itemCategory === "";

                          let backupProrate = 0;
                          if (item.quotationItem.isBackup && isProrateEligible) {
                            const billingStart = item.quotationItem.monthPeriod?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
                            backupProrate = calculateStartMonthProrateFactor(
                              item.quotationItem.backupStartDate,
                              item.quotationItem.backupEndDate,
                              billingStart || item.quotationItem.backupStartDate,
                            ) * (Number(item.quotationItem.backupPrice) || 0) * Number(item.quotationItem.quantity);
                          }
                          const primaryProrate = Number(item.quotationItem.subtotal) - backupProrate;

                          return (
                            <tr key={idx} className={`border-b last:border-b-0 border-slate-100 text-slate-700 ${isEven ? 'bg-white' : 'bg-slate-50/50'}`}>
                              <td className="border-r border-slate-100 text-center py-1.5 font-medium text-slate-500">
                                {globalIndex + 1}
                              </td>
                              {!quotation.hideMonthColumn && <td className="border-r border-slate-100 px-2 text-center text-[8.5pt] align-top py-2">
                                <div className="flex flex-col gap-1">
                                  <span>{abbreviatePeriod(item.quotationItem.monthPeriod)}</span>
                                  {quotation.showDays !== false && (() => {
                                    const days = parseDaysFromMonthPeriod(item.quotationItem.monthPeriod);
                                    return days > 0 ? (
                                      <span className="text-[7.5pt] text-slate-400 font-medium">({days} hari)</span>
                                    ) : null;
                                  })()}
                                  {item.quotationItem.isBackup && !quotation.hideBackupDate && (
                                    <span className="text-teal-600 font-medium pt-1 border-t border-slate-100">{item.quotationItem.backupMonthPeriod || '-'}</span>
                                  )}
                                  {item.quotationItem.isBackup && !quotation.hideBackupDate && quotation.showDays !== false && (() => {
                                    const days = parseDaysFromMonthPeriod(item.quotationItem.backupMonthPeriod || '');
                                    return days > 0 ? (
                                      <span className="text-[7.5pt] text-teal-400 font-medium">({days} hari)</span>
                                    ) : null;
                                  })()}
                                </div>
                              </td>}
                              <td className="border-r border-slate-100 px-3 text-left font-medium text-slate-800 align-top py-2">
                                <div className="flex flex-col gap-1">
                                  <span>{desc}</span>
                                  {item.quotationItem.isBackup && (
                                    <span className="text-teal-600 pt-1 border-t border-slate-100">{item.quotationItem.backupDescription || 'Backup Labour'}</span>
                                  )}
                                </div>
                              </td>
                              {quotation.showLevel !== false && (
                                <td className="border-r border-slate-100 text-center align-top py-2">
                                  <div className="flex flex-col gap-2 items-center">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[8pt] font-bold">{item.quotationItem.level}</span>
                                    {item.quotationItem.isBackup && !quotation.hideBackupDate && (
                                      <span className="bg-teal-50 text-teal-600 px-2 py-0.5 rounded text-[8pt] font-bold border border-teal-100">{item.quotationItem.backupLevel || '-'}</span>
                                    )}
                                  </div>
                                </td>
                              )}
                              {quotation.showQty && (
                                <td className="border-r border-slate-100 text-center align-top py-2">
                                  <div className="flex flex-col gap-2 items-center">
                                    <span className="text-[8.5pt] font-medium text-slate-700">{Number(item.quotationItem.quantity)}</span>
                                    {item.quotationItem.isBackup && !quotation.hideBackupDate && (
                                      <span className="text-[8.5pt] font-medium text-teal-600 pt-1 border-t border-slate-100 w-full">{Number(item.quotationItem.quantity)}</span>
                                    )}
                                  </div>
                                </td>
                              )}
                              <td className="border-r border-slate-100 px-2 text-right align-top py-2">
                                <div className="flex flex-col gap-1 w-full text-[8.5pt]">
                                  <div className="flex justify-between w-full">
                                    <span className="text-slate-400">Rp</span>
                                    <span className="font-semibold">{Number(item.quotationItem.price).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                  </div>
                                  {item.quotationItem.isBackup && !quotation.hideBackupPrice && !quotation.hideBackupDate && (
                                    <div className="flex justify-between w-full pt-1 border-t border-slate-100 text-teal-700">
                                      <span className="text-slate-400">Rp</span>
                                      <span className="font-semibold">{Number(item.quotationItem.backupPrice).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 text-right align-top py-2">
                                <div className="flex flex-col gap-1 w-full text-[8.5pt]">
                                  <div className="flex justify-between w-full">
                                    <span className="text-slate-400">Rp</span>
                                    <span className="font-bold text-[9pt] text-teal-700">{Number(quotation.hideBackupPrice ? (primaryProrate + backupProrate) : primaryProrate).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                  </div>
                                  {item.quotationItem.isBackup && !quotation.hideBackupPrice && !quotation.hideBackupDate && (
                                    <div className="flex justify-between w-full pt-1 border-t border-slate-100">
                                      <span className="text-slate-400">Rp</span>
                                      <span className="font-bold text-[9pt] text-teal-700">{Number(backupProrate).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* FOOTER REDESIGN */}
              {pageIndex === chunks.length - 1 && (
                <div data-quotation-summary className={chunk.length === 0 ? 'pt-4' : 'pt-8'}>
                  <div className="flex justify-between w-full items-end gap-6">
                    <div className="flex-1 text-[8pt] text-slate-500 mb-2 whitespace-pre-wrap">
                      {quotation.notes && (
                        <>
                          <div className="font-bold text-slate-700 mb-1">Notes:</div>
                          {quotation.notes}
                        </>
                      )}
                    </div>
                    <div className="w-[280px] bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-sm shrink-0">
                      <div className="flex items-center text-slate-600 py-1.5 border-b border-slate-200/60">
                        <div className="w-[100px] text-right pr-4 text-[8pt] font-bold uppercase tracking-wider text-slate-500">Subtotal</div>
                        <div className="flex-1 flex justify-between font-semibold text-[9pt]">
                          <span className="text-slate-400">Rp</span>
                          <span>{Number(quotation.subTotal).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                      {hasDiscount && (
                        <div className="flex items-center text-slate-600 py-1.5 border-b border-slate-200/60">
                          <div className="w-[100px] text-right pr-4 text-[8pt] font-bold uppercase tracking-wider text-slate-500">Discount{quotation.discountType === 'percent' ? ` (${Number(quotation.discountValue)}%)` : ''}</div>
                          <div className="flex-1 flex justify-between font-semibold text-[9pt]"><span className="text-slate-400">Rp</span><span>-{quotationTotals.discountAmount.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>
                        </div>
                      )}
                      {hasDiscount && (
                        <div className="flex items-center text-slate-600 py-1.5 border-b border-slate-200/60">
                          <div className="w-[100px] text-right pr-4 text-[8pt] font-bold uppercase tracking-wider text-slate-500">Total Sebelum VAT</div>
                          <div className="flex-1 flex justify-between font-semibold text-[9pt]"><span className="text-slate-400">Rp</span><span>{quotationTotals.discountedSubTotal.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>
                        </div>
                      )}
                      <div className="flex items-center text-slate-600 py-1.5 border-b border-slate-200/60">
                        <div className="w-[100px] text-right pr-4 text-[8pt] font-bold uppercase tracking-wider text-slate-500">VAT ({Number(quotation.taxRate)}%)</div>
                        <div className="flex-1 flex justify-between font-semibold text-[9pt]"><span className="text-slate-400">Rp</span><span>{quotationTotals.taxAmount.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>
                      </div>
                      <div className="flex items-center bg-teal-600 text-white py-2.5 mt-3 rounded-lg px-3 shadow-md shadow-teal-600/20">
                        <div className="w-[90px] text-right pr-3 text-[9pt] font-black uppercase tracking-widest text-teal-50">Grand Total</div>
                        <div className="flex-1 flex justify-between font-black text-[11pt]">
                          <span className="text-teal-200">Rp</span>
                          <span>{quotationTotals.grandTotal.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-12 flex justify-between text-[9pt] w-full px-4">
                    <div className="flex flex-col items-center">
                      <p className="font-bold text-slate-400 mb-10 uppercase text-[7.5pt] tracking-widest">Prepared By</p>
                      <div className="h-0 w-40 border-b-2 border-dashed border-slate-300 relative">
                        {signatureUrl && (
                          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-28 h-20 flex items-end justify-center pointer-events-none">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                          </div>
                        )}
                      </div>
                      <p className="font-bold text-slate-800 text-[10pt] mt-3">{quotation.fromName || 'Nur Sabrina F.U'}</p>
                      <p className="text-slate-500 text-[8pt] font-medium uppercase tracking-wider">PT. Chitra Paratama</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="font-bold text-slate-400 mb-10 uppercase text-[7.5pt] tracking-widest">Acknowledged By</p>
                      <div className="h-0 w-40 border-b-2 border-dashed border-slate-300 relative">
                        {/* Placeholder for Signature */}
                      </div>
                      <p className="font-bold text-slate-800 text-[10pt] mt-3">{quotation.attn || 'Client Representative'}</p>
                      <p className="text-slate-500 text-[8pt] font-medium uppercase tracking-wider">{quotation.customer?.customerName || 'PT. Cipta Kridatama'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* BAST PAGE */}
        {quotation.includeBast && rentalItems.length > 0 && (
          <>
            <div data-bast-page className="pdf-wrapper relative bg-white shadow-xl w-[210mm] h-[297mm] overflow-hidden text-[10pt] font-sans text-black shrink-0">
            <div className="absolute inset-0 z-0 pointer-events-none">
              <Image 
                src="/ChitraParatama_Stationery_Letterhead_jkt.jpg" 
                alt="Letterhead" 
                fill 
                className="object-cover"
                priority={true}
              />
            </div>
            
            <div data-bast-content className="relative z-10 px-[15mm] pt-[35mm] pb-[45mm] h-full flex flex-col font-sans text-slate-800">
              <div data-bast-main>
              <div className="text-center font-bold text-[14pt] underline mb-8 mt-10 uppercase">
                BERITA ACARA SERAH TERIMA RENTAL
              </div>
              
              <div className="mb-6 leading-relaxed">
                <table className="w-full max-w-[200px]">
                  <tbody>
                    <tr>
                      <td className="w-24">Pada hari ini</td>
                      <td className="w-4">:</td>
                      <td>{getDayName(quotation.quotationDate)}</td>
                    </tr>
                    <tr>
                      <td>Tanggal</td>
                      <td>:</td>
                      <td>{getDayNumber(quotation.quotationDate)}</td>
                    </tr>
                    <tr>
                      <td>Bulan</td>
                      <td>:</td>
                      <td>{getMonthName(quotation.quotationDate)}</td>
                    </tr>
                    <tr>
                      <td>Tahun</td>
                      <td>:</td>
                      <td>{getYearName(quotation.quotationDate)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mb-4 leading-relaxed text-justify">
                Kami informasikan untuk tagihan RENTAL periode <span className="font-bold">{abbreviatePeriod(quotation.poPeriod)}</span> site <span className="font-bold">{quotation.projectName || '-'}</span> adalah sebesar <span className="font-bold">IDR {Number(totalRental).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span> (Exclude PPn)
              </div>
              
              <div className="mb-4">
                Adapun detail keterangannya adalah sebagai berikut;
              </div>

              <div className="mb-6">
                <table className="w-full border-collapse border border-slate-800 text-[9pt]">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-center">
                      <th className="border border-slate-800 py-2 px-2 w-[50px]">No</th>
                      <th className="border border-slate-800 py-2 px-2">Description</th>
                      <th className="border border-slate-800 py-2 px-2 w-[180px]">Period</th>
                      <th className="border border-slate-800 py-2 px-2 w-[150px]">Allocation site</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rentalItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border border-slate-800 text-center py-2 px-2">{idx + 1}</td>
                        <td className="border border-slate-800 py-2 px-3">
                          <div className="flex flex-col gap-1">
                            <span>{item.quotationItem.customDescription || item.item?.name || ''}</span>
                            {item.quotationItem.isBackup && (
                              <span className="text-teal-600 pt-1 border-t border-slate-200">{item.quotationItem.backupDescription || 'Backup Rental'}</span>
                            )}
                          </div>
                        </td>
                        <td className="border border-slate-800 text-center py-2 px-2">
                          <div className="flex flex-col gap-1">
                            <span>{abbreviatePeriod(item.quotationItem.monthPeriod)}</span>
                            {item.quotationItem.isBackup && !quotation.hideBackupDate && (
                              <span className="text-teal-600 font-medium pt-1 border-t border-slate-200">{item.quotationItem.backupMonthPeriod || '-'}</span>
                            )}
                          </div>
                        </td>
                        <td className="border border-slate-800 text-center py-2 px-2">{quotation.projectName || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>

              {bastClosing}
            </div>
            </div>

            <div data-bast-overflow-page className="pdf-wrapper relative hidden bg-white shadow-xl w-[210mm] h-[297mm] overflow-hidden text-[10pt] font-sans text-black shrink-0">
            <div className="absolute inset-0 z-0 pointer-events-none">
              <Image
                src="/ChitraParatama_Stationery_Letterhead_jkt.jpg"
                alt="Letterhead"
                fill
                className="object-cover"
                priority={true}
              />
            </div>

            <div data-bast-overflow-content className="relative z-10 px-[15mm] pt-[35mm] pb-[45mm] h-full flex flex-col font-sans text-slate-800" />
            </div>
          </>
        )}

        {/* ROSTER PAGE (LANDSCAPE) */}
        <div data-roster-page className={`pdf-wrapper roster-landscape-page relative bg-white shadow-xl w-[297mm] h-[210mm] overflow-hidden text-[10pt] font-sans text-black shrink-0 my-6 ${!quotation.includeRoster ? 'hidden' : ''}`}>
          <div className="relative z-10 px-[10mm] py-[8mm] h-full flex flex-col font-sans text-slate-800 justify-between">
            <div>
              {/* Header Title */}
              <div className="mb-2">
                <div className="text-base font-extrabold text-slate-900 tracking-wider uppercase">
                  {rosterHeaderTitle}
                </div>
                <div className="h-1 bg-[#00B0F0] w-full mt-1 mb-2"></div>
              </div>

              {/* Table Grid Roster */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[7.5pt] border border-slate-400">
                  <thead>
                    <tr className="text-slate-900 font-bold">
                      <th rowSpan={2} className="border border-slate-400 px-1 py-1 text-center bg-slate-100 w-[24px]">
                        NO
                      </th>
                      <th rowSpan={2} className="border border-slate-400 px-1 py-1 text-center bg-slate-100 min-w-[45px] max-w-[55px]">
                        SN
                      </th>
                      <th rowSpan={2} className="border border-slate-400 px-1 py-1 text-center bg-slate-100 w-[26px]">
                        Lv
                      </th>
                      <th rowSpan={2} className="border border-slate-400 px-2 py-1 text-left bg-slate-100 min-w-[140px] max-w-[190px]">
                        NAMA/TANGGAL
                      </th>
                      {rosterDates.map((d) => (
                        <th
                          key={`letter-${d.iso}`}
                          className={`border border-slate-400 px-0.5 py-0.5 text-center w-[20px] font-bold ${
                            d.isSunday
                              ? "bg-[#FCD5B4] text-amber-950"
                              : "bg-[#00B0F0] text-white"
                          }`}
                        >
                          {d.dayLetter}
                        </th>
                      ))}
                      <th rowSpan={2} className="border border-slate-400 px-1 py-1 text-center bg-[#C6E0B4] text-emerald-950 font-bold w-[48px] leading-tight">
                        WORKING DAYS
                      </th>
                    </tr>
                    <tr className="text-slate-900 font-bold">
                      {rosterDates.map((d) => (
                        <th
                          key={`num-${d.iso}`}
                          className={`border border-slate-400 px-0.5 py-0.5 text-center w-[20px] text-[7pt] ${
                            d.isSunday
                              ? "bg-[#FCD5B4] text-amber-950 font-bold"
                              : "bg-[#F2F2F2] text-slate-800"
                          }`}
                        >
                          {d.day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rosterRows.map((row) => (
                      <tr key={row.no} className="hover:bg-slate-50/50">
                        <td className="border border-slate-400 px-1 py-0.5 text-center text-slate-600 font-mono text-[7pt]">
                          {row.no}
                        </td>
                        <td className="border border-slate-400 px-1 py-0.5 text-center font-mono text-[7pt] text-slate-700">
                          {row.sn}
                        </td>
                        <td className="border border-slate-400 px-1 py-0.5 text-center font-bold text-[7pt] text-slate-800">
                          {row.level}
                        </td>
                        <td className="border border-slate-400 px-2 py-0.5 font-semibold text-slate-900 uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[190px] text-[7pt]" title={row.name}>
                          {row.name}
                        </td>
                        {row.shifts.map((shift) => {
                          const isFb = shift.code === "FB"
                          const isOff = shift.isOff
                          return (
                            <td
                              key={shift.dateIso}
                              className={`border border-slate-300 px-0.5 py-0.5 text-center font-bold text-[7pt] ${
                                isFb
                                  ? "bg-[#B4C6E7] text-[#1F4E79]"
                                  : isOff
                                  ? "bg-[#FCE4D6] text-[#C65911]"
                                  : "bg-white text-slate-800"
                              }`}
                            >
                              {shift.code}
                            </td>
                          )
                        })}
                        <td className="border border-slate-400 px-1 py-0.5 text-center font-bold text-[7.5pt] bg-[#E2EFDA] text-emerald-950">
                          {row.workingDays}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Signatures matching user's document */}
            <div className="mt-4 pt-2 flex justify-between items-start text-xs text-slate-800 px-4">
              <div className="flex flex-col items-center w-[220px]">
                <p className="font-semibold mb-12 text-center">Prepared By :</p>
                <div className="w-full border-b border-slate-600 text-center pb-0.5">
                  ( {quotation.fromName || "                     "} )
                </div>
              </div>
              <div className="flex flex-col items-center w-[220px]">
                <p className="font-semibold mb-12 text-center">Anknowled By :</p>
                <div className="w-full border-b border-slate-600 text-center pb-0.5">
                  ( {quotation.attn || "                     "} )
                </div>
              </div>
              <div className="flex flex-col items-center w-[220px]">
                <p className="font-semibold mb-12 text-center">
                  Approval By {matchedSite?.name || quotation.projectName || "Site"} :
                </p>
                <div className="w-full border-b border-slate-600 text-center pb-0.5">
                  (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Global Print & Layout Styles specifically for this document */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Sembunyikan Navbar Chitra Hub dan Sidebar HERO di Quotation Preview */
        [data-admin-dashboard-shell] > header,
        [data-slot="sidebar"] {
          display: none !important;
        }
        main[data-slot="sidebar-inset"] {
          margin: 0 !important;
          padding: 0 !important;
        }
        
        @page roster-landscape {
          size: A4 landscape;
          margin: 0;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .pdf-wrapper, .pdf-wrapper * {
            visibility: visible;
          }
          .pdf-wrapper {
            position: relative !important;
            width: 100% !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-after: always;
            break-after: page;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .roster-landscape-page {
            page: roster-landscape !important;
            width: 297mm !important;
            height: 210mm !important;
            page-break-before: always !important;
            break-before: page !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}} />
    </div>
  )
}
