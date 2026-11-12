import fs from 'fs'
import path from 'path'

const filePath = path.join(process.cwd(), 'db', 'schema', 'central-service.ts')
let content = fs.readFileSync(filePath, 'utf8')

const target = "condition: text('condition').notNull().default(''),"
if (content.includes(target) && !content.includes("status: text('status').notNull().default('ACTIVE')")) {
  content = content.replace(
    target,
    target + "\r\n    status: text('status').notNull().default('ACTIVE'),"
  )
  fs.writeFileSync(filePath, content, 'utf8')
  console.log('✓ status column added to centralServiceAssets schema')
}
