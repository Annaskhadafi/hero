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

function formatIndoDateTime(val?: string | Date | null): string {
  if (!val) return ''
  const d = typeof val === 'string' ? new Date(val) : val
  if (isNaN(d.getTime())) return String(val)
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ]
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${hours}:${minutes}`
}

function drawCheckbox(page: any, x: number, y: number, checked: boolean, label: string, font: any, size = 8) {
  const boxSize = 7.5
  page.drawRectangle({
    x,
    y: y - 1,
    width: boxSize,
    height: boxSize,
    borderColor: rgb(0.2, 0.25, 0.35),
    borderWidth: 0.8,
  })

  if (checked) {
    page.drawText('X', {
      x: x + 1.2,
      y: y,
      size: 6.5,
      font,
      color: rgb(0, 0.2, 0.5),
    })
  }

  if (label) {
    page.drawText(label, {
      x: x + boxSize + 4,
      y: y,
      size,
      font,
      color: rgb(0.15, 0.15, 0.15),
    })
    return x + boxSize + 4 + font.widthOfTextAtSize(label, size) + 10
  }

  return x + boxSize + 6
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
    y: height - 16,
    size: 7,
    font: fontRegular,
    color: rgb(0.85, 0.7, 0.1),
  })

  // Embed Chitra Paratama Logo Background if exists
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

  if (logoImg) {
    page.drawImage(logoImg, {
      x: 0,
      y: 0,
      width: width,
      height: height,
    })
  } else {
    page.drawText('PT CHITRA PARATAMA', {
      x: 35,
      y: height - 40,
      size: 14,
      font: fontBold,
      color: rgb(0.08, 0.35, 0.65),
    })
  }

  const marginX = 35
  const contentWidth = width - marginX * 2

  // Start content comfortably below top letterhead header (~112pt from top)
  let currentY = height - 112

  // Document Title
  const title = 'REQUEST FOR RECRUITMENT FORM'
  const titleWidth = fontBold.widthOfTextAtSize(title, 12)
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: currentY,
    size: 12,
    font: fontBold,
    color: rgb(0.05, 0.22, 0.42),
  })
  page.drawLine({
    start: { x: (width - titleWidth) / 2, y: currentY - 3 },
    end: { x: (width - titleWidth) / 2 + titleWidth, y: currentY - 3 },
    thickness: 1.2,
    color: rgb(0.05, 0.22, 0.42),
  })

  currentY -= 20

  // Helper Section Line
  function drawSectionHeader(label: string) {
    page.drawLine({
      start: { x: marginX, y: currentY + 8 },
      end: { x: width - marginX, y: currentY + 8 },
      thickness: 1,
      color: rgb(0.05, 0.22, 0.42),
    })
    page.drawText(label, {
      x: marginX,
      y: currentY,
      size: 8.5,
      font: fontBold,
      color: rgb(0.05, 0.22, 0.42),
    })
    currentY -= 13
  }

  // ─── A. Requestor Information ──────────────────────────────────────────
  drawSectionHeader('A. Requestor Information')

  // Row 1: Request Date & Join Date Estimation
  page.drawText('Request Date', { x: marginX + 5, y: currentY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) })
  page.drawText(`:  ${data.requestDate || '-'}`, { x: marginX + 115, y: currentY, size: 8, font: fontBold })
  page.drawLine({ start: { x: marginX + 128, y: currentY - 3 }, end: { x: marginX + 275, y: currentY - 3 }, thickness: 0.5, color: rgb(0.65, 0.65, 0.65) })

  page.drawText('Join Date Estimation', { x: marginX + 290, y: currentY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) })
  page.drawText(`:  ${data.joinDateEstimation || '-'}`, { x: marginX + 400, y: currentY, size: 8, font: fontBold })
  page.drawLine({ start: { x: marginX + 413, y: currentY - 3 }, end: { x: width - marginX, y: currentY - 3 }, thickness: 0.5, color: rgb(0.65, 0.65, 0.65) })

  // Row 2: Requestor Name & Received by HR
  currentY -= 14
  page.drawText('Requestor Name', { x: marginX + 5, y: currentY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) })
  page.drawText(`:  ${data.requestorName || '-'}`, { x: marginX + 115, y: currentY, size: 8, font: fontBold })
  page.drawLine({ start: { x: marginX + 128, y: currentY - 3 }, end: { x: marginX + 275, y: currentY - 3 }, thickness: 0.5, color: rgb(0.65, 0.65, 0.65) })

  page.drawText('Received by HR', { x: marginX + 290, y: currentY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) })
  page.drawText(`:  ${data.receivedByHr || '-'}`, { x: marginX + 400, y: currentY, size: 8, font: fontRegular })
  page.drawLine({ start: { x: marginX + 413, y: currentY - 3 }, end: { x: width - marginX, y: currentY - 3 }, thickness: 0.5, color: rgb(0.65, 0.65, 0.65) })

  // Row 3: Section/ Department
  currentY -= 14
  page.drawText('Section/ Department', { x: marginX + 5, y: currentY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) })
  page.drawText(`:  ${data.sectionDepartment || '-'}`, { x: marginX + 115, y: currentY, size: 8, font: fontRegular })
  page.drawLine({ start: { x: marginX + 128, y: currentY - 3 }, end: { x: width - marginX, y: currentY - 3 }, thickness: 0.5, color: rgb(0.65, 0.65, 0.65) })

  currentY -= 16

  // ─── B. Request Information ──────────────────────────────────────────
  drawSectionHeader('B. Request Information')

  // Row 1: Position title & Number
  page.drawText('Position Title', { x: marginX + 5, y: currentY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) })
  page.drawText(`:  ${data.positionTitle || '-'}`, { x: marginX + 115, y: currentY, size: 8.5, font: fontBold, color: rgb(0.05, 0.22, 0.42) })
  page.drawLine({ start: { x: marginX + 128, y: currentY - 3 }, end: { x: marginX + 275, y: currentY - 3 }, thickness: 0.5, color: rgb(0.65, 0.65, 0.65) })

  page.drawText('Number', { x: marginX + 290, y: currentY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) })
  page.drawText(`:  ${data.numberOfPersons || 1} Person(s)`, { x: marginX + 400, y: currentY, size: 8.5, font: fontBold })
  page.drawLine({ start: { x: marginX + 413, y: currentY - 3 }, end: { x: width - marginX, y: currentY - 3 }, thickness: 0.5, color: rgb(0.65, 0.65, 0.65) })

  // Row 2: Level
  currentY -= 14
  const lvlX = marginX + 120
  page.drawText('Level', { x: marginX + 5, y: currentY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) })
  page.drawText(':', { x: marginX + 110, y: currentY, size: 8, font: fontRegular })
  let nextX = drawCheckbox(page, lvlX, currentY, data.level === 'non_staff', 'Non-Staff', fontRegular)
  nextX = drawCheckbox(page, nextX, currentY, data.level === 'staff', 'Staff', fontRegular)
  nextX = drawCheckbox(page, nextX, currentY, data.level === 'coordinator_supervisor', 'Coordinator/Supervisor', fontRegular)
  drawCheckbox(page, nextX, currentY, data.level === 'managerial', 'Managerial', fontRegular)

  // Row 3: Reason For Request & MPP
  currentY -= 14
  page.drawText('Reason For Request', { x: marginX + 5, y: currentY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) })
  page.drawText(':', { x: marginX + 110, y: currentY, size: 8, font: fontRegular })
  const rX = drawCheckbox(page, lvlX, currentY, data.reasonForRequest === 'new_headcount', 'New Headcount', fontRegular)
  drawCheckbox(page, rX, currentY, data.reasonForRequest === 'replacement', 'Replacement', fontRegular)

  page.drawText('MPP', { x: marginX + 290, y: currentY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) })
  page.drawText(':', { x: marginX + 340, y: currentY, size: 8, font: fontRegular })
  const mX = drawCheckbox(page, marginX + 350, currentY, data.mppStatus === 'budgeted', 'Budgeted', fontRegular)
  drawCheckbox(page, mX, currentY, data.mppStatus === 'non_budgeted', 'Non-Budgeted', fontRegular)

  // Row 4: Reasons if non-budgeted & Employment Status
  currentY -= 14
  page.drawText('Reasons if non-budgeted', { x: marginX + 5, y: currentY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) })
  page.drawText(`:  ${data.reasonsIfNonBudgeted || '-'}`, { x: marginX + 115, y: currentY, size: 8, font: fontRegular })
  page.drawLine({ start: { x: marginX + 128, y: currentY - 3 }, end: { x: marginX + 275, y: currentY - 3 }, thickness: 0.5, color: rgb(0.65, 0.65, 0.65) })

  page.drawText('Employment Status', { x: marginX + 290, y: currentY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) })
  page.drawText(':', { x: marginX + 375, y: currentY, size: 8, font: fontRegular })
  const empX = drawCheckbox(page, marginX + 385, currentY, data.employmentStatus === 'probation', 'Probation', fontRegular)
  drawCheckbox(page, empX, currentY, data.employmentStatus === 'contract', `Contract ${data.contractDurationMonths || 6}m`, fontRegular)

  // Row 5: Brief Job Description (Wrapped Text)
  currentY -= 14
  page.drawText('Brief Job Description', { x: marginX + 5, y: currentY, size: 8, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
  page.drawText(':', { x: marginX + 110, y: currentY, size: 8, font: fontBold })
  const jdLines = wrapText(data.briefJobDescription || '-', contentWidth - 120, fontRegular, 8)
  if (jdLines.length <= 1) {
    page.drawText(jdLines[0] || '-', { x: marginX + 120, y: currentY, size: 8, font: fontRegular })
    page.drawLine({ start: { x: marginX + 120, y: currentY - 3 }, end: { x: width - marginX, y: currentY - 3 }, thickness: 0.5, color: rgb(0.65, 0.65, 0.65) })
  } else {
    for (let i = 0; i < jdLines.length; i++) {
      if (i > 0) currentY -= 12
      page.drawText(jdLines[i], { x: marginX + 120, y: currentY, size: 8, font: fontRegular })
      page.drawLine({ start: { x: marginX + 120, y: currentY - 3 }, end: { x: width - marginX, y: currentY - 3 }, thickness: 0.5, color: rgb(0.65, 0.65, 0.65) })
    }
  }

  // Row 6: Attachment
  currentY -= 14
  page.drawText('Attachment', { x: marginX + 5, y: currentY, size: 8, font: fontBold, color: rgb(0.1, 0.1, 0.1) })
  page.drawText(':', { x: marginX + 110, y: currentY, size: 8, font: fontBold })
  const attX = drawCheckbox(page, marginX + 120, currentY, Boolean(data.attachmentMpp), 'Man Power Planning', fontRegular)
  drawCheckbox(page, attX, currentY, Boolean(data.attachmentJd), 'Job Description (Compulsory)', fontRegular)

  currentY -= 16

  // ─── C. Basic Requirements ──────────────────────────────────────────
  drawSectionHeader('C. Basic Requirements')

  // Row 1: Sex Preference
  page.drawText('Sex Preference:', { x: marginX + 5, y: currentY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) })
  const sexX = drawCheckbox(page, marginX + 120, currentY, data.sexPreference === 'male', 'Male', fontRegular)
  drawCheckbox(page, sexX, currentY, data.sexPreference === 'female', 'Female', fontRegular)

  // Row 2: Age Preference
  currentY -= 13
  page.drawText('Age Preference:', { x: marginX + 5, y: currentY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) })
  let ageX = drawCheckbox(page, marginX + 120, currentY, data.agePreference === '18-25', '18-25', fontRegular)
  ageX = drawCheckbox(page, ageX, currentY, data.agePreference === '26-35', '26-35', fontRegular)
  ageX = drawCheckbox(page, ageX, currentY, data.agePreference === '36-45', '36-45', fontRegular)
  drawCheckbox(page, ageX, currentY, data.agePreference === '>45', '> 45', fontRegular)

  // Row 3: Education Degree
  currentY -= 13
  page.drawText('Education Degree:', { x: marginX + 5, y: currentY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) })
  let eduX = drawCheckbox(page, marginX + 120, currentY, data.educationDegree === 'diploma', 'Diploma', fontRegular)
  eduX = drawCheckbox(page, eduX, currentY, data.educationDegree === 's1', 'S1', fontRegular)
  eduX = drawCheckbox(page, eduX, currentY, data.educationDegree === 's2', 'S2', fontRegular)
  drawCheckbox(page, eduX, currentY, data.educationDegree === 'smk_smu', 'SMK/SMU', fontRegular)

  // Row 4: Education Background
  currentY -= 13
  const bgArr = data.educationBackground || []
  page.drawText('Education Background:', { x: marginX + 5, y: currentY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) })
  let bgX = drawCheckbox(page, marginX + 120, currentY, bgArr.includes('Finance/Accounting'), 'Finance/Accounting', fontRegular)
  bgX = drawCheckbox(page, bgX, currentY, bgArr.includes('Management'), 'Management', fontRegular)
  bgX = drawCheckbox(page, bgX, currentY, bgArr.includes('Engineering'), 'Engineering', fontRegular)
  drawCheckbox(page, bgX, currentY, bgArr.includes('IT'), 'IT', fontRegular)

  // Row 5: Years of Experience
  currentY -= 13
  page.drawText('Years of Experience:', { x: marginX + 5, y: currentY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) })
  let expX = drawCheckbox(page, marginX + 120, currentY, data.yearsOfExperience === 'fresh_graduate', 'Fresh Graduate', fontRegular)
  expX = drawCheckbox(page, expX, currentY, data.yearsOfExperience === '1-3', '1-3', fontRegular)
  expX = drawCheckbox(page, expX, currentY, data.yearsOfExperience === '3-6', '3-6', fontRegular)
  expX = drawCheckbox(page, expX, currentY, data.yearsOfExperience === '7-12', '7-12', fontRegular)
  drawCheckbox(page, expX, currentY, data.yearsOfExperience === '>12', '> 12', fontRegular)

  // Row 6: Field of Job Experience
  currentY -= 13
  page.drawText('Field of Job Experience:', { x: marginX + 5, y: currentY, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) })
  page.drawText(data.fieldOfJobExperience || '-', { x: marginX + 120, y: currentY, size: 8, font: fontRegular })
  page.drawLine({ start: { x: marginX + 120, y: currentY - 3 }, end: { x: width - marginX, y: currentY - 3 }, thickness: 0.5, color: rgb(0.65, 0.65, 0.65) })

  currentY -= 16

  // ─── D. Functional Competency ──────────────────────────────────────────
  drawSectionHeader('D. Functional Competency')

  const col1W = 240
  const col2W = 115
  const col3W = contentWidth - col1W - col2W // 170.28

  const tableHeaderY = currentY
  const headerH = 20

  // Table Header Box
  page.drawRectangle({
    x: marginX,
    y: tableHeaderY - headerH,
    width: contentWidth,
    height: headerH,
    color: rgb(0.92, 0.95, 0.98),
    borderColor: rgb(0.2, 0.35, 0.5),
    borderWidth: 0.8,
  })

  // Vertical Column Dividers in Header
  page.drawLine({
    start: { x: marginX + col1W, y: tableHeaderY },
    end: { x: marginX + col1W, y: tableHeaderY - headerH },
    thickness: 0.6,
    color: rgb(0.3, 0.45, 0.6),
  })
  page.drawLine({
    start: { x: marginX + col1W + col2W, y: tableHeaderY },
    end: { x: marginX + col1W + col2W, y: tableHeaderY - headerH },
    thickness: 0.6,
    color: rgb(0.3, 0.45, 0.6),
  })

  // Header Titles
  page.drawText('Job Related Skills - Knowledge - Behavior', {
    x: marginX + 10,
    y: tableHeaderY - 13,
    size: 7.5,
    font: fontBold,
    color: rgb(0.05, 0.22, 0.42),
  })

  const lvlTitle = 'Level of Competency'
  const lvlTitleW = fontBold.widthOfTextAtSize(lvlTitle, 7)
  page.drawText(lvlTitle, {
    x: marginX + col1W + (col2W - lvlTitleW) / 2,
    y: tableHeaderY - 8,
    size: 7,
    font: fontBold,
    color: rgb(0.05, 0.22, 0.42),
  })
  page.drawText('Basic     Interm.     Advance', {
    x: marginX + col1W + 12,
    y: tableHeaderY - 16,
    size: 6,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  })

  page.drawText('Competency Remarks (describe in details)', {
    x: marginX + col1W + col2W + 10,
    y: tableHeaderY - 13,
    size: 7.5,
    font: fontBold,
    color: rgb(0.05, 0.22, 0.42),
  })

  currentY = tableHeaderY - headerH

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

  const rowCount = Math.max(5, listComp.length)
  const rowHeight = 15

  for (let idx = 0; idx < rowCount; idx++) {
    const comp = listComp[idx] || { skillName: '', level: 'basic', remarks: '' }
    const rowY = currentY - rowHeight

    // Row border line
    page.drawRectangle({
      x: marginX,
      y: rowY,
      width: contentWidth,
      height: rowHeight,
      borderColor: rgb(0.75, 0.75, 0.75),
      borderWidth: 0.5,
    })

    // Vertical dividers
    page.drawLine({
      start: { x: marginX + col1W, y: currentY },
      end: { x: marginX + col1W, y: rowY },
      thickness: 0.5,
      color: rgb(0.75, 0.75, 0.75),
    })
    page.drawLine({
      start: { x: marginX + col1W + col2W, y: currentY },
      end: { x: marginX + col1W + col2W, y: rowY },
      thickness: 0.5,
      color: rgb(0.75, 0.75, 0.75),
    })

    // Skill text
    page.drawText(`${idx + 1}.`, { x: marginX + 6, y: rowY + 4, size: 7.5, font: fontRegular, color: rgb(0.3, 0.3, 0.3) })
    const skillLines = wrapText(comp.skillName || '', col1W - 25, fontRegular, 7.5)
    page.drawText(skillLines[0] || '', { x: marginX + 22, y: rowY + 4, size: 7.5, font: fontRegular, color: rgb(0.1, 0.1, 0.1) })

    // Level Checkboxes (centered inside sub-columns)
    const isBasic = comp.level === 'basic' || comp.level === 'Basic'
    const isInter = comp.level === 'intermediate' || comp.level === 'Intermediate'
    const isAdv = comp.level === 'advance' || comp.level === 'Advance'

    drawCheckbox(page, marginX + col1W + 18, rowY + 4, isBasic, '', fontRegular)
    drawCheckbox(page, marginX + col1W + 52, rowY + 4, isInter, '', fontRegular)
    drawCheckbox(page, marginX + col1W + 86, rowY + 4, isAdv, '', fontRegular)

    // Remarks text
    page.drawText(comp.remarks || '-', { x: marginX + col1W + col2W + 8, y: rowY + 4, size: 7.5, font: fontRegular, color: rgb(0.2, 0.2, 0.2) })

    currentY = rowY
  }

  currentY -= 14

  // ─── E. Approval (6 Columns Grid matching Official Format) ─────────────
  drawSectionHeader('E. Approval')

  const gridY = currentY
  const gridHeight = 96
  const colCount = data.approvals && data.approvals.length > 0 ? data.approvals.length : 5
  const colWidth = contentWidth / colCount

  // Draw Grid Box Outer
  page.drawRectangle({
    x: marginX,
    y: gridY - gridHeight,
    width: contentWidth,
    height: gridHeight,
    borderColor: rgb(0.2, 0.35, 0.5),
    borderWidth: 0.8,
  })

  // Header Sub-bar background inside grid box
  page.drawRectangle({
    x: marginX,
    y: gridY - 15,
    width: contentWidth,
    height: 15,
    color: rgb(0.92, 0.95, 0.98),
  })
  page.drawLine({
    start: { x: marginX, y: gridY - 15 },
    end: { x: width - marginX, y: gridY - 15 },
    thickness: 0.6,
    color: rgb(0.2, 0.35, 0.5),
  })

  const approvalsByStep: Record<number, RfrPdfApprovalStep> = {}
  for (const app of data.approvals) {
    approvalsByStep[app.stepOrder] = app
  }

  const defaultRoleTitles = [
    { label: 'Diajukan Oleh', name: data.requestorName || '-', title: 'Requestor' },
    { label: 'HC Verification', name: 'Adila Tri Arizona', title: 'HR Recruitment Staff' },
    { label: 'Leader HR-GA', name: 'Kesuma Bagaskara', title: 'Leader HR-GA' },
    { label: 'Human Capital Spv', name: 'Muhammad Iqbal', title: 'Human Capital Spv' },
    { label: 'Manager Departemen', name: 'Romy Hidayat', title: 'Central Services Manager' },
    { label: 'General Manager', name: 'Person Sihaloho', title: 'General Manager' },
  ]

  for (let c = 0; c < colCount; c++) {
    const colX = marginX + c * colWidth
    const stepOrder = c + 1
    const appData = approvalsByStep[stepOrder]
    const defInfo = defaultRoleTitles[c]

    const headerLabel = (appData?.roleLabel || defInfo.label).replace(',', '')
    const nameLabel = appData?.approverName || defInfo.name
    const titleLabel = appData?.approverTitle || defInfo.title

    // Column divider right
    if (c < colCount - 1) {
      page.drawLine({
        start: { x: colX + colWidth, y: gridY },
        end: { x: colX + colWidth, y: gridY - gridHeight },
        thickness: 0.6,
        color: rgb(0.3, 0.45, 0.6),
      })
    }

    // Role Header Text
    const hW = fontBold.widthOfTextAtSize(headerLabel, 7)
    page.drawText(headerLabel, {
      x: colX + (colWidth - hW) / 2,
      y: gridY - 11,
      size: 7,
      font: fontBold,
      color: rgb(0.05, 0.22, 0.42),
    })

    // Signature Area
    const isApproved = appData && (appData.status === 'approved' || appData.status === 'completed')
    if (isApproved && appData.signatureDataUrl) {
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
            y: gridY - 54,
            width: 55,
            height: 34,
          })
        }
      } catch (err) {
        page.drawText('[ Signed ]', {
          x: colX + (colWidth - fontRegular.widthOfTextAtSize('[ Signed ]', 7)) / 2,
          y: gridY - 42,
          size: 7,
          font: fontRegular,
          color: rgb(0.1, 0.5, 0.2),
        })
      }
    } else if (isApproved) {
      page.drawText('[ Approved ]', {
        x: colX + (colWidth - fontRegular.widthOfTextAtSize('[ Approved ]', 6.5)) / 2,
        y: gridY - 42,
        size: 6.5,
        font: fontRegular,
        color: rgb(0.1, 0.5, 0.2),
      })
    } else {
      page.drawText('( Pending TTD )', {
        x: colX + (colWidth - fontRegular.widthOfTextAtSize('( Pending TTD )', 6)) / 2,
        y: gridY - 42,
        size: 6,
        font: fontRegular,
        color: rgb(0.65, 0.65, 0.65),
      })
    }

    // Name & Title at bottom of box
    let textY = gridY - 63
    const nameLines = wrapText(nameLabel, colWidth - 4, fontBold, 7)
    for (const line of nameLines) {
      const nW = fontBold.widthOfTextAtSize(line, 7)
      page.drawText(line, {
        x: colX + (colWidth - nW) / 2,
        y: textY,
        size: 7,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      })
      page.drawLine({
        start: { x: colX + (colWidth - nW) / 2, y: textY - 1 },
        end: { x: colX + (colWidth + nW) / 2, y: textY - 1 },
        thickness: 0.5,
        color: rgb(0.1, 0.1, 0.1),
      })
      textY -= 8.5
    }

    const titleLines = wrapText(titleLabel, colWidth - 4, fontRegular, 6)
    for (const line of titleLines) {
      const tW = fontRegular.widthOfTextAtSize(line, 6)
      page.drawText(line, {
        x: colX + (colWidth - tW) / 2,
        y: textY,
        size: 6,
        font: fontRegular,
        color: rgb(0.35, 0.35, 0.35),
      })
      textY -= 7
    }

    const sigDateTime = isApproved && appData?.signedAt
      ? formatIndoDateTime(appData.signedAt)
      : (c === 0 && data.requestDate ? formatIndoDateTime(data.requestDate) : '')
    if (sigDateTime) {
      const dtW = fontRegular.widthOfTextAtSize(sigDateTime, 5)
      page.drawText(sigDateTime, {
        x: colX + (colWidth - dtW) / 2,
        y: textY,
        size: 5,
        font: fontRegular,
        color: rgb(0.45, 0.45, 0.45),
      })
      textY -= 6.5
    }

    // Catatan / Remarks Approver (jika ada)
    const approverRemark =
      appData?.remarks &&
      !['Resubmitted after revision', 'Submitted', 'Reverted', 'Approved', 'approved'].includes(appData.remarks.trim())
        ? appData.remarks.trim()
        : ''
    if (approverRemark) {
      const remarkLines = wrapText(`Catatan: ${approverRemark}`, colWidth - 4, fontRegular, 4.8)
      for (const rLine of remarkLines.slice(0, 2)) {
        const rW = fontRegular.widthOfTextAtSize(rLine, 4.8)
        page.drawText(rLine, {
          x: colX + (colWidth - rW) / 2,
          y: textY,
          size: 4.8,
          font: fontRegular,
          color: rgb(0.45, 0.45, 0.45),
        })
        textY -= 5.5
      }
    }
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
