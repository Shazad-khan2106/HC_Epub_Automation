import { Before, After, setDefaultTimeout, Status } from '@cucumber/cucumber';
import { chromium, devices } from 'playwright';
import { CustomWorld } from './world';
import fs from 'fs';
import path from 'path';

const iPhone = devices['iPhone 12'];
setDefaultTimeout(600 * 10000);

Before(async function (this: CustomWorld) {
  this.browser = await chromium.launch({ 
    headless: true,
    args: [
        `--window-size=1980,1080` // set browser window size
      ], 
    });

  const context = await this.browser.newContext({
    storageState: './google-auth.json',
    permissions: ['microphone'],
    recordVideo: {
      dir: 'videos/',
      size: { width: 1980, height: 1080 },  
    },
    viewport: { width: 1980, height: 1080 },
  });

  const page = await context.newPage();

  this.context = context;
  this.page = page;
  this.logs = []; // Initialize logs for each scenario
});

After(async function (this: CustomWorld, scenario) {
  // Attach detailed logs to the scenario report
  if (this.logs && this.logs.length > 0) {
    const logHeader = `=== SCENARIO LOGS: ${scenario.pickle.name} ===\n`;
    const logText = logHeader + this.logs.join('\n') + '\n=== END LOGS ===\n';
    
    // Attach as text/plain for better formatting
    await this.attach(logText, 'text/plain');
    
    // Also attach as HTML for better readability in some reports
    const htmlLogs = this.logs.map(log => 
      log.includes('✅') ? `<div style="color: green; margin: 2px 0;">${log}</div>` :
      log.includes('❌') ? `<div style="color: red; margin: 2px 0;">${log}</div>` :
      log.includes('🔍') || log.includes('📋') || log.includes('📊') ? `<div style="color: blue; margin: 2px 0; font-weight: bold;">${log}</div>` :
      `<div style="margin: 2px 0;">${log}</div>`
    ).join('');
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 10px; background: #f5f5f5; border: 1px solid #ddd;">
        <h3 style="color: #333;">Scenario Logs: ${scenario.pickle.name}</h3>
        <div style="background: white; padding: 10px; border-radius: 5px;">
          ${htmlLogs}
        </div>
      </div>
    `;
    await this.attach(htmlContent, 'text/html');
  }

  // Attach screenshot on failure
  if (scenario.result?.status === Status.FAILED && this.page) {
    const screenshot = await this.page.screenshot();
    await this.attach(screenshot, 'image/png');
    this.addLog('📸 Screenshot captured due to failure');
  }

  // Attach video (if available)
  const videoPath = await this.page?.video()?.path();
  if (videoPath && fs.existsSync(videoPath)) {
    const videoBuffer = fs.readFileSync(videoPath);
    await this.attach(videoBuffer, 'video/webm');
  }

  // Cleanup
  await this.page?.close();
  await this.context?.close();
  await this.browser?.close();
});