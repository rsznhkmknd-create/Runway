import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">R</span>
            </div>
            <span className="font-semibold text-gray-900 text-xl">Runway</span>
          </div>
          <p className="text-gray-500 text-sm">Crea tu cuenta — es gratis</p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'shadow-sm border border-gray-200 rounded-2xl',
              headerTitle: 'text-gray-900 font-semibold',
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
