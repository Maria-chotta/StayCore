export default async function run(page, ui) {
  await page.evaluate(() => localStorage.clear());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/login');
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
    const q = (s) => document.querySelector(s);
    const cardHeights = [...document.querySelectorAll('.summary-card')].map((c) => Math.round(c.getBoundingClientRect().height));
    const panels = [...document.querySelectorAll('.dashboard-panel')].map((p) => Math.round(p.getBoundingClientRect().height));
    const tableWrap = q('.reservations-wrap');
    const tableH = q('.reservations-table');
    const tableRows = tableH ? [...tableH.querySelectorAll('tbody tr')].map((tr) => Math.round(tr.getBoundingClientRect().height)) : [];
    const qaBtn = q('.qa-primary');
    const quickBtns = [...document.querySelectorAll('.quick-action-list button')];
    const menuBtn = q('.menu-btn');
    const headerH = q('.dashboard-header');
    const chips = [...document.querySelectorAll('.status-chip')].map((c) => Math.round(c.getBoundingClientRect().width));
    return {
      width: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      bodyScrollWidth: document.body.scrollWidth,
      headerHeight: headerH ? Math.round(headerH.getBoundingClientRect().height) : null,
      headerNowrap: q('.today-indicator') ? getComputedStyle(q('.today-indicator')).whiteSpace : null,
      kpiCols: getComputedStyle(q('.summary-grid')).gridTemplateColumns,
      kpiCount: document.querySelectorAll('.summary-card').length,
      cardHeights: [...new Set(cardHeights)],
      panelCount: panels.length,
      tableStacked: getComputedStyle(document.querySelector('.reservations-table thead')).display === 'none',
      tableRows,
      tableScrollable: tableWrap ? tableWrap.scrollWidth > tableWrap.clientWidth + 1 : null,
      touchTargets: quickBtns.map((b) => {
        const rect = b.getBoundingClientRect();
        return { text: (b.textContent || '').trim().slice(0, 30), w: Math.round(rect.width), h: Math.round(rect.height) };
      }),
      qaPrimaryVisible: qaBtn ? (() => { const rect = qaBtn.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && rect.left >= 0; })() : false,
      menuBtn: menuBtn ? { display: getComputedStyle(menuBtn).display, w: Math.round(menuBtn.getBoundingClientRect().width), h: Math.round(menuBtn.getBoundingClientRect().height) } : null,
      statusChipWidths: chips,
      panelTitles: [...document.querySelectorAll('.dashboard-panel h2')].map((h) => h.textContent.trim()).slice(0, 16),
    };
  });

  // Exercise the mobile nav: open via menu button, then close via backdrop or close button
  let navResult = {};
  try {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.waitForTimeout(400);
    navResult.opened = await page.evaluate(() => {
      const side = document.querySelector('.sidebar');
      if (!side) return { found: false };
      const rect = side.getBoundingClientRect();
      return { found: true, visible: rect.right > 0 && rect.left < window.innerWidth, left: Math.round(rect.left), width: Math.round(rect.width) };
    });
    let closeBtn = null;
    try {
      closeBtn = page.getByRole('button', { name: 'Close navigation' }).first();
      await closeBtn.waitFor({ state: 'visible', timeout: 3000 });
    } catch (e2) {
      closeBtn = null;
    }
    if (closeBtn) {
      await closeBtn.click();
      await page.waitForTimeout(400);
      navResult.closed = await page.evaluate(() => {
        const side = document.querySelector('.sidebar');
        return side ? Math.round(side.getBoundingClientRect().left) >= window.innerWidth : 'sidebar missing';
      });
    }
  } catch (err) {
    navResult.error = String((err && (err.message || err)) || err);
  }

  return { ...r, nav: navResult };
}
