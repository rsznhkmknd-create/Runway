import {
  TrendingUp,
  FileSpreadsheet,
  Sparkles,
  FileBarChart,
  Zap,
  Bell,
  type LucideIcon,
} from 'lucide-react'
import { Marquee } from './marquee'
import { BlurFade } from './blur-fade'

type Feature = {
  icon: LucideIcon
  title: string
  description: string
}

const FEATURES: Feature[] = [
  {
    icon: TrendingUp,
    title: 'Runway en tiempo real',
    description: 'Burn rate, runway y cash balance calculados automáticamente a partir de tus transacciones.',
  },
  {
    icon: Sparkles,
    title: 'Extracción de facturas con IA',
    description: 'Sube un PDF o una foto y Claude extrae cliente, importe, moneda y vencimiento en segundos.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Importación automática de Excel',
    description: 'Detecta cabeceras, mapea columnas e infiere categorías aunque tu archivo tenga cualquier formato.',
  },
  {
    icon: FileBarChart,
    title: 'Reportes CFO semanales',
    description: 'Resúmenes ejecutivos, tendencias, alertas y recomendaciones accionables generadas por IA.',
  },
  {
    icon: Zap,
    title: 'Insights diarios',
    description: 'Cada mañana, 3 insights concretos: qué cambió, qué vigilar, qué hacer hoy.',
  },
  {
    icon: Bell,
    title: 'Alertas proactivas',
    description: 'Avisos cuando el runway baja, facturas vencen o los gastos suben más de la cuenta.',
  },
]

function FeatureCard({ feature }: { feature: Feature }) {
  const { icon: Icon, title, description } = feature
  return (
    <div className="w-[340px] sm:w-[380px] shrink-0 rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.035] to-white/[0.01] p-6 transition-colors hover:border-[#00C48C]/25">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[#00C48C]/12 border border-[#00C48C]/18 flex items-center justify-center text-[#00C48C]">
          <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
        </div>
        <h3 className="font-semibold text-[15px] tracking-tight text-white">{title}</h3>
      </div>
      <p className="text-[13.5px] text-white/55 leading-[1.55]">{description}</p>
    </div>
  )
}

export function FeaturesMarquee() {
  return (
    <section id="features" className="py-24 sm:py-32 border-t border-white/[0.06] relative">
      <div className="max-w-6xl mx-auto px-6 mb-14 text-center">
        <BlurFade inView delay={0}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00C48C] mb-4">
            Qué hace Finsight
          </p>
        </BlurFade>
        <BlurFade inView delay={100}>
          <h2 className="text-[34px] sm:text-[44px] font-semibold tracking-[-0.025em] leading-[1.05] text-white max-w-[620px] mx-auto">
            Todo lo que necesitas para entender tu caja
          </h2>
        </BlurFade>
        <BlurFade inView delay={200}>
          <p className="mt-5 text-[16px] text-white/55 max-w-[540px] mx-auto leading-relaxed">
            Seis funciones construidas alrededor de una pregunta:
            cuánto tiempo me queda y qué hago con él.
          </p>
        </BlurFade>
      </div>

      <BlurFade inView delay={320} className="relative">
        {/* Edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-28 sm:w-40 z-10 bg-gradient-to-r from-[#111827] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-28 sm:w-40 z-10 bg-gradient-to-l from-[#111827] to-transparent" />

        <Marquee duration={48} gap={1.25}>
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </Marquee>
        <div className="h-5" />
        <Marquee duration={60} reverse gap={1.25}>
          {FEATURES.slice().reverse().map((f) => (
            <FeatureCard key={`r-${f.title}`} feature={f} />
          ))}
        </Marquee>
      </BlurFade>
    </section>
  )
}
