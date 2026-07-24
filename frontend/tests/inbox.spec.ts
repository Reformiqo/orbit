import { test, expect, APIRequestContext } from '@playwright/test'

const BASE = process.env.ORBIT_BASE_URL || 'http://127.0.0.1:6003'

async function cleanTodos(request: APIRequestContext) {
  await request.get(
    `${BASE}/api/method/orbit.tests.seed.cleanup_test_todos?prefix=${encodeURIComponent('PW ')}`,
  )
}

async function seedTodo(
  request: APIRequestContext,
  description: string,
  opts: {
    status?: string
    priority?: string
    reference_type?: string
    reference_name?: string
  } = {},
) {
  const params = new URLSearchParams()
  params.set('description', description)
  if (opts.status) params.set('status', opts.status)
  if (opts.priority) params.set('priority', opts.priority)
  if (opts.reference_type) params.set('reference_type', opts.reference_type)
  if (opts.reference_name) params.set('reference_name', opts.reference_name)
  const res = await request.get(
    `${BASE}/api/method/orbit.tests.seed.seed_test_todo?${params.toString()}`,
  )
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  return body.message as string
}

test.describe('Inbox — ToDo triage', () => {
  test.beforeEach(async ({ request }) => {
    await cleanTodos(request)
  })

  test.afterEach(async ({ request }) => {
    await cleanTodos(request)
  })

  test('renders the Inbox header and a reachable refresh button', async ({
    page,
  }) => {
    await page.goto('/orbit/inbox')
    await expect(
      page.getByRole('heading', { name: 'Inbox', exact: true }),
    ).toBeVisible()
    await expect(page.getByTestId('inbox-refresh')).toBeVisible()
  })

  test('shows seeded open ToDos grouped under Open', async ({
    page,
    request,
  }) => {
    await seedTodo(request, 'PW inbox triage note 1', {
      status: 'Open',
      priority: 'High',
    })
    await seedTodo(request, 'PW inbox triage note 2', {
      status: 'Open',
      priority: 'Medium',
    })

    await page.goto('/orbit/inbox')

    const openSection = page.getByTestId('inbox-open-section')
    await expect(openSection).toBeVisible()
    await expect(openSection).toContainText('PW inbox triage note 1')
    await expect(openSection).toContainText('PW inbox triage note 2')

    // At least two rows visible
    await expect(page.getByTestId('inbox-item')).toHaveCount(2)
  })

  test('closed ToDos show up under a Closed section', async ({
    page,
    request,
  }) => {
    await seedTodo(request, 'PW closed triage', { status: 'Closed' })

    await page.goto('/orbit/inbox')
    const closed = page.getByTestId('inbox-closed-section')
    await expect(closed).toBeVisible()
    await expect(closed).toContainText('PW closed triage')
  })

  test('inbox copy never mentions "work items"', async ({ page }) => {
    await page.goto('/orbit/inbox')
    await expect(
      page.getByRole('heading', { name: 'Inbox', exact: true }),
    ).toBeVisible()
    const body = page.locator('body')
    await expect(body).not.toContainText(/work item/i)
  })
})
