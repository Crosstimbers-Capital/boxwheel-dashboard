import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { hasValidSession } from '@/lib/auth'

/**
 * Authentication middleware
 * Redirects unauthenticated users to login page
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow access to login page and API auth routes
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Allow static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check for valid session
  if (!hasValidSession(request)) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
