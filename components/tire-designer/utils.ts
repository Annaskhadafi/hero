import type { PatternConfig } from '@/app/dashboard/repair-retread/pattern-designer/pattern-designer-client'

export function drawPattern(
  ctx: CanvasRenderingContext2D,
  config: PatternConfig,
  canvasWidth: number,
  canvasHeight: number,
) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  // Background: base rubber color
  const rubberColor = '#3d3d3d'
  ctx.fillStyle = rubberColor
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // ─── 1. Draw Sipes (Alur Halus) first, so main grooves overwrite them ───
  if (config.sipesDensity && config.sipesDensity > 0) {
    ctx.strokeStyle = '#555555'
    ctx.lineWidth = 1.5
    // Density maps to gap distance (lower gap = more dense)
    const sipesGap = Math.max(8, 120 - config.sipesDensity)
    const sipesAngleRad = ((config.sipesAngle ?? config.grooveAngle ?? 45) * Math.PI) / 180
    const sipesTan = Math.tan(sipesAngleRad) || 0.001

    // Draw sipes across the canvas
    for (let x = -canvasHeight; x < canvasWidth + canvasHeight; x += sipesGap) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x - canvasHeight / sipesTan, canvasHeight)
      ctx.stroke()
    }
  }

  // ─── 2. Draw Main Grooves (Alur Utama) ──────────────────────────────────
  const grooveColor = '#111111'
  const grooveWidthPx = Math.max(4, (config.grooveWidthMm / config.repeatUnitMm) * canvasWidth * 0.4)
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
      const ribSpacing = canvasWidth / Math.max(3, Math.round(canvasWidth / ((config.repeatUnitMm / 300) * canvasWidth)))
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

  // Cover the left and right edges with solid rubber to ensure clean sidewalls in 3D
  ctx.fillStyle = rubberColor
  ctx.fillRect(0, 0, 12, canvasHeight)
  ctx.fillRect(canvasWidth - 12, 0, 12, canvasHeight)
}

/**
 * Generates a clean 1:1 millimetric scale SVG string for CAD/CNC/Laser Engraving integration.
 * Width is dims.treadWidthMm and height is config.repeatUnitMm.
 */
export function generatePatternSVG(config: PatternConfig, dims: { treadWidthMm: number }): string {
  const treadW = dims.treadWidthMm
  const repeatH = config.repeatUnitMm
  const gWidth = config.grooveWidthMm

  let svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${treadW}mm" height="${repeatH}mm" viewBox="0 0 ${treadW} ${repeatH}">
  <rect width="100%" height="100%" fill="#3d3d3d" />
  
  <!-- GROOVES GROUP (Black lines are engraved deeper) -->
  <g id="grooves" stroke="#111111" stroke-width="${gWidth}" fill="none">
`

  const angleRad = (config.grooveAngle * Math.PI) / 180
  const tanA = Math.tan(angleRad) || 0.001

  switch (config.type) {
    case 'zig-zag': {
      const numTracks = Math.max(3, Math.round(treadW / 60))
      const trackWidth = treadW / numTracks
      const segH = repeatH / 2
      const amp = segH * tanA

      for (let i = 0; i < numTracks; i++) {
        const cx = (i + 0.5) * trackWidth
        svgContent += `    <path d="M ${cx - amp} 0 L ${cx + amp} ${segH} L ${cx - amp} ${repeatH}" stroke-linecap="square" />\n`
      }
      break
    }
    case 'lug': {
      const blockW = treadW * (1 - config.patternDensity / 100 + 0.3)
      svgContent += `    <line x1="0" y1="${repeatH * 0.25}" x2="${blockW}" y2="${repeatH * 0.25}" />\n`
      svgContent += `    <line x1="${treadW - blockW}" y1="${repeatH * 0.75}" x2="${treadW}" y2="${repeatH * 0.75}" />\n`
      break
    }
    case 'rib': {
      const numRibs = Math.max(3, Math.round(treadW / 50))
      const ribSpacing = treadW / numRibs
      for (let x = ribSpacing / 2; x < treadW; x += ribSpacing) {
        svgContent += `    <line x1="${x}" y1="0" x2="${x}" y2="${repeatH}" />\n`
      }
      break
    }
    case 'block': {
      svgContent += `    <line x1="0" y1="0" x2="${treadW}" y2="0" />\n`
      const numBlocks = Math.max(4, Math.round(treadW / 50))
      const bSize = treadW / numBlocks
      for (let x = 0; x <= treadW; x += bSize) {
        svgContent += `    <line x1="${x}" y1="0" x2="${x}" y2="${repeatH}" />\n`
      }
      break
    }
    case 'traction': {
      const shoulderX = treadW * 0.18
      const centerX = treadW * 0.52
      const overlap = treadW * 0.04
      const centerOffset = (centerX - shoulderX) * Math.tan(angleRad)

      svgContent += `    <path d="M 0 0 L ${shoulderX} 0 L ${centerX} ${centerOffset}" stroke-linecap="round" stroke-linejoin="round" />\n`
      svgContent += `    <path d="M ${treadW} ${repeatH * 0.5} L ${treadW - shoulderX} ${repeatH * 0.5} L ${treadW - centerX + overlap} ${repeatH * 0.5 + centerOffset}" stroke-linecap="round" stroke-linejoin="round" />\n`
      break
    }
    case 'mixed': {
      svgContent += `    <line x1="${treadW / 2}" y1="0" x2="${treadW / 2}" y2="${repeatH}" />\n`
      svgContent += `    <line x1="0" y1="${repeatH * 0.25}" x2="${treadW * 0.35}" y2="${repeatH * 0.25}" />\n`
      svgContent += `    <line x1="${treadW * 0.65}" y1="${repeatH * 0.75}" x2="${treadW}" y2="${repeatH * 0.75}" />\n`
      break
    }
    default: {
      const step = repeatH * 1.5
      for (let x = -repeatH; x < treadW + repeatH; x += step) {
        svgContent += `    <line x1="${x}" y1="0" x2="${x - repeatH / tanA}" y2="${repeatH}" />\n`
      }
    }
  }

  svgContent += `  </g>\n`

  // ─── 3. Add Sipes to SVG as Red/Dashed lines (CAD/CNC engraving option) ───
  if (config.sipesDensity && config.sipesDensity > 0) {
    svgContent += `
  <!-- SIPES GROUP (Red dashed lines are for shallow micro-cuts) -->
  <g id="sipes" stroke="#ef4444" stroke-width="0.5" stroke-dasharray="2,2" fill="none">
`
    const sipesGap = Math.max(8, 120 - config.sipesDensity)
    const sipesAngleRad = ((config.sipesAngle ?? config.grooveAngle ?? 45) * Math.PI) / 180
    const sipesTan = Math.tan(sipesAngleRad) || 0.001

    for (let x = -repeatH * 3; x < treadW + repeatH * 3; x += sipesGap) {
      svgContent += `    <line x1="${x.toFixed(1)}" y1="0" x2="${(x - repeatH / sipesTan).toFixed(1)}" y2="${repeatH}" />\n`
    }
    svgContent += `  </g>\n`
  }

  svgContent += `</svg>\n`
  return svgContent
}
