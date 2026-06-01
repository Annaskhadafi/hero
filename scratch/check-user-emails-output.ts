import { getHseUserEmails } from "../app/actions/hse-inventaris"

async function run() {
  const result = await getHseUserEmails()
  console.log("getHseUserEmails result success:", result.success)
  console.log("data length:", result.data?.length)
  console.log("Sample data:", result.data?.slice(0, 5))
  process.exit(0)
}

run()
