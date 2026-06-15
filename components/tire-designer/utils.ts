import type { PatternConfig } from '@/app/dashboard/repair-retread/pattern-designer/pattern-designer-client'

export function drawPattern(
  ctx: CanvasRenderingContext2D,
  config: PatternConfig,
  canvasWidth: number,
  canvasHeight: number,
) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  // Background: rubber color
  ctx.fillStyle = '#2a2a2a'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  const grooveColor = '#111111'
  const rubberColor = '#3d3d3d'
  const grooveWidthPx = Math.max(4, (config.grooveWidthMm / config.repeatUnitMm) * canvasWidth * 0.4)

  ctx.fillStyle = rubberColor
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  const angleRad = (config.grooveAngle * Math.PI) / 180
  const tanA = Math.abs(Math.tan(angleRad)) || 0.001

  switch (config.type) {
    case 'zig-zag': {
      const repeatPx = Math.max(20, (config.repeatUnitMm / 300) * canvasWidth)
      ctx.strokeStyle = grooveColor
      ctx.lineWidth = grooveWidthPx
      ctx.lineCap = 'square'

      for (let y = -canvasHeight; y < canvasHeight * 2; y += repeatPx) {
        ctx.beginPath()
        let x = 0
        let going = true
        while (x < canvasWidth) {
          const segW = repeatPx / (2 * tanA)
          if (going) {
            ctx.moveTo(x, y)
            ctx.lineTo(x + segW, y + repeatPx / 2)
          } else {
            ctx.lineTo(x + segW, y)
          }
          x += segW
          going = !going
        }
        ctx.stroke()
      }
      break
    }
    case 'lug': {
      const blockH = Math.max(15, (config.repeatUnitMm / 300) * canvasHeight)
      const blockW = canvasWidth * (1 - config.patternDensity / 100 + 0.3)
      ctx.fillStyle = grooveColor
      for (let y = 0; y < canvasHeight * 2; y += blockH * 1.5) {
        for (let x = 0; x < canvasWidth; x += blockW * 1.8) {
          const offset = (Math.floor(y / (blockH * 1.5)) % 2) * (blockW * 0.9)
          ctx.fillRect(x + offset, y, blockW, grooveWidthPx)
        }
      }
      break
    }
    case 'rib': {
      const ribSpacing = canvasWidth / Math.max(3, Math.round(canvasWidth / (config.repeatUnitMm / 300 * canvasWidth)))
      ctx.fillStyle = grooveColor
      for (let x = ribSpacing / 2; x < canvasWidth; x += ribSpacing) {
        ctx.fillRect(x - grooveWidthPx / 2, 0, grooveWidthPx, canvasHeight)
      }
      break
    }
    case 'block': {
      const bSize = Math.max(20, (config.repeatUnitMm / 300) * Math.min(canvasWidth, canvasHeight))
      ctx.fillStyle = grooveColor
      for (let y = 0; y < canvasHeight; y += bSize) {
        for (let x = 0; x < canvasWidth; x += bSize) {
          ctx.fillRect(x, y, grooveWidthPx, bSize)
          ctx.fillRect(x, y, bSize, grooveWidthPx)
        }
      }
      break
    }
    case 'traction': {
      // Chevron/Traction OTR pattern (interlocking diagonal lugs)
      const repeatPx = Math.max(25, (config.repeatUnitMm / 300) * canvasHeight)
      ctx.strokeStyle = grooveColor
      ctx.lineWidth = grooveWidthPx
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const shoulderX = canvasWidth * 0.18
      const centerX = canvasWidth * 0.52
      const overlap = canvasWidth * 0.04
      const centerOffset = (centerX - shoulderX) * Math.tan(angleRad)

      for (let y = -canvasHeight; y < canvasHeight * 2; y += repeatPx) {
        // Left side diagonal groove
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(shoulderX, y)
        ctx.lineTo(centerX, y + centerOffset)
        ctx.stroke()

        // Right side diagonal groove (offset by half repeat unit)
        const yRight = y + repeatPx * 0.5
        ctx.beginPath()
        ctx.moveTo(canvasWidth, yRight)
        ctx.lineTo(canvasWidth - shoulderX, yRight)
        ctx.lineTo(canvasWidth - centerX + overlap, yRight + centerOffset)
        ctx.stroke()
      }
      break
    }
    case 'mixed': {
      // Center rib
      ctx.fillStyle = grooveColor
      ctx.fillRect(canvasWidth / 2 - grooveWidthPx / 2, 0, grooveWidthPx, canvasHeight)
      // Side lug
      const lugH = Math.max(15, (config.repeatUnitMm / 300) * canvasHeight)
      for (let y = 0; y < canvasHeight; y += lugH * 1.8) {
        ctx.fillRect(0, y, canvasWidth * 0.4, grooveWidthPx)
        ctx.fillRect(canvasWidth * 0.6, y + lugH * 0.9, canvasWidth * 0.4, grooveWidthPx)
      }
      break
    }
    default: {
      // Custom: simple diagonal grooves
      const step = Math.max(20, (config.repeatUnitMm / 300) * canvasWidth * 0.5)
      ctx.strokeStyle = grooveColor
      ctx.lineWidth = grooveWidthPx
      for (let x = -canvasHeight; x < canvasWidth + canvasHeight; x += step) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x - canvasHeight / tanA, canvasHeight)
        ctx.stroke()
      }
    }
  }

  // Grid overlay (subtle)
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.lineWidth = 0.5
  const gridSize = 50
  for (let x = 0; x < canvasWidth; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasHeight); ctx.stroke()
  }
  for (let y = 0; y < canvasHeight; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasWidth, y); ctx.stroke()
  }
}
