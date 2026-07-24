import { test, expect } from '@playwright/test'

test.describe('Home — personal dashboard', () => {
  test('renders header, greeting, stat tiles, and lists', async ({ page }) => {
    await page.goto('/orbit')

    // Header with Home title
    await expect(
      page.getByRole('heading', { name: 'Home', exact: true }),
    ).toBeVisible()

    // Four stat tiles — values may be anything since the current user may
    // have real tasks. We only assert the tiles render.
    for (const id of [
      'home-stat-assigned',
      'home-stat-pending',
      'home-stat-completed',
      'home-stat-due',
    ]) {
      await expect(page.getByTestId(id)).toBeVisible()
    }

    // Overdue + Upcoming sections are always visible (empty state inside
    // when there's no data).
    await expect(page.getByTestId('home-overdue')).toBeVisible()
    await expect(page.getByTestId('home-upcoming')).toBeVisible()

    // Recent activity section
    await expect(page.getByTestId('home-activity')).toBeVisible()
  })

  test('home uses "tasks" copy, never "work items"', async ({ page }) => {
    await page.goto('/orbit')
    await expect(
      page.getByRole('heading', { name: 'Home', exact: true }),
    ).toBeVisible()
    const body = page.locator('body')
    await expect(body).not.toContainText(/work item/i)
  })
})
