import { test, expect } from '@playwright/test'

test.describe('Orbit SPA — smoke', () => {
  test('loads /orbit and renders the sidebar', async ({ page }) => {
    await page.goto('/orbit')

    // Sidebar brand tile + name
    await expect(page.getByText('Orbit', { exact: true })).toBeVisible()

    // Top-nav items (Projects is intentionally NOT here — users reach projects
    // via the "Projects" section below, which lists them directly with a + to
    // create).
    for (const label of ['Home', 'Inbox', 'My Tasks', 'Analytics']) {
      // Accessible name may include an unread badge count (e.g. "Inbox 1"),
      // so match on start-of-string rather than equality.
      await expect(
        page
          .getByRole('button', {
            name: new RegExp(`^${label}(\\s+\\d+)?$`),
          })
          .first(),
      ).toBeVisible()
    }

    // Items intentionally absent from the workspace sidebar:
    //   Projects        → not in top nav (section below covers it)
    //   Workspaces      → implicit, no switcher (ADR-0012)
    //   Cycles          → no Cycles in Orbit (ADR-0010)
    //   Members         → under Settings (ADR-0007)
    //   My Issues       → renamed to My Tasks (ADR-0011)
    for (const label of [
      'Projects',
      'Workspaces',
      'Cycles',
      'Members',
      'My Issues',
    ]) {
      await expect(
        page.getByRole('button', { name: label, exact: true }),
      ).toHaveCount(0)
    }

    // The Projects section with + create button must render
    await expect(page.getByTestId('sidebar-create-project')).toBeVisible()
  })

  test('sidebar navigates between pages with deep-link URLs', async ({
    page,
  }) => {
    await page.goto('/orbit')

    await page.getByRole('button', { name: 'My Tasks' }).click()
    await expect(page).toHaveURL(/\/orbit\/my-tasks$/)
    await expect(
      page.getByText('Everything assigned to you, across projects.'),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Analytics' }).click()
    await expect(page).toHaveURL(/\/orbit\/analytics$/)
    await expect(
      page.getByRole('heading', { name: 'Analytics', exact: true }),
    ).toBeVisible()
  })

  test('user dropdown opens and shows Settings / About / Log out', async ({
    page,
  }) => {
    await page.goto('/orbit')

    // Click the brand tile (the dropdown trigger)
    await page.getByRole('button', { name: /Orbit/ }).first().click()

    await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'About' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Log out' })).toBeVisible()
  })
})
