// Tiny Node ESM loader hook. Resolves bare relative TS imports
// ("./foo" → "./foo.ts") so smoke runners can transit through lib code that
// uses extensionless imports (which is what Next/Webpack expects).
// Used only by the smoke runners; production runs through Next webpack.
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export async function resolve(specifier, context, nextResolve) {
  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    !/\.(m|c)?(j|t)sx?$/.test(specifier)
  ) {
    try {
      return await nextResolve(`${specifier}.ts`, context)
    } catch {
      // fall through to default resolver below
    }
  }
  return nextResolve(specifier, context)
}
