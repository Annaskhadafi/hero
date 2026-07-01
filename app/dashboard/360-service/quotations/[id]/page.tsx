import { getQuotationById } from "@/app/actions/service360"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { PrintButton } from "./print-button"
import { Suspense } from "react"

export const dynamic = "force-dynamic"

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

  // Helper to determine row color based on description
  const getRowIndexBg = (desc: string) => {
    if (desc && desc.toLowerCase().includes("accomodation") || desc.toLowerCase().includes("accommodation")) {
      return "bg-[#FCD5B4]" // Orange-ish
    }
    return "bg-[#92D050]" // Green
  }

  const dateStr = new Date(quotation.quotationDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const formattedDate = dateStr // "June, 2026" based on the image format

  // Advanced Pagination logic for A4 size
  const ITEMS_PER_PAGE_FIRST = 9;
  const ITEMS_PER_PAGE_REST = 20;
  const FOOTER_RESERVED_ROWS = 6;

  const chunks: any[][] = [];
  let remaining = quotation.items;
  let pageIndexCounter = 0;

  while (remaining.length > 0 || pageIndexCounter === 0) {
    const isFirstPage = pageIndexCounter === 0;
    const maxItemsThisPage = isFirstPage ? ITEMS_PER_PAGE_FIRST : ITEMS_PER_PAGE_REST;
    const maxItemsWithFooter = maxItemsThisPage - FOOTER_RESERVED_ROWS;

    if (remaining.length <= maxItemsWithFooter) {
      chunks.push(remaining);
      remaining = [];
    } else if (remaining.length <= maxItemsThisPage) {
      chunks.push(remaining);
      remaining = [];
      chunks.push([]); // Add empty page for the footer
    } else {
      chunks.push(remaining.slice(0, maxItemsThisPage));
      remaining = remaining.slice(maxItemsThisPage);
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
                    <div className="flex items-center justify-between mb-8 border-b-2 border-teal-600 pb-4">
                      <div>
                        <h2 className="text-3xl font-black tracking-tighter text-teal-700 uppercase">Quotation</h2>
                      </div>
                      <div className="text-right">
                        <p className="text-[10pt] font-bold text-slate-800">Ref: {quotation.quotationNumber}</p>
                        <p className="text-[9pt] font-medium text-slate-500">{formattedDate}</p>
                        <div className="mt-2 inline-block bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">
                          Page {pageIndex + 1} of {chunks.length}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-8 text-[9pt]">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                        <p className="text-[8pt] font-bold text-teal-600 uppercase tracking-wider mb-2">Customer Details</p>
                        <table className="w-full leading-relaxed">
                          <tbody>
                            <tr>
                              <td className="w-[40px] text-slate-500 font-medium align-top">To</td>
                              <td className="w-[10px] text-slate-300 align-top">:</td>
                              <td className="font-bold text-slate-800 align-top">{quotation.customer?.customerName}</td>
                            </tr>
                            <tr>
                              <td className="text-slate-500 font-medium align-top">Attn</td>
                              <td className="text-slate-300 align-top">:</td>
                              <td className="font-semibold text-slate-700 align-top">{quotation.attn || '-'}</td>
                            </tr>
                            <tr>
                              <td className="text-slate-500 font-medium align-top">Cc</td>
                              <td className="text-slate-300 align-top">:</td>
                              <td className="font-semibold text-slate-700 align-top">{quotation.cc || '-'}</td>
                            </tr>
                            <tr>
                              <td className="text-slate-500 font-medium align-top">Fax</td>
                              <td className="text-slate-300 align-top">:</td>
                              <td className="font-semibold text-slate-700 align-top">-</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                        <p className="text-[8pt] font-bold text-teal-600 uppercase tracking-wider mb-2">Project Details</p>
                        <table className="w-full leading-relaxed">
                          <tbody>
                            <tr>
                              <td className="w-[60px] text-slate-500 font-medium align-top">From</td>
                              <td className="w-[10px] text-slate-300 align-top">:</td>
                              <td className="font-bold text-slate-800 align-top">{quotation.fromName || '-'}</td>
                            </tr>
                            <tr>
                              <td className="text-slate-500 font-medium align-top">Subject</td>
                              <td className="text-slate-300 align-top">:</td>
                              <td className="font-semibold text-slate-700 align-top">{quotation.subject || '-'}</td>
                            </tr>
                            <tr>
                              <td className="text-slate-500 font-medium align-top">PO Num</td>
                              <td className="text-slate-300 align-top">:</td>
                              <td className="font-semibold text-slate-700 align-top">{quotation.poNumber || '-'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="text-[9.5pt] mb-6 text-justify leading-relaxed text-slate-600">
                      <p className="mb-3 font-medium text-slate-800">Dear Mr. {quotation.attn || '-'} / Mr. {quotation.cc || '-'},</p>
                      <p>
                        As you are aware, <span className="font-semibold text-slate-800">Tire Maintenance</span> is performing services at <span className="font-semibold text-slate-800">{quotation.projectName || '[Project Name]'}</span>. Could you please raise a Purchase Order (PO) for the period of <span className="font-semibold text-teal-700">{quotation.poPeriod || '[PO Period]'}</span>? 
                      </p>
                      <p className="mt-2">
                        We are pleased to quote you the labor price for our Tire Maintenance services as follows:
                      </p>
                    </div>
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
                          <th className="border-b border-r border-slate-200 py-2 px-2 w-[60px] font-bold text-center">Level</th>
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

                          return (
                            <tr key={idx} className={`border-b last:border-b-0 border-slate-100 text-slate-700 ${isEven ? 'bg-white' : 'bg-slate-50/50'}`}>
                              <td className="border-r border-slate-100 text-center py-1.5 font-medium text-slate-500">
                                {isAccomodation ? '' : globalIndex + 1}
                              </td>
                              <td className="border-r border-slate-100 px-2 text-center text-[8.5pt] align-top py-2">
                                <div className="flex flex-col gap-1">
                                  <span>{item.quotationItem.monthPeriod}</span>
                                  {item.quotationItem.isBackup && (
                                    <span className="text-teal-600 font-medium pt-1 border-t border-slate-100">{item.quotationItem.backupMonthPeriod || '-'}</span>
                                  )}
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
                              <td className="border-r border-slate-100 text-center align-top py-2">
                                <div className="flex flex-col gap-2 items-center">
                                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[8pt] font-bold">{item.quotationItem.level}</span>
                                  {item.quotationItem.isBackup && (
                                    <span className="bg-teal-50 text-teal-600 px-2 py-0.5 rounded text-[8pt] font-bold border border-teal-100">{item.quotationItem.backupLevel || '-'}</span>
                                  )}
                                </div>
                              </td>
                              <td className="border-r border-slate-100 px-2 text-right align-top py-2">
                                <div className="flex flex-col gap-1 w-full text-[8.5pt]">
                                  <div className="flex justify-between w-full">
                                    <span className="text-slate-400">Rp</span>
                                    <span className="font-semibold">{Number(item.quotationItem.price).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                  </div>
                                  {item.quotationItem.isBackup && (
                                    <div className="flex justify-between w-full pt-1 border-t border-slate-100 text-teal-700">
                                      <span className="text-teal-400">Rp</span>
                                      <span className="font-semibold">{Number(item.quotationItem.backupPrice).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 text-right align-middle py-2">
                                <div className="flex justify-between w-full text-[8.5pt]">
                                  <span className="text-slate-400">Rp</span>
                                  <span className="font-bold text-[9pt] text-teal-700">{Number(item.quotationItem.subtotal).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
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
                <div className="mt-auto pt-6">
                  <div className="flex justify-end w-full">
                    <div className="w-[280px] bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center text-slate-600 py-1.5 border-b border-slate-200/60">
                        <div className="w-[100px] text-right pr-4 text-[8pt] font-bold uppercase tracking-wider text-slate-500">Subtotal</div>
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
                        {/* Placeholder for Signature */}
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
