const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  // Set the Vercel SSO cookie if needed (but the frontend is live, so maybe it's not needed if we are not hitting the protected URL?
  // Wait, if the frontend has Vercel SSO, playwright will hit the SSO page!
  // Let me just navigate and see if we get redirected to vercel.com/sso.
  
  const page = await context.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));
  page.on('response', response => console.log('RESPONSE:', response.url(), response.status()));

  console.log('Navigating to login...');
  await page.goto('https://lms-placeonix-me1m28vps-sowjanya-designs-projects.vercel.app/login');
  
  // Check if we are on Vercel SSO page
  if (page.url().includes('vercel.com')) {
    console.log('Hit Vercel SSO protection! Cannot test via Playwright without cookie.');
    await browser.close();
    process.exit(1);
  }
  
  console.log('Filling form...');
  await page.fill('input[type="email"]', 'sowjanya060504@gmail.com');
  await page.fill('input[type="password"]', 'Password123');
  
  console.log('Clicking login...');
  await page.click('button[type="submit"]');
  
  console.log('Waiting for network idle...');
  await page.waitForTimeout(5000);
  
  console.log('Done.');
  await browser.close();
})();
