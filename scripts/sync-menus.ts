import { ensureHeroGovernanceSeedData } from '../lib/hero-admin'

async function sync() {
  console.log('Syncing menus...')
  await ensureHeroGovernanceSeedData()
  console.log('Done syncing.')
}

sync().catch(console.error).finally(() => process.exit(0))
