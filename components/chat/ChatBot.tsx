'use client'

import { useEffect, useRef, useState } from 'react'
import { Sparkles, Send, X, Loader2, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import FinsightLogo from '@/components/ui/FinsightLogo'

// ── Types matching /api/chat ────────────────────────────────────────────────

type Role = 'user' | 'assistant'

type ChatMessage = {
  role: Role
  content: string
  /** Tool execution receipts surfaced by the agent loop. Only on assistant turns. */
  actions?: Array<{ tool: string; status: 'ok' | 'error' | 'noop'; summary: string }>
}

const WELCOME: ChatMessage = {
  role: 'assistant',
  content:
    '¡Hola! Soy tu CFO digital. Puedo responder preguntas sobre tus finanzas y ejecutar acciones (crear facturas, marcarlas como pagadas, registrar transacciones, generar reportes). ¿En qué te ayudo?',
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  // Auto-scroll to bottom whenever messages change.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  // Focus input when opening.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 200)
      return () => clearTimeout(t)
    }
  }, [open])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setError(null)
    setInput('')

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setSending(true)

    try {
      // Send the full conversation (server is stateless — client owns history).
      const payload = { messages: next.map(({ role, content }) => ({ role, content })) }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { error?: string }))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as {
        content: string
        actions?: ChatMessage['actions']
      }
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.content, actions: data.actions },
      ])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error inesperado'
      setError(msg)
      // Roll back the user's message so they can edit + retry.
      setMessages(next.slice(0, -1))
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <>
      {/* ── Floating action button (always visible on dashboard pages) ── */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir Finsight AI"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-mint shadow-lg shadow-mint/30 transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-mint/40 active:scale-95"
        >
          <FinsightLogo size={26} color="#FFFFFF" />
          <span className="sr-only">Abrir Finsight AI</span>
        </button>
      )}

      {/* ── Side panel (slides in from the right, does NOT cover content) ── */}
      <aside
        aria-hidden={!open}
        className={cn(
          'fixed right-0 top-0 z-50 h-screen w-[400px] max-w-[calc(100vw-1rem)] border-l border-border bg-card shadow-2xl shadow-black/10 transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mint">
                <FinsightLogo size={18} color="#FFFFFF" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-text-primary">
                  Finsight AI
                </h2>
                <p className="text-xs text-text-muted">Tu CFO digital</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-muted hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <Bubble key={i} message={m} />
            ))}
            {sending && <TypingIndicator />}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-500">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <div className="relative flex items-end gap-2 rounded-xl border border-border bg-background focus-within:border-mint/50 transition-colors">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Pregúntame algo o pídeme una acción…"
                disabled={sending}
                className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-50 max-h-32"
                style={{ minHeight: '40px' }}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={sending || !input.trim()}
                aria-label="Enviar"
                className="m-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-mint text-white transition-all hover:bg-mint-dark disabled:opacity-40 disabled:hover:bg-mint active:scale-95"
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p className="mt-2 px-1 text-[10.5px] text-text-muted">
              Enter para enviar · Shift+Enter para salto de línea
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-mint text-[#07160E] rounded-br-md'
            : 'bg-[#111827] text-white rounded-bl-md dark:bg-muted dark:text-text-primary'
        )}
      >
        {message.content}
        {!isUser && message.actions && message.actions.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-white/10 pt-2 dark:border-border">
            {message.actions.map((a, i) => (
              <ActionReceipt key={i} action={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ActionReceipt({
  action,
}: {
  action: { tool: string; status: 'ok' | 'error' | 'noop'; summary: string }
}) {
  const Icon = action.status === 'ok' ? Check : AlertCircle
  const colorClass =
    action.status === 'ok'
      ? 'text-mint'
      : action.status === 'error'
        ? 'text-red-400'
        : 'text-amber'
  return (
    <div className="flex items-start gap-1.5 text-[11px]">
      <Icon className={cn('h-3 w-3 shrink-0 mt-0.5', colorClass)} />
      <span className="opacity-80">{action.summary}</span>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl bg-[#111827] px-4 py-3 dark:bg-muted">
        <span className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-mint animate-pulse" />
          <span className="ml-1 flex gap-1">
            <Dot />
            <Dot delay={150} />
            <Dot delay={300} />
          </span>
        </span>
      </div>
    </div>
  )
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="h-1.5 w-1.5 rounded-full bg-white/60 dark:bg-text-muted animate-pulse"
      style={{ animationDelay: `${delay}ms`, animationDuration: '900ms' }}
    />
  )
}
