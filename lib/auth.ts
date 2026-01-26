import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'bw_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

/**
 * Verify the dashboard password
 */
export function verifyPassword(password: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD
  if (!expected) {
    console.error('DASHBOARD_PASSWORD not configured')
    return false
  }
  return password === expected
}

/**
 * Create a session cookie value
 * In Phase 1, this is just a simple token
 * Phase 2 would use a proper JWT or session store
 */
export function createSessionToken(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2)
  return Buffer.from(`${timestamp}:${random}`).toString('base64')
}

/**
 * Set the session cookie
 */
export async function setSessionCookie(response: NextResponse): Promise<void> {
  const token = createSessionToken()
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

/**
 * Check if the request has a valid session
 */
export function hasValidSession(request: NextRequest): boolean {
  const cookie = request.cookies.get(COOKIE_NAME)
  return !!cookie?.value
}

/**
 * Check if session exists (for server components)
 */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE_NAME)
  return !!session?.value
}
