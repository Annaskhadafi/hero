export async function generateElementAsPdfBlob(
  element: HTMLElement,
  options?: { orientation?: 'portrait' | 'landscape' }
): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error('PDF generation is only supported in the browser.')
  }

  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas-pro'),
  ])

  if (document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ])
  }

  const images = Array.from(element.querySelectorAll('img'))
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

  const canvas = await html2canvas(element, {
    scale: 2,
    logging: false,
    useCORS: true,
    allowTaint: true,
    imageTimeout: 15000,
    backgroundColor: '#ffffff',
  })

  const imgData = canvas.toDataURL('image/jpeg', 0.98)
  // ponytail: landscape_pdf_enforcement - strictly honor explicit orientation parameter
  const isLandscape =
    options?.orientation === 'landscape' ||
    (options?.orientation === undefined && element.offsetWidth > element.offsetHeight)

  const pdfWidth = isLandscape ? 297 : 210
  const pdfHeight = isLandscape ? 210 : 297

  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // ponytail: full_bleed_landscape_pdf - fill A4 landscape edge-to-edge (0,0) without whitespace letterboxing
  const canvasWidth = canvas.width
  const canvasHeight = canvas.height
  const canvasRatio = canvasWidth / canvasHeight
  const pageRatio = pdfWidth / pdfHeight

  let imgWidth = pdfWidth
  let imgHeight = pdfHeight
  let x = 0
  let y = 0

  if (!isLandscape && Math.abs(canvasRatio - pageRatio) > 0.01) {
    if (canvasRatio > pageRatio) {
      imgWidth = pdfWidth
      imgHeight = pdfWidth / canvasRatio
      y = (pdfHeight - imgHeight) / 2
    } else {
      imgHeight = pdfHeight
      imgWidth = pdfHeight * canvasRatio
      x = (pdfWidth - imgWidth) / 2
    }
  }

  pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight)
  return pdf.output('blob')
}

export async function downloadElementAsPdf(
  element: HTMLElement,
  fileName: string = 'document.pdf',
  options?: { orientation?: 'portrait' | 'landscape' }
): Promise<void> {
  const blob = await generateElementAsPdfBlob(element, options)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function generateHtmlAsPdfBlob(
  innerHtml: string,
  letterheadUrl: string = '/ChitraParatama_Stationery_Letterhead_jkt.jpg',
  options?: { orientation?: 'portrait' | 'landscape'; withLetterhead?: boolean }
): Promise<Blob> {
  const isLandscape = options?.orientation === 'landscape'
  const widthMm = isLandscape ? 297 : 210
  const heightMm = isLandscape ? 210 : 297
  const withLetterhead = options?.withLetterhead !== false

  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = `${widthMm}mm`
  container.style.minHeight = `${heightMm}mm`
  container.style.height = `${heightMm}mm`
  container.style.zIndex = '-9999'
  container.style.backgroundColor = '#ffffff'
  container.style.overflow = 'hidden'

  container.innerHTML = `
    <div style="position: relative; width: ${widthMm}mm; height: ${heightMm}mm; overflow: hidden; background-color: #ffffff;">
      ${withLetterhead ? `<img src="${letterheadUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; object-fit: fill;" />` : ''}
      <div style="position: relative; z-index: 10; padding: ${withLetterhead ? (isLandscape ? '16mm 16mm 16mm 16mm' : '38mm 20mm 35mm 20mm') : '10mm'}; font-family: 'Manrope', 'Inter', Arial, sans-serif; font-size: 8.5pt; line-height: 1.25; color: black; height: ${heightMm}mm; box-sizing: border-box;">
        ${innerHtml}
      </div>
    </div>
  `

  document.body.appendChild(container)

  try {
    const target = container.firstElementChild as HTMLElement
    return await generateElementAsPdfBlob(target, { orientation: isLandscape ? 'landscape' : 'portrait' })
  } finally {
    document.body.removeChild(container)
  }
}

export async function downloadHtmlAsPdf(
  innerHtml: string,
  fileName: string = 'document.pdf',
  letterheadUrl: string = '/ChitraParatama_Stationery_Letterhead_jkt.jpg',
  options?: { orientation?: 'portrait' | 'landscape'; withLetterhead?: boolean }
): Promise<void> {
  const blob = await generateHtmlAsPdfBlob(innerHtml, letterheadUrl, options)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function downloadFilesAsZip(
  files: Array<{ name: string; blob: Blob }>,
  zipFileName: string = 'documents.zip'
): Promise<void> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  for (const f of files) {
    zip.file(f.name, f.blob)
  }
  const content = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(content)
  const a = document.createElement('a')
  a.href = url
  a.download = zipFileName.endsWith('.zip') ? zipFileName : `${zipFileName}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
