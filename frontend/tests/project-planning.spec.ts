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

async function seedModule(
  request: APIRequestContext,
  project: string,
  moduleName: string,
  opts: { status?: string; target_date?: string } = {},
) {
  const res = await request.get(
    `${BASE}/api/method/orbit.tests.seed.seed_test_module` +
      `?project=${encodeURIComponent(project)}` +
      `&module_name=${encodeURIComponent(moduleName)}` +
      `&status=${encodeURIComponent(opts.status || 'Planned')}` +
      `&target_date=${encodeURIComponent(opts.target_date || '')}`,
  )
  expect(res.ok()).toBeTruthy()
  return (await res.json()).message as string
}

async function seedMilestone(
  request: APIRequestContext,
  project: string,
  milestoneName: string,
  opts: { status?: string; target_date?: string } = {},
) {
  const res = await request.get(
    `${BASE}/api/method/orbit.tests.seed.seed_test_milestone` +
      `?project=${encodeURIComponent(project)}` +
      `&milestone_name=${encodeURIComponent(milestoneName)}` +
      `&status=${encodeURIComponent(opts.status || 'Planned')}` +
      `&target_date=${encodeURIComponent(opts.target_date || '')}`,
  )
  expect(res.ok()).toBeTruthy()
  return (await res.json()).message as string
}

async function seedTask(
  request: APIRequestContext,
  project: string,
  subject: string,
  opts: { isGroup?: boolean } = {},
) {
  const res = await request.get(
    `${BASE}/api/method/orbit.tests.seed.seed_test_task` +
      `?project=${encodeURIComponent(project)}` +
      `&subject=${encodeURIComponent(subject)}` +
      `&is_group=${opts.isGroup ? '1' : '0'}`,
  )
  expect(res.ok()).toBeTruthy()
  return (await res.json()).message as string
}

async function setTaskField(
  request: APIRequestContext,
  task: string,
  fieldname: string,
  value: string,
) {
  const res = await request.get(
    `${BASE}/api/method/orbit.tests.seed.set_task_field` +
      `?task=${encodeURIComponent(task)}` +
      `&fieldname=${fieldname}&value=${encodeURIComponent(value)}`,
  )
  expect(res.ok()).toBeTruthy()
}

async function stateNamed(
  request: APIRequestContext,
  project: string,
  stateName: string,
) {
  const res = await request.get(
    `${BASE}/api/method/orbit.tests.seed.list_project_states?project=${encodeURIComponent(project)}`,
  )
  expect(res.ok()).toBeTruthy()
  const states = (await res.json()).message as {
    name: string
    state_name: string
  }[]
  const match = states.find((s) => s.state_name === stateName)
  expect(match, `workflow state ${stateName} should exist`).toBeTruthy()
  return match!.name
}

async function countDocs(
  request: APIRequestContext,
  doctype: string,
  filters: Record<string, string>,
) {
  const res = await request.get(
    `${BASE}/api/method/frappe.client.get_count` +
      `?doctype=${encodeURIComponent(doctype)}` +
      `&filters=${encodeURIComponent(JSON.stringify(filters))}`,
  )
  expect(res.ok()).toBeTruthy()
  return (await res.json()).message as number
}

