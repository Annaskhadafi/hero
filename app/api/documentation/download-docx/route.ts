import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getServerSession } from '@/lib/auth-session'

export async function GET() {
  const session = await getServerSession()

  if (!session?.user) {
    return new NextResponse('Unauthorized: Please login to download documentation.', {
      status: 401,
    })
  }

  // Priority paths to find the docx
  const possiblePaths = [
    path.join(process.cwd(), 'public', 'downloads', 'HERO_System_Blueprint_Handover.docx'),
    'D:\\HERO_System_Blueprint_Handover.docx',
    'D:\\Blueprint Integrated Marketing Tools.docx',
  ]

  let filePath = ''
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p
      break
    }
  }

  if (!filePath) {
    return new NextResponse('Blueprint DOCX file not found on server.', { status: 404 })
  }

  const fileBuffer = fs.readFileSync(filePath)

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="HERO_System_Blueprint_Handover.docx"',
      'Content-Length': fileBuffer.length.toString(),
    },
  })
}
