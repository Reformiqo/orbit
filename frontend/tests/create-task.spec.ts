import { test, expect, APIRequestContext, Page } from '@playwright/test'

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
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  return body.message as string
}

async function gotoTasksTab(page: Page, projectId: string) {
  await page.goto(`/orbit/projects/${encodeURIComponent(projectId)}/tasks`)
  await expect(page.getByTestId('tasks-create-btn')).toBeVisible()
}

async function readLastTaskField(
  request: APIRequestContext,
  project: string,
  field: string,
) {
  const res = await request.get(
    `${BASE}/api/method/frappe.client.get_list` +
      `?doctype=Task` +
      `&filters=${encodeURIComponent(JSON.stringify({ project }))}` +
      `&fields=${encodeURIComponent(JSON.stringify(['name', field, '_assign']))}` +
      `&order_by=creation+desc&limit_page_length=1`,
  )
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  const rows = body.message as any[]
  return rows[0] || null
}

test.describe('Create task dialog — new fields', () => {
  test.beforeEach(async ({ request }) => {
    await cleanTestTasks(request)
    await cleanTestProjects(request)
  })
  test.afterEach(async ({ request }) => {
    await cleanTestTasks(request)
    await cleanTestProjects(request)
  })

  test('creates task with labels (comma-separated, persists to orbit_labels)', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(request, 'PW Create', 'PWCR')

    await gotoTasksTab(page, projectId)
    await page.getByTestId('tasks-create-btn').click()

    await page.locator('input[placeholder="Title"]').fill('PW C Label task')

    await page.getByTestId('create-task-labels').click()
    const labelInput = page.getByTestId('create-task-labels-input')
    await labelInput.fill('frontend')
    await labelInput.press('Enter')
    await labelInput.fill('urgent')
    await labelInput.press('Enter')
    // Close popover by clicking the title field
    await page.locator('input[placeholder="Title"]').click()

    await page.getByRole('button', { name: 'Create task' }).click()

    await expect
      .poll(async () => {
        const row = await readLastTaskField(request, projectId, 'orbit_labels')
        return row?.orbit_labels || ''
      })
      .toContain('frontend')
    await expect
      .poll(async () => {
        const row = await readLastTaskField(request, projectId, 'orbit_labels')
        return row?.orbit_labels || ''
      })
      .toContain('urgent')
  })
})
