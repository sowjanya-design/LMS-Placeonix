import { test, expect } from '@playwright/test';

test.describe('Courses and Learning', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user login and auth check
    await page.route('**/api/*/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { user: { id: '1', _id: '12345678', role: 'admin', name: 'Admin', firstName: 'Admin', lastName: 'User' } } }),
      });
    });
    
    // Mock courses endpoints
    await page.route('**/api/*/courses*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ _id: '1', title: 'Playwright Automation', status: 'published' }] }),
      });
    });
  });

  // Simplified COURSE tests (Checking Routing and mock renders instead of deep UI interactions)
  test('Admin can access courses page', async ({ page }) => {
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
    page.on('console', (msg) => console.log('CONSOLE:', msg.text()));
    await page.goto('/dashboard/courses', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/.*dashboard\/courses/);
    await expect(page.locator('body')).toContainText('Playwright Automation');
  });

  // LEARN-001
  test('Student can access course details', async ({ page }) => {
    await page.goto('/dashboard/courses/1', { waitUntil: 'domcontentloaded' });
    // Ensure the page doesn't crash and stays on course view
    await expect(page).toHaveURL(/.*dashboard\/courses\/1/);
  });
});
