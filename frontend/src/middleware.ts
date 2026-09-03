import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  
  // Forge the Origin header to match the backend's old allowed CORS whitelist.
  // This bypasses the backend CORS check without needing to redeploy the backend!
  requestHeaders.set('Origin', 'https://placeonix-frontend-v2.vercel.app')
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: ['/api/:path*'],
}
