import fs from 'fs'
import path from 'path'

function updateUploadRoute() {
  const filePath = path.join(process.cwd(), 'app', 'api', 'uploads', '[...path]', 'route.ts')
  let content = fs.readFileSync(filePath, 'utf8')

  // 1. ALLOWED_UPLOAD_PREFIXES
  if (!content.includes('"asset-disposal"') && !content.includes('"asset-disposals"')) {
    content = content.replace(
      '"asset-transfer",',
      '"asset-transfer",\r\n  "asset-disposal",\r\n  "asset-disposals",'
    )
  }

  // 2. isPublicPrefix
  if (!content.includes('path[0] === "asset-disposal"')) {
    content = content.replace(
      'path[0] === "asset-transfer"',
      'path[0] === "asset-transfer" ||\r\n    path[0] === "asset-disposal" ||\r\n    path[0] === "asset-disposals"'
    )
  }

  // 3. candidateS3Keys
  if (!content.includes('`asset-disposal/${fileName}`')) {
    content = content.replace(
      '`asset-transfer/${fileName}`,',
      '`asset-transfer/${fileName}`,\r\n      `asset-disposal/${fileName}`,\r\n      `asset-disposals/${fileName}`,'
    )
  }

  fs.writeFileSync(filePath, content, 'utf8')
  console.log('✓ app/api/uploads/[...path]/route.ts updated')
}

function updateResolveUploadUrl() {
  const filePath = path.join(process.cwd(), 'lib', 'resolve-upload-url.ts')
  let content = fs.readFileSync(filePath, 'utf8')

  if (!content.includes('"asset-disposal/"')) {
    content = content.replace(
      '"asset-transfer/",',
      '"asset-transfer/",\r\n      "asset-disposal/",\r\n      "asset-disposals/",'
    )
  }

  fs.writeFileSync(filePath, content, 'utf8')
  console.log('✓ lib/resolve-upload-url.ts updated')
}

function updateS3Storage() {
  const filePath = path.join(process.cwd(), 'lib', 's3-storage.ts')
  let content = fs.readFileSync(filePath, 'utf8')

  if (!content.includes('"asset-disposal/"')) {
    content = content.replace(
      'cleanPath.startsWith("asset-transfer/")',
      'cleanPath.startsWith("asset-transfer/") ||\r\n      cleanPath.startsWith("asset-disposal/") ||\r\n      cleanPath.startsWith("asset-disposals/")'
    )
  }

  fs.writeFileSync(filePath, content, 'utf8')
  console.log('✓ lib/s3-storage.ts updated')
}

function updateClientUploadUrl() {
  const filePath = path.join(process.cwd(), 'lib', 'client-upload-url.ts')
  let content = fs.readFileSync(filePath, 'utf8')

  if (!content.includes('asset-disposal')) {
    content = content.replace(
      '|asset-transfer)',
      '|asset-transfer|asset-disposal|asset-disposals)'
    )
  }

  fs.writeFileSync(filePath, content, 'utf8')
  console.log('✓ lib/client-upload-url.ts updated')
}

try {
  updateUploadRoute()
  updateResolveUploadUrl()
  updateS3Storage()
  updateClientUploadUrl()
  console.log('🎉 All S3 upload prefix handlers registered successfully!')
} catch (err) {
  console.error('Error updating upload prefix handlers:', err)
  process.exit(1)
}
