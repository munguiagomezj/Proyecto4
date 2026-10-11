import { useContext } from 'react'
import { AuthContext } from './context'
import type { AuthState } from './context'

export function useAuth(): AuthState {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return auth
}

/** Token de la sesión actual. Solo se usa en pantallas protegidas, donde siempre existe. */
export function useToken(): string {
  const { token } = useAuth()
  if (!token) throw new Error('No hay sesión iniciada')
  return token
}
