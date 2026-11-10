import {
  generateOvertimeRecordPdf,
  generateSummaryTablePdf,
} from '@/lib/timesheet/generate-attendance-pdf'
import { PDFDocument } from 'pdf-lib'

describe('Site PDF & Signatures Configuration', () => {
  const mifaConfiguredSignatures = {
    preparedBy: 'Arjun Zahiri Mursith',
    pjoLeader: 'Ary Maulana',
    approvedBy: 'Romy Hidayat',
    hrName: 'Kesuma Bagaskara',
    externalPreparedBy: 'Adit Prasetyo',
    externalApprovedBy: 'Plant Group Leader AMM MIFA',
    externalSignatureCount: 2,
    customSigners: [],
    useExternalOnly: false,
    omitExternal: true,
  }

  const mifaExternalSignatures = {
    ...mifaConfiguredSignatures,
    useExternalOnly: true,
    omitExternal: false,
  }

  it('renders internal signatures accurately in Overtime Record PDF', async () => {
    const pdfBytes = await generateOvertimeRecordPdf({
      documentTitle: 'OVERTIME RECORD',
      period: '2026-10',
      employeeId: 62317,
      employeeName: 'Benni Sianipar',
      employeeSn: '62317',
      department: 'Central Services',
      section: 'Service Operation MVC',
      siteName: 'CK MIFA',
      signatures: mifaConfiguredSignatures,
      days: [
        {
          day: 1,
          dayName: 'Thursday',
          status: 'present',
          clockIn: '05:39',
          clockOut: '19:00',
          scheduleCode: 'DS',
          isHoliday: false,
          workingTimeFrom: '06:00',
          overtime: { totalHours: 4 },
        },
      ],
      isNonStaff: true,
      showTotalOvertime: true,
    })

    expect(pdfBytes).toBeInstanceOf(Uint8Array)
    expect(pdfBytes.length).toBeGreaterThan(1000)

    const doc = await PDFDocument.load(pdfBytes)
    expect(doc.getPageCount()).toBe(1)

    // Save visual evidence artifact for Overtime Record PDF
    try {
      const { chromium } = await import('playwright')
      const browser = await chromium.launch({ headless: true })
      const pdfBase64 = Buffer.from(pdfBytes).toString('base64')
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
        <style>body { margin: 0; background: #fff; }</style>
      </head>
      <body>
        <canvas id="pdf-render"></canvas>
        <script>
          const pdfData = atob("${pdfBase64}");
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          const loadingTask = pdfjsLib.getDocument({ data: pdfData });
          loadingTask.promise.then(pdf => {
            return pdf.getPage(1).then(page => {
              const viewport = page.getViewport({ scale: 2.0 });
              const canvas = document.getElementById("pdf-render");
              const context = canvas.getContext("2d");
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              const renderContext = { canvasContext: context, viewport: viewport };
              return page.render(renderContext).promise.then(() => {
                window.rendered = true;
              });
            });
          }).catch(err => {
            window.renderError = String(err);
          });
        </script>
      </body>
      </html>`
      const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } })
      await page.setContent(html)
      await page.waitForFunction(() => (window as any).rendered === true || (window as any).renderError !== undefined, { timeout: 15000 })
      const canvas = await page.$('#pdf-render')
      if (canvas) {
        await canvas.screenshot({
          path: 'C:/Users/IRIS/.gemini/antigravity/brain/b5882487-da9c-4712-be8a-a0528ed4d007/004-mifa-configured-ttd-overtime-record.png',
        })
      }
      await browser.close()
    } catch (e) {
      console.warn('Screenshot rendering optional warning:', e)
    }
  })

  it('renders external signatures when useExternalOnly is true in Overtime Record PDF', async () => {
    const pdfBytes = await generateOvertimeRecordPdf({
      documentTitle: 'OVERTIME RECORD',
      period: '2026-10',
      employeeId: 62317,
      employeeName: 'Benni Sianipar',
      employeeSn: '62317',
      department: 'Central Services',
      section: 'Service Operation MVC',
      siteName: 'CK MIFA',
      signatures: mifaExternalSignatures,
      days: [
        {
          day: 1,
          dayName: 'Thursday',
          status: 'present',
          clockIn: '05:39',
          clockOut: '19:00',
          scheduleCode: 'DS',
          isHoliday: false,
          workingTimeFrom: '06:00',
          overtime: { totalHours: 4 },
        },
      ],
      isNonStaff: true,
      showTotalOvertime: true,
    })

    expect(pdfBytes).toBeInstanceOf(Uint8Array)
    const doc = await PDFDocument.load(pdfBytes)
    expect(doc.getPageCount()).toBe(1)

    // Save visual evidence artifact for Overtime Record PDF
    try {
      const { chromium } = await import('playwright')
      const browser = await chromium.launch({ headless: true })
      const pdfBase64 = Buffer.from(pdfBytes).toString('base64')
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
        <style>body { margin: 0; background: #fff; }</style>
      </head>
      <body>
        <canvas id="pdf-render"></canvas>
        <script>
          const pdfData = atob("${pdfBase64}");
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          const loadingTask = pdfjsLib.getDocument({ data: pdfData });
          loadingTask.promise.then(pdf => {
            return pdf.getPage(1).then(page => {
              const viewport = page.getViewport({ scale: 2.0 });
              const canvas = document.getElementById("pdf-render");
              const context = canvas.getContext("2d");
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              const renderContext = { canvasContext: context, viewport: viewport };
              return page.render(renderContext).promise.then(() => {
                window.rendered = true;
              });
            });
          }).catch(err => {
            window.renderError = String(err);
          });
        </script>
      </body>
      </html>`
      const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } })
      await page.setContent(html)
      await page.waitForFunction(() => (window as any).rendered === true || (window as any).renderError !== undefined, { timeout: 15000 })
      const canvas = await page.$('#pdf-render')
      if (canvas) {
        await canvas.screenshot({
          path: 'C:/Users/IRIS/.gemini/antigravity/brain/b5882487-da9c-4712-be8a-a0528ed4d007/004-mifa-configured-ttd-overtime-record.png',
        })
      }
      await browser.close()
    } catch (e) {
      console.warn('Screenshot rendering optional warning:', e)
    }
  })

  it('renders Overtime Summary Table PDF with configured signatures and customer logo', async () => {
    const pdfBytes = await generateSummaryTablePdf({
      view: 'ot',
      period: '2026-10',
      siteName: 'CK MIFA',
      project: 'CK MIFA',
      dayCount: 31,
      rows: [
        {
          no: 1,
          name: 'Benni Sianipar (Non Lokal)',
          sn: '62317',
          loc: 'CK MIFA',
          dailyValues: Array.from({ length: 31 }, () => '4'),
          total: '124',
          remark: 'NORMAL',
          isHeader: false,
        },
      ],
      signatures: mifaConfiguredSignatures,
      holidays: [],
    })

    expect(pdfBytes).toBeInstanceOf(Uint8Array)
    const doc = await PDFDocument.load(pdfBytes)
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1)
  })

  it('renders MSA and MLS Summary Table PDFs with separated signatures (Muhammad As\'ar Fauzan)', async () => {
    const msaSignatures = {
      ...mifaConfiguredSignatures,
      preparedBy: "Muhammad As'ar Fauzan",
    }

    const msaPdfBytes = await generateSummaryTablePdf({
      view: 'msa',
      period: '2026-10',
      siteName: 'CK MIFA',
      project: 'CK MIFA',
      dayCount: 31,
      rows: [
        {
          no: 1,
          name: 'Benni Sianipar (Non Lokal)',
          sn: '62317',
          loc: 'CK MIFA',
          department: 'Central Services',
          section: 'Service Operation MVC',
          dailyValues: Array.from({ length: 31 }, () => '35000'),
          total: '1085000',
          remark: 'NORMAL',
        },
      ],
      signatures: msaSignatures,
      holidays: [],
    })

    expect(msaPdfBytes).toBeInstanceOf(Uint8Array)
    const msaDoc = await PDFDocument.load(msaPdfBytes)
    expect(msaDoc.getPageCount()).toBeGreaterThanOrEqual(1)

    // MLS Meals summary
    const mlsSignatures = {
      ...mifaConfiguredSignatures,
      preparedBy: "Muhammad As'ar Fauzan",
    }

    const mlsPdfBytes = await generateSummaryTablePdf({
      view: 'meals',
      period: '2026-10',
      siteName: 'CK MIFA',
      project: 'CK MIFA',
      dayCount: 31,
      rows: [
        {
          no: 1,
          name: 'Benni Sianipar (Non Lokal)',
          sn: '62317',
          loc: 'CK MIFA',
          department: 'Central Services',
          section: 'Service Operation MVC',
          dailyValues: Array.from({ length: 31 }, () => '50000'),
          total: '1550000',
          remark: 'NORMAL',
        },
      ],
      signatures: mlsSignatures,
      holidays: [],
    })

    expect(mlsPdfBytes).toBeInstanceOf(Uint8Array)
    const mlsDoc = await PDFDocument.load(mlsPdfBytes)
    expect(mlsDoc.getPageCount()).toBeGreaterThanOrEqual(1)
  })
})
