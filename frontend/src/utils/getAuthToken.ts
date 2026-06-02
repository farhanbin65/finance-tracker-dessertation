/**
 * FinSight — getAuthToken utility
 * Reads the custom JWT from localStorage.
 * Auth0 disabled — email/password login only.
 */
export async function getAuthToken(): Promise<string> {
  const token = localStorage.getItem('fs_token')
  if (!token) return ''

  // Check token is not expired
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const isExpired = payload.exp * 1000 < Date.now()
    if (isExpired) {
      localStorage.removeItem('fs_token')
      return ''
    }
    return token
  } catch {
    localStorage.removeItem('fs_token')
    return ''
  }
}