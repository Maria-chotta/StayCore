export default async function run(page, ui) {
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:5174/login');
  await page.getByPlaceholder('Enter your email').fill('admin@staycore.app');
  await page.getByPlaceholder('Enter your password').fill('StayCore@123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/dashboard');
  // Wait for real data to load (net of login + API calls)
  await page.waitForFunction(
    () => document.body.innerText.includes('Today\'s reservations') &&
      !document.body.innerText.toLowerCase().includes('loading'),
    { timeout: 15000 }
  );
  await page.waitForTimeout(600);
  return {
    width: await page.evaluate(() => document.documentElement.scrollWidth),
    viewport: await page.evaluate(() => window.innerWidth),
    overflowX: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
    kpis: await page.evaluate(() => document.querySelectorAll('.summary-card').length),
    panels: await page.evaluate(() => document.querySelectorAll('.dashboard-panel').length),
    statusBadges: await page.evaluate(() => document.querySelectorAll('.status').length),
    ringFill: await page.evaluate(() => document.querySelector('.ring-fill')?.getAttribute('stroke-dashoffset')),
    barWidth: await page.evaluate(() => document.querySelector('.occupancy-bar-fill')?.style.width),
    quickActions: await page.evaluate(() => document.querySelectorAll('.quick-action-list button').length),
  };
}
