import { test, expect, APIRequestContext } from '@playwright/test'

// Clean workspaces created by these tests to keep runs idempotent.
// Uses a whitelisted orbit.tests.seed.cleanup_test_workspaces method — GET-callable
// so we don't fight CSRF on REST DELETE.
async function cleanTestWorkspaces(
  request: APIRequestContext,
  baseURL: string,
) {
  const res = await request.get(
    `${baseURL}/api/method/orbit.tests.seed.cleanup_test_workspaces?prefix=pw-`,
  )
  if (!res.ok()) {
    console.warn(`[clean] cleanup failed: HTTP ${res.status()}`)
  }
}

test.describe('Workspaces — full-stack', () => {
  const baseURL = process.env.ORBIT_BASE_URL || 'http://127.0.0.1:6003'

  test.beforeEach(async ({ request }) => {
    await cleanTestWorkspaces(request, baseURL)
  })

  test.afterEach(async ({ request }) => {
    await cleanTestWorkspaces(request, baseURL)
  })

  test('default workspace exists so onboarding is not blocking', async ({
    page,
  }) => {
    // The seed creates a "default" workspace, so the onboarding dialog must
    // NOT be shown. Sidebar + main content should be interactive.
    await page.goto('/orbit')
    await expect(
      page.getByRole('heading', { name: 'Welcome to Orbit' }),
    ).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Home' })).toBeVisible()
    // Regression: the dialog used to flash open during the first tick,
    // before the workspaces fetch had started. Re-assert after settling.
    await page.waitForTimeout(600)
    await expect(
      page.getByRole('heading', { name: 'Welcome to Orbit' }),
    ).toHaveCount(0)
  })

  test('create workspace via dialog and see it in the list', async ({
    page,
  }) => {
    await page.goto('/orbit/workspaces')

    await page.getByTestId('workspaces-create-btn').click()

    // Dialog opens
    await expect(
      page.getByRole('heading', { name: 'Create workspace' }),
    ).toBeVisible()

    // Fill the form — slug auto-derives from name
    await page.getByLabel('Workspace name').fill('PW Acme Inc.')
    await expect(page.getByLabel('URL slug')).toHaveValue('pw-acme-inc')

    await page.getByLabel('Icon (optional)').fill('🚀')
    await page
      .getByLabel('Description (optional)')
      .fill('Playwright seed workspace.')

    await page.getByRole('button', { name: 'Create workspace' }).click()

    // Row appears in the list
    await expect(page.getByTestId('workspaces-list')).toContainText(
      'PW Acme Inc.',
    )
    await expect(page.getByTestId('workspaces-list')).toContainText(
      'pw-acme-inc',
    )
  })

  test('slug validation blocks invalid input', async ({ page }) => {
    await page.goto('/orbit/workspaces')
    await page.getByTestId('workspaces-create-btn').click()

    await page.getByLabel('Workspace name').fill('PW Bad Slug')
    // Manually override slug to something invalid
    const slug = page.getByLabel('URL slug')
    await slug.fill('-starts-with-hyphen')

    await page.getByRole('button', { name: 'Create workspace' }).click()

    await expect(page.getByRole('alert')).toContainText(
      'Slug must be lowercase letters',
    )
  })
})
