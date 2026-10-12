import { defineConfig, devices } from '@playwright/test'

/**
 * Tests end-to-end contra la API REAL (repositorio api-tareas-fastapi).
 * Requieren la API arrancada en API_URL (por defecto http://localhost:8000).
 * El frontend se compila apuntando a esa API y se sirve con `vite preview`.
 */
const API_URL = process.env.API_URL ?? 'http://localhost:8000'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4174', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `VITE_API_URL=${API_URL} npm run build -- --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4174 --strictPort`,
    url: 'http://localhost:4174',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
