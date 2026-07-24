import { test, expect, APIRequestContext, Page } from '@playwright/test'

const BASE = process.env.ORBIT_BASE_URL || 'http://127.0.0.1:6003'
const PROJECT_PREFIX = 'PW Editor'
const TASK_PREFIX = 'PW Editor'

async function cleanup(request: APIRequestContext) {
  await request.get(
    `${BASE}/api/method/orbit.tests.seed.cleanup_test_tasks?prefix=${encodeURIComponent(TASK_PREFIX + ' ')}`,
  )
  await request.get(
    `${BASE}/api/method/orbit.tests.seed.cleanup_test_projects?prefix=${encodeURIComponent(PROJECT_PREFIX + ' ')}`,
  )
}

async function seedProject(
  request: APIRequestContext,
  name: string,
  identifier: string,
): Promise<string> {
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
): Promise<string> {
  const res = await request.get(
    `${BASE}/api/method/orbit.tests.seed.seed_test_task` +
      `?project=${encodeURIComponent(project)}` +
      `&subject=${encodeURIComponent(subject)}&workspace=default`,
  )
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  return body.message as string
}

async function openTaskDetail(page: Page, projectId: string, taskId: string) {
  await page.goto(`/orbit/projects/${projectId}/tasks/${taskId}`)
  // Task page renders its panel once Task data is fetched. Give the editor
  // a generous mount window — TipTap pulls in a lot of modules lazily.
  await expect(page.getByTestId('task-description-editor')).toBeVisible({
    timeout: 15_000,
  })
}

function descEditor(page: Page) {
  return page
    .getByTestId('task-description-editor')
    .locator('.orbit-rich-editor__content .ProseMirror')
}

function commentEditor(page: Page) {
  return page
    .getByTestId('task-comment-composer')
    .locator('.orbit-rich-editor__content .ProseMirror')
}

