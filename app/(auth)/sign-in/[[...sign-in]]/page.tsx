import { SignIn } from '@clerk/nextjs'
import { Clock } from 'lucide-react'
import FinsightLogo from '@/components/ui/FinsightLogo'

type Props = {
  searchParams: { expired?: string }
}

export default function SignInPage({ searchParams }: Props) {
  const expired = searchParams.expired === '1'

  return (
    <div className="min-h-screen bg-[#111827] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header — logo + título */}
        <div className="flex flex-col items-center text-center mb-8">
          <FinsightLogo size={52} />
          <h1 className="mt-5 text-2xl font-bold tracking-tight">Bienvenido a Finsight</h1>
          <p className="mt-1.5 text-sm text-white/60">Tu CFO digital</p>
        </div>

        {expired && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3"
          >
            <Clock className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-100">
              Tu sesión expiró. Inicia sesión de nuevo para continuar.
            </p>
          </div>
        )}

        <SignIn
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

        {/* Link secundario a landing */}
        <p className="mt-6 text-center text-xs text-white/40">
          <a href="/" className="hover:text-white/70 transition-colors">
            ← Volver al inicio
          </a>
        </p>
      </div>
    </div>
  )
}
