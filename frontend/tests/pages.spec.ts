import { test, expect, APIRequestContext } from '@playwright/test'

const PROJECT_PREFIX = 'PW Pages'

async function cleanPages(request: APIRequestContext, baseURL: string) {
  await request.get(
    `${baseURL}/api/method/orbit.tests.seed.cleanup_test_pages?prefix=${encodeURIComponent(
      PROJECT_PREFIX,
    )}`,
  )
}

async function cleanProjects(request: APIRequestContext, baseURL: string) {
  await request.get(
    `${baseURL}/api/method/orbit.tests.seed.cleanup_test_projects?prefix=${encodeURIComponent(
      PROJECT_PREFIX,
    )}`,
  )
}

async function seedProject(
  request: APIRequestContext,
  baseURL: string,
  name: string,
  identifier: string,
): Promise<string> {
  const r = await request.get(
    `${baseURL}/api/method/orbit.tests.seed.seed_test_project` +
      `?project_name=${encodeURIComponent(name)}` +
      `&identifier=${identifier}&workspace=default`,
  )
  expect(r.ok()).toBeTruthy()
  const body = await r.json()
  return body.message as string
}

async function seedPage(
  request: APIRequestContext,
  baseURL: string,
  opts: {
    title: string
    project: string
    parentPage?: string
    content?: string
  },
): Promise<string> {
  const params = new URLSearchParams({
    title: opts.title,
    project: opts.project,
  })
  if (opts.parentPage) params.set('parent_page', opts.parentPage)
  if (opts.content) params.set('content', opts.content)
  const r = await request.get(
    `${baseURL}/api/method/orbit.tests.seed.seed_test_page?${params.toString()}`,
  )
  expect(r.ok()).toBeTruthy()
  const body = await r.json()
  return body.message as string
}

test.describe('Project pages', () => {
  const baseURL = process.env.ORBIT_BASE_URL || 'http://127.0.0.1:6003'

  test.beforeEach(async ({ request }) => {
    // Project first — then pages cleanup sweeps orphans created by the delete.
    await cleanProjects(request, baseURL)
    await cleanPages(request, baseURL)
  })

  test.afterEach(async ({ request }) => {
    await cleanProjects(request, baseURL)
    await cleanPages(request, baseURL)
  })

  test('empty state on a project with no pages', async ({ page, request }) => {
    const projectId = await seedProject(
      request,
      baseURL,
      `${PROJECT_PREFIX} Empty`,
      'PPE1',
    )

    await page.goto(`/orbit/projects/${projectId}/pages`)
    await expect(page.getByTestId('project-pages-tab')).toBeVisible()
    await expect(page.getByTestId('pages-empty-state')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'No pages yet' }),
    ).toBeVisible()
  })

  test('create a page, title persists', async ({ page, request }) => {
    const projectId = await seedProject(
      request,
      baseURL,
      `${PROJECT_PREFIX} Create`,
      'PPE2',
    )

    await page.goto(`/orbit/projects/${projectId}/pages`)
    await page.getByTestId('pages-create-first').click()

    // Title input should be visible
    const titleInput = page.getByTestId('page-title-input')
    await expect(titleInput).toBeVisible()
    await expect(titleInput).toHaveValue('Untitled')

    // Rename
    await titleInput.fill(`${PROJECT_PREFIX} Manifesto`)
    await titleInput.blur()

    // Give the debounced save a moment, then reload and verify
    await expect
      .poll(async () => {
        const res = await request.get(
          `${baseURL}/api/method/frappe.client.get_list` +
            `?doctype=Orbit+Page&filters=${encodeURIComponent(
              JSON.stringify([['project', '=', projectId]]),
            )}&fields=${encodeURIComponent(JSON.stringify(['title']))}`,
        )
        const body = await res.json()
        return (body.message || []).map((r: any) => r.title)
      })
      .toContain(`${PROJECT_PREFIX} Manifesto`)

    // Page row should show in the tree
    await page.reload()
    await expect(
      page
        .getByTestId('page-tree-row')
        .filter({ hasText: `${PROJECT_PREFIX} Manifesto` }),
    ).toBeVisible()
  })

  test('type content into editor, HTML is saved', async ({ page, request }) => {
    const projectId = await seedProject(
      request,
      baseURL,
      `${PROJECT_PREFIX} Edit`,
      'PPE3',
    )
    const pageId = await seedPage(request, baseURL, {
      title: `${PROJECT_PREFIX} First`,
      project: projectId,
    })

    await page.goto(`/orbit/projects/${projectId}/pages/${pageId}`)
    await expect(page.getByTestId('page-title-input')).toBeVisible()

    const editor = page.locator('.orbit-rich-editor__content .ProseMirror')
    await editor.click()
    await editor.type('Hello world — this is a wiki page.')

    // Trigger save by blurring
    await page.getByTestId('page-title-input').click()

    // Poll the stored HTML
    await expect
      .poll(async () => {
        const res = await request.get(
          `${baseURL}/api/method/frappe.client.get_value` +
            `?doctype=Orbit+Page&filters=${encodeURIComponent(
              JSON.stringify({ name: pageId }),
            )}&fieldname=${encodeURIComponent(JSON.stringify(['content']))}`,
        )
        const body = await res.json()
        return (body.message && body.message.content) || ''
      })
      .toContain('Hello world')

    // Ensure the stored HTML actually has a <p> wrapper (TipTap output)
    const res = await request.get(
      `${baseURL}/api/method/frappe.client.get_value` +
        `?doctype=Orbit+Page&filters=${encodeURIComponent(
          JSON.stringify({ name: pageId }),
        )}&fieldname=${encodeURIComponent(JSON.stringify(['content']))}`,
    )
    const body = await res.json()
    expect(body.message.content).toMatch(/<p>.*Hello world.*<\/p>/s)
  })

  test('nested page: child shows indented under parent', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(
      request,
      baseURL,
      `${PROJECT_PREFIX} Nest`,
      'PPE4',
    )
    const parentId = await seedPage(request, baseURL, {
      title: `${PROJECT_PREFIX} Parent`,
      project: projectId,
    })
    await seedPage(request, baseURL, {
      title: `${PROJECT_PREFIX} Child`,
      project: projectId,
      parentPage: parentId,
    })

    await page.goto(`/orbit/projects/${projectId}/pages`)

    const parentRow = page
      .getByTestId('page-tree-row')
      .filter({ hasText: `${PROJECT_PREFIX} Parent` })
    const childRow = page
      .getByTestId('page-tree-row')
      .filter({ hasText: `${PROJECT_PREFIX} Child` })

    await expect(parentRow).toBeVisible()
    await expect(childRow).toBeVisible()

    // Indent = child row has greater padding-left than parent row
    const parentPad = await parentRow.evaluate(
      (el) => parseFloat(getComputedStyle(el).paddingLeft) || 0,
    )
    const childPad = await childRow.evaluate(
      (el) => parseFloat(getComputedStyle(el).paddingLeft) || 0,
    )
    expect(childPad).toBeGreaterThan(parentPad)
  })
})
