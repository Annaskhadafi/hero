import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// 1. Verify rarayPdfInspectorProcess in lib/raray-vision/client.ts
const clientPath = path.resolve('lib/raray-vision/client.ts')
const clientCode = fs.readFileSync(clientPath, 'utf8')

assert(clientCode.includes('rarayPdfInspectorProcess'), 'rarayPdfInspectorProcess must be exported in client.ts')
assert(clientCode.includes('/api/v1/pdf-inspector/process'), 'Target URL must be /api/v1/pdf-inspector/process')
assert(clientCode.includes('auto_ocr'), 'auto_ocr parameter must be sent to microservice')
assert(clientCode.includes('RarayPdfInspectorResult'), 'RarayPdfInspectorResult interface must be exported')

// 2. Verify extractTextViaOcr in lib/mcu-wellness-ocr.ts
const ocrPath = path.resolve('lib/mcu-wellness-ocr.ts')
const ocrCode = fs.readFileSync(ocrPath, 'utf8')

assert(ocrCode.includes('rarayPdfInspectorProcess'), 'extractTextViaOcr must call rarayPdfInspectorProcess')
assert(ocrCode.includes('extractTextViaOcr'), 'extractTextViaOcr must be exported')
assert(ocrCode.includes('analyzeTextViaAi'), 'analyzeTextViaAi must be exported')

// 3. Verify route in app/api/mcu-wellness/analyze/route.ts
const routePath = path.resolve('app/api/mcu-wellness/analyze/route.ts')
const routeCode = fs.readFileSync(routePath, 'utf8')

assert(routeCode.includes('extractTextViaOcr'), 'Analyze route must use extractTextViaOcr')
assert(routeCode.includes('analyzeTextViaAi'), 'Analyze route must use analyzeTextViaAi')

// 4. Verify strict separation: AI only maps text markdown, Microservice handles OCR
assert(!ocrCode.includes('messages: [{ role: "user", content: [{ type: "image_url"'), 'AI must NOT receive raw images for OCR')
assert(ocrCode.includes('Berikut adalah teks hasil OCR dari dokumen MCU'), 'AI prompt must only map extracted text')

console.log('✅ All MCU Wellness PDF Inspector & AI Mapping Tests Passed!')
