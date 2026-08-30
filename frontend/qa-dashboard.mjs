export default async function run(page) {
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:5174/login');
  await page.getByPlaceholder('Enter your email').fill('admin@staycore.app');
  await page.getByPlaceholder('Enter your password').fill('StayCore@123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/dashboard');
  await page.waitForTimeout(3000);
  return await page.evaluate(() => ({ path: location.pathname, root: document.getElementById('root')?.innerText, rootHtml: document.getElementById('root')?.innerHTML.slice(0, 1000), storage: { access: !!localStorage.getItem('access_token'), user: !!localStorage.getItem('user') } }));
}