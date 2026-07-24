import { chromium, FullConfig } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.test manually (avoids adding a dotenv dep). Lines like KEY=value.
// __dirname can be misleading under ts-node — search upward for the file.
function loadEnvTest() {
  const candidates = [
    resolve(process.cwd(), '.env.test'),
    resolve(process.cwd(), 'frontend', '.env.test'),
    resolve(__dirname, '..', '.env.test'),
  ]
  for (const envPath of candidates) {
    try {
      const contents = readFileSync(envPath, 'utf8')
      for (const line of contents.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const idx = trimmed.indexOf('=')
        if (idx === -1) continue
        const key = trimmed.slice(0, idx).trim()
        const value = trimmed.slice(idx + 1).trim()
        process.env[key] = value
      }
      return envPath
    } catch {
      // try next candidate
    }
  }
  return null
}

const loadedFrom = loadEnvTest()
if (loadedFrom) {
  console.log(`[orbit] loaded env from ${loadedFrom}`)
}

/**
 * Logs in once and saves the authenticated session to tests/.auth/storage.json.
 * Every spec inherits that state (see playwright.config.ts use.storageState).
 *
 * Credentials come from env:
 *   ORBIT_TEST_USER     (default: "Administrator")
 *   ORBIT_TEST_PASSWORD (default: "admin")
 *   ORBIT_BASE_URL      (default: "http://localhost:6003")
 *
 * Put real credentials in frontend/.env.test (gitignored). Never commit.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = process.env.ORBIT_BASE_URL || 'http://localhost:6003'
  const user = process.env.ORBIT_TEST_USER || 'Administrator'
  const password = process.env.ORBIT_TEST_PASSWORD || 'admin'
  const storagePath = 'tests/.auth/storage.json'

  await mkdir(dirname(storagePath), { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  // Hit Frappe's login API directly — faster and more reliable than filling the UI form.
  const res = await page.request.post(`${baseURL}/api/method/login`, {
    form: { usr: user, pwd: password },
  })

  if (!res.ok()) {
    await browser.close()
    throw new Error(
      `Orbit test login failed (HTTP ${res.status()}). ` +
        `Set ORBIT_TEST_USER / ORBIT_TEST_PASSWORD in frontend/.env.test.`,
    )
  }

  // Warm the SPA so the boot cookies are in place.
  await page.goto(`${baseURL}/orbit`)

  await context.storageState({ path: storagePath })
  await browser.close()
}
