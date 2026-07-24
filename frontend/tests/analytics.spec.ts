import { test, expect, APIRequestContext, Page } from '@playwright/test'

const BASE = process.env.ORBIT_BASE_URL || 'http://127.0.0.1:6003'

/**
 * Analytics is a workspace-wide dashboard that aggregates tasks across every
 * project the current user can see. Cleanup leans on the existing seed
 * helpers in orbit/tests/seed.py (cleanup_test_tasks, cleanup_test_projects);
 * any seeded task has subject prefix `PW ` and lives on a project whose name
 * prefix is `PW `, so repeated runs are idempotent.
 *
 * Mutating REST calls (POST) need a CSRF token. We grab it from the SPA's
 * boot payload (window.csrf_token) once per test, then pass it in the
 * `X-Frappe-CSRF-Token` header on subsequent POSTs.
 */

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

async function getCsrfToken(page: Page): Promise<string> {
  await page.goto(`${BASE}/orbit`)
  // The SPA writes window.csrf_token at boot (via get_context_for_dev).
  const token = await page.evaluate(
    () => (window as unknown as { csrf_token?: string }).csrf_token || '',
  )
  expect(token, 'expected window.csrf_token to be set').toBeTruthy()
  return token
}

async function listWorkflowStates(request: APIRequestContext, project: string) {
  const res = await request.get(
    `${BASE}/api/method/frappe.client.get_list` +
      `?doctype=${encodeURIComponent('Orbit Workflow State')}` +
      `&filters=${encodeURIComponent(JSON.stringify([['project', '=', project]]))}` +
      `&fields=${encodeURIComponent(JSON.stringify(['name', 'state_name', 'status_group', 'is_default']))}` +
      `&limit_page_length=50`,
  )
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  return body.message as Array<{
    name: string
    state_name: string
    status_group: string
    is_default: number
  }>
}

async function createTask(
  request: APIRequestContext,
  csrfToken: string,
  payload: {
    subject: string
    project: string
    priority?: string
    orbit_workflow_state?: string
    exp_end_date?: string
  },
) {
  const res = await request.post(`${BASE}/api/method/frappe.client.insert`, {
    headers: { 'X-Frappe-CSRF-Token': csrfToken },
    form: {
      doc: JSON.stringify({
        doctype: 'Task',
        status: 'Open',
        ...payload,
      }),
    },
  })
  if (!res.ok()) {
    const text = await res.text()
    throw new Error(
      `insert Task failed (HTTP ${res.status()}): ${text.slice(0, 300)}`,
    )
  }
  const body = await res.json()
  return body.message.name as string
}

