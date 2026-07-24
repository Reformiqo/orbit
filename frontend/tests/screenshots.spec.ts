/**
 * Capture marketing / documentation screenshots of every major Orbit surface.
 * Writes PNGs into /home/frappe/workspace/typst/orbit/screenshots/ so the
 * project guide can embed them.
 *
 * Run: yarn playwright test tests/screenshots.spec.ts --project=chromium
 */
import { test, expect, APIRequestContext, Page } from '@playwright/test'
import { resolve } from 'node:path'

const BASE = process.env.ORBIT_BASE_URL || 'http://127.0.0.1:6003'
const OUT = '/home/frappe/workspace/typst/orbit/screenshots'

test.use({
  viewport: { width: 1440, height: 900 },
})

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
  type_name: string = '',
) {
  const res = await request.get(
    `${BASE}/api/method/orbit.tests.seed.seed_test_task` +
      `?project=${encodeURIComponent(project)}` +
      `&subject=${encodeURIComponent(subject)}` +
      (type_name ? `&task_type_name=${encodeURIComponent(type_name)}` : ''),
  )
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  return body.message as string
}

async function setField(
  request: APIRequestContext,
  task: string,
  field: string,
  value: string,
) {
  await request.get(
    `${BASE}/api/method/orbit.tests.seed.set_task_field` +
      `?task=${encodeURIComponent(task)}` +
      `&fieldname=${encodeURIComponent(field)}` +
      `&value=${encodeURIComponent(value)}`,
  )
}

async function seedTodo(
  request: APIRequestContext,
  description: string,
  priority = 'Medium',
) {
  await request.get(
    `${BASE}/api/method/orbit.tests.seed.seed_test_todo` +
      `?description=${encodeURIComponent(description)}` +
      `&status=Open&priority=${encodeURIComponent(priority)}`,
  )
}

async function seedNotif(
  request: APIRequestContext,
  subject: string,
  type_ = 'Alert',
) {
  await request.get(
    `${BASE}/api/method/orbit.tests.seed.seed_notification` +
      `?for_user=orbit-tester@example.com` +
      `&subject=${encodeURIComponent(subject)}` +
      `&type_=${type_}&document_type=Task&document_name=`,
  )
}

async function cleanup(request: APIRequestContext) {
  await request.get(
    `${BASE}/api/method/orbit.tests.seed.cleanup_test_tasks?prefix=SHOT%20`,
  )
  await request.get(
    `${BASE}/api/method/orbit.tests.seed.cleanup_test_projects?prefix=SHOT%20`,
  )
  await request.get(
    `${BASE}/api/method/orbit.tests.seed.cleanup_test_todos?prefix=SHOT%20`,
  )
  await request.get(
    `${BASE}/api/method/orbit.tests.seed.cleanup_notification_logs?prefix=SHOT%20`,
  )
}

async function shoot(page: Page, name: string) {
  await page.screenshot({
    path: resolve(OUT, `${name}.png`),
    fullPage: false,
  })
}

