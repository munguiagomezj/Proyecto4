import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { DEMO_MODE } from '../api'
import { useApi } from '../api/context'
import { DEMO_USER } from '../api/mock'
import { ApiError } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { Field } from '../components/Field'

type Mode = 'login' | 'register'

export function LoginPage() {
  const api = useApi()
  const { token, login } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const [sending, setSending] = useState(false)

  if (token) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSending(true)
    try {
      if (mode === 'register') await api.register({ email, full_name: fullName, password })
      await login(email, password)
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'Error inesperado'))
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="auth">
      <div className="auth-card">
        <h1>✅ Tareas</h1>
        <p className="muted">Organiza tus proyectos y tareas.</p>

        {DEMO_MODE && (
          <div className="demo-box">
            <p><strong>Modo demo:</strong> los datos se guardan solo en tu navegador.</p>
            <button type="button" className="btn small" onClick={() => { setMode('login'); setEmail(DEMO_USER.email); setPassword(DEMO_USER.password) }}>
              Usar la cuenta de prueba
            </button>
          </div>
        )}

        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => { setMode('login'); setError(null) }}>Entrar</button>
          <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => { setMode('register'); setError(null) }}>Crear cuenta</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {mode === 'register' && (
            <Field label="Nombre" error={error?.fields.full_name}>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
            </Field>
          )}
          <Field label="Email" error={error?.fields.email}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label="Contraseña" error={error?.fields.password} hint={mode === 'register' ? 'Mínimo 8 caracteres' : undefined}>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </Field>
          {error && !Object.keys(error.fields).length && <p className="form-error" role="alert">{error.message}</p>}
          <button type="submit" className="btn primary" disabled={sending}>
            {sending ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta y entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}
