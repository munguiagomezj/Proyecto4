import { useState } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { createApiClient } from './api'
import { ApiContext } from './api/context'
import type { ApiClient } from './api/types'
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/useAuth'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'

function RequireAuth({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  if (loading) return <p className="muted center">Cargando…</p>
  return children
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

/** `api` se puede inyectar en los tests; por defecto se elige según VITE_API_URL. */
export default function App({ api }: { api?: ApiClient }) {
  const [client] = useState(() => api ?? createApiClient())
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 10_000 } } }))
  return (
    <ApiContext.Provider value={client}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {/* HashRouter: GitHub Pages solo sirve archivos estáticos y no reescribe rutas. */}
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ApiContext.Provider>
  )
}
