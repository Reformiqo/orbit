import { test, expect, APIRequestContext } from '@playwright/test'

async function cleanTestProjects(request: APIRequestContext, baseURL: string) {
  const res = await request.get(
    `${baseURL}/api/method/orbit.tests.seed.cleanup_test_projects?prefix=${encodeURIComponent('PW ')}`,
  )
  if (!res.ok()) {
    console.warn(`[clean projects] HTTP ${res.status()}`)
  }
}

test.describe('Projects — full-stack', () => {
  const baseURL = process.env.ORBIT_BASE_URL || 'http://127.0.0.1:6003'

  test.beforeEach(async ({ request }) => {
    await cleanTestProjects(request, baseURL)
  })

  test.afterEach(async ({ request }) => {
    await cleanTestProjects(request, baseURL)
  })

  test('projects list renders without error', async ({ page }) => {
    // Can't assert empty state here because the user may have real projects
    // in the DB. Just verify the page header renders and the Create button is
    // reachable (proves the route, store, and perms all work).
    await page.goto('/orbit/projects')
    await expect(
      page.getByRole('heading', { name: 'Projects', exact: true }),
    ).toBeVisible()
    await expect(page.getByTestId('projects-create-btn')).toBeVisible()
  })

  test('create project via sidebar + button', async ({ page }) => {
    await page.goto('/orbit')

    // Click the + button in the Projects sidebar section
    await page.getByTestId('sidebar-create-project').click()

    await expect(
      page.getByRole('heading', { name: 'Create project' }),
    ).toBeVisible()

    // Fill name — identifier auto-derives (capped at 10 chars)
    await page.getByLabel('Project name').fill('PW Mobile App')
    await expect(page.getByLabel('Identifier')).toHaveValue('PWMOBILEAP')

    // Override identifier to something shorter
    await page.getByLabel('Identifier').fill('MOBILE')

    await page.getByRole('button', { name: 'Create project' }).click()

    // Modal closes, sidebar shows the new project
    await expect(
      page.getByRole('heading', { name: 'Create project' }),
    ).toHaveCount(0)

    const newRow = page
      .getByTestId('sidebar-project-row')
      .filter({ hasText: 'PW Mobile App' })
    await expect(newRow).toBeVisible()
    await expect(newRow).toContainText('MOBILE')

    // Projects index page also shows it
    await page.goto('/orbit/projects')
    await expect(
      page
        .getByTestId('projects-list')
        .getByText('PW Mobile App'),
    ).toBeVisible()
  })

  test('identifier validation rejects lowercase/invalid', async ({ page }) => {
    await page.goto('/orbit')
    await page.getByTestId('sidebar-create-project').click()

    await page.getByLabel('Project name').fill('PW Bad Ident')
    await page.getByLabel('Identifier').fill('1BAD')
    await page.getByRole('button', { name: 'Create project' }).click()

    await expect(page.getByRole('alert')).toContainText(
      /Identifier must be/i,
    )
  })

  test('open project detail and switch tabs', async ({ page, request }) => {
    // Seed a project via the developer-mode whitelisted helper (GET, no CSRF).
    const seedRes = await request.get(
      `${baseURL}/api/method/orbit.tests.seed.seed_test_project` +
        `?project_name=${encodeURIComponent('PW Detail Project')}` +
        `&identifier=DET&workspace=default`,
    )
    expect(seedRes.ok()).toBeTruthy()

    await page.goto('/orbit/projects')
    await page
      .getByTestId('projects-list')
      .getByText('PW Detail Project')
      .click()

    await expect(page).toHaveURL(/\/orbit\/projects\/[^/]+/)
    await expect(page.getByTestId('project-tabs')).toBeVisible()
    // Overview tab is the default — render its stat tiles.
    await expect(page.getByTestId('overview-stat-total')).toBeVisible()

    // Switch to Tasks tab — real grouped list should render (empty state for a
    // fresh project with no tasks).
    await page.getByRole('button', { name: 'Tasks', exact: true }).click()
    await expect(page).toHaveURL(/\/orbit\/projects\/[^/]+\/tasks$/)
    await expect(page.getByTestId('tasks-create-btn')).toBeVisible()

    // Switch to Pages tab — still a placeholder
    await page.getByRole('button', { name: 'Pages', exact: true }).click()
    await expect(page).toHaveURL(/\/orbit\/projects\/[^/]+\/pages$/)
  })
})
