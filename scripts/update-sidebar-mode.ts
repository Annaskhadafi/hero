import fs from 'fs'

const filePath = 'lib/sidebar-mode.ts'
let content = fs.readFileSync(filePath, 'utf8')
const oldTarget = '// 9. ASET & DATA INDUK\r\n  if (url.startsWith("/dashboard/central-service/assets")'
const oldTargetLF = '// 9. ASET & DATA INDUK\n  if (url.startsWith("/dashboard/central-service/assets")'

if (content.includes(oldTarget)) {
  content = content.replace(
    oldTarget,
    '// 9. ASET & DATA INDUK\r\n  if (url.startsWith("/dashboard/assets") || url.startsWith("/dashboard/central-service/assets")'
  )
  fs.writeFileSync(filePath, content, 'utf8')
  console.log('Updated CRLF version in lib/sidebar-mode.ts')
} else if (content.includes(oldTargetLF)) {
  content = content.replace(
    oldTargetLF,
    '// 9. ASET & DATA INDUK\n  if (url.startsWith("/dashboard/assets") || url.startsWith("/dashboard/central-service/assets")'
  )
  fs.writeFileSync(filePath, content, 'utf8')
  console.log('Updated LF version in lib/sidebar-mode.ts')
} else {
  console.log('Neither target found, checking content...')
}
