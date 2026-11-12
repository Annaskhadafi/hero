import fs from 'fs'
import path from 'path'

const filePath = path.join(process.cwd(), 'app', 'dashboard', 'assets', 'disposal', 'actions.ts')
let content = fs.readFileSync(filePath, 'utf8')

content = content.replace(
  'category: centralServiceAssets.category,',
  'condition: centralServiceAssets.condition,'
)

fs.writeFileSync(filePath, content, 'utf8')
console.log('✓ Fixed centralServiceAssets query in actions.ts')
