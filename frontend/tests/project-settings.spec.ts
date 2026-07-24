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
  const body = await res.json()
  return body.message as string
}

async function readProject(request: APIRequestContext, name: string) {
  const res = await request.get(
    `${BASE}/api/method/frappe.client.get_value` +
      `?doctype=Project` +
      `&filters=${encodeURIComponent(JSON.stringify({ name }))}` +
      `&fieldname=${encodeURIComponent(JSON.stringify(['project_name', 'orbit_identifier', 'status', 'notes']))}`,
  )
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  return body.message as {
    project_name?: string
    orbit_identifier?: string
    status?: string
    notes?: string
  }
}

test.describe('Project Settings tab', () => {
  test.beforeEach(async ({ request }) => {
    await cleanProjects(request)
  })

  test.afterEach(async ({ request }) => {
    await cleanProjects(request)
  })

  test('renders the settings form and danger zone', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(request, 'PW Settings Render', 'PWSR')
    await page.goto(
      `/orbit/projects/${encodeURIComponent(projectId)}/settings`,
    )

    // Wait for the settings tab to mount (avoids the fleeting "Project not
    // found" state that can render if the createResource race is lost).
    await expect(page.getByTestId('project-settings')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByLabel('Project name')).toHaveValue(
      'PW Settings Render',
    )
    await expect(page.getByLabel('Identifier')).toHaveValue('PWSR')
    await expect(page.getByTestId('settings-danger-zone')).toBeVisible()
    await expect(page.getByTestId('settings-delete-btn')).toBeVisible()
  })

  test('edits project name with auto-save on blur', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(request, 'PW Settings Save', 'PWSS')
    await page.goto(
      `/orbit/projects/${encodeURIComponent(projectId)}/settings`,
    )

    await expect(page.getByTestId('project-settings')).toBeVisible({
      timeout: 10_000,
    })
    const name = page.getByLabel('Project name')
    await expect(name).toHaveValue('PW Settings Save')
    await name.fill('PW Settings Renamed')
    await name.blur()

    // "Saved" flash (wait for backend + network)
    await expect(page.getByTestId('settings-saved')).toBeVisible()

    const project = await readProject(request, projectId)
    expect(project.project_name).toBe('PW Settings Renamed')
  })

  test('rejects invalid identifier with an inline error', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(request, 'PW Settings Bad', 'PWSB')
    await page.goto(
      `/orbit/projects/${encodeURIComponent(projectId)}/settings`,
    )

    await expect(page.getByTestId('project-settings')).toBeVisible({
      timeout: 10_000,
    })
    const ident = page.getByLabel('Identifier')
    await expect(ident).toHaveValue('PWSB')
    await ident.fill('1bad')
    await ident.blur()

    await expect(page.getByTestId('settings-error')).toBeVisible()
    await expect(page.getByTestId('settings-error')).toContainText(
      /Identifier must be/i,
    )
  })

  test('delete project navigates back to Projects index', async ({
    page,
    request,
  }) => {
    const projectId = await seedProject(
      request,
      'PW Settings Delete',
      'PWSD',
    )
    await page.goto(
      `/orbit/projects/${encodeURIComponent(projectId)}/settings`,
    )

    await expect(page.getByTestId('project-settings')).toBeVisible({
      timeout: 10_000,
    })
    await page.getByTestId('settings-delete-btn').click()
    await expect(
      page.getByRole('heading', { name: 'Delete project?' }),
    ).toBeVisible()
    await page.getByTestId('settings-delete-confirm').click()

    await expect(page).toHaveURL(/\/orbit\/projects$/)
  })
})
