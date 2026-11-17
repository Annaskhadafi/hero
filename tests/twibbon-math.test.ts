import {
  clampNumber,
  computeCoverDrawRect,
  getAvailableRatios,
  getTemplateFrameUrl,
  TWIBBON_ASPECT_RATIOS,
} from '@/lib/twibbon'

describe('Twibbon geometry and ratio helpers', () => {
  it('defines exact Instagram aspect ratio dimensions', () => {
    expect(TWIBBON_ASPECT_RATIOS['1:1']).toMatchObject({ width: 1080, height: 1080 })
    expect(TWIBBON_ASPECT_RATIOS['4:5']).toMatchObject({ width: 1080, height: 1350 })
    expect(TWIBBON_ASPECT_RATIOS['9:16']).toMatchObject({ width: 1080, height: 1920 })
  })

  it('computes cover crop and pan offsets without leaving blank gaps', () => {
    // Wide 16:9 photo inside 1:1 square at zoom=1
    const centered = computeCoverDrawRect(1920, 1080, 1080, 1080, 1, 0, 0)
    expect(centered.drawHeight).toBe(1080)
    expect(centered.drawWidth).toBe(1920)
    expect(centered.drawX).toBe(-420)
    expect(centered.drawY).toBe(0)

    // Pan fully right (panX = +1) aligns left edge to 0
    const panRight = computeCoverDrawRect(1920, 1080, 1080, 1080, 1, 1, 0)
    expect(panRight.drawX).toBe(0)

    // Pan fully left (panX = -1) aligns right edge to targetWidth
    const panLeft = computeCoverDrawRect(1920, 1080, 1080, 1080, 1, -1, 0)
    expect(panLeft.drawX + panLeft.drawWidth).toBe(1080)

    // Zoomed 2x into 9:16 story
    const zoomed = computeCoverDrawRect(1080, 1920, 1080, 1920, 2, 0, 0)
    expect(zoomed.drawWidth).toBe(2160)
    expect(zoomed.drawHeight).toBe(3840)
    expect(zoomed.maxOffsetX).toBe(540)
    expect(zoomed.maxOffsetY).toBe(960)
  })

  it('clamps zoom and pan values safely', () => {
    expect(clampNumber(10, 1, 3)).toBe(3)
    expect(clampNumber(0.2, 1, 3)).toBe(1)
    expect(clampNumber(Number.NaN, -1, 1)).toBe(-1)
  })

  it('returns available ratios and frame URLs', () => {
    const template = {
      squareUrl: '/api/uploads/twibbon-templates/sq.png',
      portraitUrl: null,
      storyUrl: '/api/uploads/twibbon-templates/st.png',
    }
    expect(getAvailableRatios(template)).toEqual(['1:1', '9:16'])
    expect(getTemplateFrameUrl(template, '1:1')).toBe('/api/uploads/twibbon-templates/sq.png')
    expect(getTemplateFrameUrl(template, '4:5')).toBeNull()
    expect(getTemplateFrameUrl(template, '9:16')).toBe('/api/uploads/twibbon-templates/st.png')
  })
})