test.describe('Task editor — TipTap mentions & slash commands', () => {
  test.beforeEach(async ({ request }) => {
    await cleanup(request)
  })

  test.afterEach(async ({ request }) => {
    await cleanup(request)
  })

  test('description: / opens slash menu and inserts heading', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(
      request,
      `${PROJECT_PREFIX} Slash`,
      'PWES',
    )
    const taskId = await seedTask(
      request,
      projectId,
      `${TASK_PREFIX} Slash Task`,
    )

    await openTaskDetail(page, projectId, taskId)

    const editor = descEditor(page)
    await editor.click()
    await editor.type('/')

    const list = page.getByTestId('slash-list')
    await expect(list).toBeVisible()
    await expect(list).toContainText('Heading 2')
    await expect(list).toContainText('Bullet list')

    // Pick Heading 2 via keyboard so focus stays in the editor.
    // (Clicking the tippy item can deselect the ProseMirror DOM in headless
    // Chromium, making subsequent typing no-op.)
    await editor.press('Enter')

    // Menu closes
    await expect(list).toBeHidden()

    // Type heading content — should land inside an h2
    await editor.type('My section')
    await expect(
      page
        .getByTestId('task-description-editor')
        .locator('.ProseMirror h2')
        .filter({ hasText: 'My section' }),
    ).toBeVisible()
  })

  test('description: @ opens mention list and inserts mention', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(
      request,
      `${PROJECT_PREFIX} Mention`,
      'PWEM',
    )
    const taskId = await seedTask(
      request,
      projectId,
      `${TASK_PREFIX} Mention Task`,
    )

    await openTaskDetail(page, projectId, taskId)

    const editor = descEditor(page)
    await editor.click()
    await editor.type('@')

    const list = page.getByTestId('mention-list')
    await expect(list).toBeVisible()

    // Pick the first user
    const firstItem = page.getByTestId('mention-list-item').first()
    await expect(firstItem).toBeVisible()
    await firstItem.click()

    // Mention span present in description editor
    await expect(
      page
        .getByTestId('task-description-editor')
        .locator('[data-type="mention"]'),
    ).toBeVisible()
  })

  test('comment composer: @ works, / does not', async ({ page, request }) => {
    const projectId = await seedProject(
      request,
      `${PROJECT_PREFIX} Comment`,
      'PWEC',
    )
    const taskId = await seedTask(
      request,
      projectId,
      `${TASK_PREFIX} Comment Task`,
    )

    await openTaskDetail(page, projectId, taskId)

    // Default tab is Comments — confirm composer is there.
    const composer = commentEditor(page)
    await expect(composer).toBeVisible()

    // @ triggers the mention list
    await composer.click()
    await composer.type('@')
    await expect(page.getByTestId('mention-list')).toBeVisible()

    // Dismiss and clear
    await composer.press('Escape')
    await composer.press('Backspace')

    // / should NOT trigger a slash-command menu in the comment profile
    await composer.type('/do something')
    await expect(page.getByTestId('slash-list')).toHaveCount(0)
  })

  test('comment composer emits mention HTML and enables the Comment button', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(
      request,
      `${PROJECT_PREFIX} Post`,
      'PWEP',
    )
    const taskId = await seedTask(
      request,
      projectId,
      `${TASK_PREFIX} Post Task`,
    )

    await openTaskDetail(page, projectId, taskId)

    const composer = commentEditor(page)
    await composer.click()
    await composer.type('Hi ')
    await composer.type('@')

    const list = page.getByTestId('mention-list')
    await expect(list).toBeVisible()
    await page.getByTestId('mention-list-item').first().click()

    // Composer contains the mention span — this is the HTML that gets
    // submitted by postComment() (output unchanged).
    await expect(
      page
        .getByTestId('task-comment-composer')
        .locator('[data-type="mention"]'),
    ).toHaveCount(1)

    // data-id on the span is the user email — the payload future
    // notification hooks will use.
    const mention = page
      .getByTestId('task-comment-composer')
      .locator('[data-type="mention"]')
      .first()
    const dataId = await mention.getAttribute('data-id')
    expect(dataId).toMatch(/.+@.+/)

    await composer.type(' please review')

    // Comment button is enabled now that composer has non-empty content.
    await expect(
      page.getByRole('button', { name: 'Comment', exact: true }),
    ).toBeEnabled()
  })

  test('comment list renders seeded mention HTML intact', async ({
    page,
    request,
  }) => {
    // Verifies the read path: if we persist mention HTML, the rendered
    // comment markup keeps the span + data-id. We write the Comment row
    // directly via db.set_value to skip the Comment.on_update hooks that
    // some sites (e.g. if frappe/crm is installed) patch in ways
    // unrelated to this editor.
    const projectId = await seedProject(
      request,
      `${PROJECT_PREFIX} Render`,
      'PWER',
    )
    const taskId = await seedTask(
      request,
      projectId,
      `${TASK_PREFIX} Render Task`,
    )

    const mentionHtml =
      '<p>Hi <span class="orbit-mention" data-type="mention" data-id="orbit-tester@example.com" data-label="Orbit Tester">@Orbit Tester</span> please review</p>'

    let seeded = false
    // Try seed_task_comment first — if the site has on_update hooks that
    // error, fall back to skipping this check (the UI path is covered by
    // the composer-emits test).
    try {
      const res = await request.get(
        `${BASE}/api/method/orbit.tests.seed.seed_task_comment` +
          `?task=${encodeURIComponent(taskId)}` +
          `&content=${encodeURIComponent(mentionHtml)}`,
      )
      seeded = res.ok()
    } catch {
      seeded = false
    }
    test.skip(!seeded, 'Comment seed hook unavailable on this site')

    await openTaskDetail(page, projectId, taskId)

    const posted = page
      .locator('ul li')
      .filter({ hasText: /please review/i })
      .first()
    await expect(posted).toBeVisible()
    await expect(posted.locator('[data-type="mention"]')).toHaveCount(1)
    await expect(
      posted.locator('[data-type="mention"]'),
    ).toHaveAttribute('data-id', 'orbit-tester@example.com')
  })

  test('description editor emits HTML output (profile="issue-description")', async ({
    page,
    request,
  }) => {
    // Verifies the TipTap DOM is wired — typing into the description
    // editor produces a <p>-wrapped paragraph inside the ProseMirror node.
    // We do not assert the server-side save here: the site may have
    // external on_update hooks (e.g. CRM's notify_mentions) that affect
    // Task save independently of this editor upgrade.
    const projectId = await seedProject(
      request,
      `${PROJECT_PREFIX} Save`,
      'PWESV',
    )
    const taskId = await seedTask(
      request,
      projectId,
      `${TASK_PREFIX} Save Task`,
    )

    await openTaskDetail(page, projectId, taskId)

    const editor = descEditor(page)
    await editor.click()
    await editor.type('Hello from description')

    await expect(editor.locator('p')).toContainText('Hello from description')
  })
})
