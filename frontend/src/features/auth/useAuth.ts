/**
 * FinSight — useAuth hook
 * Handles custom JWT auth only. Auth0 disabled.
 */

import { useCallback } from 'react'

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

  const getToken = useCallback((): string => {
    return localStorage.getItem(TOKEN_KEY) || ''
  }, [])

  const isLoggedIn = useCallback((): boolean => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return false
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000 > Date.now()
    } catch {
      return false
    }
  }, [])

  const getUser = useCallback((): StoredUser | null => {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])

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

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(NAME_KEY)
    localStorage.removeItem(EMAIL_KEY)
    window.location.href = '/login'
  }, [])

  return {
    isLoggedIn,
    getToken,
    getUser,
    storeCustomAuth,
    logout,
  }
}