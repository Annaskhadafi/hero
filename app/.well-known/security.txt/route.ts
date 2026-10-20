import { NextResponse } from 'next/server'

const SECURITY_TXT_CONTENT = `Contact: mailto:ict@chitraparatama.com
Contact: mailto:security@chitraparatama.com
Expires: 2027-12-31T23:59:59.000Z
Preferred-Languages: en, id
Canonical: https://hero.chitraparatama.com/.well-known/security.txt
Policy: https://hero.chitraparatama.com/security
`

export async function GET() {
  return new NextResponse(SECURITY_TXT_CONTENT, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
