// Token invoice publik STATELESS — HMAC(id) dengan AUTH_SECRET.
// Format: {T}.{id}.{sig}  (T = P kasir | O ots | B booking)
// Tidak butuh kolom DB; tidak bisa ditebak tanpa secret.
import { createHmac } from 'crypto'

const secret = () => process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || ''
const sign = (s: string) => createHmac('sha256', secret()).update(s).digest('base64url').slice(0, 16)

export function makeInvToken(type: 'P' | 'O' | 'B', id: string) {
  return `${type}.${id}.${sign(type + id)}`
}

export function parseInvToken(token: string): { type: 'P' | 'O' | 'B'; id: string } | null {
  const [type, id, sig] = (token || '').split('.')
  if (!type || !id || !sig) return null
  if (!['P', 'O', 'B'].includes(type)) return null
  if (sign(type + id) !== sig) return null
  return { type: type as any, id }
}
