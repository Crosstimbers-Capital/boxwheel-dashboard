import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, createSessionToken } from '@/lib/auth'

const COOKIE_NAME = 'bw_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    if (!verifyPassword(password)) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Create response with session cookie
    const response = NextResponse.json({ success: true })

    response.cookies.set(COOKIE_NAME, createSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
