export default async function run(page, ui) {
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:5174/login');
  await page.getByPlaceholder('Enter your email').fill('admin@staycore.app');
  await page.getByPlaceholder('Enter your password').fill('StayCore@123');
  const requests = [];
  page.on('response', r => { if (r.url().includes('/api/')) requests.push({ url: r.url(), status: r.status() }); });
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.waitForTimeout(1000);
  const afterLogin = await page.evaluate(() => ({ path: location.pathname, access: !!localStorage.getItem('access_token'), refresh: !!localStorage.getItem('refresh_token'), user: !!localStorage.getItem('user'), heading: document.querySelector('h1')?.textContent }));
  await page.reload();
  await page.waitForTimeout(1000);
  const afterRefresh = await page.evaluate(() => ({ path: location.pathname, user: !!localStorage.getItem('user'), heading: document.querySelector('h1')?.textContent }));
  await page.getByRole('button', { name: 'Logout' }).click();
  await page.waitForURL('**/login', { timeout: 5000 });
  const afterLogout = await page.evaluate(() => ({ path: location.pathname, access: !!localStorage.getItem('access_token'), user: !!localStorage.getItem('user') }));
  await page.getByPlaceholder('Enter your email').fill('admin@staycore.app');
  await page.getByPlaceholder('Enter your password').fill('StayCore@123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  const afterAgain = await page.evaluate(() => ({ path: location.pathname, heading: document.querySelector('h1')?.textContent }));
  return { afterLogin, afterRefresh, afterLogout, afterAgain, requests };
}