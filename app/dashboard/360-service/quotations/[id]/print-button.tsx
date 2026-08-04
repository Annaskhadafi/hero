"use client"

import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas-pro"
import { Download, Loader2 } from "lucide-react"

function balanceQuotationPages() {
  const pages = Array.from(document.querySelectorAll<HTMLElement>('[data-quotation-page]'))
  pages.forEach((page) => page.querySelector<HTMLElement>('[data-quotation-table]')?.classList.remove('hidden'))
  const fits = (page: HTMLElement) => {
    const content = page.querySelector<HTMLElement>('[data-quotation-content]')
    const main = page.querySelector<HTMLElement>('[data-quotation-main]')
    if (!content || !main) return true
    const summary = page.querySelector<HTMLElement>('[data-quotation-summary]')
    const paddingBottom = Number.parseFloat(getComputedStyle(content).paddingBottom) || 0
    const contentBottom = content.getBoundingClientRect().bottom - paddingBottom
    const limit = summary ? summary.getBoundingClientRect().top - 8 : contentBottom
    return main.getBoundingClientRect().bottom <= limit
      && (!summary || summary.getBoundingClientRect().bottom <= contentBottom)
  }

  for (let index = 0; index < pages.length - 1; index++) {
    const page = pages[index]
    const body = page.querySelector<HTMLTableSectionElement>('[data-quotation-items]')
    const nextBody = pages
      .slice(index + 1)
      .map((nextPage) => nextPage.querySelector<HTMLTableSectionElement>('[data-quotation-items]'))
      .find(Boolean)
    if (!body || !nextBody) continue

    while (!fits(page) && body.lastElementChild) {
      nextBody.prepend(body.lastElementChild)
    }
    while (nextBody.firstElementChild) {
      const row = nextBody.firstElementChild
      body.append(row)
      if (fits(page)) continue
      nextBody.prepend(row)
      break
    }
  }

  pages.slice(1).forEach((page) => {
    const body = page.querySelector('[data-quotation-items]')
    if (body && !body.children.length && !page.querySelector('[data-quotation-summary]')) page.remove()
  })
  const remainingPages = Array.from(document.querySelectorAll<HTMLElement>('[data-quotation-page]'))
  const summaryPage = remainingPages.find((page) => page.querySelector('[data-quotation-summary]'))
  const summaryPageIndex = summaryPage ? remainingPages.indexOf(summaryPage) : -1
  const previousPage = summaryPageIndex > 0 ? remainingPages[summaryPageIndex - 1] : null
  const summary = summaryPage?.querySelector<HTMLElement>('[data-quotation-summary]')
  const summaryContent = summaryPage?.querySelector<HTMLElement>('[data-quotation-content]')
  const previousContent = previousPage?.querySelector<HTMLElement>('[data-quotation-content]')
  if (summaryPage && previousPage && summary && summaryContent && previousContent) {
    previousContent.append(summary)
    if (fits(previousPage)) summaryPage.remove()
    else summaryContent.append(summary)
  }
  const visiblePages = Array.from(document.querySelectorAll<HTMLElement>('[data-quotation-page]'))
  visiblePages.forEach((page, index) => {
    const body = page.querySelector('[data-quotation-items]')
    page.querySelector<HTMLElement>('[data-quotation-table]')?.classList.toggle('hidden', !body?.children.length)
    page.querySelectorAll<HTMLElement>('[data-quotation-page-counter]').forEach((counter) => {
      counter.textContent = `Page ${index + 1} of ${visiblePages.length}`
    })
  })
}

function balanceBastPages() {
  const page = document.querySelector<HTMLElement>('[data-bast-page]')
  const content = page?.querySelector<HTMLElement>('[data-bast-content]')
  const main = page?.querySelector<HTMLElement>('[data-bast-main]')
  const closing = document.querySelector<HTMLElement>('[data-bast-closing]')
  const overflowPage = document.querySelector<HTMLElement>('[data-bast-overflow-page]')
  const overflowContent = overflowPage?.querySelector<HTMLElement>('[data-bast-overflow-content]')
  if (!content || !main || !closing || !overflowPage || !overflowContent) return
  if (overflowContent.contains(closing)) {
    overflowPage.classList.remove('hidden')
    return
  }

  const paddingBottom = Number.parseFloat(getComputedStyle(content).paddingBottom) || 0
  const limit = content.getBoundingClientRect().bottom - paddingBottom
  const fits = main.getBoundingClientRect().bottom + 8 <= closing.getBoundingClientRect().top
    && closing.getBoundingClientRect().bottom <= limit
  if (fits) {
    overflowPage.remove()
    return
  }

  overflowContent.append(closing)
  overflowPage.classList.remove('hidden')
}

export function PrintButton() {
  const searchParams = useSearchParams()
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasAutoDownloaded, setHasAutoDownloaded] = useState(false)

  useEffect(() => {
    let active = true
    void document.fonts?.ready.then(() => {
      if (active) {
        balanceQuotationPages()
        balanceBastPages()
      }
    })
    return () => {
      active = false
    }
  }, [])

  const waitForImagesToLoad = async (container: Element) => {
    const images = Array.from(container.querySelectorAll('img'))
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve()
            } else {
              img.onload = () => resolve()
              img.onerror = () => resolve()
            }
          })
      )
    )
  }

  const handleDownload = async () => {
    setIsGenerating(true)
    try {
      if (document.fonts?.ready) {
        await Promise.race([
          document.fonts.ready,
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ])
      }
      balanceQuotationPages()
      balanceBastPages()
      const pages = document.querySelectorAll('.pdf-wrapper')
      
      if (!pages || pages.length === 0) {
        alert("No pages found to generate PDF")
        setIsGenerating(false)
        return
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement
        await waitForImagesToLoad(page)
        
        const canvas = await html2canvas(page, {
          scale: 2, 
          logging: false,
          useCORS: true,
          allowTaint: true,
          imageTimeout: 15000,
          onclone: (clonedDoc) => {
            const clonedPage = clonedDoc.querySelectorAll('.pdf-wrapper')[i] as HTMLElement
            if (clonedPage) {
              clonedPage.style.boxShadow = 'none'
              clonedPage.style.transform = 'none'
            }
          }
        })
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0)
        
        if (i > 0) {
          pdf.addPage()
        }
        
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297)
      }
      
      let fileName = "Quotation.pdf"
      if (document.title && document.title !== "Quotation Preview") {
        fileName = `${document.title}.pdf`
      } else {
        const refElement = document.querySelector('.text-slate-800.font-bold')
        if (refElement && refElement.textContent && refElement.textContent.includes('Ref:')) {
          const refNo = refElement.textContent.replace('Ref:', '').trim().replace(/\//g, '-')
          fileName = `Quotation_${refNo}.pdf`
        }
      }
      
      pdf.save(fileName)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    if (searchParams.get('download') === 'true' && !hasAutoDownloaded) {
      setHasAutoDownloaded(true)
      // Slight delay to ensure images are loaded
      setTimeout(() => {
        handleDownload()
      }, 1000)
    }
  }, [searchParams, hasAutoDownloaded])

  return (
    <Button 
      onClick={handleDownload} 
      disabled={isGenerating}
      className="bg-teal-600 hover:bg-teal-700 text-white"
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </>
      )}
    </Button>
  )
}
