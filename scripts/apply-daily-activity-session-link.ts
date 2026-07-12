import { sql } from 'drizzle-orm'

import { db } from '../db'

async function main() {
  await db.execute(sql`
    alter table hero_daily_activity_sessions
    add column if not exists activity_id integer references hero_activities(id) on delete set null
  `)

  const result = await db.execute(sql`
    select column_name
    from information_schema.columns
    where table_name = 'hero_daily_activity_sessions'
      and column_name = 'activity_id'
  `)

  if (result.rows.length !== 1) {
    throw new Error('hero_daily_activity_sessions.activity_id was not applied')
  }

  console.log('hero_daily_activity_sessions.activity_id is ready')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
