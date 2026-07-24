import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

type RfrPdfCompetency = {
  skillName: string
  level: 'basic' | 'intermediate' | 'advance' | string
  remarks?: string
}

type RfrPdfApprovalStep = {
  stepOrder: number
  stepKey: string
  roleLabel: string
  approverName: string
  approverTitle?: string
  status: string
  signatureDataUrl?: string | null
  signedAt?: Date | string | null
}

export type RfrPdfData = {
  rfrNumber: string
  requestDate: string
  joinDateEstimation: string
  requestorName: string
  sectionDepartment: string
  receivedByHr?: string
  positionTitle: string
  numberOfPersons: number
  briefJobDescription: string
  level: 'non_staff' | 'staff' | 'coordinator_supervisor' | 'managerial' | string
  reasonForRequest: 'new_headcount' | 'replacement' | string
  mppStatus: 'budgeted' | 'non_budgeted' | string
  reasonsIfNonBudgeted?: string
  employmentStatus: 'probation' | 'contract' | string
  contractDurationMonths?: number | null
  attachmentMpp?: boolean
  attachmentJd?: boolean
  sexPreference?: 'male' | 'female' | 'any' | string
  agePreference?: string
  educationDegree?: string
  educationBackground?: string[]
  yearsOfExperience?: string
  fieldOfJobExperience?: string
  functionalCompetencies?: RfrPdfCompetency[]
  approvals: RfrPdfApprovalStep[]
}

function drawCheckbox(page: any, x: number, y: number, checked: boolean, label: string, font: any, size = 8.5) {
  const boxSize = 8
  page.drawRectangle({
    x,
    y: y - 1,
    width: boxSize,
    height: boxSize,
    borderColor: rgb(0.2, 0.2, 0.2),
    borderWidth: 0.8,
  })

  if (checked) {
    page.drawText('X', {
      x: x + 1.5,
      y,
      size: 7,
      font,
      color: rgb(0, 0, 0),
    })
  }

  page.drawText(label, {
    x: x + boxSize + 4,
    y,
    size,
    font,
    color: rgb(0.1, 0.1, 0.1),
  })

  return x + boxSize + 4 + font.widthOfTextAtSize(label, size) + 12
}

