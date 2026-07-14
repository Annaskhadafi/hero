import { getQuotationById } from "@/app/actions/service360"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { PrintButton } from "./print-button"
import { Suspense } from "react"
import { resolveUploadUrl } from "@/lib/s3-storage"

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
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
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const bulan = `${monthNames[dateStr.getMonth()]} ${dateStr.getFullYear()}`;
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

  const getDaysInStartMonth = (dateStr: string | null) => {
    if (!dateStr) return 31;
    const d = new Date(dateStr);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  };

  const rentalItems = quotation.items.filter(i => {
    const cat = i.item?.category || '';
    const desc = (i.quotationItem.customDescription || '').toLowerCase();
    return cat === "Rental" || cat === "Rental & Tools" || desc.includes("rental");
  });
  let totalRental = 0;
  rentalItems.forEach(item => {
    let backupProrate = 0;
    if (item.quotationItem.isBackup) {
      const backupDays = calculateDays(item.quotationItem.backupStartDate, item.quotationItem.backupEndDate);
      const daysInMonth = getDaysInStartMonth(item.quotationItem.backupStartDate);
      backupProrate = (backupDays / daysInMonth) * (Number(item.quotationItem.backupPrice) || 0) * Number(item.quotationItem.quantity);
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


  // Pagination: A4 page capacity estimates
  // First page has a tall header so fewer items fit
  // Footer (Total box + TTD) takes ~4 row-heights worth of space
  const ITEMS_PER_PAGE_FIRST = 6;   // conservative for first page (header is tall)
  const ITEMS_PER_PAGE_REST = 11;   // conservative for subsequent pages
  const FOOTER_ROWS = 4;             // rows worth of space the footer+total+signature needs

  const chunks: any[][] = [];
  let remaining = [...quotation.items];
  let pageIndexCounter = 0;

  while (remaining.length > 0 || pageIndexCounter === 0) {
    const isFirstPage = pageIndexCounter === 0;
    const maxItems = isFirstPage ? ITEMS_PER_PAGE_FIRST : ITEMS_PER_PAGE_REST;
    const maxItemsWithFooter = maxItems - FOOTER_ROWS; // space needed for footer on last page

    if (remaining.length === 0) {
      // No items left but we need at least one page
      chunks.push([]);
      break;
    }

    const isLastBatch = remaining.length <= maxItems;

    if (isLastBatch) {
      if (remaining.length <= maxItemsWithFooter) {
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
      // More pages needed, fill this page fully
      chunks.push(remaining.slice(0, maxItems));
      remaining = remaining.slice(maxItems);
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
      <div className="flex justify-between items-center no-print">
        <h1 className="text-2xl font-bold tracking-tight">Quotation Preview</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/360-service/quotations">
            <Button variant="outline">Back</Button>
          </Link>
          <Suspense fallback={<Button disabled className="bg-teal-600 text-white">Loading...</Button>}>
            <PrintButton />
          </Suspense>
        </div>
      </div>

      <div className="flex flex-col items-center overflow-auto p-4 bg-muted no-print rounded-xl gap-8">
        {chunks.map((chunk, pageIndex) => (
          <div key={pageIndex} className="pdf-wrapper relative bg-white shadow-xl w-[210mm] h-[297mm] overflow-hidden text-[10pt] font-sans text-black shrink-0">
            
            {/* Background Image for Letterhead */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              <Image 
                src="/ChitraParatama_Stationery_Letterhead_jkt.jpg" 
                alt="Letterhead" 
                fill 
                className="object-cover"
                priority={pageIndex === 0}
              />
            </div>

            {/* Document Content */}
            <div className="relative z-10 px-[15mm] pt-[35mm] pb-[45mm] h-full flex flex-col font-sans text-slate-800 justify-between">
              <div>
                {pageIndex > 0 && (
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 text-slate-400 text-[8pt] uppercase tracking-wider font-semibold">
                    <span>Ref: {quotation.quotationNumber}</span>
                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Page {pageIndex + 1} of {chunks.length}</span>
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
                          <div className="mt-2 inline-block bg-teal-100/80 text-teal-800 px-2 py-0.5 rounded text-[7.5pt] font-bold uppercase">
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
                  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    <table className="w-full border-collapse text-[9pt]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[7.5pt]">
                          <th className="border-b border-r border-slate-200 py-2 px-2 w-[40px] font-bold">No</th>
                          <th className="border-b border-r border-slate-200 py-2 px-2 w-[160px] font-bold">Month</th>
                          <th className="border-b border-r border-slate-200 py-2 px-3 font-bold text-left">Description</th>
                          {quotation.showLevel !== false && <th className="border-b border-r border-slate-200 py-2 px-2 w-[60px] font-bold text-center">Level</th>}
                          {quotation.showQty && <th className="border-b border-r border-slate-200 py-2 px-2 w-[40px] font-bold text-center">Qty</th>}
                          <th className="border-b border-r border-slate-200 py-2 px-2 w-[110px] font-bold text-right">Price/Mo</th>
                          <th className="border-b border-slate-200 py-2 px-2 w-[110px] font-bold text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
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
                            const backupDays = calculateDays(item.quotationItem.backupStartDate, item.quotationItem.backupEndDate);
                            const daysInMonth = getDaysInStartMonth(item.quotationItem.backupStartDate);
                            backupProrate = (backupDays / daysInMonth) * (Number(item.quotationItem.backupPrice) || 0) * Number(item.quotationItem.quantity);
                          }
                          const primaryProrate = Number(item.quotationItem.subtotal) - backupProrate;

                          return (
                            <tr key={idx} className={`border-b last:border-b-0 border-slate-100 text-slate-700 ${isEven ? 'bg-white' : 'bg-slate-50/50'}`}>
                              <td className="border-r border-slate-100 text-center py-1.5 font-medium text-slate-500">
                                {isAccomodation ? '' : globalIndex + 1}
                              </td>
                              <td className="border-r border-slate-100 px-2 text-center text-[8.5pt] align-top py-2">
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
                              </td>
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
                <div className="pt-8">
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
                      <div className="flex items-center text-slate-600 py-1.5 border-b border-slate-200/60">
                        <div className="w-[100px] text-right pr-4 text-[8pt] font-bold uppercase tracking-wider text-slate-500">Total (Non VAT)</div>
                        <div className="flex-1 flex justify-between font-semibold text-[9pt]">
                          <span className="text-slate-400">Rp</span>
                          <span>{Number(quotation.subTotal).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                      <div className="flex items-center text-slate-600 py-1.5 border-b border-slate-200/60">
                        <div className="w-[100px] text-right pr-4 text-[8pt] font-bold uppercase tracking-wider text-slate-500">VAT ({Number(quotation.taxRate)}%)</div>
                        <div className="flex-1 flex justify-between font-semibold text-[9pt]">
                          <span className="text-slate-400">Rp</span>
                          <span>{Number(quotation.taxAmount).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                      <div className="flex items-center bg-teal-600 text-white py-2.5 mt-3 rounded-lg px-3 shadow-md shadow-teal-600/20">
                        <div className="w-[90px] text-right pr-3 text-[9pt] font-black uppercase tracking-widest text-teal-50">Total</div>
                        <div className="flex-1 flex justify-between font-black text-[11pt]">
                          <span className="text-teal-200">Rp</span>
                          <span>{Number(quotation.totalAmount).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
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
          <div className="pdf-wrapper relative bg-white shadow-xl w-[210mm] h-[297mm] overflow-hidden text-[10pt] font-sans text-black shrink-0">
            <div className="absolute inset-0 z-0 pointer-events-none">
              <Image 
                src="/ChitraParatama_Stationery_Letterhead_jkt.jpg" 
                alt="Letterhead" 
                fill 
                className="object-cover"
              />
            </div>
            
            <div className="relative z-10 px-[15mm] pt-[35mm] pb-[45mm] h-full flex flex-col font-sans text-slate-800">
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

              <div className="leading-relaxed mb-10">
                Demikian Berita Acara ini dibuat dan ditanda tangani oleh kedua belah pihak.<br/>
                Sebagai dasar lampiran invoice untuk tagihan rental Bulan <span className="font-bold">{abbreviatePeriod(quotation.poPeriod)}</span><br/>
                <span className="font-bold">Reff PO {quotation.poNumber || '-'}</span>
              </div>

              <div className="flex justify-between w-full mt-auto pt-10">
                <div className="flex flex-col items-center w-[250px] text-center">
                  <p className="mb-20">Yang menerima,<br/>Untuk dan Atas Nama<br/><span className="font-bold">{quotation.customer?.customerName || '-'}</span></p>
                  <div className="border-b border-slate-800 w-full mb-1 border-dashed"></div>
                  <p className="font-bold">( {quotation.attn || "Nama Tanda tangan & Cap"} )</p>
                </div>
                <div className="flex flex-col items-center w-[250px] text-center">
                  <p className="mb-20">Yang menyerahkan,<br/>Untuk dan Atas Nama<br/><span className="font-bold">PT. Chitra Paratama</span></p>
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
          </div>
        )}
      </div>
      
      {/* Global Print Styles specifically for this document */}
      <style dangerouslySetInnerHTML={{__html: `
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
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}} />
    </div>
  )
}
