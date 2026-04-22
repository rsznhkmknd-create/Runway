import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Rutas públicas — nunca requieren autenticación
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sign-out',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  // Rutas públicas → pasar siempre, sin verificar sesión
  if (isPublicRoute(request)) return NextResponse.next()

  // Ruta protegida sin sesión → redirigir a /sign-in
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  // Autenticado → pasar.
  // La lógica de onboarding (verificar onboarding_completed en Supabase)
  // se maneja en los layouts de servidor:
  //   - app/(dashboard)/layout.tsx  → si !onboarding_completed, redirect /onboarding
  //   - app/(onboarding)/layout.tsx → si onboarding_completed,  redirect /dashboard
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Ejecutar middleware en todo EXCEPTO:
    // _next/static, _next/image, archivos estáticos con extensión, y /api/webhooks
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|css|js)$|api/webhooks).*)',
  ],
}
