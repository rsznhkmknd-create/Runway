'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Users,
  Target,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  Receipt,
  BarChart3,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  company_name: string
  industry: string
  country: string
  employee_count: string
  business_type: string
  main_goal: string
}

// ─── Static data ──────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Negocio',   icon: Building2 },
  { id: 2, label: 'Tamaño',    icon: Users     },
  { id: 3, label: 'Objetivo',  icon: Target    },
]

const INDUSTRIES = [
  { value: 'tecnologia',   label: 'Tecnología'  },
  { value: 'retail',       label: 'Retail'      },
  { value: 'hosteleria',   label: 'Hostelería'  },
  { value: 'distribucion', label: 'Distribución'},
  { value: 'servicios',    label: 'Servicios'   },
  { value: 'otro',         label: 'Otro'        },
]

const COUNTRIES = [
  { value: 'espana',    label: 'España'   },
  { value: 'chile',     label: 'Chile'    },
  { value: 'mexico',    label: 'México'   },
  { value: 'colombia',  label: 'Colombia' },
  { value: 'otro',      label: 'Otro'     },
]

const EMPLOYEE_COUNTS = [
  { value: '1',    label: '1'    },
  { value: '2-5',  label: '2–5'  },
  { value: '6-20', label: '6–20' },
  { value: '20+',  label: '20+'  },
]

const BUSINESS_TYPES = [
  {
    value: 'pyme',
    label: 'PYME tradicional',
    desc:  'Empresa establecida con operaciones consolidadas',
  },
  {
    value: 'startup',
    label: 'Startup',
    desc:  'Empresa de alto crecimiento buscando escalar',
  },
  {
    value: 'freelance',
    label: 'Freelance / Autónomo',
    desc:  'Profesional independiente o consultor',
  },
]

