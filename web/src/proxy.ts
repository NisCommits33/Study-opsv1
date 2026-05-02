/**
 * @file proxy.ts
 * @description Authentication and Route Authorization Proxy.
 * This module intercepts incoming requests to manage Supabase sessions,
 * refresh tokens, and enforce Row Level Security (RLS) context at the edge.
 * 
 * @author Study Ops Engineering
 * @version 1.0.0
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Main proxy handler for authentication and route protection.
 * 
 * @param {NextRequest} request - The incoming Next.js request object.
 * @returns {Promise<NextResponse>} The modified response or redirection.
 * 
 * @example
 * // Protected route logic
 * if (isProtectedRoute && !user) return redirect('/login')
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  /**
   * Initialize Supabase Server Client with cookie handling.
   * This ensures the session is synced between the browser and the server.
   */
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  /**
   * Retrieve the current user session.
   * This is a critical security check performed on every protected request.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser()

  /**
   * Route Protection Logic
   * Defines which paths require an active user session.
   */
  const protectedRoutes = [
    '/dashboard',
    '/deadlines',
    '/schedule',
    '/timer',
    '/sessions',
    '/subjects',
    '/exam',
    '/interview',
    '/onboarding',
    '/capture',
    '/simulator',
    '/archive',
    '/settings'
  ]

  const isProtectedRoute = protectedRoutes.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  // Redirect to login if accessing a protected route without a session
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Prevent logged-in users from accessing the login page
  if (request.nextUrl.pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

/**
 * Next.js Middleware configuration.
 * Defines which routes the proxy should intercept.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
