import { test, expect, APIRequestContext } from '@playwright/test'

const BASE = process.env.ORBIT_BASE_URL || 'http://127.0.0.1:6003'

async function cleanTestTasks(request: APIRequestContext) {
  await request.get(
    `${BASE}/api/method/orbit.tests.seed.cleanup_test_tasks?prefix=${encodeURIComponent('PW ')}`,
  )
}
async function cleanTestProjects(request: APIRequestContext) {
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

test.describe('Tasks tab — full-stack', () => {
  test.beforeEach(async ({ request }) => {
    await cleanTestTasks(request)
    await cleanTestProjects(request)
  })

  test.afterEach(async ({ request }) => {
    await cleanTestTasks(request)
    await cleanTestProjects(request)
  })

  test('tasks tab shows empty state on a new project', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(request, 'PW Tasks Empty', 'PWE')
    await page.goto(`/orbit/projects/${encodeURIComponent(projectId)}/tasks`)
    await expect(
      page.getByRole('heading', { name: 'No tasks yet' }),
    ).toBeVisible()
  })

  test('create a task via the Create task dialog', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(request, 'PW Tasks Create', 'PWC')
    await page.goto(`/orbit/projects/${encodeURIComponent(projectId)}/tasks`)

    await page.getByTestId('tasks-create-btn').click()

    // Title input is borderless — locate by placeholder
    await page.getByPlaceholder('Title').fill('PW First Task')
    await page
      .getByRole('button', { name: 'Create task', exact: true })
      .click()

    // Dialog closes; task appears in the flat list with its display ID.
    await expect(
      page.getByRole('button', { name: 'Create task', exact: true }),
    ).toHaveCount(0)

    const list = page.getByTestId('tasks-list')
    await expect(list).toContainText('PW First Task')
    await expect(list).toContainText('PWC-T1')
  })

  test('task list uses the word "tasks", never "work items"', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(request, 'PW Tasks Copy', 'PWCP')
    await page.goto(`/orbit/projects/${encodeURIComponent(projectId)}/tasks`)

    // Create one task so the list header renders
    await page.getByTestId('tasks-create-btn').click()
    await page.getByPlaceholder('Title').fill('PW Anchor')
    await page
      .getByRole('button', { name: 'Create task', exact: true })
      .click()

    // Page uses "Tasks" / "New task", never "work item(s)"
    const main = page.locator('main')
    await expect(main).toContainText('Tasks')
    await expect(main).toContainText('New task')
    await expect(main).not.toContainText(/work item/i)
  })

  test('display ID increments per project', async ({ page, request }) => {
    const projectId = await seedProject(request, 'PW Tasks Counter', 'PWCT')
    await page.goto(`/orbit/projects/${encodeURIComponent(projectId)}/tasks`)

    for (const n of [1, 2, 3]) {
      await page.getByTestId('tasks-create-btn').click()
      await page.getByPlaceholder('Title').fill(`PW Counter Task ${n}`)
      await page
        .getByRole('button', { name: 'Create task', exact: true })
        .click()
      await expect(
        page.getByRole('button', { name: 'Create task', exact: true }),
      ).toHaveCount(0)
    }

    const list = page.getByTestId('tasks-list')
    await expect(list).toContainText('PWCT-T1')
    await expect(list).toContainText('PWCT-T2')
    await expect(list).toContainText('PWCT-T3')
  })
})
