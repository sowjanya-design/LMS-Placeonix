import { chromium } from 'playwright';
import fs from 'fs';

const pagesToTest = [
  '/dashboard',
  '/dashboard/students',
  '/dashboard/mentors',
  '/dashboard/courses',
  '/dashboard/batches',
  '/dashboard/sessions',
  '/dashboard/payments',
  '/dashboard/time-and-attendance',
  '/dashboard/quizzes',
  '/dashboard/resources',
  '/dashboard/assignments',
  '/dashboard/placements',
  '/dashboard/leads',
  '/dashboard/calendar',
  '/dashboard/announcements',
  '/dashboard/support',
  '/dashboard/certificates',
  '/dashboard/upload-video',
  '/dashboard/mock-interviews',
  '/dashboard/profile'
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Navigating to login...");
  await page.goto('http://localhost:3000/login');
  
  // Login as admin
  await page.fill('input[type="email"]', 'admin@placeonix.in');
  await page.fill('input[type="password"]', 'Password123');
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard');
  console.log("Logged in!");

  const report = [];

  for (const p of pagesToTest) {
    const url = `http://localhost:3000${p}`;
    console.log(`Auditing ${p}...`);
    
    let consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });

    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Wait a bit for React to render and fetch data
    await page.waitForTimeout(2000);
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasErrorText = bodyText.includes('Could not load') || bodyText.includes('Something went wrong') || bodyText.includes('Network Error');
    
    let domErrors = [];
    if (bodyText.includes('Could not load')) domErrors.push('Found "Could not load" in DOM');
    if (bodyText.includes('Something went wrong')) domErrors.push('Found "Something went wrong" in DOM');
    if (bodyText.includes('Network Error')) domErrors.push('Found "Network Error" in DOM');
    
    report.push({
      page: p,
      status: (consoleErrors.length > 0 || hasErrorText) ? 'FAIL' : 'PASS',
      consoleErrors: [...consoleErrors],
      domErrors
    });
    
    // Remove listeners for next page
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
  }

  await browser.close();
  
  fs.writeFileSync('audit-report.json', JSON.stringify(report, null, 2));
  console.log("Audit complete. Report saved to audit-report.json");
}

run().catch(console.error);
