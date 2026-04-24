'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

export default function DataExportCard() {
  const toast = useToast()
  const [downloading, setDownloading] = useState(false)

  const handleExport = async () => {
    if (downloading) return
    setDownloading(true)
    try {
      const res = await fetch('/api/settings/export')
      if (!res.ok) {
        if (res.status === 429) {
          toast.error('Has hecho demasiadas exportaciones. Espera un minuto y vuelve a intentarlo.')
        } else {
          toast.error('No se pudo exportar tus datos.')
        }
        return
      }
      const blob = await res.blob()
      const today = new Date().toISOString().slice(0, 10)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `finsight-export-${today}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Exportación descargada.')
    } catch {
      toast.error('No se pudo exportar tus datos.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-sm p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center shrink-0 text-text-secondary">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Exportar mis datos</h2>
            <p className="text-xs text-text-muted mt-0.5 max-w-md">
              Descarga un archivo JSON con toda tu información: perfil, facturas, transacciones,
              reportes, insights y actividad.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={downloading}
          className="inline-flex items-center gap-2 border border-border bg-surface-2 hover:bg-surface text-text-primary text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Preparando…
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Descargar JSON
            </>
          )}
        </button>
      </div>
    </div>
  )
}
