import fs from 'fs'

const files = [
  'app/dashboard/assets/cer/components/cer-table.tsx',
  'app/dashboard/assets/disposal/components/asset-disposal-dashboard.tsx',
  'app/dashboard/assets/disposal/components/asset-disposal-detail-modal.tsx',
  'app/dashboard/assets/borrow/components/asset-borrow-dashboard.tsx',
  'app/dashboard/assets/borrow/components/asset-borrow-detail-modal.tsx',
  'app/dashboard/assets/transfer/components/asset-transfer-dashboard.tsx',
  'app/dashboard/assets/transfer/components/asset-transfer-detail-modal.tsx',
]

for (const f of files) {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8')
    if (c.includes("from '@/lib/hero-access'")) {
      c = c.replaceAll("from '@/lib/hero-access'", "from '@/lib/role-utils'")
      fs.writeFileSync(f, c, 'utf8')
      console.log('Fixed', f)
    }
  }
}
