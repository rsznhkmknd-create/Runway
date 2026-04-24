import { SignUp } from '@clerk/nextjs'
import { TrendingUp, FileSpreadsheet, FileBarChart } from 'lucide-react'
import FinsightLogo from '@/components/ui/FinsightLogo'

const BENEFITS = [
  {
    icon: TrendingUp,
    text: 'Conoce tu runway en tiempo real',
  },
  {
    icon: FileSpreadsheet,
    text: 'Importa cualquier Excel automáticamente',
  },
  {
    icon: FileBarChart,
    text: 'Reportes tipo CFO cada semana',
  },
]

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#111827] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header — logo + título */}
        <div className="flex flex-col items-center text-center mb-8">
          <FinsightLogo size={52} />
          <h1 className="mt-5 text-2xl font-bold tracking-tight">Bienvenido a Finsight</h1>
          <p className="mt-1.5 text-sm text-white/60">Tu CFO digital</p>
        </div>

        <SignUp
          forceRedirectUrl="/onboarding"
          appearance={{
            variables: {
              colorPrimary: '#00C48C',
              colorBackground: 'transparent',
              colorText: '#ffffff',
              colorTextSecondary: 'rgba(255,255,255,0.6)',
              colorInputBackground: 'rgba(255,255,255,0.04)',
              colorInputText: '#ffffff',
              colorDanger: '#f87171',
              colorSuccess: '#00C48C',
              borderRadius: '0.75rem',
              fontFamily: 'inherit',
            },
            elements: {
              rootBox: 'w-full',
              card:
                'bg-white/[0.03] border border-white/10 rounded-2xl shadow-xl shadow-black/20 backdrop-blur-sm',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              socialButtonsBlockButton:
                'bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-white',
              socialButtonsBlockButtonText: 'text-white font-medium',
              dividerLine: 'bg-white/10',
              dividerText: 'text-white/40',
              formFieldLabel: 'text-white/70 font-medium',
              formFieldInput:
                'bg-white/[0.04] border border-white/10 text-white placeholder:text-white/30 focus:border-brand-500 focus:ring-brand-500/20',
              formButtonPrimary:
                'bg-brand-600 hover:bg-brand-700 text-white font-semibold normal-case tracking-normal',
              footer: 'bg-transparent',
              footerAction: 'text-white/60',
              footerActionText: 'text-white/60',
              footerActionLink: 'text-brand-400 hover:text-brand-300 font-medium',
              identityPreview: 'bg-white/[0.04] border border-white/10',
              identityPreviewText: 'text-white',
              formFieldSuccessText: 'text-brand-400',
              formFieldErrorText: 'text-red-400',
            },
          }}
        />

        {/* Beneficios concretos debajo del formulario */}
        <ul className="mt-8 space-y-3">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="shrink-0 w-8 h-8 rounded-lg bg-brand-600/15 border border-brand-500/20 flex items-center justify-center text-brand-400">
                <Icon className="w-4 h-4" strokeWidth={2} />
              </span>
              <span className="text-sm text-white/80 leading-relaxed pt-1">{text}</span>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-center text-xs text-white/40">
          <a href="/" className="hover:text-white/70 transition-colors">
            ← Volver al inicio
          </a>
        </p>
      </div>
    </div>
  )
}
