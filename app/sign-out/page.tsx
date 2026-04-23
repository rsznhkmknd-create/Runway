'use client'

import { useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SignOutPage() {
  const { signOut } = useClerk()
  const router = useRouter()

  useEffect(() => {
    signOut(() => router.push('/sign-in'))
  }, [signOut, router])

  return (
    <div className="min-h-screen bg-surface-2 flex items-center justify-center">
      <p className="text-text-muted text-sm">Cerrando sesión...</p>
    </div>
  )
}
