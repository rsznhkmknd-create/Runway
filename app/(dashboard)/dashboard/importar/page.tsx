import type { Metadata } from 'next'
import { UploadCloud, Info } from 'lucide-react'
import FileUploadModule from '@/components/upload/FileUploadModule'

export const metadata: Metadata = { title: 'Importar datos' }

export default function ImportarPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Importar datos financieros</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Sube tu archivo y Claude detectará automáticamente las columnas
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 space-y-1">
          <p className="font-semibold">¿Cómo funciona?</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-600">
            <li>Sube tu archivo Excel, CSV u ODS con transacciones</li>
            <li>Claude analiza las columnas y detecta fechas, importes y categorías</li>
            <li>Revisa el mapeo y corrígelo si es necesario</li>
            <li>Confirma para guardar en Supabase y actualizar el dashboard</li>
          </ol>
        </div>
      </div>

      {/* Upload module */}
      <FileUploadModule />

      {/* Accepted formats */}
      <div className="flex flex-wrap gap-2 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <UploadCloud className="w-3.5 h-3.5" /> Formatos aceptados:
        </span>
        {['.xlsx', '.xls', '.csv', '.ods'].map((ext) => (
          <span key={ext} className="bg-gray-100 px-2 py-0.5 rounded font-mono">
            {ext}
          </span>
        ))}
      </div>
    </div>
  )
}
