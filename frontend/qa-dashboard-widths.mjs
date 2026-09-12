export default async function run(page, ui) {
  const width = Number(process.env.QA_WIDTH || 1366);
  const height = Number(process.env.QA_HEIGHT || 900);

  await page.evaluate(() => localStorage.clear());
  await page.setViewportSize({ width, height });
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
    const q = (s) => document.querySelector(s);
    const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) }; };
    const allEls = [...document.querySelectorAll('button, a')].map((b) => {
      const r = b.getBoundingClientRect();
      return {
        t: (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30), w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top) };
    });
    const tinyBtns = allEls.filter((b) => b.w > 0 && (b.h < 40 || b.w < 40));
    const scrollable = [...document.querySelectorAll('*')].filter((e) => {
      const s = getComputedStyle(e);
      return (s.overflowX === 'auto' || s.overflowX === 'scroll') && e.scrollWidth > e.clientWidth + 1;
    }).map((e) => e.className || e.tagName).slice(0, 5);
    return {
      viewport: window.innerWidth,
      docWidth: document.documentElement.scrollWidth,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      bodyScrollWidth: document.body.scrollWidth,
      innerScrollables: scrollable,
      header: rect(q('.app-header')),
      headerActions: (() => { const el = q('.header-actions'); const s = el && getComputedStyle(el); return s ? { wrap: s.flexWrap, gap: s.gap, w: rect(el)?.w } : null; })(),
      kpiCols: getComputedStyle(q('.summary-grid')).gridTemplateColumns,
      kpiCount: document.querySelectorAll('.summary-card').length,
      kpiHeights: [...document.querySelectorAll('.summary-card')].map((c) => Math.round(c.getBoundingClientRect().height)),
      panelHeights: [...document.querySelectorAll('.dashboard-panel')].map((p) => Math.round(p.getBoundingClientRect().height)),
      tableStacked: getComputedStyle(q('.reservations-table thead')).display === 'none',
      occupancyRing: (() => { const ring = q('.occupancy-ring'); return ring ? { size: ring.getBoundingClientRect().width, label: q('.ring-center span')?.textContent.trim() } : null; })(),
      primaryBtn: (() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('New reservation')); return b ? { w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height), left: Math.round(b.getBoundingClientRect().left), inView: b.getBoundingClientRect().left >= 0 } : null; })(),
      sidebarToggle: !!q('.menu-btn'),
      tinyButtons: tinyBtns.slice(0, 6),
      totalButtons: allEls.length,
      fonts: { manrope: document.fonts.check('16px Manrope'), dmSans: document.fonts.check('16px "DM Sans"') },
    };
  });

  if (width < 900) {
    // exercise nav open/close
    const nav = await ui.snapshot();
    const openBtn = nav.match(/@(e\d+) button "Open navigation"/);
    if (!openBtn) return { ...r, nav: 'OPEN_BTN_NOT_FOUND', snapshot: nav };
    await page.click(`[data-eid="${openBtn[1]}"]`);
    await page.waitForTimeout(250);
    const opened = await ui.snapshot();
    const closeBtn = opened.match(/@(e\d+) button "Close navigation"/);
    await page.click(`[data-eid="${closeBtn[1]}"]`);
    await page.waitForTimeout(200);
    return { ...r, nav: 'OPEN_CLOSE_OK', hadCloseBtn: !!closeBtn, navLinks: (opened.match(/link/g) || []).length };
  }
  return r;
}
