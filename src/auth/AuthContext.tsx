import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../api/context'
import { ApiError } from '../api/types'
import { AuthContext } from './context'
import type { AuthState } from './context'

const TOKEN_KEY = 'tareas:token'


function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const api = useApi()
  const queryClient = useQueryClient()
  const [token, setToken] = useState<string | null>(readToken)

  const saveToken = useCallback((value: string | null) => {
    try {
      if (value) localStorage.setItem(TOKEN_KEY, value)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* sin persistencia: la sesión dura lo que la pestaña */
    }
    setToken(value)
  }, [])

  const logout = useCallback(() => {
    saveToken(null)
    queryClient.clear() // que el siguiente usuario no vea datos del anterior
  }, [saveToken, queryClient])

  const me = useQuery({
    queryKey: ['me', token],
    queryFn: async () => {
      try {
        return await api.me(token!)
      } catch (error) {
        // Token caducado o inválido: se cierra la sesión.
        if (error instanceof ApiError && error.status === 401) logout()
        throw error
      }
    },
    enabled: !!token,
    retry: false,
  })

  const login = useCallback(
    async (email: string, password: string) => {
      saveToken(await api.login(email, password))
    },
    [api, saveToken],
  )

  const value = useMemo<AuthState>(
    () => ({ token, user: me.data, loading: !!token && me.isPending, login, logout }),
    [token, me.data, me.isPending, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