test.describe('Project Modules tab', () => {
  test.beforeEach(async ({ request }) => {
    await cleanProjects(request)
  })
  test.afterEach(async ({ request }) => {
    await cleanProjects(request)
  })

  test('shows the empty state with an enabled create button', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(request, 'PW Modules Empty', 'PWME')
    await page.goto(`/orbit/projects/${encodeURIComponent(projectId)}/modules`)

    const empty = page.getByTestId('project-modules-empty')
    await expect(empty).toBeVisible({ timeout: 10_000 })
    await expect(empty).toContainText('No modules yet')
    // The CTA used to be a disabled "coming soon" stub.
    await expect(
      empty.getByRole('button', { name: /create module/i }),
    ).toBeEnabled()
  })

  test('creates a module from the empty state', async ({ page, request }) => {
    const projectId = await seedProject(request, 'PW Modules Create', 'PWMC')
    await page.goto(`/orbit/projects/${encodeURIComponent(projectId)}/modules`)

    await expect(page.getByTestId('project-modules-empty')).toBeVisible({
      timeout: 10_000,
    })
    await page
      .getByTestId('project-modules-empty')
      .getByRole('button', { name: /create module/i })
      .click()

    await expect(page.getByTestId('project-modules-dialog')).toBeVisible()
    await page.getByTestId('project-modules-name-input').fill('Billing')
    await page.getByTestId('project-modules-save').click()

    await expect(page.getByTestId('project-modules-dialog')).toBeHidden()
    await expect(page.getByTestId('project-modules-row')).toHaveCount(1, {
      timeout: 10_000,
    })
    await expect(page.getByTestId('project-modules-row')).toContainText(
      'Billing',
    )
    expect(
      await countDocs(request, 'Orbit Module', { project: projectId }),
    ).toBe(1)
  })

  test('rejects a blank module name inline', async ({ page, request }) => {
    const projectId = await seedProject(request, 'PW Modules Blank', 'PWMB')
    await page.goto(`/orbit/projects/${encodeURIComponent(projectId)}/modules`)

    await expect(page.getByTestId('project-modules-empty')).toBeVisible({
      timeout: 10_000,
    })
    await page
      .getByTestId('project-modules-empty')
      .getByRole('button', { name: /create module/i })
      .click()
    await page.getByTestId('project-modules-save').click()

    await expect(page.getByTestId('project-modules-dialog')).toContainText(
      /name is required/i,
    )
    expect(
      await countDocs(request, 'Orbit Module', { project: projectId }),
    ).toBe(0)
  })

  test('surfaces the duplicate-name error from the server', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(request, 'PW Modules Dupe', 'PWMD')
    await seedModule(request, projectId, 'Billing')
    await page.goto(`/orbit/projects/${encodeURIComponent(projectId)}/modules`)

    await expect(page.getByTestId('project-modules-row')).toHaveCount(1, {
      timeout: 10_000,
    })
    await page.getByTestId('project-modules-new').click()
    await page.getByTestId('project-modules-name-input').fill('Billing')
    await page.getByTestId('project-modules-save').click()

    await expect(page.getByTestId('project-modules-dialog')).toContainText(
      /already exists/i,
    )
  })

  test('renders progress from the tasks in the module', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(request, 'PW Modules Progress', 'PWMP')
    const moduleId = await seedModule(request, projectId, 'Billing')
    const done = await stateNamed(request, projectId, 'Done')

    const a = await seedTask(request, projectId, 'PW done task')
    const b = await seedTask(request, projectId, 'PW open task')
    for (const t of [a, b]) {
      await setTaskField(request, t, 'orbit_module', moduleId)
    }
    await setTaskField(request, a, 'orbit_workflow_state', done)

    await page.goto(`/orbit/projects/${encodeURIComponent(projectId)}/modules`)
    const progress = page.getByTestId('project-modules-progress')
    await expect(progress).toBeVisible({ timeout: 10_000 })
    await expect(progress).toContainText('1/2')
    await expect(progress).toContainText('50%')
  })

  test('edits a module and persists the change', async ({ page, request }) => {
    const projectId = await seedProject(request, 'PW Modules Edit', 'PWMED')
    await seedModule(request, projectId, 'Billing')
    await page.goto(`/orbit/projects/${encodeURIComponent(projectId)}/modules`)

    await expect(page.getByTestId('project-modules-row')).toHaveCount(1, {
      timeout: 10_000,
    })
    await page.getByTestId('project-modules-row').click()
    await expect(page.getByTestId('project-modules-name-input')).toHaveValue(
      'Billing',
    )
    await page.getByTestId('project-modules-name-input').fill('Invoicing')
    await page
      .getByTestId('project-modules-status-input')
      .selectOption('In Progress')
    await page.getByTestId('project-modules-save').click()

    await expect(page.getByTestId('project-modules-row')).toContainText(
      'Invoicing',
      { timeout: 10_000 },
    )
    await expect(page.getByTestId('project-modules-row')).toContainText(
      'In Progress',
    )
  })

  test('deleting a module keeps its tasks', async ({ page, request }) => {
    const projectId = await seedProject(request, 'PW Modules Delete', 'PWMDL')
    const moduleId = await seedModule(request, projectId, 'Billing')
    const taskId = await seedTask(request, projectId, 'PW survives delete')
    await setTaskField(request, taskId, 'orbit_module', moduleId)

    await page.goto(`/orbit/projects/${encodeURIComponent(projectId)}/modules`)
    await expect(page.getByTestId('project-modules-row')).toHaveCount(1, {
      timeout: 10_000,
    })
    await page.getByTestId('project-modules-row').click()
    await page.getByTestId('project-modules-delete').click()

    await expect(page.getByTestId('project-modules-empty')).toBeVisible({
      timeout: 10_000,
    })
    expect(
      await countDocs(request, 'Orbit Module', { project: projectId }),
    ).toBe(0)
    // The work survives; only the grouping is gone.
    expect(await countDocs(request, 'Task', { name: taskId })).toBe(1)
  })
})

