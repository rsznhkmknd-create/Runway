'use client'

import { useRef, useState } from 'react'
import { Upload, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchJson, FetchJsonError } from '@/lib/fetch-json'
import { useToast } from '@/components/ui/Toast'

type Props = {
  kind:       'logo' | 'avatar'
  currentUrl: string | null
  label:      string
  helper?:    string
  onChange:   (url: string | null) => void
}

export default function ImageUploader({
  kind,
  currentUrl,
  label,
  helper,
  onChange,
}: Props) {
  const toast = useToast()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const handle = async (file: File) => {
    setError('')
    if (file.size === 0) {
      setError('El archivo está vacío.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen supera el límite de 5 MB.')
      return
    }

    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('kind', kind)

    try {
      const json = await fetchJson<{ url: string }>('/api/profile/upload', {
        method:    'POST',
        body:      fd,
        timeoutMs: 30_000,
      })
      onChange(json.url)
      toast.success(kind === 'logo' ? 'Logo actualizado.' : 'Foto actualizada.')
    } catch (err) {
      const message =
        err instanceof FetchJsonError
          ? err.kind === 'timeout'
            ? 'La subida tardó demasiado.'
            : err.message
          : 'Error al subir la imagen'
      setError(message)
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  const clear = () => {
    onChange(null)
  }

  const shape = kind === 'avatar' ? 'rounded-full' : 'rounded-2xl'
  const size  = kind === 'avatar' ? 'w-20 h-20' : 'w-24 h-24'

  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-2">{label}</label>

      <div className="flex items-center gap-4">
        {/* Preview */}
        <div
          className={cn(
            size,
            shape,
            'shrink-0 overflow-hidden border border-border bg-surface-2 flex items-center justify-center'
          )}
        >
          {currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentUrl}
              alt={label}
              className="w-full h-full object-cover"
            />
          ) : (
            <Upload className="w-5 h-5 text-text-muted" />
          )}
        </div>

        {/* Actions */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text-secondary bg-surface border border-border rounded-lg hover:bg-surface-2 disabled:opacity-50 transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Subiendo…
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  {currentUrl ? 'Cambiar' : 'Subir imagen'}
                </>
              )}
            </button>
            {currentUrl && !uploading && (
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Quitar
              </button>
            )}
          </div>
          {helper && <p className="text-xs text-text-muted mt-1.5">{helper}</p>}
          {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handle(f)
              e.target.value = ''
            }}
          />
        </div>
      </div>
    </div>
  )
}
