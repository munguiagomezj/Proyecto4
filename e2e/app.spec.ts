import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Cada test crea su propio usuario, así no dependen unos de otros ni del estado de la base de datos.
async function registrarYEntrar(page: Page) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
  await page.goto('/')
  await expect(page.getByText('Modo demo')).toHaveCount(0) // se está usando la API real
  await page.getByRole('tab', { name: 'Crear cuenta' }).click()
  await page.getByLabel('Nombre').fill('Prueba E2E')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Contraseña').fill('secreto123')
  await page.getByRole('button', { name: 'Crear cuenta y entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Todas las tareas' })).toBeVisible()
  return email
}

test('flujo completo contra la API real', async ({ page }) => {
  await registrarYEntrar(page)
  await expect(page.getByText('Crea un proyecto en la barra lateral para empezar.')).toBeVisible()

  await page.getByLabel('Nombre del nuevo proyecto').fill('Feria de empleo')
  await page.getByRole('button', { name: 'Añadir' }).click()
  await expect(page.getByRole('heading', { name: 'Feria de empleo' })).toBeVisible()

  for (const [titulo, prioridad, etiquetas] of [
    ['Actualizar el CV', 'high', 'cv'],
    ['Imprimir tarjetas', 'low', 'feria'],
    ['Preparar el pitch', 'medium', 'feria, pitch'],
  ]) {
    await page.getByRole('button', { name: '+ Nueva tarea' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Título').fill(titulo)
    await dialog.getByLabel('Prioridad').selectOption(prioridad)
    await dialog.getByLabel('Etiquetas').fill(etiquetas)
    await dialog.getByRole('button', { name: 'Guardar' }).click()
    await expect(dialog).toBeHidden()
  }
  const tareas = page.getByRole('list', { name: 'Tareas' }).getByRole('listitem')
  await expect(tareas).toHaveCount(3)

  // Completar una tarea: la API rellena completed_at y las estadísticas se actualizan.
  await page.getByRole('checkbox', { name: 'Marcar «Actualizar el CV» como hecha' }).click()
  await expect(page.getByRole('checkbox', { name: 'Marcar «Actualizar el CV» como pendiente' })).toBeChecked()
  await expect(page.getByLabel('Resumen de tus tareas')).toContainText('33 %')

  // Filtros que resuelve la API: etiqueta, orden por prioridad y búsqueda.
  await page.getByRole('button', { name: 'Filtrar por etiqueta feria' }).first().click()
  await expect(tareas).toHaveCount(2)
  await page.getByLabel('Ordenar por').selectOption('priority')
  await expect(tareas.first()).toContainText('Preparar el pitch')
  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await page.getByLabel('Buscar en título y descripción').fill('tarjetas')
  await expect(tareas).toHaveCount(1)

  // Al recargar, la sesión y los filtros de la URL se mantienen.
  await page.reload()
  await expect(tareas).toHaveCount(1)
})

test('la API rechaza datos no válidos y se muestran en el formulario', async ({ page }) => {
  await registrarYEntrar(page)
  await page.getByLabel('Nombre del nuevo proyecto').fill('Proyecto')
  await page.getByRole('button', { name: 'Añadir' }).click()
  await page.getByRole('button', { name: '+ Nueva tarea' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('dialog').getByLabel('Título')).toHaveAttribute('aria-invalid', 'true')
})

test('credenciales incorrectas y cierre de sesión', async ({ page }) => {
  const email = await registrarYEntrar(page)
  await page.getByRole('button', { name: 'Salir' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Contraseña').fill('incorrecta')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert')).toHaveText('Email o contraseña incorrectos')
})
