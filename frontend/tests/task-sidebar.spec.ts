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

async function readTaskField(
  request: APIRequestContext,
  task: string,
  field: string,
): Promise<string> {
  const res = await request.get(
    `${BASE}/api/method/frappe.client.get_value?doctype=Task` +
      `&filters=${encodeURIComponent(JSON.stringify({ name: task }))}` +
      `&fieldname=${encodeURIComponent(JSON.stringify([field]))}`,
  )
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  return (body.message?.[field] ?? '') as string
}

async function gotoTask(page: Page, projectId: string, taskId: string) {
  await page.goto(
    `/orbit/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
  )
  await expect(page.getByTestId('task-tabs')).toBeVisible()
}

test.describe('Task detail sidebar — editable fields', () => {
  test.beforeEach(async ({ request }) => {
    await cleanTestTasks(request)
    await cleanTestProjects(request)
  })
  test.afterEach(async ({ request }) => {
    await cleanTestTasks(request)
    await cleanTestProjects(request)
  })

  test('start date and due date pickers are present and accept values', async ({
    page,
    request,
  }) => {
    const project = await seedProject(request, 'PW sidebar dates', 'PWSD')
    const task = await seedTask(request, project, 'PW sidebar dates task')
    await gotoTask(page, project, task)

    // DatePicker (frappe-ui) exposes a TextInput with allowCustom=true, so we
    // can type the ISO date and press Enter to commit.
    const startInput = page.getByTestId('sidebar-start-date').getByRole('textbox')
    const dueInput = page.getByTestId('sidebar-due-date').getByRole('textbox')
    await expect(startInput).toBeVisible()
    await expect(dueInput).toBeVisible()

    await startInput.click()
    await startInput.fill('2026-05-01')
    await startInput.press('Enter')
    await expect
      .poll(() => readTaskField(request, task, 'exp_start_date'))
      .toContain('2026-05-01')

    await dueInput.click()
    await dueInput.fill('2026-06-15')
    await dueInput.press('Enter')
    await expect
      .poll(() => readTaskField(request, task, 'exp_end_date'))
      .toContain('2026-06-15')
  })

  test('reporter popover sets reporter and persists', async ({
    page,
    request,
  }) => {
    const project = await seedProject(request, 'PW sidebar reporter', 'PWSR')
    const task = await seedTask(request, project, 'PW sidebar reporter task')
    await gotoTask(page, project, task)

    await page.getByTestId('sidebar-reporter-trigger').click()
    // The popover renders a search input and user rows — grab the row for
    // our seeded tester user (deterministic across environments).
    await page.waitForSelector('input[placeholder="Search users…"]')
    await page.fill('input[placeholder="Search users…"]', 'Orbit Tester')
    await page
      .getByRole('button')
      .filter({ hasText: 'Orbit Tester' })
      .first()
      .click()

    await expect
      .poll(() => readTaskField(request, task, 'orbit_reporter'))
      .toBe('orbit-tester@example.com')
  })

  test('assignees: pick a user, _assign persists on the task', async ({
    page,
    request,
  }) => {
    const project = await seedProject(request, 'PW sidebar assign', 'PWSA')
    const task = await seedTask(request, project, 'PW sidebar assign task')

    // Capture console + network failures for diagnosis.
    page.on('console', (msg) => {
      if (msg.type() === 'error')
        // eslint-disable-next-line no-console
        console.log('[page error]', msg.text())
    })
    page.on('pageerror', (err) => console.log('[page exception]', err.message))
    page.on('response', async (r) => {
      if (r.url().includes('assign_to')) {
        const body = await r.text().catch(() => '')
        console.log('[assign_to resp]', r.status(), body.slice(0, 400))
      }
    })
    page.on('request', (r) => {
      if (r.url().includes('assign_to')) {
        console.log('[assign_to req]', r.method(), r.postData())
      }
    })

    await gotoTask(page, project, task)

    // frappe-ui Autocomplete: click the trigger, type in the combobox input,
    // then pick the option.
    const trigger = page
      .getByTestId('sidebar-assignees')
      .getByRole('button')
      .first()
    await trigger.click()
    const combo = page.getByRole('combobox')
    await combo.fill('Orbit Tester')
    await page.getByRole('option', { name: /Orbit Tester/ }).first().click()

    await expect
      .poll(() => readTaskField(request, task, '_assign'), { timeout: 8000 })
      .toContain('orbit-tester@example.com')

    // The UI must reflect it too. `frappe.client.get` omits `_assign`, so the
    // page fetches it separately — without that, the backend write succeeded
    // but the trigger stayed on "Unassigned" forever.
    await expect(trigger).toContainText('Orbit Tester', { timeout: 8000 })

    // And deselecting must actually unassign — impossible while the page
    // believed the current assignee list was empty.
    await page.getByRole('option', { name: /Orbit Tester/ }).first().click()
    await expect
      .poll(() => readTaskField(request, task, '_assign'), { timeout: 8000 })
      .not.toContain('orbit-tester@example.com')
  })

  test('labels: type a label, hit Enter, it appears in the chip and persists', async ({
    page,
    request,
  }) => {
    const project = await seedProject(request, 'PW sidebar labels', 'PWSL')
    const task = await seedTask(request, project, 'PW sidebar labels task')
    await gotoTask(page, project, task)

    await page.getByTestId('sidebar-labels-trigger').click()
    const input = page.getByTestId('sidebar-labels-input')
    await input.fill('frontend')
    await input.press('Enter')
    await input.fill('urgent')
    await input.press('Enter')

    await expect
      .poll(() => readTaskField(request, task, 'orbit_labels'))
      .toContain('frontend')
    await expect
      .poll(() => readTaskField(request, task, 'orbit_labels'))
      .toContain('urgent')
  })
})
