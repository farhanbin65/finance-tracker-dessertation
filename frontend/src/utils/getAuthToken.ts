/**
 * FinSight — Shared auth token utility
 *
 * Gets the best available token for API calls.
 * Priority: custom JWT -> Auth0 id_token -> empty string
 */

type IdTokenClaims = { __raw?: string } | null | undefined

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    return JSON.parse(atob(normalized))
  } catch {
    return null
  }
}

export async function getAuthToken(
  getIdTokenClaims: () => Promise<IdTokenClaims>
): Promise<string> {
  const stored = localStorage.getItem('fs_token')
  if (stored) {
    const payload = decodeJwtPayload(stored)
    const isExpired = payload?.exp ? payload.exp * 1000 <= Date.now() : false
    if (!isExpired) return stored
  }

  try {
    const claims = await getIdTokenClaims()
    const idToken = claims?.__raw
    if (idToken) {
      localStorage.setItem('fs_token', idToken)
      return idToken
    }
  } catch {
    // Auth0 not available
  }

  return ''
}