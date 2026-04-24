import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BlurFade } from './blur-fade'
import FinsightLogo from '@/components/ui/FinsightLogo'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient glow — subtle, Linear-ish */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[640px]">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-[#00C48C]/10 blur-[120px]" />
        <div className="absolute left-1/2 top-40 -translate-x-1/2 h-[340px] w-[640px] rounded-full bg-[#00C48C]/[0.07] blur-[100px]" />
      </div>

      {/* Grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at top, black 40%, transparent 75%)',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-28 sm:pt-32 sm:pb-36 text-center">
        <BlurFade delay={0}>
          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-[12px] font-medium text-white/70">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#00C48C] opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00C48C]" />
              </span>
              Analizado por Claude · Actualizado a diario
            </div>
          </div>
        </BlurFade>

        <BlurFade delay={120}>
          <h1 className="text-[44px] sm:text-6xl md:text-[72px] font-semibold tracking-[-0.035em] leading-[0.98] text-white">
            Tu CFO digital,
            <br />
            <span className="bg-gradient-to-r from-[#00C48C] via-[#2ed087] to-[#00C48C] bg-clip-text text-transparent">
              a €29 al mes.
            </span>
          </h1>
        </BlurFade>

        <BlurFade delay={280}>
          <p className="mt-7 text-[17px] sm:text-[19px] text-white/55 max-w-[560px] mx-auto leading-[1.55] font-normal">
            Runway, burn rate, facturas e insights en un solo sitio.
            Claude analiza tus números cada día para que tomes decisiones
            con la cabeza clara.
          </p>
        </BlurFade>

        <BlurFade delay={440}>
          <div className="mt-11 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/sign-up"
              className="group inline-flex items-center gap-2 bg-[#00C48C] hover:bg-[#00a374] text-[#07160E] font-semibold px-6 py-3.5 rounded-xl transition-all text-[14px] shadow-[0_10px_40px_-10px_rgba(0,196,140,0.55)]"
            >
              Empezar gratis 30 días
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#features"
              className="text-[14px] font-medium text-white/75 hover:text-white transition-colors px-5 py-3.5 rounded-xl border border-white/[0.08] hover:border-white/15 bg-white/[0.02]"
            >
              Ver cómo funciona
            </Link>
          </div>
        </BlurFade>

        <BlurFade delay={600}>
          <p className="mt-7 text-[12px] text-white/35 tracking-wide">
            Sin tarjeta · Cancela cuando quieras · Datos cifrados
          </p>
        </BlurFade>

        <BlurFade delay={780}>
          <div className="mt-20 flex justify-center">
            <FinsightLogo size={44} />
          </div>
        </BlurFade>
      </div>
    </section>
  )
}
