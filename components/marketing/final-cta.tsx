import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BlurFade } from './blur-fade'

export function FinalCTA() {
  return (
    <section className="py-24 sm:py-32 border-t border-white/[0.06] relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-[360px]"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,196,140,0.12), rgba(0,196,140,0.03) 40%, transparent 70%)',
        }}
      />
      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <BlurFade inView delay={0}>
          <h2 className="text-[36px] sm:text-[48px] font-semibold tracking-[-0.03em] leading-[1.05] text-white">
            Deja las hojas de cálculo.
            <br />
            <span className="bg-gradient-to-r from-[#00C48C] to-[#2ed087] bg-clip-text text-transparent">
              Recupera el control de tu caja.
            </span>
          </h2>
        </BlurFade>
        <BlurFade inView delay={150}>
          <p className="mt-6 text-[17px] text-white/55 leading-relaxed max-w-[520px] mx-auto">
            Crea tu cuenta en menos de un minuto y empieza a ver tu runway esta misma tarde.
          </p>
        </BlurFade>
        <BlurFade inView delay={300}>
          <div className="mt-10">
            <Link
              href="/sign-up"
              className="group relative inline-flex items-center gap-2 overflow-hidden bg-[#00C48C] hover:bg-[#00a374] text-[#07160E] font-semibold px-6 py-3.5 rounded-xl transition-all duration-200 text-[14px] shadow-[0_10px_40px_-10px_rgba(0,196,140,0.55)] hover:shadow-[0_14px_50px_-8px_rgba(0,196,140,0.7)] active:scale-[0.97]"
            >
              {/* Shimmer — sweeps across on hover */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  background:
                    'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.55) 50%, transparent 75%)',
                }}
              />
              <span className="relative z-10">Empezar gratis 30 días</span>
              <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}
