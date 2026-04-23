'use client'

import { useState } from 'react'
import { User, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import ProfileForm from './ProfileForm'
import CompanyForm from './CompanyForm'

export type ProfileData = {
  id:           string
  email:        string
  full_name:    string | null
  company_name: string | null
  tax_id:       string | null
  address:      string | null
  city:         string | null
  country:      string | null
  currency:     string
  industry:     string | null
  website:      string | null
  logo_url:     string | null
  avatar_url:   string | null
}

type Tab = 'profile' | 'company'

type Props = {
  initialProfile: ProfileData
  email:          string
}

export default function SettingsTabs({ initialProfile, email }: Props) {
  const [tab, setTab] = useState<Tab>('profile')
  const [profile, setProfile] = useState<ProfileData>(initialProfile)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Tab bar */}
      <div role="tablist" className="flex gap-1 px-5 pt-4 border-b border-gray-100">
        <TabButton
          label="Mi perfil"
          Icon={User}
          active={tab === 'profile'}
          onClick={() => setTab('profile')}
        />
        <TabButton
          label="Mi empresa"
          Icon={Building2}
          active={tab === 'company'}
          onClick={() => setTab('company')}
        />
      </div>

      {/* Content */}
      <div className="p-6">
        {tab === 'profile' ? (
          <ProfileForm
            initial={profile}
            email={email}
            onChange={(next) => setProfile(next)}
          />
        ) : (
          <CompanyForm
            initial={profile}
            onChange={(next) => setProfile(next)}
          />
        )}
      </div>
    </div>
  )
}

function TabButton({
  label,
  Icon,
  active,
  onClick,
}: {
  label:   string
  Icon:    typeof User
  active:  boolean
  onClick: () => void
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors',
        active
          ? 'border-brand-600 text-brand-700'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}
