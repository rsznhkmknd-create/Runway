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
  TrendingUp,
  Globe,
  Rocket,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import FinsightLogo from '@/components/ui/FinsightLogo'

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  company_name:   string
  industry:       string
  country:        string
  employee_count: string
  business_type:  string
  website:        string
  main_goal:      string
}

// ─── Static data ──────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Tu negocio',  icon: Building2 },
  { id: 2, label: 'Tu equipo',   icon: Users     },
  { id: 3, label: 'Tu objetivo', icon: Target    },
]

const INDUSTRIES = [
  { value: 'tecnologia_saas',    label: 'Tecnología / SaaS'          },
  { value: 'retail',             label: 'Retail / Comercio'           },
  { value: 'hosteleria',         label: 'Hostelería / Restauración'   },
  { value: 'distribucion',       label: 'Distribución / Logística'    },
  { value: 'servicios',          label: 'Servicios profesionales'     },
  { value: 'construccion',       label: 'Construcción'                },
  { value: 'salud',              label: 'Salud'                       },
  { value: 'educacion',          label: 'Educación'                   },
  { value: 'otro',               label: 'Otro'                        },
]

const COUNTRIES = [
  { value: 'espana',     label: '🇪🇸  España'    },
  { value: 'chile',      label: '🇨🇱  Chile'     },
  { value: 'mexico',     label: '🇲🇽  México'    },
  { value: 'colombia',   label: '🇨🇴  Colombia'  },
  { value: 'argentina',  label: '🇦🇷  Argentina' },
  { value: 'otro',       label: '🌍  Otro'       },
]

const EMPLOYEE_COUNTS = [
  { value: 'solo',  label: 'Solo yo',   sub: 'autónomo' },
  { value: '2-5',   label: '2 – 5',     sub: 'personas' },
  { value: '6-20',  label: '6 – 20',    sub: 'personas' },
  { value: '21-50', label: '21 – 50',   sub: 'personas' },
  { value: '50+',   label: '50 +',      sub: 'personas' },
]

const BUSINESS_TYPES = [
  {
    value: 'startup',
    label: 'Startup en crecimiento',
    desc:  'Buscando escalar rápido con inversión',
    Icon:  Rocket,
    color: 'text-violet-600',
    bg:    'bg-violet-50',
  },
  {
    value: 'pyme',
    label: 'PYME tradicional',
    desc:  'Empresa establecida con operaciones consolidadas',
    Icon:  Building2,
    color: 'text-blue-600',
    bg:    'bg-blue-50',
  },
  {
    value: 'freelance',
    label: 'Freelance / Autónomo',
    desc:  'Profesional independiente o consultor',
    Icon:  Users,
    color: 'text-amber-600',
    bg:    'bg-amber-50',
  },
  {
    value: 'ecommerce',
    label: 'E-commerce',
    desc:  'Venta online de productos o servicios',
    Icon:  Globe,
    color: 'text-pink-600',
    bg:    'bg-pink-50',
  },
  {
    value: 'otro',
    label: 'Otro',
    desc:  'Mi negocio no encaja en las anteriores',
    Icon:  Sparkles,
    color: 'text-gray-500',
    bg:    'bg-gray-100',
  },
]

const GOALS = [
  {
    value: 'runway',
    label: 'Controlar mi runway y caja',
    desc:  'Saber exactamente cuánto tiempo me queda de caja',
    Icon:  Clock,
    color: 'text-brand-600',
    bg:    'bg-brand-50',
  },
  {
    value: 'cobranza',
    label: 'Gestionar cobros pendientes',
    desc:  'Ver y hacer seguimiento de facturas sin pagar',
    Icon:  Receipt,
    color: 'text-blue-600',
    bg:    'bg-blue-50',
  },
  {
    value: 'flujo_caja',
    label: 'Visualizar mis finanzas',
    desc:  'Entender de dónde viene y a dónde va el dinero',
    Icon:  BarChart3,
    color: 'text-purple-600',
    bg:    'bg-purple-50',
  },
  {
    value: 'inversores',
    label: 'Preparar reportes para inversores',
    desc:  'Generar informes financieros claros y profesionales',
    Icon:  TrendingUp,
    color: 'text-orange-500',
    bg:    'bg-orange-50',
  },
  {
    value: 'todo',
    label: 'Todo lo anterior',
    desc:  'Control financiero completo del negocio',
    Icon:  Sparkles,
    color: 'text-brand-600',
    bg:    'bg-brand-50',
  },
]

