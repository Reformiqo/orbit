import { test, expect, APIRequestContext } from '@playwright/test'

const BASE = process.env.ORBIT_BASE_URL || 'http://127.0.0.1:6003'

async function cleanProjects(request: APIRequestContext) {
  await request.get(
    `${BASE}/api/method/orbit.tests.seed.cleanup_test_projects?prefix=${encodeURIComponent('PW ')}`,
  )
}

async function seedProject(
  request: APIRequestContext,
  name: string,
  identifier: string,
) {
  const res = await request.get(
    `${BASE}/api/method/orbit.tests.seed.seed_test_project` +
      `?project_name=${encodeURIComponent(name)}` +
      `&identifier=${identifier}&workspace=default`,
  )
  expect(res.ok()).toBeTruthy()
  return (await res.json()).message as string
}

test.describe('Project tab navigation', () => {
  test.beforeEach(async ({ request }) => cleanProjects(request))
  test.afterEach(async ({ request }) => cleanProjects(request))

  // Regression: the router-view was keyed by full path, so every tab click
  // remounted ProjectDetail — the header title flashed back to the raw project
  // id (and refetched) before the name returned. Keying by project id fixes it.
  test('header title stays the name when switching tabs (no id flash)', async ({
    page,
    request,
  }) => {
    const name = 'PW tab nav project'
    const id = await seedProject(request, name, 'PWTN')

    await page.goto(`/orbit/projects/${id}/overview`)
    const title = page.getByRole('heading').first()
    await expect(title).toHaveText(name, { timeout: 10000 })

    for (const tab of ['Tasks', 'Modules', 'Milestones', 'Overview']) {
      await page.getByRole('navigation').getByText(tab, { exact: true }).click()
      // Sample the title repeatedly through the switch — it must never become
      // the raw id or show a loading state.
      for (let i = 0; i < 5; i++) {
        const t = (await title.textContent())?.trim()
        expect(t, `after clicking ${tab}`).toBe(name)
        expect(t).not.toContain(id)
      }
      await expect(page.getByText('Loading project…')).toHaveCount(0)
    }
  })
})
