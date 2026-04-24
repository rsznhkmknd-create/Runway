import Link from 'next/link'
import FinsightLogo from '@/components/ui/FinsightLogo'

type LinkItem = {
  label: string
  href: string
  soon?: boolean
  external?: boolean
}

type Column = {
  title: string
  links: LinkItem[]
}

const COLUMNS: Column[] = [
  {
    title: 'Producto',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Precios', href: '#precios' },
      { label: 'Blog', href: '#', soon: true },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Iniciar sesión', href: '/sign-in' },
      { label: 'Crear cuenta', href: '/sign-up' },
      { label: 'Contacto', href: 'mailto:hola@finsight.app', external: true },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacidad', href: '/privacidad' },
      { label: 'Términos', href: '/terminos' },
    ],
  },
]

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/[0.06] pt-14 pb-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-8">
          {/* Brand column */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5">
              <FinsightLogo size={22} />
              <span className="font-semibold text-[14px] text-white tracking-tight">Finsight</span>
            </div>
            <p className="mt-4 text-[13px] text-white/45 leading-relaxed max-w-[300px]">
              Tu copiloto financiero. Runway, burn rate e insights analizados por IA cada día.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#00C48C]/20 bg-[#00C48C]/5 px-2.5 py-1 text-[11px] font-medium text-[#00C48C]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#00C48C] opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00C48C]" />
              </span>
              Disponible en beta
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40 mb-4">
                {col.title}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((link) =>
                  link.soon ? (
                    <li key={link.label}>
                      <span className="inline-flex items-center gap-1.5 text-[13px] text-white/35 cursor-not-allowed">
                        {link.label}
                        <span className="rounded-full bg-white/[0.05] border border-white/[0.07] px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-white/50">
                          pronto
                        </span>
                      </span>
                    </li>
                  ) : (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[13px] text-white/55 hover:text-white transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-white/40">
            © {new Date().getFullYear()} Finsight · Tu CFO digital
          </p>
          <p className="text-[11px] text-white/30 tracking-wide">
            Hecho con cariño en España · Datos cifrados · EU-first
          </p>
        </div>
      </div>
    </footer>
  )
}
