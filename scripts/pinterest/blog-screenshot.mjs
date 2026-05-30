import { chromium } from 'playwright';

const URL = 'http://localhost:8080/blog/1920s-speakeasy-murder-mystery-party-guide';

const browser = await chromium.launch();

// Desktop
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500); // settle any client-side rendering / image load
  await page.screenshot({ path: '/tmp/blog-desktop-with-image.png', fullPage: false });
  console.log('desktop ok');
  await ctx.close();
}

// Mobile (iPhone-ish)
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/blog-mobile-with-image.png', fullPage: false });
  console.log('mobile ok');
  await ctx.close();
}

await browser.close();