const GOALS = [
  {
    value: 'runway',
    label: 'Runway',
    desc:  'Cuánto tiempo me queda de caja',
    Icon:  Clock,
    color: 'text-brand-600',
    bg:    'bg-brand-50',
  },
  {
    value: 'cobranza',
    label: 'Cobranza',
    desc:  'Facturas y pagos pendientes',
    Icon:  Receipt,
    color: 'text-blue-600',
    bg:    'bg-blue-50',
  },
  {
    value: 'flujo_caja',
    label: 'Flujo de caja',
    desc:  'Entradas y salidas del negocio',
    Icon:  BarChart3,
    color: 'text-purple-600',
    bg:    'bg-purple-50',
  },
  {
    value: 'todo',
    label: 'Todo',
    desc:  'Control total de mis finanzas',
    Icon:  Sparkles,
    color: 'text-orange-500',
    bg:    'bg-orange-50',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [data, setData] = useState<FormData>({
    company_name:   '',
    industry:       '',
    country:        '',
    employee_count: '',
    business_type:  '',
    main_goal:      '',
  })

  const update = (field: keyof FormData, value: string) =>
    setData(prev => ({ ...prev, [field]: value }))

  const canProceed = (): boolean => {
    if (step === 1) return !!(data.company_name.trim() && data.industry && data.country)
    if (step === 2) return !!(data.employee_count && data.business_type)
    if (step === 3) return !!data.main_goal
    return false
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/onboarding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Error al guardar')
      router.push('/dashboard')
    } catch {
      setError('Hubo un problema al guardar los datos. Inténtalo de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel (desktop) ────────────────────────────────────────────── */}
      <aside className="hidden lg:flex lg:w-[340px] xl:w-[380px] shrink-0 bg-brand-600 flex-col justify-between p-10 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-brand-500/50" />
        <div className="absolute -bottom-28 -left-14 w-80 h-80 rounded-full bg-brand-700/50" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-base">R</span>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">Runway</span>
        </div>

        {/* Headline + steps */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Configura tu espacio financiero
            </h2>
            <p className="text-brand-100/80 text-sm mt-3 leading-relaxed">
              En 3 minutos tendrás el control total de tus finanzas.
            </p>
          </div>

          {/* Step list */}
          <div className="space-y-3">
            {STEPS.map(({ id, label: _label, icon: Icon }) => {
              const done    = step > id
              const current = step === id
              return (
                <div
                  key={id}
                  className={cn(
                    'flex items-center gap-3 transition-opacity',
                    done || current ? 'opacity-100' : 'opacity-35'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all',
                      done    ? 'bg-white'
                      : current ? 'bg-white/20 ring-2 ring-white'
                      :           'bg-white/10'
                    )}
                  >
                    {done
                      ? <CheckCircle2 className="w-5 h-5 text-brand-600" />
                      : <Icon className={cn('w-4 h-4', current ? 'text-white' : 'text-brand-200')} />
                    }
                  </div>
                  <div>
                    <p className={cn(
                      'text-sm font-semibold leading-none',
                      current ? 'text-white' : 'text-brand-200'
                    )}>
                      {id === 1 && 'Información del negocio'}
                      {id === 2 && 'Tamaño y tipo de empresa'}
                      {id === 3 && 'Objetivo principal'}
                    </p>
                    {current && (
                      <p className="text-xs text-brand-100/60 mt-0.5">En curso</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-brand-200/50 text-xs leading-relaxed">
          Puedes modificar todo esto en cualquier momento desde Ajustes.
        </p>
      </aside>

      {/* ── Right panel (form) ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="font-semibold text-gray-900 text-sm">Runway</span>
          </div>
          <span className="text-xs text-gray-400 font-medium">Paso {step} de 3</span>
        </div>

        {/* Form scroll area */}
        <div className="flex-1 overflow-y-auto flex items-start justify-center p-6 pt-10 lg:p-14 lg:pt-16">
          <div className="w-full max-w-md">

            {/* Mobile progress bar */}
            <div className="lg:hidden flex gap-1.5 mb-8">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-all duration-300',
                    s <= step ? 'bg-brand-500' : 'bg-gray-100'
                  )}
                />
              ))}
            </div>

            {/* ── STEP 1 ─────────────────────────────────────────────────────── */}
            {step === 1 && (
              <div>
                <div className="mb-8">
                  <span className="inline-block text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full mb-3">
                    Paso 1 de 3
                  </span>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Información del negocio
                  </h1>
                  <p className="text-gray-500 text-sm mt-1">
                    Cuéntanos un poco sobre tu empresa para personalizar tu experiencia.
                  </p>
                </div>

                <div className="space-y-5">
                  {/* Company name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nombre de la empresa
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Acme Corp"
                      autoFocus
                      value={data.company_name}
                      onChange={e => update('company_name', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl
                                 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400
                                 bg-gray-50 focus:bg-white transition-colors placeholder:text-gray-400"
                    />
                  </div>

                  {/* Industry */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Industria
                    </label>
                    <div className="relative">
                      <select
                        value={data.industry}
                        onChange={e => update('industry', e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl
                                   focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400
                                   bg-gray-50 focus:bg-white transition-colors appearance-none
                                   text-gray-700 cursor-pointer"
                      >
                        <option value="">Selecciona una industria</option>
                        {INDUSTRIES.map(i => (
                          <option key={i.value} value={i.value}>{i.label}</option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                        ▾
                      </span>
                    </div>
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      País
                    </label>
                    <div className="relative">
                      <select
                        value={data.country}
                        onChange={e => update('country', e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl
                                   focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400
                                   bg-gray-50 focus:bg-white transition-colors appearance-none
                                   text-gray-700 cursor-pointer"
                      >
                        <option value="">Selecciona un país</option>
                        {COUNTRIES.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                        ▾
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2 ─────────────────────────────────────────────────────── */}
            {step === 2 && (
              <div>
                <div className="mb-8">
                  <span className="inline-block text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full mb-3">
                    Paso 2 de 3
                  </span>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Tamaño y tipo
                  </h1>
                  <p className="text-gray-500 text-sm mt-1">
                    Esto nos ayuda a adaptar las métricas a tu realidad.
                  </p>
                </div>

                <div className="space-y-7">
                  {/* Employee count */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Número de empleados
                    </label>
                    <div className="grid grid-cols-4 gap-2.5">
                      {EMPLOYEE_COUNTS.map(ec => (
                        <button
                          key={ec.value}
                          type="button"
                          onClick={() => update('employee_count', ec.value)}
                          className={cn(
                            'flex flex-col items-center justify-center py-4 px-2 rounded-xl border-2 transition-all',
                            data.employee_count === ec.value
                              ? 'border-brand-500 bg-brand-50 text-brand-700'
                              : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200 hover:bg-white'
                          )}
                        >
                          <span className="font-bold text-base leading-none">{ec.label}</span>
                          <span className="text-[10px] mt-1.5 opacity-60 font-medium">
                            {ec.value === '1' ? 'persona' : 'personas'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Business type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Tipo de negocio
                    </label>
                    <div className="space-y-2.5">
                      {BUSINESS_TYPES.map(bt => (
                        <button
                          key={bt.value}
                          type="button"
                          onClick={() => update('business_type', bt.value)}
                          className={cn(
                            'w-full text-left flex items-center gap-3.5 px-4 py-3.5 rounded-xl border-2 transition-all',
                            data.business_type === bt.value
                              ? 'border-brand-500 bg-brand-50'
                              : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
                          )}
                        >
                          {/* Radio dot */}
                          <div
                            className={cn(
                              'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                              data.business_type === bt.value
                                ? 'border-brand-500'
                                : 'border-gray-300'
                            )}
                          >
                            {data.business_type === bt.value && (
                              <div className="w-2 h-2 rounded-full bg-brand-500" />
                            )}
                          </div>
                          <div>
                            <p className={cn(
                              'text-sm font-semibold leading-none',
                              data.business_type === bt.value ? 'text-brand-700' : 'text-gray-800'
                            )}>
                              {bt.label}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{bt.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3 ─────────────────────────────────────────────────────── */}
            {step === 3 && (
              <div>
                <div className="mb-8">
                  <span className="inline-block text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full mb-3">
                    Paso 3 de 3
                  </span>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Objetivo principal
                  </h1>
                  <p className="text-gray-500 text-sm mt-1">
                    ¿Qué quieres controlar con Runway? Podrás cambiar esto más tarde.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {GOALS.map(({ value, label, desc, Icon, color, bg }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update('main_goal', value)}
                      className={cn(
                        'text-left flex flex-col gap-3 p-4 rounded-xl border-2 transition-all',
                        data.main_goal === value
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
                      )}
                    >
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', bg)}>
                        <Icon className={cn('w-4.5 h-4.5', color)} />
                      </div>
                      <div>
                        <p className={cn(
                          'text-sm font-semibold leading-none',
                          data.main_goal === value ? 'text-brand-700' : 'text-gray-800'
                        )}>
                          {label}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 leading-snug">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Error ──────────────────────────────────────────────────────── */}
            {error && (
              <p className="mt-5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            {/* ── Navigation ─────────────────────────────────────────────────── */}
            <div className={cn('flex mt-8', step > 1 ? 'justify-between' : 'justify-end')}>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600
                             border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold
                             bg-brand-600 text-white rounded-xl hover:bg-brand-700
                             disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canProceed() || loading}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold
                             bg-brand-600 text-white rounded-xl hover:bg-brand-700
                             disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando…
                    </>
                  ) : (
                    <>
                      Ir al dashboard
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
