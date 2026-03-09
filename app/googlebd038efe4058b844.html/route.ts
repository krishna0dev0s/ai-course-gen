import { NextResponse } from 'next/server'

export function GET() {
  return new NextResponse('google-site-verification: googlebd038efe4058b844.html', {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
