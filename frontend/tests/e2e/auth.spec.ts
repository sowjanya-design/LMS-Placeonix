import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  // AUTH-001
  test('Login with valid credentials', async ({ page }) => {
    // Mock the backend login response
    await page.route('**/api/*/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { token: 'mock-jwt-token', user: { id: '1', role: 'student', name: 'Test User' } } }),
      });
    });

    await page.goto('/login');
    await page.getByPlaceholder('Enter your Student ID or Email').fill('test@example.com');
    await page.getByPlaceholder('Enter your password').fill('password123');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Check if redirected to dashboard or home
    await expect(page).toHaveURL(/.*dashboard|.*home/);
  });

  // AUTH-002
  test('Login with wrong password', async ({ page }) => {
    // Mock a 401 error response
    await page.route('**/api/*/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Invalid credentials' }),
      });
    });

    await page.goto('/login');
    await page.getByPlaceholder('Enter your Student ID or Email').fill('test@example.com');
    await page.getByPlaceholder('Enter your password').fill('wrongpassword');
    await page.getByRole('button', { name: /login/i }).click();
    
    // Wait for error message to appear
    const errorMsg = page.getByText('Invalid credentials');
    await expect(errorMsg).toBeVisible();
  });

  // AUTH-003
  test('Forgot password link exists', async ({ page }) => {
    await page.goto('/login');
    // Click the forgot password link
    const forgotLink = page.getByRole('link', { name: 'Forgot Password?' });
    await expect(forgotLink).toBeVisible();
    // Assuming it doesn't navigate anywhere real in the current mock since it's '#'
  });
});
