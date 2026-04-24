import Link from 'next/link'
import { Check } from 'lucide-react'
import { BlurFade } from './blur-fade'
import {
  PLAN_LABELS,
  PLAN_PRICING,
  PLAN_DESCRIPTIONS,
  PLAN_ORDER,
} from '@/lib/plans'

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

export function PricingSection() {
  return (
    <section id="precios" className="py-24 sm:py-32 border-t border-white/[0.06] relative">
      {/* subtle mint glow bleed */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[420px] w-[720px] rounded-full bg-[#00C48C]/[0.05] blur-[110px]"
      />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mb-14 text-center mx-auto">
          <BlurFade inView delay={0}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00C48C] mb-4">
              Precios
            </p>
          </BlurFade>
          <BlurFade inView delay={100}>
            <h2 className="text-[34px] sm:text-[44px] font-semibold tracking-[-0.025em] leading-[1.05] text-white">
              Elige el plan que se adapta a tu negocio
            </h2>
          </BlurFade>
          <BlurFade inView delay={200}>
            <p className="mt-5 text-[16px] text-white/55 leading-relaxed">
              Todos los planes incluyen 30 días gratis. Sin permanencia.
            </p>
          </BlurFade>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {PLAN_ORDER.map((plan, idx) => {
            const featured = plan === 'growth'
            return (
              <BlurFade inView delay={idx * 120} key={plan} className="h-full">
                <div
                  className={
                    featured
                      ? 'relative h-full rounded-2xl border border-[#00C48C]/40 bg-gradient-to-b from-[#00C48C]/[0.06] to-[#00C48C]/[0.015] p-7 flex flex-col shadow-[0_0_0_1px_rgba(0,196,140,0.15),0_20px_60px_-20px_rgba(0,196,140,0.35)]'
                      : 'relative h-full rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 flex flex-col'
                  }
                >
                  {featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00C48C] text-[#07160E] text-[10px] font-bold uppercase tracking-[0.12em] px-3 py-1 rounded-full">
                      Más popular
                    </span>
                  )}

                  <div className="mb-6">
                    <p className="text-[14px] font-semibold text-white tracking-tight">
                      {PLAN_LABELS[plan]}
                    </p>
                    <p className="mt-1.5 text-[12.5px] text-white/45 leading-[1.5]">
                      {PLAN_DESCRIPTIONS[plan]}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1 mb-7">
                    <span className="text-[44px] font-semibold tracking-[-0.03em] text-white">
                      €{PLAN_PRICING[plan]}
                    </span>
                    <span className="text-[13px] text-white/45">/mes</span>
                  </div>

                  <ul className="space-y-3 text-[13.5px] text-white/75 mb-8 flex-1">
                    {PLAN_FEATURES[plan].map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5">
                        <span
                          className={
                            featured
                              ? 'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#00C48C]/20'
                              : 'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/[0.06]'
                          }
                        >
                          <Check className="w-2.5 h-2.5 text-[#00C48C]" strokeWidth={3.5} />
                        </span>
                        <span className="leading-[1.5]">{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/sign-up"
                    className={
                      featured
                        ? 'block text-center text-[13.5px] font-semibold bg-[#00C48C] hover:bg-[#00a374] text-[#07160E] px-5 py-3 rounded-xl transition-colors'
                        : 'block text-center text-[13.5px] font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white px-5 py-3 rounded-xl transition-colors'
                    }
                  >
                    Empezar con {PLAN_LABELS[plan]}
                  </Link>
                </div>
              </BlurFade>
            )
          })}
        </div>
      </div>
    </section>
  )
}
