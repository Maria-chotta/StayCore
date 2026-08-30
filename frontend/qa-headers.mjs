export default async function run(page) {
  const requests = []; const responses = [];
  page.on('request', r => {
    if (r.url().includes('/api/')) requests.push({ url: r.url(), auth: r.headers().authorization });
    page.on('response', r => {
      if (r.url().includes('/api/')) responses.push({ url: r.url(), status: r.status() });
      await page.evaluate(() => localStorage.clear()); await page.goto('http://localhost:5174/login');
      await page.getByPlaceholder('Enter your email').fill('admin@staycore.app'); await page.getByPlaceholder('Enter your password').fill('StayCore@123'); await page.getByRole('button', { name: 'Sign In' }).click(); await page.waitForTimeout(2500);
      return { url: page.url(), requests, responses, storage: await page.evaluate(() => ({ access: localStorage.getItem('access_token')?.slice(0, 20), refresh: !!localStorage.getItem('refresh_token') })) };
    }