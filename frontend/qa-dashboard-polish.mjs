export default async function run(page, ui) {
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:5174/login');
  await page.getByPlaceholder('Enter your email').fill('admin@staycore.app');
  await page.getByPlaceholder('Enter your password').fill('StayCore@123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/dashboard');
  await page.waitForFunction(
    () => document.body.innerText.includes('Today\'s reservations') &&
      !document.body.innerText.toLowerCase().includes('loading'),
    { timeout: 15000 }
  );
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const order = (label) => {
      const el = [...document.querySelectorAll('h1, h2')].find((h) => h.textContent.toLowerCase().includes(label));
      return el ? el.getBoundingClientRect().top : null;
    };
    return {
      width: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      kpis: document.querySelectorAll('.summary-card').length,
      panels: document.querySelectorAll('.dashboard-panel').length,
      badges: [...document.querySelectorAll('.status')].map((b) => b.textContent.trim()),
      badgeCases: [...document.querySelectorAll('.status')].every((b) => {
        const t = b.textContent.trim();
        return t === '—' || /^[A-Z][a-z]+( [A-Z][a-z]+)*$/.test(t);
      }),
      chips: document.querySelectorAll('.status-chip').length,
      emptyRing: !!document.querySelector('.occupancy-ring--empty'),
      ringLabel: document.querySelector('.ring-center span')?.textContent.trim(),
      sectionOrder: {
        kpi: order('occupancy'),
        reservations: order('reservations'),
        movement: order('arrivals'),
        housekeeping: order('housekeeping'),
        maintenance: order('maintenance'),
        quick: order('quick actions'),
      },
      quickActions: document.querySelectorAll('.quick-action-list button').length,
    };
  });
  return r;
}
