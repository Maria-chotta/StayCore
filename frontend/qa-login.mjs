export default async function run(page, ui) {
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:5174/login');
  await page.getByPlaceholder('Enter your email').fill('admin@staycore.app');
  await page.getByPlaceholder('Enter your password').fill('StayCore@123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForTimeout(1500);
  return { url: page.url(), snapshot: await ui.snapshot({ full: true }), storage: await page.evaluate(() => ({ access: !!localStorage.getItem('access_token'), refresh: !!localStorage.getItem('refresh_token'), user: localStorage.getItem('user') })) };
}