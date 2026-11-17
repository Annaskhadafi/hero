export type TwibbonAspectRatio = '1:1' | '4:5' | '9:16'

export interface TwibbonRatioSpec {
  key: TwibbonAspectRatio
  label: string
  shortLabel: string
  igLabel: string
  width: number
  height: number
  field: 'squareUrl' | 'portraitUrl' | 'storyUrl'
}

export const TWIBBON_ASPECT_RATIOS: Record<TwibbonAspectRatio, TwibbonRatioSpec> = {
  '1:1': {
    key: '1:1',
    label: 'Square 1:1',
    shortLabel: '1:1',
    igLabel: 'IG Post Square (1080×1080)',
    width: 1080,
    height: 1080,
    field: 'squareUrl',
  },
  '4:5': {
    key: '4:5',
    label: 'Portrait 4:5',
    shortLabel: '4:5',
    igLabel: 'IG Feed Portrait (1080×1350)',
    width: 1080,
    height: 1350,
    field: 'portraitUrl',
  },
  '9:16': {
    key: '9:16',
    label: 'Story / Reels 9:16',
    shortLabel: '9:16',
    igLabel: 'IG Story & Reels (1080×1920)',
    width: 1080,
    height: 1920,
    field: 'storyUrl',
  },
}

export const TWIBBON_RATIO_ORDER: TwibbonAspectRatio[] = ['1:1', '4:5', '9:16']

export const TWIBBON_CATEGORY_OPTIONS = [
  { value: 'Campaign', label: 'Campaign Perusahaan' },
  { value: 'Event', label: 'Event & Perayaan' },
  { value: 'HSE', label: 'HSE & Keselamatan' },
  { value: 'HC', label: 'Human Capital' },
  { value: 'Umum', label: 'Umum / Lainnya' },
]

export const TWIBBON_MAX_VIDEO_SECONDS = 60
export const TWIBBON_MAX_VIDEO_BYTES = 100 * 1024 * 1024 // 100 MB
export const TWIBBON_MAX_PNG_BYTES = 15 * 1024 * 1024 // 15 MB

export interface TwibbonTemplateDTO {
  id: number
  slug: string
  title: string
  description: string | null
  captionText: string | null
  category: string
  squareUrl: string | null
  portraitUrl: string | null
  storyUrl: string | null
  status: string
  usageCount: number
  createdByUserId: string | null
  createdByEmployeeId: number | null
  createdByName: string
  createdAt: string
  updatedAt: string
  canManage: boolean
}

export function getAvailableRatios(template: Pick<TwibbonTemplateDTO, 'squareUrl' | 'portraitUrl' | 'storyUrl'>): TwibbonAspectRatio[] {
  const ratios: TwibbonAspectRatio[] = []
  if (template.squareUrl) ratios.push('1:1')
  if (template.portraitUrl) ratios.push('4:5')
  if (template.storyUrl) ratios.push('9:16')
  return ratios
}

export function getTemplateFrameUrl(
  template: Pick<TwibbonTemplateDTO, 'squareUrl' | 'portraitUrl' | 'storyUrl'>,
  ratio: TwibbonAspectRatio
): string | null {
  const field = TWIBBON_ASPECT_RATIOS[ratio].field
  return template[field] || null
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

/**
 * Shared cover + zoom + normalized pan (-1..1) geometry used identically by:
 * - Interactive preview
 * - HTML5 Canvas image export
 * - FFmpeg video crop/scale filter
 */
export function computeCoverDrawRect(
  srcWidth: number,
  srcHeight: number,
  targetWidth: number,
  targetHeight: number,
  zoom = 1,
  panX = 0,
  panY = 0
) {
  const safeSrcW = Math.max(1, srcWidth)
  const safeSrcH = Math.max(1, srcHeight)
  const safeZoom = clampNumber(zoom, 1, 3)
  const safePanX = clampNumber(panX, -1, 1)
  const safePanY = clampNumber(panY, -1, 1)

  const baseScale = Math.max(targetWidth / safeSrcW, targetHeight / safeSrcH)
  const effectiveScale = baseScale * safeZoom

  const drawWidth = safeSrcW * effectiveScale
  const drawHeight = safeSrcH * effectiveScale

  const maxOffsetX = Math.max(0, (drawWidth - targetWidth) / 2)
  const maxOffsetY = Math.max(0, (drawHeight - targetHeight) / 2)

  const drawX = (targetWidth - drawWidth) / 2 + safePanX * maxOffsetX
  const drawY = (targetHeight - drawHeight) / 2 + safePanY * maxOffsetY

  return {
    drawX,
    drawY,
    drawWidth,
    drawHeight,
    maxOffsetX,
    maxOffsetY,
  }
}
