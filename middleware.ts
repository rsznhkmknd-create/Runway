import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// ── Regla 1: Rutas públicas — nunca requieren autenticación ──────────────────
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

// ── Rutas de onboarding ───────────────────────────────────────────────────────
const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)'])

// ── Consulta Supabase con service role (Edge Runtime compatible) ──────────────
// Nota: esto hace una llamada a la BD en cada request protegida.
// Si el rendimiento fuera crítico, se podría añadir un cookie-cache de corta duración.
async function getOnboardingCompleted(clerkId: string): Promise<boolean> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('clerk_id', clerkId)
      .single()

    return data?.onboarding_completed === true
  } catch {
    // En caso de error de red o BD, tratar como no completado (enviar a onboarding)
    return false
  }
}

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl

  // ── Regla 1: Rutas públicas → siempre pasar sin verificar sesión ─────────
  if (isPublicRoute(request)) {
    return NextResponse.next()
  }

  const { userId } = await auth()

  // ── Regla 2: Ruta protegida sin sesión → redirigir a /sign-in ────────────
  if (!userId) {
    // Anti-loop: no redirigir si ya estamos en /sign-in
    if (pathname === '/sign-in') return NextResponse.next()
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  // ── Usuario autenticado: consultar onboarding_completed en Supabase ───────
  const onboardingCompleted = await getOnboardingCompleted(userId)

  // ── Regla 3: Autenticado + onboarding incompleto → redirigir a /onboarding
  //    EXCEPCIÓN: si ya está en /onboarding, no redirigir nunca ────────────
  if (!onboardingCompleted && !isOnboardingRoute(request)) {
    // Anti-loop: verificar que el destino es distinto a la ruta actual
    if (pathname !== '/onboarding') {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  // ── Regla 4: Autenticado + onboarding completado + en /onboarding
  //    → redirigir a /dashboard ────────────────────────────────────────────
  if (onboardingCompleted && isOnboardingRoute(request)) {
    // Anti-loop: verificar que el destino es distinto a la ruta actual
    if (pathname !== '/dashboard') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Ejecutar middleware en todas las rutas EXCEPTO:
     * - _next/static y _next/image  (assets de Next.js)
     * - favicon.ico y otros archivos con extensión estática
     * - /api/webhooks                (webhooks de Clerk, sin auth)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|css|js)$|api/webhooks).*)',
  ],
}
