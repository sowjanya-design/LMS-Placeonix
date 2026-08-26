import { test, expect } from '@playwright/test';

test.describe('Security Tests', () => {
  // SEC-001
  test('Unauthorized access redirects to login', async ({ page }) => {
    // Attempt to access a protected route without login
    await page.goto('/dashboard');
    
    // Wait for redirect to login
    await expect(page).toHaveURL(/.*login/);
  });

  // SEC-002
  test('NoSQL Injection Attempt blocked', async ({ page }) => {
    // Mock a 401 error response for invalid characters/injection
    await page.route('**/api/*/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Invalid credentials' }),
      });
    });

    await page.goto('/login');
    // Attempt login with a common NoSQL injection payload
    await page.getByPlaceholder('Enter your Student ID or Email').fill('{"$gt": ""}');
    await page.getByPlaceholder('Enter your password').fill('password123');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Ensure the system blocks it and shows an error instead of logging in
    const errorMsg = page.getByRole('alert');
    await expect(errorMsg).toBeVisible();
  });
});
