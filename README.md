# Finsight

SaaS financiero con IA para PYMEs en LATAM y España. Stack: **Next.js 14**,
**Supabase**, **Clerk**, **Anthropic API** (`claude-sonnet-4-6`),
deployed en Vercel.

## Quickstart

```bash
nvm use            # Node 20 LTS — Node 25 cuelga vitest/next dev/tsc
npm install
cp .env.local.example .env.local   # rellena las claves
npm run dev
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` | Next build de producción |
| `npm test` | vitest (requiere Node 20) |
| `npm run test:smoke` | Smoke runner standalone (corre bajo Node 25) — schemas + normalizer + Santander integration |
| `npm run test:smoke:parsers` | Smoke runner para `lib/parsers/{date,amount}.ts` |
| `npm run test:smoke:regions` | Smoke runner para el region-detector + clean-sheet regression |
| `npm run debug:regions -- <path-to-xlsx>` | CLI: imprime regiones detectadas en un archivo |
| `npm run test:integration:multiregion` | Integración end-to-end con Anthropic API contra `tests/fixtures/imports/Prueba_runway7.xlsx` (requiere `ANTHROPIC_API_KEY`) |

## Testing the import flow

El importador tiene cuatro caminos por los que vale la pena pasar a mano antes
de cualquier release.

### 1. Happy path — archivo limpio con auto-confirm

Sube un `.xlsx` de una sola tabla densa (header + datos sin filas vacías ni
metadatos). Comportamiento esperado:

- `/api/upload/analyze` detecta exactamente 1 región con `>80%` de ocupación.
- Se inserta a `import_staging` y se mueve directo a `transactions` en la
  misma request (auto-confirm).
- El frontend salta `ImportReview` y muestra el toast de éxito como antes.
- `import_metrics` recibe una fila con `regions_detected=1`,
  `transactions_extracted=N`, `needs_review_count=0`.

### 2. Caso con `needsReview` — pantalla de revisión

Sube un archivo donde algunas filas tengan montos no parseables (ej. "variable",
"pendiente") o fechas no reconocidas. Comportamiento esperado:

- `/api/upload/analyze` devuelve `autoConfirmed: false` y un array `needsReviewRows`.
- El frontend muestra `ImportReview` con esas filas en la tabla editable.
- El usuario edita lo necesario, marca "Aprobar" en cada una, y pulsa
  **Confirmar importación** → `POST /api/import/:importId/confirm` con
  `approvedReviewIds` + `edits`.
- Las aprobadas se mueven a `transactions`, las no aprobadas quedan como
  `rejected` en staging para auditoría.

### 3. Multi-tabla — `tests/fixtures/imports/Prueba_runway7.xlsx`

Caso real de cliente con 5 bloques en una sola hoja: ventas, inventario,
gastos recurrentes, cuentas por cobrar y préstamos. Comportamiento esperado:

- `detectRegions()` encuentra 5 regiones con coordenadas exactas.
- Claude clasifica cada una con `blockType` correcto.
- `inventory_snapshot` y `summary_totals` se omiten silenciosamente.
- `recurring_expenses` (16 filas) se agrupan en una sección colapsable
  "Gastos recurrentes detectados (sin fecha específica)" con botones
  globales: "Aplicar fecha de hoy a todos" / "Aplicar primer día del mes".
- `accounts_receivable` y `loans_payable` aparecen en un banner amarillo
  ("próximamente, no se importarán").
- Las 11 ventas se importan tras confirm.

### 4. Cancelación — `DELETE /api/import/:importId`

En cualquier punto del paso 2 o 3, pulsar **Cancelar importación**:

- Llama `DELETE /api/import/:importId`.
- Las filas en staging quedan con `status='rejected'` (no se borran — auditoría).
- El modal vuelve al estado `idle`.

## Migraciones Supabase

No hay CLI configurada — las migraciones se aplican copiando el SQL en el
**Supabase SQL Editor** del dashboard, en orden numérico.

```
supabase/migrations/
  001_add_onboarding_fields.sql
  002_add_website_field.sql
  003_add_notification_settings.sql
  004_add_plan_and_usage.sql
  005_add_activity_logs.sql
  006_import_staging.sql        # ← staging + telemetría del importador
```

Cada archivo incluye un bloque `ROLLBACK` comentado al final.

## Variables de entorno (`.env.local`)

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
NEXT_PUBLIC_APP_URL=
```

Ver `.env.local.example` para el listado completo y comentarios.

## Notas

- **Node 25 conocido roto en este repo**: vitest, `next dev` y `tsc` cuelgan
  silenciosamente bajo Node 25 (worker model bug). El `.nvmrc` pinea Node 20.
  Para testing/dev usa `nvm use 20`. Los smoke runners standalone
  (`test:smoke*`) sí funcionan bajo Node 25 vía `--experimental-strip-types`.
- **Tests excluidos del build**: `tsconfig.json` excluye `tests/**/*` y
  `scripts/**/*` del type check para que las imports con extensión `.ts`
  explícita (necesarias para los smoke runners) no rompan el build de Vercel.
