/**
 * FinSight — useAuth Hook
 * 
 * Hybrid auth hook that handles both:
 *   1. Custom JWT (email/password login)
 *   2. Auth0 token (Google/GitHub OAuth login)
 * 
 * After either login method, token is stored in localStorage
 * so all API calls can attach it as Bearer token.
 */

import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useCallback } from 'react'

const TOKEN_KEY         = 'fs_token'
const REFRESH_TOKEN_KEY = 'fs_refresh_token'
const USER_KEY          = 'fs_user'
const NAME_KEY          = 'fs_name'
const EMAIL_KEY         = 'fs_email'

interface StoredUser {
  id: string
  full_name: string
  email: string
  currency: string
}

export function useAuth() {
  const {
    isAuthenticated: isAuth0Authenticated,
    isLoading: isAuth0Loading,
    user: auth0User,
    getAccessTokenSilently,
    getIdTokenClaims,
    loginWithRedirect,
    logout: auth0Logout,
  } = useAuth0()

  // ── Sync Auth0 token to localStorage after OAuth login ───────────────────
  useEffect(() => {
    if (!isAuth0Authenticated || isAuth0Loading || !auth0User) return

    const syncToken = async () => {
      try {
        // First try: get proper access token silently
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: `https://${import.meta.env.VITE_AUTH0_DOMAIN}/api/v2/`,
          }
        })
        storeAuth0User(token)

      } catch {
        try {
          // Fallback: use id_token — works without an Auth0 API configured
          const claims = await getIdTokenClaims()
          if (claims?.__raw) {
            storeAuth0User(claims.__raw)
          }
        } catch (err) {
          console.error('[useAuth] Could not retrieve Auth0 token:', err)
        }
      }
    }

    const storeAuth0User = (token: string) => {
      // Don't overwrite a fresh custom JWT
      const existing = localStorage.getItem(TOKEN_KEY)
      if (existing) {
        try {
          const p = JSON.parse(atob(existing.split('.')[1]))
          // If custom JWT is still valid, keep it
          if (p.type === 'access' && p.exp * 1000 > Date.now()) return
        } catch { /* malformed — overwrite */ }
      }

      const name  = auth0User!.name || auth0User!.nickname || auth0User!.email?.split('@')[0] || 'User'
      const email = auth0User!.email || ''

      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(NAME_KEY, name)
      localStorage.setItem(EMAIL_KEY, email)
      localStorage.setItem(USER_KEY, JSON.stringify({
        id:        auth0User!.sub || '',
        full_name: name,
        email,
        currency:  'GBP',
      } as StoredUser))
    }

    syncToken()
  }, [isAuth0Authenticated, isAuth0Loading, auth0User])

  // ── Getters ───────────────────────────────────────────────────────────────

  const getToken = useCallback((): string | null => {
    return localStorage.getItem(TOKEN_KEY)
  }, [])

  const isLoggedIn = useCallback((): boolean => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      try {
        const p = JSON.parse(atob(token.split('.')[1]))
        return p.exp * 1000 > Date.now()
      } catch { return false }
    }
    return isAuth0Authenticated
  }, [isAuth0Authenticated])

  const getUser = useCallback((): StoredUser | null => {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }, [])

  // ── Custom JWT (email/password login) ─────────────────────────────────────

  const storeCustomAuth = useCallback((data: {
    access_token: string
    refresh_token: string
    user: StoredUser
  }) => {
    localStorage.setItem(TOKEN_KEY, data.access_token)
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    localStorage.setItem(NAME_KEY, data.user.full_name)
    localStorage.setItem(EMAIL_KEY, data.user.email)
  }, [])

  // ── Logout ────────────────────────────────────────────────────────────────

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(NAME_KEY)
    localStorage.removeItem(EMAIL_KEY)

    if (isAuth0Authenticated) {
      auth0Logout({
        logoutParams: {
          returnTo: window.location.origin + '/login'
        }
      })
    } else {
      window.location.href = '/login'
    }
  }, [isAuth0Authenticated, auth0Logout])

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    isLoggedIn,
    isLoading: isAuth0Loading,
    isAuth0Authenticated,
    getToken,
    getUser,
    storeCustomAuth,
    logout,
    loginWithRedirect,
  }
}