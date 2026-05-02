import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'

// Envelope format stored in DB: base64(iv).base64(tag).base64(ciphertext)
// The 12-byte IV is mandatory for GCM; the 16-byte tag is the auth tag.
const ALGO = 'aes-256-gcm'
const IV_LEN = 12

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY no está definida. Genera una con `openssl rand -base64 32` y añádela a tu .env.'
    )
  }
  // Accept either a 32-byte base64/hex key, or any string we hash to 32 bytes.
  // Hashing makes the function tolerant of operator mistakes (raw secret strings)
  // without weakening the actual encryption key length.
  try {
    if (/^[A-Za-z0-9+/=]+$/.test(raw) && raw.length >= 43) {
      const buf = Buffer.from(raw, 'base64')
      if (buf.length === 32) return buf
    }
    if (/^[0-9a-f]{64}$/i.test(raw)) {
      return Buffer.from(raw, 'hex')
    }
  } catch {
    /* fall through to hash */
  }
  return createHash('sha256').update(raw, 'utf8').digest()
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}.${tag.toString('base64')}.${ct.toString('base64')}`
}

export function decrypt(envelope: string): string {
  const key = getKey()
  const parts = envelope.split('.')
  if (parts.length !== 3) {
    throw new Error('Payload encriptado con formato inválido')
  }
  const [ivB64, tagB64, ctB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const ct = Buffer.from(ctB64, 'base64')
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}

export function encryptJson(value: unknown): string {
  return encrypt(JSON.stringify(value))
}

export function decryptJson<T = unknown>(envelope: string): T {
  return JSON.parse(decrypt(envelope)) as T
}
