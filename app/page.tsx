import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  TrendingUp,
  FileSpreadsheet,
  Sparkles,
  FileBarChart,
  Zap,
  Bell,
  Check,
  ArrowRight,
} from 'lucide-react'
import FinsightLogo from '@/components/ui/FinsightLogo'
import { PLAN_LABELS, PLAN_PRICING, PLAN_DESCRIPTIONS, PLAN_ORDER } from '@/lib/plans'

const FEATURES = [
  {
    icon: TrendingUp,
    title: 'Runway en tiempo real',
    description:
      'Burn rate, runway y cash balance calculados automáticamente a partir de tus transacciones.',
  },
  {
    icon: Sparkles,
    title: 'Extracción de facturas con IA',
    description:
      'Sube un PDF o una foto y Claude extrae cliente, importe, moneda y vencimiento en segundos.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Importación automática de Excel',
    description:
      'Detecta cabeceras, mapea columnas e infiere categorías aunque tu archivo tenga cualquier formato.',
  },
  {
    icon: FileBarChart,
    title: 'Reportes CFO semanales y mensuales',
    description:
      'Resúmenes ejecutivos, tendencias, alertas y recomendaciones accionables generadas por IA.',
  },
  {
    icon: Zap,
    title: 'Insights diarios personalizados',
    description:
      'Cada mañana, 3 insights concretos sobre tu negocio: qué cambió, qué vigilar, qué hacer.',
  },
  {
    icon: Bell,
    title: 'Alertas proactivas',
    description:
      'Avisos cuando el runway baja, facturas vencen o los gastos suben más de la cuenta.',
  },
]

const PLAN_FEATURES: Record<(typeof PLAN_ORDER)[number], string[]> = {
  starter: [
    'Dashboard de runway y burn rate',
    'Extracción de facturas con IA',
    'Reportes semanales y mensuales',
    'Soporte por email',
  ],
  growth: [
    'Todo lo de Starter',
    'Insights diarios personalizados',
    'Alertas proactivas',
    'Exportación avanzada',
  ],
  pro: [
    'Todo lo de Growth',
    'Uso ilimitado',
    'Reportes personalizados con IA',
    'Soporte prioritario',
  ],
}

export default async function HomePage() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-[#111827] text-white font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-30 backdrop-blur-md bg-[#111827]/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <FinsightLogo size={28} />
            <span className="font-semibold text-lg tracking-tight">Finsight</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-5">
            <Link
              href="#precios"
              className="hidden sm:inline text-sm font-medium text-white/60 hover:text-white transition-colors"
            >
              Precios
            </Link>
            <Link
              href="/sign-in"
              className="text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/sign-up"
              className="text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Glow sutil */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-brand-600/10 via-brand-600/5 to-transparent blur-3xl pointer-events-none"
        />
        <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center">
          <div className="flex justify-center mb-8">
            <FinsightLogo size={56} />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
            Tu CFO digital
            <br />
            <span className="text-brand-500">por €29/mes</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            Runway, burn rate, facturas e insights en un solo sitio. Claude analiza tus números
            cada día para que tomes decisiones con la cabeza clara.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-base shadow-lg shadow-brand-600/20"
            >
              Empezar gratis 30 días
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#features"
              className="text-sm font-medium text-white/70 hover:text-white transition-colors px-4 py-3"
            >
              Ver cómo funciona
            </Link>
          </div>

          <p className="mt-6 text-xs text-white/40">
            Sin tarjeta · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-400 mb-3">
              Qué hace Finsight
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Todo lo que necesitas para entender tu caja
            </h2>
            <p className="mt-4 text-white/60 text-lg leading-relaxed">
              Seis funciones construidas alrededor de una pregunta: ¿cuánto tiempo me queda y qué
              hago con él?
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="bg-[#111827] p-6 sm:p-8 hover:bg-white/[0.02] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-600/15 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-5">
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </div>
                <h3 className="font-semibold text-base mb-2">{title}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precios" className="py-20 sm:py-28 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-14 text-center mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-400 mb-3">
              Precios
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Elige el plan que se adapta a tu negocio
            </h2>
            <p className="mt-4 text-white/60 text-lg leading-relaxed">
              Todos los planes incluyen 30 días gratis. Sin permanencia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {PLAN_ORDER.map((plan, idx) => {
              const featured = plan === 'growth'
              return (
                <div
                  key={plan}
                  className={
                    featured
                      ? 'relative rounded-2xl border border-brand-500/40 bg-brand-600/[0.04] p-7 flex flex-col'
                      : 'relative rounded-2xl border border-white/10 bg-white/[0.02] p-7 flex flex-col'
                  }
                >
                  {featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      Más popular
                    </span>
                  )}

                  <div className="mb-5">
                    <p className="text-sm font-semibold text-white">{PLAN_LABELS[plan]}</p>
                    <p className="mt-1 text-xs text-white/50 leading-relaxed">
                      {PLAN_DESCRIPTIONS[plan]}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-extrabold tracking-tight">
                      {PLAN_PRICING[plan]}€
                    </span>
                    <span className="text-sm text-white/50">/mes</span>
                  </div>

                  <ul className="space-y-2.5 text-sm text-white/75 mb-7 flex-1">
                    {PLAN_FEATURES[plan].map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/sign-up"
                    className={
                      featured
                        ? 'block text-center text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white px-5 py-3 rounded-xl transition-colors'
                        : 'block text-center text-sm font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-3 rounded-xl transition-colors'
                    }
                  >
                    Empezar con {PLAN_LABELS[plan]}
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 sm:py-28 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Deja las hojas de cálculo.
            <br />
            <span className="text-brand-500">Recupera el control de tu caja.</span>
          </h2>
          <p className="mt-5 text-white/60 text-lg leading-relaxed">
            Crea tu cuenta en menos de un minuto y empieza a ver tu runway esta misma tarde.
          </p>
          <div className="mt-9">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-base shadow-lg shadow-brand-600/20"
            >
              Empezar gratis 30 días
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <FinsightLogo size={22} />
            <span className="font-semibold text-sm">Finsight</span>
          </div>
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Finsight · Tu CFO digital
          </p>
        </div>
      </footer>
    </main>
  )
}
