import fs from 'fs'
import path from 'path'

const filePath = path.join(
  process.cwd(),
  'app',
  'dashboard',
  'assets',
  'disposal',
  'components',
  'asset-disposal-dashboard.tsx'
)
let content = fs.readFileSync(filePath, 'utf8')

content = content.replace(
  'const handleRefresh = () => {\r\n    router.refresh()\r\n  }',
  'const handleRefresh = () => {\r\n    router.refresh()\r\n    if (typeof window !== "undefined") {\r\n      window.location.reload()\r\n    }\r\n  }'
)

fs.writeFileSync(filePath, content, 'utf8')
console.log('✓ Updated handleRefresh in asset-disposal-dashboard.tsx')
