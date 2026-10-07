import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import pptxgen from 'pptxgenjs'

import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import {
  ROAD_CONDITION_RESOURCE,
  ROAD_CONDITION_CATEGORIES,
  normalizeRoadConditionScore,
  type RoadConditionCategoryKey,
} from '@/lib/road-condition-rubric'

export const runtime = 'nodejs'
export const maxDuration = 60

const SUMMARY_CATEGORY_ORDER: RoadConditionCategoryKey[] = ['loading_point', 'haulroad', 'disposal']
const SUMMARY_CATEGORY_LABELS: Record<RoadConditionCategoryKey, string> = {
  loading_point: 'LOADING AREA',
  haulroad: 'HAULING ROAD',
  disposal: 'DUMPING AREA',
}

function formatReportDate(value: string) {
  if (!value) return '-'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatStars(score: number | null) {
  return score == null ? '-' : '★'.repeat(normalizeRoadConditionScore(score))
}

function formatSummaryScore(score: number | null) {
  return score == null ? '-' : score.toFixed(2)
}

function formatSummaryPercent(score: number | null) {
  return score == null ? '-' : `${((score / 5) * 100).toFixed(2)}%`
}

function getDraftAverageScore(draft: any) {
  const scores: number[] = draft.analysis?.assessments?.map((item: any) => normalizeRoadConditionScore(item.score)) ?? []
  if (!scores.length) return null
  return scores.reduce((total: number, score: number) => total + score, 0) / scores.length
}

function getDraftPointLabel(draft: any, fallbackIndex: number) {
  return draft.pointName?.trim() || `${ROAD_CONDITION_CATEGORIES[draft.categoryKey as RoadConditionCategoryKey]?.label || 'Point'} ${fallbackIndex + 1}`
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permission = await getCurrentMenuPermission(ROAD_CONDITION_RESOURCE)
    if (!permission.canView) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })
    }

    const source = await request.json()
    if (!source || !Array.isArray(source.drafts)) {
      return NextResponse.json({ error: 'Payload tidak valid.' }, { status: 400 })
    }

    const pptx = new pptxgen()
    pptx.defineLayout({ name: 'HERO_WIDE', width: 13.333, height: 7.5 })
    pptx.layout = 'HERO_WIDE'
    pptx.author = 'HERO'
    pptx.company = 'Chitra Paratama'
    pptx.title = `Road Condition Analysis - ${source.siteName || 'Report'}`

    const total = source.drafts.length + 3
    const coverPath = path.join(process.cwd(), 'public', 'cover.png')
    const backCoverPath = path.join(process.cwd(), 'public', 'backcover.png')

    // Slide 1: Cover
    const slide1 = pptx.addSlide()
    if (fs.existsSync(coverPath)) {
      const coverBuffer = fs.readFileSync(coverPath)
      slide1.addImage({
        data: `data:image/png;base64,${coverBuffer.toString('base64')}`,
        x: 0,
        y: 0,
        w: 13.333,
        h: 7.5,
      })
    } else {
      slide1.background = { color: 'F4F8F7' }
    }
    slide1.addText('Site Condition Assessment', {
      x: 0.9,
      y: 1.6,
      w: 8,
      h: 0.35,
      fontSize: 13,
      bold: true,
      color: '0B6F9F',
    })
    slide1.addText(
      [
        { text: 'Road Condition\n', options: { color: '0A315F', bold: true } },
        { text: 'Analysis Report', options: { color: '79BF23', bold: true } },
      ],
      {
        x: 0.9,
        y: 2.05,
        w: 8.5,
        h: 1.6,
        fontSize: 36,
        fontFace: 'Arial',
      }
    )
    slide1.addShape(pptx.ShapeType.rect, {
      x: 0.9,
      y: 3.85,
      w: 2.2,
      h: 0.08,
      fill: { color: '79BF23' },
      line: { color: '79BF23' },
    })
    slide1.addText(
      `Site: ${source.siteName || '-'}\nCustomer: ${source.customerName || '-'}\nInspector: ${source.inspectorName || '-'}\nDate: ${formatReportDate(source.reportDate)}`,
      {
        x: 0.9,
        y: 4.15,
        w: 6,
        h: 1.6,
        fontSize: 13,
        color: '153B63',
        bold: true,
        lineSpacing: 22,
      }
    )
    slide1.addText(`Slide 1/${total}`, {
      x: 0.9,
      y: 6.8,
      w: 3,
      h: 0.3,
      fontSize: 10,
      color: '153B63',
      bold: true,
    })

    // Calculations for Slide 2
    const summaryRows = source.drafts.map((draft: any, index: number) => ({
      draft,
      pointLabel: getDraftPointLabel(draft, index),
      score: getDraftAverageScore(draft),
    }))

    const categorySummaryScores = SUMMARY_CATEGORY_ORDER.reduce(
      (result, categoryKey) => {
        const rows = summaryRows.filter((row: any) => row.draft.categoryKey === categoryKey)
        const scores = rows.map((row: any) => row.score).filter((score: any): score is number => score != null)
        result[categoryKey] =
          rows.length > 0 && scores.length === rows.length
            ? scores.reduce((total: number, score: number) => total + score, 0) / scores.length
            : null
        return result
      },
      {} as Record<RoadConditionCategoryKey, number | null>
    )

    const overallSummaryScore =
      summaryRows.every((row: any) => row.score != null) && summaryRows.length > 0
        ? summaryRows.reduce((total: number, row: any) => total + (row.score ?? 0), 0) / summaryRows.length
        : null

    // Slide 2: Summary Slide
    const slide2 = pptx.addSlide()
    slide2.background = { color: 'FFFFFF' }
    slide2.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: 0.65,
      fill: { color: '1A365D' },
      line: { color: '1A365D' },
    })
    slide2.addText('Site Condition Assessment', {
      x: 0,
      y: 0,
      w: 13.333,
      h: 0.65,
      fontSize: 18,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
    })

    // Top Table
    const topTableRows: any[] = [
      [
        { text: 'DATE', options: { fill: { color: 'E2E8F0' }, bold: true, align: 'center', fontSize: 10 } },
        { text: 'LOADING AREA', options: { fill: { color: 'E2E8F0' }, bold: true, align: 'center', fontSize: 10 } },
        { text: 'HAULING ROAD', options: { fill: { color: 'E2E8F0' }, bold: true, align: 'center', fontSize: 10 } },
        { text: 'DUMPING AREA', options: { fill: { color: 'E2E8F0' }, bold: true, align: 'center', fontSize: 10 } },
        { text: 'AVERAGE', options: { fill: { color: 'E2E8F0' }, bold: true, align: 'center', fontSize: 10 } },
        { text: 'STAR RATING', options: { fill: { color: 'E2E8F0' }, bold: true, align: 'center', fontSize: 10 } },
      ],
      [
        { text: formatReportDate(source.reportDate), options: { bold: true, align: 'center', fontSize: 10 } },
        { text: formatSummaryPercent(categorySummaryScores.loading_point), options: { align: 'center', fontSize: 10 } },
        { text: formatSummaryPercent(categorySummaryScores.haulroad), options: { align: 'center', fontSize: 10 } },
        { text: formatSummaryPercent(categorySummaryScores.disposal), options: { align: 'center', fontSize: 10 } },
        { text: formatSummaryPercent(overallSummaryScore), options: { bold: true, align: 'center', fontSize: 10 } },
        { text: formatSummaryScore(overallSummaryScore), options: { bold: true, align: 'center', fontSize: 10 } },
      ],
      [
        { text: source.siteName || '-', options: { color: 'DC2626', bold: true, fontSize: 14, align: 'left' } },
        {
          text: `Inspector: ${source.inspectorName || '-'} · Customer: ${source.customerName || '-'}`,
          options: { colspan: 4, align: 'center', fontSize: 10 },
        },
        { text: formatStars(overallSummaryScore), options: { color: 'DC2626', bold: true, fontSize: 16, align: 'center' } },
      ],
    ]

    slide2.addTable(topTableRows, {
      x: 0.5,
      y: 0.85,
      w: 12.333,
      colW: [2.0, 2.0, 2.0, 2.0, 2.0, 2.333],
      border: { pt: 1, color: '0F172A' },
      valign: 'middle',
    })

    // Bottom Detail Table
    const detailTableRows: any[] = [
      [
        { text: 'AREA', options: { fill: { color: 'E2E8F0' }, bold: true, align: 'center', fontSize: 9.5 } },
        { text: 'POINT / SEGMENT', options: { fill: { color: 'E2E8F0' }, bold: true, align: 'center', fontSize: 9.5 } },
        { text: 'AVG', options: { fill: { color: 'E2E8F0' }, bold: true, align: 'center', fontSize: 9.5 } },
        { text: 'STAR RATING', options: { fill: { color: 'E2E8F0' }, bold: true, align: 'center', fontSize: 9.5 } },
        { text: 'POINT*', options: { fill: { color: 'E2E8F0' }, bold: true, align: 'center', fontSize: 9.5 } },
      ],
    ]

    SUMMARY_CATEGORY_ORDER.forEach((catKey) => {
      const category = ROAD_CONDITION_CATEGORIES[catKey]
      const rows = summaryRows.filter((r: any) => r.draft.categoryKey === catKey)
      if (!rows.length) return

      const bannerHex = category.color.replace('#', '')
      detailTableRows.push([
        {
          text: SUMMARY_CATEGORY_LABELS[catKey],
          options: {
            colspan: 5,
            fill: { color: bannerHex },
            color: 'FFFFFF',
            bold: true,
            fontSize: 10,
            align: 'left',
          },
        },
      ])

      rows.forEach((row: any) => {
        detailTableRows.push([
          { text: category.label, options: { fontSize: 9 } },
          { text: row.pointLabel, options: { bold: true, fontSize: 9 } },
          { text: formatSummaryScore(row.score), options: { align: 'center', fontSize: 9 } },
          { text: formatStars(row.score), options: { color: 'DC2626', bold: true, align: 'center', fontSize: 13 } },
          { text: formatSummaryPercent(row.score), options: { bold: true, align: 'center', fontSize: 9 } },
        ])
      })

      const catScore = categorySummaryScores[catKey]
      detailTableRows.push([
        { text: 'Star Rating', options: { colspan: 2, fill: { color: 'E2E8F0' }, bold: true, fontSize: 9.5 } },
        { text: formatSummaryScore(catScore), options: { fill: { color: 'E2E8F0' }, bold: true, align: 'center', fontSize: 9.5 } },
        { text: formatStars(catScore), options: { fill: { color: 'E2E8F0' }, color: 'DC2626', bold: true, align: 'center', fontSize: 13 } },
        { text: formatSummaryPercent(catScore), options: { fill: { color: 'E2E8F0' }, bold: true, align: 'center', fontSize: 9.5 } },
      ])
    })

    slide2.addTable(detailTableRows, {
      x: 0.5,
      y: 2.35,
      w: 12.333,
      colW: [1.8, 5.2, 1.6, 2.133, 1.6],
      border: { pt: 0.75, color: '0F172A' },
      valign: 'middle',
    })
    slide2.addText(`Slide 2/${total}`, {
      x: 10.5,
      y: 7.15,
      w: 2.3,
      h: 0.25,
      fontSize: 9,
      color: '64748B',
      align: 'right',
      bold: true,
    })

    // Slide 3+: Detail Slides
    source.drafts.forEach((draft: any, index: number) => {
      const slide = pptx.addSlide()
      slide.background = { color: 'FFFFFF' }
      const category = ROAD_CONDITION_CATEGORIES[draft.categoryKey as RoadConditionCategoryKey] || ROAD_CONDITION_CATEGORIES.haulroad
      const catHex = category.color.replace('#', '')
      const pointLabel = getDraftPointLabel(draft, index)
      const score = getDraftAverageScore(draft)

      // Banner header
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 13.333,
        h: 1.25,
        fill: { color: catHex },
        line: { color: catHex },
      })
      slide.addText(`Report Analysis Road Condition\n${category.reportLabel} - ${pointLabel}`, {
        x: 0.5,
        y: 0.1,
        w: 8.5,
        h: 0.7,
        color: 'FFFFFF',
        bold: true,
        fontSize: 15,
      })
      if (draft.analysis?.summary) {
        slide.addText(draft.analysis.summary, {
          x: 0.5,
          y: 0.8,
          w: 8.5,
          h: 0.4,
          color: 'FFFFFF',
          fontSize: 9,
          italic: true,
        })
      }
      // Right info box
      slide.addShape(pptx.ShapeType.rect, {
        x: 9.2,
        y: 0.1,
        w: 3.65,
        h: 1.05,
        fill: { color: 'FFFFFF', transparency: 85 },
        line: { color: 'FFFFFF' },
      })
      slide.addText(
        `Site: ${source.siteName || '-'} · Customer: ${source.customerName || '-'}\nInspector: ${source.inspectorName || '-'} · Tanggal: ${formatReportDate(source.reportDate)}\nNilai Akhir: ${score ? score.toFixed(2) : '-'}/5`,
        {
          x: 9.3,
          y: 0.15,
          w: 3.45,
          h: 0.95,
          color: 'FFFFFF',
          fontSize: 9,
          lineSpacing: 15,
        }
      )

      // 3 Photos
      const photoY = 1.45
      const photoW = 3.9
      const photoH = 2.45
      const photos = Array.isArray(draft.photos) ? draft.photos : []
      photos.forEach((photo: any, pIdx: number) => {
        const photoX = 0.5 + pIdx * 4.2
        slide.addShape(pptx.ShapeType.rect, {
          x: photoX,
          y: photoY,
          w: photoW,
          h: photoH,
          fill: { color: 'F8FAFC' },
          line: { color: 'E2E8F0', pt: 1 },
        })
        const imgData = photo.dataUrl || photo.previewUrl
        if (imgData && imgData.startsWith('data:image/')) {
          slide.addImage({
            data: imgData,
            x: photoX + 0.05,
            y: photoY + 0.05,
            w: photoW - 0.1,
            h: photoH - 0.1,
            sizing: { type: 'contain', w: photoW - 0.1, h: photoH - 0.1 },
          })
        } else {
          slide.addText(photo.angle || 'No Photo', {
            x: photoX,
            y: photoY + 1.0,
            w: photoW,
            h: 0.4,
            align: 'center',
            color: '94A3B8',
            fontSize: 11,
          })
        }
      })

      // Assessment table: NILAI | DESKRIPSI | REKOMENDASI
      const assessTableRows: any[] = [
        [
          { text: 'NILAI', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'center', fontSize: 8.5 } },
          { text: 'DESKRIPSI', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'left', fontSize: 8.5 } },
          { text: 'REKOMENDASI', options: { fill: { color: '0F172A' }, color: 'FFFFFF', bold: true, align: 'left', fontSize: 8.5 } },
        ],
      ]

      category.criteria.forEach((criterion, rIdx) => {
        const assessment = draft.analysis?.assessments?.find((a: any) => a.criterionId === criterion.id)
        const itemScore = assessment ? normalizeRoadConditionScore(assessment.score) : null
        const desc = assessment?.description || `${criterion.title}: -`
        const rec = assessment?.recommendation || '-'
        const bgHex = rIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC'

        assessTableRows.push([
          { text: String(itemScore || '-'), options: { fill: { color: bgHex }, bold: true, align: 'center', fontSize: 9 } },
          { text: `${criterion.title}\n${desc}`, options: { fill: { color: bgHex }, fontSize: 8 } },
          { text: rec, options: { fill: { color: bgHex }, fontSize: 8 } },
        ])
      })

      slide.addTable(assessTableRows, {
        x: 0.5,
        y: 4.05,
        w: 12.333,
        colW: [1.0, 5.8, 5.533],
        border: { pt: 0.5, color: 'E2E8F0' },
        valign: 'top',
      })

      slide.addText(`Slide ${index + 3}/${total}`, {
        x: 10.5,
        y: 7.15,
        w: 2.3,
        h: 0.25,
        fontSize: 9,
        color: '64748B',
        align: 'right',
        bold: true,
      })
    })

    // Slide Last: Back cover
    const slideLast = pptx.addSlide()
    if (fs.existsSync(backCoverPath)) {
      const backCoverBuffer = fs.readFileSync(backCoverPath)
      slideLast.addImage({
        data: `data:image/png;base64,${backCoverBuffer.toString('base64')}`,
        x: 0,
        y: 0,
        w: 13.333,
        h: 7.5,
      })
    } else {
      slideLast.background = { color: '0F172A' }
    }

    const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="road-condition-${source.reportDate || 'report'}.pptx"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membuat PPTX.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
