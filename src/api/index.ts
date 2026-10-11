import { createHttpClient } from './http'
import { createMockClient } from './mock'
import type { ApiClient } from './types'

/** URL de la API real. Si no se define, la app funciona en modo demo con la API simulada. */
export const API_URL: string | undefined = import.meta.env.VITE_API_URL || undefined
export const DEMO_MODE = !API_URL

export function createApiClient(): ApiClient {
  return API_URL ? createHttpClient(API_URL) : createMockClient({ delayMs: 150 })
}