// ─── Goal messages (for welcome screen) ───────────────────────────────────────

const GOAL_MESSAGES: Record<string, { title: string; body: string }> = {
  runway: {
    title: 'Tu runway siempre a la vista',
    body:  'Configuramos tu dashboard para que lo primero que veas sea cuántos meses te quedan de caja. Sin sorpresas.',
  },
  cobranza: {
    title: 'Tus cobros, bajo control',
    body:  'Destacaremos las facturas pendientes y vencidas para que nunca pierdas un cobro importante.',
  },
  flujo_caja: {
    title: 'Claridad total sobre tu dinero',
    body:  'Verás gráficas claras de entradas y salidas para entender tu negocio de un vistazo.',
  },
  inversores: {
    title: 'Datos listos para presentar',
    body:  'Tu dashboard mostrará las métricas clave que cualquier inversor quiere ver al instante.',
  },
  todo: {
    title: 'Control financiero total',
    body:  'Tu workspace está configurado con todas las métricas: runway, cobros, flujo de caja y reportes.',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep]       = useState(1)
  const [done, setDone]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [data, setData] = useState<FormData>({
    company_name:   '',
    industry:       '',
    country:        '',
    employee_count: '',
    business_type:  '',
    website:        '',
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
      setDone(true)
    } catch {
      setError('Hubo un problema al guardar los datos. Inténtalo de nuevo.')
      setLoading(false)
    }
  }

  const goalMsg = GOAL_MESSAGES[data.main_goal] ?? GOAL_MESSAGES['todo']

  // ── Done / Welcome screen ──────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="w-full max-w-md text-center">
          {/* Success icon */}
          <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-brand-600" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ¡Todo listo, {data.company_name}!
          </h1>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Tu espacio financiero está configurado y listo para usar.
          </p>

          {/* Goal card */}
          <div className="bg-brand-50 border border-brand-100 rounded-2xl p-5 mb-8 text-left">
            <p className="text-brand-700 font-semibold text-sm mb-1">{goalMsg.title}</p>
            <p className="text-brand-600/80 text-xs leading-relaxed">{goalMsg.body}</p>
          </div>

          {/* CTA */}
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold
                       bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors"
          >
            Abrir mi dashboard
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-xs text-gray-400 mt-4">
            Puedes editar estos datos en cualquier momento desde Ajustes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel (desktop) ──────────────────────────────────────────────── */}
      <aside className="hidden lg:flex lg:w-[340px] xl:w-[380px] shrink-0 bg-brand-600 flex-col justify-between p-10 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-brand-500/50" />
        <div className="absolute -bottom-28 -left-14 w-80 h-80 rounded-full bg-brand-700/50" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <FinsightLogo size={24} color="#FFFFFF" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">Finsight</span>
        </div>

        {/* Headline + steps */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Configura tu espacio financiero
            </h2>
            <p className="text-brand-100/80 text-sm mt-3 leading-relaxed">
              Solo 3 pasos y tendrás el control total de tus finanzas.
            </p>
          </div>

          {/* Step list */}
          <div className="space-y-3">
            {STEPS.map(({ id, label, icon: Icon }) => {
              const isDone    = step > id
              const isCurrent = step === id
              return (
                <div
                  key={id}
                  className={cn(
                    'flex items-center gap-3 transition-opacity',
                    isDone || isCurrent ? 'opacity-100' : 'opacity-35'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all',
                      isDone    ? 'bg-white'
                      : isCurrent ? 'bg-white/20 ring-2 ring-white'
                      :             'bg-white/10'
                    )}
                  >
                    {isDone
                      ? <CheckCircle2 className="w-5 h-5 text-brand-600" />
                      : <Icon className={cn('w-4 h-4', isCurrent ? 'text-white' : 'text-brand-200')} />
                    }
                  </div>
                  <div>
                    <p className={cn(
                      'text-sm font-semibold leading-none',
                      isCurrent ? 'text-white' : 'text-brand-200'
                    )}>
                      {label}
                    </p>
                    {isCurrent && (
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

      {/* ── Right panel (form) ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FinsightLogo size={28} />
            <span className="font-semibold text-gray-900 text-sm">Finsight</span>
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

            {/* ── STEP 1 — Tu negocio ──────────────────────────────────────────── */}
            {step === 1 && (
              <div>
                <div className="mb-8">
                  <span className="inline-block text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full mb-3">
                    Paso 1 de 3 · Tu negocio
                  </span>
                  <h1 className="text-2xl font-bold text-gray-900">
                    ¿Cómo se llama tu empresa?
                  </h1>
                  <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
                    Personalizamos tu experiencia según tu tipo de negocio y mercado.
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
                      ¿En qué sector opera?
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
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
                    </div>
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      ¿Desde dónde operas?
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
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2 — Tu equipo ───────────────────────────────────────────── */}
            {step === 2 && (
              <div>
                <div className="mb-8">
                  <span className="inline-block text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full mb-3">
                    Paso 2 de 3 · Tu equipo
                  </span>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Cuéntanos sobre tu equipo
                  </h1>
                  <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
                    Adaptamos las métricas a la escala y etapa de tu negocio.
                  </p>
                </div>

                <div className="space-y-7">
                  {/* Employee count */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      ¿Cuántas personas trabajan en la empresa?
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {EMPLOYEE_COUNTS.map(ec => (
                        <button
                          key={ec.value}
                          type="button"
                          onClick={() => update('employee_count', ec.value)}
                          className={cn(
                            'flex flex-col items-center justify-center py-3.5 px-1.5 rounded-xl border-2 transition-all',
                            data.employee_count === ec.value
                              ? 'border-brand-500 bg-brand-50 text-brand-700'
                              : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200 hover:bg-white'
                          )}
                        >
                          <span className="font-bold text-sm leading-none">{ec.label}</span>
                          <span className={cn(
                            'text-[9px] mt-1.5 font-medium leading-tight text-center',
                            data.employee_count === ec.value ? 'text-brand-500' : 'opacity-50'
                          )}>
                            {ec.sub}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Business type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      ¿Cómo describirías tu negocio?
                    </label>
                    <div className="space-y-2">
                      {BUSINESS_TYPES.map(bt => (
                        <button
                          key={bt.value}
                          type="button"
                          onClick={() => update('business_type', bt.value)}
                          className={cn(
                            'w-full text-left flex items-center gap-3.5 px-4 py-3 rounded-xl border-2 transition-all',
                            data.business_type === bt.value
                              ? 'border-brand-500 bg-brand-50'
                              : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
                          )}
                        >
                          {/* Icon */}
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', bt.bg)}>
                            <bt.Icon className={cn('w-4 h-4', bt.color)} />
                          </div>
                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm font-semibold leading-none',
                              data.business_type === bt.value ? 'text-brand-700' : 'text-gray-800'
                            )}>
                              {bt.label}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{bt.desc}</p>
                          </div>
                          {/* Radio dot */}
                          <div className={cn(
                            'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                            data.business_type === bt.value ? 'border-brand-500' : 'border-gray-300'
                          )}>
                            {data.business_type === bt.value && (
                              <div className="w-2 h-2 rounded-full bg-brand-500" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Website (optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Sitio web{' '}
                      <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://tuempresa.com"
                      value={data.website}
                      onChange={e => update('website', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl
                                 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400
                                 bg-gray-50 focus:bg-white transition-colors placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3 — Tu objetivo ─────────────────────────────────────────── */}
            {step === 3 && (
              <div>
                <div className="mb-8">
                  <span className="inline-block text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full mb-3">
                    Paso 3 de 3 · Tu objetivo
                  </span>
                  <h1 className="text-2xl font-bold text-gray-900">
                    ¿Qué quieres controlar?
                  </h1>
                  <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
                    Tu dashboard se adaptará a lo que más te importa. Puedes cambiar esto después.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {GOALS.map(({ value, label, desc, Icon, color, bg }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update('main_goal', value)}
                      className={cn(
                        'w-full text-left flex items-center gap-4 p-4 rounded-xl border-2 transition-all',
                        data.main_goal === value
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
                      )}
                    >
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', bg)}>
                        <Icon className={cn('w-5 h-5', color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-semibold leading-none',
                          data.main_goal === value ? 'text-brand-700' : 'text-gray-800'
                        )}>
                          {label}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 leading-snug">{desc}</p>
                      </div>
                      {/* Radio dot */}
                      <div className={cn(
                        'w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                        data.main_goal === value ? 'border-brand-500' : 'border-gray-300'
                      )}>
                        {data.main_goal === value && (
                          <div className="w-2 h-2 rounded-full bg-brand-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Error ────────────────────────────────────────────────────────── */}
            {error && (
              <p className="mt-5 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            {/* ── Navigation ───────────────────────────────────────────────────── */}
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
                      Configurando…
                    </>
                  ) : (
                    <>
                      Finalizar
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
