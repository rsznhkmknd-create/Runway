import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HomePage() {
  const { userId } = auth()

  if (userId) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <span className="font-semibold text-gray-900 text-lg">Runway</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/sign-up"
            className="text-sm font-semibold bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
          >
            Empezar gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-sm font-medium px-4 py-1.5 rounded-full border border-brand-200 mb-8">
          <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
          Para startups y PYMEs en España y LATAM
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
          Tu copiloto{' '}
          <span className="text-brand-600">financiero</span>{' '}
          en tiempo real
        </h1>

        <p className="text-xl text-gray-500 mb-10 max-w-2xl">
          Visualiza tu runway, controla el burn rate y gestiona cuentas por cobrar desde un solo
          dashboard. Sin hojas de cálculo.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/sign-up"
            className="bg-brand-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-brand-700 transition-colors text-base"
          >
            Crear cuenta gratis
          </Link>
          <Link
            href="/sign-in"
            className="border border-gray-200 text-gray-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-base"
          >
            Ver demo
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-3 gap-8 border-t border-gray-100 pt-12 w-full max-w-lg">
          {[
            { value: '+500', label: 'Empresas activas' },
            { value: '€2B+', label: 'Flujo gestionado' },
            { value: '4.9★', label: 'Valoración media' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
