import { createContext, useContext } from 'react'
import type { ApiClient } from './types'

export const ApiContext = createContext<ApiClient | null>(null)

export function useApi(): ApiClient {
  const api = useContext(ApiContext)
  if (!api) throw new Error('useApi debe usarse dentro de <ApiContext.Provider>')
  return api
}
