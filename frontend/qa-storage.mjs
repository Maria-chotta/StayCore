export default async function run(page) {
  await page.evaluate(() => { localStorage.setItem('access_token', 'x'); localStorage.setItem('user', JSON.stringify({ email: 'x', memberships: [{ role: 'OWNER' }] })); });
  await page.goto('http://localhost:5174/dashboard');
  await page.waitForTimeout(500);
  return { url: page.url(), html: await page.evaluate(() => document.getElementById('root')?.innerHTML), errors: await page.evaluate(() => ({ href: location.href, body: document.body.innerHTML })) };
}