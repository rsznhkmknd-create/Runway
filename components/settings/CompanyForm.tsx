'use client'

import { useMemo, useState } from 'react'
import { Loader2, Save, Globe } from 'lucide-react'
import { fetchJson, FetchJsonError } from '@/lib/fetch-json'
import { useToast } from '@/components/ui/Toast'
import ImageUploader from './ImageUploader'
import type { ProfileData } from './SettingsTabs'

type Props = {
  initial: ProfileData
  onChange: (next: ProfileData) => void
}

const COUNTRIES = [
  { value: 'espana',     label: '🇪🇸  España'    },
  { value: 'chile',      label: '🇨🇱  Chile'     },
  { value: 'mexico',     label: '🇲🇽  México'    },
  { value: 'colombia',   label: '🇨🇴  Colombia'  },
  { value: 'argentina',  label: '🇦🇷  Argentina' },
  { value: 'otro',       label: '🌍  Otro'       },
]

const CURRENCIES = [
  { value: 'EUR', label: 'EUR — Euro'            },
  { value: 'CLP', label: 'CLP — Peso chileno'    },
  { value: 'MXN', label: 'MXN — Peso mexicano'   },
  { value: 'COP', label: 'COP — Peso colombiano' },
  { value: 'ARS', label: 'ARS — Peso argentino'  },
]

const INDUSTRIES = [
  { value: 'tecnologia_saas', label: 'Tecnología / SaaS'        },
  { value: 'retail',          label: 'Retail / Comercio'         },
  { value: 'hosteleria',      label: 'Hostelería / Restauración' },
  { value: 'distribucion',    label: 'Distribución / Logística'  },
  { value: 'servicios',       label: 'Servicios profesionales'   },
  { value: 'construccion',    label: 'Construcción'              },
  { value: 'salud',           label: 'Salud'                     },
  { value: 'educacion',       label: 'Educación'                 },
  { value: 'otro',            label: 'Otro'                      },
]

type FormState = {
  company_name: string
  tax_id:       string
  address:      string
  city:         string
  country:      string
  currency:     string
  industry:     string
  website:      string
  logo_url:     string | null
}

function stateFromProfile(p: ProfileData): FormState {
  return {
    company_name: p.company_name ?? '',
    tax_id:       p.tax_id       ?? '',
    address:      p.address      ?? '',
    city:         p.city         ?? '',
    country:      p.country      ?? '',
    currency:     p.currency     || 'EUR',
    industry:     p.industry     ?? '',
    website:      p.website      ?? '',
    logo_url:     p.logo_url     ?? null,
  }
}

export default function CompanyForm({ initial, onChange }: Props) {
  const toast = useToast()
  const [form, setForm]   = useState<FormState>(stateFromProfile(initial))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const dirty = useMemo(() => {
    const base = stateFromProfile(initial)
    return (Object.keys(base) as (keyof FormState)[]).some((k) => form[k] !== base[k])
  }, [form, initial])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    setError('')

    const payload: Record<string, string | null> = {
      company_name: form.company_name.trim() || null,
      tax_id:       form.tax_id.trim()       || null,
      address:      form.address.trim()      || null,
      city:         form.city.trim()         || null,
      country:      form.country             || null,
      currency:     form.currency,
      industry:     form.industry            || null,
      website:      form.website.trim()      || null,
    }

    try {
      const { profile } = await fetchJson<{ profile: ProfileData }>('/api/profile', {
        method:    'PATCH',
        headers:   { 'Content-Type': 'application/json' },
        body:      JSON.stringify(payload),
        timeoutMs: 15_000,
      })
      onChange(profile)
      setForm(stateFromProfile(profile))
      toast.success('Datos de la empresa guardados.')
    } catch (err) {
      const message =
        err instanceof FetchJsonError ? err.message : 'No se pudieron guardar los datos'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <ImageUploader
        kind="logo"
        currentUrl={form.logo_url}
        label="Logo de la empresa"
        helper="Aparecerá en los reportes. PNG, JPG, WEBP, GIF o SVG — máx. 5 MB"
        onChange={(url) => {
          update('logo_url', url)
          onChange({ ...initial, logo_url: url })
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Nombre de la empresa
          </label>
          <input
            type="text"
            value={form.company_name}
            onChange={(e) => update('company_name', e.target.value)}
            placeholder="Ej. Acme S.L."
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            CIF / RUT / NIT
          </label>
          <input
            type="text"
            value={form.tax_id}
            onChange={(e) => update('tax_id', e.target.value.toUpperCase())}
            placeholder="Ej. B12345678"
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors font-mono tracking-wide"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Sector</label>
          <select
            value={form.industry}
            onChange={(e) => update('industry', e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
          >
            <option value="">Sin especificar</option>
            {INDUSTRIES.map((i) => (
              <option key={i.value} value={i.value}>{i.label}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Dirección
          </label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            placeholder="Ej. Calle Mayor 25, 4ºB"
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Ciudad</label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            placeholder="Ej. Madrid"
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">País</label>
          <select
            value={form.country}
            onChange={(e) => update('country', e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
          >
            <option value="">Selecciona un país</option>
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Moneda base
          </label>
          <select
            value={form.currency}
            onChange={(e) => update('currency', e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Sitio web
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="url"
              value={form.website}
              onChange={(e) => update('website', e.target.value)}
              placeholder="https://tuempresa.com"
              className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-colors"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar cambios
            </>
          )}
        </button>
      </div>
    </div>
  )
}
