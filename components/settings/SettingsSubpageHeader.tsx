import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

type Props = {
  title: string
  description?: string
}

export default function SettingsSubpageHeader({ title, description }: Props) {
  return (
    <div>
      <Link
        href="/dashboard/ajustes"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        Volver a Ajustes
      </Link>
      <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
      {description && <p className="text-text-muted mt-1 text-sm">{description}</p>}
    </div>
  )
}
