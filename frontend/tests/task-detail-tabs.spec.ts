import { test, expect, APIRequestContext, Page } from '@playwright/test'

const BASE = process.env.ORBIT_BASE_URL || 'http://127.0.0.1:6003'
const FILE_PREFIX = 'pw-test-'

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
async function cleanTestFiles(request: APIRequestContext) {
  await request.get(
    `${BASE}/api/method/orbit.tests.seed.cleanup_test_files?prefix=${encodeURIComponent(FILE_PREFIX)}`,
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

async function seedStateChange(
  request: APIRequestContext,
  task: string,
  state: string,
) {
  const res = await request.get(
    `${BASE}/api/method/orbit.tests.seed.seed_task_state_change` +
      `?task=${encodeURIComponent(task)}` +
      `&state=${encodeURIComponent(state)}`,
  )
  expect(res.ok()).toBeTruthy()
}

async function seedComment(
  request: APIRequestContext,
  task: string,
  content: string,
) {
  const res = await request.get(
    `${BASE}/api/method/orbit.tests.seed.seed_task_comment` +
      `?task=${encodeURIComponent(task)}` +
      `&content=${encodeURIComponent(content)}`,
  )
  expect(res.ok()).toBeTruthy()
}

async function listWorkflowStates(
  request: APIRequestContext,
  project: string,
) {
  const res = await request.get(
    `${BASE}/api/method/frappe.client.get_list` +
      `?doctype=${encodeURIComponent('Orbit Workflow State')}` +
      `&filters=${encodeURIComponent(JSON.stringify([['project', '=', project]]))}` +
      `&fields=${encodeURIComponent(JSON.stringify(['name', 'state_name', 'status_group']))}` +
      `&limit_page_length=50`,
  )
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  return body.message as Array<{
    name: string
    state_name: string
    status_group: string
  }>
}

async function seedVersion(
  request: APIRequestContext,
  task: string,
  field: string,
  oldValue: string,
  newValue: string,
) {
  const res = await request.get(
    `${BASE}/api/method/orbit.tests.seed.seed_task_version` +
      `?task=${encodeURIComponent(task)}` +
      `&field=${encodeURIComponent(field)}` +
      `&old_value=${encodeURIComponent(oldValue)}` +
      `&new_value=${encodeURIComponent(newValue)}`,
  )
  expect(res.ok()).toBeTruthy()
}

async function gotoTask(page: Page, projectId: string, taskId: string) {
  await page.goto(
    `/orbit/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
  )
  // Wait for the task detail page to finish loading.
  await expect(page.getByTestId('task-tabs')).toBeVisible()
}

test.describe('Task detail bottom tabs', () => {
  test.beforeEach(async ({ request }) => {
    await cleanTestFiles(request)
    await cleanTestTasks(request)
    await cleanTestProjects(request)
  })

  test.afterEach(async ({ request }) => {
    await cleanTestFiles(request)
    await cleanTestTasks(request)
    await cleanTestProjects(request)
  })

  test('Attachments: empty state, upload, and delete', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(request, 'PW Tabs Attach', 'PWAT')
    const taskId = await seedTask(request, projectId, 'PW Attach Task')
    await gotoTask(page, projectId, taskId)

    await page.getByRole('button', { name: 'Attachments' }).click()

    await expect(page.getByTestId('attachments-empty')).toBeVisible()
    await expect(page.getByTestId('attachments-empty')).toContainText(
      'No attachments yet',
    )

    // Upload a small text file via the hidden input.
    const fileName = `${FILE_PREFIX}note.txt`
    await page.getByTestId('attachments-file-input').setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from('hello orbit'),
    })

    // List row appears.
    const list = page.getByTestId('attachments-list')
    await expect(list).toBeVisible({ timeout: 10_000 })
    await expect(list).toContainText(fileName)

    // Delete (auto-confirm the browser confirm dialog).
    page.once('dialog', (d) => d.accept())
    await page.getByTestId('attachment-delete-btn').first().click()

    // Back to empty.
    await expect(page.getByTestId('attachments-empty')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Transitions: shows a moved-from/to entry after a state change', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(request, 'PW Tabs Trans', 'PWTR')
    const taskId = await seedTask(request, projectId, 'PW Trans Task')
    const states = await listWorkflowStates(request, projectId)
    const inProgress = states.find((s) => s.status_group === 'Started')
    expect(inProgress).toBeTruthy()

    // Force a state change + Version record via the dev seed helper.
    await seedStateChange(request, taskId, inProgress!.name)

    await gotoTask(page, projectId, taskId)
    await page.getByRole('button', { name: 'Transitions' }).click()

    const list = page.getByTestId('transitions-list')
    await expect(list).toBeVisible({ timeout: 10_000 })
    await expect(list).toContainText('moved from')
    await expect(list).toContainText('to')
    await expect(list).toContainText(inProgress!.state_name)
  })

  test('History: merges Version + Comment in descending order', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(request, 'PW Tabs Hist', 'PWHI')
    const taskId = await seedTask(request, projectId, 'PW Hist Task')

    // 1. Field change first (→ Version record)
    await seedVersion(request, taskId, 'priority', 'Medium', 'High')
    // small gap to make ordering deterministic (creation resolution = 1s)
    await new Promise((r) => setTimeout(r, 1100))
    // 2. Comment second (should appear above the Version entry)
    await seedComment(request, taskId, 'PW hello from the test')

    await gotoTask(page, projectId, taskId)
    await page.getByRole('button', { name: 'History' }).click()

    const list = page.getByTestId('history-list')
    await expect(list).toBeVisible({ timeout: 10_000 })

    // Both entries appear.
    await expect(list).toContainText('PW hello from the test')
    await expect(list).toContainText('changed')

    // Descending: comment (newer) appears before the Version entry.
    const html = await list.innerHTML()
    const commentIdx = html.indexOf('PW hello from the test')
    const changedIdx = html.indexOf('changed')
    expect(commentIdx).toBeGreaterThanOrEqual(0)
    expect(changedIdx).toBeGreaterThanOrEqual(0)
    expect(commentIdx).toBeLessThan(changedIdx)
  })
})
