import { revertRfrStep } from '../app/actions/rfr'

async function main() {
  const token = '83d76eca-c51f-4765-a35c-d86d3599f892' // token step 2 of RFR ID 9
  console.log("Calling revertRfrStep...")
  const res = await revertRfrStep(token, "test revert comment")
  console.log("Result:", res)
}

main().catch(console.error).finally(() => process.exit(0))
