import { createContext } from 'react'
import type { User } from '../api/types'

export interface AuthState {
  token: string | null
  user: User | undefined
  loading: boolean
  login(email: string, password: string): Promise<void>
  logout(): void
}

export const AuthContext = createContext<AuthState | null>(null)
