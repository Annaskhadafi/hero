import { db } from '@/db'
import { orgChartStructures } from '@/db/schema/hero'

async function main() {
  const structures = await db.select().from(orgChartStructures).limit(3)
  console.log('Structures:', structures)
  process.exit(0)
}
main().catch(console.error)
