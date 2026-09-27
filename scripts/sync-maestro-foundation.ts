import 'dotenv/config'

import { syncMaestroFoundation } from '@/lib/maestro-pages'

syncMaestroFoundation()
  .then((result) => {
    console.log(JSON.stringify({ ok: true, ...result }))
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
