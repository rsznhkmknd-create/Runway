import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// ── Rutas públicas (sin sesión) ────────────────────────────────────────────
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

// ── Rutas del onboarding (no redirigir al wizard si ya estás en él) ────────
const isOnboardingRoute = createRouteMatcher([
  '/onboarding(.*)',
  '/team-onboarding(.*)',
])

// ── Rutas del dashboard (requieren onboarding completado) ──────────────────
const isDashboardRoute = createRouteMatcher(['/dashboard(.*)'])

/**
 * Cookie que se establece al completar el onboarding.
 * Permite que el middleware redirija sin llamar a Supabase (Edge Runtime).
 */
export const ONBOARDING_COOKIE = 'runway_onboarded'

export default clerkMiddleware((auth, request) => {
  const { userId } = auth()

  // 1. Rutas públicas → siempre accesibles
  if (isPublicRoute(request)) return NextResponse.next()

  // 2. Sin sesión en ruta protegida → sign-in
  if (!userId) {
    const signInUrl = request.nextUrl.clone()
    signInUrl.pathname = '/sign-in'
    return NextResponse.redirect(signInUrl)
  }

  const onboardingDone =
    request.cookies.get(ONBOARDING_COOKIE)?.value === '1'

  // 3. Usuario autenticado en ruta de dashboard sin haber completado el
  //    onboarding → redirigir al wizard
  if (isDashboardRoute(request) && !onboardingDone) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  // 4. Usuario autenticado en ruta de onboarding que YA lo completó
  //    → redirigir al dashboard
  if (isOnboardingRoute(request) && onboardingDone) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
