import { cloneElement, useId } from 'react'
import type { ReactElement, ReactNode } from 'react'

interface Props {
  label: ReactNode
  error?: string
  hint?: string
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>
}

/**
 * Campo de formulario accesible: la etiqueta solo contiene su texto y el error o la pista
 * se asocian al control con aria-describedby, así los lectores de pantalla los anuncian aparte.
 */
export function Field({ label, error, hint, children }: Props) {
  const id = useId()
  const descId = `${id}-desc`
  const message = error ?? hint
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id, 'aria-invalid': !!error || undefined, 'aria-describedby': message ? descId : undefined })}
      {message && <span id={descId} className={error ? 'field-error' : 'muted small'}>{message}</span>}
    </div>
  )
}
