# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test-all-logins.spec.ts >> Batch Login Test on Live Site >> Login test for Student (teststudent@example.com)
- Location: tests\e2e\test-all-logins.spec.ts:15:9

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/dashboard*" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e5]:
      - img "Placeonix" [ref=e7]
      - heading "Learn Today. Lead Tomorrow." [level=1] [ref=e8]: Learn Today.Lead Tomorrow.
      - paragraph [ref=e9]: Skill up. Stand out. We help you build the skills and confidence to launch your dream career.
      - img "Placeonix career process" [ref=e11]
      - generic [ref=e12]: © 2026 placeonix. All rights reserved.
    - generic [ref=e15]:
      - heading "Welcome Back!" [level=2] [ref=e16]
      - paragraph [ref=e17]: Login to access your dashboard
      - generic [ref=e18]:
        - generic [ref=e19]:
          - generic [ref=e20]: Student ID / Email
          - textbox "Student ID / Email" [ref=e22]:
            - /placeholder: Enter your Student ID or Email
            - text: teststudent@example.com
        - generic [ref=e23]:
          - generic [ref=e24]: Password
          - generic [ref=e25]:
            - textbox "Password" [ref=e26]:
              - /placeholder: Enter your password
              - text: Password123
            - button "Show password" [ref=e27]
        - generic [ref=e31]:
          - generic [ref=e32] [cursor=pointer]:
            - checkbox "Remember me" [ref=e33]
            - text: Remember me
          - link "Forgot Password?" [ref=e34] [cursor=pointer]:
            - /url: "#"
        - button "Login" [ref=e35]
        - alert [ref=e38]: Invalid credentials
        - paragraph [ref=e39]:
          - text: Need help?
          - link "Contact your administrator" [ref=e40] [cursor=pointer]:
            - /url: mailto:support@placeonix.in?subject=Placeonix%20Support
  - alert [ref=e41]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const credentials = [
  4  |   { email: 'admin@placeonix.in', role: 'Admin' },
  5  |   { email: 'mentor@placeonix.in', role: 'Mentor' },
  6  |   { email: 'kiran@placeonix.in', role: 'Mentor' },
  7  |   { email: 'student@placeonix.in', role: 'Student' },
  8  |   { email: 'sneha@placeonix.in', role: 'Student' },
  9  |   { email: 'vikram@placeonix.in', role: 'Student' },
  10 |   { email: 'teststudent@example.com', role: 'Student' }
  11 | ];
  12 | 
  13 | test.describe('Batch Login Test on Live Site', () => {
  14 |   for (const cred of credentials) {
  15 |     test(`Login test for ${cred.role} (${cred.email})`, async ({ page }) => {
  16 |       // Use the production frontend URL explicitly
  17 |       await page.goto('https://lms-placeonix-frontend-production.up.railway.app/login');
  18 |       
  19 |       await page.fill('input[type="email"]', cred.email);
  20 |       await page.fill('input[type="password"]', 'Password123');
  21 |       await page.click('button[type="submit"]');
  22 |       
  23 |       // Wait for navigation to dashboard
> 24 |       await page.waitForURL('**/dashboard*', { timeout: 15000 });
     |                  ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  25 |       
  26 |       // Check for logout button to confirm successful authentication UI
  27 |       await expect(page.locator('text=Logout')).toBeVisible({ timeout: 15000 });
  28 |       
  29 |       console.log(`✅ SUCCESS: Logged in as ${cred.role} (${cred.email})`);
  30 |     });
  31 |   }
  32 | });
  33 | 
```