test.describe('documentation screenshots', () => {
  test.beforeAll(async ({ request }) => {
    await cleanup(request)

    // Rich demo project with several tasks in different states.
    const project = await seedProject(request, 'SHOT Mobile Launch', 'MOBILE')
    const t1 = await seedTask(
      request,
      project,
      'SHOT Design onboarding flow',
      'Story',
    )
    const t2 = await seedTask(
      request,
      project,
      'SHOT Crash on Android 12',
      'Bug',
    )
    const t3 = await seedTask(
      request,
      project,
      'SHOT Payment gateway review',
      'Task',
    )
    const t4 = await seedTask(
      request,
      project,
      'SHOT Q3 analytics rollout',
      'Epic',
    )
    const t5 = await seedTask(
      request,
      project,
      'SHOT Investigate sync lag',
      'Query',
    )

    const today = new Date()
    const toISO = (d: Date) =>
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    const inDays = (n: number) => {
      const d = new Date(today)
      d.setDate(d.getDate() + n)
      return toISO(d)
    }

    await setField(request, t1, 'priority', 'High')
    await setField(request, t1, 'exp_end_date', inDays(3))
    await setField(request, t1, 'orbit_labels', 'frontend, ux')

    await setField(request, t2, 'priority', 'Urgent')
    await setField(request, t2, 'exp_end_date', inDays(1))

    await setField(request, t3, 'priority', 'Medium')
    await setField(request, t3, 'exp_end_date', inDays(7))

    await setField(request, t4, 'priority', 'Low')
    await setField(request, t4, 'exp_end_date', inDays(14))

    await setField(request, t5, 'priority', 'Medium')
    await setField(request, t5, 'exp_end_date', inDays(5))

    // A couple of todos + notifications so Inbox isn't empty.
    await seedTodo(request, 'SHOT Review pull request for sync fix', 'High')
    await seedTodo(request, 'SHOT Approve release notes', 'Medium')

    await seedNotif(
      request,
      'SHOT Alice mentioned you in <b>MOBILE-S1</b>',
      'Mention',
    )
    await seedNotif(
      request,
      'SHOT Bob moved <b>MOBILE-B1</b> from <b>To do</b> to <b>In Progress</b>',
      'Alert',
    )
    await seedNotif(
      request,
      'SHOT You were set as reporter on <b>MOBILE-T1</b>',
      'Assignment',
    )
  })

  test('01 home dashboard', async ({ page }) => {
    await page.goto('/orbit')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    await shoot(page, '01-home')
  })

  test('02 inbox', async ({ page }) => {
    await page.goto('/orbit/inbox')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    await shoot(page, '02-inbox')
  })

  test('03 my tasks summary', async ({ page }) => {
    await page.goto('/orbit/my-tasks')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    await shoot(page, '03-my-tasks')
  })

  test('04 analytics', async ({ page }) => {
    await page.goto('/orbit/analytics')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1200)
    await shoot(page, '04-analytics')
  })

  test('05 project overview + 06 task list + kanban + calendar + spreadsheet', async ({
    page,
    request,
  }) => {
    // Find the demo project by name prefix
    const res = await request.get(
      `${BASE}/api/method/frappe.client.get_list` +
        `?doctype=Project&filters=${encodeURIComponent(
          JSON.stringify({ project_name: ['like', 'SHOT Mobile%'] }),
        )}&fields=${encodeURIComponent(JSON.stringify(['name']))}&limit_page_length=1`,
    )
    const projectId = (await res.json()).message[0].name

    await page.goto(`/orbit/projects/${projectId}/overview`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await shoot(page, '05-project-overview')

    await page.goto(`/orbit/projects/${projectId}/tasks`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(600)
    await shoot(page, '06-project-tasks-list')

    // Kanban: click the view toggle
    await page
      .locator('button[title="Kanban"]')
      .click()
      .catch(() => {})
    await page.waitForTimeout(800)
    await shoot(page, '07-project-tasks-kanban')

    await page
      .locator('button[title="Calendar"]')
      .click()
      .catch(() => {})
    await page.waitForTimeout(800)
    await shoot(page, '08-project-tasks-calendar')

    await page
      .locator('button[title="Spreadsheet"]')
      .click()
      .catch(() => {})
    await page.waitForTimeout(800)
    await shoot(page, '09-project-tasks-spreadsheet')
  })

  test('10 task detail + create dialog', async ({ page, request }) => {
    // Open the first task in the demo project.
    const res = await request.get(
      `${BASE}/api/method/frappe.client.get_list` +
        `?doctype=Task&filters=${encodeURIComponent(
          JSON.stringify({ subject: ['like', 'SHOT Design onboarding%'] }),
        )}&fields=${encodeURIComponent(JSON.stringify(['name', 'project']))}&limit_page_length=1`,
    )
    const row = (await res.json()).message[0]
    await page.goto(`/orbit/projects/${row.project}/tasks/${row.name}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await shoot(page, '10-task-detail')

    // Create task dialog on the project's tasks tab
    await page.goto(`/orbit/projects/${row.project}/tasks`)
    await page.waitForLoadState('networkidle')
    await page.getByTestId('tasks-create-btn').click()
    await page.waitForTimeout(600)
    await shoot(page, '11-create-task-dialog')
    await page.keyboard.press('Escape')
  })

  test.afterAll(async ({ request }) => {
    await cleanup(request)
  })
})
