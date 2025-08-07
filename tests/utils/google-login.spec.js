const { test } = require('@playwright/test');

test('Manually login with Google and save auth state', async ({ browser }) => {
  test.setTimeout(120000); // ✅ extend timeout for this test

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://dev-creative-workspace.techo.camp/');
  await page.click('text=Sign in with Google');

  console.log('🔐 Please complete Google login manually in the next 60 seconds...');
  await page.waitForTimeout(60000); // wait 5 minute

  await context.storageState({ path: 'google-auth.json' });
  console.log('✅ Auth state saved to google-auth.json');
});
