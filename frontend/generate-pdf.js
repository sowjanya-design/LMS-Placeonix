/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const reportPath = 'file:///' + path.join(__dirname, 'playwright-report', 'index.html').replace(/\\/g, '/');
  
  console.log('Opening:', reportPath);
  await page.goto(reportPath, { waitUntil: 'networkidle' });
  
  // Wait a little bit for any JS to render the report
  await page.waitForTimeout(2000);
  
  const pdfPath = path.join(__dirname, 'Test_Report_Final.pdf');
  await page.pdf({ 
    path: pdfPath, 
    format: 'A4', 
    printBackground: true,
    margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' }
  });
  
  console.log('PDF generated at:', pdfPath);
  await browser.close();
})();
