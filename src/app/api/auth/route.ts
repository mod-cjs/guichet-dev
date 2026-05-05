import { NextResponse } from 'next/server'

// Routes dédiées : /api/auth/login et /api/auth/logout
export function GET() {
  return NextResponse.redirect('/api/auth/login', { status: 301 })
}
