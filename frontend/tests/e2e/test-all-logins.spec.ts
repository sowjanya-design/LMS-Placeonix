import { test, expect } from '@playwright/test';

const credentials = [
  { email: 'admin@placeonix.in', role: 'Admin' },
  { email: 'mentor@placeonix.in', role: 'Mentor' },
  { email: 'kiran@placeonix.in', role: 'Mentor' },
  { email: 'student@placeonix.in', role: 'Student' },
  { email: 'sneha@placeonix.in', role: 'Student' },
  { email: 'vikram@placeonix.in', role: 'Student' },
  { email: 'teststudent@example.com', role: 'Student' }
];

test.describe('Batch Login Test on Live Site', () => {
  for (const cred of credentials) {
    test(`Login test for ${cred.role} (${cred.email})`, async ({ page }) => {
      // Use the production frontend URL explicitly
      await page.goto('https://lms-placeonix-frontend-production.up.railway.app/login');
      
      await page.fill('input[type="email"]', cred.email);
      await page.fill('input[type="password"]', 'Password123');
      await page.click('button[type="submit"]');
      
      // Wait for navigation to dashboard
      await page.waitForURL('**/dashboard*', { timeout: 15000 });
      
      // Check for logout button to confirm successful authentication UI
      await expect(page.locator('text=Logout')).toBeVisible({ timeout: 15000 });
      
      console.log(`✅ SUCCESS: Logged in as ${cred.role} (${cred.email})`);
    });
  }
});