function wrapText(text: string, maxWidth: number, font: any, size: number): string[] {
  if (!text) return []
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

export async function generateRfrPdf(data: RfrPdfData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Top Watermark / Internal Info
  page.drawText('Internal information - Yellow - Mahadasha Group', {
    x: width / 2 - fontRegular.widthOfTextAtSize('Internal information - Yellow - Mahadasha Group', 7) / 2,
    y: height - 20,
    size: 7,
    font: fontRegular,
    color: rgb(0.9, 0.75, 0.1),
  })

  // Embed Chitra Paratama Logo if exists
  const logoPath = path.join(process.cwd(), 'public', 'ChitraParatama_Stationery_Letterhead_jkt.jpg')
  let logoImg: any = null
  if (fs.existsSync(logoPath)) {
    try {
      const imgBytes = fs.readFileSync(logoPath)
      logoImg = await pdfDoc.embedJpg(imgBytes)
    } catch (e) {
      // fallback
    }
  }

  // Draw Full Page A4 Letterhead Background if logoImg exists
  if (logoImg) {
    page.drawImage(logoImg, {
      x: 0,
      y: 0,
      width: width,
      height: height,
    })
  } else {
    page.drawText('Chitra Paratama', {
      x: 35,
      y: height - 40,
      size: 14,
      font: fontBold,
      color: rgb(0.08, 0.35, 0.65),
    })
  }

  // Document Title
  const title = 'REQUEST FOR RECRUITMENT FORM'
  const titleWidth = fontBold.widthOfTextAtSize(title, 13)
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: height - 60,
    size: 13,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  })
  page.drawLine({
    start: { x: (width - titleWidth) / 2, y: height - 63 },
    end: { x: (width - titleWidth) / 2 + titleWidth, y: height - 63 },
    thickness: 1,
    color: rgb(0.1, 0.1, 0.1),
  })

  let currentY = height - 75
  const marginX = 30
  const contentWidth = width - marginX * 2

  // Helper Section Line
  function drawSectionHeader(label: string) {
    page.drawLine({
      start: { x: marginX, y: currentY + 9 },
      end: { x: width - marginX, y: currentY + 9 },
      thickness: 0.8,
      color: rgb(0.3, 0.3, 0.3),
    })
    page.drawText(label, {
      x: marginX,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    })
    currentY -= 13
  }

  // ─── A. Requestor Information ──────────────────────────────────────────
  drawSectionHeader('A.  Requestor Information')

  page.drawText('Request Date', { x: marginX + 5, y: currentY, size: 8.5, font: fontRegular })
  page.drawText(`:  ${data.requestDate || '-'}`, { x: marginX + 110, y: currentY, size: 8.5, font: fontRegular })
  page.drawLine({ start: { x: marginX + 125, y: currentY - 2 }, end: { x: marginX + 270, y: currentY - 2 }, thickness: 0.5, color: rgb(0.4, 0.4, 0.4) })

  page.drawText('Join Date Estimation', { x: marginX + 285, y: currentY, size: 8.5, font: fontRegular })
  page.drawText(`:  ${data.joinDateEstimation || '-'}`, { x: marginX + 395, y: currentY, size: 8.5, font: fontRegular })
  page.drawLine({ start: { x: marginX + 408, y: currentY - 2 }, end: { x: width - marginX, y: currentY - 2 }, thickness: 0.5, color: rgb(0.4, 0.4, 0.4) })

  currentY -= 14
  page.drawText('Requestor Name', { x: marginX + 5, y: currentY, size: 8.5, font: fontRegular })
  page.drawText(`:  ${data.requestorName || '-'}`, { x: marginX + 110, y: currentY, size: 8.5, font: fontRegular })
  page.drawLine({ start: { x: marginX + 125, y: currentY - 2 }, end: { x: marginX + 270, y: currentY - 2 }, thickness: 0.5, color: rgb(0.4, 0.4, 0.4) })

  currentY -= 14
  page.drawText('Section/ Department', { x: marginX + 5, y: currentY, size: 8.5, font: fontRegular })
  page.drawText(`:  ${data.sectionDepartment || '-'}`, { x: marginX + 110, y: currentY, size: 8.5, font: fontRegular })
  page.drawLine({ start: { x: marginX + 125, y: currentY - 2 }, end: { x: marginX + 270, y: currentY - 2 }, thickness: 0.5, color: rgb(0.4, 0.4, 0.4) })

  page.drawText('Received by HR', { x: marginX + 285, y: currentY, size: 8.5, font: fontRegular })
  page.drawText(`:  ${data.receivedByHr || ''}`, { x: marginX + 395, y: currentY, size: 8.5, font: fontRegular })
  page.drawLine({ start: { x: marginX + 408, y: currentY - 2 }, end: { x: width - marginX, y: currentY - 2 }, thickness: 0.5, color: rgb(0.4, 0.4, 0.4) })

  currentY -= 15

  // ─── B. Request Information ──────────────────────────────────────────
  drawSectionHeader('B. Request Information')

  page.drawText('Position title', { x: marginX + 5, y: currentY, size: 8.5, font: fontRegular })
  page.drawText(`:  ${data.positionTitle || '-'}`, { x: marginX + 110, y: currentY, size: 8.5, font: fontRegular })
  page.drawLine({ start: { x: marginX + 125, y: currentY - 2 }, end: { x: marginX + 270, y: currentY - 2 }, thickness: 0.5, color: rgb(0.4, 0.4, 0.4) })

  page.drawText('Number', { x: marginX + 285, y: currentY, size: 8.5, font: fontRegular })
  page.drawText(`:  ${data.numberOfPersons || 1} Person(s)`, { x: marginX + 395, y: currentY, size: 8.5, font: fontBold })
  page.drawLine({ start: { x: marginX + 408, y: currentY - 2 }, end: { x: width - marginX, y: currentY - 2 }, thickness: 0.5, color: rgb(0.4, 0.4, 0.4) })

  currentY -= 14
  const lvlX = marginX + 110
  page.drawText('Level', { x: marginX + 5, y: currentY, size: 8.5, font: fontRegular })
  page.drawText(':', { x: marginX + 100, y: currentY, size: 8.5, font: fontRegular })
  let nextX = drawCheckbox(page, lvlX, currentY, data.level === 'non_staff', 'Non-Staff', fontRegular)
  nextX = drawCheckbox(page, nextX, currentY, data.level === 'staff', 'Staff', fontRegular)
  nextX = drawCheckbox(page, nextX, currentY, data.level === 'coordinator_supervisor', 'Coordinator/Supervisor', fontRegular)
  drawCheckbox(page, nextX, currentY, data.level === 'managerial', 'Managerial', fontRegular)

  currentY -= 14
  page.drawText('Reason For Request', { x: marginX + 5, y: currentY, size: 8.5, font: fontRegular })
  page.drawText(':', { x: marginX + 100, y: currentY, size: 8.5, font: fontRegular })
  const rX = drawCheckbox(page, lvlX, currentY, data.reasonForRequest === 'new_headcount', 'New Headcount', fontRegular)
  drawCheckbox(page, rX, currentY, data.reasonForRequest === 'replacement', 'Replacement', fontRegular)

  page.drawText('MPP', { x: marginX + 285, y: currentY, size: 8.5, font: fontRegular })
  page.drawText(':', { x: marginX + 335, y: currentY, size: 8.5, font: fontRegular })
  const mX = drawCheckbox(page, marginX + 345, currentY, data.mppStatus === 'budgeted', 'Budgeted', fontRegular)
  drawCheckbox(page, mX, currentY, data.mppStatus === 'non_budgeted', 'Non-Budgeted', fontRegular)

  currentY -= 14
  page.drawText('Reasons if non-budgeted:', { x: marginX + 5, y: currentY, size: 8.5, font: fontRegular })
  page.drawText(data.reasonsIfNonBudgeted || '', { x: marginX + 120, y: currentY, size: 8, font: fontRegular })
  page.drawLine({ start: { x: marginX + 120, y: currentY - 2 }, end: { x: marginX + 270, y: currentY - 2 }, thickness: 0.5, color: rgb(0.4, 0.4, 0.4) })

  page.drawText('Employment Status', { x: marginX + 285, y: currentY, size: 8.5, font: fontRegular })
  page.drawText(':', { x: marginX + 375, y: currentY, size: 8.5, font: fontRegular })
  const empX = drawCheckbox(page, marginX + 385, currentY, data.employmentStatus === 'probation', 'Probation', fontRegular)
  drawCheckbox(page, empX, currentY, data.employmentStatus === 'contract', `Contract ${data.contractDurationMonths || 6}m`, fontRegular)

  currentY -= 14
  page.drawText('Brief Job Description:', { x: marginX + 5, y: currentY, size: 8.5, font: fontBold })
  if (data.briefJobDescription) {
    page.drawText(data.briefJobDescription, { x: marginX + 110, y: currentY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) })
  }
  page.drawLine({ start: { x: marginX + 110, y: currentY - 2 }, end: { x: width - marginX, y: currentY - 2 }, thickness: 0.5, color: rgb(0.4, 0.4, 0.4) })

  currentY -= 14
  page.drawText('Attachment:', { x: marginX + 5, y: currentY, size: 8.5, font: fontBold })
  const attX = drawCheckbox(page, marginX + 80, currentY, Boolean(data.attachmentMpp), 'Man Power Planning', fontRegular)
  drawCheckbox(page, attX, currentY, Boolean(data.attachmentJd), 'Job Description (Compulsory)', fontRegular)

  currentY -= 18

  // ─── C. Basic Requirements ──────────────────────────────────────────
  drawSectionHeader('C. Basic Requirements')

  page.drawText('Sex Preference:', { x: marginX + 5, y: currentY, size: 8.5, font: fontRegular })
  const sexX = drawCheckbox(page, marginX + 120, currentY, data.sexPreference === 'male', 'Male', fontRegular)
  drawCheckbox(page, sexX, currentY, data.sexPreference === 'female', 'Female', fontRegular)

  currentY -= 13
  page.drawText('Age Preference:', { x: marginX + 5, y: currentY, size: 8.5, font: fontRegular })
  let ageX = drawCheckbox(page, marginX + 120, currentY, data.agePreference === '18-25', '18-25', fontRegular)
  ageX = drawCheckbox(page, ageX, currentY, data.agePreference === '26-35', '26-35', fontRegular)
  ageX = drawCheckbox(page, ageX, currentY, data.agePreference === '36-45', '36-45', fontRegular)
  drawCheckbox(page, ageX, currentY, data.agePreference === '>45', '> 45', fontRegular)

  currentY -= 13
  page.drawText('Education Degree:', { x: marginX + 5, y: currentY, size: 8.5, font: fontRegular })
  let eduX = drawCheckbox(page, marginX + 120, currentY, data.educationDegree === 'diploma', 'Diploma', fontRegular)
  eduX = drawCheckbox(page, eduX, currentY, data.educationDegree === 's1', 'S1', fontRegular)
  eduX = drawCheckbox(page, eduX, currentY, data.educationDegree === 's2', 'S2', fontRegular)
  drawCheckbox(page, eduX, currentY, data.educationDegree === 'smk_smu', 'SMK/SMU', fontRegular)

  currentY -= 13
  const bgArr = data.educationBackground || []
  page.drawText('Education Background:', { x: marginX + 5, y: currentY, size: 8.5, font: fontRegular })
  let bgX = drawCheckbox(page, marginX + 120, currentY, bgArr.includes('Finance/Accounting'), 'Finance/Accounting', fontRegular)
  bgX = drawCheckbox(page, bgX, currentY, bgArr.includes('Management'), 'Management', fontRegular)
  bgX = drawCheckbox(page, bgX, currentY, bgArr.includes('Engineering'), 'Engineering', fontRegular)
  drawCheckbox(page, bgX, currentY, bgArr.includes('IT'), 'IT', fontRegular)

  currentY -= 13
  page.drawText('Years of Experience:', { x: marginX + 5, y: currentY, size: 8.5, font: fontRegular })
  let expX = drawCheckbox(page, marginX + 120, currentY, data.yearsOfExperience === 'fresh_graduate', 'Fresh Graduate', fontRegular)
  expX = drawCheckbox(page, expX, currentY, data.yearsOfExperience === '1-3', '1-3', fontRegular)
  expX = drawCheckbox(page, expX, currentY, data.yearsOfExperience === '3-6', '3-6', fontRegular)
  expX = drawCheckbox(page, expX, currentY, data.yearsOfExperience === '7-12', '7-12', fontRegular)
  drawCheckbox(page, expX, currentY, data.yearsOfExperience === '>12', '> 12', fontRegular)

  currentY -= 13
  page.drawText('Field of Job Experience:', { x: marginX + 5, y: currentY, size: 8.5, font: fontRegular })
  page.drawText(data.fieldOfJobExperience || '', { x: marginX + 120, y: currentY, size: 8, font: fontRegular })
  page.drawLine({ start: { x: marginX + 120, y: currentY - 2 }, end: { x: width - marginX, y: currentY - 2 }, thickness: 0.5, color: rgb(0.4, 0.4, 0.4) })

  currentY -= 15

  // ─── D. Functional Competency ──────────────────────────────────────────
  drawSectionHeader('D. Functional Competency')

  // Competency Table Header
  const tableY = currentY
  page.drawRectangle({
    x: marginX,
    y: tableY - 14,
    width: contentWidth,
    height: 18,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: rgb(0.4, 0.4, 0.4),
    borderWidth: 0.5,
  })

  page.drawText('Job Related Skills - Knowledge - Behavior', { x: marginX + 35, y: tableY - 9, size: 8, font: fontBold })
  page.drawText('Level of Competency', { x: marginX + 285, y: tableY - 5, size: 7.5, font: fontBold })
  page.drawText('Basic   Intermediate   Advance', { x: marginX + 270, y: tableY - 12, size: 6.5, font: fontRegular })
  page.drawText('Competency Remarks (describe in details)', { x: marginX + 375, y: tableY - 9, size: 7.5, font: fontBold })

  currentY -= 20

  const defaultCompetencies: RfrPdfCompetency[] = [
    { skillName: 'Remove and Install Tire at Workshop or Field', level: 'basic', remarks: '' },
    { skillName: 'Assembly and Dis assembly Tire EM & TB', level: 'basic', remarks: '' },
    { skillName: 'Tire Pressure inspection EM & TB', level: 'basic', remarks: '' },
    { skillName: 'Re-torque Wheel Nut Tire Unit', level: 'basic', remarks: '' },
    { skillName: 'Maintenance Tools Service and House Keeping Workshop', level: 'basic', remarks: '' },
  ]

  const listComp = (data.functionalCompetencies && data.functionalCompetencies.length > 0)
    ? data.functionalCompetencies
    : defaultCompetencies

  for (let idx = 0; idx < Math.max(5, listComp.length); idx++) {
    const comp = listComp[idx] || { skillName: '', level: 'basic', remarks: '' }
    const rowY = currentY

    page.drawText(`${idx + 1}.`, { x: marginX + 5, y: rowY, size: 8, font: fontRegular })
    page.drawText(comp.skillName || '', { x: marginX + 25, y: rowY, size: 8, font: fontRegular })

    // Level checkboxes
    drawCheckbox(page, marginX + 275, rowY, comp.level === 'basic', '', fontRegular)
    drawCheckbox(page, marginX + 305, rowY, comp.level === 'intermediate', '', fontRegular)
    drawCheckbox(page, marginX + 340, rowY, comp.level === 'advance', '', fontRegular)

    page.drawText(comp.remarks || '', { x: marginX + 375, y: rowY, size: 8, font: fontRegular })

    page.drawLine({ start: { x: marginX + 25, y: rowY - 3 }, end: { x: marginX + 260, y: rowY - 3 }, thickness: 0.4, color: rgb(0.7, 0.7, 0.7) })
    page.drawLine({ start: { x: marginX + 375, y: rowY - 3 }, end: { x: width - marginX, y: rowY - 3 }, thickness: 0.4, color: rgb(0.7, 0.7, 0.7) })

    currentY -= 14
  }

  currentY -= 10

  // ─── E. Approval (6 Columns Grid matching Image 2) ─────────────────────
  drawSectionHeader('E. Approval')

  const gridY = currentY
  const gridHeight = 85
  const colCount = 6
  const colWidth = contentWidth / colCount

  // Draw Grid Box Outer
  page.drawRectangle({
    x: marginX,
    y: gridY - gridHeight,
    width: contentWidth,
    height: gridHeight,
    borderColor: rgb(0.3, 0.3, 0.3),
    borderWidth: 0.8,
  })

  // Vertical Column Dividers & Content
  const approvalsByStep: Record<number, RfrPdfApprovalStep> = {}
  for (const app of data.approvals) {
    approvalsByStep[app.stepOrder] = app
  }

  const defaultRoleTitles = [
    { label: 'Purposed,', name: data.requestorName || 'Junaidi', title: 'Service operation Others Coord' },
    { label: 'HC Verification', name: 'Adilla Tri Arizona', title: 'HR Recruitment & GA Staff' },
    { label: 'Acknowledge', name: 'Kesuma Bagaskara', title: 'Leader HR-GA' },
    { label: 'Acknowledge', name: 'Muhammad Iqbal', title: 'Human Capital Spv' },
    { label: 'Acknowledge', name: 'Romy Hidayat', title: 'Central Service Manager' },
    { label: 'Approval', name: 'Person Sihaloho', title: 'General Manager' },
  ]

  for (let c = 0; c < colCount; c++) {
    const colX = marginX + c * colWidth
    const stepOrder = c + 1
    const appData = approvalsByStep[stepOrder]
    const defInfo = defaultRoleTitles[c]

    const headerLabel = appData?.roleLabel || defInfo.label
    const nameLabel = appData?.approverName || defInfo.name
    const titleLabel = appData?.approverTitle || defInfo.title

    // Column border divider right
    if (c < colCount - 1) {
      page.drawLine({
        start: { x: colX + colWidth, y: gridY },
        end: { x: colX + colWidth, y: gridY - gridHeight },
        thickness: 0.6,
        color: rgb(0.4, 0.4, 0.4),
      })
    }

    // Role Label Header
    page.drawText(headerLabel, {
      x: colX + (colWidth - fontBold.widthOfTextAtSize(headerLabel, 7.5)) / 2,
      y: gridY - 10,
      size: 7.5,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    })

    // Header bottom line inside box
    page.drawLine({
      start: { x: colX, y: gridY - 14 },
      end: { x: colX + colWidth, y: gridY - 14 },
      thickness: 0.4,
      color: rgb(0.5, 0.5, 0.5),
    })

    // Draw Signature Image if approved
    if (appData && appData.status === 'approved' && appData.signatureDataUrl) {
      try {
        let sigBytes: Buffer | null = null
        if (appData.signatureDataUrl.startsWith('data:image/')) {
          sigBytes = Buffer.from(appData.signatureDataUrl.split(',')[1] || '', 'base64')
        }
        if (sigBytes) {
          const sigImg = appData.signatureDataUrl.includes('png')
            ? await pdfDoc.embedPng(sigBytes)
            : await pdfDoc.embedJpg(sigBytes)

          page.drawImage(sigImg, {
            x: colX + (colWidth - 55) / 2,
            y: gridY - 58,
            width: 55,
            height: 35,
          })
        }
      } catch (err) {
        page.drawText('[Signed]', {
          x: colX + (colWidth - fontRegular.widthOfTextAtSize('[Signed]', 7)) / 2,
          y: gridY - 40,
          size: 7,
          font: fontRegular,
          color: rgb(0.1, 0.5, 0.2),
        })
      }
    }

    // Approver Name & Title at bottom of box
    const nameLines = wrapText(nameLabel, colWidth - 4, fontBold, 7)
    let textY = gridY - 65
    for (const line of nameLines) {
      page.drawText(line, {
        x: colX + (colWidth - fontBold.widthOfTextAtSize(line, 7)) / 2,
        y: textY,
        size: 7,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      })
      const nW = fontBold.widthOfTextAtSize(line, 7)
      page.drawLine({
        start: { x: colX + (colWidth - nW) / 2, y: textY - 1 },
        end: { x: colX + (colWidth + nW) / 2, y: textY - 1 },
        thickness: 0.5,
        color: rgb(0.1, 0.1, 0.1),
      })
      textY -= 8
    }

    const titleLines = wrapText(titleLabel, colWidth - 4, fontRegular, 6.5)
    for (const line of titleLines) {
      page.drawText(line, {
        x: colX + (colWidth - fontRegular.widthOfTextAtSize(line, 6.5)) / 2,
        y: textY,
        size: 6.5,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
      })
      textY -= 7.5
    }
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
