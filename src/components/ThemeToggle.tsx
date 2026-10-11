import { useState } from 'react'

type Theme = 'light' | 'dark'

function currentTheme(): Theme {
  const explicit = document.documentElement.dataset.theme
  if (explicit === 'light' || explicit === 'dark') return explicit
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme)
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('tareas:tema', next)
    } catch {
      /* sin persistencia */
    }
    setTheme(next)
  }
  return (
    <button type="button" className="btn icon" onClick={toggle} aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
