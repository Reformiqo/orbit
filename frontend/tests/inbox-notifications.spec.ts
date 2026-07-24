import { test, expect, APIRequestContext } from '@playwright/test'

const BASE = process.env.ORBIT_BASE_URL || 'http://127.0.0.1:6003'
const TESTER_EMAIL =
  process.env.ORBIT_TESTER_EMAIL || 'orbit-tester@example.com'

async function cleanNotifs(request: APIRequestContext) {
  // Default prefix matches what we seed below.
  await request.get(
    `${BASE}/api/method/orbit.tests.seed.cleanup_notification_logs?prefix=${encodeURIComponent('PW notif')}`,
  )
}

async function seedNotif(
  request: APIRequestContext,
  subject: string,
  type_: string = 'Alert',
  document_name: string = '',
) {
  const params = new URLSearchParams()
  params.set('for_user', TESTER_EMAIL)
  params.set('subject', subject)
  params.set('type_', type_)
  params.set('document_type', 'Task')
  if (document_name) params.set('document_name', document_name)
  const res = await request.get(
    `${BASE}/api/method/orbit.tests.seed.seed_notification?${params.toString()}`,
  )
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  return body.message as string
}

test.describe('Inbox — Notification Log integration', () => {
  test.beforeEach(async ({ request }) => {
    await cleanNotifs(request)
  })

  test.afterEach(async ({ request }) => {
    await cleanNotifs(request)
  })

  test('seeded notifications render in inbox with unread badge + bucket', async ({
    page,
    request,
  }) => {
    await seedNotif(
      request,
      'PW notif Alice mentioned you in TASK-2026-99001',
      'Mention',
    )
    await seedNotif(
      request,
      'PW notif Bob commented on TASK-2026-99001',
      'Alert',
    )

    await page.goto('/orbit/inbox')

    const todayBucket = page.getByTestId('inbox-bucket-today')
    await expect(todayBucket).toBeVisible()
    await expect(todayBucket).toContainText('mentioned you')
    await expect(todayBucket).toContainText('commented')

    await expect(page.getByTestId('inbox-unread-count')).toContainText(
      '2 unread',
    )
    await expect(page.getByTestId('inbox-notification')).toHaveCount(2)
  })

  test('sidebar inbox badge shows unread count', async ({ page, request }) => {
    await seedNotif(request, 'PW notif sidebar test 1', 'Alert')
    await seedNotif(request, 'PW notif sidebar test 2', 'Mention')
    await seedNotif(request, 'PW notif sidebar test 3', 'Alert')

    await page.goto('/orbit')
    await expect(page.getByTestId('sidebar-inbox-badge')).toContainText('3')
  })

  test('clicking a notification marks it read and decrements counts', async ({
    page,
    request,
  }) => {
    await seedNotif(request, 'PW notif click to mark read', 'Mention')
    await page.goto('/orbit/inbox')

    await expect(page.getByTestId('inbox-unread-count')).toContainText(
      '1 unread',
    )
    const item = page.getByTestId('inbox-notification').first()
    await item.click()

    // Either the count chip disappears or the URL changed (Task route lookup
    // can fail because the seeded doc_name doesn't exist — we just need to
    // confirm the row was marked read).
    await expect(page.getByTestId('inbox-unread-count')).toHaveCount(0)
  })

  test('mark all read clears unread state and hides badge', async ({
    page,
    request,
  }) => {
    await seedNotif(request, 'PW notif bulk 1', 'Alert')
    await seedNotif(request, 'PW notif bulk 2', 'Alert')
    await seedNotif(request, 'PW notif bulk 3', 'Mention')

    await page.goto('/orbit/inbox')
    await expect(page.getByTestId('inbox-unread-count')).toContainText(
      '3 unread',
    )

    await page.getByTestId('inbox-mark-all-read').click()
    await expect(page.getByTestId('inbox-unread-count')).toHaveCount(0)
    await expect(page.getByTestId('sidebar-inbox-badge')).toHaveCount(0)
  })
})
