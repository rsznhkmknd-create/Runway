import { SignIn } from '@clerk/nextjs'
import { Clock } from 'lucide-react'
import FinsightLogo from '@/components/ui/FinsightLogo'

type Props = {
  searchParams: { expired?: string }
}

export default function SignInPage({ searchParams }: Props) {
  const expired = searchParams.expired === '1'

  return (
    <div className="min-h-screen bg-surface-2 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <FinsightLogo size={36} />
            <span className="font-semibold text-text-primary text-xl">Finsight</span>
          </div>
          <p className="text-text-muted text-sm">Accede a tu dashboard financiero</p>
        </div>

        {expired && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3"
          >
            <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              Tu sesión expiró. Inicia sesión de nuevo para continuar.
            </p>
          </div>
        )}

        <SignIn
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'shadow-sm border border-border rounded-2xl',
              headerTitle: 'text-text-primary font-semibold',
              formButtonPrimary:
                'bg-brand-600 hover:bg-brand-700 text-white font-semibold',
              footerActionLink: 'text-brand-600 hover:text-brand-700 font-medium',
            },
          }}
        />
      </div>
    </div>
  )
}
