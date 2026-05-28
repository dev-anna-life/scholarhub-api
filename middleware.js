import { NextResponse } from 'next/server'

export default function middleware(req) {
  const origin = req.headers.get('origin') || ''
  const allowedOrigins = ['https://scholarhub-web.vercel.app', 'http://localhost:3000', 'http://localhost:5173', ...(origin ? [origin] : [])]

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  const response = NextResponse.next()
  if (allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  return response
}

export const config = {
  matcher: '/api/:path*',
}
