import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import App from './App'
import { createMockClient, DEMO_USER, memoryStorage } from './api/mock'

function renderApp() {
  const api = createMockClient({ storage: memoryStorage() })
  render(<App api={api} />)
  return { user: userEvent.setup() }
}

async function loginAsDemo(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), DEMO_USER.email)
  await user.type(screen.getByLabelText('Contraseña'), DEMO_USER.password)
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
  return screen.findByRole('heading', { name: 'Todas las tareas' })
}

it('muestra un error con credenciales incorrectas', async () => {
  const { user } = renderApp()
  await user.type(screen.getByLabelText('Email'), DEMO_USER.email)
  await user.type(screen.getByLabelText('Contraseña'), 'incorrecta')
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos')
})

it('registro con errores por campo', async () => {
  const { user } = renderApp()
  await user.click(screen.getByRole('tab', { name: 'Crear cuenta' }))
  await user.type(screen.getByLabelText('Nombre'), 'Ana')
  await user.type(screen.getByLabelText('Email'), 'ana@example.com')
  await user.type(screen.getByLabelText('Contraseña'), 'corta')
  await user.click(screen.getByRole('button', { name: 'Crear cuenta y entrar' }))
  const password = screen.getByLabelText('Contraseña')
  await waitFor(() => expect(password).toHaveAttribute('aria-invalid', 'true'))
  expect(password).toHaveAccessibleDescription('Mínimo 8 caracteres')
})

it('flujo completo: entrar, crear una tarea, completarla y filtrar', async () => {
  const { user } = renderApp()
  await loginAsDemo(user)
  const list = await screen.findByRole('list', { name: 'Tareas' })
  expect(within(list).getAllByRole('listitem')).toHaveLength(10) // primera página

  await user.click(screen.getByRole('button', { name: '+ Nueva tarea' }))
  const dialog = await screen.findByRole('dialog', { name: 'Nueva tarea' })
  await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
  const titulo = within(dialog).getByLabelText('Título')
  await waitFor(() => expect(titulo).toHaveAccessibleDescription('Este campo es obligatorio'))
  await user.type(within(dialog).getByLabelText('Título'), 'Escribir carta de presentación')
  await user.selectOptions(within(dialog).getByLabelText('Prioridad'), 'high')
  await user.type(within(dialog).getByLabelText('Etiquetas'), 'CV, feria')
  await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

  const nueva = await screen.findByRole('button', { name: 'Escribir carta de presentación' })
  const item = nueva.closest('li')!
  expect(within(item).getByText('Alta')).toBeInTheDocument()
  expect(within(item).getByRole('button', { name: 'Filtrar por etiqueta cv' })).toBeInTheDocument()

  await user.click(within(item).getByRole('checkbox', { name: /como hecha/ }))
  await waitFor(() => expect(within(item).getByRole('checkbox')).toBeChecked())

  await user.click(within(item).getByRole('button', { name: 'Filtrar por etiqueta cv' }))
  await waitFor(() => expect(within(screen.getByRole('list', { name: 'Tareas' })).getAllByRole('listitem')).toHaveLength(2))
  expect(window.location.hash).toContain('tag=cv')
})

it('el filtro de vencidas y la barra lateral de proyectos', async () => {
  const { user } = renderApp()
  await loginAsDemo(user)
  await user.click(await screen.findByRole('checkbox', { name: 'Solo vencidas' }))
  await waitFor(() => expect(within(screen.getByRole('list', { name: 'Tareas' })).getAllByRole('listitem')).toHaveLength(2))

  await user.click(screen.getByRole('button', { name: /^Portfolio/ }))
  expect(await screen.findByRole('heading', { name: 'Portfolio' })).toBeInTheDocument()
  expect(await screen.findByText('No hay tareas con estos filtros.')).toBeInTheDocument()
})
