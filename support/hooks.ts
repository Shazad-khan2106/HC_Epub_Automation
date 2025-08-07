import { Before, After, setDefaultTimeout, Status } from '@cucumber/cucumber';
import { chromium, devices } from 'playwright';
import { CustomWorld } from './world';
import fs from 'fs';
import path from 'path';

const iPhone = devices['iPhone 12'];
setDefaultTimeout(30 * 2000);

Before(async function (this: CustomWorld) {
  this.browser = await chromium.launch({ headless: true });

  const context = await this.browser.newContext({
    storageState: './google-auth.json',
    permissions: ['microphone'],
    recordVideo: {
      dir: 'videos/',
      size: { width: 1365, height: 866 },
    },
  });

  const page = await context.newPage();

  this.context = context;
  this.page = page;
  this.logs = []; // Initialize logs for each scenario
});

After(async function (this: CustomWorld, scenario) {
  // Attach screenshot on failure
  if (scenario.result?.status === Status.FAILED && this.page) {
    const screenshot = await this.page.screenshot();
    await this.attach(screenshot, 'image/png');
  }

  // Attach custom logs
  if (this.logs && this.logs.length > 0) {
    const logText = this.logs.join('\n');
    await this.attach(logText, 'text/plain');
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
