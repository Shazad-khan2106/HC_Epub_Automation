const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const reportPath = `file://${path.resolve(__dirname, 'html-report', 'index.html')}`;
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(reportPath, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'report-screenshot.png', fullPage: true });
  await browser.close();
})();
