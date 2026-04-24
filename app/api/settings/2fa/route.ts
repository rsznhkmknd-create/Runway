import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/api/with-rate-limit'

export const GET = withRateLimit(async () => {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const client = await clerkClient()
  const user = await client.users.getUser(userId)

  return NextResponse.json({
    totpEnabled: Boolean(user.totpEnabled),
    backupCodeEnabled: Boolean(user.backupCodeEnabled),
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
  })
})
