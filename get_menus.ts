import { db } from './db/index'
import { navbarMenuItems } from './db/schema/hero'

async function run() {
  const allMenus = await db.select().from(navbarMenuItems)
  console.log(JSON.stringify(allMenus, null, 2))
  process.exit(0)
}
run()