test.describe('Project Milestones tab', () => {
  test.beforeEach(async ({ request }) => {
    await cleanProjects(request)
  })
  test.afterEach(async ({ request }) => {
    await cleanProjects(request)
  })

  test('shows the empty state with an enabled create button', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(request, 'PW MS Empty', 'PWSE')
    await page.goto(
      `/orbit/projects/${encodeURIComponent(projectId)}/milestones`,
    )

    const empty = page.getByTestId('project-milestones-empty')
    await expect(empty).toBeVisible({ timeout: 10_000 })
    await expect(empty).toContainText('No milestones yet')
    await expect(
      empty.getByRole('button', { name: /create milestone/i }),
    ).toBeEnabled()
  })

  test('creates a milestone with a target date', async ({ page, request }) => {
    const projectId = await seedProject(request, 'PW MS Create', 'PWSC')
    await page.goto(
      `/orbit/projects/${encodeURIComponent(projectId)}/milestones`,
    )

    await expect(page.getByTestId('project-milestones-empty')).toBeVisible({
      timeout: 10_000,
    })
    await page
      .getByTestId('project-milestones-empty')
      .getByRole('button', { name: /create milestone/i })
      .click()
    await page.getByTestId('project-milestones-name-input').fill('Public beta')
    await page.getByTestId('project-milestones-target-input').fill('2027-06-30')
    await page.getByTestId('project-milestones-save').click()

    await expect(page.getByTestId('project-milestones-row')).toHaveCount(1, {
      timeout: 10_000,
    })
    await expect(page.getByTestId('project-milestones-row')).toContainText(
      'Public beta',
    )
    await expect(page.getByTestId('project-milestones-target')).toContainText(
      '2027',
    )
  })

  test('flags a past target date as overdue', async ({ page, request }) => {
    const projectId = await seedProject(request, 'PW MS Overdue', 'PWSO')
    await seedMilestone(request, projectId, 'Shipped last year', {
      target_date: '2020-01-01',
    })
    await page.goto(
      `/orbit/projects/${encodeURIComponent(projectId)}/milestones`,
    )

    await expect(page.getByTestId('project-milestones-overdue')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('does not flag a completed milestone as overdue', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(request, 'PW MS Done', 'PWSD2')
    await seedMilestone(request, projectId, 'Already shipped', {
      target_date: '2020-01-01',
      status: 'Completed',
    })
    await page.goto(
      `/orbit/projects/${encodeURIComponent(projectId)}/milestones`,
    )

    await expect(page.getByTestId('project-milestones-row')).toHaveCount(1, {
      timeout: 10_000,
    })
    await expect(page.getByTestId('project-milestones-overdue')).toHaveCount(0)
  })

  test('orders milestones by target date', async ({ page, request }) => {
    const projectId = await seedProject(request, 'PW MS Order', 'PWSOR')
    await seedMilestone(request, projectId, 'Later one', {
      target_date: '2028-01-01',
    })
    await seedMilestone(request, projectId, 'Sooner one', {
      target_date: '2027-01-01',
    })
    await page.goto(
      `/orbit/projects/${encodeURIComponent(projectId)}/milestones`,
    )

    const rows = page.getByTestId('project-milestones-row')
    await expect(rows).toHaveCount(2, { timeout: 10_000 })
    await expect(rows.nth(0)).toContainText('Sooner one')
    await expect(rows.nth(1)).toContainText('Later one')
  })
})

test.describe('Tasks tab grouping by plan', () => {
  test.beforeEach(async ({ request }) => {
    await cleanProjects(request)
  })
  test.afterEach(async ({ request }) => {
    await cleanProjects(request)
  })

  test('groups tasks by module, with an unassigned bucket', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(request, 'PW Group Module', 'PWGM')
    const moduleId = await seedModule(request, projectId, 'Billing')
    const inModule = await seedTask(request, projectId, 'PW inside billing')
    await seedTask(request, projectId, 'PW loose task')
    await setTaskField(request, inModule, 'orbit_module', moduleId)

    await page.goto(`/orbit/projects/${encodeURIComponent(projectId)}/tasks`)
    await expect(page.getByTestId('tasks-list')).toBeVisible({
      timeout: 10_000,
    })
    await page.getByTestId('task-display-btn').click()
    await page.getByTestId('task-groupby-select').selectOption('module')
    await page.keyboard.press('Escape')

    await expect(page.getByTestId('tasks-group-module-billing')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByTestId('tasks-group-module-billing')).toContainText(
      'PW inside billing',
    )
    await expect(page.getByTestId('tasks-group-no-module')).toContainText(
      'PW loose task',
    )
  })

  test('groups tasks by phase and keeps the epic out of the rows', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(request, 'PW Group Phase', 'PWGP')
    const epic = await seedTask(
      request,
      projectId,
      'PW Phase 1 — Foundations',
      {
        isGroup: true,
      },
    )
    const child = await seedTask(request, projectId, 'PW child of phase 1')
    await setTaskField(request, child, 'parent_task', epic)

    await page.goto(`/orbit/projects/${encodeURIComponent(projectId)}/tasks`)
    await expect(page.getByTestId('tasks-list')).toBeVisible({
      timeout: 10_000,
    })
    await page.getByTestId('task-display-btn').click()
    await page.getByTestId('task-groupby-select').selectOption('phase')
    await page.keyboard.press('Escape')

    const group = page.locator('[data-testid^="tasks-group-phase-"]')
    await expect(group).toBeVisible({ timeout: 10_000 })
    await expect(group).toContainText('PW Phase 1')
    await expect(group).toContainText('PW child of phase 1')
    // The epic is the header, so it must not also appear as a row.
    await expect(page.getByTestId('tasks-group-no-phase')).toHaveCount(0)
  })
})
