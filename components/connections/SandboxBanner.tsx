import { Beaker } from 'lucide-react'

export default function SandboxBanner() {
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
      <Beaker className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="text-sm text-amber-700 space-y-1">
        <p className="font-semibold">Modo sandbox activo</p>
        <p className="text-amber-600">
          Estás viendo datos simulados para que puedas probar el flujo completo. Conecta
          tus credenciales reales para sincronizar tus facturas y movimientos de verdad.
        </p>
      </div>
    </div>
  )
}
