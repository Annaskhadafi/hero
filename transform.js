const fs = require('fs')

const file = 'app/dashboard/hc/contract-review/form/client-form.tsx'
let code = fs.readFileSync(file, 'utf8')

const printStart = code.indexOf('  if (isPrintMode) {')
const formReturnStart = code.indexOf('  return (\\n    <AdminPageShell')
const formReturnActualStart = code.indexOf('  return (', printStart + 100)

const pdfHtmlStart = code.indexOf('<h1 className="text-center font-bold text-[12pt] mb-4">')
const pdfHtmlEnd = code.indexOf('</div>\\n        </div>\\n      </div>\\n    )\\n  }')

const pdfHtml = code.slice(pdfHtmlStart, pdfHtmlEnd)

const topPart = code.slice(0, printStart)

const handlePrintAndPdf = \`
  const handlePrint = () => {
    const contentHtml = document.querySelector('.pdf-wrapper-content')?.innerHTML || ''
    const letterheadUrl = new URL('/ChitraParatama_Stationery_Letterhead_jkt.jpg', window.location.origin).toString()
    const printWindow = window.open('', '_blank', 'width=900,height=1200')

    if (!printWindow) {
      window.print()
      return
    }

    printWindow.document.write(\\\`
      <!doctype html>
      <html>
        <head>
          <title>Contract Review</title>
          <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            body { margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; object-fit: cover; }
            .page {
              width: 210mm;
              margin: 0 auto;
              padding: 40mm 20mm 20mm 20mm;
              color: black;
              font-family: Arial, sans-serif;
              font-size: 10pt;
            }
            table { width: 100%; border-collapse: collapse; border-color: black; }
            th, td { border: 1px solid black; padding: 6px; }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .w-1\\\\\\\\/2 { width: 50%; }
            .w-1\\\\\\\\/3 { width: 33.333333%; }
            .w-2\\\\\\\\/3 { width: 66.666667%; }
            .w-\\\\[45\\\\%\\\\] { width: 45%; }
            .w-\\\\[30\\\\%\\\\] { width: 30%; }
            .w-\\\\[25\\\\%\\\\] { width: 25%; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mb-8 { margin-bottom: 2rem; }
            .mb-16 { margin-bottom: 4rem; }
            .mt-12 { margin-top: 3rem; }
            .bg-slate-50 { background-color: #f8fafc; }
            .capitalize { text-transform: capitalize; }
            .w-full { width: 100%; }
            .w-12 { width: 3rem; }
            .border-b { border-bottom: 1px solid black; }
            .inline-block { display: inline-block; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .gap-4 { gap: 1rem; }
            .gap-x-8 { column-gap: 2rem; }
            .gap-y-12 { row-gap: 3rem; }
            .flex { display: flex; }
            .items-center { align-items: center; }
            .gap-2 { gap: 0.5rem; }
            .gap-8 { gap: 2rem; }
            .break-inside-avoid { break-inside: avoid; }
            .break-before-auto { break-before: auto; }
            .text-gray-500 { color: #6b7280; }
            input[type="checkbox"] { margin-right: 4px; }
          </style>
        </head>
        <body>
          <img src="\\\${letterheadUrl}" class="print-bg" />
          <main class="page">\\\${contentHtml}</main>
          <script>
            const closeAfterPrint = () => setTimeout(() => window.close(), 250);
            window.addEventListener("afterprint", closeAfterPrint);
            window.addEventListener("load", () => {
              const backgroundImage = new Image();
              backgroundImage.onload = () => setTimeout(() => window.print(), 150);
              backgroundImage.onerror = () => setTimeout(() => window.print(), 150);
              backgroundImage.src = "\\\${letterheadUrl}";
            });
          </script>
        </body>
      </html>
    \\\`)
    printWindow.document.close()
  }

  const pdfPreviewContent = (
    <div className="pdf-wrapper-content relative z-10 outline-none text-[10pt] font-sans" style={{ color: 'black', paddingTop: '40mm', paddingBottom: '20mm', paddingLeft: '20mm', paddingRight: '20mm', minHeight: '297mm' }}>
      \${pdfHtml}
    </div>
  )
\`

let restOfForm = code.slice(formReturnActualStart)

// Replace <AdminPageShell ... > with the new grid layout
const shellSearch = '<AdminPageShell \\n      eyebrow="HC • Form" \\n      title="Contract & Probation Review" \\n      description="Lengkapi evaluasi karyawan."\\n    >'
const shellReplace = \`<AdminPageShell 
      eyebrow="HC • Form" 
      title="Contract & Probation Review" 
      description="Lengkapi evaluasi karyawan."
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_850px]">
        {/* KIRI: Form Input */}
        <div className="flex flex-col gap-6 print:hidden">
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 size-4" /> Kembali
            </Button>
            <Button onClick={handlePrint} variant="secondary">
              <Printer className="mr-2 size-4" /> Print / Save PDF
            </Button>
            <Button onClick={handleSave} disabled={isPending} className="ml-auto">
              <Save className="mr-2 size-4" /> {isPending ? "Menyimpan..." : "Simpan Form"}
            </Button>
          </div>
\`

restOfForm = restOfForm.replace(shellSearch, shellReplace)

const actionButtonsStr = \`<div className="flex gap-4 mt-6 justify-end">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 size-4" /> Kembali
        </Button>
        {form.id && (
          <Button variant="secondary" onClick={() => window.open(\\\`?mode=print\\\`, '_blank')}>
            <Printer className="mr-2 size-4" /> Print Preview
          </Button>
        )}
        <Button onClick={handleSave} disabled={isPending}>
          <Save className="mr-2 size-4" /> {isPending ? "Menyimpan..." : "Simpan Form"}
        </Button>
      </div>\`

restOfForm = restOfForm.replace(actionButtonsStr, '')

const endShellStr = '    </AdminPageShell>'
const rightColAndEnd = \`        </div>
        {/* KANAN: PDF Preview */}
        <div className="rounded-[1.1rem] bg-slate-100 p-4 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_14px_32px_rgba(15,23,42,0.06)] print:m-0 print:bg-transparent print:p-0 print:shadow-none overflow-x-auto">
          <div
            className="pdf-wrapper relative mx-auto min-h-[297mm] w-[210mm] max-w-full overflow-hidden bg-white bg-cover bg-top bg-no-repeat shadow-sm print:m-0 print:h-auto print:w-[210mm] print:max-w-none print:shadow-none"
            style={{ backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)' }}
          >
            {pdfPreviewContent}
          </div>
        </div>
      </div>
    </AdminPageShell>\`

restOfForm = restOfForm.replace(endShellStr, rightColAndEnd)

fs.writeFileSync(file, topPart + handlePrintAndPdf + restOfForm)
console.log('Success')
