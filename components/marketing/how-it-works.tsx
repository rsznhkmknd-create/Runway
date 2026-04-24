import { FileSpreadsheet, Brain, LineChart, type LucideIcon } from 'lucide-react'
import { BlurFade } from './blur-fade'

type Step = {
  n: string
  icon: LucideIcon
  title: string
  description: string
}

const STEPS: Step[] = [
  {
    n: '01',
    icon: FileSpreadsheet,
    title: 'Importa tu Excel o conecta tu banco',
    description:
      'Sube un archivo .xlsx o .csv — Finsight detecta cabeceras, mapea columnas e infiere categorías aunque tu archivo sea un caos.',
  },
  {
    n: '02',
    icon: Brain,
    title: 'La IA analiza tus datos automáticamente',
    description:
      'Claude calcula runway, burn rate, cash balance y detecta patrones. Cada mañana te entrega 3 insights concretos.',
  },
  {
    n: '03',
    icon: LineChart,
    title: 'Toma decisiones con claridad',
    description:
      'Dashboard limpio, alertas proactivas y reportes CFO semanales. Sin hojas de cálculo ni consultores caros.',
  },
]

export function HowItWorks() {
  return (
    <section className="py-24 sm:py-32 border-t border-white/[0.06] relative overflow-hidden">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[320px] w-[560px] rounded-full bg-[#00C48C]/[0.04] blur-[120px]"
      />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mb-16 text-center mx-auto">
          <BlurFade inView delay={0}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00C48C] mb-4">
              Cómo funciona
            </p>
          </BlurFade>
          <BlurFade inView delay={100}>
            <h2 className="text-[34px] sm:text-[44px] font-semibold tracking-[-0.025em] leading-[1.05] text-white">
              De tus números a decisiones, en 3 pasos
            </h2>
          </BlurFade>
          <BlurFade inView delay={200}>
            <p className="mt-5 text-[16px] text-white/55 leading-relaxed">
              Sin configuraciones infinitas. Sin onboarding de 2 semanas.
            </p>
          </BlurFade>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {/* Connector lines — desktop only, hidden behind cards */}
          <div
            aria-hidden
            className="pointer-events-none hidden md:block absolute left-[16.67%] right-[16.67%] top-[44px] h-px"
            style={{
              background:
                'linear-gradient(to right, transparent 0%, rgba(0,196,140,0.25) 15%, rgba(0,196,140,0.45) 50%, rgba(0,196,140,0.25) 85%, transparent 100%)',
            }}
          />

          {STEPS.map((step, i) => {
            const { icon: Icon } = step
            return (
              <BlurFade inView delay={i * 160} key={step.n}>
                <div className="relative">
                  {/* Big step number */}
                  <div className="relative z-10 flex items-center justify-center">
                    <div className="relative w-[88px] h-[88px] rounded-2xl bg-[#111827] border border-[#00C48C]/25 flex items-center justify-center overflow-hidden shadow-[0_10px_40px_-15px_rgba(0,196,140,0.45)]">
                      {/* inner mint gradient */}
                      <div
                        aria-hidden
                        className="absolute inset-0 bg-gradient-to-br from-[#00C48C]/10 via-transparent to-transparent"
                      />
                      <span className="relative text-[34px] font-semibold tracking-[-0.03em] bg-gradient-to-b from-[#00C48C] to-[#00a374] bg-clip-text text-transparent">
                        {step.n}
                      </span>
                    </div>
                  </div>

                  {/* Card */}
                  <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#00C48C]/12 border border-[#00C48C]/20 text-[#00C48C] mb-4">
                      <Icon className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <h3 className="text-[16px] font-semibold tracking-tight text-white leading-snug mb-2">
                      {step.title}
                    </h3>
                    <p className="text-[13.5px] text-white/55 leading-[1.55]">
                      {step.description}
                    </p>
                  </div>
                </div>
              </BlurFade>
            )
          })}
        </div>
      </div>
    </section>
  )
}
