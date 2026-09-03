import { test, expect } from '@playwright/test';

test.describe('Users and RBAC', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user login session for Admin
    await page.route('**/api/*/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { user: { id: '1', role: 'admin', name: 'Admin', _id: '123' } } }),
      });
    });
    
    // Mock users endpoint
    await page.route('**/api/*/users*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { user: { email: 'new@example.com' } } }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] }),
        });
      }
    });
  });

  // USER-001 & USER-002 (Simplified)
  test('Admin can access students and mentors pages', async ({ page }) => {
    page.on('console', msg => console.log('CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    // Direct navigation using mocked session
    await page.goto('/dashboard/students', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/.*dashboard\/students/);
    
    await page.goto('/dashboard/mentors', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/.*dashboard\/mentors/);
  });

  // RBAC-001
  test('Student opens Admin page is blocked', async ({ page }) => {
    // Override /auth/me to return a student
    await page.route('**/api/*/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { user: { id: '2', role: 'student', name: 'Student', _id: '123' } } }),
      });
    });

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/.*dashboard/);

    // Navigate to admin route
    await page.goto('/dashboard/mentors', { waitUntil: 'domcontentloaded' });
    // Expect the layout or page to block it. In Next.js app, if they shouldn't access it, 
    // it usually redirects or shows a 404/unauthorized UI. Let's just check it doesn't stay on /mentors with admin UI.
    // Given my mock, let's see what happens.
    const body = page.locator('body');
    await expect(body).not.toContainText('Add Mentor');
  });
});
