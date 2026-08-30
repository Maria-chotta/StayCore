export default async function run(page, ui) {
  await page.evaluate(() => localStorage.clear()); await page.goto('http://localhost:5174/login');
  await page.getByPlaceholder('Enter your email').fill('admin@staycore.app'); await page.getByPlaceholder('Enter your password').fill('StayCore@123'); await page.getByRole('button', { name: 'Sign In' }).click(); await page.waitForURL('**/dashboard'); await page.waitForTimeout(1000);
  const first = { url: page.url(), text: await page.locator('body').innerText() };
  await page.reload(); await page.waitForTimeout(1000); const refresh = { url: page.url(), text: await page.locator('body').innerText() };
  return { first, refresh, snapshot: await ui.snapshot() };
}