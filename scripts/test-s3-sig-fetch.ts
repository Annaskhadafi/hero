import { getS3ObjectForProxy } from '../lib/s3-storage'

async function run() {
  const urls = [
    '/api/uploads/upload/826509d3-c0e7-4832-a6be-87ba86c5e220.png',
    '/api/uploads/upload/8604aa67-0a02-4695-b2a9-f14eb2c459bb.png',
    '/api/uploads/upload/e9e13af2-d8dd-4891-a1e7-2098dc7f5b6f.png',
    '/api/uploads/upload/1a407808-c90a-4e6e-aa38-dcc28cf54177.png',
    '/api/uploads/upload/f1550d34-795a-433a-927e-b6a8d78fd73e.png',
  ]

  for (const u of urls) {
    const res = await getS3ObjectForProxy(u)
    console.log(`URL: ${u} -> Found: ${Boolean(res?.body)} (${res?.body?.byteLength} bytes)`)
  }
}

run().catch(console.error)
