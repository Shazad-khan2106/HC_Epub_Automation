const { test } = require('@playwright/test');

test('Manually login with Google and save auth state', async ({ browser }) => {
  test.setTimeout(600000); // ✅ extend timeout for this test

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://qa.appmod.ai/login');
  await page.click('text=Sign in with Google');

  await page.locator('input[type="email"]').fill("shazad.khan@techolution.com")
  await page.getByText("Next").click()

  await page.locator('input[type="password"]').fill("Ariba.Aimen@12")
  await page.getByText("Next").click()
  
  console.log('🔐 Please complete Google login manually in the next 180 seconds...');
  await page.waitForTimeout(180000); // wait 5 minute

  await context.storageState({ path: 'google-auth.json' });
  console.log('✅ Auth state saved to google-auth.json');
});
