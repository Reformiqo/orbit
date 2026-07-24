import { test, expect, APIRequestContext } from '@playwright/test'

const BASE = process.env.ORBIT_BASE_URL || 'http://127.0.0.1:6003'

async function cleanTasks(request: APIRequestContext) {
  await request.get(
    `${BASE}/api/method/orbit.tests.seed.cleanup_test_tasks?prefix=${encodeURIComponent('PW ')}`,
  )
}
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
  const body = await res.json()
  return body.message as string
}

async function seedTask(
  request: APIRequestContext,
  project: string,
  subject: string,
) {
  const res = await request.get(
    `${BASE}/api/method/orbit.tests.seed.seed_test_task` +
      `?project=${encodeURIComponent(project)}` +
      `&subject=${encodeURIComponent(subject)}`,
  )
  if (!res.ok()) {
    const body = await res.text()
    throw new Error(
      `seed_test_task failed (HTTP ${res.status()}): ${body.slice(0, 500)}`,
    )
  }
  const body = await res.json()
  return body.message as string
}

test.describe('Project Overview tab', () => {
  test.beforeEach(async ({ request }) => {
    await cleanTasks(request)
    await cleanProjects(request)
  })

  test.afterEach(async ({ request }) => {
    await cleanTasks(request)
    await cleanProjects(request)
  })

  test('renders stats, state chart, and recent tasks list', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(request, 'PW Overview', 'PWO')
    for (let i = 1; i <= 3; i++) {
      await seedTask(request, projectId, `PW Overview Task ${i}`)
    }

    await page.goto(
      `/orbit/projects/${encodeURIComponent(projectId)}/overview`,
    )

    await expect(page.getByTestId('project-overview')).toBeVisible()
    // Stat tiles
    for (const id of [
      'overview-stat-total',
      'overview-stat-open',
      'overview-stat-done',
      'overview-stat-overdue',
    ]) {
      await expect(page.getByTestId(id)).toBeVisible()
    }
    // Total reflects the 3 seeded tasks.
    await expect(page.getByTestId('overview-stat-total-value')).toHaveText('3')

    // Chart card
    await expect(page.getByTestId('overview-chart-state')).toBeVisible()

    // Recent section shows seeded tasks
    await expect(page.getByTestId('overview-recent')).toContainText(
      'PW Overview Task 1',
    )

    // View all link points to the tasks tab
    const viewAll = page.getByTestId('overview-view-all')
    await expect(viewAll).toBeVisible()
    await viewAll.click()
    await expect(page).toHaveURL(/\/orbit\/projects\/[^/]+\/tasks$/)
  })

  test('Modules/Milestones/Views tabs render rich empty states', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(request, 'PW Empty States', 'PWES')

    await page.goto(
      `/orbit/projects/${encodeURIComponent(projectId)}/modules`,
    )
    await expect(page.getByTestId('project-modules-empty')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'No modules yet' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Create module/i }),
    ).toBeDisabled()

    await page.goto(
      `/orbit/projects/${encodeURIComponent(projectId)}/milestones`,
    )
    await expect(page.getByTestId('project-milestones-empty')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'No milestones yet' }),
    ).toBeVisible()

    await page.goto(
      `/orbit/projects/${encodeURIComponent(projectId)}/views`,
    )
    await expect(page.getByTestId('project-views-empty')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'No saved views yet' }),
    ).toBeVisible()
  })
})