test.describe('Analytics — full-stack', () => {
  test.beforeEach(async ({ request }) => {
    await cleanTestTasks(request)
    await cleanTestProjects(request)
  })

  test.afterEach(async ({ request }) => {
    await cleanTestTasks(request)
    await cleanTestProjects(request)
  })

  test('page renders the Analytics header', async ({ page }) => {
    // Can't assume an empty DB — the current user may have real tasks. Only
    // assert the page loads and the header renders. Seeded-data assertions
    // live in the next test.
    await page.goto('/orbit/analytics')
    await expect(
      page.getByRole('heading', { name: 'Analytics', exact: true }),
    ).toBeVisible()
  })

  test('renders all 4 stat tiles and 4 chart cards with seeded data', async ({
    page,
    request,
  }) => {
    const csrf = await getCsrfToken(page)

    // Project creation fires the after_insert hook which seeds the 5 default
    // workflow states (Backlog/Todo/In Progress/Done/Cancelled).
    const projectId = await seedProject(request, 'PW Analytics Seed', 'PWA')
    const states = await listWorkflowStates(request, projectId)
    const todo = states.find((s) => s.status_group === 'Unstarted')
    const done = states.find((s) => s.status_group === 'Completed')
    const cancelled = states.find((s) => s.status_group === 'Cancelled')
    expect(todo, 'expected an Unstarted workflow state').toBeTruthy()
    expect(done, 'expected a Completed workflow state').toBeTruthy()
    expect(cancelled, 'expected a Cancelled workflow state').toBeTruthy()

    // 2 open + 1 overdue (all Todo) + 1 completed + 1 cancelled.
    await createTask(request, csrf, {
      subject: 'PW A-open-1',
      project: projectId,
      priority: 'High',
      orbit_workflow_state: todo!.name,
    })
    await createTask(request, csrf, {
      subject: 'PW A-open-2',
      project: projectId,
      priority: 'Medium',
      orbit_workflow_state: todo!.name,
    })
    await createTask(request, csrf, {
      subject: 'PW A-overdue',
      project: projectId,
      priority: 'Urgent',
      orbit_workflow_state: todo!.name,
      exp_end_date: '2020-01-01',
    })
    await createTask(request, csrf, {
      subject: 'PW A-done',
      project: projectId,
      priority: 'Low',
      orbit_workflow_state: done!.name,
    })
    await createTask(request, csrf, {
      subject: 'PW A-cancel',
      project: projectId,
      priority: 'Low',
      orbit_workflow_state: cancelled!.name,
    })

    await page.goto('/orbit/analytics')

    // Stat tiles (by test-id)
    await expect(page.getByTestId('stat-total')).toBeVisible()
    await expect(page.getByTestId('stat-open')).toBeVisible()
    await expect(page.getByTestId('stat-completed')).toBeVisible()
    await expect(page.getByTestId('stat-overdue')).toBeVisible()

    // Values reflect the seed. Use `>=` rather than exact equality because
    // the authenticated user may already have tasks from other test files or
    // real use — Analytics is workspace-wide.
    await expect(page.getByTestId('stat-total-value')).not.toHaveText('0')

    const openVal = await page.getByTestId('stat-open-value').innerText()
    const completedVal = await page
      .getByTestId('stat-completed-value')
      .innerText()
    const overdueVal = await page.getByTestId('stat-overdue-value').innerText()
    expect(Number(openVal.replace(/,/g, ''))).toBeGreaterThanOrEqual(3)
    expect(Number(completedVal.replace(/,/g, ''))).toBeGreaterThanOrEqual(1)
    expect(Number(overdueVal.replace(/,/g, ''))).toBeGreaterThanOrEqual(1)

    // Chart cards
    await expect(page.getByTestId('chart-status')).toBeVisible()
    await expect(page.getByTestId('chart-priority')).toBeVisible()
    await expect(page.getByTestId('chart-trend')).toBeVisible()
    await expect(page.getByTestId('chart-assignees')).toBeVisible()

    // ApexCharts mounts an SVG inside each card once data arrives. Assignees
    // may be empty (no users assigned in the seed), so we only enforce SVG
    // on the three that always have data.
    await expect(
      page.getByTestId('chart-status').locator('svg').first(),
    ).toBeVisible()
    await expect(
      page.getByTestId('chart-priority').locator('svg').first(),
    ).toBeVisible()
    await expect(
      page.getByTestId('chart-trend').locator('svg').first(),
    ).toBeVisible()
  })

  test('analytics page never uses "work item"', async ({ page, request }) => {
    const csrf = await getCsrfToken(page)
    const projectId = await seedProject(request, 'PW Analytics Copy', 'PWAC')
    const states = await listWorkflowStates(request, projectId)
    const todo = states.find((s) => s.status_group === 'Unstarted')
    await createTask(request, csrf, {
      subject: 'PW A-copy',
      project: projectId,
      priority: 'Medium',
      orbit_workflow_state: todo!.name,
    })

    await page.goto('/orbit/analytics')
    await expect(
      page.getByRole('heading', { name: 'Analytics', exact: true }),
    ).toBeVisible()
    const body = page.locator('body')
    await expect(body).not.toContainText(/work item/i)
  })
})
